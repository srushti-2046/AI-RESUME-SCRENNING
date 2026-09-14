import React, { useEffect, useState } from 'react';
import { X, Search, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { DuplicateDetectionService } from '../../services/duplicateDetection.service';
import type { DuplicateCategoryResume } from '../../types/duplicateDetection.types';

export type CategoryType = 'scanned' | 'duplicate' | 'unique';

interface DuplicateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryType;
  onSelectResume: (resumeId: string) => void;
}

const CATEGORY_TITLES: Record<CategoryType, { title: string; subtitle: string; badgeColor: string }> = {
  scanned: {
    title: 'All Scanned Resumes',
    subtitle: 'All resumes with completed AI parsing & analysis in your organization',
    badgeColor: '#2563eb',
  },
  duplicate: {
    title: 'Resumes in Duplicate Pairs',
    subtitle: 'Resumes identified with >80% similarity against another candidate resume',
    badgeColor: '#dc2626',
  },
  unique: {
    title: 'Unique Resumes',
    subtitle: 'Resumes that have no duplicate matches above 80% similarity threshold',
    badgeColor: '#16a34a',
  },
};

export const DuplicateListModal: React.FC<DuplicateListModalProps> = ({
  isOpen,
  onClose,
  category,
  onSelectResume,
}) => {
  const [resumes, setResumes] = useState<DuplicateCategoryResume[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setResumes([]);
      setError(null);
      setSearchQuery('');
      return;
    }

    let isMounted = true;
    async function loadCategoryResumes() {
      try {
        setLoading(true);
        setError(null);
        const list = await DuplicateDetectionService.getCategoryResumes(category);
        if (isMounted) {
          setResumes(list);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || `Failed to load ${category} resumes`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCategoryResumes();
    return () => {
      isMounted = false;
    };
  }, [isOpen, category]);

  if (!isOpen) return null;

  const info = CATEGORY_TITLES[category];
  const filteredResumes = resumes.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      r.candidateName.toLowerCase().includes(q) ||
      r.fileName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem',
    }}>
      <div className="modal-card" style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        width: '100%',
        maxWidth: '780px',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--card-hover-bg)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {info.title}
              </h2>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#ffffff',
                background: info.badgeColor,
                padding: '0.15rem 0.5rem',
                borderRadius: 9999,
              }}>
                {resumes.length}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>
              {info.subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '0.4rem',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--card-bg)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--card-hover-bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '0.45rem 0.75rem',
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by candidate name or file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* List Content */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div className="spinner" style={{ margin: '0 auto 0.75rem', width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: info.badgeColor, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading resumes...</p>
            </div>
          )}

          {error && (
            <div style={{
              background: 'var(--red-bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '1rem',
              color: 'var(--red-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && filteredResumes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>No resumes found</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {searchQuery ? 'Try matching a different keyword' : 'No records match this category yet'}
              </p>
            </div>
          )}

          {!loading && !error && filteredResumes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredResumes.map((r) => (
                <div
                  key={r.resumeId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--card-hover-bg)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--card-bg)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}>
                      {r.candidateName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {r.candidateName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        <span>📄 {r.fileName}</span>
                        <span>•</span>
                        <span>Analyzed: {new Date(r.analyzedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Score</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {r.resumeScore}%
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onSelectResume(r.resumeId);
                      }}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <ExternalLink size={13} />
                      View Analysis
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.85rem 1.5rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--card-hover-bg)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
