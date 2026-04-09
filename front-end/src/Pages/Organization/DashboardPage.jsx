import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import evaluationService from '../../Services/evaluationService';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await evaluationService.getMyEvaluations();
      
      const enhancedData = await Promise.all(data.map(async (e) => {
        if (e.status === 'PROOF_REQUESTED') {
          try {
            const reviews = await evaluationService.getCriterionReviews(e.evaluationId);
            const flaggedCount = reviews.filter(r => r.proofRequested).length;
            return { ...e, flaggedCount };
          } catch (err) {
            console.error('Error fetching reviews:', err);
            return e;
          }
        }
        return e;
      }));
      
      setEvaluations(enhancedData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Find current year's evaluation
  const currentEval = evaluations.find(e =>
    e.period && e.period.includes(String(currentYear))
  );

  const getStatusInfo = (status) => {
    const map = {
      CREATED:          { label: 'Not started',        color: '#6b7280', bg: '#f3f4f6', icon: '📋' },
      IN_PROGRESS:      { label: 'In progress',        color: '#2563eb', bg: '#dbeafe', icon: '✏️' },
      SUBMITTED:        { label: 'Under review',       color: '#7c3aed', bg: '#ede9fe', icon: '📤' },
      PROOF_REQUESTED:  { label: 'Proof requested',    color: '#d97706', bg: '#fef3c7', icon: '⚠️' },
      APPROVED:         { label: 'Approved',           color: '#059669', bg: '#d1fae5', icon: '✅' },
      REJECTED:         { label: 'Rejected',           color: '#dc2626', bg: '#fee2e2', icon: '❌' },
    };
    return map[status] || map.CREATED;
  };

  const getActionLabel = (status) => {
    if (status === 'CREATED')         return '▶️ Start Evaluation';
    if (status === 'IN_PROGRESS')     return '✏️ Continue Evaluation';
    if (status === 'PROOF_REQUESTED') return '🔄 Provide Proof';
    if (status === 'APPROVED')        return '🏆 View Results';
    if (status === 'SUBMITTED')       return '👁️ View Submission';
    if (status === 'REJECTED')        return '🔄 View Details';
    return '▶️ Open';
  };

  const handleAction = (evaluation) => {
    if (['CREATED', 'IN_PROGRESS', 'PROOF_REQUESTED'].includes(evaluation.status)) {
      navigate(`/organization/evaluations/edit/${evaluation.evaluationId}`);
    } else if (evaluation.status === 'APPROVED') {
      navigate('/organization/results');
    } else {
      navigate(`/organization/evaluations/edit/${evaluation.evaluationId}`);
    }
  };

  const styles = {
    container: { padding: '28px', maxWidth: '1200px', margin: '0 auto' },
    welcome: { marginBottom: '28px' },
    welcomeTitle: { fontSize: '26px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' },
    welcomeSub: { fontSize: '15px', color: '#6b7280' },

    // Current year evaluation card — big and prominent
    currentEvalCard: {
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
      borderRadius: '16px',
      padding: '28px',
      marginBottom: '24px',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '20px',
    },
    currentEvalLeft: {},
    currentEvalYear: { fontSize: '13px', fontWeight: '600', opacity: 0.8, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' },
    currentEvalTitle: { fontSize: '22px', fontWeight: '800', marginBottom: '10px' },
    currentEvalStatus: (info) => ({
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
      background: 'rgba(255,255,255,0.2)', color: 'white',
    }),
    currentEvalBtn: {
      padding: '12px 24px', background: 'white', color: '#1e3a8a',
      border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    },
    noEvalCard: {
      background: '#f9fafb', border: '2px dashed #d1d5db',
      borderRadius: '16px', padding: '28px', marginBottom: '24px',
      textAlign: 'center',
    },
    noEvalTitle: { fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
    noEvalSub: { fontSize: '14px', color: '#6b7280' },
    noEvalBtn: {
      marginTop: '14px',
      padding: '12px 20px',
      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
      border: 'none',
      borderRadius: '10px',
      color: 'white',
      fontWeight: '700',
      cursor: 'pointer',
    },

  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '40px' }}>⏳</div><p style={{ color: '#6b7280' }}>Loading...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Welcome */}
      <div style={styles.welcome}>
        <div style={styles.welcomeTitle}>Welcome, {user?.name || 'Organization'} 👋</div>
        <div style={styles.welcomeSub}>Your annual evaluation is managed here.</div>
      </div>

      {/* Current Year Evaluation — Main Feature */}
      {currentEval ? (
        <div style={styles.currentEvalCard}>
          <div style={styles.currentEvalLeft}>
            <div style={styles.currentEvalYear}>📅 {currentYear} Annual Evaluation</div>
            <div style={styles.currentEvalTitle}>{currentEval.name}</div>
            <div style={styles.currentEvalStatus(getStatusInfo(currentEval.status))}>
              {getStatusInfo(currentEval.status).icon} {getStatusInfo(currentEval.status).label}
            </div>
              {currentEval.totalScore > 0 && (
              <div style={{ marginTop: '8px', fontSize: '14px', opacity: 0.9 }}>
                Score: {Math.round(currentEval.totalScore)}%
              </div>
            )}
            {currentEval.status === 'PROOF_REQUESTED' && currentEval.flaggedCount > 0 && (
              <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: '700', padding: '6px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ Requires proof for {currentEval.flaggedCount} criteria
              </div>
            )}
          </div>
          <button style={styles.currentEvalBtn} onClick={() => handleAction(currentEval)}>
            {getActionLabel(currentEval.status)}
          </button>
        </div>
      ) : (
        <div style={styles.noEvalCard}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
          <div style={styles.noEvalTitle}>No evaluation for {currentYear} yet</div>
          <div style={styles.noEvalSub}>Start your annual evaluation to fill the form and save drafts.</div>
          <button style={styles.noEvalBtn} onClick={() => navigate('/organization/evaluations/new')}>
            ➕ Start {currentYear} Evaluation
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;