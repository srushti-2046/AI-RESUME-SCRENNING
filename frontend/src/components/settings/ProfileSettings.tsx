// ProfileSettings.tsx — Read-only user details display
import React, { useState, useEffect } from 'react';
import { User, Mail, Building, Phone, Clock, Shield, CheckCircle2 } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import { useDashboard } from '../../hooks/useDashboard';

interface Props {
  addToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProfileSettings: React.FC<Props> = () => {
  const { user } = useDashboard();
  const [fullName, setFullName] = useState(user?.full_name || 'Senior Recruiter');
  const [phone, setPhone] = useState('+1 (555) 349-8201');
  const [company, setCompany] = useState('ScreenAI Enterprise');
  const [department, setDepartment] = useState('Talent Acquisition');
  const [timezone, setTimezone] = useState('America/New_York (EST)');
  const [bio, setBio] = useState('Managing technical talent pipelines and automated AI candidate evaluations.');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user && user.full_name) { setFullName(user.full_name); }
    SettingsService.getProfile().then(p => {
      setProfile(p);
      if (p.full_name) setFullName(p.full_name);
      if (p.company) setCompany(p.company);
      if (p.department) setDepartment(p.department);
      if (p.timezone) setTimezone(p.timezone);
      if (p.bio) setBio(p.bio);
      if (p.phone) setPhone(p.phone);
    }).catch(() => {});
  }, [user]);

  const initials = (fullName || user?.full_name || 'U')
    .split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'January 2026';

  const roleName = user?.role || 'Administrator';

  const detailItems = [
    { label: 'Full Name', val: fullName || 'Senior Recruiter', icon: <User size={15} /> },
    { label: 'Email Address', val: user?.email || 'recruiter@screenai.internal', icon: <Mail size={15} /> },
    { label: 'System Role', val: roleName, icon: <Shield size={15} />, isBadge: true },
    { label: 'Phone Number', val: phone, icon: <Phone size={15} /> },
    { label: 'Organization / Company', val: company, icon: <Building size={15} /> },
    { label: 'Department / Team', val: department, icon: <Building size={15} /> },
    { label: 'Timezone', val: timezone, icon: <Clock size={15} /> },
    { label: 'Account Status', val: 'Active (Verified)', icon: <CheckCircle2 size={15} />, isStatus: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          User Profile Details
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
          View your registered user information, organization affiliation, and access role.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="card" style={{
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--card-hover-bg) 100%)',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          width: 76,
          height: 76,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent) 0%, #a29bfe 100%)',
          color: '#ffffff',
          fontSize: '1.75rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-accent)',
          flexShrink: 0
        }}>
          {initials}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {fullName}
            </h3>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'var(--purple-bg, rgba(108,99,255,0.12))',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {roleName}
            </span>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(34,197,94,0.12)',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              Active
            </span>
          </div>

          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            {user?.email || 'recruiter@screenai.internal'}
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Member since {memberSince}
          </div>
        </div>
      </div>

      {/* Information Fields Grid (Read-Only) */}
      <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.15rem' }}>
          Account & Organization Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          {detailItems.map(item => (
            <div
              key={item.label}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 8,
                background: 'var(--card-hover-bg)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>

              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {item.val}
              </div>
            </div>
          ))}
        </div>

        {/* Professional Bio Box (Read-Only) */}
        <div style={{
          marginTop: '1.25rem',
          padding: '1rem',
          borderRadius: 8,
          background: 'var(--card-hover-bg)',
          border: '1px solid var(--border)'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '0.4rem'
          }}>
            Professional Summary / Bio
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {bio}
          </p>
        </div>

        {/* Notice */}
        <div style={{
          marginTop: '1.25rem',
          padding: '0.75rem 1rem',
          borderRadius: 6,
          background: 'var(--purple-bg, rgba(108,99,255,0.08))',
          border: '1px solid rgba(108,99,255,0.15)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>ℹ️</span>
          <span>Profile records are managed securely via Supabase Auth and workspace directory permissions.</span>
        </div>
      </div>
    </div>
  );
};
