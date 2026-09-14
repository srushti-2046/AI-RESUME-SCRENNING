import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, BookOpen } from 'lucide-react';
import type { CandidateListItem } from '../../types/candidate.types';

interface CandidateTableProps {
  candidates: CandidateListItem[];
  onSummary: (candidate: CandidateListItem) => void;
}

export const CandidateTable: React.FC<CandidateTableProps> = ({ candidates, onSummary }) => {
  const navigate = useNavigate();

  const handleView = (c: CandidateListItem) => {
    if (c.resumeId && c.jobId) {
      navigate(`/analysis?resumeId=${c.resumeId}&jobId=${c.jobId}`);
    } else {
      navigate('/analysis');
    }
  };

  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: '1.25rem' }}>Candidate</th>
              <th>Role</th>
              <th>Experience</th>
              <th>Score</th>
              <th>Status</th>
              <th style={{ textAlign: 'center', paddingRight: '1.25rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const isShortlisted = c.status === 'shortlisted';
              const scoreColor = c.score >= 80 ? 'var(--green)' : c.score >= 60 ? '#0984e3' : 'var(--red)';

              return (
                <tr key={c.id}>
                  <td style={{ paddingLeft: '1.25rem' }}>
                    <div className="flex items-center gap-2">
                      <div className="candidate-avatar-sm" style={{ fontWeight: 800 }}>
                        {c.initials}
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {c.candidateName}
                      </span>
                    </div>
                  </td>
                  <td className="text-muted" style={{ fontWeight: 500 }}>
                    {c.role}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {c.experience}
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: scoreColor }}>
                      {c.score}%
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${isShortlisted ? 'badge-green' : 'badge-red'}`}>
                      {isShortlisted ? 'Shortlisted' : 'Rejected'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', paddingRight: '1.25rem' }}>
                    <div className="flex gap-2" style={{ justifyContent: 'center' }}>
                      <button
                        onClick={() => handleView(c)}
                        className="btn btn-secondary btn-sm"
                        title="View Full Analysis"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem' }}
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => onSummary(c)}
                        className="btn btn-secondary btn-sm"
                        title="View Candidate Summary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem' }}
                      >
                        <BookOpen size={13} /> Summary
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
