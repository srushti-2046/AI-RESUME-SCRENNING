// PrivacySettings.tsx
import React, { useState, useEffect } from 'react';
import { Shield, Key, Smartphone, MonitorSmartphone, Save } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import type { PrivacySettings as PS } from '../../types/settings.types';
import { ChangePasswordModal } from './ChangePasswordModal';

interface Props { addToast?: (m: string, t?: 'success' | 'error' | 'info') => void; }

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
    style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: checked ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
    <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
  </button>
);

const DEFAULTS: PS = { profile_visibility: 'private', resume_visibility: 'private', analytics_enabled: true, personalization_enabled: true, activity_tracking_enabled: true };

export const PrivacySettings: React.FC<Props> = ({ addToast }) => {
  const [settings, setSettings] = useState<PS>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    SettingsService.getPrivacy().then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await SettingsService.updatePrivacy(settings);
      setSettings(saved);
      addToast?.('Privacy settings saved!', 'success');
    } catch { addToast?.('Saved locally — settings server not reachable.', 'error'); }
    finally { setIsSaving(false); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} style={{ color: 'var(--accent)' }} /> Privacy & Security
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Control your data visibility and account security.</p>
      </div>

      {/* Privacy */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Privacy</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {[
            { label: 'Profile Visibility', field: 'profile_visibility', opts: [['private','Private'],['recruiters_only','Recruiters Only'],['public','Public']] },
            { label: 'Resume Visibility', field: 'resume_visibility', opts: [['private','Private'],['recruiters_only','Recruiters Only']] },
          ].map(({ label, field, opts }) => (
            <div key={field}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>{label}</label>
              <select value={(settings as any)[field]} onChange={e => setSettings(p => ({ ...p, [field]: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
        </div>
        {[
          { field: 'analytics_enabled', label: 'Analytics & Usage Data', desc: 'Help improve the platform with anonymized usage data' },
          { field: 'personalization_enabled', label: 'Personalized Recommendations', desc: 'Receive smart suggestions based on your usage' },
          { field: 'activity_tracking_enabled', label: 'Activity Tracking', desc: 'Track your in-platform activity for audit purposes' },
        ].map(({ field, label, desc }) => (
          <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{desc}</div>
            </div>
            <Toggle checked={(settings as any)[field]} onChange={v => setSettings(p => ({ ...p, [field]: v }))} />
          </div>
        ))}
      </div>

      {/* Security */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Security</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[
            { icon: <Key size={16} style={{ color: 'var(--accent)' }} />, title: 'Password', desc: 'Update your login password via secure authentication.', btn: 'Change Password', action: () => setShowPasswordModal(true) },
            { icon: <Smartphone size={16} style={{ color: 'var(--green-text)' }} />, title: 'Two-Factor Authentication', desc: 'Add an extra layer of security to your account.', btn: 'Configure 2FA', action: () => addToast?.('2FA setup coming soon', 'info') },
            { icon: <MonitorSmartphone size={16} style={{ color: 'var(--blue-text)' }} />, title: 'Active Sessions', desc: 'Review and manage all active login sessions.', btn: 'View Sessions', action: () => addToast?.('Session management coming soon', 'info') },
          ].map(({ icon, title, desc, btn, action }) => (
            <div key={title} style={{ background: 'var(--card-hover-bg)', borderRadius: 10, padding: '1rem', border: '1.5px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: '0.4rem' }}>
                {icon} <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{title}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>{desc}</p>
              <button className="btn btn-secondary btn-sm" onClick={action} style={{ width: '100%', fontWeight: 600 }}>{btn}</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <Save size={14} /> {isSaving ? 'Saving...' : 'Save Privacy Settings'}
        </button>
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} addToast={addToast} />}
    </div>
  );
};
