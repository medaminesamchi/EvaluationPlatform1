import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import evaluatorService from '../../Services/evaluatorService';
import governanceService from '../../Services/governanceService';
import { GOVERNANCE_PRINCIPLES, MATURITY_LEVEL_OPTIONS } from '../../utils/constants';
import { normalizeGovernanceFramework } from '../../utils/governanceFramework';

const SecureEvidenceViewer = ({ evaluationId, filename, styles }) => {
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

  const buildCriterionReviewsArray = () => {
    return Object.values(criterionReviews).filter(r =>
      r.adjustedMaturityLevel !== undefined ||
      r.proofRequested === true
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
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px 24px',
      display: 'flex',
      gap: '20px',
    },
    main: { flex: 1 },
    actionPanel: {
      width: '320px',
      flexShrink: 0,
      position: 'sticky',
      top: '65px',
      height: 'fit-content',
    },
    actionCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      marginBottom: '12px',
    },
    actionCardTitle: { fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '12px' },
    actionCardBtn: (color, outline) => ({
      width: '100%',
      padding: '10px',
      background: outline ? 'white' : color,
      border: `2px solid ${color}`,
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      color: outline ? color : 'white',
      marginBottom: '8px',
    }),
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
        <div style={{ fontSize: '48px' }}>⏳</div>
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
          <button style={styles.actionBtn('#dc2626')} onClick={() => setActiveAction('reject')}>
            ❌ Reject
          </button>
          <button style={styles.actionBtn('#f59e0b')} onClick={() => setActiveAction('request-proof')}>
            📋 Request Proof
          </button>
          <button style={styles.actionBtn('#059669')} onClick={() => setActiveAction('approve')}>
            ✅ Approve
          </button>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Main Content */}
        <div style={styles.main}>
          {GOVERNANCE.map(principle => {
            const isExpanded = expandedPrinciples.includes(principle.id);
            const responses = evaluation?.responses?.filter(r => r.principleId == principle.id) || [];

            return (
              <div key={principle.id} style={styles.principleCard}>
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
                  practice.criteria.map(criterion => {
                    const response = getResponse(principle.id, practice.id, criterion.id);
                    const review = getReview(principle.id, practice.id, criterion.id);
                    const orgLevel = response?.maturityLevel;
                    const adjLevel = review.adjustedMaturityLevel;
                    const orgColor = orgLevel !== null && orgLevel !== undefined
                      ? maturityColors[orgLevel] : '#9ca3af';

                    return (
                      <div key={`${principle.id}-${practice.id}-${criterion.id}`} style={styles.criterionRow}>
                        <div style={styles.criterionText}>{criterion.text}</div>
                        {criterion.evidence && (
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                            📎 Preuves attendues : {criterion.evidence}
                          </div>
                        )}
                        {criterion.reference && (
                          <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '6px' }}>
                            📚 Références : {criterion.reference}
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
                                  ✏️ Adjusted to Level {adjLevel}
                                </span>
                              )}
                            </div>

                            {/* Evidence/Comments from org */}
                            {(response.evidenceFile || response.evidence || response.comments) && (
                              <div style={styles.evidenceSection}>
                                <div style={styles.evidenceTitle}>📎 Submitted Evidence</div>

                                {response.comments && (
                                  <div style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
                                    <strong>Comment:</strong> {response.comments}
                                  </div>
                                )}

                                {response.evidenceFile && (
                                  <SecureEvidenceViewer 
                                    evaluationId={evaluation.evaluationId} 
                                    filename={response.evidenceFile} 
                                    styles={styles} 
                                  />
                                )}
                              </div>
                            )}

                            {/* Score Adjustment Section */}
                            <div style={styles.adjustSection}>
                              <div style={styles.adjustTitle}>✏️ Adjust Score (optional)</div>
                              <div style={styles.maturityBtns}>
                                {[0, 1, 2, 3].map(lvl => (
                                  <button
                                    key={lvl}
                                    style={styles.maturityBtn(adjLevel === lvl, maturityColors[lvl])}
                                    onClick={() => {
                                      if (adjLevel === lvl) {
                                        updateReview(principle.id, practice.id, criterion.id, 'adjustedMaturityLevel', undefined);
                                      } else {
                                        updateReview(principle.id, practice.id, criterion.id, 'adjustedMaturityLevel', lvl);
                                      }
                                    }}
                                  >
                                    {lvl}
                                  </button>
                                ))}
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

                            {/* Request Proof Section */}
                            <div style={styles.proofSection}>
                              <div style={styles.checkboxRow}>
                                <input
                                  type="checkbox"
                                  id={`proof-${principle.id}-${practice.id}-${criterion.id}`}
                                  checked={review.proofRequested === true}
                                  onChange={e => updateReview(principle.id, practice.id, criterion.id, 'proofRequested', e.target.checked)}
                                />
                                <label
                                  htmlFor={`proof-${principle.id}-${practice.id}-${criterion.id}`}
                                  style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626', cursor: 'pointer' }}
                                >
                                  🔴 Request additional proof for this criterion
                                </label>
                              </div>
                              {review.proofRequested && (
                                <textarea
                                  style={styles.textarea}
                                  placeholder="Describe what proof is needed..."
                                  value={review.proofRequestComment || ''}
                                  onChange={e => updateReview(principle.id, practice.id, criterion.id, 'proofRequestComment', e.target.value)}
                                />
                              )}
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

        {/* Action Panel */}
        <div style={styles.actionPanel}>
          {/* Approve */}
          <div style={styles.actionCard}>
            <div style={styles.actionCardTitle}>✅ Approve Evaluation</div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
              Approve this evaluation. Any score adjustments you made above will be applied.
            </p>
            <button
              style={styles.actionCardBtn('#059669')}
              onClick={handleApprove}
              disabled={submitting}
            >
              {submitting ? '⏳' : '✅'} Approve
            </button>
          </div>

          {/* Request Proof */}
          <div style={styles.actionCard}>
            <div style={styles.actionCardTitle}>📋 Request Additional Proof</div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
              Flag specific criteria above that need more evidence. The organization will only be able to update those criteria.
            </p>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#d97706', marginBottom: '8px' }}>
              {Object.values(criterionReviews).filter(r => r.proofRequested).length} criteria flagged
            </div>
            <button
              style={styles.actionCardBtn('#f59e0b')}
              onClick={handleRequestProof}
              disabled={submitting}
            >
              {submitting ? '⏳' : '📋'} Send Request
            </button>
          </div>

          {/* Reject */}
          <div style={styles.actionCard}>
            <div style={styles.actionCardTitle}>❌ Reject Evaluation</div>
            <textarea
              style={styles.textarea}
              placeholder="Reason for rejection (required)..."
              value={globalReason}
              onChange={e => setGlobalReason(e.target.value)}
            />
            <button
              style={styles.actionCardBtn('#dc2626')}
              onClick={handleReject}
              disabled={submitting}
            >
              {submitting ? '⏳' : '❌'} Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;