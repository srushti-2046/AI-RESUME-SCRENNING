import React, { useState, useEffect } from 'react';
import { Plus, Award, Copy, Users } from 'lucide-react';
import { useAssessment } from '../../hooks/useAssessment';
import { TestDetailsForm } from './TestDetailsForm';
import { ModuleSelector } from './ModuleSelector';
import { QuestionDistribution } from './QuestionDistribution';
import { AssessmentCandidateSelector } from './AssessmentCandidateSelector';
import type { AssessmentConfig, Assessment } from '../../types/assessment.types';

interface AssessmentBuilderPageProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AssessmentBuilderPage: React.FC<AssessmentBuilderPageProps> = ({ onShowToast }) => {
  const {
    modules,
    assessments,
    candidates,
    distribution,
    questionCounts,
    loading,
    saving,
    publishing,
    assigning,
    saveAssessment,
    publishAssessment,
    assignCandidate,
    previewDistribution,
    refreshAssessments,
  } = useAssessment();

  const [activeTab, setActiveTab] = useState<'builder' | 'list'>('builder');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssessmentForAssign, setSelectedAssessmentForAssign] = useState<Assessment | null>(null);

  // Active builder form state matching screenshot defaults
  const [config, setConfig] = useState<AssessmentConfig>({
    title: '',
    duration_minutes: 60,
    total_questions: 20,
    passing_score: 60,
    instructions: '',
    modules: [],
  });

  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('draft');
  const [currentShareToken, setCurrentShareToken] = useState<string | null>(null);

  // Initialize modules when loaded — start with empty weights, let user configure
  useEffect(() => {
    if (modules.length > 0 && config.modules.length === 0) {
      // Don't auto-set weights; let the user choose their own module distribution
    }
  }, [modules, config.modules.length]);

  // Recalculate preview when total questions changes
  const handleConfigChange = (updates: Partial<AssessmentConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...updates };
      if (updates.total_questions && updated.modules.length > 0) {
        previewDistribution(updated.total_questions, updated.modules);
      }
      return updated;
    });
  };

  // Handle module weight updates
  const handleWeightChange = (moduleId: string, checked: boolean, weight?: number) => {
    setConfig((prev) => {
      let nextWeights = [...prev.modules];
      if (!checked) {
        nextWeights = nextWeights.filter((w) => w.module_id !== moduleId);
      } else {
        const existingIdx = nextWeights.findIndex((w) => w.module_id === moduleId);
        const newWeight = weight !== undefined ? weight : 20;
        if (existingIdx >= 0) {
          nextWeights[existingIdx] = { module_id: moduleId, weight_percent: newWeight };
        } else {
          nextWeights.push({ module_id: moduleId, weight_percent: newWeight });
        }
      }

      previewDistribution(prev.total_questions, nextWeights);
      return { ...prev, modules: nextWeights };
    });
  };

  // Save assessment
  const handleSave = async () => {
    try {
      const result = await saveAssessment(currentAssessmentId, config);
      setCurrentAssessmentId(result.assessment_id);
      setCurrentStatus(result.status);
      onShowToast('Assessment saved successfully!', 'success');
      refreshAssessments();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save assessment', 'error');
    }
  };

  // Publish assessment
  const handlePublish = async () => {
    try {
      let assessId = currentAssessmentId;
      if (!assessId) {
        const saveRes = await saveAssessment(null, config);
        assessId = saveRes.assessment_id;
        setCurrentAssessmentId(assessId);
      }
      const pubRes = await publishAssessment(assessId);
      setCurrentStatus(pubRes.status);
      setCurrentShareToken(pubRes.share_token);
      onShowToast('Assessment published & link generated!', 'success');
      refreshAssessments();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to publish assessment', 'error');
    }
  };

  // Copy assessment link
  const handleCopyLink = () => {
    if (!currentShareToken) {
      onShowToast('Please publish the assessment first to generate a shareable link.', 'warning');
      return;
    }
    const url = `${window.location.origin}/assessment/t/${currentShareToken}`;
    navigator.clipboard.writeText(url);
    onShowToast('Assessment link copied to clipboard!', 'success');
  };

  // Open assign modal for active assessment
  const handleOpenAssignModal = () => {
    if (!currentAssessmentId) {
      onShowToast('Please save and publish the assessment first.', 'warning');
      return;
    }
    setSelectedAssessmentForAssign({
      id: currentAssessmentId,
      title: config.title,
      status: currentStatus as any,
      duration_minutes: config.duration_minutes,
      total_questions: config.total_questions,
      passing_score: config.passing_score,
      share_token: currentShareToken,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_count: 0,
      submitted_count: 0,
      modules: [],
    });
    setAssignModalOpen(true);
  };

  // Handle assignment in modal
  const handleAssignCandidate = async (candidateId: string) => {
    const assessId = selectedAssessmentForAssign?.id || currentAssessmentId;
    if (!assessId) throw new Error('No assessment selected');
    const res = await assignCandidate(assessId, candidateId);
    onShowToast('Assessment successfully assigned to candidate!', 'success');
    refreshAssessments();
    return res;
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
        <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
        <p style={{ fontWeight: 600 }}>Loading assessment system...</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            Assessment Builder &amp; Configuration
          </h1>
          <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Create custom assessments with authoritative Largest Remainder question allocation for candidates.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--card-hover-bg)', padding: '0.25rem', borderRadius: 8, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('builder')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'builder' ? 'var(--card-bg)' : 'transparent',
              color: activeTab === 'builder' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'builder' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Assessment Builder
          </button>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'list' ? 'var(--card-bg)' : 'transparent',
              color: activeTab === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            My Assessments ({assessments.length})
          </button>
        </div>
      </div>

      {activeTab === 'builder' ? (
        <div className="grid-3" style={{ alignItems: 'start', gap: '1.25rem' }}>
          {/* Column 1: Test Details */}
          <TestDetailsForm
            config={config}
            onChange={handleConfigChange}
            disabled={currentStatus === 'published'}
          />

          {/* Column 2: Select Modules */}
          <ModuleSelector
            modules={modules}
            selectedWeights={config.modules}
            questionCounts={questionCounts}
            onWeightChange={handleWeightChange}
            onSave={handleSave}
            onPublish={handlePublish}
            onCopyLink={handleCopyLink}
            onOpenAssignModal={handleOpenAssignModal}
            saving={saving}
            publishing={publishing}
            isPublished={currentStatus === 'published'}
            shareToken={currentShareToken}
            disabled={currentStatus === 'published'}
          />

          {/* Column 3: Question Distribution Chart */}
          <QuestionDistribution
            distribution={distribution}
            modules={modules}
            totalQuestions={config.total_questions}
          />
        </div>
      ) : (
        /* My Assessments List */
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              Created Assessments
            </h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setCurrentAssessmentId(null);
                setCurrentStatus('draft');
                setCurrentShareToken(null);
                setActiveTab('builder');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Plus size={14} /> New Assessment
            </button>
          </div>

          {assessments.length > 0 ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Assessment Title</th>
                    <th>Duration</th>
                    <th>Questions</th>
                    <th>Passing Score</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{a.title}</div>
                        <div className="text-xs text-muted">
                          Created {new Date(a.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td>{a.duration_minutes} mins</td>
                      <td>{a.total_questions} Qs</td>
                      <td>{a.passing_score}%</td>
                      <td>
                        <span
                          className={`badge ${
                            a.status === 'published'
                              ? 'badge-green'
                              : a.status === 'closed'
                              ? 'badge-red'
                              : 'badge-yellow'
                          }`}
                        >
                          {a.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-blue">
                          {a.assigned_count || 0} candidates
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {a.share_token && (
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Copy Share Link"
                              onClick={() => {
                                const url = `${window.location.origin}/assessment/t/${a.share_token}`;
                                navigator.clipboard.writeText(url);
                                onShowToast('Assessment link copied!', 'success');
                              }}
                            >
                              <Copy size={13} />
                            </button>
                          )}
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setSelectedAssessmentForAssign(a);
                              setAssignModalOpen(true);
                            }}
                          >
                            <Users size={13} /> Assign
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
              <Award size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No assessments created yet</p>
              <p style={{ fontSize: '0.82rem', margin: '0.25rem 0 1rem' }}>
                Use the Assessment Builder to configure questions and modules.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('builder')}>
                Go to Builder
              </button>
            </div>
          )}
        </div>
      )}

      {/* Candidate Assignment Modal */}
      <AssessmentCandidateSelector
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        candidates={candidates}
        assessmentTitle={selectedAssessmentForAssign?.title || config.title}
        onAssign={handleAssignCandidate}
        assigning={assigning}
      />
    </>
  );
};
