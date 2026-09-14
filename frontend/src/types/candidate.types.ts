export type CandidateStatus = 'shortlisted' | 'rejected';
export type CandidateFilterTab = 'all' | 'shortlisted' | 'rejected';

export interface CandidateListItem {
  id: string; // candidate id
  candidateId: string;
  resumeId: string | null;
  jobId: string | null;
  candidateName: string;
  initials: string;
  role: string;
  experience: string;
  score: number;
  status: CandidateStatus;
  resumeScore: number;
  matchScore: number;
  screeningDecision: CandidateStatus;
  matchBand?: string;
  uploadedAt?: string;
  analyzedAt?: string;
  email?: string;
  phone?: string;
  education?: string;
}

export interface CandidateCounts {
  all: number;
  shortlisted: number;
  rejected: number;
}

export interface GetCandidatesParams {
  status?: CandidateFilterTab;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'match_score' | 'full_name';
  sortDirection?: 'asc' | 'desc';
}

export interface GetCandidatesResponse {
  candidates: CandidateListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: CandidateCounts;
}

export interface CandidateSummaryData {
  candidateId: string;
  candidateName: string;
  targetRole: string;
  experience: string;
  education?: string;
  resumeScore: number;
  matchScore: number;
  status: CandidateStatus;
  matchingSkills: string[];
  missingSkills: string[];
  aiSummary: string;
  whyExplanation: string;
  resumeId?: string | null;
  jobId?: string | null;
}
