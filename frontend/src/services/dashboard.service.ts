import { supabase } from '../lib/supabase';
import type { DashboardOverview, UserProfile } from '../types/dashboard.types';

export const DashboardService = {
  /**
   * Fetch complete dashboard overview aggregated from Supabase via server-side RPC.
   * Isolates data to the authenticated recruiter via auth.uid() and Row Level Security.
   */
  async getOverview(): Promise<DashboardOverview | null> {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_overview');
      if (error) {
        console.error('Error executing get_dashboard_overview RPC:', error);
        return null;
      }
      return data as DashboardOverview;
    } catch (err) {
      console.error('DashboardService.getOverview exception:', err);
      return null;
    }
  },

  /**
   * Optional development helper: seeds sample hiring records exclusively for the authenticated recruiter.
   */
  async seedDemoData(): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc('seed_recruiter_demo_data');
      if (error) {
        console.error('Error executing seed_recruiter_demo_data:', error);
        return { success: false, message: error.message };
      }
      return data as { success: boolean; message: string };
    } catch (err: any) {
      console.error('DashboardService.seedDemoData exception:', err);
      return { success: false, message: err.message || 'Failed to seed demo data' };
    }
  },

  /**
   * Fetch the currently authenticated user's profile from public.profiles
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .eq('id', userId)
        .single();
      if (error) {
        console.warn('Profile fetch note:', error.message);
        return null;
      }
      return data as UserProfile;
    } catch (err) {
      console.error('DashboardService.getProfile exception:', err);
      return null;
    }
  },

  /**
   * Sign out the active recruiter session
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error during signOut:', error);
      throw error;
    }
  }
};
