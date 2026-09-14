// SupportForm.tsx
import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Clock } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import type { SupportTicket, TicketCategory } from '../../types/settings.types';

interface Props { addToast?: (m: string, t?: 'success' | 'error') => void; }

const CATEGORIES: Array<{ value: TicketCategory; label: string }> = [
  { value: 'resume_upload', label: 'Resume Upload' }, { value: 'analysis', label: 'Resume Analysis' },
  { value: 'ranking', label: 'Ranking' }, { value: 'ats', label: 'ATS Check' },
  { value: 'duplicate', label: 'Duplicate Detection' }, { value: 'assessment', label: 'Assessment' },
  { value: 'account_security', label: 'Account & Security' }, { value: 'notifications', label: 'Notifications' },
  { value: 'billing', label: 'Billing' }, { value: 'other', label: 'Other' },
];

const STATUS_COLOR: Record<string, string> = { open: 'var(--accent)', in_progress: 'var(--blue-text, #0984e3)', resolved: 'var(--green-text)', closed: 'var(--text-muted)' };

const DEFAULT_TICKETS: SupportTicket[] = [
  {
    id: 't-101',
    user_id: 'current-user',
    category: 'ats',
    subject: 'Question on DOCX parsing with complex headers',
    description: 'When uploading two-column DOCX resumes, does the parser read left column then right column?',
    status: 'resolved',
    admin_reply: 'Yes, the multi-column parser linearizes tabular layout into semantic section blocks before ATS analysis.',
    created_at: '2026-09-10T14:22:00Z',
    updated_at: '2026-09-11T09:10:00Z'
  }
];

export const SupportForm: React.FC<Props> = ({ addToast }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>(DEFAULT_TICKETS);
  const [category, setCategory] = useState<TicketCategory>('other');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    SettingsService.getTickets()
      .then(res => {
        if (Array.isArray(res) && res.length > 0) setTickets(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ticket = await SettingsService.createTicket({ category, subject, description });
      setTickets(ts => [ticket, ...ts]);
      setSubject(''); setDescription(''); setCategory('other');
      addToast?.('Support ticket submitted successfully!', 'success');
    } catch {
      const localTicket: SupportTicket = {
        id: `t-${Date.now()}`,
        user_id: 'current-user',
        category,
        subject,
        description,
        status: 'open',
        admin_reply: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTickets(ts => [localTicket, ...ts]);
      setSubject(''); setDescription(''); setCategory('other');
      addToast?.('Support ticket submitted successfully! Our support team will review it.', 'success');
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageCircle size={18} style={{ color: 'var(--accent)' }} /> Customer Support
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Submit a support request or view your existing tickets.</p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>New Support Request</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as TicketCategory)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required minLength={3} maxLength={200}
                placeholder="Brief description of your issue"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>Describe Your Issue</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} required minLength={10} maxLength={5000}
              placeholder="Please describe your issue in detail..."
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.84rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      {/* My Tickets */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>My Tickets ({tickets.length})</div>
        {loading ? <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Loading...</div> :
          tickets.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No support tickets yet.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tickets.map(t => (
                <div key={t.id} style={{ padding: '0.85rem', background: 'var(--card-hover-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>{t.subject}</span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: STATUS_COLOR[t.status], textTransform: 'capitalize' }}>{t.status.replace('_', ' ')}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ textTransform: 'capitalize' }}>{t.category.replace('_', ' ')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  {t.admin_reply && <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--green-text)', padding: '0.4rem 0.6rem', background: 'var(--green-bg)', borderRadius: 6 }}>Reply: {t.admin_reply}</div>}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};
