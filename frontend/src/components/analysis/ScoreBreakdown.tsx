import React from 'react';
import { Target, Award, Code, Briefcase, GraduationCap, FolderGit2, ShieldCheck } from 'lucide-react';
import type { ScoreBreakdown as ScoreBreakdownType } from '../../types/resume.types';

interface ScoreBreakdownProps {
  matchScore: number;
  resumeScore: number;
  resumeQuality: 'normal' | 'good' | 'amazing' | 'excellent';
  scoreBreakdown: ScoreBreakdownType;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  matchScore,
  resumeScore,
  resumeQuality,
  scoreBreakdown
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--green)';
    if (score >= 60) return 'var(--blue)';
    return 'var(--red)';
  };

  const getQualityBadge = () => {
    switch (resumeQuality) {
      case 'excellent':
        return <span className="badge badge-green">Excellent Tier</span>;
      case 'amazing':
        return <span className="badge badge-blue">Strong Quality</span>;
      case 'good':
        return <span className="badge badge-purple">Good Quality</span>;
      default:
        return <span className="badge badge-yellow">Standard Quality</span>;
    }
  };

  const breakdownItems = [
    { label: 'Skills Coverage', value: scoreBreakdown.skills, fillClass: 'fill-emerald', icon: <Code size={14} color="var(--accent)" /> },
    { label: 'Experience Match', value: scoreBreakdown.experience, fillClass: 'fill-cyan', icon: <Briefcase size={14} color="var(--blue)" /> },
    { label: 'Education Alignment', value: scoreBreakdown.education, fillClass: 'fill-indigo', icon: <GraduationCap size={14} color="var(--purple)" /> },
    { label: 'Projects Relevancy', value: scoreBreakdown.projects, fillClass: 'fill-purple', icon: <FolderGit2 size={14} color="var(--pink)" /> },
    { label: 'Certifications', value: scoreBreakdown.certifications, fillClass: 'fill-amber', icon: <ShieldCheck size={14} color="var(--teal)" /> },
  ];

  return (
    <div className="score-breakdown-grid">
      {/* 1. Overall Match Score Card */}
      <div className="analysis-card score-circle-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          <Target size={14} color="var(--accent)" />
          Overall Match Score
        </div>

        {/* Circular Ring Presentation */}
        <div style={{ position: 'relative', width: 140, height: 140, margin: '0.5rem 0' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#edf2f7"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke={getScoreColor(matchScore)}
              strokeWidth="10"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * matchScore) / 100}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 900, color: getScoreColor(matchScore), lineHeight: 1 }}>
              {matchScore}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginTop: 2 }}>
              out of 100
            </span>
          </div>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: getScoreColor(matchScore) }}>
            {matchScore >= 80 ? 'High Position Alignment' : matchScore >= 60 ? 'Moderate Position Alignment' : 'Low Position Alignment'}
          </span>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: 220 }}>
            Synthesized from skill overlap, background tenure, and candidate resume quality.
          </p>
        </div>
      </div>

      {/* 2. Explainable Multi-Factor Score Breakdown */}
      <div className="analysis-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <Award size={16} color="var(--accent)" />
              Score Breakdown &amp; Key Drivers
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Explainable AI Drivers</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {breakdownItems.map((item, idx) => (
              <div key={idx} className="driver-bar-row">
                <div className="driver-bar-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {item.icon}
                    {item.label}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}%</span>
                </div>
                <div className="driver-bar-track">
                  <div
                    className={`driver-bar-fill ${item.fillClass}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Banner: Resume Quality Tier */}
        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Resume Quality Baseline: <strong style={{ color: 'var(--text-primary)' }}>{resumeScore}/100</strong>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {getQualityBadge()}
          </div>
        </div>
      </div>
    </div>
  );
};
