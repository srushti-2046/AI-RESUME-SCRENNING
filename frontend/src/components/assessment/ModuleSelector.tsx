import React from 'react';
import { Copy, Save, Send, Users, AlertCircle } from 'lucide-react';
import type { AssessmentModule, ModuleWeight } from '../../types/assessment.types';

interface ModuleSelectorProps {
  modules: AssessmentModule[];
  selectedWeights: ModuleWeight[];
  questionCounts: Record<string, number>;
  onWeightChange: (moduleId: string, checked: boolean, weight?: number) => void;
  onSave: () => void;
  onPublish: () => void;
  onCopyLink: () => void;
  onOpenAssignModal: () => void;
  saving: boolean;
  publishing: boolean;
  isPublished: boolean;
  shareToken: string | null;
  disabled?: boolean;
}

const MODULE_COLORS: Record<string, string> = {
  'Core Python': '#0984e3',
  'Advanced Python': '#6c5ce7',
  'SQL & Database': '#00b894',
  'Data Structures': '#fdcb6e',
  'Machine Learning': '#e17055',
  'Web Development': '#00cec9',
};

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({
  modules,
  selectedWeights,
  questionCounts,
  onWeightChange,
  onSave,
  onPublish,
  onCopyLink,
  onOpenAssignModal,
  saving,
  publishing,
  isPublished,
  shareToken,
  disabled = false,
}) => {
  const totalWeight = selectedWeights.reduce((acc, curr) => acc + (curr.weight_percent || 0), 0);
  const isValidWeight = Math.abs(totalWeight - 100) < 0.01;

  const getModuleWeight = (id: string) => {
    return selectedWeights.find(w => w.module_id === id)?.weight_percent || 0;
  };

  const isModuleSelected = (id: string) => {
    return selectedWeights.some(w => w.module_id === id);
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
          Select Modules
        </h3>
        <span
          className={`badge ${isValidWeight ? 'badge-green' : totalWeight > 100 ? 'badge-red' : 'badge-yellow'}`}
          style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem', fontWeight: 600 }}
        >
          {isValidWeight ? '100% Valid' : `${totalWeight.toFixed(0)}% (Goal: 100%)`}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {modules.map((m) => {
          const selected = isModuleSelected(m.id);
          const weight = getModuleWeight(m.id);
          const color = MODULE_COLORS[m.name] || '#636e72';
          const availableQ = questionCounts[m.id] ?? 15;

          return (
            <div
              key={m.id}
              className={`module-item ${selected ? 'selected' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.55rem 0.75rem',
                borderRadius: 8,
                border: selected ? `1.5px solid ${color}` : '1.5px solid var(--border)',
                background: selected ? 'var(--card-hover-bg)' : 'var(--card-bg)',
                transition: 'all 0.15s ease',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  flex: 1,
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={disabled}
                  onChange={(e) => onWeightChange(m.id, e.target.checked)}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
                      display: 'block',
                    }}
                  >
                    {m.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {availableQ} questions in bank
                  </span>
                </div>
              </label>

              {selected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="number"
                    className="module-weight-input"
                    min={1}
                    max={100}
                    value={weight || ''}
                    disabled={disabled}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                      onWeightChange(m.id, true, val);
                    }}
                    style={{
                      width: 58,
                      textAlign: 'right',
                      padding: '0.25rem 0.45rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderRadius: 6,
                      border: '1.5px solid var(--border)',
                      background: 'var(--card-bg)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation Message */}
      {!isValidWeight && selectedWeights.length > 0 && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: totalWeight > 100 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            border: `1px solid ${totalWeight > 100 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            fontSize: '0.78rem',
            color: totalWeight > 100 ? 'var(--red-text, #ef4444)' : 'var(--yellow-text, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertCircle size={14} />
          <span>
            {totalWeight > 100
              ? `Weights exceed 100% by ${(totalWeight - 100).toFixed(0)}%. Please adjust.`
              : `Total weight is ${totalWeight.toFixed(0)}%. Add ${(100 - totalWeight).toFixed(0)}% more.`}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          className="btn btn-primary btn-full"
          disabled={saving || !isValidWeight || selectedWeights.length === 0 || disabled}
          onClick={onSave}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Save size={15} />
          {saving ? 'Saving Assessment...' : 'Save Assessment →'}
        </button>

        {!isPublished ? (
          <button
            className="btn btn-secondary btn-full"
            disabled={publishing || !isValidWeight || selectedWeights.length === 0}
            onClick={onPublish}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: 'var(--blue-bg, rgba(56, 189, 248, 0.12))',
              color: 'var(--blue-text, #0284c7)',
              borderColor: 'var(--border)',
              fontWeight: 600,
            }}
          >
            <Send size={15} />
            {publishing ? 'Publishing...' : 'Publish & Generate Link'}
          </button>
        ) : (
          <>
            <button
              className="btn btn-secondary btn-full"
              onClick={onCopyLink}
              title={shareToken ? `Share Token: ${shareToken}` : 'Copy Link'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Copy size={14} /> Copy Assessment Link
            </button>
            <button
              className="btn btn-secondary btn-full"
              onClick={onOpenAssignModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: 'var(--green-bg, rgba(16, 185, 129, 0.12))',
                color: 'var(--green-text, #059669)',
                borderColor: 'var(--border)',
                fontWeight: 600,
              }}
            >
              <Users size={14} /> Assign to Candidate
            </button>
          </>
        )}
      </div>
    </div>
  );
};
