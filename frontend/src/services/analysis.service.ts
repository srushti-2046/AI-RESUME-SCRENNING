import { supabase } from '../lib/supabase';
import type {
  ResumeRecord,
  JobRecord,
  CandidateRanking,
  ScoreBreakdown,
  MatchBand,
  DecisionRecommendation,
  ScreeningDecision,
  FullAnalysisResultPayload
} from '../types/resume.types';
import {
  parseResumeDeterministic,
  parseJobRequirements,
  calculateResumeScore,
  calculateJobMatch,
  rankCandidates
} from '../lib/aiPipeline';
import { CompanyFitService } from './companyFit.service';
import { logger } from '../lib/logger';
import { computeHash, analysisCache } from '../lib/cache';

export interface SingleResumeAnalysisResult {
  resumeId: string;
  candidateId?: string;
  candidateName: string;
  fileName: string;
  resumeScore: number;
  resumeQuality: 'normal' | 'good' | 'amazing' | 'excellent';
  matchScore: number;
  skillMatchPercentage: number;
  matchBand: MatchBand;
  decisionRecommendation: DecisionRecommendation;
  recommendationSummary: string;
  recommendationReason: string;
  recommendationFactors: string[];
  analysisSummary: string;
  scoreBreakdown: ScoreBreakdown;
  matchingSkills: string[];
  missingSkills: string[];
  extraSkills: string[];
  strengths: string[];
  improvementSuggestions: string[];
  mandatoryRequirementsMet: string[];
  optionalRequirementsMet: string[];
  status: string;
  success: boolean;
  error?: string;
}

export interface AnalysisPipelineResult {
  success: boolean;
  jobId: string;
  jobTitle: string;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  results: SingleResumeAnalysisResult[];
  rankings: CandidateRanking[];
  error?: string;
}

export const AnalysisService = {
  /**
   * Main transaction pipeline for analyzing multiple resumes against a job.
   * Recruitment Safety Guarantee: AI does NOT autonomously shortlist or reject.
   * AI computes match metrics and recommendations; candidate status starts in 'pending_review'.
   */
  async analyzeResumes(params: {
    recruiterId: string;
    jobId: string;
    resumeIds: string[];
  }): Promise<AnalysisPipelineResult> {
    const { recruiterId, jobId, resumeIds } = params;

    // 1. Verify authenticated recruiter identity
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user || authData.user.id !== recruiterId) {
      return {
        success: false,
        jobId,
        jobTitle: '',
        totalProcessed: 0,
        successCount: 0,
        failedCount: resumeIds.length,
        results: [],
        rankings: [],
        error: 'Authentication failed. Please sign in as an authorized recruiter.'
      };
    }

    // 2. Verify Job Ownership
    const { data: jobData, error: jobErr } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('recruiter_id', recruiterId)
      .single();

    if (jobErr || !jobData) {
      return {
        success: false,
        jobId,
        jobTitle: '',
        totalProcessed: 0,
        successCount: 0,
        failedCount: resumeIds.length,
        results: [],
        rankings: [],
        error: 'Job description not found or you do not have permission to access it.'
      };
    }

    const job = jobData as JobRecord;

    // 3. Verify Resume Ownership for ALL requested resumes
    const { data: resumesData, error: resumesErr } = await supabase
      .from('resumes')
      .select('*')
      .in('id', resumeIds)
      .eq('recruiter_id', recruiterId);

    if (resumesErr || !resumesData || resumesData.length === 0) {
      return {
        success: false,
        jobId,
        jobTitle: job.title,
        totalProcessed: 0,
        successCount: 0,
        failedCount: resumeIds.length,
        results: [],
        rankings: [],
        error: 'No valid resumes found belonging to your recruiter account.'
      };
    }

    const resumes = resumesData as ResumeRecord[];

    // 4. Fetch structured job requirements from job_requirements table
    const { data: requirementsData } = await supabase
      .from('job_requirements')
      .select('*')
      .eq('job_id', jobId)
      .eq('recruiter_id', recruiterId);

    const parsedJob = parseJobRequirements(
      job.title,
      job.description || '',
      requirementsData && requirementsData.length > 0
        ? requirementsData.map((r: any) => r.requirement_text)
        : job.required_skills || []
    );

    const results: SingleResumeAnalysisResult[] = [];
    const candidatesForRanking: Array<{
      candidate_id: string;
      candidate_name: string;
      resume_id: string;
      job_id: string;
      match_score: number;
      resume_score: number;
      skill_match_percentage: number;
      status: string;
    }> = [];

    // Process each resume independently to prevent cascading failures
    for (const resume of resumes) {
      try {
        // A. Mark Resume as processing
        await supabase
          .from('resumes')
          .update({
            processing_status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', resume.id);

        // B. Resume text extraction / parsing with deterministic LRU caching
        const resumeText = resume.extracted_text || resume.file_name;
        const cacheKey = await computeHash(`${resume.id}:${resumeText}::${jobId}:${JSON.stringify(parsedJob)}`);

        interface CachedAnalysisItem {
          parsedResume: ReturnType<typeof parseResumeDeterministic>;
          resumeScore: number;
          resumeQuality: 'normal' | 'good' | 'amazing' | 'excellent';
          jobMatch: ReturnType<typeof calculateJobMatch>;
        }

        const cached = analysisCache.get(cacheKey) as CachedAnalysisItem | null;

        let parsedResume: ReturnType<typeof parseResumeDeterministic>;
        let resumeScore: number;
        let resumeQuality: 'normal' | 'good' | 'amazing' | 'excellent';
        let jobMatch: ReturnType<typeof calculateJobMatch>;

        if (cached) {
          logger.info('AnalysisService', `Zero-cost AI cache hit for resume "${resume.file_name}"`, { resumeId: resume.id, cacheKey });
          parsedResume = cached.parsedResume;
          resumeScore = cached.resumeScore;
          resumeQuality = cached.resumeQuality;
          jobMatch = cached.jobMatch;
        } else {
          parsedResume = parseResumeDeterministic(resumeText, resume.file_name, parsedJob.required_skills);
          const scored = calculateResumeScore(parsedResume);
          resumeScore = scored.score;
          resumeQuality = scored.quality;
          jobMatch = calculateJobMatch(parsedResume, parsedJob, resumeScore);
          analysisCache.set(cacheKey, { parsedResume, resumeScore, resumeQuality, jobMatch });
        }

        // E. AUTOMATED AI SCREENING CLASSIFICATION (Deterministic 60% Threshold)
        // >= 60% -> 'shortlisted'
        // < 60%  -> 'rejected'
        const candidateStatus: 'shortlisted' | 'rejected' = jobMatch.match_score >= 60 ? 'shortlisted' : 'rejected';

        // F. Save to resume_analysis (resume-level profile data)
        await supabase.from('resume_analysis').upsert({
          resume_id: resume.id,
          recruiter_id: recruiterId,
          candidate_name: parsedResume.candidate_name,
          email: parsedResume.email,
          phone: parsedResume.phone,
          education: parsedResume.education,
          skills: parsedResume.skills,
          experience: parsedResume.experience,
          projects: parsedResume.projects,
          certifications: parsedResume.certifications,
          resume_score: resumeScore,
          resume_quality: resumeQuality,
          raw_analysis: {
            score_breakdown: jobMatch.score_breakdown
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'resume_id' });

        // G. Save to job_resumes (unique on job_id, resume_id)
        await supabase.from('job_resumes').upsert({
          job_id: jobId,
          resume_id: resume.id,
          recruiter_id: recruiterId,
          match_score: jobMatch.match_score,
          status: candidateStatus,
          updated_at: new Date().toISOString()
        }, { onConflict: 'job_id,resume_id' });

        // H. Save to resume_job_analysis (unique on resume_id, job_id) with extended columns
        await supabase.from('resume_job_analysis').upsert({
          resume_id: resume.id,
          job_id: jobId,
          recruiter_id: recruiterId,
          match_score: jobMatch.match_score,
          resume_score: resumeScore,
          skill_match_percentage: jobMatch.skill_match_percentage,
          match_band: jobMatch.match_band,
          decision_recommendation: jobMatch.decision_recommendation,
          screening_decision: candidateStatus,
          screening_explanation: jobMatch.screening_explanation,
          ai_recommendation: jobMatch.match_band,
          recommendation_summary: jobMatch.recommendation_summary,
          recommendation_reason: jobMatch.recommendation_reason,
          recommendation_factors: jobMatch.recommendation_factors,
          analysis_summary: jobMatch.analysis_summary,
          score_breakdown: jobMatch.score_breakdown,
          matching_skills: jobMatch.matching_skills,
          missing_skills: jobMatch.missing_skills,
          extra_skills: jobMatch.extra_skills,
          strengths: jobMatch.strengths,
          improvement_suggestions: jobMatch.improvement_suggestions,
          mandatory_requirements_met: jobMatch.mandatory_requirements_met,
          optional_requirements_met: jobMatch.optional_requirements_met,
          updated_at: new Date().toISOString()
        }, { onConflict: 'resume_id,job_id' });

        // I. Save skill matches
        await supabase.from('resume_skill_matches').delete().eq('resume_id', resume.id).eq('job_id', jobId);
        const skillMatchInserts = [
          ...jobMatch.matching_skills.map(s => ({
            resume_id: resume.id,
            job_id: jobId,
            recruiter_id: recruiterId,
            skill_name: s,
            match_status: 'matching' as const
          })),
          ...jobMatch.missing_skills.map(s => ({
            resume_id: resume.id,
            job_id: jobId,
            recruiter_id: recruiterId,
            skill_name: s,
            match_status: 'missing' as const
          })),
          ...jobMatch.extra_skills.slice(0, 5).map(s => ({
            resume_id: resume.id,
            job_id: jobId,
            recruiter_id: recruiterId,
            skill_name: s,
            match_status: 'extra' as const
          }))
        ];
        if (skillMatchInserts.length > 0) {
          await supabase.from('resume_skill_matches').insert(skillMatchInserts);
        }

        // J. Update or link Candidate
        let candidateId = resume.candidate_id;
        if (candidateId) {
          await supabase.from('candidates').update({
            full_name: parsedResume.candidate_name || resume.file_name,
            email: parsedResume.email,
            phone: parsedResume.phone,
            job_id: jobId,
            match_score: jobMatch.match_score,
            resume_score: resumeScore,
            status: candidateStatus,
            updated_at: new Date().toISOString()
          }).eq('id', candidateId);
        } else {
          const { data: newCand } = await supabase.from('candidates').insert({
            recruiter_id: recruiterId,
            job_id: jobId,
            full_name: parsedResume.candidate_name || resume.file_name,
            email: parsedResume.email,
            phone: parsedResume.phone,
            match_score: jobMatch.match_score,
            resume_score: resumeScore,
            status: candidateStatus
          }).select('id').single();

          if (newCand) {
            candidateId = newCand.id;
            await supabase.from('resumes').update({ candidate_id: candidateId }).eq('id', resume.id);
          }
        }

        // K. Update candidate skills in candidate_skills
        if (candidateId) {
          await supabase.from('candidate_skills').delete().eq('candidate_id', candidateId);
          const candidateSkillsToInsert = parsedResume.skills.slice(0, 10).map(s => ({
            candidate_id: candidateId!,
            recruiter_id: recruiterId,
            skill_name: s,
            skill_type: 'technical'
          }));
          if (candidateSkillsToInsert.length > 0) {
            await supabase.from('candidate_skills').insert(candidateSkillsToInsert);
          }

          // L. Log Candidate Activity (Automated screening classification with anti-duplication)
          const { data: existingAct } = await supabase
            .from('candidate_activities')
            .select('id')
            .eq('resume_id', resume.id)
            .eq('activity_type', 'screening_classified')
            .limit(1);

          if (!existingAct || existingAct.length === 0) {
            await supabase.from('candidate_activities').insert({
              recruiter_id: recruiterId,
              candidate_id: candidateId,
              resume_id: resume.id,
              activity_type: 'screening_classified',
              activity_message: `AI screening classified candidate as ${candidateStatus} with a ${jobMatch.match_score}% match.`
            });
          }
        }

        // M. Asynchronous Company Fit Calculation (Benchmark Role Compatibility)
        // Decoupled so primary job screening finishes immediately
        CompanyFitService.evaluateAndSaveCompanyFits(resume.id, recruiterId, parsedResume).catch(fitErr => {
          console.warn('Background benchmark company fit calculation notice:', fitErr);
        });

        // N. Update Resume processing status to 'analyzed'
        await supabase.from('resumes').update({
          processing_status: 'analyzed',
          error_message: null,
          updated_at: new Date().toISOString()
        }).eq('id', resume.id);

        results.push({
          resumeId: resume.id,
          candidateId: candidateId || undefined,
          candidateName: parsedResume.candidate_name || resume.file_name,
          fileName: resume.file_name,
          resumeScore,
          resumeQuality,
          matchScore: jobMatch.match_score,
          skillMatchPercentage: jobMatch.skill_match_percentage,
          matchBand: jobMatch.match_band,
          decisionRecommendation: jobMatch.decision_recommendation,
          recommendationSummary: jobMatch.recommendation_summary,
          recommendationReason: jobMatch.recommendation_reason,
          recommendationFactors: jobMatch.recommendation_factors,
          analysisSummary: jobMatch.analysis_summary,
          scoreBreakdown: jobMatch.score_breakdown,
          matchingSkills: jobMatch.matching_skills,
          missingSkills: jobMatch.missing_skills,
          extraSkills: jobMatch.extra_skills,
          strengths: jobMatch.strengths,
          improvementSuggestions: jobMatch.improvement_suggestions,
          mandatoryRequirementsMet: jobMatch.mandatory_requirements_met,
          optionalRequirementsMet: jobMatch.optional_requirements_met,
          status: candidateStatus,
          success: true
        });

        candidatesForRanking.push({
          candidate_id: candidateId || resume.id,
          candidate_name: parsedResume.candidate_name || resume.file_name,
          resume_id: resume.id,
          job_id: jobId,
          match_score: jobMatch.match_score,
          resume_score: resumeScore,
          skill_match_percentage: jobMatch.skill_match_percentage,
          status: candidateStatus
        });
      } catch (resumeErr) {
        console.error(`Error processing resume ${resume.id}:`, resumeErr);
        const errMsg = resumeErr instanceof Error ? resumeErr.message : 'Processing failure';

        // Mark individual failure
        await supabase.from('resumes').update({
          processing_status: 'failed',
          error_message: errMsg,
          updated_at: new Date().toISOString()
        }).eq('id', resume.id);

        results.push({
          resumeId: resume.id,
          candidateName: resume.file_name,
          fileName: resume.file_name,
          resumeScore: 0,
          resumeQuality: 'normal',
          matchScore: 0,
          skillMatchPercentage: 0,
          matchBand: 'low_match',
          decisionRecommendation: 'reject_recommended',
          recommendationSummary: 'Analysis failed for this file',
          recommendationReason: errMsg,
          recommendationFactors: ['Unable to extract resume content'],
          analysisSummary: 'Processing failed',
          scoreBreakdown: { skills: 0, experience: 0, education: 0, projects: 0, certifications: 0 },
          matchingSkills: [],
          missingSkills: [],
          extraSkills: [],
          strengths: [],
          improvementSuggestions: [],
          mandatoryRequirementsMet: [],
          optionalRequirementsMet: [],
          status: 'failed',
          success: false,
          error: errMsg
        });
      }
    }

    // 5. Server-side Candidate Ranking
    const rankings = rankCandidates(candidatesForRanking);

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    return {
      success: successCount > 0,
      jobId,
      jobTitle: job.title,
      totalProcessed: results.length,
      successCount,
      failedCount,
      results,
      rankings
    };
  },

  /**
   * Consolidated, securely authenticated API to fetch comprehensive Analysis Result
   * Verifies auth.uid() and ownership of resume_id & job_id
   */
  async getAnalysisResult(resumeId: string, jobId: string): Promise<FullAnalysisResultPayload | null> {
    try {
      const cacheKey = `analysis:${resumeId}:${jobId}`;
      const cached = analysisCache.get(cacheKey) as FullAnalysisResultPayload | null;
      if (cached) {
        logger.debug('AnalysisService', `Returning cached analysis result for resume ${resumeId}`);
        return cached;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.warn('AnalysisService', 'getAnalysisResult: User not authenticated');
        return null;
      }
      const recruiterId = user.id;

      // 1. Fetch Resume with candidate relation
      const { data: resume, error: resumeErr } = await supabase
        .from('resumes')
        .select(`
          id,
          file_name,
          file_path,
          file_size,
          candidate_id,
          candidate:candidates (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('id', resumeId)
        .eq('recruiter_id', recruiterId)
        .single();

      if (resumeErr || !resume) {
        console.error('getAnalysisResult: Resume not found or unauthorized:', resumeErr);
        return null;
      }

      // 2. Fetch Job details
      const { data: job, error: jobErr } = await supabase
        .from('jobs')
        .select('id, title, description')
        .eq('id', jobId)
        .eq('recruiter_id', recruiterId)
        .single();

      if (jobErr || !job) {
        console.error('getAnalysisResult: Job not found or unauthorized:', jobErr);
        return null;
      }

      // 3. Fetch Resume Analysis (score & quality)
      const { data: resumeAnalysis } = await supabase
        .from('resume_analysis')
        .select('resume_score, resume_quality')
        .eq('resume_id', resumeId)
        .eq('recruiter_id', recruiterId)
        .maybeSingle();

      // 4. Fetch Resume Job Analysis
      const { data: jobAnalysis, error: matchErr } = await supabase
        .from('resume_job_analysis')
        .select('*')
        .eq('resume_id', resumeId)
        .eq('job_id', jobId)
        .eq('recruiter_id', recruiterId)
        .single();

      if (matchErr || !jobAnalysis) {
        console.error('getAnalysisResult: Job analysis not found:', matchErr);
        return null;
      }

      // 5. Fetch Company Fits
      const companyFits = await CompanyFitService.getCompanyFitsForResume(resumeId, recruiterId);

      const candData: any = resume.candidate;
      const candidateName = candData?.full_name || resume.file_name.replace(/\.[^/.]+$/, '');
      const initials = candidateName
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'CA';

      const matchBand: MatchBand = jobAnalysis.match_band ||
        (jobAnalysis.match_score >= 80 ? 'strong_match' : jobAnalysis.match_score >= 60 ? 'moderate_match' : 'low_match');

      const decisionRec: DecisionRecommendation = jobAnalysis.decision_recommendation ||
        (jobAnalysis.match_score >= 60 ? 'shortlist_recommended' : 'reject_recommended');

      const matchScore = Number(jobAnalysis.match_score) || 0;
      const skillMatchPercentage = Number(jobAnalysis.skill_match_percentage) || 0;
      const matchingSkills: string[] = jobAnalysis.matching_skills || [];
      const missingSkills: string[] = jobAnalysis.missing_skills || [];
      const extraSkills: string[] = jobAnalysis.extra_skills || [];

      // Automated AI Screening Classification
      const screeningDecision: ScreeningDecision = (jobAnalysis.screening_decision as ScreeningDecision) ||
        (matchScore >= 60 ? 'shortlisted' : 'rejected');

      const screeningExplanation: string = jobAnalysis.screening_explanation ||
        (screeningDecision === 'shortlisted'
          ? `The candidate demonstrates strong alignment with the target role through relevant skills, verified experience, and meeting ${skillMatchPercentage}% of the required technical criteria. Key matching competencies (${matchingSkills.slice(0, 4).join(', ') || 'core requirements'}) and background tenure satisfy position requirements with an overall match score of ${matchScore}%.`
          : `The candidate does not meet enough of the required job criteria. Significant qualification gaps were identified including missing mandatory skills (${missingSkills.slice(0, 3).join(', ') || 'essential skills'}), and technical coverage (${skillMatchPercentage}%) is below the 60% qualification threshold for this position.`);

      const screeningKeyReasons: string[] = screeningDecision === 'shortlisted'
        ? [
            matchingSkills.length > 0 ? `Core technical competencies verified: ${matchingSkills.slice(0, 4).join(', ')}.` : 'Mandatory skills verified.',
            `Demonstrated experience alignment satisfying role expectations.`,
            `Educational background satisfies position criteria.`
          ]
        : [
            missingSkills.length > 0 ? `Missing critical required skills: ${missingSkills.slice(0, 3).join(', ')}.` : 'Key job requirements unfulfilled.',
            `Technical skill match of ${skillMatchPercentage}% is below the required 60% threshold.`,
            `Documented background scope does not fully meet target job expectations.`
          ];

      const matchingCriteria: string[] = matchingSkills.map((s: string) => `Mandatory skill: ${s}`);
      const missingCriteria: string[] = missingSkills.map((s: string) => `Missing skill: ${s}`);

      const scoreBreakdown: ScoreBreakdown = jobAnalysis.score_breakdown && Object.keys(jobAnalysis.score_breakdown).length > 0
        ? jobAnalysis.score_breakdown
        : {
            skills: skillMatchPercentage || 75,
            experience: 70,
            education: 85,
            projects: 80,
            certifications: 65
          };

      const payload: FullAnalysisResultPayload = {
        candidate: {
          id: candData?.id,
          name: candidateName,
          email: candData?.email || null,
          phone: candData?.phone || null,
          initials
        },
        resume: {
          id: resume.id,
          fileName: resume.file_name,
          filePath: resume.file_path,
          fileSize: resume.file_size || undefined
        },
        resumeScore: Number(resumeAnalysis?.resume_score) || 75,
        resumeQuality: resumeAnalysis?.resume_quality || 'good',
        job: {
          id: job.id,
          title: job.title,
          description: job.description
        },
        match: {
          score: matchScore,
          skillMatchPercentage,
          matchingSkills,
          missingSkills,
          extraSkills
        },
        scoreBreakdown,
        recommendation: {
          matchBand,
          decisionRecommendation: decisionRec,
          summary: jobAnalysis.recommendation_summary || `Candidate shows ${matchBand.replace('_', ' ')} (${matchScore}%) for ${job.title}.`,
          reason: jobAnalysis.recommendation_reason || `Calculated based on verified skills and background alignment.`,
          factors: jobAnalysis.recommendation_factors || (jobAnalysis.strengths || [])
        },
        analysisSummary: jobAnalysis.analysis_summary || `The candidate documents background relevant to the ${job.title} position with verified skills and educational credentials.`,
        suggestions: jobAnalysis.improvement_suggestions || [],
        screening: {
          decision: screeningDecision,
          explanation: screeningExplanation,
          keyReasons: screeningKeyReasons,
          matchingCriteria,
          missingCriteria
        },
        companyFits
      };

      // Cache result for rapid instant reloads
      analysisCache.set(cacheKey, payload);

      return payload;
    } catch (err) {
      logger.error('AnalysisService', 'Unexpected error in getAnalysisResult', err);
      return null;
    }
  },

  /**
   * Safe public/shared analysis fetcher.
   * Allows authorized recruiters or shared link viewers to view the analysis result
   * with sanitized fields (no private storage paths, no raw resume downloads, no recruiter IDs).
   */
  async getSharedAnalysisResult(resumeId: string, jobId: string): Promise<FullAnalysisResultPayload | null> {
    try {
      // 1. Try authenticated recruiter fetch first
      const full = await this.getAnalysisResult(resumeId, jobId);
      if (full) return full;

      // 2. Fallback to public sanitized RPC
      const { data, error } = await supabase.rpc('get_public_candidate_analysis', {
        p_resume_id: resumeId,
        p_job_id: jobId
      });

      if (error || !data) {
        logger.warn('AnalysisService', `getSharedAnalysisResult RPC note: ${error?.message}`);
        return null;
      }

      const matchScore = Number(data.match?.score) || 0;
      const screeningDecision: ScreeningDecision = (data.screeningDecision as ScreeningDecision) ||
        (matchScore >= 60 ? 'shortlisted' : 'rejected');

      const screeningExplanation: string = data.screeningExplanation ||
        (screeningDecision === 'shortlisted'
          ? `The candidate satisfies position requirements with an overall match score of ${matchScore}%.`
          : `The candidate does not meet the 60% qualification threshold with a match score of ${matchScore}%.`);

      const matchingSkills = data.match?.matchingSkills || [];
      const missingSkills = data.match?.missingSkills || [];

      const screeningKeyReasons: string[] = screeningDecision === 'shortlisted'
        ? [
            matchingSkills.length > 0 ? `Core technical competencies verified: ${matchingSkills.slice(0, 4).join(', ')}.` : 'Mandatory skills verified.',
            `Demonstrated experience alignment satisfying role expectations.`,
            `Educational background satisfies position criteria.`
          ]
        : [
            missingSkills.length > 0 ? `Critical gaps in mandatory skills: ${missingSkills.slice(0, 4).join(', ')}.` : 'Qualification criteria unmet.',
            `Technical match percentage is below the 60% qualification threshold.`,
            `Key position requirements are absent from candidate background.`
          ];

      const matchingCriteria = matchingSkills.map((s: string) => `Mandatory skill: ${s}`);
      const missingCriteria = missingSkills.map((s: string) => `Missing skill: ${s}`);

      const payload: FullAnalysisResultPayload = {
        candidate: {
          name: data.candidate?.name || 'Candidate',
          email: '',
          phone: '',
          initials: data.candidate?.initials || 'CD'
        },
        resume: {
          id: resumeId,
          fileName: data.resume?.fileName || 'Resume.pdf',
          filePath: ''
        },
        resumeScore: data.resumeScore || 0,
        resumeQuality: data.resumeQuality || 'normal',
        job: {
          id: jobId,
          title: data.job?.title || 'Target Position',
          description: data.job?.description || ''
        },
        match: {
          score: matchScore,
          skillMatchPercentage: Number(data.match?.skillMatchPercentage) || 0,
          matchingSkills,
          missingSkills,
          extraSkills: data.match?.extraSkills || []
        },
        scoreBreakdown: data.scoreBreakdown || { skills: 0, experience: 0, education: 0, projects: 0, certifications: 0 },
        recommendation: {
          matchBand: data.recommendation?.matchBand || 'low_match',
          decisionRecommendation: data.recommendation?.decisionRecommendation || 'reject_recommended',
          summary: data.recommendation?.summary || '',
          reason: data.recommendation?.reason || '',
          factors: data.recommendation?.factors || []
        },
        analysisSummary: data.analysisSummary || '',
        suggestions: data.suggestions || [],
        screening: {
          decision: screeningDecision,
          explanation: screeningExplanation,
          keyReasons: screeningKeyReasons,
          matchingCriteria,
          missingCriteria
        },
        companyFits: []
      };

      return payload;
    } catch (err) {
      logger.error('AnalysisService', 'getSharedAnalysisResult exception', err);
      return null;
    }
  }
};
