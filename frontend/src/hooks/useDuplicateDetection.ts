import { useState, useEffect, useCallback } from 'react';
import { DuplicateDetectionService } from '../services/duplicateDetection.service';
import type { DuplicateOverviewResponse } from '../types/duplicateDetection.types';
import { supabase } from '../lib/supabase';

export function useDuplicateDetection() {
  const [overview, setOverview] = useState<DuplicateOverviewResponse>({
    scannedCount: 0,
    duplicatePairCount: 0,
    duplicateResumeCount: 0,
    uniqueResumeCount: 0,
    pairs: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await DuplicateDetectionService.getOverview();
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to load duplicate detection data:', err);
      setError(err?.message || 'Failed to load duplicate resume data');
    } finally {
      setLoading(false);
    }
  }, []);

  const runScan = useCallback(async () => {
    try {
      setScanning(true);
      setError(null);
      await DuplicateDetectionService.runDetection();
      // Re-fetch fresh overview after running authoritative scan
      const freshData = await DuplicateDetectionService.getOverview();
      setOverview(freshData);
      return freshData;
    } catch (err: any) {
      console.error('Failed to run duplicate scan:', err);
      setError(err?.message || 'Failed to complete duplicate scan');
      throw err;
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchOverview();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchOverview]);

  return {
    overview,
    loading,
    scanning,
    error,
    refresh: fetchOverview,
    runScan,
  };
}
