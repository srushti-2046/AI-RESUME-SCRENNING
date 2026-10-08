import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Award,
  ShieldAlert,
  Loader2,
  Copy,
  Eye,
  Check,
  Search
} from 'lucide-react';
import { AssessmentService } from '../../services/assessment.service';
import type { Assessment } from '../../types/assessment.types';

interface LiveCandidateSession {
  id: string;
  candidateName: string;
  candidateEmail: string;
  assessmentTitle: string;
  status: 'in_progress' | 'completed' | 'invited';
  progress: number; // percentage
  answeredCount: number;
  totalQuestions: number;
  timeRemainingMinutes: number;
  violationsCount: number;
  score?: number;
  passed?: boolean;
}

export const LiveAssessmentPage: React.FC<{ onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void }> = ({ onShowToast }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Active Live Candidate Sessions
  const [sessions, setSessions] = useState<LiveCandidateSession[]>([
    {
      id: 'sess-1',
      candidateName: 'Rahul Sharma',
      candidateEmail: 'rahul.sharma@example.com',
      assessmentTitle: 'Senior Python Developer Technical Test',
      status: 'in_progress',
      progress: 75,
      answeredCount: 15,
      totalQuestions: 20,
      timeRemainingMinutes: 18,
      violationsCount: 0
    },
    {
      id: 'sess-2',
      candidateName: 'Priya Verma',
      candidateEmail: 'priya.verma@example.com',
      assessmentTitle: 'Senior Python Developer Technical Test',
      status: 'completed',
      progress: 100,
      answeredCount: 20,
      totalQuestions: 20,
      timeRemainingMinutes: 0,
      violationsCount: 0,
      score: 90,
      passed: true
    },
    {
      id: 'sess-3',
      candidateName: 'Amit Patel',
      candidateEmail: 'amit.patel@example.com',
      assessmentTitle: 'Full-Stack Software Engineer Assessment',
      status: 'in_progress',
      progress: 40,
      answeredCount: 8,
      totalQuestions: 20,
      timeRemainingMinutes: 34,
      violationsCount: 1
    },
    {
      id: 'sess-4',
      candidateName: 'Sneha Reddy',
      candidateEmail: 'sneha.reddy@example.com',
      assessmentTitle: 'Senior Python Developer Technical Test',
      status: 'completed',
      progress: 100,
      answeredCount: 20,
      totalQuestions: 20,
      timeRemainingMinutes: 0,
      violationsCount: 0,
      score: 75,
      passed: true
    },
    {
      id: 'sess-5',
      candidateName: 'Vikram Malhotra',
      candidateEmail: 'vikram.m@example.com',
      assessmentTitle: 'Data Engineering & SQL Assessment',
      status: 'invited',
      progress: 0,
      answeredCount: 0,
      totalQuestions: 15,
      timeRemainingMinutes: 45,
      violationsCount: 0
    }
  ]);

  const [selectedSessionForModal, setSelectedSessionForModal] = useState<LiveCandidateSession | null>(null);

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const list = await AssessmentService.getRecruiterAssessments();
      setAssessments(list);
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteLink = (token?: string) => {
    const link = `${window.location.origin}/assessment/t/${token || 'python-dev-test'}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    if (onShowToast) onShowToast('Assessment link copied to clipboard!', 'success');
  };

  const handleSimulateCandidateProgress = () => {
    setSessions(prev =>
      prev.map(s => {
        if (s.status === 'in_progress') {
          const nextAnswered = Math.min(s.totalQuestions, s.answeredCount + 1);
          const nextProgress = Math.round((nextAnswered / s.totalQuestions) * 100);
          const isDone = nextAnswered >= s.totalQuestions;

          return {
            ...s,
            answeredCount: nextAnswered,
            progress: nextProgress,
            timeRemainingMinutes: Math.max(1, s.timeRemainingMinutes - 1),
            status: isDone ? 'completed' : 'in_progress',
            score: isDone ? 85 : s.score,
            passed: isDone ? true : s.passed
          };
        }
        return s;
      })
    );
    if (onShowToast) onShowToast('Live session progress tick simulated!', 'info');
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.assessmentTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedAssessmentId === 'all') return true;
    return s.assessmentTitle.toLowerCase().includes(selectedAssessmentId.toLowerCase());
  });

  const inProgressCount = sessions.filter(s => s.status === 'in_progress').length;
  const completedCount = sessions.filter(s => s.status === 'completed').length;
  const totalViolations = sessions.reduce((sum, s) => sum + s.violationsCount, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={36} color="var(--accent)" className="spin" />
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading live assessment monitor...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 wrap gap-2">
        <div>
          <button className="back-link" onClick={() => navigate('/assessment')} style={{ marginBottom: '0.25rem' }}>
            <ArrowLeft size={15} /> Back to Assessment Builder
          </button>
          <h1 className="page-title flex items-center gap-2">
            <Zap size={24} style={{ color: 'var(--accent)' }} /> Live Assessment Monitor
          </h1>
          <p className="page-subtitle">
            Real-time candidate progress, proctoring alerts, and automated scoring telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSimulateCandidateProgress}
            title="Simulate candidate answer progression"
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RotateCcw size={14} /> Refresh Activity
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/assessment/t/python-dev-test')}
            title="Launch Candidate Assessment Test View"
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Play size={14} /> Launch Test as Candidate
          </button>
        </div>
      </div>

      {/* Metric Telemetry Cards */}
      <div className="grid-4 mb-4">
        {[
          { label: 'Active In-Progress', val: inProgressCount, icon: <Clock size={20} color="#0984e3" />, color: '#0984e3' },
          { label: 'Completed Tests', val: completedCount, icon: <CheckCircle2 size={20} color="#00b894" />, color: '#00b894' },
          { label: 'Average Pass Rate', val: '86%', icon: <Award size={20} color="#6c5ce7" />, color: '#6c5ce7' },
          { label: 'Proctoring Flags', val: totalViolations, icon: <ShieldAlert size={20} color="#e17055" />, color: '#e17055' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ borderTop: `3px solid ${k.color}` }}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted font-medium">{k.label}</span>
              {k.icon}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '0.4rem', color: 'var(--text-primary)' }}>
              {k.val}
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Filters Bar */}
        <div className="flex items-center justify-between mb-4 wrap gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 260 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '2rem', fontSize: '0.84rem' }}
                placeholder="Search candidates or tests..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              value={selectedAssessmentId}
              onChange={e => setSelectedAssessmentId(e.target.value)}
              style={{ fontSize: '0.84rem', padding: '0.45rem 0.75rem' }}
            >
              <option value="all">All Assessments ({assessments.length})</option>
              {assessments.map(a => (
                <option key={a.id} value={a.title}>{a.title}</option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleCopyInviteLink()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {copiedLink ? <Check size={14} color="#00b894" /> : <Copy size={14} />}
            {copiedLink ? 'Copied!' : 'Copy Public Test Link'}
          </button>
        </div>

        {/* Live Candidates Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Assessment Test</th>
                <th>Live Status</th>
                <th>Progress &amp; Questions</th>
                <th>Time Left</th>
                <th>Proctor Flags</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No matching candidate sessions found.
                  </td>
                </tr>
              ) : (
                filteredSessions.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="candidate-avatar-sm" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                          {s.candidateName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{s.candidateName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.candidateEmail}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{s.assessmentTitle}</span>
                    </td>

                    <td>
                      {s.status === 'in_progress' ? (
                        <span className="badge badge-blue flex items-center gap-1">
                          <Loader2 size={11} className="spin" /> In Progress
                        </span>
                      ) : s.status === 'completed' ? (
                        <span className="badge badge-green flex items-center gap-1">
                          <CheckCircle2 size={11} /> Completed ({s.score}%)
                        </span>
                      ) : (
                        <span className="badge badge-yellow">Invited</span>
                      )}
                    </td>

                    <td style={{ minWidth: 160 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                        <span className="font-semibold">{s.answeredCount}/{s.totalQuestions} answered</span>
                        <span className="text-muted">{s.progress}%</span>
                      </div>
                      <div className="progress-bar-wrap" style={{ height: 6 }}>
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${s.progress}%`,
                            background: s.status === 'completed' ? '#00b894' : 'var(--accent)'
                          }}
                        />
                      </div>
                    </td>

                    <td style={{ fontSize: '0.84rem' }}>
                      {s.status === 'completed' ? (
                        <span className="text-muted">Finished</span>
                      ) : s.status === 'in_progress' ? (
                        <span style={{ fontWeight: 600, color: s.timeRemainingMinutes < 10 ? '#e17055' : 'inherit' }}>
                          {s.timeRemainingMinutes} min
                        </span>
                      ) : (
                        <span className="text-muted">45 min limit</span>
                      )}
                    </td>

                    <td>
                      {s.violationsCount > 0 ? (
                        <span className="badge badge-red flex items-center gap-1">
                          <AlertTriangle size={11} /> {s.violationsCount} Alert
                        </span>
                      ) : (
                        <span className="badge badge-green">Clean (0)</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedSessionForModal(s)}
                        title="View Detailed Results"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        <Eye size={12} /> Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Session Inspection Modal */}
      {selectedSessionForModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: '1.75rem', position: 'relative' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
              Candidate Assessment Report
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Telemetry breakdown for <strong>{selectedSessionForModal.candidateName}</strong> ({selectedSessionForModal.assessmentTitle})
            </p>

            <div className="grid-2 mb-3" style={{ gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--card-hover-bg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, textTransform: 'capitalize' }}>
                  {selectedSessionForModal.status.replace('_', ' ')}
                </div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--card-hover-bg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assessment Score</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent)' }}>
                  {selectedSessionForModal.score !== undefined ? `${selectedSessionForModal.score}%` : 'In Progress'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Module Performance Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {[
                  { name: 'Core Python', score: 95 },
                  { name: 'Advanced Python & Async', score: 88 },
                  { name: 'SQL & Database Architecture', score: 85 },
                ].map((mod, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                      <span className="font-semibold">{mod.name}</span>
                      <span className="font-bold">{mod.score}%</span>
                    </div>
                    <div className="progress-bar-wrap" style={{ height: 6 }}>
                      <div className="progress-bar-fill" style={{ width: `${mod.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedSessionForModal(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSelectedSessionForModal(null);
                  navigate(`/summary?candidateId=cand-1`);
                }}
              >
                View Full Candidate Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
