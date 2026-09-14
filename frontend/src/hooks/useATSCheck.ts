import { useState, useEffect, useCallback } from 'react';
import { ATSService } from '../services/ats.service';
import type {
  ATSReport,
  ATSCheckResult,
  ATSCandidate,
  ATSEligibleCandidate,
  ATSFullReportResponse
} from '../types/ats.types';

export function useATSCheck(initialResumeId?: string | null, initialJobId?: string | null) {
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(initialResumeId || null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId || null);
  
  const [report, setReport] = useState<ATSReport | null>(null);
  const [candidate, setCandidate] = useState<ATSCandidate | null>(null);
  const [checks, setChecks] = useState<ATSCheckResult[]>([]);
  const [eligibleCandidates, setEligibleCandidates] = useState<ATSEligibleCandidate[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch eligible analyzed candidates on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCandidates() {
      try {
        const candidates = await ATSService.getEligibleCandidatesForATS();
        if (isMounted) {
          setEligibleCandidates(candidates);
          // If no resumeId specified yet, pick the first analyzed candidate
          if (!selectedResumeId && candidates.length > 0) {
            setSelectedResumeId(candidates[0].resumeId);
            setSelectedJobId(candidates[0].jobId || null);
          }
        }
      } catch (err: any) {
        console.error('Failed to load eligible candidates:', err);
      }
    }
    loadCandidates();
    return () => { isMounted = false; };
  }, []);

  // 2. Fetch or load ATS report whenever selectedResumeId or selectedJobId changes
  const loadReport = useCallback(async (resumeId: string, jobId?: string | null, forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      let data: ATSFullReportResponse;
      if (forceRefresh) {
        setAnalyzing(true);
        data = await ATSService.runATSCheck(resumeId, jobId);
      } else {
        data = await ATSService.getATSReport(resumeId, jobId);
      }

      setReport(data.report);
      setCandidate(data.candidate || null);
      setChecks(data.checks || []);
    } catch (err: any) {
      console.error('useATSCheck loadReport error:', err);
      setError(err.message || 'ATS analysis could not be completed. Please retry.');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedResumeId) {
      loadReport(selectedResumeId, selectedJobId);
    } else {
      setLoading(false);
    }
  }, [selectedResumeId, selectedJobId, loadReport]);

  // Handler to switch candidates from dropdown
  const selectCandidate = useCallback((resumeId: string, jobId?: string | null) => {
    setSelectedResumeId(resumeId);
    setSelectedJobId(jobId || null);
  }, []);

  // Re-run analysis explicitly
  const runAnalysis = useCallback(async () => {
    if (!selectedResumeId) return;
    await loadReport(selectedResumeId, selectedJobId, true);
  }, [selectedResumeId, selectedJobId, loadReport]);

  const refresh = useCallback(async () => {
    if (!selectedResumeId) return;
    await loadReport(selectedResumeId, selectedJobId, false);
  }, [selectedResumeId, selectedJobId, loadReport]);

  const exportReport = useCallback(() => {
    if (!report) return;
    ATSService.exportReportAsJson({
      report,
      candidate,
      checks
    });
  }, [report, candidate, checks]);

  return {
    selectedResumeId,
    selectedJobId,
    report,
    candidate,
    checks,
    eligibleCandidates,
    loading,
    analyzing,
    error,
    selectCandidate,
    runAnalysis,
    refresh,
    exportReport
  };
}
