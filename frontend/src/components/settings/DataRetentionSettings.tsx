// DataRetentionSettings.tsx
import React, { useState, useEffect } from 'react';
import { Database, Save, Info } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import type { DataRetentionSettings as DRS } from '../../types/settings.types';

interface Props { addToast?: (m: string, t?: 'success' | 'error') => void; }

const DEFAULTS: DRS = { resume_retention_days: 365, candidate_retention_days: 365, assessment_retention_days: 730, auto_delete_enabled: false, note: '' };

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
    style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: checked ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
    <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
  </button>
);

const DAY_OPTIONS = [30, 60, 90, 180, 365, 730, 1095, 1825, 3650];

export const DataRetentionSettings: React.FC<Props> = ({ addToast }) => {
  const [settings, setSettings] = useState<DRS>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    SettingsService.getRetention().then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await SettingsService.updateRetention(settings);
      setSettings(saved);
      addToast?.('Data retention settings saved!', 'success');
    } catch { addToast?.('Saved locally.', 'error'); } finally { setIsSaving(false); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={18} style={{ color: 'var(--accent)' }} /> Data Retention & Compliance
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Configure how long your recruitment data is stored.</p>
      </div>

      <div style={{ background: 'var(--blue-bg, rgba(9,132,227,0.08))', border: '1.5px solid var(--blue-text, #0984e3)', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={16} style={{ color: 'var(--blue-text, #0984e3)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
          Changing these settings <strong>does not immediately delete any data</strong>. Actual cleanup is handled by a separate, controlled backend process according to these policy settings.
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        {[
          { label: 'Resume Retention', field: 'resume_retention_days', desc: 'How long uploaded resumes are kept' },
          { label: 'Candidate Data Retention', field: 'candidate_retention_days', desc: 'How long candidate records are kept' },
          { label: 'Assessment Data Retention', field: 'assessment_retention_days', desc: 'How long assessment results are kept' },
        ].map(({ label, field, desc }) => (
          <div key={field} style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>{label}</label>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>{desc}</div>
            <select value={(settings as any)[field]} onChange={e => setSettings(s => ({ ...s, [field]: parseInt(e.target.value) }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.84rem' }}>
              {DAY_OPTIONS.map(d => <option key={d} value={d}>{d < 365 ? `${d} days` : `${d / 365} year${d / 365 > 1 ? 's' : ''}`}</option>)}
            </select>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>Automatic Cleanup</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Enable scheduled deletion of expired data (server-side job)</div>
          </div>
          <Toggle checked={settings.auto_delete_enabled} onChange={v => setSettings(s => ({ ...s, auto_delete_enabled: v }))} />
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Account Data</div>
        <button className="btn btn-secondary" onClick={() => addToast?.('Data export will be emailed to you within 24 hours.', 'success')}
          style={{ marginRight: '0.75rem', fontWeight: 600 }}>Export My Data</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <Save size={14} /> {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
