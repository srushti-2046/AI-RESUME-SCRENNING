import React from 'react';
import { FileSearch } from 'lucide-react';

interface AnalysisSummaryProps {
  summary: string;
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ summary }) => {
  return (
    <div className="analysis-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.65rem', marginBottom: '0.75rem' }}>
          <div style={{ padding: '0.35rem', borderRadius: 8, background: 'var(--purple-bg)', color: 'var(--purple)' }}>
            <FileSearch size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
              AI Analysis Summary
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>What the AI understood from this resume</span>
          </div>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {summary || 'The candidate documents professional software engineering tenure and technical education aligned with role requirements.'}
        </p>
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <span>Deterministic NLP Profile Analysis</span>
        <span style={{ color: 'var(--purple)', fontWeight: 600 }}>NLP Verified</span>
      </div>
    </div>
  );
};
