import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, XCircle, Eye, Sparkles, Loader2 } from 'lucide-react';
import { CandidateService } from '../../services/candidate.service';
import type { CandidateListItem, CandidateSummaryData } from '../../types/candidate.types';

interface CandidateSummaryModalProps {
  candidate: CandidateListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CandidateSummaryModal: React.FC<CandidateSummaryModalProps> = ({
  candidate,
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CandidateSummaryData | null>(null);

  useEffect(() => {
    if (!isOpen || !candidate) {
      setSummary(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    CandidateService.getCandidateSummary(candidate.id, candidate.resumeId, candidate.jobId)
      .then((data) => {
        if (isMounted) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching candidate summary:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, candidate]);

  if (!isOpen || !candidate) return null;

  const isShortlisted = (summary?.status || candidate.status) === 'shortlisted';
  const matchScore = summary?.matchScore ?? candidate.score;
  const resumeScore = summary?.resumeScore ?? candidate.resumeScore;

  const handleOpenFullAnalysis = () => {
    onClose();
    if (candidate.resumeId && candidate.jobId) {
      navigate(`/analysis?resumeId=${candidate.resumeId}&jobId=${candidate.jobId}`);
    } else {
      navigate('/analysis');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="candidate-avatar-sm" style={{ width: 44, height: 44, fontSize: '1rem', fontWeight: 800 }}>
              {candidate.initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  {summary?.candidateName || candidate.candidateName}
                </h2>
                <span className={`badge ${isShortlisted ? 'badge-green' : 'badge-red'}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                  {isShortlisted ? 'Shortlisted' : 'Rejected'}
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>
                {summary?.targetRole || candidate.role}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: '#6b7280' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 0.75rem', color: 'var(--accent)' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading candidate summary...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Key Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Match Score</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: matchScore >= 80 ? 'var(--green)' : matchScore >= 60 ? '#0984e3' : 'var(--red)', marginTop: '0.15rem' }}>
                  {matchScore}%
                </div>
              </div>

              <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Resume Score</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#111827', marginTop: '0.15rem' }}>
                  {resumeScore}%
                </div>
              </div>

              <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Experience</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', marginTop: '0.35rem' }}>
                  {summary?.experience || candidate.experience}
                </div>
              </div>

              <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Education</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', marginTop: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={summary?.education || 'Degree'}>
                  {summary?.education || 'Degree'}
                </div>
              </div>
            </div>

            {/* Why Shortlisted / Why Rejected Card */}
            <div
              style={{
                background: isShortlisted ? 'rgba(0, 184, 148, 0.08)' : 'rgba(225, 112, 85, 0.08)',
                border: `1.5px solid ${isShortlisted ? 'rgba(0, 184, 148, 0.3)' : 'rgba(225, 112, 85, 0.3)'}`,
                borderRadius: '12px',
                padding: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.88rem', color: isShortlisted ? '#00b894' : '#e17055', marginBottom: '0.4rem' }}>
                {isShortlisted ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {isShortlisted ? 'Why Shortlisted:' : 'Why Rejected:'}
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#374151', lineHeight: 1.5 }}>
                {summary?.whyExplanation}
              </p>
            </div>

            {/* Skills Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Matching Skills */}
              <div style={{ background: '#f9fafb', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={13} /> Matching Skills ({summary?.matchingSkills?.length || 0})
                </div>
                {summary?.matchingSkills && summary.matchingSkills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {summary.matchingSkills.map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.74rem',
                          fontWeight: 600
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.76rem', color: '#9ca3af', fontStyle: 'italic' }}>No matching skills identified</span>
                )}
              </div>

              {/* Missing Skills */}
              <div style={{ background: '#f9fafb', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <XCircle size={13} /> Missing Skills ({summary?.missingSkills?.length || 0})
                </div>
                {summary?.missingSkills && summary.missingSkills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {summary.missingSkills.map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#fef2f2',
                          color: '#991b1b',
                          border: '1px solid #fecaca',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.74rem',
                          fontWeight: 600
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 600 }}>All mandatory skills met!</span>
                )}
              </div>
            </div>

            {/* AI Analysis Summary */}
            <div style={{ background: 'var(--card-hover-bg)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={13} color="var(--accent)" /> AI Summary
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {summary?.aiSummary}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={onClose}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
              >
                Close
              </button>
              <button
                onClick={handleOpenFullAnalysis}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1.15rem', fontSize: '0.82rem' }}
              >
                <Eye size={14} /> Open Full Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
