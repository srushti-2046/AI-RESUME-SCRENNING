import { supabase } from '../lib/supabase';
import type {
  ATSFullReportResponse,
  ATSEligibleCandidate,
  ATSReport,
  ATSCheckResult,
  ATSCandidate,
  ATSExportData
} from '../types/ats.types';

export const ATSService = {
  /**
   * Fetches an existing ATS report if present and matching 'ats_v1'.
   * If not found or outdated, invokes the authoritative server-side analysis.
   */
  async getATSReport(resumeId: string, jobId?: string | null): Promise<ATSFullReportResponse> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required to view ATS report.');
    }

    // Step 1: Check existing cached report with version 'ats_v1'
    let query = supabase
      .from('ats_reports')
      .select(`
        id,
        resume_id,
        job_id,
        candidate_id,
        ats_score,
        ats_status,
        passed_count,
        warning_count,
        failed_count,
        overall_summary,
        recommendations,
        analysis_version,
        created_at,
        updated_at
      `)
      .eq('resume_id', resumeId)
      .eq('recruiter_id', user.id)
      .eq('analysis_version', 'ats_v1');

    if (jobId) {
      query = query.eq('job_id', jobId);
    } else {
      query = query.is('job_id', null);
    }

    const { data: existingReport, error: reportErr } = await query.maybeSingle();

    if (!reportErr && existingReport) {
      // Fetch check results
      const { data: checks, error: checksErr } = await supabase
        .from('ats_check_results')
        .select(`
          id,
          check_type,
          title,
          status,
          score,
          max_score,
          description,
          details,
          sort_order
        `)
        .eq('ats_report_id', existingReport.id)
        .order('sort_order', { ascending: true });

      if (!checksErr && checks && checks.length > 0) {
        // Fetch candidate
        let candidate: ATSCandidate | null = null;
        if (existingReport.candidate_id) {
          const { data: cand } = await supabase
            .from('candidates')
            .select('id, full_name, email, current_job_title, match_score, resume_score, status')
            .eq('id', existingReport.candidate_id)
            .maybeSingle();

          if (cand) {
            candidate = {
              id: cand.id,
              name: cand.full_name,
              email: cand.email,
              role: cand.current_job_title,
              matchScore: cand.match_score,
              resumeScore: cand.resume_score,
              status: cand.status
            };
          }
        }

        const report: ATSReport = {
          id: existingReport.id,
          resumeId: existingReport.resume_id,
          jobId: existingReport.job_id,
          candidateId: existingReport.candidate_id,
          atsScore: existingReport.ats_score,
          atsStatus: existingReport.ats_status,
          passedCount: existingReport.passed_count,
          warningCount: existingReport.warning_count,
          failedCount: existingReport.failed_count,
          overallSummary: existingReport.overall_summary,
          recommendations: existingReport.recommendations || [],
          analysisVersion: existingReport.analysis_version,
          createdAt: existingReport.created_at,
          updatedAt: existingReport.updated_at
        };

        const checkResults: ATSCheckResult[] = checks.map(c => ({
          id: c.id,
          checkType: c.check_type,
          title: c.title,
          status: c.status,
          score: c.score,
          maxScore: c.max_score,
          description: c.description,
          details: c.details,
          sortOrder: c.sort_order
        }));

        return {
          report,
          candidate,
          checks: checkResults
        };
      }
    }

    // Step 2: If no report exists or version outdated, run server-side analysis
    return this.runATSCheck(resumeId, jobId);
  },

  /**
   * Invokes authoritative server-side ATS check via Edge Function with RPC fallback.
   */
  async runATSCheck(resumeId: string, jobId?: string | null): Promise<ATSFullReportResponse> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required to run ATS check.');
    }

    // Attempt 1: Call Supabase Edge Function 'ats-check'
    try {
      const { data, error } = await supabase.functions.invoke('ats-check', {
        body: { resumeId, jobId: jobId || null, force: true }
      });

      if (!error && data && data.report && data.checks) {
        return data as ATSFullReportResponse;
      }
      if (error) {
        console.warn('Edge Function ats-check invoke notice, falling back to secure RPC:', error);
      }
    } catch (edgeErr) {
      console.warn('Edge Function ats-check not reachable, falling back to secure RPC:', edgeErr);
    }

    // Attempt 2: Call PostgreSQL SECURITY DEFINER RPC 'run_ats_check'
    const { data: rpcData, error: rpcError } = await supabase.rpc('run_ats_check', {
      p_resume_id: resumeId,
      p_job_id: jobId || null
    });

    if (rpcError) {
      console.error('run_ats_check RPC execution failed:', rpcError);
      throw new Error(rpcError.message || 'ATS analysis could not be completed.');
    }

    if (!rpcData || !rpcData.report) {
      throw new Error('ATS analysis returned invalid response data.');
    }

    return rpcData as ATSFullReportResponse;
  },

  /**
   * Retrieves list of eligible candidates who have resumes with processing_status = 'analyzed'.
   * Excludes 'uploaded', 'processing', and 'failed'.
   */
  async getEligibleCandidatesForATS(): Promise<ATSEligibleCandidate[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('resumes')
      .select(`
        id,
        file_name,
        uploaded_at,
        processing_status,
        candidates (
          id,
          full_name,
          email,
          current_job_title,
          status,
          match_score,
          job_id,
          jobs (
            id,
            title
          )
        )
      `)
      .eq('recruiter_id', user.id)
      .eq('processing_status', 'analyzed')
      .order('uploaded_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching eligible candidates for ATS:', error);
      return [];
    }

    return data
      .filter(r => r.candidates)
      .map(r => {
        const c: any = r.candidates;
        return {
          candidateId: c.id,
          resumeId: r.id,
          name: c.full_name || 'Unnamed Candidate',
          email: c.email || '',
          role: c.current_job_title || 'Candidate',
          jobId: c.job_id || null,
          jobTitle: c.jobs?.title || 'General Screening',
          fileName: r.file_name,
          uploadedAt: r.uploaded_at,
          matchScore: c.match_score ?? 0,
          status: c.status
        };
      });
  },

  /**
   * Exports ATS report data as a structured JSON file download
   */
  exportReportAsJson(fullReport: ATSFullReportResponse): void {
    const { report, candidate, checks } = fullReport;
    const exportData: ATSExportData = {
      title: 'ATS Compatibility Evaluation Report',
      exportDate: new Date().toISOString(),
      candidate: {
        name: candidate?.name || 'Candidate',
        email: candidate?.email || '',
        targetRole: candidate?.role || ''
      },
      atsSummary: {
        score: report.atsScore,
        status: report.atsStatus,
        passed: report.passedCount,
        warnings: report.warningCount,
        failed: report.failedCount
      },
      checks: checks.map(c => ({
        title: c.title,
        status: c.status.toUpperCase(),
        score: `${c.score} / ${c.maxScore}`,
        description: c.description
      })),
      recommendations: report.recommendations
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ATS_Report_${(candidate?.name || 'Resume').replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
};
