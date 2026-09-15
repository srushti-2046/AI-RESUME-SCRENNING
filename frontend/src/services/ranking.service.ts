import { supabase } from '../lib/supabase';
import type {
  RankingCandidate,
  RankingParams,
  RankingResponse,
  RankingStatus,
  RankingMatchBand
} from '../types/ranking.types';

export const RankingService = {
  /**
   * Retrieves live, read-only AI candidate rankings for the authenticated recruiter.
   * Derives rank strictly from persisted resume_job_analysis.match_score.
   */
  async getCandidateRanking(params: RankingParams = {}): Promise<RankingResponse> {
    const {
      page = 1,
      pageSize = 10,
      jobId = 'all',
      search = ''
    } = params;

    const defaultResponse: RankingResponse = {
      candidates: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      jobs: []
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return defaultResponse;
      }
      const recruiterId = user.id;

      // 1. Fetch available jobs for recruiter filter
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('recruiter_id', recruiterId)
        .order('title', { ascending: true });

      const availableJobs: Array<{ id: string; title: string }> = (jobsData || []).map((j: any) => ({
        id: j.id,
        title: j.title
      }));

      // 2. Build candidate ranking query from authoritative resume_job_analysis
      let query = supabase
        .from('resume_job_analysis')
        .select(`
          id,
          match_score,
          resume_score,
          match_band,
          screening_decision,
          created_at,
          job_id,
          resume_id,
          jobs (
            id,
            title
          ),
          resumes (
            id,
            file_name,
            candidate_id,
            candidates (
              id,
              full_name,
              resume_score,
              status
            )
          )
        `, { count: 'exact' })
        .eq('recruiter_id', recruiterId)
        .not('match_score', 'is', null);

      // Optional Job Filter
      if (jobId && jobId !== 'all') {
        query = query.eq('job_id', jobId);
      }

      // Optional Search Filter (candidate name or job title)
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        const [{ data: matchingCands }, { data: matchingJobs }] = await Promise.all([
          supabase
            .from('candidates')
            .select('id')
            .eq('recruiter_id', recruiterId)
            .ilike('full_name', `%${trimmedSearch}%`),
          supabase
            .from('jobs')
            .select('id')
            .eq('recruiter_id', recruiterId)
            .ilike('title', `%${trimmedSearch}%`)
        ]);

        const candIds = (matchingCands || []).map((c: any) => c.id);
        const jobIds = (matchingJobs || []).map((j: any) => j.id);

        let matchingResumeIds: string[] = [];
        if (candIds.length > 0) {
          const { data: matchingResumes } = await supabase
            .from('resumes')
            .select('id')
            .eq('recruiter_id', recruiterId)
            .in('candidate_id', candIds);
          matchingResumeIds = (matchingResumes || []).map((r: any) => r.id);
        }

        const orFilters: string[] = [];
        if (matchingResumeIds.length > 0) {
          orFilters.push(`resume_id.in.(${matchingResumeIds.join(',')})`);
        }
        if (jobIds.length > 0) {
          orFilters.push(`job_id.in.(${jobIds.join(',')})`);
        }

        if (orFilters.length > 0) {
          query = query.or(orFilters.join(','));
        } else {
          // No candidate or job matches search query -> return empty
          return {
            ...defaultResponse,
            jobs: availableJobs
          };
        }
      }

      // Deterministic Server-Side Sorting:
      // 1. match_score DESC
      // 2. resume_score DESC
      // 3. created_at DESC (analyzed_at)
      // 4. id ASC
      query = query
        .order('match_score', { ascending: false })
        .order('resume_score', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: true });

      // Server-side pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('RankingService.getCandidateRanking error:', error);
        return {
          ...defaultResponse,
          jobs: availableJobs
        };
      }

      const totalCount = count || 0;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      // Map rows to RankingCandidate model with secondary sort verification and global sequential ranks
      const rawRows = (data || []) as any[];

      // In-page tie-breaking: match_score DESC, resume_score DESC, created_at DESC, id ASC
      rawRows.sort((a, b) => {
        const matchDiff = Number(b.match_score) - Number(a.match_score);
        if (matchDiff !== 0) return matchDiff;

        const candA = Array.isArray(a.resumes?.candidates) ? a.resumes.candidates[0] : a.resumes?.candidates;
        const candB = Array.isArray(b.resumes?.candidates) ? b.resumes.candidates[0] : b.resumes?.candidates;
        const resumeScoreA = Number(a.resume_score ?? candA?.resume_score ?? 0);
        const resumeScoreB = Number(b.resume_score ?? candB?.resume_score ?? 0);
        const resumeScoreDiff = resumeScoreB - resumeScoreA;
        if (resumeScoreDiff !== 0) return resumeScoreDiff;

        const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (timeDiff !== 0) return timeDiff;

        return String(a.id).localeCompare(String(b.id));
      });

      const candidates: RankingCandidate[] = rawRows.map((row, index) => {
        const jobData = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
        const resumeData = Array.isArray(row.resumes) ? row.resumes[0] : row.resumes;
        const candidateData = Array.isArray(resumeData?.candidates)
          ? resumeData.candidates[0]
          : resumeData?.candidates;

        const candidateName = candidateData?.full_name || 'Candidate';
        const initials = candidateName
          .split(' ')
          .map((n: string) => n[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'CD';

        const matchScore = Math.round(Number(row.match_score) || 0);
        const resumeScore = Math.round(Number(row.resume_score ?? candidateData?.resume_score) || 0);

        // Automated Screen 4 classification rule: >= 60 -> shortlisted, < 60 -> rejected
        const status: RankingStatus = matchScore >= 60 ? 'shortlisted' : 'rejected';

        // Match Band
        let matchBand: RankingMatchBand = 'low_match';
        let matchBandLabel = 'Low Match';
        if (matchScore >= 80) {
          matchBand = 'strong_match';
          matchBandLabel = 'Strong Match';
        } else if (matchScore >= 60) {
          matchBand = 'moderate_match';
          matchBandLabel = 'Moderate Match';
        }

        // Global sequential rank across pages (e.g. Page 1: 1-10, Page 2: 11-20)
        const rank = (page - 1) * pageSize + index + 1;

        return {
          rank,
          id: row.id,
          candidateId: candidateData?.id || '',
          resumeId: row.resume_id,
          jobId: row.job_id,
          candidateName,
          initials,
          role: jobData?.title || 'Target Position',
          matchScore,
          resumeScore,
          status,
          matchBand,
          matchBandLabel,
          analyzedAt: row.created_at
        };
      });

      return {
        candidates,
        totalCount,
        page,
        pageSize,
        totalPages,
        jobs: availableJobs
      };
    } catch (err) {
      console.error('RankingService unexpected error:', err);
      return defaultResponse;
    }
  }
};
