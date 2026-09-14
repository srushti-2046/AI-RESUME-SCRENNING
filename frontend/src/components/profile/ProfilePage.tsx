import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, Building, Clock, Shield,
  CheckCircle2, Camera, Key, Smartphone, Save, Award, Users, Briefcase, Loader2, Lock
} from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import { ProfileService, type ProfileData } from '../../services/profile.service';
import { ChangePasswordModal } from '../settings/ChangePasswordModal';

interface ProfilePageProps {
  addToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenAuth?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ addToast, onOpenAuth }) => {
  const { user, loading: authLoading, isAuthenticated, refresh } = useDashboard();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [timezone, setTimezone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Load profile from unified FastAPI backend when authenticated
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!isAuthenticated) {
        setProfile(null);
        return;
      }
      try {
        setLoadingProfile(true);
        const data = await ProfileService.getProfile();
        if (isMounted) {
          setProfile(data);
          setFullName(data.full_name || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setCompany(data.company || '');
          setDepartment(data.department || '');
          setTimezone(data.timezone || '');
          setBio(data.bio || '');
          setAvatarUrl(data.avatar_url || null);
        }
      } catch (err: any) {
        console.error('Error fetching profile from API:', err);
        if (isMounted && user) {
          // Fallback to user session info if network/table sync is settling
          setFullName(user.full_name || 'Recruiter');
          setEmail(user.email || '');
          if (user.avatar_url) setAvatarUrl(user.avatar_url);
        }
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast?.('Please select a valid image file (PNG, JPG, WebP, GIF).', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast?.('Image size must not exceed 5MB.', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const uploadedUrl = await ProfileService.uploadAvatar(file);
      setAvatarUrl(uploadedUrl);
      if (profile) {
        setProfile({ ...profile, avatar_url: uploadedUrl });
      }
      if (refresh) refresh();
      addToast?.('Profile photo updated and saved successfully!', 'success');
    } catch (err: any) {
      console.error('Error saving profile photo:', err);
      addToast?.(err.message || 'Failed to upload photo.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await ProfileService.updateProfile({
        full_name: fullName,
        phone,
        company,
        department,
        timezone,
        bio,
        avatar_url: avatarUrl || undefined,
      });

      setProfile(updated);
      if (refresh) refresh();
      addToast?.('Profile details updated successfully!', 'success');
    } catch (err: any) {
      console.error('Profile save error:', err);
      addToast?.(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // State 1: Authentication loading
  if (authLoading || (isAuthenticated && loadingProfile && !profile)) {
    return (
      <div style={{ maxWidth: '1200px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--accent)', margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Loading Profile...</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Verifying authenticated session and fetching credentials.</p>
      </div>
    );
  }

  // State 2: Unauthenticated — strictly protected route guard
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '640px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(235, 94, 40, 0.12)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto'
            }}
          >
            <Lock size={30} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
            Authentication Required
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '2rem' }}>
            The Profile dashboard is restricted to authenticated recruiters. Please sign in or create an account to view and manage your recruiter profile, organization credentials, and hiring statistics.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenAuth}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.65rem 1.75rem',
                fontWeight: 700
              }}
            >
              <User size={16} /> Sign In / Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Authenticated — Render profile dashboard
  const initials = (fullName || 'R')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'R';

  const overview = profile?.recruiting_overview || {
    total_screened: 0,
    shortlisted: 0,
    rejected: 0,
    resumes_uploaded: 0,
    jobs_created: 0,
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your recruiter account, personal details, and hiring team preferences.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Profile Card & Quick Stats */}
        <div>
          {/* Main User Card */}
          <div className="card mb-4" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
              <input
                type="file"
                ref={photoInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handlePhotoSelect}
              />
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent) 0%, #a29bfe 100%)',
                  color: '#ffffff',
                  fontSize: '2rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-accent)',
                  margin: '0 auto',
                  border: '3px solid var(--card-bg)',
                  overflow: 'hidden'
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || 'Avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  initials
                )}
              </div>
              <button
                type="button"
                title="Change Photo (Max 5MB)"
                disabled={uploadingAvatar}
                onClick={() => photoInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#ffffff',
                  border: '2px solid var(--card-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: uploadingAvatar ? 'wait' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                {uploadingAvatar ? <Loader2 size={13} className="spin" /> : <Camera size={13} />}
              </button>
            </div>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              {fullName || 'Recruiter'}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {email || 'recruiter@company.com'}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                background: 'var(--green-bg)',
                color: 'var(--green-text)',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: '1.25rem'
              }}
            >
              <CheckCircle2 size={13} />
              <span>{profile?.account_status || 'Active Recruiter'}</span>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem', textAlign: 'left' }}>
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-muted">Account Role:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Administrator'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-muted">Organization:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{company || 'Personal Workspace'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Security Status:</span>
                <span className="font-semibold" style={{ color: 'var(--green-text)' }}>{profile?.security_status || 'Protected (2FA Ready)'}</span>
              </div>
            </div>
          </div>

          {/* Recruiter Activity Stats Card */}
          <div className="card">
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Recruiting Overview
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.65rem 0.85rem', background: 'var(--card-hover-bg)', borderRadius: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'var(--purple-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {overview.total_screened}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Candidates Screened</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.65rem 0.85rem', background: 'var(--card-hover-bg)', borderRadius: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'var(--green-bg)', color: 'var(--green-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {overview.shortlisted}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Shortlisted Candidates</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.65rem 0.85rem', background: 'var(--card-hover-bg)', borderRadius: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'var(--blue-bg)', color: 'var(--blue-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {overview.jobs_created}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Active Job Positions</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile & Security Details */}
        <div>
          {/* Edit Profile Form Card */}
          <div className="card mb-4" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <User size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Personal & Account Details
              </h3>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} style={{ color: 'var(--accent)' }} /> Full Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      background: 'var(--card-hover-bg)'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} style={{ color: 'var(--accent)' }} /> Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    readOnly
                    title="Account email is managed by authentication provider"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.88rem',
                      color: 'var(--text-muted)',
                      outline: 'none',
                      background: 'var(--card-bg)',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={13} style={{ color: 'var(--accent)' }} /> Phone Number
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      background: 'var(--card-hover-bg)'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={13} style={{ color: 'var(--accent)' }} /> Company / Organization
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Enter company name"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      background: 'var(--card-hover-bg)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={13} style={{ color: 'var(--accent)' }} /> Department / Team
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. HR & Talent Acquisition"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      background: 'var(--card-hover-bg)'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} style={{ color: 'var(--accent)' }} /> Timezone
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. Asia/Kolkata (GMT+5:30)"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      background: 'var(--card-hover-bg)'
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Professional Bio / Hiring Focus
                </label>
                <textarea
                  className="form-input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell candidates and team members about your focus..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    fontSize: '0.88rem',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    background: 'var(--card-hover-bg)',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                    padding: '0.55rem 1.4rem'
                  }}
                >
                  <Save size={15} />
                  {isSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security & Access Management Card */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <Key size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Security & Authentication
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', borderRadius: '10px', padding: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                  <Key size={16} style={{ color: 'var(--accent)' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Password</div>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Ensure your account is protected with a strong, randomized password.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPasswordModal(true)}
                  style={{ width: '100%' }}
                >
                  Change Password
                </button>
              </div>

              <div style={{ border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', borderRadius: '10px', padding: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                  <Smartphone size={16} style={{ color: 'var(--green-text)' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Two-Factor Authentication</div>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Add an extra layer of security to your recruiter portal access.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => addToast?.('2FA is enforced and managed via your Supabase Authentication provider.', 'info')}
                  style={{ width: '100%' }}
                >
                  Configure 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Supabase Password Change Modal */}
      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          addToast={addToast}
        />
      )}
    </div>
  );
};
