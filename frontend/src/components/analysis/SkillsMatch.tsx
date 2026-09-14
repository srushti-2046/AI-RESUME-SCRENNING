import React from 'react';
import { Layers, Check, X, Plus } from 'lucide-react';

interface SkillsMatchProps {
  targetJobTitle: string;
  skillMatchPercentage: number;
  matchingSkills: string[];
  missingSkills: string[];
  extraSkills: string[];
}

export const SkillsMatch: React.FC<SkillsMatchProps> = ({
  targetJobTitle,
  skillMatchPercentage,
  matchingSkills,
  missingSkills,
  extraSkills
}) => {
  return (
    <div className="analysis-card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.35rem', borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Layers size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Skills Match for <span style={{ color: 'var(--accent)' }}>{targetJobTitle}</span>
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Evaluated with canonical skill normalization against configured requirements.
            </span>
          </div>
        </div>

        {/* Skill Match % Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Coverage:</span>
          <span className={`pill-badge ${skillMatchPercentage >= 70 ? 'pill-emerald' : skillMatchPercentage >= 50 ? 'pill-cyan' : 'pill-rose'}`}>
            {skillMatchPercentage}% Match
          </span>
        </div>
      </div>

      {/* 3 Columns / Sections */}
      <div className="skills-three-col">
        {/* 1. Matching Skills */}
        <div className="skills-column-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={13} />
              Matching Skills ({matchingSkills.length})
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--green)', fontWeight: 600 }}>Verified</span>
          </div>
          {matchingSkills.length > 0 ? (
            <div className="chips-wrap">
              {matchingSkills.map((skill, idx) => (
                <span key={idx} className="skill-chip skill-chip-green">
                  <Check size={11} />
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0' }}>No direct required skill matches found.</p>
          )}
        </div>

        {/* 2. Missing Skills */}
        <div className="skills-column-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={13} />
              Missing Skills ({missingSkills.length})
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--red)', fontWeight: 600 }}>Skill Gaps</span>
          </div>
          {missingSkills.length > 0 ? (
            <div className="chips-wrap">
              {missingSkills.map((skill, idx) => (
                <span key={idx} className="skill-chip skill-chip-red">
                  <X size={11} />
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--green-text)', fontWeight: 600, margin: '0.5rem 0' }}>All required skills are present in resume!</p>
          )}
        </div>

        {/* 3. Additional Skills */}
        <div className="skills-column-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={13} />
              Additional Skills ({extraSkills.length})
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--blue)', fontWeight: 600 }}>Bonus</span>
          </div>
          {extraSkills.length > 0 ? (
            <div className="chips-wrap">
              {extraSkills.slice(0, 8).map((skill, idx) => (
                <span key={idx} className="skill-chip skill-chip-cyan">
                  <Plus size={11} />
                  {skill}
                </span>
              ))}
              {extraSkills.length > 8 && (
                <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem', borderRadius: 6, background: 'var(--card-hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  +{extraSkills.length - 8} more
                </span>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0' }}>No extra skills detected.</p>
          )}
        </div>
      </div>
    </div>
  );
};
