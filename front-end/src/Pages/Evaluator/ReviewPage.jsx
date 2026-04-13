import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import evaluatorService from '../../Services/evaluatorService';
import governanceService from '../../Services/governanceService';
import { GOVERNANCE_PRINCIPLES, MATURITY_LEVEL_OPTIONS } from '../../utils/constants';
import { normalizeGovernanceFramework } from '../../utils/governanceFramework';

const REJECTION_REASONS = [
  "Document not signed / not officially approved",
  "Document is outdated or not the current version",
  "Document is a draft or template, not implemented",
  "Scope is incomplete (doesn't cover all required elements)",
  "No proof of actual application or enforcement",
  "No proof of communication or dissemination",
  "Roles and responsibilities not clearly assigned",
  "No monitoring report or follow-up evidence",
  "Reference text provided instead of internal document",
  "Periodic review not documented",
  "Only partially addresses the criterion",
  "Not issued by the appropriate governance body",
  "Other"
];

const SecureEvidenceViewer = ({ evaluationId, filename, styles, onReject, isRejected, rejectionData }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl;
    const fetchFile = async () => {
      try {
        const blob = await evaluatorService.getFile(evaluationId, filename);
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load file', err);
        setError(true);
      }
    };
    fetchFile();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [evaluationId, filename]);

  if (error) return <div style={{ fontSize: '12px', color: '#dc2626' }}>Failed to load evidence file.</div>;
  if (!url) return <div style={{ fontSize: '12px', color: '#6b7280' }}>Loading evidence...</div>;

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  const isPdf = /\.pdf$/i.test(filename);

  if (isImage) {
    return <img src={url} alt="Evidence" style={styles.inlineImage} />;
  }
  if (isPdf) {
    return <iframe src={url} style={styles.inlinePdf} title="Evidence PDF" />;
  }
  return (
    <div style={{ fontSize: '12px', color: '#2563eb' }}>
      📄 {filename}
    </div>
  );
};

const ReviewPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();

  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Evaluator's per-criterion reviews
  // key: `${principleId}-${practiceId}-${criterionId}`
  const [criterionReviews, setCriterionReviews] = useState({});

  const [expandedPrinciples, setExpandedPrinciples] = useState([]);
  const [activeAction, setActiveAction] = useState(null);

  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentLevel, setAdjustmentLevel] = useState(null);
  const [proofRequestComment, setProofRequestComment] = useState(''); // 'request-proof'
  const [globalReason, setGlobalReason] = useState('');
  const [framework, setFramework] = useState(null);
  const [fwLoading, setFwLoading] = useState(true);

  const GOVERNANCE = framework || GOVERNANCE_PRINCIPLES;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await governanceService.getFramework();
        if (!cancelled) setFramework(normalizeGovernanceFramework(data));
      } catch (e) {
        if (!cancelled) setFramework(GOVERNANCE_PRINCIPLES);
      } finally {
        if (!cancelled) setFwLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    loadDetails();
  }, [id]);

  useEffect(() => {
    if (!framework) return;
    setExpandedPrinciples(framework.map((p) => p.id));
  }, [framework]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const data = await evaluatorService.getEvaluationDetails(id);
      setEvaluation(data);

      // Pre-populate existing criterion reviews
      if (data.criterionReviews?.length > 0) {
        const map = {};
        data.criterionReviews.forEach(r => {
          const key = `${r.principleId}-${r.practiceId}-${r.criterionId}`;
          if (r.rejectedFiles && typeof r.rejectedFiles === 'string') {
            try { r.rejectedFiles = JSON.parse(r.rejectedFiles); } catch(e) { r.rejectedFiles = []; }
          } else if (!r.rejectedFiles) {
            r.rejectedFiles = [];
          }
          map[key] = r;
        });
        setCriterionReviews(map);
      }
    } catch (err) {
      console.error('Error loading evaluation details:', err);
      navigate('/evaluator/queue');
    } finally {
      setLoading(false);
    }
  };

  // Get org response for a criterion
  const getResponse = (principleId, practiceId, criterionId) => {
    if (!evaluation?.responses) return null;
    return evaluation.responses.find(
      r => r.principleId == principleId &&
        r.practiceId == practiceId &&
        r.criterionId == criterionId
    );
  };

  // Get evaluator review for a criterion
  const getReview = (principleId, practiceId, criterionId) => {
    return criterionReviews[`${principleId}-${practiceId}-${criterionId}`] || {};
  };

  const updateReview = (principleId, practiceId, criterionId, field, value) => {
    const key = `${principleId}-${practiceId}-${criterionId}`;
    setCriterionReviews(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        principleId,
        practiceId,
        criterionId,
        [field]: value,
      }
    }));
  };

  const updateFileStatus = (principleId, practiceId, criterionId, filename, status, reason = '', comment = '') => {
    const key = `${principleId}-${practiceId}-${criterionId}`;
    setCriterionReviews(prev => {
      const current = prev[key] || { principleId, practiceId, criterionId, rejectedFiles: [] };
      let updatedFiles = [...(current.rejectedFiles || [])];
      
      const existingIndex = updatedFiles.findIndex(f => f.filename === filename);
      if (existingIndex >= 0) {
        updatedFiles[existingIndex] = { ...updatedFiles[existingIndex], status, reason: status === 'rejected' ? reason : undefined, comment: status === 'rejected' ? comment : undefined };
      } else {
        updatedFiles.push({ filename, status, reason: status === 'rejected' ? reason : undefined, comment: status === 'rejected' ? comment : undefined });
      }
      
      return {
        ...prev,
        [key]: {
          ...current,
          rejectedFiles: updatedFiles
        }
      };
    });
  };

  const buildCriterionReviewsArray = () => {
    return Object.values(criterionReviews)
      .map(r => {
        const hasRejectedFile = r.rejectedFiles?.some(f => f.status === 'rejected');
        const hasComment = r.proofRequestComment && r.proofRequestComment.trim() !== '';
        // Automatically flag as needing proof if there are rejected files or comments
        if (hasRejectedFile || hasComment) {
          return { ...r, proofRequested: true };
        }
        return r;
      })
      .filter(r =>
        r.adjustedMaturityLevel !== undefined ||
        r.proofRequested === true ||
        (r.rejectedFiles && r.rejectedFiles.length > 0)
      );
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      await evaluatorService.approveEvaluation(id, {
        criterionReviews: buildCriterionReviewsArray(),
      });
      navigate('/evaluator/queue');
    } catch (err) {
      alert('Failed to approve evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!globalReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    try {
      setSubmitting(true);
      await evaluatorService.rejectEvaluation(id, globalReason);
      navigate('/evaluator/queue');
    } catch (err) {
      alert('Failed to reject evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestProof = async () => {
    try {
      setSubmitting(true);
      await evaluatorService.requestProof(id, {
        criterionReviews: buildCriterionReviewsArray(),
      });
      navigate('/evaluator/queue');
    } catch (err) {
      alert('Failed to request additional proof');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustScore = (principleId, practiceId, criterionId, level, reason, currentMaturity) => {
    if (!reason.trim()) {
      alert('Please provide a reason for adjustment');
      return;
    }
    // Update the review with adjusted level and reason
    updateReview(principleId, practiceId, criterionId, 'adjustedMaturityLevel', level);
    updateReview(principleId, practiceId, criterionId, 'adjustmentReason', reason);
    updateReview(principleId, practiceId, criterionId, 'proofRequested', false);

    // Close adjustment modal
    setActiveAction(null);
    setAdjustmentReason('');
    setAdjustmentLevel(null);
  };

  const handleRequestProofModal = (principleId, practiceId, criterionId) => {
    setActiveAction('request-proof');
    setProofRequestComment('');
  };

  const handleCancelAdjustment = () => {
    setActiveAction(null);
    setAdjustmentReason('');
    setAdjustmentLevel(null);
  };

  const handleSubmitProofRequest = (principleId, practiceId, criterionId) => {
    if (!proofRequestComment.trim()) {
      alert('Please describe what additional proof is needed');
      return;
    }
    // Update the review with proof request
    updateReview(principleId, practiceId, criterionId, 'proofRequested', true);
    updateReview(principleId, practiceId, criterionId, 'proofRequestComment', proofRequestComment);

    // Close proof request modal
    setActiveAction(null);
    setProofRequestComment('');
  };


  const maturityColors = ['#dc2626', '#d97706', '#2563eb', '#059669'];
  const maturityLabels = ["N'existe pas", 'En cours', 'Réalisé', 'Validé'];

  const styles = {
    page: { minHeight: '100vh', background: '#f1f5f9' },
    topBar: {
      background: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    topLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    backBtn: {
      padding: '7px 14px',
      background: '#f3f4f6',
      border: 'none',
      borderRadius: '7px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
    },
    evalTitle: { fontSize: '16px', fontWeight: '700', color: '#111827' },
    orgName: { fontSize: '12px', color: '#6b7280' },
    topRight: { display: 'flex', gap: '10px' },
    actionBtn: (color) => ({
      padding: '8px 18px',
      background: color,
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      color: 'white',
    }),
    layout: {
      maxWidth: '1300px',
      margin: '0 auto',
      padding: '20px 24px',
      display: 'flex',
      gap: '20px',
      paddingBottom: '100px',
    },
    sidebar: {
      width: '280px',
      flexShrink: 0,
      position: 'sticky',
      top: '85px',
      height: 'fit-content',
      background: 'white',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto'
    },
    sidebarItem: (active) => ({
      fontSize: '13px',
      padding: '8px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      background: active ? '#f3f4f6' : 'white',
      color: '#111827',
      fontWeight: '600',
      marginBottom: '4px'
    }),
    sidebarSub: {
      fontSize: '12px',
      color: '#6b7280',
      paddingLeft: '24px',
      paddingTop: '4px',
      paddingBottom: '4px',
      cursor: 'pointer'
    },
    stickyFooter: {
      position: 'fixed',
      bottom: 0, 
      left: 0, 
      right: 0,
      background: 'white',
      borderTop: '1px solid #e5e7eb',
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
      zIndex: 100
    },
    main: { flex: 1 },
    actionPanel: { display: 'none' },
    textarea: {
      width: '100%',
      padding: '10px',
      border: '1px solid #e5e7eb',
      borderRadius: '7px',
      fontSize: '13px',
      resize: 'vertical',
      minHeight: '80px',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      marginBottom: '8px',
    },
    principleCard: {
      background: 'white',
      borderRadius: '12px',
      marginBottom: '10px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    principleHeader: {
      padding: '14px 18px',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#fafafa',
      borderBottom: '1px solid #f3f4f6',
    },
    criterionRow: {
      padding: '16px',
      borderBottom: '1px solid #f9fafb',
    },
    criterionText: { fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '8px' },
    orgScore: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '8px',
    },
    evidenceSection: {
      background: '#f9fafb',
      borderRadius: '8px',
      padding: '10px',
      marginBottom: '10px',
    },
    evidenceTitle: { fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px' },
    inlineImage: {
      maxWidth: '100%',
      maxHeight: '300px',
      borderRadius: '6px',
      border: '1px solid #e5e7eb',
    },
    inlinePdf: {
      width: '100%',
      height: '400px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
    },
    adjustSection: {
      background: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: '8px',
      padding: '10px',
      marginTop: '8px',
    },
    adjustTitle: { fontSize: '12px', fontWeight: '600', color: '#92400e', marginBottom: '8px' },
    maturityBtns: { display: 'flex', gap: '6px', marginBottom: '8px' },
    maturityBtn: (selected, color) => ({
      padding: '6px 12px',
      border: `2px solid ${selected ? color : '#e5e7eb'}`,
      borderRadius: '6px',
      background: selected ? color + '20' : 'white',
      color: selected ? color : '#6b7280',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '700',
    }),
    proofSection: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '10px',
      marginTop: '8px',
    },
    proofTitle: { fontSize: '12px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' },
    checkboxRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' },
    noResponse: { fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' },
  };

  if (loading || fwLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <p>Loading evaluation...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <button style={styles.backBtn} onClick={() => navigate('/evaluator/queue')}>← Back</button>
          <div>
            <div style={styles.evalTitle}>{evaluation?.name}</div>
            <div style={styles.orgName}>{evaluation?.organization?.name}</div>
          </div>
        </div>
        <div style={styles.topRight}>
          {/* Note: the main action buttons have been moved to the sticky footer */}
        </div>
      </div>

      <div style={styles.layout}>
        {/* Sidebar Navigation */}
        <div style={styles.sidebar}>
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>Framework Navigation</div>
          {GOVERNANCE.map(principle => (
            <div key={`side-${principle.id}`} style={{ marginBottom: '8px' }}>
              <div
                style={styles.sidebarItem(false)}
                onClick={() => {
                  const el = document.getElementById(`principle-${principle.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {principle.name}
              </div>
              {expandedPrinciples.includes(principle.id) && principle.practices.map(practice => (
                <div
                  key={`side-pr-${practice.id}`}
                  style={styles.sidebarSub}
                  onClick={() => {
                    const el = document.getElementById(`practice-${principle.id}-${practice.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  └ {practice.name}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div style={styles.main}>
          {GOVERNANCE.map(principle => {
            const isExpanded = expandedPrinciples.includes(principle.id);
            const responses = evaluation?.responses?.filter(r => r.principleId == principle.id) || [];

            return (
              <div id={`principle-${principle.id}`} key={principle.id} style={styles.principleCard}>
                <div
                  style={styles.principleHeader}
                  onClick={() => setExpandedPrinciples(prev =>
                    prev.includes(principle.id)
                      ? prev.filter(p => p !== principle.id)
                      : [...prev, principle.id]
                  )}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '6px',
                      background: principle.color, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '800',
                    }}>{principle.number ?? principle.id}</div>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>
                      {principle.name}
                    </span>
                  </div>
                  <span style={{ color: '#9ca3af' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded && principle.practices.map(practice =>
                  practice.criteria.map((criterion, idx) => {
                    const response = getResponse(principle.id, practice.id, criterion.id);
                    const review = getReview(principle.id, practice.id, criterion.id);
                    const orgLevel = response?.maturityLevel;
                    const adjLevel = review.adjustedMaturityLevel;
                    const orgColor = orgLevel !== null && orgLevel !== undefined
                      ? maturityColors[orgLevel] : '#9ca3af';

                    return (
                      <div id={idx === 0 ? `practice-${principle.id}-${practice.id}` : undefined} key={`${principle.id}-${practice.id}-${criterion.id}`} style={styles.criterionRow}>
                        <div style={styles.criterionText}>{criterion.text}</div>
                        {criterion.evidence && (
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                            Expected Proof: {criterion.evidence}
                          </div>
                        )}
                        {criterion.reference && (
                          <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '6px' }}>
                            References: {criterion.reference}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>
                          Bonne pratique : {practice.name}
                        </div>

                        {/* Org's selected maturity level */}
                        {response ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>Organization selected:</span>
                              <span style={{
                                ...styles.orgScore,
                                background: orgColor + '20',
                                color: orgColor,
                                border: `1px solid ${orgColor}40`,
                              }}>
                                Level {orgLevel} — {maturityLabels[orgLevel]}
                              </span>
                              {adjLevel !== undefined && (
                                <span style={{
                                  ...styles.orgScore,
                                  background: maturityColors[adjLevel] + '20',
                                  color: maturityColors[adjLevel],
                                  border: `1px solid ${maturityColors[adjLevel]}40`,
                                }}>
                                  Adjusted to Level {adjLevel}
                                </span>
                              )}
                            </div>

                            {/* View evidence */}
                            {((response.evidenceFiles && response.evidenceFiles.length > 0) || response.evidence || response.comments) && (
                              <div style={styles.evidenceSection}>
                                <div style={styles.evidenceTitle}>Submitted Evidence</div>

                                {response.comments && (
                                  <div style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
                                    <strong>Comment:</strong> {response.comments}
                                  </div>
                                )}

                                {response.evidenceFiles && response.evidenceFiles.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {response.evidenceFiles.map((fname, fidx) => {
                                      const splitName = fname.split(' - ')[1] || fname;
                                      return (
                                        <div key={fidx} style={{ 
                                          border: '1px solid #e5e7eb', 
                                          padding: '10px', 
                                          borderRadius: '8px',
                                          background: '#ffffff' 
                                        }}>
                                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                                            File {fidx + 1} of {response.evidenceFiles.length}: <span style={{ color: '#111827' }}>{splitName}</span>
                                          </div>
                                          <SecureEvidenceViewer
                                            evaluationId={evaluation.evaluationId}
                                            filename={fname}
                                            styles={{...styles, evidenceBtn: {...styles.evidenceBtn, margin: 0}}}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Score Adjustment Section */}
                            <div style={styles.adjustSection}>
                              <div style={styles.adjustTitle}>Adjust Score (optional)</div>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '10px' }}>
                                You cannot adjust to Level 0, or to the same level the organization selected. The organization will be notified of your adjustment reason.
                              </div>
                              <div style={styles.maturityBtns}>
                                {[1, 2, 3].map(lvl => {
                                  const disabled = orgLevel === lvl;
                                  const selected = adjLevel === lvl;
                                  return (
                                    <button
                                      key={lvl}
                                      style={{
                                        ...styles.maturityBtn(selected, maturityColors[lvl]),
                                        opacity: disabled ? 0.4 : 1,
                                        cursor: disabled ? 'not-allowed' : 'pointer'
                                      }}
                                      disabled={disabled}
                                      title={disabled ? "Organization already selected this level" : `Adjust to level ${lvl}`}
                                      onClick={() => {
                                        if (selected) {
                                          updateReview(principle.id, practice.id, criterion.id, 'adjustedMaturityLevel', undefined);
                                        } else {
                                          updateReview(principle.id, practice.id, criterion.id, 'adjustedMaturityLevel', lvl);
                                        }
                                      }}
                                    >
                                      {lvl}
                                    </button>
                                  );
                                })}
                                {adjLevel !== undefined && (
                                  <button
                                    style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#6b7280' }}
                                    onClick={() => updateReview(principle.id, practice.id, criterion.id, 'adjustedMaturityLevel', undefined)}
                                  >
                                    ✕ Clear
                                  </button>
                                )}
                              </div>
                              {adjLevel !== undefined && (
                                <textarea
                                  style={styles.textarea}
                                  placeholder="Reason for adjustment (required) *"
                                  value={review.adjustmentReason || ''}
                                  onChange={e => updateReview(principle.id, practice.id, criterion.id, 'adjustmentReason', e.target.value)}
                                />
                              )}
                            </div>

                            {/* Request Proof / Validate Section */}
                            <div style={{...styles.proofSection, marginTop: '20px'}}>
                              {response.evidenceFiles && response.evidenceFiles.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                                    Validate Uploaded Evidence:
                                  </div>
                                  {response.evidenceFiles.map((fname, fidx) => {
                                    const fileStatusData = review.rejectedFiles?.find(f => f.filename === fname);
                                    const status = fileStatusData?.status;
                                    const splitName = fname.split(' - ')[1] || fname;
                                    
                                    return (
                                      <div key={fidx} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', marginBottom: '8px', background: 'white' }}>
                                        <div style={{ fontSize: '12px', wordBreak: 'break-all', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>{splitName}</div>
                                        <div style={{ display: 'flex', gap: '20px' }}>
                                          <label style={{ cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input 
                                              type="radio" 
                                              checked={status === 'valid'} 
                                              onChange={() => updateFileStatus(principle.id, practice.id, criterion.id, fname, 'valid')} 
                                            /> 
                                            <span style={{ color: '#059669', fontWeight: '600' }}>Valid</span>
                                          </label>
                                          <label style={{ cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input 
                                              type="radio" 
                                              checked={status === 'rejected'} 
                                              onChange={() => updateFileStatus(principle.id, practice.id, criterion.id, fname, 'rejected')} 
                                            /> 
                                            <span style={{ color: '#dc2626', fontWeight: '600' }}>Rejected</span>
                                          </label>
                                        </div>
                                        
                                        {status === 'rejected' && (
                                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fca5a5' }}>
                                            <select
                                              style={{ ...styles.textarea, minHeight: 'auto', marginBottom: '8px', padding: '6px', fontSize: '12px' }}
                                              value={fileStatusData?.reason || ''}
                                              onChange={e => updateFileStatus(principle.id, practice.id, criterion.id, fname, 'rejected', e.target.value, fileStatusData?.comment)}
                                            >
                                              <option value="" disabled>Select a reason...</option>
                                              {REJECTION_REASONS.map((r, i) => <option key={i} value={r}>{r}</option>)}
                                            </select>
                                            
                                            {(fileStatusData?.reason === 'Other' || fileStatusData?.reason) && (
                                              <input
                                                type="text"
                                                placeholder="Additional comment (optional)"
                                                style={{ ...styles.textarea, minHeight: 'auto', padding: '6px', fontSize: '12px' }}
                                                value={fileStatusData?.comment || ''}
                                                onChange={e => updateFileStatus(principle.id, practice.id, criterion.id, fname, 'rejected', fileStatusData?.reason, e.target.value)}
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                                Ask for additional file(s) or explanation (Optional):
                              </div>
                              <textarea
                                style={styles.textarea}
                                placeholder="Describe what missing proof is needed..."
                                value={review.proofRequestComment || ''}
                                onChange={e => updateReview(principle.id, practice.id, criterion.id, 'proofRequestComment', e.target.value)}
                              />
                            </div>
                          </>
                        ) : (
                          <div style={styles.noResponse}>No response submitted for this criterion</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>

        {/* Action Panel was removed, replaced with Sticky Footer below */}
      </div>

      {/* Sticky Action Footer */}
      <div style={styles.stickyFooter}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
            <span style={{ color: '#d97706', fontWeight: '700' }}>{Object.values(criterionReviews).filter(r => r.proofRequested).length}</span> criteria flagged for proof
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
            <span style={{ color: '#059669', fontWeight: '700' }}>{Object.values(criterionReviews).filter(r => r.adjustedMaturityLevel !== undefined).length}</span> criteria adjusted
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* General Reject */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', width: '200px' }}
              placeholder="Global rejection reason..."
              value={globalReason}
              onChange={e => setGlobalReason(e.target.value)}
            />
            <button
              style={{ ...styles.actionBtn('#dc2626'), padding: '8px 16px' }}
              onClick={handleReject}
              disabled={submitting}
            >
              {submitting ? '...' : 'Reject All'}
            </button>
          </div>

          <div style={{ width: '1px', background: '#d1d5db', height: '24px' }} />

          <button
            style={styles.actionBtn('#f59e0b')}
            onClick={handleRequestProof}
            disabled={submitting || Object.values(criterionReviews).filter(r => r.proofRequested).length === 0}
          >
            {submitting ? '...' : 'Request Proof'}
          </button>
          
          <button
            style={styles.actionBtn('#059669')}
            onClick={handleApprove}
            disabled={submitting}
          >
            {submitting ? '...' : 'Approve Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;