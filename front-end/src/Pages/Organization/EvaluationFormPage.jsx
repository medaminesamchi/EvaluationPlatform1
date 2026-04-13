import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import evaluationService from '../../Services/evaluationService';
import fileService from '../../Services/fileService';
import governanceService from '../../Services/governanceService';
import { GOVERNANCE_PRINCIPLES, MATURITY_LEVEL_OPTIONS } from '../../utils/constants';
import { normalizeGovernanceFramework } from '../../utils/governanceFramework';

const EvaluationFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [evaluation, setEvaluation] = useState(null);
  const [responses, setResponses] = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);
  const [expandedPrinciples, setExpandedPrinciples] = useState([1]);
  const [expandedPractices, setExpandedPractices] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [framework, setFramework] = useState(null);
  const [fwLoading, setFwLoading] = useState(true);

  // Criteria flagged for proof by evaluator (PROOF_REQUESTED status)
  const [proofRequestedCriteria, setProofRequestedCriteria] = useState([]);

  // Validation
  const [missingCriteriaModal, setMissingCriteriaModal] = useState(null); // { missing, missingEvidence }
  const [evidenceErrors, setEvidenceErrors] = useState({}); // key -> true
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await governanceService.getFramework();
        if (!cancelled) setFramework(normalizeGovernanceFramework(data));
      } catch (e) {
        console.warn('Using static governance framework:', e);
        if (!cancelled) setFramework(GOVERNANCE_PRINCIPLES);
      } finally {
        if (!cancelled) setFwLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { loadEvaluation(); }, [id]);

  const GOVERNANCE = framework || GOVERNANCE_PRINCIPLES;

  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const data = await evaluationService.getEvaluationById(id);
      setEvaluation(data);

      // Load existing responses
      try {
        const existing = await evaluationService.getResponses(id);
        const map = {};
        existing.forEach(r => {
          const key = `${r.principleId}-${r.practiceId}-${r.criterionId}`;
          // Support both legacy single evidenceFile and new evidenceFiles array
          let files = [];
          if (r.evidenceFiles) {
            files = Array.isArray(r.evidenceFiles) ? r.evidenceFiles : r.evidenceFiles.split(',').filter(Boolean);
          } else if (r.evidenceFile) {
            files = [r.evidenceFile];
          }
          map[key] = {
            principleId: r.principleId,
            practiceId: r.practiceId,
            criterionId: r.criterionId,
            maturityLevel: r.maturityLevel,
            comments: r.comments || '',
            evidence: r.evidence || '',
            evidenceFiles: files,
            evidenceFileNames: files,
          };
        });
        setResponses(map);
      } catch (e) { /* no responses yet */ }

      // If proof requested, load which criteria need proof
      if (data.status === 'PROOF_REQUESTED') {
        try {
          const reviews = await evaluationService.getCriterionReviews(id);
          const flagged = reviews.map(r => {
            if (typeof r.rejectedFiles === 'string') {
              try { r.rejectedFiles = JSON.parse(r.rejectedFiles); } catch(e) { r.rejectedFiles = []; }
            }
            return r;
          }).filter(r => r.proofRequested || r.adjustedMaturityLevel !== undefined || (r.rejectedFiles && r.rejectedFiles.length > 0));
          setProofRequestedCriteria(flagged);
        } catch (e) { /* no reviews */ }
      }

    } catch (err) {
      console.error('Error loading evaluation:', err);
      navigate('/organization/evaluations');
    } finally {
      setLoading(false);
    }
  };

  const isProofRequested = (principleId, practiceId, criterionId) => {
    return proofRequestedCriteria.some(
      r => r.principleId == principleId &&
           r.practiceId == practiceId &&
           r.criterionId == criterionId
    );
  };

  const getReviewData = (principleId, practiceId, criterionId) => {
    return proofRequestedCriteria.find(
      r => r.principleId == principleId &&
           r.practiceId == practiceId &&
           r.criterionId == criterionId
    );
  };

  // In PROOF_REQUESTED mode, only allow editing flagged criteria
  const isEditable = (principleId, practiceId, criterionId) => {
    if (!evaluation) return false;
    if (evaluation.status === 'SUBMITTED' || evaluation.status === 'APPROVED') return false;
    if (evaluation.status === 'PROOF_REQUESTED') {
      return isProofRequested(principleId, practiceId, criterionId);
    }
    return true;
  };

  const handleMaturityChange = (principleId, practiceId, criterionId, level) => {
    if (!isEditable(principleId, practiceId, criterionId)) return;
    const key = `${principleId}-${practiceId}-${criterionId}`;
    setResponses(prev => ({
      ...prev,
      [key]: { ...prev[key], principleId, practiceId, criterionId, maturityLevel: level },
    }));
  };

  const handleCommentChange = (principleId, practiceId, criterionId, comment) => {
    if (!isEditable(principleId, practiceId, criterionId)) return;
    const key = `${principleId}-${practiceId}-${criterionId}`;
    setResponses(prev => ({
      ...prev,
      [key]: { ...prev[key], principleId, practiceId, criterionId, comments: comment },
    }));
  };

  const handleFileUpload = async (principleId, practiceId, criterionId, file) => {
    if (!file || !isEditable(principleId, practiceId, criterionId)) return;
    const key = `${principleId}-${practiceId}-${criterionId}`;
    setUploadingKey(key);
    try {
      const result = await fileService.uploadFile(file, id, criterionId);
      setResponses(prev => {
        const existing = prev[key] || {};
        const prevFiles = existing.evidenceFiles || [];
        const prevNames = existing.evidenceFileNames || [];
        return {
          ...prev,
          [key]: {
            ...existing,
            principleId, practiceId, criterionId,
            evidenceFiles: [...prevFiles, result.filename],
            evidenceFileNames: [...prevNames, result.originalFilename || result.filename],
          },
        };
      });
      // Clear evidence error for this key once file is uploaded
      setEvidenceErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
    } catch (err) {
      console.error('Upload failed:', err);
      alert('File upload failed. Please try again.');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleRemoveFile = (principleId, practiceId, criterionId, fileIndex) => {
    if (!isEditable(principleId, practiceId, criterionId)) return;
    const key = `${principleId}-${practiceId}-${criterionId}`;
    setResponses(prev => {
      const existing = prev[key] || {};
      const newFiles = [...(existing.evidenceFiles || [])];
      const newNames = [...(existing.evidenceFileNames || [])];
      newFiles.splice(fileIndex, 1);
      newNames.splice(fileIndex, 1);
      return {
        ...prev,
        [key]: { ...existing, evidenceFiles: newFiles, evidenceFileNames: newNames },
      };
    });
  };

  const togglePrinciple = (pid) => {
    setExpandedPrinciples(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    );
  };

  const togglePractice = (pid, prId) => {
    const key = `${pid}-${prId}`;
    setExpandedPractices(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calculateProgress = () => {
    const total = GOVERNANCE.reduce((s, p) =>
      s + p.practices.reduce((ps, pr) => ps + pr.criteria.length, 0), 0);
    const done = Object.values(responses).filter(
      r => r.maturityLevel !== null && r.maturityLevel !== undefined
    ).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const getPrincipleProgress = (principle) => {
    const total = principle.practices.reduce((s, p) => s + p.criteria.length, 0);
    const done = principle.practices.reduce((s, practice) =>
      s + practice.criteria.filter(c => {
        const key = `${principle.id}-${practice.id}-${c.id}`;
        return responses[key]?.maturityLevel !== undefined && responses[key]?.maturityLevel !== null;
      }).length, 0);
    return { done, total };
  };

  const buildResponsesArray = (includeAll = false) => {
    let list = [];
    if (includeAll) {
      GOVERNANCE.forEach(principle => {
        principle.practices.forEach(practice => {
          practice.criteria.forEach(criterion => {
            const key = `${principle.id}-${practice.id}-${criterion.id}`;
            const r = responses[key];
            list.push({
              principleId: principle.id,
              practiceId: practice.id,
              criterionId: criterion.id,
              maturityLevel: r?.maturityLevel ?? 0,
              comments: r?.comments || '',
              evidence: r?.evidence || '',
              evidenceFiles: r?.evidenceFiles || [],
            });
          });
        });
      });
    } else {
      list = Object.values(responses).map(r => ({
        principleId: r.principleId,
        practiceId: r.practiceId,
        criterionId: r.criterionId,
        maturityLevel: r.maturityLevel ?? 0,
        comments: r.comments || '',
        evidence: r.evidence || '',
        evidenceFiles: r.evidenceFiles || [],
      }));
    }
    return list;
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await evaluationService.saveResponses(id, buildResponsesArray(false));
      setSaveMessage('Saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveMessage('Save failed');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const confirmSubmit = async () => {
    setMissingCriteriaModal(null);
    try {
      setSubmitting(true);
      // When submitting, we forcefully send ALL criteria so missing ones default to 0
      await evaluationService.saveResponses(id, buildResponsesArray(true));
      await evaluationService.submitEvaluation(id);
      navigate('/organization/evaluations');
    } catch (err) {
      alert('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (evaluation?.status !== 'PROOF_REQUESTED') {
      // Build full list of all criteria
      const allCriteria = [];
      GOVERNANCE.forEach(principle => {
        principle.practices.forEach(practice => {
          practice.criteria.forEach(criterion => {
            allCriteria.push({ principleId: principle.id, practiceId: practice.id, criterionId: criterion.id });
          });
        });
      });

      const missing = allCriteria.filter(c => {
        const key = `${c.principleId}-${c.practiceId}-${c.criterionId}`;
        const r = responses[key];
        return r === undefined || r.maturityLevel === undefined || r.maturityLevel === null;
      });

      const newEvidenceErrors = {};
      const missingEvidence = allCriteria.filter(c => {
        const key = `${c.principleId}-${c.practiceId}-${c.criterionId}`;
        const r = responses[key];
        if (r && (r.maturityLevel === 2 || r.maturityLevel === 3) && (!r.evidenceFiles || r.evidenceFiles.length === 0)) {
          newEvidenceErrors[key] = true;
          return true;
        }
        return false;
      });

      setEvidenceErrors(newEvidenceErrors);

      if (missing.length > 0 || missingEvidence.length > 0) {
        setSubmitAttempted(true);
        setMissingCriteriaModal({ missing, missingEvidence });
        return;
      }
    }

    confirmSubmit();
  };

  const maturityColors = ['#dc2626', '#d97706', '#2563eb', '#059669'];

  const styles = {
    page: { minHeight: '100vh', background: '#f1f5f9' },
    topBar: {
      background: 'white', borderBottom: '1px solid #e5e7eb',
      padding: '12px 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', position: 'sticky', top: 0,
      zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    topLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    backBtn: { padding: '7px 14px', background: '#f3f4f6', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
    evalName: { fontSize: '16px', fontWeight: '700', color: '#111827' },
    statusBadge: (status) => {
      const colors = {
        CREATED: ['#f3f4f6', '#374151'],
        IN_PROGRESS: ['#dbeafe', '#1e40af'],
        SUBMITTED: ['#e0e7ff', '#4338ca'],
        PROOF_REQUESTED: ['#fef3c7', '#92400e'],
        APPROVED: ['#d1fae5', '#065f46'],
        REJECTED: ['#fee2e2', '#991b1b'],
      };
      const [bg, color] = colors[status] || ['#f3f4f6', '#374151'];
      return { padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: bg, color };
    },
    topRight: { display: 'flex', alignItems: 'center', gap: '10px' },
    saveMsg: { fontSize: '13px', color: '#059669', fontWeight: '500' },
    saveDraftBtn: { padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    submitBtn: { padding: '8px 20px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'white' },
    layout: { maxWidth: '1300px', margin: '0 auto', display: 'flex', gap: '20px', padding: '20px 24px' },
    sidebar: { width: '250px', flexShrink: 0, position: 'sticky', top: '65px', height: 'fit-content', maxHeight: 'calc(100vh - 85px)', overflowY: 'auto' },
    sidebarCard: { background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
    progressBar: { height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' },
    progressFill: { height: '100%', background: 'linear-gradient(90deg, #2563eb, #7c3aed)', transition: 'width 0.3s' },
    navItem: (active, done) => ({
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 10px', borderRadius: '7px', cursor: 'pointer',
      fontSize: '12px', color: active ? '#2563eb' : '#374151',
      background: active ? '#eff6ff' : 'transparent',
      fontWeight: active ? '600' : '400', marginBottom: '2px',
    }),
    navBadge: (done) => ({
      fontSize: '11px', padding: '1px 7px', borderRadius: '10px',
      background: done ? '#d1fae5' : '#f3f4f6',
      color: done ? '#059669' : '#6b7280', fontWeight: '600',
    }),
    main: { flex: 1, minWidth: 0 },
    principleCard: { background: 'white', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
    principleHeader: (expanded) => ({
      padding: '14px 18px', cursor: 'pointer', display: 'flex',
      justifyContent: 'space-between', alignItems: 'center',
      background: expanded ? '#fafafa' : 'white', userSelect: 'none',
    }),
    criterionBlock: { padding: '16px', borderBottom: '1px solid #f9fafb' },
    criterionText: { fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '4px', lineHeight: '1.5' },
    evidenceHint: { fontSize: '11px', color: '#9ca3af', marginBottom: '10px', fontStyle: 'italic' },
    maturityGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' },
    maturityBtn: (selected, color, disabled) => ({
      padding: '10px 6px', border: `2px solid ${selected ? color : '#e5e7eb'}`,
      borderRadius: '8px', textAlign: 'center', cursor: disabled ? 'not-allowed' : 'pointer',
      background: selected ? color + '15' : disabled ? '#f9fafb' : 'white',
      opacity: disabled && !selected ? 0.5 : 1, transition: 'all 0.15s',
    }),
    uploadBox: {
      border: '2px dashed #d1d5db', borderRadius: '8px', padding: '12px',
      textAlign: 'center', cursor: 'pointer', background: '#fafafa',
      transition: 'all 0.2s', marginTop: '8px',
    },
    uploadedFile: {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
      background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
      marginTop: '8px', fontSize: '13px', color: '#065f46',
    },
    commentBox: {
      width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb',
      borderRadius: '7px', fontSize: '13px', resize: 'vertical', minHeight: '60px',
      fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
    },
    proofAlert: {
      background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px',
      padding: '10px 12px', marginBottom: '10px', fontSize: '13px', color: '#92400e',
    },
    disabledOverlay: {
      background: '#f9fafb', borderRadius: '8px', padding: '10px',
      fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', marginBottom: '8px',
    },
  };

  if (loading || fwLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>⏳</div><p style={{ color: '#6b7280' }}>Loading...</p>
    </div>
  );

  const progress = calculateProgress();
  const isReadOnly = evaluation?.status === 'SUBMITTED' || evaluation?.status === 'APPROVED';
  const isProofMode = evaluation?.status === 'PROOF_REQUESTED';

    // NOTE: useMemo was removed to satisfy lint rule about conditional hook usage.
    // The filtered governance calculation is now performed directly (memoization is not required for correctness).
    const filteredGovernance = (() => {
      if (!isProofMode) return GOVERNANCE;
      return GOVERNANCE.map(p => {
        const filteredPractices = p.practices.map(prac => ({
          ...prac,
          criteria: prac.criteria.filter(c => isProofRequested(p.id, prac.id, c.id))
        })).filter(prac => prac.criteria.length > 0);
        return { ...p, practices: filteredPractices };
      }).filter(p => p.practices.length > 0);
    })();

  return (
    <div style={styles.page}>
      {/* ── Missing-criteria / missing-evidence modal ── */}
      {missingCriteriaModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: 'white', borderRadius: '20px', width: '100%', maxWidth: '540px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden',
            animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', padding: '22px 26px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>Incomplete Evaluation</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>There are some missing items. You can go back to fix them, or submit anyway.</div>
            </div>
            <div style={{ padding: '20px 26px', overflowY: 'auto', flex: 1 }}>
              {missingCriteriaModal.missing.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#d97706', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📋</span> {missingCriteriaModal.missing.length} Criteria Without a Level Selected
                  </div>
                  <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#92400e', lineHeight: '1.7' }}>
                    Any criteria left unselected will be automatically set to level 0 (N'existe pas).
                  </div>
                </div>
              )}
              {missingCriteriaModal.missingEvidence.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#d97706', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📎</span> {missingCriteriaModal.missingEvidence.length} Criteria Missing Required Evidence
                  </div>
                  <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#92400e', lineHeight: '1.7' }}>
                    You have selected level 2 or 3 for some criteria without providing evidence.
                  </div>
                </div>
              )}
              <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#14532d', lineHeight: '1.6' }}>
                💡 <strong>Tip:</strong> Scroll through the form — criteria missing input or evidence are highlighted in red/orange.
              </div>
            </div>
            <div style={{ padding: '16px 26px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setMissingCriteriaModal(null)}
                style={{
                  flex: 1, padding: '13px',
                  background: '#f3f4f6',
                  border: 'none', borderRadius: '10px', fontSize: '14px',
                  fontWeight: '700', color: '#374151', cursor: 'pointer',
                }}
              >
                ← Go Back &amp; Fix
              </button>
              <button
                onClick={confirmSubmit}
                style={{
                  flex: 1, padding: '13px',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  border: 'none', borderRadius: '10px', fontSize: '14px',
                  fontWeight: '700', color: 'white', cursor: 'pointer',
                }}
              >
                Submit Anyway →
              </button>
            </div>
          </div>
          <style>{`
            @keyframes popIn {
              from { opacity: 0; transform: scale(0.85); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <button style={styles.backBtn} onClick={() => navigate('/organization/evaluations')}>← Back</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.evalName}>{evaluation?.name}</span>
              <span style={styles.statusBadge(evaluation?.status)}>{evaluation?.status}</span>
            </div>
          </div>
        </div>
        <div style={styles.topRight}>
          {saveMessage && <span style={styles.saveMsg}>{saveMessage}</span>}
          {!isReadOnly && (
            <>
              <button style={styles.saveDraftBtn} onClick={handleSaveDraft} disabled={saving}>
                {saving ? '⏳' : '💾'} Save Draft
              </button>
              <button style={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting ? '⏳ Submitting...' : isProofMode ? '🔄 Resubmit' : '🚀 Submit'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Proof requested banner */}
      {isProofMode && (
        <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '12px 24px', textAlign: 'center', fontSize: '14px', color: '#92400e', fontWeight: '600' }}>
          ⚠️ The evaluator has requested additional proof for {proofRequestedCriteria.length} criterion(s). Only those criteria can be updated.
        </div>
      )}

      <div style={styles.layout}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarCard}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>Progress</div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>{progress}% complete</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px' }}>Principles</div>
            {filteredGovernance.map(p => {
              const { done, total } = getPrincipleProgress(p);
              const active = expandedPrinciples.includes(p.id);
              return (
                <div key={p.id} style={styles.navItem(active, done === total)}
                  onClick={() => {
                    if (!active) togglePrinciple(p.id);
                    document.getElementById(`p-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}>
                  <span>{p.number ?? p.id}. {p.name}</span>
                  <span style={styles.navBadge(done === total)}>{done}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <div style={styles.main}>
          {filteredGovernance.map(principle => {
            const isExpanded = expandedPrinciples.includes(principle.id);
            const { done, total } = getPrincipleProgress(principle);
            const color = principle.color || '#2563eb';

            return (
              <div key={principle.id} id={`p-${principle.id}`} style={styles.principleCard}>
                <div style={styles.principleHeader(isExpanded)} onClick={() => togglePrinciple(principle.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>{principle.number ?? principle.id}</div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{principle.name}</div>
                      {principle.description && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{principle.description}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{done}/{total}</span>
                    <span style={{ color: '#9ca3af', fontSize: '16px', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
                  </div>
                </div>

                {isExpanded && principle.practices.map(practice => {
                  const practiceKey = `${principle.id}-${practice.id}`;
                  const isPracticeExpanded = expandedPractices[practiceKey] !== false;

                  return (
                    <div key={practice.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ padding: '10px 18px', background: '#f9fafb', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onClick={() => togglePractice(principle.id, practice.id)}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>📌 {practice.name}</span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{isPracticeExpanded ? '▲' : '▼'}</span>
                      </div>

                      {isPracticeExpanded && practice.criteria.map((criterion, idx) => {
                        const key = `${principle.id}-${practice.id}-${criterion.id}`;
                        const response = responses[key] || {};
                        const editable = isEditable(principle.id, practice.id, criterion.id);
                        const reviewData = getReviewData(principle.id, practice.id, criterion.id);
                        const proofNeeded = isProofRequested(principle.id, practice.id, criterion.id);
                        const isLast = idx === practice.criteria.length - 1;

                        return (
                          <div key={criterion.id} style={{ ...styles.criterionBlock, ...(isLast ? { borderBottom: 'none' } : {}) }}>

                            {/* Reviewer feedback alerts */}
                            {(proofNeeded || reviewData?.adjustedMaturityLevel !== undefined || (reviewData?.rejectedFiles && reviewData.rejectedFiles.length > 0)) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                {reviewData?.adjustedMaturityLevel !== undefined && (
                                  <div style={{ ...styles.proofAlert, background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309' }}>
                                    <strong>Warning - Maturity Level Adjusted:</strong> The evaluator adjusted the level from <strong>{response.maturityLevel}</strong> to <strong>{reviewData.adjustedMaturityLevel}</strong>. 
                                    <br/>Reason: <em>{reviewData.adjustmentReason}</em>
                                  </div>
                                )}
                                {reviewData?.proofRequested === true && (
                                  <div style={styles.proofAlert}>
                                    <strong>Action Required - General proof required:</strong> {reviewData.proofRequestComment || 'Please provide additional supporting evidence for this criterion.'}
                                  </div>
                                )}
                                {reviewData?.rejectedFiles?.some(f => f.status === 'rejected') && (
                                  <div style={styles.proofAlert}>
                                    <strong>Action Required - Evidence Rejected:</strong> Specific files were rejected by the evaluator (see details below). Please upload appropriate replacements.
                                  </div>
                                )}
                              </div>
                            )}

                            <div style={styles.criterionText}>{criterion.text}</div>
                            {criterion.evidence && (
                              <div style={styles.evidenceHint}>Expected Proof: {criterion.evidence}</div>
                            )}
                            {criterion.reference && (
                              <div style={{ ...styles.evidenceHint, fontStyle: 'normal', color: '#4b5563' }}>
                                References: {criterion.reference}
                              </div>
                            )}

                            {/* Missing level error — shown after submit attempt */}
                            {submitAttempted && editable &&
                              (response.maturityLevel === undefined || response.maturityLevel === null) && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: '#fee2e2', border: '1px solid #fca5a5',
                                borderRadius: '8px', padding: '7px 10px', marginBottom: '8px',
                                fontSize: '12px', color: '#dc2626', fontWeight: '600',
                              }}>
                                Alert: Please select a maturity level (0, 1, 2, or 3) for this criterion.
                              </div>
                            )}

                            {/* Maturity level buttons */}
                            <div style={styles.maturityGrid}>
                              {MATURITY_LEVEL_OPTIONS.map(level => {
                                const selected = response.maturityLevel === level.value;
                                const c = maturityColors[level.value];
                                const requiresEvidence = level.value === 2 || level.value === 3;
                                return (
                                  <div
                                    key={level.value}
                                    style={styles.maturityBtn(selected, c, !editable)}
                                    onClick={() => handleMaturityChange(principle.id, practice.id, criterion.id, level.value)}
                                  >
                                    <div style={{ fontSize: '18px', fontWeight: '800', color: selected ? c : (!editable ? '#d1d5db' : '#374151') }}>{level.value}</div>
                                    <div style={{ fontSize: '10px', color: selected ? c : '#9ca3af', lineHeight: '1.3', marginTop: '2px' }}>
                                      {level.label.split(' - ')[1] || level.label}
                                    </div>
                                    {requiresEvidence && (
                                      <div style={{ fontSize: '9px', color: selected ? c : '#9ca3af', marginTop: '3px', fontWeight: '600' }}>Req.</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Evidence required badge when level 2 or 3 selected + no file */}
                            {editable && (response.maturityLevel === 2 || response.maturityLevel === 3) && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: evidenceErrors[key] ? '#fee2e2' : '#fef3c7',
                                border: `1px solid ${evidenceErrors[key] ? '#fca5a5' : '#fde68a'}`,
                                borderRadius: '8px', padding: '7px 10px', marginBottom: '8px', fontSize: '12px',
                                color: evidenceErrors[key] ? '#dc2626' : '#92400e', fontWeight: '600',
                              }}>
                                {evidenceErrors[key] ? 'Alert:' : 'Note:'} {evidenceErrors[key]
                                  ? 'Evidence upload is mandatory for level 2 or 3 — please upload a file below.'
                                  : 'Level 2 & 3 require supporting evidence — please upload a document.'}
                              </div>
                            )}

                            {/* File Upload — Multiple files */}
                            {editable && (
                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: evidenceErrors[key] ? '#dc2626' : '#374151', marginBottom: '6px' }}>
                                  Upload Evidence{evidenceErrors[key] && <span style={{ color: '#dc2626', fontWeight: '700' }}> *</span>}
                                  {response.evidenceFiles?.length > 0 && (
                                    <span style={{ fontWeight: '400', color: '#6b7280', marginLeft: '6px' }}>({response.evidenceFiles.length} file{response.evidenceFiles.length > 1 ? 's' : ''})</span>
                                  )}
                                </div>

                                {/* List of uploaded files */}
                                {response.evidenceFiles?.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                                    {response.evidenceFiles.map((fname, idx) => {
                                      const rejectedData = reviewData?.rejectedFiles?.find(f => f.filename === fname);
                                      if (evaluation?.status === 'PROOF_REQUESTED' && rejectedData?.status === 'valid') {
                                        return null;
                                      }
                                      const isRejected = rejectedData?.status === 'rejected';
                                      const displayName = (response.evidenceFileNames && response.evidenceFileNames[idx]) || fname;

                                      return (
                                        <div key={idx} style={{ 
                                          ...styles.uploadedFile, 
                                          ...(isRejected ? { background: '#fef2f2', border: '1px solid #fecaca' } : {}) 
                                        }}>
                                          <span style={{ fontSize: '13px', fontWeight: '700', color: isRejected ? '#dc2626' : '#059669' }}>
                                            {isRejected ? 'Rejected' : '-'}
                                          </span>
                                          <div style={{ flex: 1, paddingLeft: '4px' }}>
                                            <div style={{ fontSize: '13px', wordBreak: 'break-all', color: isRejected ? '#dc2626' : '#374151', textDecoration: isRejected ? 'line-through' : 'none' }}>
                                              {displayName}
                                            </div>
                                            {isRejected && (
                                              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                                                <strong>Rejected:</strong> {rejectedData?.reason} {rejectedData?.comment && `— ${rejectedData.comment}`}
                                              </div>
                                            )}
                                          </div>
                                          {editable && (
                                            <button
                                              onClick={() => handleRemoveFile(principle.id, practice.id, criterion.id, idx)}
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', padding: '4px 8px', borderRadius: '4px' }}
                                              title={isRejected ? "Remove rejected file" : "Remove file"}
                                            >✕</button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Upload more button */}
                                <label style={{
                                  ...styles.uploadBox,
                                  ...(evidenceErrors[key] ? { border: '2px dashed #ef4444', background: '#fff1f2' } : {}),
                                }}>
                                  <input type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={e => { handleFileUpload(principle.id, practice.id, criterion.id, e.target.files[0]); e.target.value = ''; }} />
                                  {uploadingKey === key ? (
                                    <div style={{ fontSize: '13px', color: '#6b7280' }}>⏳ Uploading...</div>
                                  ) : (
                                    <>
                                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{evidenceErrors[key] ? '🚨' : '➕'}</div>
                                      <div style={{ fontSize: '12px', color: evidenceErrors[key] ? '#dc2626' : '#9ca3af', fontWeight: evidenceErrors[key] ? '600' : '400' }}>
                                        {response.evidenceFiles?.length > 0
                                          ? 'Click to add another file (PDF, DOC, or image, max 10MB)'
                                          : evidenceErrors[key]
                                            ? 'Evidence required — click to upload (PDF, DOC, or image)'
                                            : 'Click to upload PDF, DOC, or image (max 10MB)'}
                                      </div>
                                    </>
                                  )}
                                </label>
                              </div>
                            )}

                            {/* View uploaded files if read-only */}
                            {!editable && response.evidenceFiles?.length > 0 && (
                              <div style={{ marginBottom: '8px' }}>
                                {response.evidenceFiles.map((fname, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', color: '#059669', marginBottom: '2px' }}>
                                    ✓ Evidence #{idx + 1}: {(response.evidenceFileNames && response.evidenceFileNames[idx]) || fname}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Comment */}
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Comment (optional)</div>
                            <textarea
                              style={{ ...styles.commentBox, ...((!editable) ? { background: '#f9fafb', color: '#9ca3af' } : {}) }}
                              placeholder={editable ? 'Add notes...' : ''}
                              value={response.comments || ''}
                              onChange={e => handleCommentChange(principle.id, practice.id, criterion.id, e.target.value)}
                              disabled={!editable}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Bottom bar */}
          {!isReadOnly && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', marginTop: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                {progress < 100 ? `${100 - progress}% remaining` : '✓ All criteria filled!'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={styles.saveDraftBtn} onClick={handleSaveDraft} disabled={saving}>{saving ? 'Saving...' : 'Save Draft'}</button>
                <button style={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : isProofMode ? 'Resubmit' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationFormPage;