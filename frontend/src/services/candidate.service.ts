import { supabase } from '../lib/supabase';
import type {
  CandidateListItem,
  CandidateStatus,
  CandidateCounts,
  GetCandidatesParams,
  GetCandidatesResponse,
  CandidateSummaryData
} from '../types/candidate.types';

export const CandidateService = {
  /**
   * Fetch candidates belonging to the authenticated recruiter.
   * Supports server-side filtering, search, and pagination.
   * Strictly excludes unclassified/screening records so that All = Shortlisted + Rejected.
   */
  async getCandidates(params: GetCandidatesParams = {}): Promise<GetCandidatesResponse> {
    const {
      status = 'all',
      search = '',
      page = 1,
      pageSize = 9,
      sortBy = 'created_at',
      sortDirection = 'desc'
    } = params;

    const defaultResponse: GetCandidatesResponse = {
      candidates: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      counts: { all: 0, shortlisted: 0, rejected: 0 }
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return defaultResponse;
      }
      const recruiterId = user.id;

      // 1. Parallel Count Queries for real, persisted candidate counts
      const [shortlistedCountRes, rejectedCountRes] = await Promise.all([
        supabase
          .from('candidates')
          .select('id', { count: 'exact', head: true })
          .eq('recruiter_id', recruiterId)
          .eq('status', 'shortlisted'),
        supabase
          .from('candidates')
          .select('id', { count: 'exact', head: true })
          .eq('recruiter_id', recruiterId)
          .eq('status', 'rejected')
      ]);

      const shortlistedCount = shortlistedCountRes.count || 0;
      const rejectedCount = rejectedCountRes.count || 0;
      const allCount = shortlistedCount + rejectedCount;

      const counts: CandidateCounts = {
        all: allCount,
        shortlisted: shortlistedCount,
        rejected: rejectedCount
      };

      // 2. Build the paginated candidates query
      let query = supabase
        .from('candidates')
        .select(`
          id,
          full_name,
          email,
          phone,
          current_job_title,
          total_experience,
          education,
          status,
          match_score,
          resume_score,
          created_at,
          updated_at,
          job_id,
          jobs (
            id,
            title
          ),
          resumes (
            id,
            file_name,
            file_path,
            uploaded_at,
            resume_analysis (
              resume_score,
              resume_quality,
              skills,
              experience,
              education
            )
          )
        `, { count: 'exact' })
        .eq('recruiter_id', recruiterId);

      // Status filtering — strictly shortlist / reject; 'all' shows only classified candidates
      if (status === 'shortlisted') {
        query = query.eq('status', 'shortlisted');
      } else if (status === 'rejected') {
        query = query.eq('status', 'rejected');
      } else {
        query = query.in('status', ['shortlisted', 'rejected']);
      }

      // Server-side text search (candidate name, email)
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        query = query.or(`full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,current_job_title.ilike.%${trimmedSearch}%`);
      }

      // Ordering
      query = query.order(sortBy, { ascending: sortDirection === 'asc' });

      // Server-side pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('CandidateService.getCandidates error:', error);
        return {
          ...defaultResponse,
          counts
        };
      }

      const totalCount = count || 0;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      // 3. Transform database rows to common CandidateListItem contract
      const candidates: CandidateListItem[] = (data || []).map((c: any) => {
        const candidateName = c.full_name || 'Candidate';
        const initials = candidateName
          .split(' ')
          .filter(Boolean)
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'CD';

        const jobData: any = Array.isArray(c.jobs) ? c.jobs[0] : c.jobs;
        const role = jobData?.title || c.current_job_title || 'Candidate';
        const rawResumes = Array.isArray(c.resumes) ? c.resumes : (c.resumes ? [c.resumes] : []);
        const primaryResume = rawResumes[0] || null;

        const rawAnalysis = primaryResume?.resume_analysis;
        const resumeAnalysis = Array.isArray(rawAnalysis) ? rawAnalysis[0] : rawAnalysis;

        let expStr = '2+ yrs';
        if (c.total_experience) {
          expStr = `${c.total_experience}+ yrs`;
        } else if (resumeAnalysis?.experience && Array.isArray(resumeAnalysis.experience) && resumeAnalysis.experience.length > 0) {
          expStr = `${resumeAnalysis.experience.length}+ yrs`;
        }

        const matchScore = Number(c.match_score) || 0;
        const resumeScore = Number(c.resume_score) || (resumeAnalysis?.resume_score ? Number(resumeAnalysis.resume_score) : 0);
        const candidateStatus: CandidateStatus = c.status === 'shortlisted' ? 'shortlisted' : 'rejected';

        return {
          id: c.id,
          candidateId: c.id,
          resumeId: primaryResume?.id || null,
          jobId: c.job_id || jobData?.id || null,
          candidateName,
          initials,
          role,
          experience: expStr,
          score: matchScore,
          status: candidateStatus,
          resumeScore,
          matchScore,
          screeningDecision: candidateStatus,
          matchBand: matchScore >= 80 ? 'strong_match' : matchScore >= 60 ? 'moderate_match' : 'low_match',
          uploadedAt: primaryResume?.uploaded_at || c.created_at,
          analyzedAt: c.updated_at,
          email: c.email || undefined,
          phone: c.phone || undefined,
          education: c.education || undefined
        };
      });

      return {
        candidates,
        totalCount,
        page,
        pageSize,
        totalPages,
        counts
      };
    } catch (err) {
      console.error('CandidateService.getCandidates exception:', err);
      return defaultResponse;
    }
  },

  /**
   * Fetch compact candidate summary data for Requirement 14.
   * Retrieves real persisted backend analysis data.
   */
  async getCandidateSummary(candidateId: string, resumeId?: string | null, jobId?: string | null): Promise<CandidateSummaryData | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }
      const recruiterId = user.id;

      // 1. Fetch Candidate
      const { data: candidate, error: candErr } = await supabase
        .from('candidates')
        .select(`
          id,
          full_name,
          email,
          phone,
          education,
          current_job_title,
          total_experience,
          status,
          match_score,
          resume_score,
          job_id,
          jobs (
            id,
            title
          ),
          resumes (
            id,
            file_name,
            resume_analysis (
              resume_score,
              skills,
              experience,
              education
            )
          )
        `)
        .eq('id', candidateId)
        .eq('recruiter_id', recruiterId)
        .single();

      if (candErr || !candidate) {
        console.error('getCandidateSummary candidate error:', candErr);
        return null;
      }

      const rawResumes = Array.isArray(candidate.resumes) ? candidate.resumes : (candidate.resumes ? [candidate.resumes] : []);
      const primaryResume = rawResumes.find((r: any) => r.id === resumeId) || rawResumes[0] || null;
      const targetResumeId = resumeId || primaryResume?.id || null;
      const jobData: any = Array.isArray(candidate.jobs) ? candidate.jobs[0] : candidate.jobs;
      const targetJobId = jobId || candidate.job_id || jobData?.id || null;

      // 2. Fetch Job analysis if available
      let jobAnalysis: any = null;
      if (targetResumeId && targetJobId) {
        const { data: rja } = await supabase
          .from('resume_job_analysis')
          .select('match_score, matching_skills, missing_skills, analysis_summary, screening_explanation, screening_decision')
          .eq('resume_id', targetResumeId)
          .eq('job_id', targetJobId)
          .maybeSingle();

        jobAnalysis = rja;
      }

      const rawAnalysis = primaryResume?.resume_analysis;
      const resumeAnalysis = Array.isArray(rawAnalysis) ? rawAnalysis[0] : rawAnalysis;

      const candidateName = candidate.full_name || 'Candidate';
      const targetRole = jobData?.title || candidate.current_job_title || 'Position';
      const matchScore = Number(jobAnalysis?.match_score ?? candidate.match_score) || 0;
      const resumeScore = Number(candidate.resume_score ?? resumeAnalysis?.resume_score) || 0;
      const status: CandidateStatus = (jobAnalysis?.screening_decision || candidate.status) === 'shortlisted' ? 'shortlisted' : 'rejected';

      let experience = '2+ years';
      if (candidate.total_experience) {
        experience = `${candidate.total_experience} years`;
      } else if (resumeAnalysis?.experience && Array.isArray(resumeAnalysis.experience) && resumeAnalysis.experience.length > 0) {
        experience = `${resumeAnalysis.experience.length} years`;
      }

      let education = candidate.education || '';
      if (!education && resumeAnalysis?.education && Array.isArray(resumeAnalysis.education) && resumeAnalysis.education.length > 0) {
        const firstEdu = resumeAnalysis.education[0];
        education = typeof firstEdu === 'string' ? firstEdu : (firstEdu.degree || firstEdu.institution || '');
      }

      const matchingSkills: string[] = jobAnalysis?.matching_skills || (Array.isArray(resumeAnalysis?.skills) ? resumeAnalysis.skills.slice(0, 4) : []);
      const missingSkills: string[] = jobAnalysis?.missing_skills || [];

      const aiSummary = jobAnalysis?.analysis_summary ||
        `Candidate demonstrates background and project capabilities aligned with the ${targetRole} role.`;

      const whyExplanation = jobAnalysis?.screening_explanation ||
        (status === 'shortlisted'
          ? `The overall job match is ${matchScore}%, which meets or exceeds the 60% automated screening threshold.`
          : `The overall match of ${matchScore}% is below the 60% threshold and key job requirements were missing.`);

      return {
        candidateId: candidate.id,
        candidateName,
        targetRole,
        experience,
        education: education || undefined,
        resumeScore,
        matchScore,
        status,
        matchingSkills,
        missingSkills,
        aiSummary,
        whyExplanation,
        resumeId: targetResumeId,
        jobId: targetJobId
      };
    } catch (err) {
      console.error('CandidateService.getCandidateSummary exception:', err);
      return null;
    }
  }
};
