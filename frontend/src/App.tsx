import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Users, BarChart2, Award, ClipboardCheck,
  FileText, Settings, Bell, HelpCircle, ChevronDown,
  ArrowLeft, Download, Pencil, Trash2, Plus, Check, X, Search,
  CalendarDays, UserCheck,
  ShieldCheck, Copy, Mic,
  RefreshCw, Star, Zap, User,
  Moon, Sun
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import { useDashboard } from './hooks/useDashboard';
import { AuthModal } from './components/AuthModal';
import { ResumeService } from './services/resume.service';
import { JobService } from './services/job.service';
import { AnalysisService } from './services/analysis.service';
import type { ResumeRecord } from './types/resume.types';
import { extractResumeText } from './lib/textExtractor';
import { AnalysisResult } from './components/analysis/AnalysisResult';
import { CandidatesPage } from './components/candidates/CandidatesPage';
import { RankingPage } from './components/ranking/RankingPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { ATSCheckPage } from './components/ats/ATSCheckPage';
import { DuplicateDetectionPage } from './components/duplicate/DuplicateDetectionPage';
import { AssessmentBuilderPage } from './components/assessment/AssessmentBuilderPage';
import { CandidateAssessmentPage } from './components/assessment/CandidateAssessmentPage';
import { SettingsLayout } from './components/settings/SettingsLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logger } from './lib/logger';
import { CandidateService } from './services/candidate.service';
import { SettingsService } from './services/settings.service';
import type { TeamMember } from './types/settings.types';

// ===================== TOAST SYSTEM =====================
type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: number; type: ToastType; message: string; }
const ToastContext = React.createContext<(msg: string, type?: ToastType) => void>(() => {});

