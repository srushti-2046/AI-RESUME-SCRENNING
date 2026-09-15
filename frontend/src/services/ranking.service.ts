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
   * Retrieves live AI candidate rankings for all uploaded resumes across the platform.
   * Derives rank deterministically by match_score DESC, resume_score DESC, and created_at DESC.
   */
  async getCandidateRanking(params: RankingParams = {}): Promise<RankingResponse> {
    const {
      page = 1,
      pageSize = 25,
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
      // 1. Fetch available jobs across the platform for filtering
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title')
        .order('title', { ascending: true });

      const availableJobs: Array<{ id: string; title: string }> = (jobsData || []).map((j: any) => ({
        id: j.id,
        title: j.title
      }));

      const trimmedSearch = search.trim();

      // 2. Primary Query: resume_job_analysis joined with jobs, resumes, candidates
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
              status,
              current_job_title
            )
          )
        `, { count: 'exact' })
        .not('match_score', 'is', null);

      if (jobId && jobId !== 'all') {
        query = query.eq('job_id', jobId);
      }

      query = query
        .order('match_score', { ascending: false })
        .order('resume_score', { ascending: false })
        .order('created_at', { ascending: false });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      // 3. If resume_job_analysis has records, map and return them
      if (!error && data && data.length > 0) {
        const rawRows = [...data];

        // In-page tie-breaking
        rawRows.sort((a: any, b: any) => {
          const matchDiff = Number(b.match_score) - Number(a.match_score);
          if (matchDiff !== 0) return matchDiff;

          const resA = Array.isArray(a.resumes) ? a.resumes[0] : a.resumes;
          const resB = Array.isArray(b.resumes) ? b.resumes[0] : b.resumes;
          const candA = Array.isArray(resA?.candidates) ? resA.candidates[0] : resA?.candidates;
          const candB = Array.isArray(resB?.candidates) ? resB.candidates[0] : resB?.candidates;
          const resumeScoreA = Number(a.resume_score ?? candA?.resume_score ?? 0);
          const resumeScoreB = Number(b.resume_score ?? candB?.resume_score ?? 0);
          return resumeScoreB - resumeScoreA;
        });

        // Apply client search filtering if provided
        let filteredRows = rawRows;
        if (trimmedSearch) {
          const lower = trimmedSearch.toLowerCase();
          filteredRows = rawRows.filter((r: any) => {
            const resumeData = Array.isArray(r.resumes) ? r.resumes[0] : r.resumes;
            const cand = Array.isArray(resumeData?.candidates) ? resumeData.candidates[0] : resumeData?.candidates;
            const jobData = Array.isArray(r.jobs) ? r.jobs[0] : r.jobs;
            return (
              cand?.full_name?.toLowerCase().includes(lower) ||
              cand?.current_job_title?.toLowerCase().includes(lower) ||
              jobData?.title?.toLowerCase().includes(lower) ||
              resumeData?.file_name?.toLowerCase().includes(lower)
            );
          });
        }

        const candidates: RankingCandidate[] = filteredRows.map((row: any, index: number) => {
          const jobData = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
          const resumeData = Array.isArray(row.resumes) ? row.resumes[0] : row.resumes;
          const candidateData = Array.isArray(resumeData?.candidates)
            ? resumeData.candidates[0]
            : resumeData?.candidates;

          const candidateName = candidateData?.full_name || resumeData?.file_name?.replace(/\.[^/.]+$/, '') || 'Candidate';
          const initials = candidateName
            .split(' ')
            .map((n: string) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'CD';

          const matchScore = Math.round(Number(row.match_score) || 0);
          const resumeScore = Math.round(Number(row.resume_score ?? candidateData?.resume_score) || matchScore);
          const status: RankingStatus = (matchScore >= 60 || candidateData?.status === 'shortlisted') ? 'shortlisted' : 'rejected';

          let matchBand: RankingMatchBand = 'low_match';
          let matchBandLabel = 'Low Match';
          if (matchScore >= 80) {
            matchBand = 'strong_match';
            matchBandLabel = 'Strong Match';
          } else if (matchScore >= 60) {
            matchBand = 'moderate_match';
            matchBandLabel = 'Moderate Match';
          }

          const rank = (page - 1) * pageSize + index + 1;

          return {
            rank,
            id: row.id,
            candidateId: candidateData?.id || '',
            resumeId: row.resume_id || resumeData?.id || '',
            jobId: row.job_id || jobData?.id || '',
            candidateName,
            initials,
            role: jobData?.title || candidateData?.current_job_title || 'Software Developer',
            matchScore,
            resumeScore,
            status,
            matchBand,
            matchBandLabel,
            analyzedAt: row.created_at
          };
        });

        const totalCount = count || candidates.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

        return {
          candidates,
          totalCount,
          page,
          pageSize,
          totalPages,
          jobs: availableJobs
        };
      }

      // 4. Fallback Safeguard: query candidates directly joined with resumes & jobs
      let candQuery = supabase
        .from('candidates')
        .select(`
          id,
          full_name,
          current_job_title,
          match_score,
          resume_score,
          status,
          created_at,
          job_id,
          jobs (
            id,
            title
          ),
          resumes (
            id,
            file_name
          )
        `, { count: 'exact' });

      if (jobId && jobId !== 'all') {
        candQuery = candQuery.eq('job_id', jobId);
      }

      if (trimmedSearch) {
        candQuery = candQuery.or(`full_name.ilike.%${trimmedSearch}%,current_job_title.ilike.%${trimmedSearch}%`);
      }

      candQuery = candQuery
        .order('match_score', { ascending: false })
        .order('resume_score', { ascending: false })
        .range(from, to);

      const { data: candData, count: candCount } = await candQuery;

      const fallbackCandidates: RankingCandidate[] = (candData || []).map((c: any, index: number) => {
        const matchScore = Math.round(Number(c.match_score) || 0);
        const resumeScore = Math.round(Number(c.resume_score) || matchScore);
        const status: RankingStatus = (c.status === 'shortlisted' || matchScore >= 60) ? 'shortlisted' : 'rejected';
        const rawResumes = Array.isArray(c.resumes) ? c.resumes : (c.resumes ? [c.resumes] : []);
        const jobData = Array.isArray(c.jobs) ? c.jobs[0] : c.jobs;

        const candidateName = c.full_name || 'Candidate';
        const initials = candidateName
          .split(' ')
          .map((n: string) => n[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'CD';

        let matchBand: RankingMatchBand = 'low_match';
        let matchBandLabel = 'Low Match';
        if (matchScore >= 80) {
          matchBand = 'strong_match';
          matchBandLabel = 'Strong Match';
        } else if (matchScore >= 60) {
          matchBand = 'moderate_match';
          matchBandLabel = 'Moderate Match';
        }

        return {
          rank: (page - 1) * pageSize + index + 1,
          id: c.id,
          candidateId: c.id,
          resumeId: rawResumes[0]?.id || c.id,
          jobId: c.job_id || jobData?.id || '',
          candidateName,
          initials,
          role: jobData?.title || c.current_job_title || 'Software Developer',
          matchScore,
          resumeScore,
          status,
          matchBand,
          matchBandLabel,
          analyzedAt: c.created_at
        };
      });

      const totalCount = candCount || fallbackCandidates.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      return {
        candidates: fallbackCandidates,
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
