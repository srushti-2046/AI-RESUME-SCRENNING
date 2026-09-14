import { supabase } from '../lib/supabase';
import type { ResumeRecord } from '../types/resume.types';
import { extractResumeText, computeFileHash } from '../lib/textExtractor';
import { validateResumeFileSync, validateResumeFile } from '../lib/validator';
import { logger } from '../lib/logger';

export interface UploadResumeResult {
  success: boolean;
  resume?: ResumeRecord;
  error?: string;
}

export const ResumeService = {
  /**
   * Validates file format and size synchronously
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    return validateResumeFileSync(file);
  },

  /**
   * Uploads a resume file to Supabase Storage and records metadata in PostgreSQL
   */
  async uploadResume(file: File, recruiterId: string): Promise<UploadResumeResult> {
    const validation = await validateResumeFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const resumeId = crypto.randomUUID();
      const buffer = await file.arrayBuffer();
      const fileHash = await computeFileHash(buffer);
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${recruiterId}/${resumeId}/${safeFileName}`;

      // 1. Upload to Supabase Storage private bucket 'resumes'
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream'
        });

      if (storageError) {
        logger.error('ResumeService', 'Storage upload error', storageError);
        return { success: false, error: `Failed to upload to storage: ${storageError.message}` };
      }

      // 2. Extract text from file client/server-side
      let extractedText = '';
      try {
        extractedText = await extractResumeText(file);
      } catch (extractErr) {
        logger.warn('ResumeService', 'Text extraction warning', extractErr);
      }

      // 3. Create placeholder candidate record for this resume
      const candidateName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const { data: candData, error: candError } = await supabase
        .from('candidates')
        .insert({
          recruiter_id: recruiterId,
          full_name: candidateName,
          status: 'screening',
          match_score: 0,
          resume_score: 0
        })
        .select('id')
        .single();

      if (candError) {
        logger.warn('ResumeService', 'Candidate placeholder creation warning', candError);
      }

      const candidateId = candData?.id || null;

      // 4. Save record in public.resumes
      const { data: resumeData, error: dbError } = await supabase
        .from('resumes')
        .insert({
          id: resumeId,
          recruiter_id: recruiterId,
          candidate_id: candidateId,
          file_name: file.name,
          file_path: storagePath,
          file_type: file.type || file.name.split('.').pop(),
          file_size: file.size,
          file_hash: fileHash,
          extracted_text: extractedText || null,
          processing_status: 'uploaded'
        })
        .select('*')
        .single();

      if (dbError) {
        logger.error('ResumeService', 'Database resume insert error', dbError);
        return { success: false, error: `Database insert failed: ${dbError.message}` };
      }

      // 5. Log activity in candidate_activities
      await supabase.from('candidate_activities').insert({
        recruiter_id: recruiterId,
        candidate_id: candidateId,
        resume_id: resumeId,
        activity_type: 'resume_uploaded',
        activity_message: `Resume "${file.name}" uploaded successfully`
      });

      return { success: true, resume: resumeData as ResumeRecord };
    } catch (err) {
      logger.error('ResumeService', 'Upload process error', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown upload error' };
    }
  },

  /**
   * Fetches all resumes owned by the current recruiter
   */
  async getRecruiterResumes(recruiterId: string): Promise<ResumeRecord[]> {
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('recruiter_id', recruiterId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      logger.error('ResumeService', 'Error fetching resumes', error);
      return [];
    }

    return (data || []) as ResumeRecord[];
  },

  /**
   * Deletes a resume from both Storage and Database
   */
  async deleteResume(resumeId: string, filePath: string): Promise<boolean> {
    try {
      // 1. Delete from storage
      await supabase.storage.from('resumes').remove([filePath]);

      // 2. Delete from database (cascades to analyses)
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId);

      return !error;
    } catch (err) {
      logger.error('ResumeService', 'Delete resume error', err);
      return false;
    }
  }
};
