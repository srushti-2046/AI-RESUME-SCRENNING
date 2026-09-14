import { useState, useEffect, useCallback } from 'react';
import {
  AssessmentService,
  DEFAULT_MODULES,
  DEFAULT_QUESTION_COUNTS,
  DEFAULT_ASSIGNABLE_CANDIDATES
} from '../services/assessment.service';
import type {
  AssessmentModule,
  ModuleWeight,
  ModuleDistribution,
  Assessment,
  AssessmentCandidate,
  AssessmentConfig,
  AssignmentResult
} from '../types/assessment.types';

export function useAssessment() {
  const [modules, setModules] = useState<AssessmentModule[]>(DEFAULT_MODULES);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [candidates, setCandidates] = useState<AssessmentCandidate[]>(DEFAULT_ASSIGNABLE_CANDIDATES);
  const [distribution, setDistribution] = useState<ModuleDistribution[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>(DEFAULT_QUESTION_COUNTS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshAssessments = useCallback(async () => {
    try {
      const list = await AssessmentService.getRecruiterAssessments();
      setAssessments(list);
    } catch {
      // ignore
    }
  }, []);

  // Load initial data
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [modsRes, assessmentListRes, candsRes, countsRes] = await Promise.allSettled([
          AssessmentService.getModules(),
          AssessmentService.getRecruiterAssessments(),
          AssessmentService.getAssignableCandidates(),
          AssessmentService.getQuestionCounts()
        ]);

        if (mounted) {
          const mods = modsRes.status === 'fulfilled' && modsRes.value.length > 0
            ? modsRes.value
            : DEFAULT_MODULES;
          setModules(mods);

          if (assessmentListRes.status === 'fulfilled') {
            setAssessments(assessmentListRes.value);
          }
          if (candsRes.status === 'fulfilled' && candsRes.value.length > 0) {
            setCandidates(candsRes.value);
          } else {
            setCandidates(DEFAULT_ASSIGNABLE_CANDIDATES);
          }

          const countsMap: Record<string, number> = { ...DEFAULT_QUESTION_COUNTS };
          if (countsRes.status === 'fulfilled') {
            countsRes.value.forEach(c => { countsMap[c.module_id] = c.count; });
          }
          setQuestionCounts(countsMap);
        }
      } catch (err: unknown) {
        if (mounted && err instanceof Error) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  // Calculate distribution preview
  const previewDistribution = useCallback(async (
    totalQuestions: number,
    moduleWeights: ModuleWeight[]
  ) => {
    try {
      setError(null);
      const dist = await AssessmentService.calculateDistribution(totalQuestions, moduleWeights);
      setDistribution(dist);
      return dist;
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      return [];
    }
  }, []);

  // Save draft assessment
  const saveAssessment = useCallback(async (
    assessmentId: string | null,
    config: AssessmentConfig
  ) => {
    try {
      setSaving(true);
      setError(null);
      const result = await AssessmentService.saveAssessment(
        assessmentId,
        config.title,
        config.duration_minutes,
        config.total_questions,
        config.passing_score,
        config.instructions,
        config.modules
      );
      setDistribution(result.distribution);
      setSuccessMessage('Assessment saved as draft');
      const updated = await AssessmentService.getRecruiterAssessments();
      setAssessments(updated);
      return result;
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // Publish assessment
  const publishAssessment = useCallback(async (assessmentId: string) => {
    try {
      setPublishing(true);
      setError(null);
      const result = await AssessmentService.publishAssessment(assessmentId);
      setSuccessMessage(`Assessment published! Share link generated.`);
      const updated = await AssessmentService.getRecruiterAssessments();
      setAssessments(updated);
      return result;
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      throw err;
    } finally {
      setPublishing(false);
    }
  }, []);

  // Assign to candidate
  const assignCandidate = useCallback(async (
    assessmentId: string,
    candidateId: string
  ): Promise<AssignmentResult> => {
    try {
      setAssigning(true);
      setError(null);
      const result = await AssessmentService.assignToCandidate(assessmentId, candidateId);
      setSuccessMessage('Candidate assigned successfully');
      const updated = await AssessmentService.getRecruiterAssessments();
      setAssessments(updated);
      return result;
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      throw err;
    } finally {
      setAssigning(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return {
    modules,
    assessments,
    candidates,
    distribution,
    questionCounts,
    loading,
    saving,
    publishing,
    assigning,
    error,
    successMessage,
    previewDistribution,
    saveAssessment,
    publishAssessment,
    assignCandidate,
    refreshAssessments,
    clearMessages
  };
}
