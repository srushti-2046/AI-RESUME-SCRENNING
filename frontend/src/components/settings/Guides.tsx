// Guides.tsx — Step-by-step feature walkthroughs
import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, CheckCircle2, Search } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import type { GuideItem } from '../../types/settings.types';

const DEFAULT_GUIDES: GuideItem[] = [
  {
    title: "Getting Started with AI Resume Screening",
    description: "Complete guide for new recruiters",
    steps: ["Sign up / Sign in to your workspace", "Go to Upload → drag and drop candidate resumes", "Select or paste your job description", "Click 'Analyze Resumes with AI'", "Review scores, rankings, and ATS feedback on the Candidates screen"],
  },
  {
    title: "How to Upload Multiple Resumes",
    description: "Upload and manage bulk resume files efficiently",
    steps: ["Navigate to the Upload screen", "Click 'Select Files' or drag multiple resumes into the drop zone", "Supported formats: PDF, DOCX, TXT (up to 5MB each)", "Click 'Analyze Resumes with AI' to begin parsing", "Monitor progress bars for each file"],
  },
  {
    title: "Understanding Resume Ranking",
    description: "How candidates are automatically scored and ranked",
    steps: ["AI assigns a match_score (0–100) to each candidate", "Candidates with score >= 60 are automatically shortlisted", "Candidates below 60 are rejected", "View ranked candidates on the Ranking screen", "Click any candidate card for complete score breakdown and insights"],
  },
  {
    title: "Using ATS Compatibility Check",
    description: "Check how well candidate resumes pass ATS filters",
    steps: ["Navigate to the ATS Check screen", "Upload a new resume or pick an existing candidate", "Inspect formatting issues, keyword density, and structural suggestions", "Export the complete ATS compatibility report"],
  },
  {
    title: "Creating and Publishing an Assessment",
    description: "Build custom skill assessments for candidates",
    steps: ["Go to Assessment → Create Assessment", "Set title, duration, and passing score", "Select skill modules and set weighting percentages", "Click 'Save Draft' or 'Publish'", "Copy the generated shareable candidate link", "Use 'Assign Candidates' to invite shortlisted candidates"],
  },
  {
    title: "Detecting Duplicate Resumes",
    description: "Identify duplicate candidates across job postings",
    steps: ["Navigate to the Duplicate Detection screen", "Upload or select candidate resumes to cross-examine", "View duplicate percentage similarity and matched candidate details", "Prevent redundant evaluations and duplicate interview invites"],
  },
  {
    title: "Managing Account Security & Privacy",
    description: "Update passwords, review sessions, and configure data privacy",
    steps: ["Navigate to Settings → Privacy & Security", "Update your password securely with Supabase Auth integration", "Review active device sessions and sign out anywhere if needed", "Configure candidate data retention and privacy preferences"],
  },
];

export const Guides: React.FC = () => {
  const [guides, setGuides] = useState<GuideItem[]>(DEFAULT_GUIDES);
  const [query, setQuery] = useState('');
  const [selectedGuide, setSelectedGuide] = useState<GuideItem | null>(DEFAULT_GUIDES[0]);

  useEffect(() => {
    SettingsService.getGuides()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setGuides(data);
          setSelectedGuide(data[0]);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = guides.filter(g =>
    g.title.toLowerCase().includes(query.toLowerCase()) ||
    g.description.toLowerCase().includes(query.toLowerCase()) ||
    g.steps.some(s => s.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={18} style={{ color: 'var(--accent)' }} /> Feature Guides & Walkthroughs
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Detailed step-by-step instructions to master every feature of the AI Resume Screening platform.
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search guides..."
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem 0.55rem 2.4rem',
            borderRadius: 8,
            border: '1.5px solid var(--border)',
            background: 'var(--card-hover-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.86rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left column: List of guides */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(guide => {
            const isSelected = selectedGuide?.title === guide.title;
            return (
              <div
                key={guide.title}
                onClick={() => setSelectedGuide(guide)}
                className="card"
                style={{
                  padding: '0.9rem 1rem',
                  cursor: 'pointer',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--purple-bg, rgba(108,99,255,0.08))' : 'var(--card-bg)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 3 }}>
                    {guide.title}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {guide.description}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }} />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              No guides found.
            </div>
          )}
        </div>

        {/* Right column: Guide detail with numbered steps */}
        {selectedGuide && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 4, background: 'var(--purple-bg)', color: 'var(--accent)', textTransform: 'uppercase' }}>
                Guide
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {selectedGuide.steps.length} Steps
              </span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              {selectedGuide.title}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {selectedGuide.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {selectedGuide.steps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 1
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{
                    flex: 1,
                    background: 'var(--card-hover-bg)',
                    padding: '0.7rem 0.9rem',
                    borderRadius: 8,
                    fontSize: '0.84rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.45,
                    border: '1px solid var(--border)'
                  }}>
                    {step}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={15} style={{ color: '#22c55e' }} />
              <span>Follow these steps in sequence for optimal screening results.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
