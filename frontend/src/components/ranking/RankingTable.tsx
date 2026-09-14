import React from 'react';
import { RankingRow } from './RankingRow';
import type { RankingCandidate } from '../../types/ranking.types';

interface RankingTableProps {
  candidates: RankingCandidate[];
}

export const RankingTable: React.FC<RankingTableProps> = ({ candidates }) => {
  if (candidates.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748b' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>
          No Analyzed Candidates Found
        </div>
        <p className="text-sm text-muted mt-1" style={{ maxWidth: '400px', margin: '0.25rem auto 0' }}>
          Candidates will appear here automatically once their resumes are analyzed against active jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="table-wrapper" style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'center', width: '70px' }}>Rank</th>
            <th>Candidate Name</th>
            <th>Role</th>
            <th>Score</th>
            <th>Status</th>
            <th style={{ width: '100px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <RankingRow key={`${candidate.id}-${candidate.rank}`} candidate={candidate} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
