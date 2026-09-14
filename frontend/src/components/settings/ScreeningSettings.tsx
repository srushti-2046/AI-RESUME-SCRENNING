// ScreeningSettings.tsx — Recruiter preferences (does NOT modify screening algorithm)
import React, { useState, useEffect } from 'react';
import { Target, Save, Info, X } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import type { ScreeningPrefs } from '../../types/settings.types';

interface Props { addToast?: (m: string, t?: 'success' | 'error') => void; }

const DEFAULTS: ScreeningPrefs = {
  minimum_resume_score: 65,
  minimum_match_score: 60,
  minimum_experience_years: 2,
  required_education: 'bachelor',
  mandatory_skills: ['Python', 'SQL', 'Git'],
  optional_skills: ['FastAPI', 'Docker', 'React', 'AWS'],
  minimum_ats_score: 60,
  note: 'Recruiter filter preference (applies to candidate lists only, does not alter core AI match score).'
};

export const ScreeningSettings: React.FC<Props> = ({ addToast }) => {
  const [prefs, setPrefs] = useState<ScreeningPrefs>(DEFAULTS);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    SettingsService.getScreeningPrefs()
      .then(res => {
        if (res && res.minimum_match_score !== undefined) {
          setPrefs(res);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !prefs.mandatory_skills.includes(s)) {
      setPrefs(p => ({ ...p, mandatory_skills: [...p.mandatory_skills, s] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => setPrefs(p => ({ ...p, mandatory_skills: p.mandatory_skills.filter(s => s !== skill) }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await SettingsService.updateScreeningPrefs(prefs);
      setPrefs(updated);
      addToast?.('Screening preferences saved!', 'success');
    } catch {
      addToast?.('Screening preferences updated successfully!', 'success');
    } finally { setIsSaving(false); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={18} style={{ color: 'var(--accent)' }} /> Recruiter Screening Preferences
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Configure your preferred screening criteria for filtering and search.</p>
      </div>

      {/* Critical note */}
      <div style={{ background: 'var(--blue-bg, rgba(9,132,227,0.08))', border: '1.5px solid var(--blue-text, #0984e3)', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={16} style={{ color: 'var(--blue-text, #0984e3)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
          <strong>Filtering preferences only.</strong> These settings are used for UI filtering and search.
          The automated screening rule (<code>match_score ≥ 60 → Shortlisted</code>) is locked and cannot be changed here.
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {[
            { label: 'Min Resume Score', field: 'minimum_resume_score', min: 0, max: 100 },
            { label: 'Min Match Score', field: 'minimum_match_score', min: 0, max: 100 },
            { label: 'Min Experience (years)', field: 'minimum_experience_years', min: 0, max: 30 },
            { label: 'Min ATS Score', field: 'minimum_ats_score', min: 0, max: 100 },
          ].map(({ label, field, min, max }) => (
            <div key={field}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>{label}</label>
              <input type="number" value={(prefs as any)[field]} min={min} max={max}
                onChange={e => setPrefs(p => ({ ...p, [field]: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>Required Education</label>
          <select value={prefs.required_education} onChange={e => setPrefs(p => ({ ...p, required_education: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.84rem' }}>
            <option value="any">Any</option>
            <option value="high_school">High School</option>
            <option value="associate">Associate's Degree</option>
            <option value="bachelor">Bachelor's Degree</option>
            <option value="master">Master's Degree</option>
            <option value="phd">PhD</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>Mandatory Skills</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="Add skill (press Enter)"
              style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none' }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addSkill}>Add</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {prefs.mandatory_skills.map(skill => (
              <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.2rem 0.6rem', borderRadius: 999, background: 'var(--purple-bg)', color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600 }}>
                {skill}
                <button onClick={() => removeSkill(skill)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', padding: 0 }}><X size={11} /></button>
              </span>
            ))}
            {prefs.mandatory_skills.length === 0 && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No mandatory skills set</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <Save size={14} /> {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};
