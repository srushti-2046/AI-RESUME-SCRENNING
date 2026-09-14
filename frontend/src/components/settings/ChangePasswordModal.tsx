// ChangePasswordModal.tsx — Uses Supabase Auth updateUser. Password NEVER sent to FastAPI.
import React, { useState } from 'react';
import { X, Key, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  onClose: () => void;
  addToast?: (m: string, t?: 'success' | 'error') => void;
}

export const ChangePasswordModal: React.FC<Props> = ({ onClose, addToast }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      addToast?.('Password updated successfully!', 'success');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
      addToast?.('Password update failed.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '2rem', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
          <Key size={20} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Change Password</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Your password is managed by Supabase Auth and is never stored in our application database.
        </p>
        <form onSubmit={handleSubmit}>
          {[
            { label: 'New Password', value: password, setter: setPassword },
            { label: 'Confirm Password', value: confirm, setter: setConfirm },
          ].map(({ label, value, setter }) => (
            <div key={label} style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
              <div style={{ position: 'relative' }}>
                <input type={show ? 'text' : 'password'} value={value} onChange={e => setter(e.target.value)}
                  placeholder="••••••••" required minLength={8}
                  style={{ width: '100%', padding: '0.5rem 2.5rem 0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShow(s => !s)}
                  style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
          {error && <div style={{ color: 'var(--red-text, #e17055)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
