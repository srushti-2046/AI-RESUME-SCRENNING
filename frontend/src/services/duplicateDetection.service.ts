import { supabase } from '../lib/supabase';
import type {
  DuplicateOverviewResponse,
  DuplicateComparisonResponse,
  DuplicateCategoryResume,
} from '../types/duplicateDetection.types';

export const DuplicateDetectionService = {
  /**
   * Fetches duplicate detection overview:
   * scannedCount, duplicatePairCount, duplicateResumeCount, uniqueResumeCount, and duplicate pairs.
   */
  async getOverview(): Promise<DuplicateOverviewResponse> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        scannedCount: 0,
        duplicatePairCount: 0,
        duplicateResumeCount: 0,
        uniqueResumeCount: 0,
        pairs: [],
      };
    }

    const { data, error } = await supabase.rpc('get_duplicate_resume_overview');

    if (error) {
      console.error('Error fetching duplicate resume overview:', error);
      throw new Error(error.message || 'Failed to fetch duplicate resume overview');
    }

    return {
      scannedCount: data?.scannedCount ?? 0,
      duplicatePairCount: data?.duplicatePairCount ?? 0,
      duplicateResumeCount: data?.duplicateResumeCount ?? 0,
      uniqueResumeCount: data?.uniqueResumeCount ?? 0,
      pairs: Array.isArray(data?.pairs) ? data.pairs : [],
    };
  },

  /**
   * Authoritatively triggers duplicate detection scan across all analyzed resumes.
   */
  async runDetection(): Promise<{
    scannedCount: number;
    duplicatePairCount: number;
    duplicateResumeCount: number;
    uniqueResumeCount: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required to run duplicate detection');
    }

    const { data, error } = await supabase.rpc('run_duplicate_detection');

    if (error) {
      console.error('Error running duplicate detection:', error);
      throw new Error(error.message || 'Failed to execute duplicate detection');
    }

    return {
      scannedCount: data?.scannedCount ?? 0,
      duplicatePairCount: data?.duplicatePairCount ?? 0,
      duplicateResumeCount: data?.duplicateResumeCount ?? 0,
      uniqueResumeCount: data?.uniqueResumeCount ?? 0,
    };
  },

  /**
   * Fetches detailed side-by-side comparison for an authorized duplicate pair (>80% similarity).
   */
  async getComparison(resumeIdA: string, resumeIdB: string): Promise<DuplicateComparisonResponse> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required to compare resumes');
    }

    const { data, error } = await supabase.rpc('get_duplicate_resume_comparison', {
      p_resume_id_a: resumeIdA,
      p_resume_id_b: resumeIdB,
    });

    if (error) {
      console.error('Error fetching resume comparison:', error);
      throw new Error(error.message || 'Failed to fetch comparison');
    }

    return data as DuplicateComparisonResponse;
  },

  /**
   * Fetches category resumes (scanned, duplicate, or unique) for the "View All" modals.
   */
  async getCategoryResumes(category: 'scanned' | 'duplicate' | 'unique'): Promise<DuplicateCategoryResume[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    const { data, error } = await supabase.rpc('get_duplicate_category_resumes', {
      p_category: category,
    });

    if (error) {
      console.error(`Error fetching ${category} resumes:`, error);
      throw new Error(error.message || `Failed to fetch ${category} resumes`);
    }

    return Array.isArray(data) ? data : [];
  },
};
