// HelpCenter.tsx — Interactive help topics with in-depth guidance modals and direct screen navigation
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle, Upload, BarChart2, Award, CheckSquare, Copy,
  BookOpen, Shield, Search, ArrowRight, X, CheckCircle2,
  ExternalLink, LifeBuoy, MessageCircle
} from 'lucide-react';
import type { SettingsSection } from '../../types/settings.types';

interface HelpTopic {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tag: string;
  routePath?: string;
  settingsSection?: SettingsSection;
  details: {
    overview: string;
    keyPoints: string[];
    actionLabel: string;
  };
}

const TOPICS: HelpTopic[] = [
  {
    id: 'getting-started',
    icon: <BookOpen size={22} />,
    title: 'Getting Started',
    desc: 'New to AI Resume Screening? Master the end-to-end recruitment workflow.',
    tag: 'Overview',
    settingsSection: 'guides',
    details: {
      overview: 'The AI Resume Screening platform streamlines candidate evaluation by combining automated resume parsing, deterministic skill matching, and AI-assisted qualification ranking.',
      keyPoints: [
        'Sign in to your recruiter workspace with Supabase authentication.',
        'Upload candidate resumes (PDF, DOCX, DOC) and input target job requirements.',
        'AI screening automatically computes match scores and classifies candidates into Shortlisted or Rejected.',
        'Explore in-depth score breakdowns, ATS parseability checks, and candidate skill gaps.',
      ],
      actionLabel: 'Open Step-by-Step Guides',
    },
  },
  {
    id: 'resume-upload',
    icon: <Upload size={22} />,
    title: 'Resume Upload',
    desc: 'Supported formats, batch uploads, document parsing, and file limits.',
    tag: 'Screen 2',
    routePath: '/upload',
    details: {
      overview: 'Easily stage, upload, and manage candidate resumes directly in your user-owned Supabase Storage bucket. You can also upload or paste job descriptions to match resumes against.',
      keyPoints: [
        'Accepted formats: PDF (.pdf), Microsoft Word (.docx, .doc), and Plain Text (.txt).',
        'Maximum file size: 10MB per document.',
        'Batch uploading: Select multiple files at once or drag and drop files into the staging zone.',
        'Text extraction: Automated extraction of candidate contact info, work history, and skills.',
      ],
      actionLabel: 'Go to Resume Upload',
    },
  },
  {
    id: 'resume-analysis',
    icon: <BarChart2 size={22} />,
    title: 'Resume Analysis',
    desc: 'How automated AI scoring evaluates qualifications, skills, and experience.',
    tag: 'Screen 4',
    routePath: '/analysis',
    details: {
      overview: 'Every analyzed resume receives an authoritative evaluation against the target job requirements. The evaluation is completely deterministic and grounded in actual resume text.',
      keyPoints: [
        'Score Breakdown: 4 core pillars including Relevance, Experience, Education, and Soft Skills.',
        'Skills Matching: Clearly separates matched candidate skills from required missing skills.',
        'AI Recommendations: Explains specific strengths and identified gaps for transparent hiring.',
        'Actionable Feedback: Generates practical suggestions to accelerate candidate interviews.',
      ],
      actionLabel: 'Go to Analysis Results',
    },
  },
  {
    id: 'candidate-ranking',
    icon: <Award size={22} />,
    title: 'Candidate Ranking',
    desc: 'Understanding match score sorting, filtering by job, and status thresholds.',
    tag: 'Screen 5',
    routePath: '/ranking',
    details: {
      overview: 'Candidate Ranking aggregates all analyzed applicants for your active requisition and ranks them strictly by their verified AI match score.',
      keyPoints: [
        'Shortlist Threshold: Candidates with match_score >= 60% are automatically marked as Shortlisted.',
        'Rejection Threshold: Candidates with match_score < 60% are marked as Rejected.',
        'Job Filter: Use the job selector dropdown to inspect rankings for specific positions.',
        'Quick View: Click "View Analysis" on any row to open the complete candidate dossier.',
      ],
      actionLabel: 'Go to Candidate Ranking',
    },
  },
  {
    id: 'ats-check',
    icon: <CheckSquare size={22} />,
    title: 'ATS Compatibility Check',
    desc: 'Authoritative evaluation of machine parseability and keyword indexing.',
    tag: 'Screen 6',
    routePath: '/ats-check',
    details: {
      overview: 'The ATS Compatibility Check performs 9 deterministic structural inspections on applicant resumes to ensure they can be accurately parsed by standard Applicant Tracking Systems.',
      keyPoints: [
        'Checks include: File Format, Contact Information, Section Headings, and Keyword Density.',
        'Identifies parseability bottlenecks such as unreadable tables or non-standard fonts.',
        'Export Report: Download a clean ATS compliance summary to share with candidates or hiring teams.',
        'Scoring: 80+ indicates ATS Friendly, 60-79 Needs Improvement, <60 Poor Compatibility.',
      ],
      actionLabel: 'Go to ATS Check',
    },
  },
  {
    id: 'duplicate-detection',
    icon: <Copy size={22} />,
    title: 'Duplicate Detection',
    desc: 'How duplicate and near-duplicate applicant resumes are identified.',
    tag: 'Screen 7',
    routePath: '/duplicate',
    details: {
      overview: 'Prevent multiple submissions and pipeline bloat by scanning your candidate database for identical or highly similar resumes across different applications.',
      keyPoints: [
        'Text-based similarity: Uses Jaccard n-gram indexing to compare uploaded resume contents.',
        'Threshold: Pairs with similarity >= 85% are flagged as duplicates.',
        'Side-by-side Compare: Open the comparison modal to inspect matching text highlights.',
        'Recruiter Sovereignty: Scans only candidate records owned by the authenticated recruiter.',
      ],
      actionLabel: 'Go to Duplicate Detection',
    },
  },
  {
    id: 'assessment',
    icon: <HelpCircle size={22} />,
    title: 'Assessment Builder',
    desc: 'Creating custom skill tests, configuring module weights, and candidate links.',
    tag: 'Screen 8',
    routePath: '/assessment',
    details: {
      overview: 'Create structured technical and cognitive assessments to validate applicant competencies following automated resume screening.',
      keyPoints: [
        'Module Selector: Choose from Python, JavaScript, SQL, System Design, and Cognitive modules.',
        'Weight Configuration: Customize question distribution ensuring module weights total 100%.',
        'Shareable Link: Publish assessments to generate candidate test links.',
        'Candidate Assignment: Directly assign tests to shortlisted candidates with automatic reminders.',
      ],
      actionLabel: 'Go to Assessment Builder',
    },
  },
  {
    id: 'security-privacy',
    icon: <Shield size={22} />,
    title: 'Account & Security',
    desc: 'Password changes, active sessions, 2FA readiness, and privacy controls.',
    tag: 'Screen 9',
    settingsSection: 'privacy',
    details: {
      overview: 'Manage your recruiter credentials, active device sessions, and platform data privacy settings with zero password exposure.',
      keyPoints: [
        'Supabase Auth: All credentials and sessions are securely managed directly via Supabase Auth.',
        'Change Password: Password updates execute client-to-Supabase without passing to application APIs.',
        'Session Sign-Out: Invalidate all active sessions with a single click in Account Settings.',
        'Data Retention: Privacy preferences configure candidate visibility and data protection.',
      ],
      actionLabel: 'Go to Privacy & Security',
    },
  },
];

