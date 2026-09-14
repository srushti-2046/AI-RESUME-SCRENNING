// ===================== ASSESSMENT TYPES =====================

export interface AssessmentModule {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
}

export interface ModuleWeight {
  module_id: string;
  weight_percent: number;
}

export interface ModuleDistribution {
  module_id: string;
  module_name?: string;
  weight_percent: number;
  question_count: number;
}

export interface AssessmentConfig {
  title: string;
  duration_minutes: number;
  total_questions: number;
  passing_score: number;
  instructions: string;
  modules: ModuleWeight[];
}

export interface Assessment {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'closed' | 'archived';
  duration_minutes: number;
  total_questions: number;
  passing_score: number;
  share_token: string | null;
  created_at: string;
  updated_at: string;
  assigned_count: number;
  submitted_count: number;
  modules: {
    module_name: string;
    weight_percent: number;
    question_count: number;
  }[];
}

export interface AssessmentCandidate {
  id: string;
  full_name: string;
  email: string;
  resume_score: number | null;
}

export interface AssignmentResult {
  assignment_id: string;
  attempt_id: string;
  attempt_token: string;
  candidate_id: string;
  status: string;
}

export interface PublicQuestion {
  question_number: number;
  question_id: string;
  question_type: string;
  question_text: string;
  difficulty: string;
  options: { id: string; text: string }[] | null;
  points: number;
  module_name: string;
}

export interface PublicAssessment {
  assessment_id: string;
  title: string;
  duration_minutes: number;
  total_questions: number;
  passing_score: number;
  instructions: string | null;
  questions: PublicQuestion[];
}

export interface CandidateAnswer {
  question_id: string;
  answer: string;
}

export interface AttemptResult {
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  score: number;
  percentage: number;
  passing_score: number;
  passed: boolean;
  module_results: {
    module_name: string;
    total: number;
    correct: number;
    percentage: number;
  }[];
}

export interface DetailedResult {
  assessment_title: string;
  candidate_name: string;
  candidate_email: string;
  score: number;
  percentage: number;
  passing_score: number;
  passed: boolean;
  submitted_at: string;
  total_questions: number;
  module_results: {
    module_name: string;
    total_questions: number;
    correct_answers: number;
    percentage: number;
  }[];
  answers: {
    question_number: number;
    question_text: string;
    question_type: string;
    options: { id: string; text: string }[] | null;
    correct_answer: { answer: string };
    candidate_answer: string | null;
    is_correct: boolean | null;
    points_awarded: number;
    points_possible: number;
    explanation: string | null;
    module_name: string;
  }[];
}
