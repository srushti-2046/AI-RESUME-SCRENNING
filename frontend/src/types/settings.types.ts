// settings.types.ts — All TypeScript types for the Settings module

export type SettingsSection =
  | 'profile' | 'notifications' | 'privacy' | 'account'
  | 'help' | 'faq' | 'support' | 'guides' | 'about';

// ─── Profile ────────────────────────────────────────────────
export interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
  company?: string | null;
  department?: string | null;
  phone?: string | null;
  timezone?: string | null;
  bio?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProfileUpdatePayload {
  full_name: string;
  phone?: string;
  company?: string;
  department?: string;
  timezone?: string;
  bio?: string;
}

// ─── Notifications ───────────────────────────────────────────
export interface NotificationPrefs {
  email_notifications: boolean;
  new_resume_alert: boolean;
  analysis_completed_alert: boolean;
  duplicate_resume_alert: boolean;
  assessment_assigned_alert: boolean;
  assessment_completed_alert: boolean;
  shortlisted_alert: boolean;
  rejection_alert: boolean;
  weekly_summary: boolean;
  system_security_alerts: boolean;
  in_app_notifications: boolean;
  reminder_enabled: boolean;
  reminder_hours_before: number;
  reminder_frequency: 'once' | 'daily' | 'weekly';
}

// ─── Privacy ────────────────────────────────────────────────
export interface PrivacySettings {
  profile_visibility: 'private' | 'recruiters_only' | 'public';
  resume_visibility: 'private' | 'recruiters_only';
  analytics_enabled: boolean;
  personalization_enabled: boolean;
  activity_tracking_enabled: boolean;
}

// ─── Account ────────────────────────────────────────────────
export interface AccountInfo {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

// ─── Screening ───────────────────────────────────────────────
export interface ScreeningPrefs {
  minimum_resume_score: number;
  minimum_match_score: number;
  minimum_experience_years: number;
  required_education: string;
  mandatory_skills: string[];
  optional_skills: string[];
  minimum_ats_score: number;
  note: string;
}

// ─── Team ────────────────────────────────────────────────────
export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'recruiter' | 'hiring_manager' | 'viewer';
  status: 'invited' | 'active' | 'inactive' | 'removed';
  invited_at: string | null;
  joined_at: string | null;
}

export interface TeamInvitePayload {
  email: string;
  full_name?: string;
  role: TeamMember['role'];
}

// ─── Email ───────────────────────────────────────────────────
export interface EmailPrefs {
  application_received: boolean;
  analysis_completed: boolean;
  assessment_invitation: boolean;
  assessment_reminder: boolean;
  assessment_completed: boolean;
  shortlisted_notification: boolean;
  rejection_notification: boolean;
  new_resume: boolean;
}

export type EmailEventType =
  | 'application_received' | 'new_resume' | 'analysis_completed'
  | 'shortlisted' | 'rejected' | 'assessment_assigned' | 'assessment_completed';

export interface EmailTemplate {
  id?: string;
  event_type: EmailEventType;
  subject: string;
  body: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Integrations ────────────────────────────────────────────
export interface IntegrationItem {
  name: string;
  status: 'connected' | 'configured' | 'not_connected' | 'not_configured';
  description: string;
  category?: string;
}

// ─── Data Retention ──────────────────────────────────────────
export interface DataRetentionSettings {
  resume_retention_days: number;
  candidate_retention_days: number;
  assessment_retention_days: number;
  auto_delete_enabled: boolean;
  note: string;
}

// ─── Support ─────────────────────────────────────────────────
export type TicketCategory =
  | 'resume_upload' | 'analysis' | 'ranking' | 'ats' | 'duplicate'
  | 'assessment' | 'account_security' | 'notifications' | 'billing' | 'other';

export interface SupportTicket {
  id: string;
  user_id?: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}

// ─── FAQ / Guides ────────────────────────────────────────────
export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface GuideItem {
  title: string;
  description: string;
  steps: string[];
}

export interface AboutInfo {
  app_name: string;
  version: string;
  environment: string;
  description: string;
  copyright: string;
}
