import { supabase } from '../lib/supabase';
import type { CompanyJobRecord, ResumeCompanyMatch, ParsedResumeData } from '../types/resume.types';
import { calculateCompanyFit } from '../lib/aiPipeline';

export class CompanyFitService {
  /**
   * Fetch all benchmark company jobs along with their company metadata and weighted criteria
   */
  static async getBenchmarkJobs(): Promise<CompanyJobRecord[]> {
    try {
      const { data, error } = await supabase
        .from('company_jobs')
        .select(`
          id,
          company_id,
          job_title,
          department,
          description,
          experience_min,
          experience_max,
          education_requirements,
          is_benchmark,
          company:companies (
            id,
            name,
            website,
            industry,
            location,
            is_benchmark,
            metadata
          ),
          criteria:company_job_criteria (
            id,
            company_job_id,
            criterion_type,
            criterion_name,
            criterion_value,
            is_required,
            weight
          )
        `);

      if (error) {
        console.error('Error fetching benchmark jobs:', error);
        return [];
      }

      return (data || []) as unknown as CompanyJobRecord[];
    } catch (err) {
      console.error('Unexpected error fetching benchmark jobs:', err);
      return [];
    }
  }

  /**
   * Calculate and save company fit benchmarks for a resume (runs decoupled/asynchronously)
   */
  static async evaluateAndSaveCompanyFits(
    resumeId: string,
    recruiterId: string,
    parsedResume: ParsedResumeData
  ): Promise<ResumeCompanyMatch[]> {
    try {
      const benchmarkJobs = await this.getBenchmarkJobs();
      if (!benchmarkJobs || benchmarkJobs.length === 0) return [];

      const matchesToUpsert: any[] = [];
      const computedMatches: ResumeCompanyMatch[] = [];

      for (const bJob of benchmarkJobs) {
        const fitResult = calculateCompanyFit(parsedResume, {
          job_title: bJob.job_title,
          company_name: bJob.company?.name || 'Company',
          criteria: bJob.criteria || []
        });

        const matchRow = {
          resume_id: resumeId,
          company_job_id: bJob.id,
          recruiter_id: recruiterId,
          fit_score: fitResult.fit_score,
          matching_skills: fitResult.matching_skills,
          missing_skills: fitResult.missing_skills,
          matched_requirements: fitResult.matched_requirements,
          missing_requirements: fitResult.missing_requirements,
          explanation: fitResult.explanation,
          updated_at: new Date().toISOString()
        };

        matchesToUpsert.push(matchRow);
        computedMatches.push({
          ...matchRow,
          company_name: bJob.company?.name || 'Company',
          job_title: bJob.job_title,
          industry: bJob.company?.industry || 'Technology'
        });
      }

      // Upsert into Supabase
      const { error } = await supabase
        .from('resume_company_matches')
        .upsert(matchesToUpsert, { onConflict: 'resume_id,company_job_id,recruiter_id' });

      if (error) {
        console.error('Error upserting resume_company_matches:', error);
      }

      return computedMatches.sort((a, b) => b.fit_score - a.fit_score);
    } catch (err) {
      console.error('Unexpected error calculating company fits:', err);
      return [];
    }
  }

  /**
   * Fetch existing company fit matches for a resume, with optional search filtering
   */
  static async getCompanyFitsForResume(
    resumeId: string,
    recruiterId: string,
    searchQuery: string = ''
  ): Promise<ResumeCompanyMatch[]> {
    try {
      const { data, error } = await supabase
        .from('resume_company_matches')
        .select(`
          id,
          resume_id,
          company_job_id,
          recruiter_id,
          fit_score,
          matching_skills,
          missing_skills,
          matched_requirements,
          missing_requirements,
          explanation,
          company_job:company_jobs (
            job_title,
            company:companies (
              name,
              industry
            )
          )
        `)
        .eq('resume_id', resumeId)
        .eq('recruiter_id', recruiterId)
        .order('fit_score', { ascending: false });

      if (error) {
        console.error('Error fetching company fits for resume:', error);
        return [];
      }

      const formatted: ResumeCompanyMatch[] = (data || []).map((row: any) => ({
        id: row.id,
        resume_id: row.resume_id,
        company_job_id: row.company_job_id,
        recruiter_id: row.recruiter_id,
        fit_score: row.fit_score,
        matching_skills: row.matching_skills || [],
        missing_skills: row.missing_skills || [],
        matched_requirements: row.matched_requirements || [],
        missing_requirements: row.missing_requirements || [],
        explanation: row.explanation,
        company_name: row.company_job?.company?.name || 'Benchmark Partner',
        job_title: row.company_job?.job_title || 'Role',
        industry: row.company_job?.company?.industry || 'Technology'
      }));

      if (!searchQuery.trim()) {
        return formatted;
      }

      const q = searchQuery.toLowerCase().trim();
      return formatted.filter(item =>
        item.company_name?.toLowerCase().includes(q) ||
        item.job_title?.toLowerCase().includes(q) ||
        item.industry?.toLowerCase().includes(q)
      );
    } catch (err) {
      console.error('Unexpected error in getCompanyFitsForResume:', err);
      return [];
    }
  }
}
