import { supabase } from '../lib/supabase';
import type { JobRecord, ParsedJobData } from '../types/resume.types';
import { parseJobRequirements, normalizeSkill } from '../lib/aiPipeline';

export const JobService = {
  /**
   * Creates or updates a job description for the authenticated recruiter
   */
  async saveJob(params: {
    recruiterId: string;
    title?: string;
    description: string;
    skills?: string[];
    jobId?: string;
  }): Promise<{ success: boolean; job?: JobRecord; error?: string }> {
    try {
      const parsed: ParsedJobData = parseJobRequirements(params.description, params.skills);
      const title = params.title || parsed.title || 'Software Engineer';
      const requiredSkills = (params.skills && params.skills.length > 0)
        ? params.skills.map(s => normalizeSkill(s))
        : parsed.required_skills;

      const jobPayload = {
        recruiter_id: params.recruiterId,
        title,
        description: params.description,
        required_skills: requiredSkills,
        optional_skills: parsed.optional_skills || [],
        mandatory_requirements: parsed.mandatory_requirements || [],
        optional_requirements: parsed.optional_requirements || [],
        status: 'active'
      };

      let job: JobRecord;

      if (params.jobId) {
        // Update existing job
        const { data, error } = await supabase
          .from('jobs')
          .update(jobPayload)
          .eq('id', params.jobId)
          .eq('recruiter_id', params.recruiterId)
          .select('*')
          .single();

        if (error) throw error;
        job = data as JobRecord;
      } else {
        // Insert new job
        const { data, error } = await supabase
          .from('jobs')
          .insert(jobPayload)
          .select('*')
          .single();

        if (error) throw error;
        job = data as JobRecord;
      }

      // Save structured job_requirements records
      if (job.id) {
        // Clear previous requirements if updating
        await supabase.from('job_requirements').delete().eq('job_id', job.id);

        const requirements = [
          ...requiredSkills.map(s => ({
            job_id: job.id,
            recruiter_id: params.recruiterId,
            requirement_text: `Proficiency in ${s}`,
            requirement_type: 'skill' as const,
            is_mandatory: true
          })),
          ...job.mandatory_requirements.map(req => ({
            job_id: job.id,
            recruiter_id: params.recruiterId,
            requirement_text: req,
            requirement_type: 'experience' as const,
            is_mandatory: true
          }))
        ];

        if (requirements.length > 0) {
          await supabase.from('job_requirements').insert(requirements);
        }
      }

      return { success: true, job };
    } catch (err) {
      console.error('Save job error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save job' };
    }
  },

  /**
   * Fetches the recruiter's active jobs
   */
  async getRecruiterJobs(recruiterId: string): Promise<JobRecord[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('recruiter_id', recruiterId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch jobs error:', error);
      return [];
    }

    return (data || []) as JobRecord[];
  }
};
