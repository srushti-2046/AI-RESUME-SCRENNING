import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DashboardService } from '../services/dashboard.service';
import type { DashboardOverview, UserProfile } from '../types/dashboard.types';

export function useDashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check current auth session
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;

      if (!currentUser) {
        setIsAuthenticated(false);
        setUser(null);
        // In unauthenticated mode, fetch overview from RPC (returns zeros / unauthenticated: true)
        const overview = await DashboardService.getOverview();
        setData(overview);
        return;
      }

      setIsAuthenticated(true);

      // Fetch profile
      const profile = await DashboardService.getProfile(currentUser.id);
      const userProfile: UserProfile = profile || {
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Recruiter',
        role: 'recruiter',
      };
      setUser(userProfile);

      // Fetch full aggregated dashboard data from RPC
      const overview = await DashboardService.getOverview();
      if (overview) {
        // If RPC didn't populate user profile, inject it
        if (!overview.user) {
          overview.user = userProfile;
        }
        setData(overview);
      }
    } catch (err: any) {
      console.error('Error in useDashboard:', err);
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const seedData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await DashboardService.seedDemoData();
      await fetchDashboardData();
      return result.success;
    } catch (err: any) {
      console.error('Error seeding demo data:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchDashboardData]);

  const signOut = useCallback(async () => {
    await DashboardService.signOut();
    setIsAuthenticated(false);
    setUser(null);
    await fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();

    // Listen to real-time auth changes (Sign In / Sign Out / Token Refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchDashboardData();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchDashboardData]);

  return {
    data,
    loading,
    error,
    isAuthenticated,
    user,
    refresh: fetchDashboardData,
    seedData,
    signOut,
  };
}
