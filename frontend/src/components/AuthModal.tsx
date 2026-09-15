import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Lock, Mail, User, ArrowRight, Clock, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot';
  onSuccess: () => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const BACKEND_AUTH_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SETTINGS_API_URL ||
  'http://localhost:8000';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess,
  addToast,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [backoffSeconds, setBackoffSeconds] = useState<number>(0);

  useEffect(() => {
    setMode(initialMode);
    setFormError(null);
    setBackoffSeconds(0);
  }, [initialMode, isOpen]);

  // Live exponential backoff countdown timer
  useEffect(() => {
    if (backoffSeconds <= 0) return;
    const timer = setInterval(() => {
      setBackoffSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [backoffSeconds]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (backoffSeconds > 0) return;

    setLoading(true);
    setFormError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === 'forgot') {
        // 1. Password Reset with Rate Limiting
        const res = await fetch(`${BACKEND_AUTH_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const retry = data.retry_after || parseInt(res.headers.get('Retry-After') || '5', 10);
          setBackoffSeconds(retry);
          setFormError(data.detail || `Too many requests. Please wait ${retry}s.`);
          return;
        }

        if (!res.ok) {
          throw new Error(data.detail || 'Password reset request failed.');
        }

        addToast(
          data.message || 'If an account exists, password reset instructions have been sent.',
          'info'
        );
        setMode('signin');
        return;
      }

      if (mode === 'signup') {
        const cleanName = fullName.trim() || cleanEmail.split('@')[0];
        let backendRegistered = false;

        try {
          const res = await fetch(`${BACKEND_AUTH_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password,
              full_name: cleanName,
            }),
          });

          const data = await res.json().catch(() => ({}));
          if (res.status === 429) {
            const retry = data.retry_after || parseInt(res.headers.get('Retry-After') || '5', 10);
            setBackoffSeconds(retry);
            setFormError(data.detail || `Registration rate limit reached. Please wait ${retry}s.`);
            return;
          }

          if (res.ok) {
            if (data.access_token && data.refresh_token) {
              await supabase.auth.setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
              });
            }
            backendRegistered = true;
            addToast('Account registered and signed in successfully!', 'success');
            onSuccess();
            onClose();
            return;
          }

          if (data.detail && data.detail.toLowerCase().includes('already')) {
            setFormError('An account with this email already exists. Please sign in below.');
            setMode('signin');
            return;
          }
        } catch (fetchErr) {
          console.warn('Backend signup unreachable, falling back directly to Supabase:', fetchErr);
        }

        if (!backendRegistered) {
          const { data: directData, error: directErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: { data: { full_name: cleanName } },
          });
          if (directErr) throw directErr;

          if (directData.session) {
            addToast('Account created and signed in successfully!', 'success');
            onSuccess();
            onClose();
          } else {
            addToast('Account registered! Please sign in with your credentials.', 'success');
            setMode('signin');
          }
        }
      } else {
        let backendLoggedIn = false;

        try {
          const res = await fetch(`${BACKEND_AUTH_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password,
            }),
          });

          const data = await res.json().catch(() => ({}));

          if (res.status === 429) {
            const retry = data.retry_after || parseInt(res.headers.get('Retry-After') || '5', 10);
            setBackoffSeconds(retry);
            setFormError(data.detail || `Rate limit active. Please wait ${retry}s.`);
            return;
          }

          if (res.status === 401) {
            const retry = data.retry_after || parseInt(res.headers.get('Retry-After') || '0', 10);
            if (retry > 0) {
              setBackoffSeconds(retry);
            }
            setFormError(data.detail || 'Invalid login credentials.');
            return;
          }

          if (res.ok && data.access_token) {
            await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });
            backendLoggedIn = true;
            addToast('Signed in successfully!', 'success');
            onSuccess();
            onClose();
            return;
          }
        } catch (fetchErr) {
          console.warn('Backend login unreachable, falling back directly to Supabase:', fetchErr);
        }

        if (!backendLoggedIn) {
          const { error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (error) throw error;

          addToast('Signed in successfully!', 'success');
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setFormError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(8, 12, 36, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          padding: '2rem',
          position: 'relative',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            borderRadius: 6,
          }}
          title="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, #0984e3, #6c5ce7)',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              marginBottom: '0.75rem',
              boxShadow: '0 8px 16px rgba(108, 92, 231, 0.25)',
            }}
          >
            {mode === 'forgot' ? <KeyRound size={20} /> : <Lock size={20} />}
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {mode === 'signin'
              ? 'Welcome Back'
              : mode === 'signup'
              ? 'Recruiter Registration'
              : 'Reset Password'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            {mode === 'signin'
              ? 'Sign in to access your recruitment dashboard'
              : mode === 'signup'
              ? 'Create a recruiter account to manage your hiring pipeline'
              : 'Enter your registered work email to receive reset instructions'}
          </p>
        </div>

        {/* Live Exponential Backoff Banner */}
        {backoffSeconds > 0 && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#ef4444',
              padding: '0.65rem 0.85rem',
              borderRadius: 8,
              fontSize: '0.82rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Clock size={16} />
            <span>
              Exponential backoff active. Please wait <strong>{backoffSeconds}s</strong> before retrying.
            </span>
          </div>
        )}

        {formError && backoffSeconds === 0 && (
          <div
            style={{
              background: 'var(--red-bg, rgba(239, 68, 68, 0.1))',
              border: '1px solid var(--border)',
              color: 'var(--red-text, #ef4444)',
              padding: '0.65rem 0.85rem',
              borderRadius: 8,
              fontSize: '0.82rem',
              marginBottom: '1rem',
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'signup' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Full Name
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12 }} />
                <input
                  type="text"
                  placeholder="e.g. Durga Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={mode === 'signup'}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                    borderRadius: 8,
                    border: '1.5px solid var(--border)',
                    background: 'var(--card-hover-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Work Email
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12 }} />
              <input
                type="email"
                placeholder="recruiter@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--card-hover-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setFormError(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.78rem',
                      color: '#0984e3',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12 }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                    borderRadius: 8,
                    border: '1.5px solid var(--border)',
                    background: 'var(--card-hover-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || backoffSeconds > 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '0.75rem',
              marginTop: '0.5rem',
              backgroundColor: backoffSeconds > 0 ? '#64748b' : '#0984e3',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: loading || backoffSeconds > 0 ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(9, 132, 227, 0.35)',
              opacity: loading ? 0.7 : 1,
              transition: 'background-color 0.2s ease',
            }}
          >
            {backoffSeconds > 0
              ? `Wait ${backoffSeconds}s to Retry`
              : loading
              ? 'Processing...'
              : mode === 'signin'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Reset Link'}
            {!loading && backoffSeconds === 0 && <ArrowRight size={15} />}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
          {mode === 'signin' && (
            <>
              Don't have a recruiter account?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setFormError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0984e3',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Sign Up
              </button>
            </>
          )}
          {mode === 'signup' && (
            <>
              Already registered?{' '}
              <button
                onClick={() => {
                  setMode('signin');
                  setFormError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0984e3',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Sign In
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <button
              onClick={() => {
                setMode('signin');
                setFormError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0984e3',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ← Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
