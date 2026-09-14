import React from 'react';
import { Filter, LayoutGrid, Table } from 'lucide-react';
import type { CandidateFilterTab, CandidateCounts } from '../../types/candidate.types';

interface CandidateFiltersProps {
  currentTab: CandidateFilterTab;
  counts: CandidateCounts;
  onTabChange: (tab: CandidateFilterTab) => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
}

export const CandidateFilters: React.FC<CandidateFiltersProps> = ({
  currentTab,
  counts,
  onTabChange,
  viewMode,
  onViewModeChange
}) => {
  const tabs: Array<{ id: CandidateFilterTab; label: string; count: number }> = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'shortlisted', label: 'Shortlisted', count: counts.shortlisted },
    { id: 'rejected', label: 'Rejected', count: counts.rejected }
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
      {/* Left: Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: '0.82rem', fontWeight: 600, marginRight: '0.2rem' }}>
          <Filter size={14} /> Status:
        </div>

        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '0.42rem 0.95rem',
                borderRadius: 20,
                border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                background: isActive ? 'var(--accent)' : 'var(--card-bg)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: isActive ? '0 2px 8px rgba(108,92,231,0.25)' : 'none'
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--card-hover-bg)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 10,
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: View Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card-hover-bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <button
          onClick={() => onViewModeChange('grid')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            border: 'none',
            background: viewMode === 'grid' ? 'var(--card-bg)' : 'transparent',
            color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: viewMode === 'grid' ? 700 : 500,
            fontSize: '0.78rem',
            cursor: 'pointer',
            boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s ease'
          }}
          title="Switch to Grid View"
        >
          <LayoutGrid size={13} /> Grid View
        </button>
        <button
          onClick={() => onViewModeChange('table')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            border: 'none',
            background: viewMode === 'table' ? 'var(--card-bg)' : 'transparent',
            color: viewMode === 'table' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: viewMode === 'table' ? 700 : 500,
            fontSize: '0.78rem',
            cursor: 'pointer',
            boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s ease'
          }}
          title="Switch to Table View"
        >
          <Table size={13} /> Table View
        </button>
      </div>
    </div>
  );
};
