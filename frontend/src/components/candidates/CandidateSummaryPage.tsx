import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  Award,
  BookOpen,
  Briefcase,
  Sparkles,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { CandidateService } from '../../services/candidate.service';
import type { CandidateListItem, CandidateSummaryData } from '../../types/candidate.types';

export const CandidateSummaryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [candidatesList, setCandidatesList] = useState<CandidateListItem[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateListItem | null>(null);
  const [summary, setSummary] = useState<CandidateSummaryData | null>(null);

  const urlCandidateId = searchParams.get('candidateId') || searchParams.get('id');

  useEffect(() => {
    loadCandidatesAndSummary();
  }, [urlCandidateId]);

  const loadCandidatesAndSummary = async () => {
    setLoading(true);
    try {
      const { candidates } = await CandidateService.getCandidates({ pageSize: 50 });
      // Sort candidates by match score descending
      const sorted = [...candidates].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
      setCandidatesList(sorted);

      let targetCand: CandidateListItem | null = null;
      if (urlCandidateId) {
        targetCand = sorted.find(c => c.id === urlCandidateId) || null;
      }
      if (!targetCand && sorted.length > 0) {
        targetCand = sorted[0];
      }

      setSelectedCandidate(targetCand);

      if (targetCand) {
        const sumData = await CandidateService.getCandidateSummary(
          targetCand.id,
          targetCand.resumeId,
          targetCand.jobId
        );
        setSummary(sumData);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error('Error loading candidate summary page:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (cand: CandidateListItem) => {
    setSelectedCandidate(cand);
    setSearchParams({ candidateId: cand.id });
  };

  const handleExportSummary = () => {
    if (!selectedCandidate && !summary) return;
    const name = summary?.candidateName || selectedCandidate?.candidateName || 'Candidate';
    const content = `CANDIDATE SUMMARY REPORT\n========================\nName: ${name}\nRole: ${summary?.targetRole || selectedCandidate?.role}\nMatch Score: ${summary?.matchScore ?? selectedCandidate?.score}%\nResume Score: ${summary?.resumeScore ?? selectedCandidate?.resumeScore}/100\nStatus: ${summary?.status || selectedCandidate?.status}\nExperience: ${summary?.experience || selectedCandidate?.experience}\nEducation: ${summary?.education || 'Degree'}\n\nMatching Skills:\n${(summary?.matchingSkills || []).map(s => ` - ${s}`).join('\n')}\n\nSummary:\n${summary?.analysisSummary || 'Evaluation completed successfully.'}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/\s+/g, '_')}_Summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={36} color="var(--accent)" className="spin" />
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Loading candidate profile &amp; summary...
        </p>
      </div>
    );
  }

  if (!selectedCandidate) {
    return (
      <div style={{ maxWidth: 640, margin: '4rem auto', textAlign: 'center', padding: '2rem' }} className="card">
        <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, color: 'var(--text-muted)' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>No Candidates Found</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
          Upload or screen candidate resumes to view comprehensive AI profiles and summaries here.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>
          Upload Resumes
        </button>
      </div>
    );
  }

  const isShortlisted = (summary?.status || selectedCandidate.status) === 'shortlisted';
  const matchScore = summary?.matchScore ?? selectedCandidate.score;
  const resumeScore = summary?.resumeScore ?? selectedCandidate.resumeScore;
  const scoreColor = matchScore >= 80 ? 'var(--green, #10b981)' : matchScore >= 60 ? '#0984e3' : 'var(--red, #ef4444)';

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/candidates')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} /> Back to Candidates
          </button>

          {/* Candidate Switcher Dropdown */}
          {candidatesList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserCheck size={15} color="var(--accent)" />
              <select
                value={selectedCandidate.id}
                onChange={(e) => {
                  const found = candidatesList.find(c => c.id === e.target.value);
                  if (found) handleSelectCandidate(found);
                }}
                className="form-select"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--card-hover-bg)',
                  color: 'var(--text-primary)',
                  maxWidth: 280
                }}
              >
                {candidatesList.map((cand, idx) => (
                  <option key={cand.id} value={cand.id}>
                    #{idx + 1} {cand.candidateName} ({cand.score}%)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/ranking')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Award size={14} /> View in Ranking
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportSummary}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} /> Export Summary
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              const targetId = selectedCandidate.resumeId || selectedCandidate.id;
              navigate(`/analysis?resumeId=${targetId}&candidateId=${selectedCandidate.id}${selectedCandidate.jobId ? `&jobId=${selectedCandidate.jobId}` : ''}`);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Eye size={14} /> Full AI Analysis
          </button>
        </div>
      </div>

      {/* Main Candidate Summary Card Header */}
      <div className="card mb-4" style={{ padding: '1.75rem', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              className="candidate-avatar-sm"
              style={{
                width: 60,
                height: 60,
                fontSize: '1.3rem',
                fontWeight: 800,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
              }}
            >
              {selectedCandidate.initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                  {summary?.candidateName || selectedCandidate.candidateName}
                </h1>
                <span
                  className={`badge ${isShortlisted ? 'badge-green' : 'badge-red'}`}
                  style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.25rem 0.65rem' }}
                >
                  {isShortlisted ? 'Shortlisted' : 'Rejected'}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 600 }}>
                {summary?.targetRole || selectedCandidate.role}
              </div>
              {(summary?.email || summary?.phone) && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', gap: '1rem' }}>
                  {summary.email && <span>📧 {summary.email}</span>}
                  {summary.phone && <span>📞 {summary.phone}</span>}
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                {matchScore}%
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.25rem', textTransform: 'uppercase' }}>
                Job Match Score
              </div>
            </div>

            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
                {resumeScore}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.25rem', textTransform: 'uppercase' }}>
                Resume Quality /100
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid-2" style={{ alignItems: 'start', gap: '1.5rem' }}>
        {/* Left Column: Skills & Background */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Key Qualifications */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={16} color="var(--accent)" /> Professional Profile
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--card-hover-bg)', padding: '0.85rem', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Experience</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {summary?.experience || selectedCandidate.experience || '2+ years'}
                </div>
              </div>
              <div style={{ background: 'var(--card-hover-bg)', padding: '0.85rem', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Highest Education</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {summary?.education || 'Bachelor\'s Degree'}
                </div>
              </div>
            </div>
          </div>

          {/* Technical Skills Matching */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--green, #10b981)" /> Matching Skills
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {(summary?.matchingSkills && summary.matchingSkills.length > 0) ? (
                summary.matchingSkills.map((skill, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: 'var(--green, #059669)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}
                  >
                    ✓ {skill}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  General domain competence identified.
                </span>
              )}
            </div>

            {summary?.missingSkills && summary.missingSkills.length > 0 && (
              <>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <XCircle size={14} color="var(--red, #ef4444)" /> Missing / Desired Skills
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {summary.missingSkills.map((skill, i) => (
                    <span
                      key={i}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'var(--red, #dc2626)',
                        padding: '0.3rem 0.65rem',
                        borderRadius: 8,
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      ✗ {skill}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: AI Analysis & Recommendation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Executive Summary */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="var(--accent)" /> AI Screening Evaluation
            </h3>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
              {summary?.analysisSummary ||
                `The candidate has undergone deterministic screening against the ${summary?.targetRole || selectedCandidate.role} requirements. With a composite match score of ${matchScore}%, the candidate is classified as ${isShortlisted ? 'Shortlisted' : 'Rejected'} based on verified skills and background alignment.`}
            </p>
          </div>

          {/* Screening Decision Details */}
          <div
            className="card"
            style={{
              borderLeft: `4px solid ${isShortlisted ? 'var(--green, #10b981)' : 'var(--red, #ef4444)'}`,
              background: isShortlisted ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)'
            }}
          >
            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Screening Recommendation: {isShortlisted ? 'Shortlist for Review' : 'Does Not Meet Cutoff'}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              {isShortlisted
                ? `Candidate satisfies the 60% qualification benchmark (${matchScore}%) with documented domain competencies and background alignment.`
                : `Candidate match score (${matchScore}%) falls below the 60% qualification cutoff threshold for this position.`}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Ready to inspect detailed breakdown?
            </h4>
            <button
              className="btn btn-primary"
              onClick={() => {
                const targetId = selectedCandidate.resumeId || selectedCandidate.id;
                navigate(`/analysis?resumeId=${targetId}&candidateId=${selectedCandidate.id}${selectedCandidate.jobId ? `&jobId=${selectedCandidate.jobId}` : ''}`);
              }}
              style={{ width: '100%', padding: '0.65rem 1.25rem', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              Open Comprehensive AI Analysis <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
