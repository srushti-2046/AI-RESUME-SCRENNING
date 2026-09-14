import React from 'react';
import { useRanking } from '../../hooks/useRanking';
import { RankingFilters } from './RankingFilters';
import { RankingTable } from './RankingTable';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

export const RankingPage: React.FC = () => {
  const {
    loading,
    error,
    data,
    page,
    setPage,
    pageSize,
    search,
    setSearch,
    selectedJobId,
    setSelectedJobId,
    refresh
  } = useRanking();

  const { candidates, totalCount, totalPages, jobs } = data;

  const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header — Clean, exact match to design */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title">Candidate Ranking</h1>
          <p className="page-subtitle">All analyzed candidates ranked by AI score.</p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={refresh}
          title="Refresh live ranking data"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter & Search Bar */}
      <RankingFilters
        search={search}
        onSearchChange={setSearch}
        jobs={jobs}
        selectedJobId={selectedJobId}
        onJobChange={setSelectedJobId}
        totalCount={totalCount}
      />

      {/* Main Ranking Table Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <Loader2 size={36} className="spin" style={{ margin: '0 auto 1rem', color: 'var(--accent)' }} />
            <div style={{ fontWeight: 700, color: '#1e293b' }}>Loading rankings...</div>
            <div className="text-xs text-muted mt-1">Sorting candidates by AI match score</div>
          </div>
        ) : error ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#ef4444' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Failed to load rankings</div>
            <div className="text-xs text-muted">{error}</div>
            <button
              className="btn btn-secondary btn-sm mt-3"
              onClick={refresh}
              style={{ marginTop: '1rem' }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <RankingTable candidates={candidates} />

            {/* Pagination Controls */}
            {totalCount > 0 && (
              <div
                className="flex items-center justify-between"
                style={{
                  padding: '1rem 1.25rem',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--card-hover-bg)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div className="text-xs text-muted font-medium">
                  Showing {startRecord} to {endRecord} of {totalCount} candidates
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.78rem',
                        opacity: page <= 1 ? 0.5 : 1,
                        cursor: page <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronLeft size={13} /> Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          minWidth: '28px',
                          height: '28px',
                          padding: '0 6px',
                          fontSize: '0.78rem',
                          fontWeight: p === page ? 700 : 500
                        }}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.78rem',
                        opacity: page >= totalPages ? 0.5 : 1,
                        cursor: page >= totalPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
