import React from 'react';
import { Search, X, Briefcase, ArrowUpDown, Filter } from 'lucide-react';

interface RankingFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  jobs: Array<{ id: string; title: string }>;
  selectedJobId: string;
  onJobChange: (jobId: string) => void;
  sortBy: 'score_desc' | 'score_asc' | 'name_asc';
  onSortChange: (val: 'score_desc' | 'score_asc' | 'name_asc') => void;
  statusFilter: 'all' | 'shortlisted' | 'rejected';
  onStatusChange: (val: 'all' | 'shortlisted' | 'rejected') => void;
  totalCount: number;
}

export const RankingFilters: React.FC<RankingFiltersProps> = ({
  search,
  onSearchChange,
  jobs,
  selectedJobId,
  onJobChange,
  sortBy,
  onSortChange,
  statusFilter,
  onStatusChange,
  totalCount
}) => {
  return (
    <div
      className="flex items-center justify-between gap-3 mb-4 flex-wrap"
      style={{
        background: 'var(--card-bg)',
        padding: '0.85rem 1.15rem',
        borderRadius: '12px',
        border: '1.5px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}
    >
      {/* Left side: Job, Status, and Sort Selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Job Filter */}
        <div className="flex items-center gap-1.5 text-xs text-muted" style={{ fontWeight: 600 }}>
          <Briefcase size={14} style={{ color: 'var(--accent)' }} />
          <span>Job:</span>
          <select
            value={selectedJobId}
            onChange={(e) => onJobChange(e.target.value)}
            style={{
              padding: '0.38rem 0.75rem',
              borderRadius: '8px',
              border: '1.5px solid var(--border)',
              background: 'var(--card-hover-bg)',
              fontSize: '0.84rem',
              color: 'var(--text-primary)',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
              minWidth: '170px'
            }}
          >
            <option value="all">All Jobs ({totalCount} candidates)</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs text-muted" style={{ fontWeight: 600 }}>
          <Filter size={14} style={{ color: 'var(--accent)' }} />
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as any)}
            style={{
              padding: '0.38rem 0.75rem',
              borderRadius: '8px',
              border: '1.5px solid var(--border)',
              background: 'var(--card-hover-bg)',
              fontSize: '0.84rem',
              color: 'var(--text-primary)',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
              minWidth: '130px'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="shortlisted">Shortlisted (≥60%)</option>
            <option value="rejected">Rejected (&lt;60%)</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div className="flex items-center gap-1.5 text-xs text-muted" style={{ fontWeight: 600 }}>
          <ArrowUpDown size={14} style={{ color: 'var(--accent)' }} />
          <span>Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            style={{
              padding: '0.38rem 0.75rem',
              borderRadius: '8px',
              border: '1.5px solid var(--border)',
              background: 'var(--card-hover-bg)',
              fontSize: '0.84rem',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              minWidth: '175px'
            }}
          >
            <option value="score_desc">Match % (Highest First)</option>
            <option value="score_asc">Match % (Lowest First)</option>
            <option value="name_asc">Candidate Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Right side: Search Box */}
      <div style={{ position: 'relative', width: '260px' }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8'
          }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search candidate or role..."
          style={{
            width: '100%',
            padding: '0.42rem 1.8rem 0.42rem 2rem',
            borderRadius: '8px',
            border: '1.5px solid var(--border)',
            fontSize: '0.84rem',
            color: 'var(--text-primary)',
            outline: 'none',
            background: 'var(--card-hover-bg)',
            transition: 'border-color 0.2s, background 0.2s'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.background = 'var(--card-bg)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--card-hover-bg)';
          }}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '2px'
            }}
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
