export type RankingStatus = 'shortlisted' | 'rejected';

export type RankingMatchBand = 'strong_match' | 'moderate_match' | 'low_match';

export interface RankingCandidate {
  rank: number;
  id: string; // analysis ID
  candidateId: string;
  resumeId: string;
  jobId: string;
  candidateName: string;
  initials: string;
  role: string;
  matchScore: number;
  resumeScore: number;
  status: RankingStatus;
  matchBand: RankingMatchBand;
  matchBandLabel: string;
  analyzedAt: string;
}

export interface RankingParams {
  page?: number;
  pageSize?: number;
  jobId?: string;
  search?: string;
}

export interface RankingResponse {
  candidates: RankingCandidate[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  jobs: Array<{ id: string; title: string }>;
}
