import React from 'react';
import { Lightbulb, ArrowUpRight } from 'lucide-react';

interface SuggestionsProps {
  suggestions: string[];
}

export const Suggestions: React.FC<SuggestionsProps> = ({ suggestions }) => {
  return (
    <div className="analysis-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.65rem', marginBottom: '0.75rem' }}>
          <div style={{ padding: '0.35rem', borderRadius: 8, background: 'var(--yellow-bg)', color: 'var(--yellow-text)' }}>
            <Lightbulb size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
              Actionable Improvement Suggestions
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>How the candidate can optimize alignment</span>
          </div>
        </div>

        {suggestions && suggestions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {suggestions.map((sug, idx) => (
              <div
                key={idx}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'var(--card-hover-bg)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}
              >
                <span style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--yellow-bg)', color: 'var(--yellow-text)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.72rem' }}>
                  {idx + 1}
                </span>
                <span style={{ flex: 1 }}>{sug}</span>
                <ArrowUpRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0' }}>
            No specific skill gaps detected. Resume is highly aligned with role requirements.
          </p>
        )}
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <span>Truthful Suggestions (Non-fabricating)</span>
        <span style={{ color: 'var(--yellow-text)', fontWeight: 600 }}>ATS Optimized</span>
      </div>
    </div>
  );
};
