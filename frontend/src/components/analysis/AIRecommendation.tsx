import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import type { MatchBand, DecisionRecommendation } from '../../types/resume.types';

interface AIRecommendationProps {
  matchBand: MatchBand;
  decisionRecommendation: DecisionRecommendation;
  matchScore: number;
  summary: string;
  reason: string;
  factors: string[];
  targetJobTitle: string;
}

export const AIRecommendation: React.FC<AIRecommendationProps> = ({
  matchBand,
  decisionRecommendation,
  matchScore,
  summary,
  reason,
  factors,
  targetJobTitle
}) => {
  const isShortlistRecommended = decisionRecommendation === 'shortlist_recommended';

  const getBandBadge = () => {
    switch (matchBand) {
      case 'strong_match':
        return (
          <span className="pill-badge pill-emerald">
            <CheckCircle2 size={13} />
            Strong Match ({matchScore}%)
          </span>
        );
      case 'moderate_match':
        return (
          <span className="pill-badge pill-cyan">
            <CheckCircle2 size={13} />
            Moderate Match ({matchScore}%)
          </span>
        );
      default:
        return (
          <span className="pill-badge pill-rose">
            <AlertTriangle size={13} />
            Low Match ({matchScore}%)
          </span>
        );
    }
  };

  const getRecommendationBadge = () => {
    if (isShortlistRecommended) {
      return (
        <span className="pill-badge pill-emerald" style={{ fontWeight: 800 }}>
          <Check size={14} />
          AI Suggestion: Shortlist Recommended
        </span>
      );
    }
    return (
      <span className="pill-badge pill-rose" style={{ fontWeight: 800 }}>
        <ShieldAlert size={14} />
        AI Suggestion: Reject Recommended
      </span>
    );
  };

  return (
    <div className={`advisory-box ${isShortlistRecommended ? 'advisory-green' : 'advisory-red'}`}>
      {/* Header with Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            padding: '0.4rem',
            borderRadius: 8,
            background: isShortlistRecommended ? '#dcfce7' : '#fee2e2',
            color: isShortlistRecommended ? '#166534' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              AI Match Analysis &amp; Qualification
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Target Position: <strong style={{ color: 'var(--text-primary)' }}>{targetJobTitle}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {getBandBadge()}
          {getRecommendationBadge()}
        </div>
      </div>

      {/* Automated Screening Rule Notice */}
      <div className="safety-disclaimer">
        <Sparkles size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong style={{ color: 'var(--text-primary)' }}>Automated Screening Threshold:</strong> Resumes achieving an Overall Match Score of 60% or higher are automatically classified as <strong>Shortlisted</strong>. Resumes below 60% are classified as <strong>Rejected</strong> based on objective qualification criteria.
        </span>
      </div>

      {/* Summary Narrative */}
      <div style={{ marginTop: '0.85rem' }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {summary}
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
          {reason}
        </p>
      </div>

      {/* Why? Factor Breakdown */}
      {factors && factors.length > 0 && (
        <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            Why this recommendation?
          </div>
          <div className="factors-grid">
            {factors.map((factor, idx) => {
              const isPositive = !factor.toLowerCase().includes('missing') && !factor.toLowerCase().includes('low') && !factor.toLowerCase().includes('does not');
              return (
                <div
                  key={idx}
                  className={`factor-pill ${isPositive ? 'factor-pill-positive' : 'factor-pill-negative'}`}
                >
                  {isPositive ? (
                    <CheckCircle2 size={14} color="var(--green)" style={{ flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={14} color="var(--red)" style={{ flexShrink: 0 }} />
                  )}
                  <span>{factor}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
