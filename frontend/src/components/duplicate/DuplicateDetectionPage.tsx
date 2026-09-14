import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy, RefreshCw, Eye, FileText, AlertCircle, CheckCircle2, ExternalLink,
} from 'lucide-react';
import { useDuplicateDetection } from '../../hooks/useDuplicateDetection';
import { DuplicateCompareModal } from './DuplicateCompareModal';
import { DuplicateListModal, type CategoryType } from './DuplicateListModal';

interface DuplicateDetectionPageProps {
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DuplicateDetectionPage: React.FC<DuplicateDetectionPageProps> = ({ onShowToast }) => {
  const navigate = useNavigate();
  const { overview, loading, scanning, error, runScan } = useDuplicateDetection();

  // Compare Modal State
  const [comparePair, setComparePair] = useState<{ resumeIdA: string; resumeIdB: string } | null>(null);

  // List Modal State ("View All" for Scanned / Duplicate / Unique)
  const [listCategory, setListCategory] = useState<CategoryType | null>(null);

  const handleScan = async () => {
    try {
      if (onShowToast) onShowToast('Scanning resumes for duplicates...', 'info');
      const result = await runScan();
      if (onShowToast) {
        onShowToast(
          `Scan completed: ${result.duplicatePairCount} duplicate pair(s) identified across ${result.scannedCount} scanned resumes.`,
          'success'
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err?.message || 'Duplicate detection failed', 'error');
      }
    }
  };

  const handleViewResume = (resumeId: string) => {
    navigate(`/analysis?resumeId=${resumeId}`);
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Duplicate Resume Detection</h1>
          <p className="page-subtitle">AI-powered duplicate and near-duplicate resume identification.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleScan}
            disabled={scanning || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.15rem',
              fontWeight: 700,
            }}
          >
            <RefreshCw size={15} className={scanning ? 'spin-icon' : ''} />
            {scanning ? 'Scanning...' : 'Scan for Duplicates'}
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 10,
          padding: '0.85rem 1.25rem',
          color: '#b91c1c',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Metric Cards: Scanned, Duplicate Found, Unique Resumes (NO Avg Similarity!) */}
      <div className="grid-3 mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {/* Card 1: SCANNED */}
        <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #0984e3', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.5rem' }}>🔍</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            {overview.scannedCount}
          </div>
          <div className="text-sm text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Scanned
          </div>
          <button
            onClick={() => setListCategory('scanned')}
            style={{
              marginTop: '0.75rem',
              background: 'var(--blue-bg)',
              border: '1px solid var(--border)',
              color: 'var(--blue-text)',
              borderRadius: 6,
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            View All
          </button>
        </div>

        {/* Card 2: DUPLICATE FOUND */}
        <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #e17055', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.5rem' }}>⚠️</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            {overview.duplicatePairCount}
          </div>
          <div className="text-sm text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Duplicate Found
          </div>
          <button
            onClick={() => setListCategory('duplicate')}
            style={{
              marginTop: '0.75rem',
              background: 'var(--red-bg)',
              border: '1px solid var(--border)',
              color: 'var(--red-text)',
              borderRadius: 6,
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            View All
          </button>
        </div>

        {/* Card 3: UNIQUE RESUMES */}
        <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #00b894', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.5rem' }}>✅</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            {overview.uniqueResumeCount}
          </div>
          <div className="text-sm text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Unique Resumes
          </div>
          <button
            onClick={() => setListCategory('unique')}
            style={{
              marginTop: '0.75rem',
              background: 'var(--green-bg)',
              border: '1px solid var(--border)',
              color: 'var(--green-text)',
              borderRadius: 6,
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            View All
          </button>
        </div>
      </div>

      {/* Duplicate Pairs Section */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Detected Duplicate Pairs
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Authoritative threshold: Similarity &gt; 80%
          </span>
        </div>

        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <div className="spinner" style={{ margin: '0 auto 0.75rem', width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading duplicate analysis...</p>
          </div>
        )}

        {!loading && overview.pairs.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <CheckCircle2 size={44} color="var(--green)" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem' }}>
              No Duplicate Resumes Found
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto' }}>
              All {overview.scannedCount} scanned resumes in your database have distinct content (similarity &le; 80%). Click "Scan for Duplicates" to re-check.
            </p>
          </div>
        )}

        {!loading && overview.pairs.map((p, i) => (
          <div key={p.id} className="card mb-3" style={{ border: '1px solid var(--border)', borderRadius: 12 }}>
            {/* Pair Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Copy size={18} color="var(--red)" />
                <span className="section-title" style={{ color: 'var(--red-text)', margin: 0 }}>
                  Duplicate Pair #{i + 1}
                </span>
                {p.detectionType === 'exact_hash' && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 4,
                  }}>
                    Exact Hash Match
                  </span>
                )}
              </div>
              <span className="badge badge-red" style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                ⚠️ {p.similarityScore}% Similar
              </span>
            </div>

            {/* Two Columns: Resume A & Resume B */}
            <div className="grid-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Resume A */}
              <div style={{
                background: 'var(--card-hover-bg)',
                borderRadius: 10,
                padding: '1rem',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} color="var(--accent)" />
                      <span className="font-semibold text-sm" style={{ wordBreak: 'break-all' }}>
                        {p.resumeA.fileName}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'var(--blue-bg)',
                      color: 'var(--blue-text)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 4,
                    }}>
                      Score: {p.resumeA.resumeScore}%
                    </span>
                  </div>
                  <div className="text-xs text-muted" style={{ marginBottom: '0.75rem' }}>
                    Candidate: <strong style={{ color: 'var(--text-primary)' }}>{p.resumeA.candidateName}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewResume(p.resumeA.resumeId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
                  >
                    <ExternalLink size={13} />
                    View Analysis
                  </button>
                </div>
              </div>

              {/* Resume B */}
              <div style={{
                background: 'var(--card-hover-bg)',
                borderRadius: 10,
                padding: '1rem',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} color="var(--accent)" />
                      <span className="font-semibold text-sm" style={{ wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                        {p.resumeB.fileName}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'var(--blue-bg)',
                      color: 'var(--blue-text)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 4,
                    }}>
                      Score: {p.resumeB.resumeScore}%
                    </span>
                  </div>
                  <div className="text-xs text-muted" style={{ marginBottom: '0.75rem' }}>
                    Candidate: <strong style={{ color: 'var(--text-primary)' }}>{p.resumeB.candidateName}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewResume(p.resumeB.resumeId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
                  >
                    <ExternalLink size={13} />
                    View Analysis
                  </button>
                </div>
              </div>
            </div>

            {/* Alert Banner */}
            <div style={{
              marginTop: '1rem',
              padding: '0.65rem 1rem',
              background: 'var(--red-bg)',
              borderRadius: 8,
              fontSize: '0.82rem',
              color: 'var(--red-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertCircle size={15} />
              High similarity detected ({p.similarityScore}%). Review both resumes side-by-side to evaluate candidate background.
            </div>

            {/* Action Footer: ONLY Compare Side-by-Side (NO Mark as Duplicate, NO Keep Both!) */}
            <div className="flex gap-2 mt-3">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setComparePair({ resumeIdA: p.resumeA.resumeId, resumeIdB: p.resumeB.resumeId })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 1rem',
                  fontWeight: 700,
                }}
              >
                <Eye size={14} />
                Compare Side-by-Side
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Side-by-Side Comparison Modal */}
      {comparePair && (
        <DuplicateCompareModal
          isOpen={!!comparePair}
          onClose={() => setComparePair(null)}
          resumeIdA={comparePair.resumeIdA}
          resumeIdB={comparePair.resumeIdB}
        />
      )}

      {/* Category List Modal ("View All") */}
      {listCategory && (
        <DuplicateListModal
          isOpen={!!listCategory}
          onClose={() => setListCategory(null)}
          category={listCategory}
          onSelectResume={handleViewResume}
        />
      )}
    </>
  );
};
