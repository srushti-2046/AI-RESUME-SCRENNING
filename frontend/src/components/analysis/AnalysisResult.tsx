import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnalysisService } from '../../services/analysis.service';
import { CandidateService } from '../../services/candidate.service';
import type { FullAnalysisResultPayload } from '../../types/resume.types';
import type { CandidateListItem } from '../../types/candidate.types';
import { CandidateHeader } from './CandidateHeader';
import { ScoreBreakdown } from './ScoreBreakdown';
import { AIRecommendation } from './AIRecommendation';
import { SkillsMatch } from './SkillsMatch';
import { AnalysisSummary } from './AnalysisSummary';
import { Suggestions } from './Suggestions';
import { CompanyFit } from './CompanyFit';
import { AIScreeningResult } from './AIScreeningResult';
import { ArrowLeft, Loader2, RefreshCw, FileSearch, Upload, Users, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AnalysisResultProps {
  onNavigateBack?: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ onNavigateBack }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FullAnalysisResultPayload | null>(null);
  const [candidatesList, setCandidatesList] = useState<CandidateListItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const urlResumeId = searchParams.get('resumeId');
  const urlJobId = searchParams.get('jobId');
  const urlCandidateId = searchParams.get('candidateId');

  useEffect(() => {
    loadAnalysis();
  }, [urlResumeId, urlJobId, urlCandidateId]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      // 1. Fetch available platform candidates so recruiter can browse or auto-select
      const { candidates } = await CandidateService.getCandidates({ pageSize: 50 });
      // Sort candidates list so highest scores appear first
      const sortedCandidates = [...candidates].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
      setCandidatesList(sortedCandidates);

      let targetResumeId = urlResumeId;
      let targetJobId = urlJobId || '';
      let targetCandId = urlCandidateId || '';

      // Check sessionStorage for latest batch analysis if coming from upload
      const cachedBatchStr = sessionStorage.getItem('latest_analysis_result');
      let cachedBatch: any = null;
      if (cachedBatchStr) {
        try {
          cachedBatch = JSON.parse(cachedBatchStr);
        } catch {
          // ignore
        }
      }

      // If no candidate specified in URL, auto-select first from sorted list or session batch
      if (!targetResumeId && !targetCandId) {
        if (cachedBatch?.results && cachedBatch.results.length > 0) {
          const firstBatch = cachedBatch.results[0];
          targetResumeId = firstBatch.resumeId;
          targetCandId = firstBatch.candidateId || '';
          targetJobId = cachedBatch.jobId || targetJobId;
        } else if (sortedCandidates.length > 0) {
          const first = sortedCandidates[0];
          targetResumeId = first.resumeId || first.id;
          targetJobId = first.jobId || '';
          targetCandId = first.id;
          setCurrentIndex(0);
        } else {
          setData(null);
          setLoading(false);
          return;
        }
      } else {
        // Find index of current candidate in sorted list
        const idx = sortedCandidates.findIndex(c => 
          (targetCandId && c.id === targetCandId) ||
          (targetResumeId && (c.resumeId === targetResumeId || c.id === targetResumeId))
        );
        if (idx !== -1) {
          setCurrentIndex(idx);
          if (!targetJobId && sortedCandidates[idx].jobId) {
            targetJobId = sortedCandidates[idx].jobId!;
          }
        }
      }

      // If targetJobId is still empty, resolve from candidate analysis
      if (targetResumeId && !targetJobId) {
        const { data: jobMatch } = await supabase
          .from('resume_job_analysis')
          .select('job_id')
          .eq('resume_id', targetResumeId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jobMatch?.job_id) {
          targetJobId = jobMatch.job_id;
        }
      }

      const lookupId = targetResumeId || targetCandId;
      if (lookupId) {
        const result = await AnalysisService.getAnalysisResult(lookupId, targetJobId);
        if (result) {
          setData(result);
          setLoading(false);
          return;
        }

        const sharedResult = await AnalysisService.getSharedAnalysisResult(lookupId, targetJobId);
        if (sharedResult) {
          setData(sharedResult);
          setLoading(false);
          return;
        }

        // Direct candidate synthesis fallback
        const { data: candFallback } = await supabase
          .from('candidates')
          .select('*, jobs(id, title, description)')
          .eq('id', lookupId)
          .maybeSingle();

        if (candFallback) {
          const jobObj = Array.isArray(candFallback.jobs) ? candFallback.jobs[0] : candFallback.jobs;
          const synth = AnalysisService.synthesizeAnalysisFromCandidate(candFallback, jobObj);
          if (synth) {
            setData(synth);
            setLoading(false);
            return;
          }
        }
      }

      setData(null);
    } catch (err) {
      console.error('Error loading analysis result:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (candidate: CandidateListItem, index: number) => {
    setCurrentIndex(index);
    const targetId = candidate.resumeId || candidate.id;
    setSearchParams({
      resumeId: targetId,
      candidateId: candidate.id,
      ...(candidate.jobId ? { jobId: candidate.jobId } : {})
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
        <Loader2 size={36} color="var(--accent)" className="animate-spin" />
        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Retrieving automated AI screening result &amp; analysis...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="analysis-page-wrapper" style={{ padding: '2rem 1rem' }}>
        <div
          className="card"
          style={{
            maxWidth: 620,
            margin: '3rem auto',
            textAlign: 'center',
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--hover-bg, #f3f4f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent, #6366f1)',
              marginBottom: '0.5rem'
            }}
          >
            <FileSearch size={32} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              No Candidates Available for Analysis
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0, maxWidth: 480 }}>
              There are currently no candidate resumes to display. Please upload a resume to view comprehensive AI matching scores, skill gaps, and evaluation reports.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/upload')}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.1rem' }}
            >
              <Upload size={15} /> Upload &amp; Screen Resume
            </button>
            <button
              onClick={() => navigate('/candidates')}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.1rem' }}
            >
              <Users size={15} /> View Candidates
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-page-wrapper">
      {/* Top Bar: Back Button, Candidate Selector & Actions */}
      <div className="analysis-top-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {urlResumeId || urlCandidateId ? (
            <button
              onClick={() => navigate('/candidates')}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={14} /> Candidates
            </button>
          ) : onNavigateBack ? (
            <button
              onClick={onNavigateBack}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <button
              onClick={() => navigate('/candidates')}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}

          {/* Quick Candidate Switcher Dropdown */}
          {candidatesList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: '0.5rem' }}>
              <UserCheck size={14} color="var(--accent)" />
              <select
                value={candidatesList[currentIndex]?.id || ''}
                onChange={(e) => {
                  const idx = candidatesList.findIndex(c => c.id === e.target.value);
                  if (idx !== -1) handleSelectCandidate(candidatesList[idx], idx);
                }}
                className="form-select"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  maxWidth: 240
                }}
              >
                {candidatesList.map((cand, idx) => (
                  <option key={cand.id} value={cand.id}>
                    {idx + 1}. {cand.candidateName} ({cand.score}%) - {cand.status === 'shortlisted' ? 'Shortlisted' : 'Rejected'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={loadAnalysis}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Refresh Analysis"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* 1. Candidate Overview & Navigation (Shows Automated Status) */}
      <CandidateHeader
        candidateName={data.candidate.name}
        candidateEmail={data.candidate.email}
        candidatePhone={data.candidate.phone}
        initials={data.candidate.initials}
        targetJobTitle={data.job.title}
        fileName={data.resume.fileName}
        screeningDecision={data.screening.decision}
        candidatesCount={candidatesList.length || 1}
        currentCandidateIndex={currentIndex}
        onSelectCandidateIndex={(idx) => {
          if (candidatesList[idx]) {
            handleSelectCandidate(candidatesList[idx], idx);
          }
        }}
      />

      {/* 2. Overall Job Match Score & Explainable Factor Breakdown */}
      <ScoreBreakdown
        matchScore={data.match.score}
        resumeScore={data.resumeScore}
        resumeQuality={data.resumeQuality}
        scoreBreakdown={data.scoreBreakdown}
      />

      {/* 3. AI Recommendation & Transparent Explanation */}
      <AIRecommendation
        matchBand={data.recommendation.matchBand}
        decisionRecommendation={data.recommendation.decisionRecommendation}
        matchScore={data.match.score}
        summary={data.recommendation.summary}
        reason={data.recommendation.reason}
        factors={data.recommendation.factors}
        targetJobTitle={data.job.title}
      />

      {/* 4. Skills Match explicitly linked to Target Job */}
      <SkillsMatch
        targetJobTitle={data.job.title}
        skillMatchPercentage={data.match.skillMatchPercentage}
        matchingSkills={data.match.matchingSkills}
        missingSkills={data.match.missingSkills}
        extraSkills={data.match.extraSkills}
      />

      {/* 5 & 6. Distinct Analysis Summary & Actionable Suggestions */}
      <div className="grid-2">
        <AnalysisSummary summary={data.analysisSummary} />
        <Suggestions suggestions={data.suggestions} />
      </div>

      {/* 7. Company & Role Fit (Estimated Resume Fit with Search) */}
      <CompanyFit companyFits={data.companyFits} />

      {/* 8. Automated AI Screening Result (FINAL SECTION - NO BUTTONS BELOW) */}
      <AIScreeningResult
        decision={data.screening.decision}
        matchScore={data.match.score}
        explanation={data.screening.explanation}
        keyReasons={data.screening.keyReasons}
        matchingCriteria={data.screening.matchingCriteria}
        missingCriteria={data.screening.missingCriteria}
        targetJobTitle={data.job.title}
      />
    </div>
  );
};
