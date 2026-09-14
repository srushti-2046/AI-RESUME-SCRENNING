export type DetectionType = 'exact_hash' | 'content_similarity';

export interface DuplicateResumeMeta {
  resumeId: string;
  candidateId?: string | null;
  candidateName: string;
  fileName: string;
  resumeScore: number;
  analyzedAt: string;
}

export interface DuplicatePair {
  id: string;
  similarityScore: number;
  detectionType: DetectionType;
  createdAt: string;
  resumeA: DuplicateResumeMeta;
  resumeB: DuplicateResumeMeta;
}

export interface DuplicateOverviewResponse {
  scannedCount: number;
  duplicatePairCount: number;
  duplicateResumeCount: number;
  uniqueResumeCount: number;
  pairs: DuplicatePair[];
}

export interface DuplicateResumeDetail {
  resumeId: string;
  candidateId?: string | null;
  candidateName: string;
  email?: string;
  phone?: string;
  fileName: string;
  fileUrl?: string;
  resumeScore: number;
  skills: string[];
  uniqueSkills: string[];
  education: Array<{
    degree?: string;
    institution?: string;
    year?: string | number;
    gpa?: string;
  }>;
  experience: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;
  projects: Array<{
    title?: string;
    description?: string;
    technologies?: string[];
  }>;
  certifications: string[];
  summary?: string;
  textPreview: string;
  analyzedAt: string;
}

export interface DuplicateComparisonResponse {
  similarityScore: number;
  detectionType: DetectionType;
  createdAt: string;
  commonSkills: string[];
  resumeA: DuplicateResumeDetail;
  resumeB: DuplicateResumeDetail;
}

export interface DuplicateCategoryResume {
  resumeId: string;
  candidateId?: string | null;
  candidateName: string;
  fileName: string;
  resumeScore: number;
  analyzedAt: string;
  fileUrl?: string;
}
