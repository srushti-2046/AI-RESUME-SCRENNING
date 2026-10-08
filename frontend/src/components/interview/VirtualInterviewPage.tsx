import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  User,
  ArrowLeft,
  Download,
  Loader2,
  ThumbsUp,
  BrainCircuit
} from 'lucide-react';
import { CandidateService } from '../../services/candidate.service';
import type { CandidateListItem } from '../../types/candidate.types';

interface InterviewQuestion {
  id: number;
  question: string;
  category: 'Technical' | 'System Architecture' | 'Behavioral' | 'Problem Solving';
  expectedPoints: string[];
  sampleAnswer?: string;
  userAnswer?: string;
  aiScore?: number;
  aiFeedback?: string;
  isEvaluating?: boolean;
}

export const VirtualInterviewPage: React.FC<{ onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void }> = ({ onShowToast }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateListItem | null>(null);

  const [interviewType, setInterviewType] = useState<'Technical' | 'Behavioral' | 'System Architecture' | 'Comprehensive'>('Comprehensive');
  const [difficulty, setDifficulty] = useState<'Junior' | 'Mid' | 'Senior'>('Mid');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  const candidateIdFromUrl = searchParams.get('candidateId') || searchParams.get('id');

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const { candidates: list } = await CandidateService.getCandidates({ pageSize: 50 });
      const sorted = [...list].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
      setCandidates(sorted);

      let targetId = candidateIdFromUrl || (sorted.length > 0 ? sorted[0].id : '');
      if (targetId) {
        setSelectedCandidateId(targetId);
        const match = sorted.find(c => c.id === targetId) || sorted[0] || null;
        setSelectedCandidate(match);
      }
    } catch (err) {
      console.error('Failed to load candidates for interview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateChange = (id: string) => {
    setSelectedCandidateId(id);
    setSearchParams({ candidateId: id });
    const match = candidates.find(c => c.id === id) || null;
    setSelectedCandidate(match);
    setIsSessionActive(false);
    setQuestions([]);
  };

  // Generate tailored questions based on candidate role and skills
  const handleStartInterview = () => {
    setGeneratingQuestions(true);
    setTimeout(() => {
      const candidateName = selectedCandidate?.candidateName || 'Candidate';
      const role = selectedCandidate?.role || 'Software Engineer';
      const skills = selectedCandidate?.skills?.slice(0, 5) || ['Problem Solving', 'Data Structures', 'System Design'];

      const generated: InterviewQuestion[] = [
        {
          id: 1,
          question: `Can you walk us through a recent high-impact project where you applied ${skills[0] || 'core technologies'} in a production environment? What key challenges arose and how did you resolve them?`,
          category: 'Technical',
          expectedPoints: [
            'Context and business purpose of the project',
            'Architecture decisions and technical trade-offs',
            'Concrete problem encountered and troubleshooting process',
            'Measurable outcome or metric improvement'
          ]
        },
        {
          id: 2,
          question: `Given a service required for ${role} that experiences sudden traffic spikes, how do you design the caching, rate limiting, and database indexing strategies?`,
          category: 'System Architecture',
          expectedPoints: [
            'Cache invalidation and eviction policy (Redis/Memcached)',
            'Load shedding, circuit breakers, and rate limiting algorithms',
            'Database query optimization, indexes, and connection pooling'
          ]
        },
        {
          id: 3,
          question: `How do you ensure maintainability and high code quality when collaborating with cross-functional teams under tight deadlines?`,
          category: 'Behavioral',
          expectedPoints: [
            'Code review guidelines and automated linting/testing pipelines',
            'Communication with product managers on technical debt vs features',
            'Clear documentation and post-mortem culture'
          ]
        },
        {
          id: 4,
          question: `Explain how you would diagnose a silent memory leak or a performance degradation issue in a running microservice or background worker.`,
          category: 'Problem Solving',
          expectedPoints: [
            'Profiling tools and heap dumps analysis',
            'Monitoring metrics: CPU, memory trends, garbage collection cycles',
            'Stepwise root-cause isolation without degrading production'
          ]
        },
        {
          id: 5,
          question: `Where do you see modern AI/LLM tooling providing the biggest leverage in your engineering workflow, and what are its notable pitfalls or security risks?`,
          category: 'Technical',
          expectedPoints: [
            'Automated testing, scaffolding, documentation acceleration',
            'Data privacy and hallucination validation',
            'Keeping architectural reasoning human-driven'
          ]
        }
      ];

      setQuestions(generated);
      setActiveQuestionIdx(0);
      setCurrentAnswer('');
      setIsSessionActive(true);
      setGeneratingQuestions(false);
      if (onShowToast) onShowToast(`Interview session generated for ${candidateName}!`, 'success');
    }, 600);
  };

  const handleEvaluateAnswer = () => {
    if (!currentAnswer.trim()) {
      if (onShowToast) onShowToast('Please provide an answer to evaluate.', 'warning');
      return;
    }

    const currentQ = questions[activeQuestionIdx];
    if (!currentQ) return;

    // Simulate AI grading
    const wordCount = currentAnswer.trim().split(/\s+/).length;
    let score = Math.min(9.5, Math.max(5.5, Number((6.0 + (wordCount / 30) * 1.5).toFixed(1))));
    if (wordCount > 60) score = Math.min(9.8, score + 1.2);

    const feedback = wordCount > 40
      ? `Strong articulation! Well-structured answer addressing core principles. Highlighted key architectural trade-offs with practical context.`
      : `Good baseline concept, but could benefit from deeper technical specificity and quantitative metrics.`;

    const updated = [...questions];
    updated[activeQuestionIdx] = {
      ...currentQ,
      userAnswer: currentAnswer,
      aiScore: score,
      aiFeedback: feedback
    };

    setQuestions(updated);
    if (onShowToast) onShowToast(`AI Evaluation complete: Score ${score}/10`, 'success');
  };

  // Mock voice recording toggle using Web Speech API or simulated transcript
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (onShowToast) onShowToast('Voice recording stopped.', 'info');
    } else {
      setIsRecording(true);
      if (onShowToast) onShowToast('Listening for candidate voice response...', 'info');

      // Check if browser SpeechRecognition is available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          setCurrentAnswer(prev => prev + (prev ? ' ' : '') + transcript);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        try {
          recognition.start();
        } catch {
          // If already started or blocked
        }
      } else {
        // Fallback simulated dictation text
        setTimeout(() => {
          if (isRecording) {
            setCurrentAnswer(prev =>
              (prev ? prev + ' ' : '') +
              'In our architecture, we isolated critical write paths with background job queues, leveraged Redis caching with LRU invalidation, and set up horizontal pod autoscaling based on p99 latency thresholds.'
            );
            setIsRecording(false);
          }
        }, 3000);
      }
    }
  };

  const handleExportTranscript = () => {
    const candidateName = selectedCandidate?.candidateName || 'Candidate';
    let content = `AI VIRTUAL INTERVIEW REPORT\n=============================\nCandidate: ${candidateName}\nRole: ${selectedCandidate?.role || 'Engineer'}\nDate: ${new Date().toLocaleDateString()}\nInterview Type: ${interviewType}\n\n`;

    questions.forEach((q, i) => {
      content += `Question ${i + 1} (${q.category}):\n${q.question}\n\nAnswer:\n${q.userAnswer || 'No answer recorded'}\n\nAI Score: ${q.aiScore ? `${q.aiScore}/10` : 'Not evaluated'}\nFeedback: ${q.aiFeedback || 'N/A'}\n\n-----------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidateName.replace(/\s+/g, '_')}_Interview_Transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('Interview transcript exported successfully!', 'success');
  };

  const evaluatedQuestions = questions.filter(q => q.aiScore !== undefined);
  const avgScore = evaluatedQuestions.length > 0
    ? (evaluatedQuestions.reduce((sum, q) => sum + (q.aiScore || 0), 0) / evaluatedQuestions.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={36} color="var(--accent)" className="spin" />
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading interview environment...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 wrap gap-2">
        <div>
          <button className="back-link" onClick={() => navigate('/ranking')} style={{ marginBottom: '0.25rem' }}>
            <ArrowLeft size={15} /> Back to Ranking
          </button>
          <h1 className="page-title flex items-center gap-2">
            <Mic size={24} style={{ color: 'var(--accent)' }} /> Virtual Interview Simulator
          </h1>
          <p className="page-subtitle">
            Generate and evaluate AI-driven interview assessments tailored to candidate resumes.
          </p>
        </div>

        {/* Candidate Selector Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>
              Select Candidate
            </label>
            <select
              value={selectedCandidateId}
              onChange={e => handleCandidateChange(e.target.value)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer'
              }}
            >
              {candidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.candidateName} — {c.score}% Match ({c.role})
                </option>
              ))}
            </select>
          </div>

          {selectedCandidate && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/summary?candidateId=${selectedCandidate.id}`)}
              title="View Candidate Summary"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <User size={14} /> Profile
            </button>
          )}
        </div>
      </div>

      {!isSessionActive ? (
        /* Configuration & Setup View */
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BrainCircuit size={18} color="var(--accent)" /> Configure Virtual Interview
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Select interview track and parameters to customize questions for {selectedCandidate?.candidateName || 'the candidate'}.
            </p>

            <div className="form-group mb-3">
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>Target Candidate</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem', borderRadius: 8, background: 'var(--card-hover-bg)', border: '1px solid var(--border-light)' }}>
                <div className="candidate-avatar-sm" style={{ width: 40, height: 40, fontSize: '0.85rem' }}>
                  {(selectedCandidate?.candidateName || 'C').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{selectedCandidate?.candidateName || 'No Candidate Selected'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {selectedCandidate?.role || 'General Role'} &bull; Match Score: <strong style={{ color: 'var(--accent)' }}>{selectedCandidate?.score}%</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group mb-3">
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>Interview Track</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {(['Comprehensive', 'Technical', 'System Architecture', 'Behavioral'] as const).map(track => (
                  <button
                    key={track}
                    type="button"
                    onClick={() => setInterviewType(track)}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 8,
                      border: interviewType === track ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: interviewType === track ? 'rgba(108,92,231,0.08)' : 'var(--card-bg)',
                      color: interviewType === track ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {track}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>Seniority Target</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['Junior', 'Mid', 'Senior'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    style={{
                      flex: 1,
                      padding: '0.55rem',
                      borderRadius: 8,
                      border: difficulty === lvl ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: difficulty === lvl ? 'rgba(108,92,231,0.08)' : 'var(--card-bg)',
                      color: difficulty === lvl ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    {lvl} Level
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.92rem' }}
              onClick={handleStartInterview}
              disabled={generatingQuestions}
            >
              {generatingQuestions ? (
                <>
                  <Loader2 size={16} className="spin" /> Generating Questions...
                </>
              ) : (
                <>
                  <Play size={16} /> Start Virtual Interview Session
                </>
              )}
            </button>
          </div>

          {/* Candidate Snapshot & Preparedness Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Candidate Resume Highlights
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Extracted from verified resume profile. Questions will reference these skills directly.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Top Skills Identified
              </div>
              <div className="flex wrap gap-2">
                {(selectedCandidate?.skills && selectedCandidate.skills.length > 0) ? (
                  selectedCandidate.skills.map((s: string, idx: number) => (
                    <span key={idx} className="badge badge-purple" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}>
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted">No specific skills parsed.</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Experience &amp; Background
              </div>
              <div style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--card-hover-bg)', fontSize: '0.85rem' }}>
                {selectedCandidate?.experience ? (
                  <p style={{ margin: 0 }}>{selectedCandidate.experience}</p>
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Professional software engineer with verified technical background.</p>
                )}
              </div>
            </div>

            <div style={{ padding: '0.9rem', borderRadius: 8, background: 'rgba(0, 184, 148, 0.08)', border: '1px solid rgba(0, 184, 148, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#00b894', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <CheckCircle2 size={16} /> Automated AI Question Generator Ready
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Questions test technical depth, trade-off reasoning, and collaborative leadership without manual interviewer fatigue.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Active Interview Interactive Workspace */
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Left Column: Current Question & Response */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-purple" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Question {activeQuestionIdx + 1} of {questions.length}
                </span>
                <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>
                  {questions[activeQuestionIdx]?.category}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsSessionActive(false)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                Reset Session
              </button>
            </div>

            {/* Question Card */}
            <div style={{ padding: '1.25rem', borderRadius: 10, background: 'var(--card-hover-bg)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.5, color: 'var(--text-primary)', margin: 0 }}>
                {questions[activeQuestionIdx]?.question}
              </h3>
            </div>

            {/* Key Rubric Points */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Key Competency Indicators:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {questions[activeQuestionIdx]?.expectedPoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            {/* Candidate Response Area */}
            <div className="form-group mb-3">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>
                  Candidate Answer / Response
                </label>
                <button
                  type="button"
                  onClick={toggleRecording}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '0.25rem 0.65rem',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: isRecording ? '#e74c3c' : 'var(--card-bg)',
                    color: isRecording ? '#ffffff' : 'var(--text-primary)'
                  }}
                >
                  {isRecording ? <MicOff size={13} /> : <Mic size={13} />}
                  {isRecording ? 'Recording (Click to stop)' : 'Voice Input'}
                </button>
              </div>

              <textarea
                className="form-textarea"
                rows={5}
                placeholder="Type or dictate candidate response here..."
                value={currentAnswer}
                onChange={e => setCurrentAnswer(e.target.value)}
                style={{ fontSize: '0.85rem', lineHeight: 1.5 }}
              />
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={activeQuestionIdx === 0}
                onClick={() => {
                  setActiveQuestionIdx(prev => Math.max(0, prev - 1));
                  setCurrentAnswer(questions[activeQuestionIdx - 1]?.userAnswer || '');
                }}
              >
                Previous
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleEvaluateAnswer}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <Sparkles size={14} /> AI Evaluate Answer
                </button>

                <button
                  className="btn btn-secondary btn-sm"
                  disabled={activeQuestionIdx === questions.length - 1}
                  onClick={() => {
                    setActiveQuestionIdx(prev => Math.min(questions.length - 1, prev + 1));
                    setCurrentAnswer(questions[activeQuestionIdx + 1]?.userAnswer || '');
                  }}
                >
                  Next Question
                </button>
              </div>
            </div>

            {/* AI Feedback Box if evaluated */}
            {questions[activeQuestionIdx]?.aiScore !== undefined && (
              <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: 8, background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>
                    <Sparkles size={16} /> AI Evaluation Result
                  </div>
                  <span className="badge badge-purple" style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                    Score: {questions[activeQuestionIdx].aiScore} / 10
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {questions[activeQuestionIdx].aiFeedback}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Interview Session Progress & Scorecard */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Session Scorecard</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportTranscript}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}
              >
                <Download size={13} /> Export Notes
              </button>
            </div>

            <div className="grid-2 mb-3" style={{ gap: '0.75rem' }}>
              <div style={{ padding: '0.85rem', borderRadius: 8, background: 'var(--card-hover-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent)' }}>
                  {avgScore ? `${avgScore}/10` : '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average AI Score</div>
              </div>

              <div style={{ padding: '0.85rem', borderRadius: 8, background: 'var(--card-hover-bg)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00b894' }}>
                  {evaluatedQuestions.length} / {questions.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Questions Evaluated</div>
              </div>
            </div>

            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {questions.map((q, idx) => {
                const isCurrent = idx === activeQuestionIdx;
                const isAnswered = q.aiScore !== undefined;

                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      setActiveQuestionIdx(idx);
                      setCurrentAnswer(q.userAnswer || '');
                    }}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 8,
                      border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border-light)',
                      background: isCurrent ? 'rgba(108,92,231,0.06)' : 'var(--card-bg)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 700 }}>Q{idx + 1}</span> &bull; <span>{q.category}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                        {q.question}
                      </div>
                    </div>
                    <div>
                      {isAnswered ? (
                        <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                          {q.aiScore}/10
                        </span>
                      ) : (
                        <span className="badge badge-yellow" style={{ fontSize: '0.72rem' }}>
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Final Hiring Decision Bar */}
            <div style={{ padding: '1rem', borderRadius: 8, background: 'var(--card-hover-bg)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Hiring Readiness Recommendation
              </div>
              {avgScore && Number(avgScore) >= 8.0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00b894', fontWeight: 700, fontSize: '0.88rem' }}>
                  <CheckCircle2 size={16} /> Strong Hire &mdash; Excellent technical communication
                </div>
              ) : avgScore && Number(avgScore) >= 6.5 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0984e3', fontWeight: 700, fontSize: '0.88rem' }}>
                  <ThumbsUp size={16} /> Hire &mdash; Meets core competencies with solid foundation
                </div>
              ) : avgScore ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e67e22', fontWeight: 700, fontSize: '0.88rem' }}>
                  <AlertCircle size={16} /> Needs Follow-Up &mdash; Recommend deeper technical probe
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Complete question evaluations to calculate final readiness recommendation.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
