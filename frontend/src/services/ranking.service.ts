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
   * Retrieves live candidate rankings ordered strictly by AI match score percentage descending.
   * Pulls all candidates from the master candidates table joined with jobs and resumes.
   * Deduplicates identical candidate names (keeping highest score) and calculates exact rank based on percentage.
   */
  async getCandidateRanking(params: RankingParams = {}): Promise<RankingResponse> {
    const {
      page = 1,
      pageSize = 25,
      jobId = 'all',
      search = '',
      sortBy = 'score_desc',
      statusFilter = 'all'
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
      // 1. Fetch available jobs for dropdown
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title')
        .order('title', { ascending: true });

      const availableJobs: Array<{ id: string; title: string }> = (jobsData || []).map((j: any) => ({
        id: j.id,
        title: j.title
      }));

      const trimmedSearch = search.trim().toLowerCase();

      // 2. Query master candidates table joined with jobs and resumes
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
            file_name,
            file_path
          )
        `);

      if (jobId && jobId !== 'all') {
        candQuery = candQuery.eq('job_id', jobId);
      }

      if (statusFilter && statusFilter !== 'all') {
        candQuery = candQuery.eq('status', statusFilter);
      }

      const { data: candData, error: candError } = await candQuery;

      if (candError || !candData) {
        console.error('Candidate ranking fetch error:', candError);
        return defaultResponse;
      }

      // 3. Deduplicate multiple uploads of the same candidate, keeping the record with highest match_score
      const candidateMap = new Map<string, any>();
      for (const row of candData) {
        const rawName = (row.full_name || 'Candidate').trim();
        // Normalized key for deduplication: e.g. "devpaliya" or "shivanikatkamwar"
        const normKey = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const currentScore = Number(row.match_score) || 0;

        if (!candidateMap.has(normKey)) {
          candidateMap.set(normKey, row);
        } else {
          const existing = candidateMap.get(normKey);
          const existingScore = Number(existing.match_score) || 0;
          if (currentScore > existingScore) {
            candidateMap.set(normKey, row);
          }
        }
      }

      let allUniqueCandidates = Array.from(candidateMap.values());

      // 4. Apply search filter if provided
      if (trimmedSearch) {
        allUniqueCandidates = allUniqueCandidates.filter((c: any) => {
          const name = (c.full_name || '').toLowerCase();
          const role = (c.current_job_title || '').toLowerCase();
          const jobTitle = (c.jobs?.title || '').toLowerCase();
          return name.includes(trimmedSearch) || role.includes(trimmedSearch) || jobTitle.includes(trimmedSearch);
        });
      }

      // 5. Sort candidates strictly based on percentage or selected criteria
      allUniqueCandidates.sort((a: any, b: any) => {
        const scoreA = Number(a.match_score) || 0;
        const scoreB = Number(b.match_score) || 0;
        const resumeA = Number(a.resume_score) || 0;
        const resumeB = Number(b.resume_score) || 0;

        if (sortBy === 'score_asc') {
          if (scoreA !== scoreB) return scoreA - scoreB;
          return resumeA - resumeB;
        }
        if (sortBy === 'name_asc') {
          return (a.full_name || '').localeCompare(b.full_name || '');
        }
        // Default: score_desc (Highest percentage first)
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (resumeB !== resumeA) return resumeB - resumeA;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      const totalCount = allUniqueCandidates.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const startIndex = (page - 1) * pageSize;
      const pageSlice = allUniqueCandidates.slice(startIndex, startIndex + pageSize);

      // 6. Map to RankingCandidate with exact Rank number based on percentage
      const candidates: RankingCandidate[] = pageSlice.map((c: any, index: number) => {
        const rawScore = Number(c.match_score) || 0;
        const matchScore = Math.round(rawScore * 10) / 10;
        const resumeScore = Math.round((Number(c.resume_score) || matchScore) * 10) / 10;
        const isShortlisted = c.status === 'shortlisted' || matchScore >= 60;
        const status: RankingStatus = isShortlisted ? 'shortlisted' : 'rejected';

        const rawResumes = Array.isArray(c.resumes) ? c.resumes : (c.resumes ? [c.resumes] : []);
        const jobData = Array.isArray(c.jobs) ? c.jobs[0] : c.jobs;

        let cleanName = c.full_name || 'Candidate';
        // Remove trailing file extensions like .pdf
        cleanName = cleanName.replace(/\.(pdf|docx|doc)$/i, '').replace(/[_-]/g, ' ').trim();

        const initials = cleanName
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

        const rank = startIndex + index + 1;

        return {
          rank,
          id: c.id,
          candidateId: c.id,
          resumeId: rawResumes[0]?.id || c.id,
          jobId: c.job_id || jobData?.id || '',
          candidateName: cleanName,
          initials,
          role: jobData?.title || c.current_job_title || 'Software Developer',
          matchScore,
          resumeScore,
          status,
          matchBand,
          matchBandLabel,
          analyzedAt: c.created_at || new Date().toISOString()
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
