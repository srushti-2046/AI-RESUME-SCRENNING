// settings.service.ts — All API calls to the FastAPI settings backend
// Auth token is automatically injected from Supabase session

import { supabase } from '../lib/supabase';
import type {
  ProfileData, ProfileUpdatePayload,
  NotificationPrefs,
  PrivacySettings,
  AccountInfo,
  ScreeningPrefs,
  TeamMember, TeamInvitePayload,
  EmailPrefs, EmailTemplate, EmailEventType,
  IntegrationItem,
  DataRetentionSettings,
  SupportTicket,
  FAQItem, GuideItem, AboutInfo,
} from '../types/settings.types';

// Base URL from environment — never hardcoded
const BASE_URL = import.meta.env.VITE_SETTINGS_API_URL ?? 'http://localhost:8000';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers: { ...headers, ...(options?.headers ?? {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Profile ────────────────────────────────────────────────
export const SettingsService = {
  getProfile: () => apiFetch<ProfileData>('/api/settings/profile'),
  updateProfile: (data: ProfileUpdatePayload) => apiFetch<ProfileData>('/api/settings/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  // ─── Notifications ─────────────────────────────────────────
  getNotifications: () => apiFetch<NotificationPrefs>('/api/settings/notifications'),
  updateNotifications: (data: Partial<NotificationPrefs>) => apiFetch<NotificationPrefs>('/api/settings/notifications', { method: 'PATCH', body: JSON.stringify(data) }),

  // ─── Privacy ───────────────────────────────────────────────
  getPrivacy: () => apiFetch<PrivacySettings>('/api/settings/privacy'),
  updatePrivacy: (data: Partial<PrivacySettings>) => apiFetch<PrivacySettings>('/api/settings/privacy', { method: 'PATCH', body: JSON.stringify(data) }),

  // ─── Account ───────────────────────────────────────────────
  getAccount: () => apiFetch<AccountInfo>('/api/settings/account'),
  signOutAllDevices: () => apiFetch<{ message: string }>('/api/settings/account/sign-out-all', { method: 'POST', body: '{}' }),
  deleteAccount: (confirmation: string) => apiFetch<{ message: string }>('/api/settings/account/delete', { method: 'POST', body: JSON.stringify({ confirmation }) }),

  // ─── Screening ─────────────────────────────────────────────
  getScreeningPrefs: () => apiFetch<ScreeningPrefs>('/api/settings/screening'),
  updateScreeningPrefs: (data: Partial<ScreeningPrefs>) => apiFetch<ScreeningPrefs>('/api/settings/screening', { method: 'PATCH', body: JSON.stringify(data) }),

  // ─── Team ──────────────────────────────────────────────────
  getTeam: () => apiFetch<TeamMember[]>('/api/settings/team'),
  inviteMember: (data: TeamInvitePayload) => apiFetch<TeamMember>('/api/settings/team/invite', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: string, data: Partial<Pick<TeamMember, 'role' | 'status'>>) => apiFetch<TeamMember>(`/api/settings/team/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeMember: (id: string) => apiFetch<{ message: string }>(`/api/settings/team/${id}`, { method: 'DELETE' }),

  // ─── Email ─────────────────────────────────────────────────
  getEmailPrefs: () => apiFetch<EmailPrefs>('/api/settings/email'),
  updateEmailPrefs: (data: Partial<EmailPrefs>) => apiFetch<EmailPrefs>('/api/settings/email', { method: 'PATCH', body: JSON.stringify(data) }),
  getEmailTemplates: () => apiFetch<EmailTemplate[]>('/api/settings/email/templates'),
  updateEmailTemplate: (data: { event_type: EmailEventType; subject: string; body: string; is_active?: boolean }) =>
    apiFetch<EmailTemplate>('/api/settings/email/templates', { method: 'PATCH', body: JSON.stringify(data) }),

  // ─── Integrations ──────────────────────────────────────────
  getIntegrations: () => apiFetch<{ integrations: IntegrationItem[] }>('/api/settings/integrations'),

  // ─── Data Retention ────────────────────────────────────────
  getRetention: () => apiFetch<DataRetentionSettings>('/api/settings/retention'),
  updateRetention: (data: Partial<DataRetentionSettings>) => apiFetch<DataRetentionSettings>('/api/settings/retention', { method: 'PATCH', body: JSON.stringify(data) }),

  // ─── Support ───────────────────────────────────────────────
  getTickets: () => apiFetch<SupportTicket[]>('/api/settings/support'),
  createTicket: (data: { category: string; subject: string; description: string }) =>
    apiFetch<SupportTicket>('/api/settings/support', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Static ────────────────────────────────────────────────
  getAbout: () => apiFetch<AboutInfo>('/api/settings/about'),
  getFAQ: () => apiFetch<FAQItem[]>('/api/settings/faq'),
  getGuides: () => apiFetch<GuideItem[]>('/api/settings/guides'),
};