export interface DashboardContextType extends ReturnType<typeof useDashboard> {
  openAuthModal: (mode?: 'signin' | 'signup') => void;
}
const DashboardContext = React.createContext<DashboardContextType | null>(null);

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };
  const icons: Record<ToastType, string> = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{icons[t.type]}</span>
            <span>{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ===================== ANIMATED COUNTER =====================
const AnimatedCounter = ({ target, duration = 1200 }: { target: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count}</>;
};

// ===================== NAV ITEM =====================
const NavItem = ({ to, icon: Icon, label, badge }: { to: string; icon: any; label: string; badge?: number }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link to={to} className={`nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={17} />
      {label}
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </Link>
  );
};

// ===================== NOTIFICATION PANEL =====================
const NotifPanel = ({
  onClose,
  items = [],
  onClearAll,
  onItemClick
}: {
  onClose: () => void;
  items?: any[];
  onClearAll?: () => void;
  onItemClick?: (item: any) => void;
}) => {
  const navigate = useNavigate();
  return (
    <div className="notif-panel" style={{ width: 340, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', borderRadius: 12, overflow: 'hidden' }}>
      <div className="notif-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="font-bold text-sm">Notifications</span>
          {items.length > 0 && (
            <span style={{ fontSize: '0.72rem', background: 'var(--accent)', color: '#fff', padding: '0.12rem 0.45rem', borderRadius: 10, fontWeight: 700 }}>
              {items.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {items.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.75rem',
                color: 'var(--accent)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.2rem 0.4rem',
                borderRadius: 4
              }}
              title="Mark all notifications as read"
            >
              Clear All
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Close">
            <X size={15} />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '2.2rem 1.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--card-hover-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem',
            color: 'var(--text-muted)'
          }}>
            <Bell size={22} style={{ opacity: 0.5 }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            No notifications yet
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            You're all caught up! ✨
          </div>
        </div>
      ) : (
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {items.map((item, idx) => {
            const isShortlisted = item.candidate_status === 'shortlisted' || item.activity_type?.includes('shortlist');
            const isRejected = item.candidate_status === 'rejected' || item.activity_type?.includes('reject');
            const isPending = item.candidate_status === 'pending_review' || item.candidate_status === 'screening';
            const iconBg = isShortlisted ? 'rgba(0, 184, 148, 0.15)' : isRejected ? 'rgba(255, 118, 117, 0.15)' : isPending ? 'rgba(253, 203, 110, 0.2)' : 'rgba(108, 92, 231, 0.15)';
            const iconColor = isShortlisted ? 'var(--green)' : isRejected ? 'var(--red)' : isPending ? '#b45309' : 'var(--accent)';
            const iconSymbol = isShortlisted ? '⭐' : isRejected ? '❌' : isPending ? '⏳' : '📄';

            return (
              <div
                key={item.id || idx}
                onClick={() => {
                  if (onItemClick) onItemClick(item);
                  onClose();
                  navigate('/candidates');
                }}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: iconBg,
                  color: iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  flexShrink: 0,
                  marginTop: 2
                }}>
                  {iconSymbol}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                    {item.candidate_name || item.file_name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.3 }}>
                    {item.activity_message || (item.candidate_status ? `Status: ${item.candidate_status.replace('_', ' ')}` : item.activity_type)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ===================== APP SHELL (persistent — sidebar state survives navigation) =====================
const AppShell = () => {
  const [showNotif, setShowNotif] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const notifRef = useRef<HTMLDivElement>(null);
  const addToast = React.useContext(ToastContext);
  const dashboard = useDashboard();
  const { isAuthenticated, user, signOut, refresh, data } = dashboard;
  const navigate = useNavigate();

  // Track cleared / read notifications in localStorage
  const [clearedNotifIds, setClearedNotifIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cleared_notif_ids') || '[]');
    } catch {
      return [];
    }
  });

  const allNotifications = data?.recentActivity || [];
  const activeNotifications = allNotifications.filter(
    (item: any) => !clearedNotifIds.includes(item.id || item.created_at)
  );
  const unreadCount = activeNotifications.length;

  const handleClearAllNotifs = () => {
    const allIds = allNotifications.map((item: any) => item.id || item.created_at).filter(Boolean);
    const updated = Array.from(new Set([...clearedNotifIds, ...allIds]));
    setClearedNotifIds(updated);
    localStorage.setItem('cleared_notif_ids', JSON.stringify(updated));
    addToast('All notifications marked as read', 'info');
  };

  const handleDismissNotif = (item: any) => {
    const id = item.id || item.created_at;
    if (id) {
      const updated = [...clearedNotifIds, id];
      setClearedNotifIds(updated);
      localStorage.setItem('cleared_notif_ids', JSON.stringify(updated));
    }
  };

  // Theme mode state (persisted in localStorage)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <DashboardContext.Provider value={{
      ...dashboard,
      openAuthModal: (mode = 'signin') => {
        setAuthMode(mode);
        setAuthModalOpen(true);
      }
    }}>
      <div className="app-wrapper">
        {/* ===== FULL-WIDTH DARK TOP NAVBAR ===== */}
        <header className="top-navbar">
          {/* Left: Hamburger + Brand */}
          <div className="navbar-left">
            <button className="navbar-hamburger" onClick={() => setSidebarOpen(v => !v)} title="Toggle Sidebar">
              <span></span><span></span><span></span>
            </button>
            <Link to="/" className="navbar-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="navbar-brand-icon">
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="9" stroke="white" strokeWidth="2"/>
                  <path d="M7 11l3.5 3.5 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="navbar-brand-text">AI RESUME SCREENING</span>
            </Link>
          </div>

          {/* Center: Nav Links */}
          <nav className="navbar-links">
            <Link to="/analysis" className="navbar-link">
              <BarChart2 size={14} /> Resume Analysis
            </Link>
            <Link to="/ranking" className="navbar-link">
              <Award size={14} /> Candidate Ranking
            </Link>
            <Link to="/upload" className="navbar-link">
              <FileText size={14} /> Resumes
            </Link>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="navbar-link"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowNotif(v => !v);
                }}
                title="Notifications"
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                <Bell size={14} /> Notifications
                {unreadCount > 0 && <span className="navbar-notif-badge">{unreadCount}</span>}
              </button>
            </div>
            <Link to="/settings" className="navbar-link">
              <HelpCircle size={14} /> Help Centre
            </Link>
          </nav>

          {/* Right: Notifications + Language + Auth */}
          <div className="navbar-right">
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="navbar-lang"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowNotif(v => !v);
                }}
                title="Notifications"
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0.3rem 0.65rem'
                }}
              >
                <Bell size={14} />
                <span>Alerts</span>
                {unreadCount > 0 && <span className="navbar-notif-badge">{unreadCount}</span>}
              </button>
              {showNotif && (
                <NotifPanel
                  onClose={() => setShowNotif(false)}
                  items={activeNotifications}
                  onClearAll={handleClearAllNotifs}
                  onItemClick={handleDismissNotif}
                />
              )}
            </div>

            <button className="navbar-lang" onClick={() => addToast('System Language: English (US)', 'info')}>
              🌐 English <ChevronDown size={13} />
            </button>
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link
                  to="/profile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    padding: '0.3rem 0.6rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    transition: 'background 0.2s ease'
                  }}
                  title="View Recruiter Profile"
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', overflow: 'hidden' }}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      user.full_name?.charAt(0).toUpperCase() || 'R'
                    )}
                  </div>
                  <span>{user.full_name}</span>
                  <ChevronDown size={13} style={{ opacity: 0.7 }} />
                </Link>
                <button 
                  onClick={async () => {
                    await signOut();
                    addToast('Signed out successfully', 'info');
                  }}
                  className="navbar-signin"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button className="navbar-signin" onClick={() => { setAuthMode('signin'); setAuthModalOpen(true); }}>
                  Sign In
                </button>
                <button className="navbar-signup" onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}>
                  + Sign Up
                </button>
              </>
            )}
          </div>
        </header>

        {/* ===== SIDEBAR + CONTENT ROW ===== */}
        <div className="app-container">
          {/* Sidebar */}
          <aside className="sidebar" style={{
            width: sidebarOpen ? 'var(--sidebar-width)' : '0',
            overflow: sidebarOpen ? 'auto' : 'hidden',
            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0,
            position: 'relative',
            height: 'calc(100vh - 52px)',
          }}>
            <nav className="sidebar-nav" style={{ paddingTop: '1rem' }}>
              <div className="sidebar-section-title">Main</div>
              <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
              <NavItem to="/upload" icon={Upload} label="Upload Resume" />
              <NavItem to="/candidates" icon={Users} label="Candidates" />

              <div className="sidebar-section-title">Analysis</div>
              <NavItem to="/analysis" icon={BarChart2} label="Analysis Result" />
              <NavItem to="/ranking" icon={Award} label="Ranking" />
              <NavItem to="/ats-check" icon={ShieldCheck} label="ATS Check" />
              <NavItem to="/duplicate" icon={Copy} label="Duplicate Detection" />

              <div className="sidebar-section-title">Assessment</div>
              <NavItem to="/assessment" icon={ClipboardCheck} label="Assessment" />

              <div className="sidebar-section-title">System</div>
              <NavItem to="/settings" icon={Settings} label="Settings" />
              <NavItem to="/profile" icon={User} label="Profile" />
              <button
                type="button"
                id="theme-toggle-btn"
                className="nav-item"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-sidebar)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  padding: '0.62rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  transition: 'var(--transition)',
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                {theme === 'dark' ? <Moon size={17} style={{ color: '#a29bfe' }} /> : <Sun size={17} style={{ color: '#fdcb6e' }} />}
                <span style={{ flex: 1 }}>Theme</span>
                <span
                  className="nav-badge"
                  style={{
                    background: theme === 'dark' ? 'rgba(162, 155, 254, 0.2)' : 'rgba(253, 203, 110, 0.25)',
                    color: theme === 'dark' ? '#c4b5fd' : '#b45309',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.65rem'
                  }}
                >
                  {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </span>
              </button>
            </nav>
          </aside>

          {/* Main content — Routes live here so sidebar state persists */}
          <main className="main-content" style={{ flex: 1, minWidth: 0 }}>
            <div className="page-body">
              <ErrorBoundary isolateSection fallbackTitle="Page View Interrupted">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/upload" element={<UploadResume />} />
                  <Route path="/candidates" element={<Candidates />} />
                  <Route path="/analysis" element={<AnalysisResult onNavigateBack={() => navigate('/upload')} />} />
                  <Route path="/ranking" element={<CandidateRanking />} />
                  <Route path="/summary" element={<CandidateSummary />} />
                  <Route path="/ats-check" element={<ATSCheckPage onShowToast={addToast} />} />
                  <Route path="/duplicate" element={<DuplicateDetectionPage onShowToast={addToast} />} />
                  <Route path="/virtual-interview" element={<VirtualInterview />} />
                  <Route path="/assessment" element={<AssessmentBuilderPage onShowToast={addToast} />} />
                  <Route path="/assessment/t/:shareToken" element={<CandidateAssessmentPage />} />
                  <Route path="/live-assessment" element={<LiveAssessment />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route
                    path="/profile"
                    element={
                      <ProfilePage
                        addToast={addToast}
                        onOpenAuth={() => {
                          setAuthMode('signin');
                          setAuthModalOpen(true);
                        }}
                      />
                    }
                  />
                  <Route path="/users" element={<UserManagement />} />
                </Routes>
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onSuccess={() => {
          refresh();
        }}
        addToast={addToast}
      />
    </DashboardContext.Provider>
  );
};

// ===================== 1. DASHBOARD =====================
const Dashboard = () => {
  const navigate = useNavigate();
  const addToast = React.useContext(ToastContext);
  const dashboard = React.useContext(DashboardContext);
  const data = dashboard?.data;
  const loading = dashboard?.loading;
  const isAuthenticated = dashboard?.isAuthenticated ?? false;
  const user = dashboard?.user;
  const refresh = dashboard?.refresh;

  const totalResumes = data?.stats?.totalResumes ?? 0;
  const shortlisted = data?.stats?.shortlisted ?? 0;
  const rejected = data?.stats?.rejected ?? 0;
  const pendingReview = data?.stats?.pendingReview ?? 0;

  const donutData = [
    { name: 'Shortlisted', value: shortlisted, color: '#0984e3' },
    { name: 'Pending Review', value: pendingReview, color: '#fdcb6e' },
    { name: 'Rejected', value: rejected, color: '#e17055' },
  ];

  const barData = (data?.candidatesByStatus && data.candidatesByStatus.length > 0)
    ? data.candidatesByStatus
    : [
        { name: 'Shortlisted', value: 0, fill: '#0984e3' },
        { name: 'Pending Review', value: 0, fill: '#fdcb6e' },
        { name: 'Rejected', value: 0, fill: '#e17055' },
      ];

  const topSkills = (data?.topSkills && data.topSkills.length > 0)
    ? data.topSkills
    : [];

  const lineData = (data?.weeklyResumeTrend && data.weeklyResumeTrend.length > 0)
    ? data.weeklyResumeTrend
    : [
        { day: 'Mon', resumes: 0 }, { day: 'Tue', resumes: 0 }, { day: 'Wed', resumes: 0 },
        { day: 'Thu', resumes: 0 }, { day: 'Fri', resumes: 0 }, { day: 'Sat', resumes: 0 }, { day: 'Sun', resumes: 0 },
      ];

  const recentActivity = (data?.recentActivity && data.recentActivity.length > 0)
    ? data.recentActivity.map(a => ({
        file: a.file_name,
        status: a.candidate_status ? (a.candidate_status.charAt(0).toUpperCase() + a.candidate_status.slice(1).replace('_', ' ')) : (a.activity_type.charAt(0).toUpperCase() + a.activity_type.slice(1)),
        statusClass: a.candidate_status === 'shortlisted' ? 'badge-green' : a.candidate_status === 'rejected' ? 'badge-red' : a.candidate_status === 'pending_review' ? 'badge-yellow' : 'badge-blue',
        time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
    : [];

  const topCandidates = (data?.topCandidates && data.topCandidates.length > 0)
    ? data.topCandidates.map((c, i) => ({
        rank: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1),
        name: c.name,
        role: c.role,
        score: c.score,
        statusClass: c.status_class,
        status: c.status ? (c.status.charAt(0).toUpperCase() + c.status.slice(1).replace('_', ' ')) : 'Active',
      }))
    : [];

  const pipelineSteps = [
    { label: 'Applied', val: data?.pipeline?.applied ?? 0, icon: <FileText size={15}/> },
    { label: 'Screening', val: data?.pipeline?.screening ?? 0, icon: <Search size={15}/> },
    { label: 'Shortlisted', val: data?.pipeline?.shortlisted ?? 0, icon: <Star size={15}/> },
    { label: 'Interview', val: data?.pipeline?.interview ?? 0, icon: <UserCheck size={15}/> },
    { label: 'Hired', val: data?.pipeline?.hired ?? 0, icon: <Check size={15}/> },
  ];

  const kpis = [
    { icon: '🎯', label: 'Total Resumes', val: totalResumes, trend: 'Total uploaded', borderColor: '#0984e3', path: '/candidates' },
    { icon: '⭐', label: 'Shortlisted Candidates', val: shortlisted, trend: 'From AI screening', borderColor: '#fdcb6e', path: '/candidates?status=shortlisted' },
    { icon: '❌', label: 'Rejected Candidates', val: rejected, trend: 'From AI screening', borderColor: '#e17055', path: '/candidates?status=rejected' },
    { icon: '⏳', label: 'Pending Review', val: pendingReview, trend: 'Awaiting action', borderColor: '#6c5ce7', path: '/candidates?status=pending_review' },
  ];

  // Derive actual date range from real query data — no fake dates
  const dateRangeLabel = (() => {
    const activities = data?.recentActivity || [];
    if (activities.length === 0 && (!totalResumes || totalResumes === 0)) {
      return 'No activity yet';
    }
    if (activities.length > 0) {
      const dates = activities.map(a => new Date(a.created_at).getTime()).filter(t => !isNaN(t));
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const minStr = minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const maxStr = maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return minStr === maxStr.slice(0, minStr.length) ? maxStr : `${minStr} – ${maxStr}`;
      }
    }
    return totalResumes > 0 ? 'Active Pipeline' : 'No activity yet';
  })();

  return (
    <>
      {/* Dynamic Welcome Heading */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>
            Welcome, <span style={{ color: 'var(--accent)' }}>{user?.full_name || 'Admin'}</span> 👋
          </h1>
          <p className="text-secondary text-sm mt-1">Here's what's happening with your hiring pipeline today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => {
              if (refresh) refresh();
              addToast('Refreshed from Supabase!', 'success');
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--card-bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '0.42rem 0.85rem', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            <CalendarDays size={14} /> {dateRangeLabel}
          </div>
        </div>
      </div>

      {/* Sign-in prompt for unauthenticated users */}
      {!isAuthenticated && (
        <div style={{
          background: 'var(--card-hover-bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '0.6rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
        }}>
          <div>
            <strong>Get Started</strong> — Sign in or create a recruiter account to access your live hiring pipeline and AI screening data.
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => dashboard?.openAuthModal('signin')} style={{ marginLeft: '1rem', flexShrink: 0 }}>
            Sign In / Sign Up
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid-4 mb-4">
        {kpis.map((k, i) => (
          <div key={i} className="card kpi-card" style={{ borderTop: `3px solid ${k.borderColor}`, cursor: 'pointer' }}
            onClick={() => navigate(k.path)}
            title={`Click to view ${k.label.toLowerCase()}`}>
            <div className="kpi-top">
              <span className="kpi-icon">{k.icon}</span>
              <span className="kpi-title">{k.label}</span>
            </div>
            <div className="kpi-val"><AnimatedCounter target={k.val} /></div>
            <div className="kpi-trend" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{k.trend}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>View Details →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row */}
      <div className="grid-3 mb-4">
        {/* Pipeline Overview + Donut */}
        <div className="card">
          <div className="section-header"><span className="section-title">Pipeline Overview</span></div>
          <div className="flex items-center gap-2">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" startAngle={90} endAngle={-270}>
                  {donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {donutData.map((d, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flexShrink: 0 }}></div>
                  <span className="text-sm">{d.name}</span>
                  <span className="text-sm font-bold" style={{ marginLeft: 'auto' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
            <div className="pipeline-flow">
              {pipelineSteps.map((step, i) => (
                <React.Fragment key={i}>
                  <div className="pipeline-step">
                    <div className="pipeline-step-icon">{step.icon}</div>
                    <div className="pipeline-step-num">{step.val}</div>
                    <div className="pipeline-step-name">{step.label}</div>
                  </div>
                  {i < pipelineSteps.length - 1 && <div className="pipeline-arrow">→</div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="section-header">
            <span className="section-title">Recent Activity</span>
            <Link to="/candidates" className="section-link">View All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                No candidate activity recorded yet.
              </div>
            ) : recentActivity.map((a, i) => (
              <div key={i} className="flex items-center justify-between" style={{ padding: '0.45rem 0', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div className="flex items-center gap-2">
                  <FileText size={14} color="#9ca3af" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{a.file}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${a.statusClass}`}>{a.status}</span>
                  <span className="text-xs text-muted">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Skills */}
        <div className="card">
          <div className="section-header">
            <span className="section-title">Top Skills in Resumes</span>
            <Link to="/reports" className="section-link">Full Report →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {topSkills.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                No candidate skills recorded yet.
              </div>
            ) : topSkills.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="text-sm font-bold">{s.pct}%</span>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${s.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-3 mb-4">
        {/* Candidates by Status Bar Chart */}
        <div className="card">
          <div className="section-title mb-3">Candidates by Status</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 4, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 12 }} />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Trend */}
        <div className="card">
          <div className="section-title mb-3">Weekly Resume Trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData} margin={{ top: 4, right: 4, bottom: 4, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 12 }} />
              <Line type="monotone" dataKey="resumes" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--accent)' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Candidates */}
        <div className="card">
          <div className="section-header">
            <span className="section-title">Recent Top Candidates</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {topCandidates.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                    No candidates found.
                  </td>
                </tr>
              ) : topCandidates.map((c, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.rank} {c.name}</div>
                    <div className="text-xs text-muted">{c.role}</div>
                  </td>
                  <td style={{ fontWeight: 800 }}>{c.score}</td>
                  <td><span className={`badge ${c.statusClass}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
            <Link to="/candidates" className="section-link">View All Candidates →</Link>
          </div>
        </div>
      </div>
    </>
  );
};

// ===================== 2. UPLOAD RESUME =====================
const UploadResume = () => {
  const addToast = React.useContext(ToastContext);
  const dashboard = React.useContext(DashboardContext);
  const isAuthenticated = dashboard?.isAuthenticated ?? false;
  const user = dashboard?.user;
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Staged and uploaded resumes
  const [recruiterResumes, setRecruiterResumes] = useState<ResumeRecord[]>([]);
  const [selectedLocalFiles, setSelectedLocalFiles] = useState<Array<{
    file: File;
    id: string;
    status: 'ready' | 'uploading' | 'uploaded' | 'error';
    error?: string;
  }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');

  // Fetch platform resumes on mount so dashboard and workspace are never empty
  useEffect(() => {
    ResumeService.getRecruiterResumes(user?.id).then(resumes => {
      setRecruiterResumes(resumes);
    });
  }, [isAuthenticated, user?.id]);

  const removeSkill = (s: string) => setSkills(prev => prev.filter(x => x !== s));
  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills(prev => [...prev, newSkill.trim()]);
      setNewSkill('');
      addToast(`Skill "${newSkill.trim()}" added`, 'success');
    }
  };

  // Handle incoming file selection (via drag/drop or picker)
  const handleFilesSelected = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    const newFiles: Array<{ file: File; id: string; status: 'ready' | 'uploading' | 'uploaded' | 'error'; error?: string }> = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const validation = ResumeService.validateFile(file);

      if (!validation.valid) {
        addToast(validation.error || 'Invalid file', 'error');
        continue;
      }

      // Check if already in list
      const alreadyStaged = selectedLocalFiles.some(f => f.file.name === file.name && f.file.size === file.size);
      const alreadyUploaded = recruiterResumes.some(r => r.file_name === file.name && Number(r.file_size) === file.size);
      if (alreadyStaged || alreadyUploaded) {
        addToast(`"${file.name}" is already in your resume list`, 'info');
        continue;
      }

      newFiles.push({
        file,
        id: crypto.randomUUID(),
        status: 'ready'
      });
    }

    if (newFiles.length > 0) {
      setSelectedLocalFiles(prev => [...prev, ...newFiles]);
      addToast(`${newFiles.length} file(s) selected`, 'success');

      // If user is authenticated, immediately upload to Supabase Storage
      if (isAuthenticated && user?.id) {
        uploadStagedFiles(newFiles);
      }
    }
  };

  const uploadStagedFiles = async (filesToUpload: typeof selectedLocalFiles) => {
    if (!user?.id) return;
    setIsUploading(true);

    for (const item of filesToUpload) {
      setSelectedLocalFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));
      const res = await ResumeService.uploadResume(item.file, user.id);

      if (res.success && res.resume) {
        setSelectedLocalFiles(prev => prev.filter(f => f.id !== item.id));
        setRecruiterResumes(prev => [res.resume!, ...prev]);
        addToast(`Uploaded: ${item.file.name}`, 'success');
        if (dashboard?.refresh) dashboard.refresh();
      } else {
        setSelectedLocalFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: res.error } : f));
        addToast(`Failed to upload ${item.file.name}: ${res.error}`, 'error');
      }
    }
    setIsUploading(false);
  };

  const handleDeleteResume = async (resume: ResumeRecord) => {
    const ok = await ResumeService.deleteResume(resume.id, resume.file_path);
    if (ok) {
      setRecruiterResumes(prev => prev.filter(r => r.id !== resume.id));
      addToast(`Removed ${resume.file_name}`, 'info');
      if (dashboard?.refresh) dashboard.refresh();
    } else {
      addToast(`Could not delete ${resume.file_name}`, 'error');
    }
  };

  // Job Description File Upload handler
  const handleJdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addToast('Job description file exceeds 10MB limit', 'error');
      return;
    }

    try {
      addToast(`Extracting job details from "${file.name}"...`, 'info');
      const text = await extractResumeText(file);
      if (text && text.trim().length > 20) {
        setJobDescription(text);
        addToast('Job description loaded from file!', 'success');
      } else {
        addToast('Could not extract readable text from job file', 'warning');
      }
    } catch (err) {
      logger.error('UploadResume', 'Error reading job description file', err);
      addToast('Error reading job description file', 'error');
    }
  };

  // Main Analyze Resumes Trigger
  const handleAnalyze = async () => {
    if (!isAuthenticated || !user?.id) {
      addToast('Please sign in to run AI Resume Screening on your pipeline.', 'info');
      dashboard?.openAuthModal('signin');
      return;
    }

    // If there are staged files still uploading
    if (selectedLocalFiles.length > 0) {
      await uploadStagedFiles(selectedLocalFiles);
    }

    // Refresh available resumes
    const freshResumes = await ResumeService.getRecruiterResumes(user.id);
    setRecruiterResumes(freshResumes);

    if (freshResumes.length === 0) {
      addToast('Please upload at least one candidate resume (PDF/DOCX) first.', 'warning');
      return;
    }

    if (!jobDescription.trim()) {
      addToast('Please provide a job description and required skills.', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('Saving job description & requirements...');

    try {
      // 1. Save or update job in Supabase
      const jobRes = await JobService.saveJob({
        recruiterId: user.id,
        title: jobTitle,
        description: jobDescription,
        skills
      });

      if (!jobRes.success || !jobRes.job) {
        throw new Error(jobRes.error || 'Failed to save job description');
      }

      const jobId = jobRes.job.id;
      const resumeIds = freshResumes.map(r => r.id);

      setAnalysisStep(`Parsing and matching ${resumeIds.length} resume(s)...`);

      // 2. Run analysis pipeline
      const pipelineResult = await AnalysisService.analyzeResumes({
        recruiterId: user.id,
        jobId,
        resumeIds
      });

      if (!pipelineResult.success && pipelineResult.failedCount === resumeIds.length) {
        throw new Error(pipelineResult.error || 'Resume screening analysis failed');
      }

      // 3. Save latest result in sessionStorage for Screen 4 (Analysis Result)
      sessionStorage.setItem('latest_analysis_result', JSON.stringify(pipelineResult));
      sessionStorage.setItem('latest_job_id', jobId);

      // 4. Refresh Screen 1 Dashboard data
      if (dashboard?.refresh) {
        dashboard.refresh();
      }

      addToast(
        `AI Analysis complete! ${pipelineResult.successCount} resume(s) evaluated and scored.`,
        'success'
      );

      const firstResult = (pipelineResult.results || []).find((r: any) => r.success) || pipelineResult.results?.[0];
      if (firstResult?.resumeId) {
        navigate(`/analysis?resumeId=${firstResult.resumeId}&jobId=${jobId}`);
      } else {
        navigate('/candidates');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const totalFilesCount = recruiterResumes.length + selectedLocalFiles.length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Upload Resumes &amp; Job Description</h1>
        <p className="page-subtitle">Upload candidate resumes and provide job details to start AI screening.</p>
      </div>

      {!isAuthenticated && (
        <div style={{
          background: 'var(--card-hover-bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '0.65rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
        }}>
          <div>
            <strong>Preview Mode</strong> — Sign in to upload your real candidate resumes directly into Supabase Storage.
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => dashboard?.openAuthModal('signin')}
          >
            Sign In / Sign Up
          </button>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Column: Resumes */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem' }}>📁 Upload Resumes</h3>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept=".pdf,.docx,.doc"
            onChange={e => handleFilesSelected(e.target.files)}
          />

          {/* Drag & Drop Zone */}
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            style={{
              borderColor: isDragging ? 'var(--accent)' : 'var(--border)',
              background: isDragging ? 'var(--accent-light)' : 'var(--card-bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              handleFilesSelected(e.dataTransfer.files);
            }}
          >
            <div className="upload-zone-icon">
              <Upload size={24} color="white" />
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Drag &amp; Drop resume files here
            </div>
            <div className="text-muted text-xs">or click to browse</div>
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={e => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose Files
            </button>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Supports: PDF, DOCX (Max 10MB per file)
            </div>
          </div>

          {/* Uploaded / Staged Files List */}
          <div style={{ marginTop: '1.25rem' }}>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">Resumes ({totalFilesCount})</span>
              {isUploading && (
                <span className="badge badge-blue flex items-center gap-1">
                  <RefreshCw size={11} className="spin" /> Uploading to Supabase...
                </span>
              )}
              {!isUploading && totalFilesCount > 0 && (
                <span className="badge badge-green">Ready to Screen</span>
              )}
            </div>

            <div className="file-list" style={{ maxHeight: 280, overflowY: 'auto' }}>
              {/* Authenticated Uploaded Resumes */}
              {isAuthenticated && recruiterResumes.map((r) => (
                <div key={r.id} className="file-item">
                  <div className="file-item-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={15} color="var(--accent)" />
                    <span title={r.file_name}>{r.file_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="file-item-size">
                      {r.file_size ? `${(Number(r.file_size) / (1024 * 1024)).toFixed(1)} MB` : 'PDF'}
                    </span>
                    <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
                      {r.processing_status}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteResume(r); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                      title="Remove resume"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Local Staged Files */}
              {isAuthenticated && selectedLocalFiles.map((f) => (
                <div key={f.id} className="file-item" style={{ background: 'var(--card-hover-bg)' }}>
                  <div className="file-item-name">
                    <FileText size={15} color="#64748b" />
                    <span>{f.file.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="file-item-size">
                      {(f.file.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    {f.status === 'uploading' ? (
                      <RefreshCw size={13} className="spin" color="var(--accent)" />
                    ) : f.status === 'error' ? (
                      <span className="badge badge-red">Error</span>
                    ) : (
                      <span className="badge badge-yellow">Pending Upload</span>
                    )}
                  </div>
                </div>
              ))}

              {totalFilesCount === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                  {isAuthenticated ? 'No resumes uploaded yet. Drag & drop files above.' : 'Sign in to upload and manage your candidate resumes.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Job Description */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>📝 Job Description</h3>
            {/* Optional Upload JD File */}
            <div>
              <input
                type="file"
                ref={jdFileInputRef}
                style={{ display: 'none' }}
                accept=".txt,.pdf,.docx"
                onChange={handleJdFileUpload}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => jdFileInputRef.current?.click()}
                title="Upload a JD document file"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                Upload JD File
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Job Role / Title</label>
            <input
              className="form-input"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Python Developer"
            />
          </div>

          <p className="text-sm text-muted mb-2">Paste or type the job requirements to match candidates against.</p>
          <textarea
            className="form-textarea"
            style={{ minHeight: '135px' }}
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            placeholder="Paste complete job description, required experience, education and technologies..."
          />
          <div className="text-xs text-muted" style={{ textAlign: 'right', marginTop: '0.25rem' }}>
            {jobDescription.length}/10000 characters
          </div>

          <div style={{ marginTop: '0.85rem' }}>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">Required Skills</span>
              <span className="text-xs text-muted">{skills.length} skills added</span>
            </div>
            <div className="flex wrap gap-2 mb-3">
              {skills.map((s, i) => (
                <span key={i} className="skill-tag">
                  {s}
                  <button
                    onClick={() => removeSkill(s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', lineHeight: 1, padding: 0, marginLeft: '0.15rem' }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Add a skill..."
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
              />
              <button className="btn btn-secondary btn-sm" onClick={addSkill}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
        {analysisStep && (
          <div style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            <RefreshCw size={13} className="spin" style={{ display: 'inline', marginRight: 6 }} />
            {analysisStep}
          </div>
        )}
        <button
          className="btn btn-primary"
          style={{ padding: '0.75rem 3.5rem', fontSize: '0.95rem', borderRadius: 12 }}
          onClick={handleAnalyze}
          disabled={isAnalyzing || isUploading}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw size={17} className="spin" /> Analyzing Resumes with AI...
            </>
          ) : (
            <>
              <Zap size={17} /> Analyze Resumes
            </>
          )}
        </button>
      </div>
    </>
  );
};

// ===================== 3. CANDIDATES =====================
const Candidates = () => <CandidatesPage />;

// ===================== 4. ANALYSIS RESULT =====================
// Master modular Screen 4 implementation located in src/components/analysis/AnalysisResult.tsx

// ===================== 5. CANDIDATE RANKING =====================
const CandidateRanking = () => <RankingPage />;

// ===================== 6. CANDIDATE SUMMARY =====================
const CandidateSummary = () => {
  const navigate = useNavigate();

  return (
    <>
      <button className="back-link" onClick={() => navigate('/ranking')}><ArrowLeft size={16} /> Back to Candidates</button>
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block', color: 'var(--text-muted)' }} />
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Candidate Selected</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Select a candidate from the ranking page to view their full profile and resume details.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/ranking')}>Go to Candidate Ranking</button>
      </div>
    </>
  );
};

// ===================== 7. ATS COMPATIBILITY CHECK =====================
// Fully delegated to production ATSCheckPage component in src/components/ats/ATSCheckPage.tsx


// ===================== 8. DUPLICATE DETECTION =====================
// Fully delegated to production DuplicateDetectionPage component in src/components/duplicate/DuplicateDetectionPage.tsx


// ===================== 9. VIRTUAL INTERVIEW =====================
const VirtualInterview = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Virtual Interview</h1>
        <p className="page-subtitle">AI-powered virtual interviews for screened candidates.</p>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <Mic size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block', color: 'var(--text-muted)' }} />
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Interview Session Active</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Start an AI-powered virtual interview by selecting a shortlisted candidate from the ranking page.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/ranking')}>View Shortlisted Candidates</button>
      </div>
    </>
  );
};



// ===================== 11. LIVE ASSESSMENT =====================
const LiveAssessment = () => {
  const navigate = useNavigate();

  return (
    <>
      <button className="back-link" onClick={() => navigate('/assessment')}><ArrowLeft size={16} /> Back to Assessments</button>
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <ClipboardCheck size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block', color: 'var(--text-muted)' }} />
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Active Assessment Session</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Publish an assessment and assign it to candidates to monitor live progress here.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/assessment')}>Go to Assessment Builder</button>
      </div>
    </>
  );
};

// ===================== 12. REPORTS =====================
const Reports = () => {
  const addToast = React.useContext(ToastContext);
  const dashboard = React.useContext(DashboardContext);
  const data = dashboard?.data;

  const totalResumes = data?.stats?.totalResumes ?? 0;
  const shortlisted = data?.stats?.shortlisted ?? 0;
  const rejected = data?.stats?.rejected ?? 0;
  const selectionRate = totalResumes > 0 ? ((shortlisted / totalResumes) * 100).toFixed(1) + '%' : '0%';

  const [reportCandidates, setReportCandidates] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('All Time');
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    CandidateService.getCandidates({ page: 1, pageSize: 500, status: 'all' })
      .then(res => {
        const cList = res.candidates || [];
        setReportCandidates(cList);
        const roles = Array.from(new Set(cList.map(c => c.role).filter(Boolean))) as string[];
        setAvailableRoles(roles);
      })
      .catch(() => {});
  }, []);

  const filteredCandidates = selectedRole === 'All Roles'
    ? reportCandidates
    : reportCandidates.filter(c => c.role === selectedRole);

  const barData = [
    { range: '0-20', value: filteredCandidates.filter(c => c.score <= 20).length, fill: '#e17055' },
    { range: '21-40', value: filteredCandidates.filter(c => c.score > 20 && c.score <= 40).length, fill: '#e67e22' },
    { range: '41-60', value: filteredCandidates.filter(c => c.score > 40 && c.score <= 60).length, fill: '#fdcb6e' },
    { range: '61-80', value: filteredCandidates.filter(c => c.score > 60 && c.score <= 80).length, fill: '#0984e3' },
    { range: '81-100', value: filteredCandidates.filter(c => c.score > 80).length, fill: '#6c5ce7' },
  ];

  const topSkills = (data?.topSkills && data.topSkills.length > 0)
    ? data.topSkills
    : [];

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      if (dashboard?.refresh) await dashboard.refresh();
      const res = await CandidateService.getCandidates({ page: 1, pageSize: 500, status: 'all' });
      const cList = res.candidates || [];
      setReportCandidates(cList);
      const roles = Array.from(new Set(cList.map(c => c.role).filter(Boolean))) as string[];
      setAvailableRoles(roles);
      addToast('Report generated successfully with active pipeline data!', 'success');
    } catch {
      addToast('Failed to refresh report data.', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredCandidates.length === 0) {
      addToast('No candidate data available to export.', 'warning');
      return;
    }
    const headers = ['Candidate Name', 'Target Role', 'Match Score (%)', 'Resume Score (/100)', 'Status', 'Experience'];
    const rows = filteredCandidates.map(c => [
      `"${(c.candidateName || '').replace(/"/g, '""')}"`,
      `"${(c.role || '').replace(/"/g, '""')}"`,
      c.score ?? 0,
      c.resumeScore ?? 0,
      c.status || 'pending_review',
      `"${(c.experience || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `recruiter_analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Candidate analytics CSV exported successfully!', 'success');
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Reports &amp; Analytics</h1>
        <p className="page-subtitle">Deterministic evaluation metrics computed from active candidate screening data.</p>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-3 wrap">
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Data Filter</label>
            <select
              className="form-select"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.84rem' }}
            >
              <option value="All Time">All Available Records</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Current Quarter">Current Quarter</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filter by Role</label>
            <select
              className="form-select"
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.84rem' }}
            >
              <option value="All Roles">All Roles ({reportCandidates.length})</option>
              {availableRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div style={{ paddingTop: '1.35rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleGenerateReport}
              disabled={reportLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <BarChart2 size={15} className={reportLoading ? 'spin' : ''} />
              {reportLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
          <div style={{ paddingTop: '1.35rem' }}>
            <button
              className="btn btn-secondary"
              onClick={handleExportCSV}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="grid-4 mb-4">
        {[
          { label: 'Total Resumes', val: String(totalResumes), icon: '🎯', color: '#0984e3' },
          { label: 'Shortlisted', val: String(shortlisted), icon: '✅', color: '#00b894' },
          { label: 'Selection Rate', val: selectionRate, icon: '📈', color: '#6c5ce7' },
          { label: 'Rejected', val: String(rejected), icon: '❌', color: '#e17055' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '1.4rem' }}>{k.icon}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, marginTop: '0.25rem' }}>{k.val}</div>
            <div className="text-sm text-muted">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="section-title mb-3">Score Distribution</h3>
          {totalResumes === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              No screening data yet. Upload and analyze candidate resumes to see score distribution.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 4, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 12 }} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>{barData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card">
          <h3 className="section-title mb-3">Top Skills in Resumes</h3>
          {topSkills.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              No skills data yet. Upload and analyze candidate resumes to calculate verified skills.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {topSkills.map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1"><span className="text-sm font-semibold">{s.name}</span><span className="text-sm font-bold">{s.pct}%</span></div>
                  <div className="progress-bar-wrap" style={{ height: 10 }}>
                    <div className="progress-bar-fill" style={{ width: `${s.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ===================== 13. SETTINGS =====================
const SettingsPage = () => {
  const addToast = React.useContext(ToastContext);
  return <SettingsLayout addToast={addToast} />;
};

// ===================== 14. USER MANAGEMENT (Reuses existing team_members backend) =====================
const UserManagement = () => {
  const addToast = React.useContext(ToastContext);
  const dashboard = React.useContext(DashboardContext);
  const currentUser = dashboard?.user;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'recruiter' as TeamMember['role'] });
  const [saving, setSaving] = useState(false);

  const fetchMembers = () => {
    setLoading(true);
    SettingsService.getTeam()
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setMembers(res);
        } else if (currentUser) {
          setMembers([{
            id: currentUser.id || 'owner',
            full_name: currentUser.full_name || 'Admin',
            email: currentUser.email || '',
            role: 'admin',
            status: 'active',
            invited_at: new Date().toISOString(),
            joined_at: new Date().toISOString()
          }]);
        }
      })
      .catch(() => {
        if (currentUser) {
          setMembers([{
            id: currentUser.id || 'owner',
            full_name: currentUser.full_name || 'Admin',
            email: currentUser.email || '',
            role: 'admin',
            status: 'active',
            invited_at: new Date().toISOString(),
            joined_at: new Date().toISOString()
          }]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, [currentUser]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) return;
    setSaving(true);
    try {
      const added = await SettingsService.inviteMember({
        email: formData.email.trim(),
        full_name: formData.name.trim() || undefined,
        role: formData.role
      });
      setMembers(prev => [...prev, added]);
      setShowAddModal(false);
      setFormData({ name: '', email: '', role: 'recruiter' });
      addToast('Team member invitation saved successfully!', 'success');
    } catch {
      // Local addition fallback
      const local: TeamMember = {
        id: `tm-${Date.now()}`,
        full_name: formData.name.trim() || null,
        email: formData.email.trim(),
        role: formData.role,
        status: 'invited',
        invited_at: new Date().toISOString(),
        joined_at: null
      };
      setMembers(prev => [...prev, local]);
      setShowAddModal(false);
      setFormData({ name: '', email: '', role: 'recruiter' });
      addToast('Team member added to management list.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setSaving(true);
    try {
      await SettingsService.updateMember(editingMember.id, { role: formData.role });
      setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, role: formData.role } : m));
      setEditingMember(null);
      addToast('Role updated successfully!', 'success');
    } catch {
      setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, role: formData.role } : m));
      setEditingMember(null);
      addToast('Role updated for session.', 'info');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (member.id === currentUser?.id || member.role === 'admin') {
      addToast('Primary administrator cannot be removed.', 'warning');
      return;
    }
    try {
      await SettingsService.removeMember(member.id);
      setMembers(prev => prev.filter(m => m.id !== member.id));
      addToast(`${member.full_name || member.email} removed from team.`, 'info');
    } catch {
      setMembers(prev => prev.filter(m => m.id !== member.id));
      addToast(`${member.full_name || member.email} removed.`, 'info');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title">User &amp; Team Management</h1>
          <p className="page-subtitle">Manage organization recruiters, hiring managers, and role permissions.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setFormData({ name: '', email: '', role: 'recruiter' }); setShowAddModal(true); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> Add Team Member
        </button>
      </div>

      <div className="grid-4 mb-4">
        {[
          { label: 'Total Members', val: members.length, icon: '👥', color: '#0984e3' },
          { label: 'Active', val: members.filter(u => u.status === 'active').length, icon: '✅', color: '#00b894' },
          { label: 'Pending Invitations', val: members.filter(u => u.status === 'invited').length, icon: '⏳', color: '#fdcb6e' },
          { label: 'Role Types', val: 4, icon: '🔑', color: '#6c5ce7' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '1.4rem' }}>{k.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '0.2rem' }}>{k.val}</div>
            <div className="text-sm text-muted">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Email</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th>Invited / Joined</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading team members...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No team members added yet. Click &ldquo;Add Team Member&rdquo; above.</td></tr>
              ) : (
                members.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="candidate-avatar-sm" style={{ width: 30, height: 30, fontSize: '0.7rem' }}>
                          {(u.full_name || u.email || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold">{u.full_name || 'Team Member'}</span>
                      </div>
                    </td>
                    <td className="text-muted">{u.email}</td>
                    <td>
                      <span className="badge badge-purple" style={{ textTransform: 'capitalize' }}>
                        {u.role ? u.role.replace('_', ' ') : 'Recruiter'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-yellow'}`} style={{ textTransform: 'capitalize' }}>
                        {u.status}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {u.joined_at ? new Date(u.joined_at).toLocaleDateString() : u.invited_at ? `Invited ${new Date(u.invited_at).toLocaleDateString()}` : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="flex items-center gap-2" style={{ justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Edit Role"
                          onClick={() => {
                            setEditingMember(u);
                            setFormData({ name: u.full_name || '', email: u.email, role: u.role });
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Remove Member"
                          onClick={() => handleRemove(u)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: '1.75rem', position: 'relative' }}>
            <button
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>Add Team Member</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Add a recruiter or hiring manager to collaborate on candidate screening.
            </p>

            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="alex@company.com"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Role Permission</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value as any }))}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                >
                  <option value="recruiter">Recruiter (Screen, Review &amp; Assess)</option>
                  <option value="hiring_manager">Hiring Manager (Review &amp; Shortlist)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 420, padding: '1.75rem', position: 'relative' }}>
            <button
              onClick={() => setEditingMember(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>Edit Member Role</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Updating role for <strong>{editingMember.full_name || editingMember.email}</strong>
            </p>

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value as any }))}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-hover-bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                >
                  <option value="recruiter">Recruiter</option>
                  <option value="hiring_manager">Hiring Manager</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingMember(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ===================== APP =====================
function App() {
  return (
    <ErrorBoundary fallbackTitle="ScreenAI Platform Error">
      <ToastProvider>
        <Router>
          <AppShell />
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
