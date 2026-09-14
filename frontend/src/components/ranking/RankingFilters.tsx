import React from 'react';
import { Search, X, Briefcase } from 'lucide-react';

interface RankingFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  jobs: Array<{ id: string; title: string }>;
  selectedJobId: string;
  onJobChange: (jobId: string) => void;
  totalCount: number;
}

export const RankingFilters: React.FC<RankingFiltersProps> = ({
  search,
  onSearchChange,
  jobs,
  selectedJobId,
  onJobChange,
  totalCount
}) => {
  return (
    <div
      className="flex items-center justify-between gap-3 mb-4 flex-wrap"
      style={{
        background: 'var(--card-bg)',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        border: '1.5px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}
    >
      {/* Left side: Job Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted" style={{ fontWeight: 600 }}>
          <Briefcase size={14} style={{ color: 'var(--accent)' }} />
          <span>Filter by Job:</span>
        </div>
        <select
          value={selectedJobId}
          onChange={(e) => onJobChange(e.target.value)}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '8px',
            border: '1.5px solid var(--border)',
            background: 'var(--card-hover-bg)',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            fontWeight: 500,
            cursor: 'pointer',
            outline: 'none',
            minWidth: '200px'
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

      {/* Right side: Search Box */}
      <div style={{ position: 'relative', width: '280px' }}>
        <Search
          size={15}
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
            fontSize: '0.85rem',
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
