import React from 'react';
import { User, Briefcase, Mail, Phone, FileText, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import type { ScreeningDecision } from '../../types/resume.types';

interface CandidateHeaderProps {
  candidateName: string;
  candidateEmail?: string | null;
  candidatePhone?: string | null;
  initials: string;
  targetJobTitle: string;
  fileName: string;
  screeningDecision?: ScreeningDecision | string | null;
  candidatesCount?: number;
  currentCandidateIndex?: number;
  onSelectCandidateIndex?: (index: number) => void;
}

export const CandidateHeader: React.FC<CandidateHeaderProps> = ({
  candidateName,
  candidateEmail,
  candidatePhone,
  initials,
  targetJobTitle,
  fileName,
  screeningDecision,
  candidatesCount = 1,
  currentCandidateIndex = 0,
  onSelectCandidateIndex
}) => {
  const getDecisionBadge = () => {
    if (screeningDecision === 'shortlisted') {
      return (
        <span className="pill-badge pill-emerald">
          <CheckCircle size={13} />
          Status: Shortlisted
        </span>
      );
    }
    if (screeningDecision === 'rejected') {
      return (
        <span className="pill-badge pill-rose">
          <XCircle size={13} />
          Status: Rejected
        </span>
      );
    }
    return (
      <span className="pill-badge pill-cyan">
        <CheckCircle size={13} />
        Status: Shortlisted
      </span>
    );
  };

  return (
    <div className="analysis-card">
      <div className="candidate-header-flex">
        {/* Left: Avatar & Candidate Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="candidate-avatar-gradient">
            {initials || <User size={28} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {candidateName}
              </h1>
              {getDecisionBadge()}
            </div>

            {/* Target Job Highlight & File */}
            <div className="candidate-meta-badges">
              <span className="pill-badge pill-cyan">
                <Briefcase size={12} />
                Target Job: <strong style={{ color: 'var(--text-primary)', marginLeft: 3 }}>{targetJobTitle}</strong>
              </span>
              <span className="pill-badge pill-slate">
                <FileText size={12} />
                {fileName}
              </span>
            </div>

            {/* Contact Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              {candidateEmail && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={13} color="var(--text-muted)" />
                  {candidateEmail}
                </span>
              )}
              {candidatePhone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={13} color="var(--text-muted)" />
                  {candidatePhone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Candidate Navigation (if multi-candidate screening) */}
        {candidatesCount > 1 && onSelectCandidateIndex && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-hover-bg)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '0.35rem 0.6rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Candidate <strong>{currentCandidateIndex + 1}</strong> of <strong>{candidatesCount}</strong>
            </span>
            <button
              onClick={() => onSelectCandidateIndex(Math.max(0, currentCandidateIndex - 1))}
              disabled={currentCandidateIndex === 0}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.45rem' }}
              title="Previous Candidate"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onSelectCandidateIndex(Math.min(candidatesCount - 1, currentCandidateIndex + 1))}
              disabled={currentCandidateIndex === candidatesCount - 1}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.45rem' }}
              title="Next Candidate"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
