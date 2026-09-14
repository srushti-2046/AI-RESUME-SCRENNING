import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';
import { logger } from '../lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  isolateSection?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    logger.error('ErrorBoundary', error.message, { error, componentStack: errorInfo.componentStack });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackMessage, isolateSection } = this.props;
      const title = fallbackTitle || (isolateSection ? 'Component Render Interrupted' : 'Something went wrong');
      const message =
        fallbackMessage ||
        (isolateSection
          ? 'An unexpected error occurred in this view module. The rest of the platform remains fully functional.'
          : 'The platform encountered an unexpected runtime state. You can safely retry or navigate back to the dashboard.');

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isolateSection ? '2rem 1.5rem' : '4rem 2rem',
            width: '100%',
            minHeight: isolateSection ? '240px' : '60vh',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '560px',
              width: '100%',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 25px rgba(239, 68, 68, 0.1)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3
                style={{
                  color: '#f8fafc',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                {message}
              </p>
              {this.state.error?.message && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: '#fca5a5',
                    textAlign: 'left',
                    overflowX: 'auto',
                    maxWidth: '100%',
                  }}
                >
                  {this.state.error.message}
                </div>
              )}
            </div>

            {/* Zero Dead-End Recovery Action Buttons */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                justifyContent: 'center',
                marginTop: '0.5rem',
                width: '100%',
              }}
            >
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  borderRadius: '10px',
                }}
              >
                <RotateCcw size={15} />
                Try Again
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  borderRadius: '10px',
                }}
              >
                <RefreshCw size={15} />
                Reload Page
              </button>

              {isolateSection && (
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: '10px',
                  }}
                >
                  <Home size={15} />
                  Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
