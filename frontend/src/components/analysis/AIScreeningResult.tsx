import React from 'react';
import { CheckCircle, XCircle, ShieldCheck, HelpCircle, Check, X, Sparkles } from 'lucide-react';
import type { ScreeningDecision } from '../../types/resume.types';

interface AIScreeningResultProps {
  decision: ScreeningDecision;
  matchScore: number;
  explanation: string;
  keyReasons: string[];
  matchingCriteria: string[];
  missingCriteria: string[];
  targetJobTitle: string;
}

export const AIScreeningResult: React.FC<AIScreeningResultProps> = ({
  decision,
  matchScore,
  explanation,
  keyReasons,
  matchingCriteria,
  missingCriteria,
  targetJobTitle
}) => {
  const isShortlisted = decision === 'shortlisted';

  return (
    <div className={`screening-result-card ${isShortlisted ? 'screening-result-shortlisted' : 'screening-result-rejected'}`}>
      {/* 1. Header: Section Title & Automated Classification Badge */}
      <div className="screening-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 4 }}>
            <Sparkles size={14} color="var(--accent)" />
            AI Screening Result
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Automated qualification classification for: <strong style={{ color: 'var(--text-primary)' }}>{targetJobTitle}</strong>
          </div>
        </div>

        {/* Big Decision Badge & Match Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="screening-score-callout">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Match Score:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: isShortlisted ? 'var(--green-text)' : 'var(--red-text)' }}>
              {matchScore}%
            </span>
          </div>

          <div className={`screening-decision-badge ${isShortlisted ? 'badge-shortlisted' : 'badge-rejected'}`}>
            {isShortlisted ? (
              <>
                <CheckCircle size={22} color="var(--green)" />
                <span>Shortlisted</span>
              </>
            ) : (
              <>
                <XCircle size={22} color="var(--red)" />
                <span>Rejected</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Why was this resume shortlisted / rejected? */}
      <div className="screening-explanation-container">
        <h3 className="screening-question-title">
          <HelpCircle size={18} color={isShortlisted ? 'var(--green)' : 'var(--red)'} />
          {isShortlisted ? 'Why was this resume shortlisted?' : 'Why was this resume rejected?'}
        </h3>

        {/* Dynamic Truthful Explanation */}
        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.65, fontWeight: 500, margin: 0 }}>
          {explanation}
        </p>

        {/* Key Reason Bullet Points */}
        {keyReasons && keyReasons.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {keyReasons.map((reason, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45
                }}
              >
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: isShortlisted ? 'var(--green-bg)' : 'var(--red-bg)',
                  color: isShortlisted ? 'var(--green-text)' : 'var(--red-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2
                }}>
                  {isShortlisted ? <Check size={11} /> : <X size={11} />}
                </div>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Detailed Criteria Analysis Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
        {/* Matching Criteria */}
        <div className="screening-criteria-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--green)', marginBottom: '0.65rem' }}>
            <CheckCircle size={14} />
            Verified Matching Criteria ({matchingCriteria.length})
          </div>
          {matchingCriteria.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {matchingCriteria.map((crit, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  {crit}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No primary matching criteria found.</p>
          )}
        </div>

        {/* Missing Criteria */}
        <div className="screening-criteria-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--red)', marginBottom: '0.65rem' }}>
            <XCircle size={14} />
            Missing or Deficit Criteria ({missingCriteria.length})
          </div>
          {missingCriteria.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {missingCriteria.map((crit, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                  {crit}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--green-text)', fontWeight: 600, margin: 0 }}>
              No critical qualification deficits identified!
            </p>
          )}
        </div>
      </div>

      {/* 4. Automated Screening Footer Notice */}
      <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0, 0, 0, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ShieldCheck size={14} color="var(--accent)" />
          <span>Automated 60% Qualification Rule: &ge;60% Shortlisted | &lt;60% Rejected</span>
        </div>
        <span style={{ fontWeight: 600, color: isShortlisted ? 'var(--green-text)' : 'var(--red-text)' }}>
          Candidate Database Status: {isShortlisted ? 'Shortlisted' : 'Rejected'}
        </span>
      </div>
    </div>
  );
};
