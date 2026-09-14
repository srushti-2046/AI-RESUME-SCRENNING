import React, { useState } from 'react';
import { Building2, Search, Check, X, Info } from 'lucide-react';
import type { ResumeCompanyMatch } from '../../types/resume.types';

interface CompanyFitProps {
  companyFits: ResumeCompanyMatch[];
  onSearchChange?: (query: string) => void;
}

export const CompanyFit: React.FC<CompanyFitProps> = ({
  companyFits,
  onSearchChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFits = companyFits.filter(fit => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      fit.company_name?.toLowerCase().includes(q) ||
      fit.job_title?.toLowerCase().includes(q) ||
      fit.industry?.toLowerCase().includes(q)
    );
  }).sort((a, b) => b.fit_score - a.fit_score);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearchChange) onSearchChange(val);
  };

  const getFitBadgeClass = (score: number) => {
    if (score >= 80) return 'pill-emerald';
    if (score >= 65) return 'pill-cyan';
    return 'pill-amber';
  };

  return (
    <div className="analysis-card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.35rem', borderRadius: 8, background: 'var(--purple-bg)', color: 'var(--purple)' }}>
            <Building2 size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Company &amp; Role Fit Comparison
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Estimated Resume Fit against benchmark partner profiles (Transparent Criteria Matching)
            </span>
          </div>
        </div>

        {/* Search Companies Input */}
        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search companies, roles, industry..."
            value={searchQuery}
            onChange={handleSearch}
            style={{
              width: '100%',
              paddingLeft: '2rem',
              paddingRight: '0.75rem',
              paddingTop: '0.35rem',
              paddingBottom: '0.35rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card-hover-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      {/* Benchmark Disclaimer Notice */}
      <div className="safety-disclaimer" style={{ margin: '0.85rem 0' }}>
        <Info size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong style={{ color: 'var(--text-primary)' }}>Important Note:</strong> &ldquo;Estimated Resume Fit&rdquo; measures keyword and qualification alignment against configured benchmark role requirements. It is an algorithmic fit metric and does not represent an actual hiring probability or employment guarantee.
        </span>
      </div>

      {/* Opportunities List */}
      {filteredFits.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredFits.map((fit, idx) => (
            <div key={idx} className="company-fit-row">
              {/* Left: Company & Role */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {fit.company_name}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    · {fit.job_title}
                  </span>
                  {fit.industry && (
                    <span style={{ fontSize: '0.68rem', background: 'var(--card-hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                      {fit.industry}
                    </span>
                  )}
                </div>

                {/* Skills Preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: 3 }}>
                  {fit.matching_skills.slice(0, 3).map((s, i) => (
                    <span key={i} className="skill-chip skill-chip-green" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
                      <Check size={10} />
                      {s}
                    </span>
                  ))}
                  {fit.missing_skills.slice(0, 2).map((s, i) => (
                    <span key={i} className="skill-chip skill-chip-red" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
                      <X size={10} />
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: Estimated Resume Fit Meter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Estimated Fit</div>
                  <div className={`pill-badge ${getFitBadgeClass(fit.fit_score)}`} style={{ fontWeight: 800, fontSize: '0.85rem', marginTop: 2 }}>
                    {fit.fit_score}%
                  </div>
                </div>

                {/* Progress bar */}
                <div className="driver-bar-track" style={{ width: 80, height: 6 }}>
                  <div
                    className={`driver-bar-fill ${
                      fit.fit_score >= 80 ? 'fill-emerald' : fit.fit_score >= 65 ? 'fill-cyan' : 'fill-amber'
                    }`}
                    style={{ width: `${fit.fit_score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          No matching company benchmarks found for &ldquo;{searchQuery}&rdquo;. Try another company name or role.
        </div>
      )}
    </div>
  );
};
