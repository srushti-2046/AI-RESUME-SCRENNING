// AboutSettings.tsx — Platform information, version, terms & privacy
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, FileText, CheckCircle2, X, Lock, Scale } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import type { AboutInfo } from '../../types/settings.types';

export const AboutSettings: React.FC = () => {
  const [about, setAbout] = useState<AboutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);

  useEffect(() => {
    SettingsService.getAbout()
      .then(setAbout)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading about information...</div>;
  }

  const appName = about?.app_name || 'AI Resume Screening';
  const version = about?.version || '1.0.0';
  const environment = about?.environment || 'Production';
  const description = about?.description || 'AI-powered recruitment platform for automated resume screening, candidate ranking, ATS compatibility checking, and skills assessment.';
  const copyright = about?.copyright || '© 2026 AI Resume Screening. All rights reserved.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Banner */}
      <div className="card" style={{
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(59,130,246,0.08) 100%)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(108,99,255,0.3)'
            }}>
              <Cpu size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {appName}
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 3 }}>
                <span>Version {version}</span>
                <span>•</span>
                <span style={{
                  background: environment.toLowerCase() === 'production' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                  color: environment.toLowerCase() === 'production' ? '#16a34a' : '#ca8a04',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: '0.72rem'
                }}>
                  {environment}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {description}
        </p>
      </div>

      {/* Security & Architecture Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Security & Compliance
            </h3>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={14} style={{ color: '#22c55e', marginTop: 3, flexShrink: 0 }} />
              <span>Supabase Auth handles all user identity & credentials securely.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={14} style={{ color: '#22c55e', marginTop: 3, flexShrink: 0 }} />
              <span>PostgreSQL Row Level Security (RLS) enforces strict tenant isolation.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={14} style={{ color: '#22c55e', marginTop: 3, flexShrink: 0 }} />
              <span>No plain-text passwords or secret keys stored in application backend.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={14} style={{ color: '#22c55e', marginTop: 3, flexShrink: 0 }} />
              <span>Zero-training guarantee: Candidate resume data is never used to train public AI models.</span>
            </li>
          </ul>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <FileText size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Legal & Governance
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
              Our platform operates under strict ethical AI hiring principles, fair employment practices, and transparent data processing standards. Review the comprehensive legal documentation below.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveModal('terms')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', flex: 1, justifyContent: 'center' }}
            >
              <Scale size={14} /> Terms of Service
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveModal('privacy')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', flex: 1, justifyContent: 'center' }}
            >
              <Lock size={14} /> Privacy Policy
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-muted)', paddingTop: '0.5rem' }}>
        {copyright}
      </div>

      {/* Terms of Service Modal */}
      {activeModal === 'terms' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)', padding: '1.5rem'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '780px', maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--card-hover-bg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scale size={20} style={{ color: 'var(--accent)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Terms of Service — AI Resume Screening Platform
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              <p style={{ marginTop: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                Effective Date: January 1, 2026 • Last Updated: September 14, 2026
              </p>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>1. Acceptance of Terms</h4>
              <p>
                By accessing, registering for, or using the AI Resume Screening platform ("Service", "Application"), you agree to be bound by these Terms of Service. If you are using the Service on behalf of an enterprise or organization, you represent that you have full legal authority to bind that entity.
              </p>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>2. Authorized Use and Recruiter Conduct</h4>
              <p>
                The platform is designed exclusively for professional applicant tracking, resume evaluation, semantic candidate matching, and talent assessments. You agree that:
              </p>
              <ul style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
                <li>You will only upload candidate resumes for genuine recruitment purposes with lawful authorization.</li>
                <li>You will not upload malicious code, falsified records, or automated bots designed to disrupt system integrity.</li>
                <li>You will not attempt to bypass Row-Level Security (RLS) or access candidate data outside your tenant organization.</li>
              </ul>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>3. AI Screening & Decision-Support Disclaimer</h4>
              <p>
                The AI Match Scores, ATS Compatibility scores, skill tags, and auto-ranking provided by this system represent automated algorithmic analysis. They are provided as <strong>decision-support tools</strong> to assist recruitment professionals.
              </p>
              <p>
                Final employment decisions, interviews, and hiring determinations remain solely the responsibility of the employer. Employers agree to comply with all applicable labor standards, anti-bias regulations, and Equal Employment Opportunity (EEO) guidelines.
              </p>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>4. Data Ownership & Intellectual Property</h4>
              <p>
                Employers retain full ownership of their posted job requirements, notes, and recruitment workflows. Candidates retain proprietary ownership of their career identities. The underlying AI scoring logic, application architecture, and platform trademarks remain the intellectual property of AI Resume Screening.
              </p>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>5. Account Termination & Data Deletion</h4>
              <p>
                Users can permanently delete their account and associated candidate records at any time via Settings → Account → Danger Zone. Data deletion permanently purges all candidate files, assessment results, and screening histories.
              </p>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--card-hover-bg)' }}>
              <button type="button" className="btn btn-primary" onClick={() => setActiveModal(null)}>
                I Understand and Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {activeModal === 'privacy' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)', padding: '1.5rem'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '780px', maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--card-hover-bg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={20} style={{ color: 'var(--accent)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Privacy Policy & Data Protection Statement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              <p style={{ marginTop: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                Effective Date: January 1, 2026 • Last Updated: September 14, 2026
              </p>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>1. Scope & Commitment</h4>
              <p>
                We are committed to maintaining the highest standards of data privacy, candidate protection, and regulatory compliance (including GDPR, CCPA, and CPRA). This policy outlines how candidate resumes, recruiter information, and evaluation results are processed and secured.
              </p>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>2. Data We Collect & Process</h4>
              <ul style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
                <li><strong>Candidate Information:</strong> Names, contact emails, phone numbers, work experience, educational degrees, technical skill sets, and raw resume files (PDF, DOCX, TXT).</li>
                <li><strong>Recruiter Information:</strong> User profile names, corporate emails, role permissions, and customized screening criteria.</li>
                <li><strong>Assessment Data:</strong> Candidate test answers, completion timestamps, module weightings, and overall pass/fail results.</li>
              </ul>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>3. Zero-Training Guarantee</h4>
              <p>
                Your candidate resumes and corporate job descriptions are strictly confidential. <strong>We do not use customer resume data to train or fine-tune public foundation models.</strong> All AI inferences are performed ephemerally for candidate screening and matching solely within your isolated organization.
              </p>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>4. Security & Encryption Infrastructure</h4>
              <p>
                All data is encrypted in transit using TLS 1.3 and at rest with AES-256 encryption. Database access is strictly governed by PostgreSQL Row-Level Security (RLS) policies tied directly to verified Supabase Auth user sessions.
              </p>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>5. Data Retention & Erasure Rights</h4>
              <p>
                Recruiters can configure explicit data retention periods (from 30 to 3650 days) in Settings → Data Retention. Candidates possess the legal right to request rectification, access, or erasure of their personal candidate records from the hiring database.
              </p>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', marginTop: '1.25rem' }}>6. Contacting the Data Protection Officer</h4>
              <p>
                For privacy inquiries or compliance requests, users can submit an inquiry via Settings → Support with the category "Account & Security".
              </p>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--card-hover-bg)' }}>
              <button type="button" className="btn btn-primary" onClick={() => setActiveModal(null)}>
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
