import React, { useEffect, useState } from 'react';
import { X, Copy, AlertCircle, FileText, User, Sparkles, Award, Briefcase, GraduationCap, Code } from 'lucide-react';
import { DuplicateDetectionService } from '../../services/duplicateDetection.service';
import type { DuplicateComparisonResponse } from '../../types/duplicateDetection.types';

interface DuplicateCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeIdA: string | null;
  resumeIdB: string | null;
}

export const DuplicateCompareModal: React.FC<DuplicateCompareModalProps> = ({
  isOpen,
  onClose,
  resumeIdA,
  resumeIdB,
}) => {
  const [data, setData] = useState<DuplicateComparisonResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !resumeIdA || !resumeIdB) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    async function loadComparison() {
      try {
        setLoading(true);
        setError(null);
        const result = await DuplicateDetectionService.getComparison(resumeIdA!, resumeIdB!);
        if (isMounted) {
          setData(result);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load side-by-side comparison');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadComparison();
    return () => {
      isMounted = false;
    };
  }, [isOpen, resumeIdA, resumeIdB]);

  if (!isOpen) return null;

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
        maxWidth: '1200px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'between',
          background: 'var(--card-hover-bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--red-bg)',
              color: 'var(--red-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Copy size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Side-by-Side Resume Comparison
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Comparing duplicate resumes with authoritatively scored text & metadata similarity
              </p>
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {data && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 9999,
                background: 'var(--red-bg)',
                border: '1px solid var(--border)',
                color: 'var(--red-text)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}>
                <span>⚠️ {data.similarityScore}% Similar</span>
                {data.detectionType === 'exact_hash' && (
                  <span style={{ fontSize: '0.72rem', background: '#dc2626', color: '#ffffff', padding: '0.1rem 0.4rem', borderRadius: 4, marginLeft: 4 }}>
                    Exact Hash
                  </span>
                )}
              </div>
            )}
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
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem', width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#64748b', fontWeight: 600 }}>Loading resume comparison details...</p>
            </div>
          )}

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 12,
              padding: '1.25rem',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Shared / Common Skills Bar */}
              {data.commonSkills && data.commonSkills.length > 0 && (
                <div style={{
                  background: 'var(--card-hover-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '1rem 1.25rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Sparkles size={16} color="var(--accent)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Shared Skills ({data.commonSkills.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {data.commonSkills.map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'var(--green-bg)',
                          color: 'var(--green-text)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '0.2rem 0.6rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Side-by-Side Resume Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Column A */}
                <ResumeCompareColumn
                  title="Resume A"
                  resume={data.resumeA}
                  color="#6366f1"
                  bgColor="rgba(99, 102, 241, 0.1)"
                />

                {/* Column B */}
                <ResumeCompareColumn
                  title="Resume B"
                  resume={data.resumeB}
                  color="#a855f7"
                  bgColor="rgba(168, 85, 247, 0.1)"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          background: 'var(--card-hover-bg)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};

interface ResumeCompareColumnProps {
  title: string;
  resume: DuplicateComparisonResponse['resumeA'];
  color: string;
  bgColor: string;
}

const ResumeCompareColumn: React.FC<ResumeCompareColumnProps> = ({
  title,
  resume,
  color,
  bgColor,
}) => {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 12,
      background: 'var(--card-bg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Column Header */}
      <div style={{
        padding: '1rem 1.25rem',
        background: bgColor,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} color={color} />
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color, fontWeight: 800 }}>
              {title}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {resume.candidateName}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          border: `1px solid ${color}40`,
          borderRadius: 8,
          padding: '0.25rem 0.65rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Resume Score</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color }}>{resume.resumeScore}%</div>
        </div>
      </div>

      {/* Column Details */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
        {/* File & Contact Info */}
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          background: 'var(--card-hover-bg)',
          padding: '0.75rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{resume.fileName}</span>
          </div>
          {resume.email && <div>✉️ {resume.email}</div>}
          {resume.phone && <div>📞 {resume.phone}</div>}
        </div>

        {/* Unique Skills */}
        {resume.uniqueSkills && resume.uniqueSkills.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Code size={14} color={color} />
              Unique Skills ({resume.uniqueSkills.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {resume.uniqueSkills.map((s, i) => (
                <span key={i} style={{
                  background: `${color}25`,
                  color,
                  border: `1px solid ${color}40`,
                  borderRadius: 6,
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Work Experience */}
        {Array.isArray(resume.experience) && resume.experience.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Briefcase size={14} color="var(--text-secondary)" />
              Experience ({resume.experience.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {resume.experience.slice(0, 3).map((exp: any, i: number) => (
                <div key={i} style={{ fontSize: '0.78rem', borderLeft: `2px solid ${color}`, paddingLeft: '0.5rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{exp.title || 'Role'}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{exp.company || ''} {exp.duration ? `• ${exp.duration}` : ''}</div>
                  {exp.description && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', marginTop: '0.2rem' }}>
                      {typeof exp.description === 'string' ? exp.description.slice(0, 120) + '...' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {Array.isArray(resume.education) && resume.education.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <GraduationCap size={14} color="var(--text-secondary)" />
              Education
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {resume.education.slice(0, 2).map((edu: any, i: number) => (
                <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  <span style={{ fontWeight: 700 }}>{edu.degree || 'Degree'}</span>
                  {edu.institution && <span style={{ color: 'var(--text-secondary)' }}> — {edu.institution}</span>}
                  {edu.year && <span style={{ color: 'var(--text-muted)' }}> ({edu.year})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary / Text Preview */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Award size={14} color="var(--text-secondary)" />
            Resume Content Preview
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            background: 'var(--card-hover-bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '0.65rem',
            maxHeight: '120px',
            overflowY: 'auto',
            lineHeight: 1.5,
            whiteSpace: 'pre-line',
          }}>
            {resume.summary || resume.textPreview || 'No preview available'}
          </div>
        </div>
      </div>
    </div>
  );
};
