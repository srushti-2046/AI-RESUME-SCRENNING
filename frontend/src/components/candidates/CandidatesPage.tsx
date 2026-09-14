import React from 'react';
import { useCandidates } from '../../hooks/useCandidates';
import { CandidateFilters } from './CandidateFilters';
import { CandidateSearch } from './CandidateSearch';
import { CandidateCard } from './CandidateCard';
import { CandidateTable } from './CandidateTable';
import { CandidateSummaryModal } from './CandidateSummaryModal';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export const CandidatesPage: React.FC = () => {
  const {
    filter,
    setFilter,
    search,
    setSearch,
    page,
    setPage,
    viewMode,
    setViewMode,
    loading,
    data,
    selectedCandidate,
    isSummaryModalOpen,
    openSummary,
    closeSummary
  } = useCandidates();

  const { candidates, totalCount, totalPages, counts } = data;

  const startRecord = totalCount === 0 ? 0 : (page - 1) * data.pageSize + 1;
  const endRecord = Math.min(page * data.pageSize, totalCount);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p className="page-subtitle">
            Manage and review all {counts.all} classified candidates
          </p>
        </div>

        <CandidateSearch
          value={search}
          onChange={setSearch}
          placeholder="Search candidate or role..."
        />
      </div>

      {/* Filter Tabs & View Toggle */}
      <CandidateFilters
        currentTab={filter}
        counts={counts}
        onTabChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content Area */}
      {loading ? (
        <div className="card" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <Loader2 size={36} className="spin" style={{ margin: '0 auto 1rem', color: 'var(--accent)' }} />
          <div style={{ fontWeight: 700, color: '#374151' }}>Loading candidates...</div>
          <div className="text-xs text-muted mt-1">Retrieving verified screening data</div>
        </div>
      ) : candidates.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1f2937' }}>
            No {filter !== 'all' ? `"${filter.charAt(0).toUpperCase() + filter.slice(1)}"` : ''} Candidates Found
          </div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.35rem', maxWidth: '440px', margin: '0.35rem auto 0' }}>
            {counts.all === 0
              ? 'No analyzed candidates yet. Upload and screen resumes in Screen 2 to automatically classify candidates.'
              : search
              ? `No candidates matched your search query "${search}". Try refining or clearing the search.`
              : `No candidates currently match the "${filter}" filter.`}
          </div>
          {(filter !== 'all' || search) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setFilter('all');
                setSearch('');
              }}
              style={{ marginTop: '1.25rem', display: 'inline-flex' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid-3" style={{ alignItems: 'stretch' }}>
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onSummary={openSummary}
            />
          ))}
        </div>
      ) : (
        <CandidateTable
          candidates={candidates}
          onSummary={openSummary}
        />
      )}

      {/* Server-side Pagination Controls */}
      {totalCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-light)',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div className="text-sm text-muted" style={{ fontWeight: 500 }}>
            Showing {startRecord} to {endRecord} of {totalCount} candidates
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                opacity: page <= 1 ? 0.5 : 1,
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const prevPage = arr[idx - 1];
                const showEllipsis = prevPage && p - prevPage > 1;

                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span style={{ padding: '0 0.25rem', color: '#9ca3af' }}>...</span>}
                    <button
                      onClick={() => setPage(p)}
                      style={{
                        minWidth: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: p === page ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        background: p === page ? 'var(--accent)' : 'var(--card-bg)',
                        color: p === page ? '#fff' : 'var(--text-primary)',
                        fontSize: '0.82rem',
                        fontWeight: p === page ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                opacity: page >= totalPages ? 0.5 : 1,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Candidate Summary Modal */}
      <CandidateSummaryModal
        candidate={selectedCandidate}
        isOpen={isSummaryModalOpen}
        onClose={closeSummary}
      />
    </div>
  );
};
