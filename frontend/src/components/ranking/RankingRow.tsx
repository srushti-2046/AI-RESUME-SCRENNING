import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import type { RankingCandidate } from '../../types/ranking.types';

interface RankingRowProps {
  candidate: RankingCandidate;
}

export const RankingRow: React.FC<RankingRowProps> = ({ candidate }) => {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/analysis?resumeId=${candidate.resumeId}&jobId=${candidate.jobId}`);
  };

  // Render rank medal or numeric badge
  const renderRank = (rank: number) => {
    if (rank === 1) return <span style={{ fontSize: '1.25rem' }} title="Rank 1 - Gold">🥇</span>;
    if (rank === 2) return <span style={{ fontSize: '1.25rem' }} title="Rank 2 - Silver">🥈</span>;
    if (rank === 3) return <span style={{ fontSize: '1.25rem' }} title="Rank 3 - Bronze">🥉</span>;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          background: '#f1f5f9',
          color: '#475569',
          fontWeight: 700,
          fontSize: '0.85rem'
        }}
      >
        {rank}
      </span>
    );
  };

  const isShortlisted = candidate.status === 'shortlisted';
  const scoreColor = candidate.matchScore >= 80 ? '#10b981' : candidate.matchScore >= 60 ? '#0284c7' : '#ef4444';

  return (
    <tr>
      {/* Rank */}
      <td style={{ textAlign: 'center', width: '70px' }}>
        {renderRank(candidate.rank)}
      </td>

      {/* Candidate Name & Avatar */}
      <td>
        <div className="flex items-center gap-2">
          <div
            className="candidate-avatar-sm"
            style={{
              width: '32px',
              height: '32px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {candidate.initials}
          </div>
          <div>
            <div className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              {candidate.candidateName}
            </div>
            {candidate.resumeScore > 0 && (
              <div className="text-xs text-muted" style={{ fontSize: '0.72rem' }}>
                Resume Quality: {candidate.resumeScore}/100
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Target Role */}
      <td className="text-muted" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
        {candidate.role}
      </td>

      {/* Score with Progress Indicator */}
      <td>
        <div className="flex items-center gap-2">
          <span style={{ fontWeight: 800, fontSize: '0.98rem', color: scoreColor, minWidth: '40px' }}>
            {candidate.matchScore}%
          </span>
          <div style={{ width: 80 }}>
            <div
              className="progress-bar-wrap"
              style={{
                height: 6,
                background: 'var(--border)',
                borderRadius: 4,
                overflow: 'hidden'
              }}
            >
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, candidate.matchScore))}%`,
                  height: '100%',
                  background: scoreColor,
                  borderRadius: 4,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        </div>
      </td>

      {/* Status & Match Band */}
      <td>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`badge ${isShortlisted ? 'badge-green' : 'badge-red'}`}
            style={{ fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}
          >
            {isShortlisted ? 'Shortlisted' : 'Rejected'}
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              background: 'var(--card-hover-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)'
            }}
          >
            {candidate.matchBandLabel}
          </span>
        </div>
      </td>

      {/* Action: strictly View */}
      <td>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleView}
          title="View full AI screening analysis"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Eye size={13} /> View
        </button>
      </td>
    </tr>
  );
};
