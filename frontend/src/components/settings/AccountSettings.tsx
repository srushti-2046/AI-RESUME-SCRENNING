// AccountSettings.tsx — Account info + danger zone
import React, { useState, useEffect } from 'react';
import { Settings2, LogOut, Trash2, Copy } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import { supabase } from '../../lib/supabase';
import type { AccountInfo } from '../../types/settings.types';
import { useDashboard } from '../../hooks/useDashboard';

interface Props { addToast?: (m: string, t?: 'success' | 'error' | 'warning') => void; }

export const AccountSettings: React.FC<Props> = ({ addToast }) => {
  const { user } = useDashboard();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    SettingsService.getAccount().then(setAccount).catch(() => {
      if (user) setAccount({ id: user.id || '', email: user.email || null, full_name: user.full_name || null, role: user.role || null, created_at: null, last_sign_in_at: null });
    }).finally(() => setLoading(false));
  }, [user]);

  const handleSignOutAll = async () => {
    try {
      await SettingsService.signOutAllDevices();
      await supabase.auth.signOut();
      addToast?.('Signed out from all devices.', 'success');
    } catch {
      await supabase.auth.signOut();
      addToast?.('Signed out.', 'success');
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== 'DELETE MY ACCOUNT') return;
    setIsDeleting(true);
    try {
      await SettingsService.deleteAccount('DELETE MY ACCOUNT');
      await supabase.auth.signOut();
      addToast?.('Account deleted.', 'warning');
    } catch {
      addToast?.('Deletion failed — please contact support.', 'error');
    } finally { setIsDeleting(false); setShowDeleteModal(false); }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings2 size={18} style={{ color: 'var(--accent)' }} /> Account Information
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>View your account details and manage your session.</p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        {[
          { label: 'Account ID', value: account?.id || '—' },
          { label: 'Email', value: account?.email || '—' },
          { label: 'Full Name', value: account?.full_name || '—' },
          { label: 'Account Role', value: account?.role ? account.role.charAt(0).toUpperCase() + account.role.slice(1) : '—' },
          { label: 'Account Created', value: fmt(account?.created_at || null) },
          { label: 'Last Sign In', value: fmt(account?.last_sign_in_at || null) },
          { label: 'Authentication Provider', value: 'Supabase Auth' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontWeight: 600, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>
              {value}
              {label === 'Account ID' && (
                <button onClick={() => { navigator.clipboard.writeText(value); addToast?.('ID copied', 'success'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: 6, verticalAlign: 'middle' }}>
                  <Copy size={12} />
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Session Management</div>
        <button className="btn btn-secondary" onClick={handleSignOutAll}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <LogOut size={15} /> Sign Out All Devices
        </button>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>This will invalidate all active sessions including this one.</p>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ padding: '1.5rem', border: '1.5px solid var(--red-text, #e17055)' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--red-text, #e17055)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>⚠ Danger Zone</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button className="btn" onClick={() => setShowDeleteModal(true)}
          style={{ background: 'var(--red-text, #e17055)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Trash2 size={14} /> Delete Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--red-text, #e17055)', marginBottom: '0.75rem' }}>⚠ Delete Account</h3>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              This will permanently delete your account, all resumes, candidates, assessments, and settings. This cannot be undone.
            </p>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Type <strong>DELETE MY ACCOUNT</strong> to confirm:
            </p>
            <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--red-text, #e17055)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none', boxSizing: 'border-box', marginBottom: '1.25rem' }} />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }}>Cancel</button>
              <button className="btn" disabled={deleteInput !== 'DELETE MY ACCOUNT' || isDeleting}
                onClick={handleDelete}
                style={{ background: deleteInput === 'DELETE MY ACCOUNT' ? 'var(--red-text, #e17055)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem', fontWeight: 700, cursor: deleteInput === 'DELETE MY ACCOUNT' ? 'pointer' : 'not-allowed' }}>
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
