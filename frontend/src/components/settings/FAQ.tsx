// FAQ.tsx — Searchable FAQ accordion
import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { SettingsService } from '../../services/settings.service';
import type { FAQItem } from '../../types/settings.types';

const DEFAULT_FAQ: FAQItem[] = [
  { category: "Resume Upload", question: "What file formats are supported for resume upload?", answer: "We support PDF, DOCX, and TXT files up to 5MB per file. PDF is recommended for best parsing accuracy." },
  { category: "Resume Upload", question: "Can I upload multiple resumes at once?", answer: "Yes. You can select and upload multiple resume files simultaneously from the Upload screen with batch progress tracking." },
  { category: "Analysis", question: "How does the AI Resume Match Score work?", answer: "The AI analyzes the resume text and compares it against the job description using semantic similarity, keyword matching, experience, education, and skills. A score of 0–100 is assigned." },
  { category: "Analysis", question: "Why was a candidate automatically shortlisted or rejected?", answer: "Candidates with a match_score >= 60 are automatically shortlisted. Candidates below 60 are rejected. This threshold ensures consistent, unbiased screening." },
  { category: "ATS", question: "How is ATS compatibility calculated?", answer: "The ATS check evaluates formatting, keyword density, section headers, contact information, and readability against industry-standard ATS systems." },
  { category: "Duplicate Detection", question: "How does duplicate resume detection work?", answer: "We use a combination of content hashing and semantic similarity to detect resumes that are near-identical or from the same candidate submitted under different file names." },
  { category: "Ranking", question: "Can I change the candidate ranking order?", answer: "Rankings are based on AI match scores. You can filter and sort candidates by score, status, or other criteria from the Candidates screen." },
  { category: "Assessment", question: "How do I create an assessment?", answer: "Go to the Assessment screen, click 'Create Assessment', configure the title, duration, modules, and passing score, then publish to generate a shareable link." },
  { category: "Assessment", question: "How do I assign an assessment to a candidate?", answer: "After creating an assessment, use the 'Assign Candidates' section to select candidates from your shortlist. They will receive an invitation link." },
  { category: "Account & Security", question: "Is my data secure?", answer: "Yes. All data is stored in Supabase with Row Level Security (RLS). You can only access your own data. Passwords are managed exclusively by Supabase Auth." },
  { category: "Account & Security", question: "How do I change my password?", answer: "Go to Settings → Privacy & Security → Change Password. This uses your Supabase authentication — your password is never stored in our application database." },
  { category: "Notifications", question: "How do I turn off email notifications?", answer: "Go to Settings → Notifications and toggle off any notification type. Changes are saved immediately." },
];

export const FAQ: React.FC = () => {
  const [items, setItems] = useState<FAQItem[]>(DEFAULT_FAQ);
  const [query, setQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    SettingsService.getFAQ()
      .then(res => {
        if (Array.isArray(res) && res.length > 0) setItems(res);
      })
      .catch(() => {});
  }, []);
  const filtered = items.filter(i =>
    i.question.toLowerCase().includes(query.toLowerCase()) ||
    i.answer.toLowerCase().includes(query.toLowerCase()) ||
    i.category.toLowerCase().includes(query.toLowerCase())
  );

  const categories = [...new Set(filtered.map(i => i.category))];

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HelpCircle size={18} style={{ color: 'var(--accent)' }} /> Frequently Asked Questions
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Find answers to common questions about the platform.</p>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search questions..."
          style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.4rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{cat}</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.filter(i => i.category === cat).map((item) => {
              const globalIdx = items.indexOf(item);
              const isOpen = openIndex === globalIdx;
              return (
                <div key={globalIdx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => setOpenIndex(isOpen ? null : globalIdx)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.1rem', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.question}</span>
                    {isOpen ? <ChevronUp size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} /> : <ChevronDown size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 1.1rem 1rem', fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>No results for "{query}"</div>
      )}
    </div>
  );
};
