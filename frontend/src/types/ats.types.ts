export type ATSStatus = 'ats_friendly' | 'needs_improvement' | 'poor_compatibility';

export type ATSCheckStatus = 'pass' | 'warn' | 'fail';

export type ATSCheckType = 
  | 'file_format'
  | 'parseability'
  | 'contact_information'
  | 'keyword_density'
  | 'section_headers'
  | 'font_formatting'
  | 'skills_section'
  | 'work_experience'
  | 'education';

export interface ATSCheckResult {
  id: string;
  checkType: string;
  title: string;
  status: ATSCheckStatus;
  score: number;
  maxScore: number;
  description: string;
  details?: Record<string, any>;
  sortOrder: number;
}

export interface ATSReport {
  id: string;
  resumeId: string;
  jobId?: string | null;
  candidateId?: string | null;
  atsScore: number;
  atsStatus: ATSStatus;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  overallSummary?: string;
  recommendations: string[];
  analysisVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ATSCandidate {
  id: string;
  name: string;
  email?: string;
  role?: string;
  matchScore?: number;
  resumeScore?: number;
  status?: string;
}

export interface ATSFullReportResponse {
  report: ATSReport;
  candidate?: ATSCandidate | null;
  checks: ATSCheckResult[];
}

export interface ATSEligibleCandidate {
  candidateId: string;
  resumeId: string;
  name: string;
  email: string;
  role: string;
  jobId?: string | null;
  jobTitle?: string | null;
  fileName: string;
  uploadedAt: string;
  matchScore: number;
  status: string;
}

export interface ATSExportData {
  title: string;
  exportDate: string;
  candidate: {
    name: string;
    email: string;
    targetRole?: string;
  };
  atsSummary: {
    score: number;
    status: string;
    passed: number;
    warnings: number;
    failed: number;
  };
  checks: Array<{
    title: string;
    status: string;
    score: string;
    description: string;
  }>;
  recommendations: string[];
}
