import { supabase } from '../lib/supabase';

const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_SETTINGS_API_URL || 'http://localhost:8000';

export interface RecruitingOverview {
  total_screened: number;
  shortlisted: number;
  rejected: number;
  resumes_uploaded: number;
  jobs_created: number;
}

export interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
  phone?: string | null;
  company?: string | null;
  department?: string | null;
  timezone?: string | null;
  bio?: string | null;
  account_status: string;
  security_status: string;
  created_at?: string;
  updated_at?: string;
  recruiting_overview: RecruitingOverview;
}

export interface ProfileUpdateRequest {
  full_name?: string;
  phone?: string;
  company?: string;
  department?: string;
  timezone?: string;
  bio?: string;
  avatar_url?: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export class ProfileService {
  static async getProfile(): Promise<ProfileData> {
    const headers = await getAuthHeader();
    if (!headers.Authorization) {
      throw new Error('Unauthenticated: Please sign in to access your profile.');
    }

    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to fetch profile: HTTP ${response.status}`);
    }

    return response.json();
  }

  static async updateProfile(update: ProfileUpdateRequest): Promise<ProfileData> {
    const headers = await getAuthHeader();
    if (!headers.Authorization) {
      throw new Error('Unauthenticated: Please sign in to update your profile.');
    }

    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to update profile: HTTP ${response.status}`);
    }

    return response.json();
  }

  static async uploadAvatar(file: File): Promise<string> {
    const headers = await getAuthHeader();
    if (!headers.Authorization) {
      throw new Error('Unauthenticated: Please sign in to upload avatar.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: 'POST',
      headers: {
        ...headers,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to upload avatar: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.avatar_url;
  }

  static async deleteAvatar(): Promise<void> {
    const headers = await getAuthHeader();
    if (!headers.Authorization) {
      throw new Error('Unauthenticated: Please sign in to remove avatar.');
    }

    const response = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to remove avatar: HTTP ${response.status}`);
    }
  }
}
