export interface ResumeRecord {
  id: string;
  candidate_id: string | null;
  recruiter_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  file_hash?: string | null;
  extracted_text: string | null;
  processing_status: 'uploaded' | 'processing' | 'analyzed' | 'failed';
  error_message?: string | null;
  uploaded_at: string;
  updated_at: string;
}

export interface JobRecord {
  id: string;
  recruiter_id: string;
  title: string;
  department?: string | null;
  description: string | null;
  required_skills: string[];
  optional_skills: string[];
  mandatory_requirements: string[];
  optional_requirements: string[];
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface JobRequirement {
  id: string;
  job_id: string;
  recruiter_id: string;
  requirement_text: string;
  requirement_type: 'skill' | 'experience' | 'education' | 'certification' | 'other';
  is_mandatory: boolean;
  created_at: string;
}

export interface JobResume {
  id: string;
  job_id: string;
  resume_id: string;
  recruiter_id: string;
  match_score: number;
  status: 'applied' | 'screening' | 'pending_review' | 'shortlisted' | 'interview' | 'rejected' | 'hired';
  created_at: string;
  updated_at: string;
}

export interface ResumeAnalysis {
  id: string;
  resume_id: string;
  recruiter_id: string;
  candidate_name: string | null;
  email: string | null;
  phone: string | null;
  education: Array<{ degree?: string; institution?: string; year?: string }>;
  skills: string[];
  experience: Array<{ role?: string; company?: string; duration?: string; details?: string }>;
  projects: Array<{ title?: string; description?: string }>;
  certifications: string[];
  resume_score: number;
  resume_quality: 'normal' | 'good' | 'amazing' | 'excellent';
  created_at: string;
  updated_at: string;
}

export interface ResumeSkillMatch {
  id: string;
  resume_id: string;
  job_id: string;
  recruiter_id: string;
  skill_name: string;
  match_status: 'matching' | 'missing' | 'extra';
  created_at: string;
}

export type MatchBand = 'strong_match' | 'moderate_match' | 'low_match';
export type DecisionRecommendation = 'shortlist_recommended' | 'reject_recommended';
export type ScreeningDecision = 'shortlisted' | 'rejected';
export type RecruiterDecisionType = 'shortlisted' | 'rejected' | 'review';

export interface ScoreBreakdown {
  skills: number;
  experience: number;
  education: number;
  projects: number;
  certifications: number;
}

export interface ResumeJobAnalysis {
  id: string;
  resume_id: string;
  job_id: string;
  recruiter_id: string;
  match_score: number;
  skill_match_percentage: number;
  matching_skills: string[];
  missing_skills: string[];
  extra_skills: string[];
  strengths: string[];
  improvement_suggestions: string[];
  mandatory_requirements_met: string[];
  optional_requirements_met: string[];
  match_band?: MatchBand;
  decision_recommendation?: DecisionRecommendation;
  screening_decision?: ScreeningDecision;
  screening_explanation?: string;
  ai_recommendation?: MatchBand;
  recommendation_summary?: string;
  recommendation_reason?: string;
  recommendation_factors?: string[];
  analysis_summary?: string;
  score_breakdown?: ScoreBreakdown;
  created_at: string;
  updated_at: string;
}

export interface CandidateRanking {
  rank: number;
  candidate_id: string;
  candidate_name: string;
  resume_id: string;
  job_id: string;
  match_score: number;
  resume_score: number;
  skill_match_percentage: number;
  status: string;
}

export interface ParsedResumeData {
  candidate_name: string | null;
  email: string | null;
  phone: string | null;
  education: Array<{ degree?: string; institution?: string; year?: string }>;
  skills: string[];
  experience: Array<{ role?: string; company?: string; duration?: string; details?: string }>;
  projects: Array<{ title?: string; description?: string }>;
  certifications: string[];
}

export interface ParsedJobData {
  title?: string;
  required_skills: string[];
  optional_skills: string[];
  mandatory_requirements: string[];
  optional_requirements: string[];
  experience_years?: number;
  education_level?: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  is_benchmark: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface CompanyJobRecord {
  id: string;
  company_id: string;
  job_title: string;
  department?: string | null;
  description?: string | null;
  experience_min: number;
  experience_max?: number | null;
  education_requirements?: string | null;
  is_benchmark: boolean;
  company?: CompanyRecord;
  criteria?: CompanyJobCriterion[];
  created_at?: string;
}

export interface CompanyJobCriterion {
  id: string;
  company_job_id: string;
  criterion_type: 'skill' | 'experience' | 'education' | 'certification' | 'other';
  criterion_name: string;
  criterion_value?: string | null;
  is_required: boolean;
  weight: number;
}

export interface ResumeCompanyMatch {
  id?: string;
  resume_id: string;
  company_job_id: string;
  recruiter_id: string;
  fit_score: number;
  matching_skills: string[];
  missing_skills: string[];
  matched_requirements: string[];
  missing_requirements: string[];
  explanation?: string | null;
  company_name?: string;
  job_title?: string;
  industry?: string;
}

export interface CandidateReviewDecision {
  id?: string;
  resume_id: string;
  job_id: string;
  recruiter_id: string;
  decision: RecruiterDecisionType;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FullAnalysisResultPayload {
  candidate: {
    id?: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    initials: string;
  };
  resume: {
    id: string;
    fileName: string;
    filePath: string;
    fileSize?: number;
  };
  resumeScore: number;
  resumeQuality: 'normal' | 'good' | 'amazing' | 'excellent';
  job: {
    id: string;
    title: string;
    description?: string | null;
  };
  match: {
    score: number;
    skillMatchPercentage: number;
    matchingSkills: string[];
    missingSkills: string[];
    extraSkills: string[];
  };
  scoreBreakdown: ScoreBreakdown;
  recommendation: {
    matchBand: MatchBand;
    decisionRecommendation: DecisionRecommendation;
    summary: string;
    reason: string;
    factors: string[];
  };
  analysisSummary: string;
  suggestions: string[];
  screening: {
    decision: ScreeningDecision;
    explanation: string;
    keyReasons: string[];
    matchingCriteria: string[];
    missingCriteria: string[];
  };
  recruiterDecision?: CandidateReviewDecision | null;
  companyFits: ResumeCompanyMatch[];
}
