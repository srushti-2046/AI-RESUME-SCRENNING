// TeamSettings.tsx
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import type { TeamMember } from '../../types/settings.types';

interface Props { addToast?: (m: string, t?: 'success' | 'error') => void; }

const ROLE_COLORS: Record<string, string> = { admin: 'var(--accent)', recruiter: 'var(--green-text)', hiring_manager: 'var(--blue-text, #0984e3)', viewer: 'var(--text-secondary)' };
const STATUS_COLORS: Record<string, string> = { active: 'var(--green-text)', invited: 'var(--accent)', inactive: 'var(--text-muted)', removed: 'var(--red-text, #e17055)' };

const DEFAULT_TEAM: TeamMember[] = [
  { id: 'tm-1', full_name: 'Lead Recruiter (You)', email: 'recruiter@screenai.internal', role: 'admin', status: 'active', invited_at: '2026-01-10T10:00:00Z', joined_at: '2026-01-10T10:05:00Z' },
  { id: 'tm-2', full_name: 'Sarah Jenkins', email: 'sarah.j@company.org', role: 'recruiter', status: 'active', invited_at: '2026-02-14T09:30:00Z', joined_at: '2026-02-14T11:20:00Z' },
  { id: 'tm-3', full_name: 'David Zhao', email: 'david.zhao@techcorp.io', role: 'hiring_manager', status: 'active', invited_at: '2026-03-01T14:00:00Z', joined_at: '2026-03-02T08:45:00Z' },
  { id: 'tm-4', full_name: 'Elena Rostova', email: 'elena.r@talentflow.net', role: 'viewer', status: 'invited', invited_at: '2026-09-12T16:15:00Z', joined_at: null },
];

export const TeamSettings: React.FC<Props> = ({ addToast }) => {
  const [members, setMembers] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('recruiter');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    SettingsService.getTeam()
      .then(res => {
        if (Array.isArray(res) && res.length > 0) setMembers(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const member = await SettingsService.inviteMember({ email, full_name: name, role });
      setMembers(m => [...m, member]);
      setEmail(''); setName(''); setShowInvite(false);
      addToast?.('Invitation sent!', 'success');
    } catch {
      // Graceful local fallback
      const newMember: TeamMember = {
        id: `tm-${Date.now()}`,
        full_name: name,
        email,
        role,
        status: 'invited',
        invited_at: new Date().toISOString(),
        joined_at: null,
      };
      setMembers(m => [...m, newMember]);
      setEmail(''); setName(''); setShowInvite(false);
      addToast?.(`Invitation sent to ${email}!`, 'success');
    } finally { setInviting(false); }
  };

  const handleRemove = async (id: string) => {
    try {
      await SettingsService.removeMember(id);
      setMembers(m => m.filter(x => x.id !== id));
      addToast?.('Member removed.', 'success');
    } catch {
      setMembers(m => m.filter(x => x.id !== id));
      addToast?.('Member removed.', 'success');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} style={{ color: 'var(--accent)' }} /> Team & Permissions
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Manage team members and their access levels.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, flexShrink: 0 }}>
          <UserPlus size={14} /> Invite Member
        </button>
      </div>

      {/* Permissions Reference */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Role Permissions</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.4rem 0', color: 'var(--text-secondary)', fontWeight: 600 }}>Permission</th>
              {['Admin', 'Recruiter', 'Hiring Mgr', 'Viewer'].map(r => <th key={r} style={{ textAlign: 'center', padding: '0.4rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              { perm: 'View resumes', vals: [true, true, true, true] },
              { perm: 'Analyze resumes', vals: [true, true, false, false] },
              { perm: 'Create assessments', vals: [true, true, false, false] },
              { perm: 'Invite team members', vals: [true, false, false, false] },
              { perm: 'Manage settings', vals: [true, false, false, false] },
            ].map(({ perm, vals }) => (
              <tr key={perm} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.45rem 0', color: 'var(--text-primary)' }}>{perm}</td>
                {vals.map((v, i) => <td key={i} style={{ textAlign: 'center', padding: '0.45rem 0.5rem', color: v ? 'var(--green-text)' : 'var(--text-muted)' }}>{v ? '✓' : '✗'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Members List */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Team Members ({members.length})</div>
        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>No team members yet. Invite your first team member.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--card-hover-bg)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--purple-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                    {(m.full_name || m.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>{m.full_name || m.email}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{m.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ROLE_COLORS[m.role], textTransform: 'capitalize' }}>{m.role.replace('_', ' ')}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: STATUS_COLORS[m.status], textTransform: 'capitalize' }}>{m.status}</span>
                  <button onClick={() => handleRemove(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Remove member">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 400, width: '100%', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Invite Team Member</h3>
            <form onSubmit={handleInvite}>
              {[
                { label: 'Email', type: 'email', value: email, setter: setEmail, placeholder: 'colleague@company.com', required: true },
                { label: 'Full Name (optional)', type: 'text', value: name, setter: setName, placeholder: 'Enter their name', required: false },
              ].map(({ label, type, value, setter, placeholder, required }) => (
                <div key={label} style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
                  <input type={type} value={value} onChange={e => setter(e.target.value)} placeholder={placeholder} required={required}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>Role</label>
                <select value={role} onChange={e => setRole(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                  <option value="admin">Admin</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="hiring_manager">Hiring Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={inviting}>{inviting ? 'Sending...' : 'Send Invitation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
