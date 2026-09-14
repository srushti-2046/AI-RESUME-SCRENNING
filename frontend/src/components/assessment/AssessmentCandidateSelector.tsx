import React, { useState } from 'react';
import { X, Search, UserCheck, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AssessmentCandidate, AssignmentResult } from '../../types/assessment.types';

interface AssessmentCandidateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: AssessmentCandidate[];
  assessmentTitle: string;
  onAssign: (candidateId: string) => Promise<AssignmentResult>;
  assigning: boolean;
}

export const AssessmentCandidateSelector: React.FC<AssessmentCandidateSelectorProps> = ({
  isOpen,
  onClose,
  candidates,
  assessmentTitle,
  onAssign,
  assigning,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [assignedResult, setAssignedResult] = useState<AssignmentResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = candidates.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAssign = async () => {
    if (!selectedCandidateId) return;
    setError(null);
    try {
      const result = await onAssign(selectedCandidateId);
      setAssignedResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to assign candidate');
    }
  };

  const handleCopyLink = () => {
    if (!assignedResult?.attempt_token) return;
    const url = `${window.location.origin}/assessment/t/${assignedResult.attempt_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setSelectedCandidateId(null);
    setAssignedResult(null);
    setSearch('');
    setError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 540,
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Assign Assessment to Candidate
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Test: <strong style={{ color: 'var(--accent)' }}>{assessmentTitle}</strong>
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          {error && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.6rem 0.85rem',
                borderRadius: 6,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {assignedResult ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <CheckCircle2 size={28} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                Assessment Assigned Successfully!
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Candidate can now start their assessment using the secure private token link below:
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 8,
                  background: 'var(--card-hover-bg)',
                  border: '1px solid var(--border)',
                  marginBottom: '1.5rem',
                }}
              >
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/assessment/t/${assignedResult.attempt_token}`}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyLink}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <button className="btn btn-primary" onClick={handleClose} style={{ minWidth: 120 }}>
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Search input */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: '1rem',
                }}
              >
                <Search
                  size={15}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search existing candidates by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card-hover-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              {/* Candidate List */}
              <div
                style={{
                  maxHeight: 250,
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  marginBottom: '1.25rem',
                }}
              >
                {filtered.length > 0 ? (
                  filtered.map((candidate) => {
                    const isSelected = selectedCandidateId === candidate.id;
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => setSelectedCandidateId(candidate.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(108, 92, 231, 0.15)' : 'var(--card-bg)',
                          transition: 'background 0.12s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: isSelected ? 'var(--accent)' : 'var(--card-hover-bg)',
                              color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            {candidate.full_name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {candidate.full_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {candidate.email || 'No email'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {candidate.resume_score !== null && (
                            <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                              Score: {candidate.resume_score}%
                            </span>
                          )}
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              border: isSelected ? '5px solid var(--accent)' : '2px solid var(--border)',
                              background: 'var(--card-bg)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No candidates found matching "{search}"
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!selectedCandidateId || assigning}
                  onClick={handleAssign}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <UserCheck size={15} />
                  {assigning ? 'Assigning...' : 'Assign Assessment'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