interface Props {
  onSelectSection?: (section: SettingsSection) => void;
  addToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

export const HelpCenter: React.FC<Props> = ({ onSelectSection, addToast }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<HelpTopic | null>(null);

  const filteredTopics = TOPICS.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.tag.toLowerCase().includes(q) ||
      t.details.overview.toLowerCase().includes(q)
    );
  });

  const handleTopicAction = (topic: HelpTopic) => {
    setActiveTopic(null);
    if (topic.routePath) {
      navigate(topic.routePath);
      scrollToTop();
    } else if (topic.settingsSection && onSelectSection) {
      onSelectSection(topic.settingsSection);
      scrollToTop();
    }
  };

  const handleBrowseFaq = () => {
    if (onSelectSection) {
      onSelectSection('faq');
      scrollToTop();
      addToast?.('Navigated to FAQ section', 'info');
    }
  };

  const handleContactSupport = () => {
    if (onSelectSection) {
      onSelectSection('support');
      scrollToTop();
      addToast?.('Navigated to Support Tickets', 'info');
    }
  };

  return (
    <div>
      {/* Header & Topic Search */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={18} style={{ color: 'var(--accent)' }} /> Help Center
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Select any feature card to view detailed guidance, best practices, and direct navigation links.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '2.1rem',
              paddingRight: '0.75rem',
              paddingTop: '0.45rem',
              paddingBottom: '0.45rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card-hover-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Grid of Interactive Topic Cards */}
      {filteredTopics.length === 0 ? (
        <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Search size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No matching help topics</div>
          <div style={{ fontSize: '0.82rem' }}>Try searching for &ldquo;upload&rdquo;, &ldquo;ranking&rdquo;, &ldquo;ATS&rdquo;, or &ldquo;assessment&rdquo;.</div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSearchQuery('')}
            style={{ marginTop: '1rem', display: 'inline-flex' }}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {filteredTopics.map(topic => (
            <div
              key={topic.id}
              className="card"
              onClick={() => setActiveTopic(topic)}
              style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(108,99,255,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--purple-bg, rgba(108,99,255,0.12))',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {topic.icon}
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  background: 'var(--purple-bg, rgba(108,99,255,0.12))',
                  padding: '2px 8px',
                  borderRadius: 6
                }}>
                  {topic.tag}
                </span>
              </div>

              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                {topic.title}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, flex: 1, marginBottom: '0.85rem' }}>
                {topic.desc}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--accent)',
                marginTop: 'auto'
              }}>
                <span>View Guidance</span>
                <ArrowRight size={13} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Help Footer with Direct Action Buttons */}
      <div className="card" style={{ marginTop: '1.75rem', padding: '1.25rem 1.5rem', background: 'var(--card-hover-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Still have questions?</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Browse the full question-and-answer library or submit a support ticket.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleBrowseFaq}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, cursor: 'pointer' }}
          >
            <MessageCircle size={14} /> Browse FAQ
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleContactSupport}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, cursor: 'pointer' }}
          >
            <LifeBuoy size={14} /> Contact Support
          </button>
        </div>
      </div>

      {/* Interactive Topic Guidance Modal */}
      {activeTopic && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 540, padding: '1.75rem', position: 'relative', borderRadius: 12 }}>
            <button
              onClick={() => setActiveTopic(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--purple-bg, rgba(108,99,255,0.12))',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {activeTopic.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {activeTopic.title}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{activeTopic.tag}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {activeTopic.details.overview}
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                Key Instructions &amp; Features:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeTopic.details.keyPoints.map((point, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--green, #00b894)', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ lineHeight: 1.45 }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setActiveTopic(null);
                  if (onSelectSection) {
                    onSelectSection('guides');
                    scrollToTop();
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <BookOpen size={14} /> View Step-by-Step Guide
              </button>

              <button
                className="btn btn-primary"
                onClick={() => handleTopicAction(activeTopic)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <span>{activeTopic.details.actionLabel}</span>
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
