export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
}

export interface KPICards {
  totalResumes: number;
  shortlisted: number;
  pendingReview: number;
  rejected: number;
}

export interface PipelineStats {
  applied: number;
  screening: number;
  shortlisted: number;
  interview: number;
  hired: number;
}

export interface ActivityItem {
  id: string;
  file_name: string;
  candidate_name: string;
  candidate_status: string;
  activity_type: string;
  activity_message?: string;
  created_at: string;
}

export interface SkillMetric {
  name: string;
  count: number;
  pct: number;
}

export interface WeeklyTrendItem {
  day: string;
  date: string;
  resumes: number;
}

export interface TopCandidate {
  id: string;
  name: string;
  role: string;
  score: string;
  status: string;
  status_class: string;
}

export interface CandidateStatusItem {
  name: string;
  value: number;
  fill: string;
}

export interface DashboardOverview {
  authenticated: boolean;
  user: UserProfile | null;
  stats: KPICards;
  pipeline: PipelineStats;
  recentActivity: ActivityItem[];
  topSkills: SkillMetric[];
  candidatesByStatus: CandidateStatusItem[];
  weeklyResumeTrend: WeeklyTrendItem[];
  topCandidates: TopCandidate[];
}
