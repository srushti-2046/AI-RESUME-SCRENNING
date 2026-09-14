// NotificationSettings.tsx
import React, { useState, useEffect } from 'react';
import { Bell, Save } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import type { NotificationPrefs } from '../../types/settings.types';

interface Props { addToast?: (msg: string, type?: 'success' | 'error') => void; }

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; id: string }> = ({ checked, onChange, id }) => (
  <button type="button" id={id} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
    style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: checked ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s ease',
      position: 'relative', flexShrink: 0,
    }}>
    <span style={{
      position: 'absolute', top: 3, left: checked ? 23 : 3,
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }} />
  </button>
);

const Row: React.FC<{ label: string; desc: string; field: keyof NotificationPrefs; prefs: NotificationPrefs; onChange: (f: keyof NotificationPrefs, v: boolean) => void }> =
  ({ label, desc, field, prefs, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</div>
      </div>
      <Toggle id={`toggle-${field}`} checked={prefs[field] as boolean} onChange={v => onChange(field, v)} />
    </div>
  );

const DEFAULT_PREFS: NotificationPrefs = {
  email_notifications: true, new_resume_alert: true, analysis_completed_alert: true,
  duplicate_resume_alert: true, assessment_assigned_alert: true, assessment_completed_alert: true,
  shortlisted_alert: true, rejection_alert: false, weekly_summary: true,
  system_security_alerts: true, in_app_notifications: true, reminder_enabled: true,
  reminder_hours_before: 24, reminder_frequency: 'once',
};

export const NotificationSettings: React.FC<Props> = ({ addToast }) => {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SettingsService.getNotifications().then(setPrefs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggle = (field: keyof NotificationPrefs, value: boolean) => {
    setPrefs(p => ({ ...p, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await SettingsService.updateNotifications(prefs);
      setPrefs(saved);
      addToast?.('Notification preferences saved!', 'success');
    } catch {
      addToast?.('Could not reach settings server. Changes saved locally.', 'error');
    } finally { setIsSaving(false); }
  };

  const EMAIL_ROWS: Array<{ label: string; desc: string; field: keyof NotificationPrefs }> = [
    { field: 'email_notifications', label: 'Email Notifications', desc: 'Receive important system notifications by email' },
    { field: 'new_resume_alert', label: 'New Resume Alert', desc: 'Notify when a new resume is uploaded' },
    { field: 'analysis_completed_alert', label: 'Analysis Completed', desc: 'Notify when AI analysis finishes' },
    { field: 'duplicate_resume_alert', label: 'Duplicate Resume Alert', desc: 'Notify when a duplicate resume is detected' },
    { field: 'assessment_assigned_alert', label: 'Assessment Assigned', desc: 'Notify when an assessment is sent to a candidate' },
    { field: 'assessment_completed_alert', label: 'Assessment Completed', desc: 'Notify when a candidate completes an assessment' },
    { field: 'shortlisted_alert', label: 'Candidate Shortlisted', desc: 'Notify when a candidate is automatically shortlisted' },
    { field: 'rejection_alert', label: 'Candidate Rejected', desc: 'Notify when a candidate is automatically rejected' },
    { field: 'weekly_summary', label: 'Weekly Summary', desc: 'Receive weekly recruitment activity digest' },
    { field: 'system_security_alerts', label: 'System & Security Alerts', desc: 'Critical account and security notifications' },
  ];

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={18} style={{ color: 'var(--accent)' }} /> Notification Preferences
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Control what alerts you receive and how often.</p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Email Notifications</div>
        {EMAIL_ROWS.map(r => <Row key={r.field} {...r} prefs={prefs} onChange={handleToggle} />)}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>In-App & Reminders</div>
        <Row field="in_app_notifications" label="In-App Notifications" desc="Show notifications inside the dashboard" prefs={prefs} onChange={handleToggle} />
        <Row field="reminder_enabled" label="Assessment Reminders" desc="Send reminder before an assessment expires" prefs={prefs} onChange={handleToggle} />

        {prefs.reminder_enabled && (
          <div style={{ paddingTop: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Reminder Time</label>
              <select value={prefs.reminder_hours_before} onChange={e => handleToggle('reminder_hours_before' as any, parseInt(e.target.value) as any)}
                style={{ width: '100%', padding: '0.45rem 0.7rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                {[1, 6, 12, 24, 48, 72].map(h => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''} before</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Frequency</label>
              <select value={prefs.reminder_frequency} onChange={e => setPrefs(p => ({ ...p, reminder_frequency: e.target.value as any }))}
                style={{ width: '100%', padding: '0.45rem 0.7rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        )}
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
