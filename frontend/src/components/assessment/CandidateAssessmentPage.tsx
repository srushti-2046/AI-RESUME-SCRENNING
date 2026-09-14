import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, ArrowLeft, ArrowRight, Send, Award } from 'lucide-react';
import { AssessmentService } from '../../services/assessment.service';
import type { PublicAssessment, CandidateAnswer, AttemptResult } from '../../types/assessment.types';

export const CandidateAssessmentPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<PublicAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attempt State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [testStarted, setTestStarted] = useState(false);

  const timerRef = useRef<any>(null);

  // Load public assessment
  useEffect(() => {
    async function loadTest() {
      if (!shareToken) {
        setError('No assessment token provided.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await AssessmentService.getPublicAssessment(shareToken);
        setAssessment(data);
        setTimeLeft(data.duration_minutes * 60);
      } catch (err: any) {
        setError(err.message || 'Unable to load assessment');
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [shareToken]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = useCallback(async () => {
    if (!assessment || !shareToken) return;
    setSubmitting(true);
    try {
      const answersPayload: CandidateAnswer[] = Object.entries(answers).map(
        ([question_id, selected_option]) => ({
          question_id,
          answer: selected_option,
        })
      );

      const evalResult = await AssessmentService.submitAttempt(shareToken, answersPayload);
      setResult(evalResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  }, [assessment, shareToken, answers]);

  // Countdown timer
  useEffect(() => {
    if (testStarted && timeLeft > 0 && !result) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [testStarted, timeLeft, result, handleSubmit]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            className="spin"
            style={{
              width: 36,
              height: 36,
              border: '3px solid #cbd5e1',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ color: '#64748b', fontWeight: 600 }}>Loading assessment environment...</p>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div style={{ maxWidth: 500, margin: '4rem auto', padding: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Assessment Unavailable
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
            {error || 'This assessment could not be found or has not been published.'}
          </p>
          <button className="btn btn-secondary" onClick={() => navigate('/assessment')}>
            Return to Assessments
          </button>
        </div>
      </div>
    );
  }

  // Result View
  if (result) {
    return (
      <div style={{ maxWidth: 600, margin: '3rem auto', padding: '1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: result.passed ? '#dcfce7' : '#fef2f2',
              color: result.passed ? '#16a34a' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Award size={36} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {result.passed ? 'Assessment Passed! 🎉' : 'Assessment Completed'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>
            Your responses have been securely submitted and recorded.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              background: 'var(--card-hover-bg)',
              border: '1px solid var(--border)',
              padding: '1.25rem',
              borderRadius: 10,
              marginBottom: '1.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SCORE</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {result.score} / {result.total_questions}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PERCENTAGE</div>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: result.passed ? '#16a34a' : '#ea580c',
                }}
              >
                {result.percentage.toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>STATUS</div>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: result.passed ? '#16a34a' : '#dc2626',
                }}
              >
                {result.passed ? 'PASSED' : 'COMPLETED'}
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => navigate('/assessment')}>
            Back to Platform
          </button>
        </div>
      </div>
    );
  }

  // Pre-test Instructions
  if (!testStarted) {
    return (
      <div style={{ maxWidth: 680, margin: '2rem auto', padding: '1rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <span className="badge badge-blue mb-3" style={{ fontSize: '0.78rem' }}>
            Candidate Assessment
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {assessment.title}
          </h1>

          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              padding: '1rem 0',
              borderBottom: '1px solid var(--border)',
              borderTop: '1px solid var(--border)',
              margin: '1.25rem 0',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>DURATION</span>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                {assessment.duration_minutes} Minutes
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>QUESTIONS</span>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                {assessment.questions.length} Questions
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>PASSING SCORE</span>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                {assessment.passing_score}%
              </strong>
            </div>
          </div>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Instructions
          </h3>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              background: 'var(--card-hover-bg)',
              padding: '1rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              marginBottom: '1.5rem',
            }}
          >
            {assessment.instructions ||
              'Please attempt all questions to the best of your ability. Once started, the timer will count down continuously until time expires or until you submit.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={() => setTestStarted(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.65rem 1.4rem' }}
            >
              Start Assessment <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Assessment Test View
  const currentQ = assessment.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div style={{ maxWidth: 880, margin: '1.5rem auto', padding: '0 1rem' }}>
      {/* Top Header Bar */}
      <div
        className="card mb-3"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            {assessment.title}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Question {currentIndex + 1} of {assessment.questions.length}
          </span>
        </div>

        {/* Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0.4rem 0.85rem',
            borderRadius: 8,
            background: timeLeft < 300 ? 'var(--red-bg)' : 'var(--blue-bg)',
            color: timeLeft < 300 ? 'var(--red-text)' : 'var(--blue-text)',
            fontWeight: 700,
            fontSize: '0.92rem',
          }}
        >
          <Clock size={16} />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="card mb-3" style={{ padding: '1.75rem' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
            {currentQ.module_name || 'General'}
          </span>
          <span className="text-xs text-muted">Points: {currentQ.points}</span>
        </div>

        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.5,
            marginBottom: '1.5rem',
          }}
        >
          {currentIndex + 1}. {currentQ.question_text}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {currentQ.options?.map((option) => {
            const isSelected = answers[currentQ.question_id] === option.id;
            return (
              <div
                key={option.id}
                onClick={() => handleSelectOption(currentQ.question_id, option.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 8,
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(108, 92, 231, 0.15)' : 'var(--card-hover-bg)',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    flexShrink: 0,
                  }}
                >
                  {option.id}
                </div>
                <span
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-primary)',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {option.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation & Submit Controls */}
      <div className="flex items-center justify-between">
        <button
          className="btn btn-secondary"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={16} /> Previous
        </button>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Answered {answeredCount} / {assessment.questions.length}
        </div>

        {currentIndex < assessment.questions.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="btn btn-primary"
            disabled={submitting}
            onClick={handleSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#16a34a',
              borderColor: '#15803d',
            }}
          >
            <Send size={15} /> {submitting ? 'Submitting...' : 'Submit Assessment'}
          </button>
        )}
      </div>

      {/* Question palette drawer/strip */}
      <div
        className="card mt-4"
        style={{
          padding: '0.85rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
          Question Palette:
        </span>
        {assessment.questions.map((q, idx) => {
          const isAnswered = !!answers[q.question_id];
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={q.question_id}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: isCurrent
                  ? 'rgba(108, 92, 231, 0.2)'
                  : isAnswered
                  ? 'var(--green-bg)'
                  : 'var(--card-hover-bg)',
                color: isCurrent
                  ? 'var(--accent)'
                  : isAnswered
                  ? 'var(--green-text)'
                  : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
