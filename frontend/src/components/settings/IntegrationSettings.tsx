// IntegrationSettings.tsx
import React, { useState, useEffect } from 'react';
import { Link2, CheckCircle2, XCircle } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import type { IntegrationItem } from '../../types/settings.types';

interface Props { addToast?: (m: string, t?: 'success' | 'error' | 'info') => void; }

const STATUS_STYLE: Record<string, { color: string; icon: React.ReactNode }> = {
  connected: { color: 'var(--green-text)', icon: <CheckCircle2 size={16} /> },
  configured: { color: 'var(--accent)', icon: <CheckCircle2 size={16} /> },
  not_connected: { color: 'var(--text-muted)', icon: <XCircle size={16} /> },
  not_configured: { color: 'var(--text-muted)', icon: <XCircle size={16} /> },
};

const DEFAULT_INTEGRATIONS: IntegrationItem[] = [
  { name: 'Supabase PostgreSQL', description: 'Primary relational database for candidates, jobs, and authentication.', status: 'connected', category: 'database' },
  { name: 'Google Gemini 1.5 Pro', description: 'Large Language Model API used for semantic resume extraction & ATS scoring.', status: 'configured', category: 'ai' },
  { name: 'Supabase Cloud Storage', description: 'Encrypted object storage bucket for resume files (PDF, DOCX).', status: 'connected', category: 'storage' },
  { name: 'Email Webhooks', description: 'Transactional notification service for status alerts & candidate updates.', status: 'configured', category: 'notifications' },
  { name: 'Greenhouse ATS', description: 'Enterprise ATS bi-directional candidate pipeline sync.', status: 'not_configured', category: 'ats' },
  { name: 'Lever ATS Sync', description: 'Direct import of candidate requisitions and applicant stages.', status: 'not_configured', category: 'ats' },
];

export const IntegrationSettings: React.FC<Props> = ({ addToast }) => {
  const [items, setItems] = useState<IntegrationItem[]>(DEFAULT_INTEGRATIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SettingsService.getIntegrations()
      .then(r => {
        if (r && r.integrations && r.integrations.length > 0) {
          setItems(r.integrations);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link2 size={18} style={{ color: 'var(--accent)' }} /> Integrations
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>View connection status for third-party services. API keys are managed server-side only.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {items.map(item => {
          const style = STATUS_STYLE[item.status] || STATUS_STYLE['not_connected'];
          const isConnected = item.status === 'connected' || item.status === 'configured';
          return (
            <div key={item.name} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', fontWeight: 700, color: style.color, textTransform: 'capitalize' }}>
                  {style.icon} {item.status.replace('_', ' ')}
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '0.9rem' }}>{item.description}</p>
              {!isConnected && (
                <button className="btn btn-secondary btn-sm" onClick={() => addToast?.(`${item.name} connection configuration is managed via environment variables on the server.`, 'info')}
                  style={{ fontSize: '0.78rem' }}>Configure</button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: 'var(--card-hover-bg)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        🔒 API keys and secrets are stored as server environment variables and are never exposed to the frontend.
      </div>
    </div>
  );
};
