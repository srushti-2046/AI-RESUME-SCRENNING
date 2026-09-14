import React from 'react';
import type { AssessmentConfig } from '../../types/assessment.types';

interface TestDetailsFormProps {
  config: AssessmentConfig;
  onChange: (updates: Partial<AssessmentConfig>) => void;
  disabled?: boolean;
}

export const TestDetailsForm: React.FC<TestDetailsFormProps> = ({
  config,
  onChange,
  disabled = false
}) => {
  return (
    <div className="card" style={{ height: '100%' }}>
      <h3 className="section-title mb-3" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        Test Details
      </h3>

      <div className="form-group mb-3">
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
          Test Name <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        <input
          className="form-input"
          type="text"
          placeholder="e.g. Python Developer Assessment"
          value={config.title}
          disabled={disabled}
          onChange={e => onChange({ title: e.target.value })}
          style={{ width: '100%', borderRadius: 8 }}
        />
      </div>

      <div className="form-group mb-3">
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
          Duration (Minutes) <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        <input
          className="form-input"
          type="number"
          min={5}
          max={600}
          value={config.duration_minutes || ''}
          disabled={disabled}
          onChange={e => onChange({ duration_minutes: Math.max(1, parseInt(e.target.value) || 0) })}
          style={{ width: '100%', borderRadius: 8 }}
        />
        <span className="text-xs text-muted" style={{ fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
          Recommended: 60 - 180 minutes
        </span>
      </div>

      <div className="form-group mb-3">
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
          Total Questions <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        <input
          className="form-input"
          type="number"
          min={1}
          max={200}
          value={config.total_questions || ''}
          disabled={disabled}
          onChange={e => onChange({ total_questions: Math.max(1, parseInt(e.target.value) || 0) })}
          style={{ width: '100%', borderRadius: 8 }}
        />
        <span className="text-xs text-muted" style={{ fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
          Questions allocated across selected modules using Largest Remainder quota
        </span>
      </div>

      <div className="form-group mb-3">
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
          Passing Score (%) <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        <input
          className="form-input"
          type="number"
          min={0}
          max={100}
          value={config.passing_score || ''}
          disabled={disabled}
          onChange={e => onChange({ passing_score: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
          style={{ width: '100%', borderRadius: 8 }}
        />
      </div>

      <div className="form-group mb-0">
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
          Instructions
        </label>
        <textarea
          className="form-textarea"
          rows={3}
          style={{ minHeight: 85, width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
          placeholder="Enter test guidelines and rules for the candidate..."
          value={config.instructions}
          disabled={disabled}
          onChange={e => onChange({ instructions: e.target.value })}
        />
      </div>
    </div>
  );
};
