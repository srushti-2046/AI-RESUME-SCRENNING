import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, BookOpen } from 'lucide-react';
import type { CandidateListItem } from '../../types/candidate.types';

interface CandidateCardProps {
  candidate: CandidateListItem;
  onSummary: (candidate: CandidateListItem) => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, onSummary }) => {
  const navigate = useNavigate();

  const handleView = () => {
    if (candidate.resumeId && candidate.jobId) {
      navigate(`/analysis?resumeId=${candidate.resumeId}&jobId=${candidate.jobId}`);
    } else {
      navigate('/analysis');
    }
  };

  const isShortlisted = candidate.status === 'shortlisted';
  const isPending = candidate.status === 'pending_review' || candidate.status === 'screening';
  const scoreColor = candidate.score >= 80 ? 'var(--green)' : candidate.score >= 60 ? '#0984e3' : 'var(--red)';
  const statusBadgeClass = isShortlisted ? 'badge-green' : isPending ? 'badge-yellow' : 'badge-red';
  const statusBadgeLabel = isShortlisted ? 'Shortlisted' : isPending ? 'Pending Review' : 'Rejected';

  return (
    <div className="candidate-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="candidate-card-avatar">
        {candidate.initials}
      </div>

      <div className="font-bold" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
        {candidate.candidateName}
      </div>

      <div className="text-sm text-muted" style={{ marginTop: '0.2rem', minHeight: '1.2rem' }}>
        {candidate.role}
      </div>

      <div className="flex items-center justify-center gap-2 mt-3">
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: scoreColor }}>
          {candidate.score}%
        </div>
        <span className={`badge ${statusBadgeClass}`}>
          {statusBadgeLabel}
        </span>
      </div>

      <div className="text-xs text-muted mt-2" style={{ fontWeight: 500 }}>
        Experience: {candidate.experience}
      </div>

      <div className="flex items-center gap-2 mt-4" style={{ justifyContent: 'center', marginTop: 'auto', paddingTop: '1rem' }}>
        <button
          onClick={handleView}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flex: 1, justifyContent: 'center' }}
          title="View full AI analysis result"
        >
          <Eye size={13} /> View
        </button>
        <button
          onClick={() => onSummary(candidate)}
          className="btn btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flex: 1, justifyContent: 'center' }}
          title="View compact candidate summary"
        >
          <BookOpen size={13} /> Summary
        </button>
      </div>
    </div>
  );
};
