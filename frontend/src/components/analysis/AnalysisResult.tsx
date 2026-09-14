import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnalysisService } from '../../services/analysis.service';
import type { FullAnalysisResultPayload } from '../../types/resume.types';
import { CandidateHeader } from './CandidateHeader';
import { ScoreBreakdown } from './ScoreBreakdown';
import { AIRecommendation } from './AIRecommendation';
import { SkillsMatch } from './SkillsMatch';
import { AnalysisSummary } from './AnalysisSummary';
import { Suggestions } from './Suggestions';
import { CompanyFit } from './CompanyFit';
import { AIScreeningResult } from './AIScreeningResult';
import { ArrowLeft, Loader2, RefreshCw, FileSearch, Upload, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AnalysisResultProps {
  onNavigateBack?: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ onNavigateBack }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FullAnalysisResultPayload | null>(null);

  const urlResumeId = searchParams.get('resumeId');
  const urlJobId = searchParams.get('jobId');

  useEffect(() => {
    loadAnalysis();
  }, [urlResumeId, urlJobId]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      // If no candidate is selected in URL, do NOT load any arbitrary or cached resume
      if (!urlResumeId) {
        setData(null);
        setLoading(false);
        return;
      }

      let targetJobId = urlJobId || '';

      // If jobId was not provided in URL, resolve it from the candidate's analysis record
      if (!targetJobId) {
        const { data: jobMatch } = await supabase
          .from('resume_job_analysis')
          .select('job_id')
          .eq('resume_id', urlResumeId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jobMatch?.job_id) {
          targetJobId = jobMatch.job_id;
        }
      }

      if (urlResumeId && targetJobId) {
        const result = await AnalysisService.getSharedAnalysisResult(urlResumeId, targetJobId);
        if (result) {
          setData(result);
          setLoading(false);
          return;
        }
      }

      // If candidate was not found in database, do NOT show any mock data
      setData(null);
    } catch (err) {
      console.error('Error loading analysis result:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
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
              No Candidate Selected for Analysis
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0, maxWidth: 480 }}>
              There is currently no candidate analysis to display. Please select a candidate from your Candidates list or upload a resume to view comprehensive AI matching scores, skill gaps, and evaluation reports.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/candidates')}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.1rem' }}
            >
              <Users size={15} /> Select from Candidates
            </button>
            <button
              onClick={() => navigate('/upload')}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.1rem' }}
            >
              <Upload size={15} /> Upload &amp; Screen Resume
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-page-wrapper">
      {/* Top Bar: Back Button & Actions */}
      <div className="analysis-top-nav">
        {urlResumeId ? (
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        ) : onNavigateBack ? (
          <button
            onClick={onNavigateBack}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} /> Back to Upload Resumes
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
        candidatesCount={1}
        currentCandidateIndex={0}
        onSelectCandidateIndex={() => {}}
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
