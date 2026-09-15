import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Download,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info
} from 'lucide-react';
import { useATSCheck } from '../../hooks/useATSCheck';
import type { ATSCheckResult } from '../../types/ats.types';

interface ATSCheckPageProps {
  onShowToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ATSCheckPage: React.FC<ATSCheckPageProps> = ({ onShowToast }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const resumeIdParam = searchParams.get('resumeId');
  const jobIdParam = searchParams.get('jobId');

  const {
    report,
    candidate,
    checks,
    eligibleCandidates,
    loading,
    analyzing,
    error,
    selectedResumeId,
    selectCandidate,
    runAnalysis,
    exportReport
  } = useATSCheck(resumeIdParam, jobIdParam);

  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  const handleCandidateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosenResumeId = e.target.value;
    const found = eligibleCandidates.find(c => c.resumeId === chosenResumeId);
    if (found) {
      selectCandidate(found.resumeId, found.jobId || null);
      setSearchParams({
        resumeId: found.resumeId,
        ...(found.jobId ? { jobId: found.jobId } : {})
      });
    }
  };

  const handleExport = () => {
    exportReport();
    if (onShowToast) {
      onShowToast('ATS compatibility report exported successfully!', 'success');
    }
  };

  const handleReanalyze = async () => {
    try {
      await runAnalysis();
      if (onShowToast) {
        onShowToast('ATS check refreshed with latest deterministic calculations.', 'success');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err.message || 'Failed to re-run ATS check.', 'error');
      }
    }
  };

  // Helper for status badge
  const renderStatusBadge = (score: number) => {
    if (score >= 80) {
      return <span className="badge badge-green">✅ ATS Friendly</span>;
    }
    if (score >= 60) {
      return <span className="badge badge-yellow">⚠️ Needs Improvement</span>;
    }
    return <span className="badge badge-red">❌ Poor Compatibility</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--green, #00b894)';
    if (score >= 60) return 'var(--yellow, #f39c12)';
    return 'var(--red, #e74c3c)';
  };

  // Initials generator
  const getInitials = (name?: string) => {
    if (!name) return 'CD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="ats-check-page" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header with Candidate Switcher */}
      <div className="page-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldCheck size={28} color="var(--accent, #6c5ce7)" />
            ATS Compatibility Check
          </h1>
          <p className="page-subtitle">
            Authoritative, deterministic resume compatibility evaluation for Applicant Tracking Systems.
          </p>
        </div>

        {/* Candidate Selector Dropdown */}
        {eligibleCandidates.length > 0 && (
          <div className="flex items-center gap-2" style={{ background: 'var(--card-bg)', padding: '0.5rem 0.85rem', borderRadius: 10, border: '1px solid var(--border)' }}>
            <User size={16} color="var(--text-muted)" />
            <label htmlFor="ats-candidate-select" className="text-xs font-semibold text-muted" style={{ marginRight: 4 }}>
              Select Candidate:
            </label>
            <select
              id="ats-candidate-select"
              className="form-input text-sm"
              style={{ padding: '0.35rem 0.65rem', borderRadius: 6, minWidth: 220, cursor: 'pointer' }}
              value={selectedResumeId || ''}
              onChange={handleCandidateChange}
              disabled={loading || analyzing}
            >
              {eligibleCandidates.map((c) => (
                <option key={c.resumeId} value={c.resumeId}>
                  {c.name} — {c.role} ({c.jobTitle || 'General'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && !report && (
        <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
          <RotateCw size={36} className="spin" color="var(--accent)" style={{ margin: '0 auto 1rem' }} />
          <h3 className="text-lg font-bold">Evaluating ATS Compatibility...</h3>
          <p className="text-sm text-muted">Running authoritative server-side checks on structure, contact info, and parseability.</p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="card mb-4" style={{ background: 'var(--red-bg, #fef2f2)', border: '1px solid var(--red, #e74c3c)', padding: '1.25rem' }}>
          <div className="flex items-center gap-3">
            <XCircle size={22} color="var(--red, #e74c3c)" />
            <div style={{ flex: 1 }}>
              <div className="text-sm font-bold" style={{ color: 'var(--red-text, #991b1b)' }}>ATS Evaluation Notice</div>
              <div className="text-xs" style={{ color: 'var(--red-text, #b91c1c)' }}>{error}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleReanalyze} disabled={analyzing}>
              <RotateCw size={14} className={analyzing ? 'spin' : ''} /> Retry Check
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Two Column Grid */}
      {report && (
        <>
          <div className="grid-3" style={{ alignItems: 'start', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Left Column: Candidate & ATS Score Ring Card */}
            <div className="card" style={{ textAlign: 'center', position: 'relative' }}>
              {analyzing && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'var(--card-bg)', opacity: 0.9, zIndex: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 12
                }}>
                  <RotateCw size={28} className="spin" color="var(--accent)" />
                  <span className="text-xs font-semibold text-muted mt-2">Recalculating...</span>
                </div>
              )}

              {/* Candidate Profile Avatar & Details */}
              <div
                className="profile-avatar-lg"
                style={{
                  background: 'linear-gradient(135deg, #00b894, #00cec9)',
                  margin: '0 auto 0.75rem',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(0,184,148,0.25)'
                }}
              >
                {getInitials(candidate?.name)}
              </div>

              <div className="profile-name" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {candidate?.name || 'Analyzed Candidate'}
              </div>
              <div className="profile-email text-xs text-muted" style={{ marginBottom: 4 }}>
                {candidate?.email || 'No email detected'}
              </div>
              {candidate?.role && (
                <div className="badge badge-accent" style={{ display: 'inline-block', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                  <Briefcase size={12} style={{ display: 'inline', marginRight: 4 }} />
                  {candidate.role}
                </div>
              )}

              <hr className="divider" style={{ margin: '1rem 0' }} />

              {/* Dynamic ATS Score Ring */}
              <div className="text-sm font-semibold text-muted mb-2">Overall ATS Score</div>
              <div className="score-circle-wrap" style={{ margin: '0 auto' }}>
                <div
                  className="score-circle"
                  style={{
                    background: `conic-gradient(${getScoreColor(report.atsScore)} 0% ${report.atsScore}%, var(--border) ${report.atsScore}% 100%)`,
                    width: 110,
                    height: 110,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div
                    className="score-circle-inner"
                    style={{
                      width: 86,
                      height: 86,
                      borderRadius: '50%',
                      background: 'var(--card-bg, #fff)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div className="score-number" style={{ fontSize: '1.35rem', fontWeight: 800, color: getScoreColor(report.atsScore) }}>
                      {report.atsScore}%
                    </div>
                    <div className="score-label text-xs text-muted" style={{ letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                      ATS SCORE
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div style={{ marginTop: '0.85rem' }}>
                {renderStatusBadge(report.atsScore)}
              </div>

              {/* Pass / Warn / Fail Count Badges */}
              <div className="flex gap-2 mt-4" style={{ fontSize: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={13} /> {report.passedCount} Passed
                </span>
                <span className="badge badge-yellow" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={13} /> {report.warningCount} Warnings
                </span>
                <span className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <XCircle size={13} /> {report.failedCount} Failed
                </span>
              </div>

              {/* Metric Independence Callout */}
              <div style={{
                background: 'var(--card-hover-bg, #f8f9fa)',
                borderRadius: 8,
                padding: '0.65rem',
                marginTop: '1.25rem',
                border: '1px solid var(--border)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                <div className="flex items-center justify-center gap-1 font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  <Info size={13} /> Independent Metric
                </div>
                <div>Resume Quality: <strong style={{ color: 'var(--text-primary)' }}>{candidate?.resumeScore ?? 0}%</strong></div>
                <div>Job Match: <strong style={{ color: 'var(--text-primary)' }}>{candidate?.matchScore ?? 0}%</strong></div>
                <div className="text-xs" style={{ marginTop: 4, color: candidate?.status === 'shortlisted' ? 'var(--green)' : 'var(--red)' }}>
                  Hiring Decision: <strong>{candidate?.status === 'shortlisted' ? 'Shortlisted (≥60%)' : 'Rejected (<60%)'}</strong>
                </div>
              </div>

              {/* Re-run button */}
              <div className="mt-3">
                <button
                  className="btn btn-secondary btn-sm w-full"
                  onClick={handleReanalyze}
                  disabled={analyzing}
                  style={{ width: '100%' }}
                >
                  <RotateCw size={13} className={analyzing ? 'spin' : ''} />
                  {analyzing ? 'Re-analyzing...' : 'Re-run ATS Check'}
                </button>
              </div>
            </div>

            {/* Right Column: Compatibility Checks List Card */}
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div className="section-header flex items-center justify-between mb-3">
                <div>
                  <span className="section-title">Compatibility Checks</span>
                  <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
                    (9 Deterministic Checks • 100 Points Total)
                  </span>
                </div>
                <button
                  className="btn btn-secondary btn-sm flex items-center gap-1"
                  onClick={handleExport}
                  title="Export complete ATS compatibility evaluation report"
                >
                  <Download size={14} /> Export Report
                </button>
              </div>

              {/* Checks Accordion / List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {checks.map((c: ATSCheckResult) => {
                  const isExpanded = expandedCheckId === c.id;
                  const hasDetails = c.details && Object.keys(c.details).length > 0;

                  return (
                    <div
                      key={c.id}
                      style={{
                        borderRadius: 8,
                        border: `1px solid ${
                          c.status === 'fail' ? 'var(--red)' : c.status === 'warn' ? 'var(--yellow)' : 'var(--green)'
                        }`,
                        background: c.status === 'fail' ? 'var(--red-bg)' : c.status === 'warn' ? 'var(--yellow-bg)' : 'var(--green-bg)',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          padding: '0.85rem',
                          cursor: hasDetails ? 'pointer' : 'default'
                        }}
                        onClick={() => hasDetails && setExpandedCheckId(isExpanded ? null : c.id)}
                      >
                        {/* Status Icon */}
                        <div style={{ flexShrink: 0 }}>
                          {c.status === 'pass' ? (
                            <CheckCircle2 size={20} color="var(--green, #00b894)" />
                          ) : c.status === 'warn' ? (
                            <AlertCircle size={20} color="var(--yellow, #f39c12)" />
                          ) : (
                            <XCircle size={20} color="var(--red, #e74c3c)" />
                          )}
                        </div>

                        {/* Title & Description */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                              {c.title}
                            </span>
                            <span className="text-xs font-semibold text-muted">
                              ({c.score}/{c.maxScore} pts)
                            </span>
                          </div>
                          <div
                            className="text-xs mt-1"
                            style={{
                              color: c.status === 'fail' ? 'var(--red-text, #991b1b)' : c.status === 'warn' ? 'var(--yellow-text, #92400e)' : 'var(--green-text, #065f46)'
                            }}
                          >
                            {c.description}
                          </div>
                        </div>

                        {/* PASS/WARN/FAIL Badge */}
                        <span className={`badge ${c.status === 'pass' ? 'badge-green' : c.status === 'warn' ? 'badge-yellow' : 'badge-red'}`} style={{ fontWeight: 700 }}>
                          {c.status.toUpperCase()}
                        </span>

                        {/* Expand/Collapse Caret if details exist */}
                        {hasDetails && (
                          <div style={{ color: 'var(--text-muted)' }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        )}
                      </div>

                      {/* Expandable Details Pane */}
                      {isExpanded && hasDetails && (
                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            borderTop: '1px solid var(--border)',
                            background: 'var(--card-hover-bg, rgba(255,255,255,0.05))',
                            fontSize: '0.75rem'
                          }}
                        >
                          <div className="font-semibold text-muted mb-1">Check Diagnostic Details:</div>
                          {c.checkType === 'keyword_density' && c.details?.matching_skills && (
                            <div className="mb-2">
                              <div className="text-xs font-semibold text-green mb-1">
                                Matched Keywords ({c.details.matching_count || 0}):
                              </div>
                              <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                                {(c.details.matching_skills as string[]).map((s, idx) => (
                                  <span key={idx} className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {c.checkType === 'keyword_density' && c.details?.missing_skills && (c.details.missing_skills as string[]).length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-red mb-1">
                                Missing Target Keywords ({c.details.missing_count || 0}):
                              </div>
                              <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                                {(c.details.missing_skills as string[]).map((s, idx) => (
                                  <span key={idx} className="badge badge-red" style={{ fontSize: '0.7rem' }}>
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {c.checkType === 'keyword_density' && c.details?.mode === 'standalone' && (
                            <div style={{ color: 'var(--text-secondary, #4b5563)', lineHeight: 1.5 }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                Evaluated Technical Terms &amp; Structured Skills: <span className="badge badge-green" style={{ marginLeft: 4 }}>{c.details.skill_count ?? 0} identified</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', marginTop: 6, color: 'var(--text-muted)' }}>
                                <em>Standalone Mode: Evaluates machine-readable professional skills and domain terminology without requiring a job posting. No job match percentage or required job skills are claimed.</em>
                              </div>
                            </div>
                          )}
                          {c.checkType !== 'keyword_density' && (
                            <pre style={{ margin: 0, fontSize: '0.7rem', whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>
                              {JSON.stringify(c.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recommendations Card */}
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} color="var(--accent, #6c5ce7)" />
              <h3 className="section-title" style={{ margin: 0 }}>ATS Optimization Recommendations</h3>
            </div>
            <p className="text-xs text-muted mb-3">
              Actionable enhancements to elevate machine parseability and keyword indexing without altering candidate qualifications:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
              {report.recommendations.map((rec: string, index: number) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    padding: '0.85rem',
                    borderRadius: 8,
                    background: 'var(--card-hover-bg, #f8f9fa)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(108,92,231,0.12)',
                      color: 'var(--accent, #6c5ce7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="text-xs" style={{ lineHeight: 1.5, color: 'var(--text-primary)' }}>
                    {rec}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty State if recruiter has no analyzed resumes yet */}
      {!loading && !report && eligibleCandidates.length === 0 && (
        <div className="card text-center" style={{ padding: '3.5rem 1.5rem' }}>
          <FileText size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 className="text-lg font-bold">No Analyzed Resumes Found</h3>
          <p className="text-sm text-muted" style={{ maxWidth: 460, margin: '0 auto 1.5rem' }}>
            Upload and analyze a candidate resume in Screens 1 & 2 first. Once analyzed, full deterministic ATS compatibility checks will automatically become available here.
          </p>
        </div>
      )}
    </div>
  );
};
