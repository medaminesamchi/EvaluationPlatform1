import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import evaluationService from '../../Services/evaluationService';

/* ─────────────────── Modal ─────────────────── */
const BlockedModal = ({ evaluation, onGoToEval, onClose }) => {
  const statusMeta = {
    CREATED:     { icon: '📝', label: 'Created (Draft)',    color: '#6b7280', bg: '#f3f4f6', desc: 'The evaluation has been created but you haven\'t started filling it in yet. Open it to begin.' },
    IN_PROGRESS: { icon: '⏳', label: 'In Progress',        color: '#1e40af', bg: '#dbeafe', desc: 'You\'ve already started this evaluation. You can save drafts and continue any time.' },
    SUBMITTED:   { icon: '📤', label: 'Submitted',          color: '#4338ca', bg: '#e0e7ff', desc: 'The evaluation has been submitted and is waiting for the evaluator\'s review.' },
    PROOF_REQUESTED: { icon: '🔍', label: 'Proof Requested', color: '#92400e', bg: '#fef3c7', desc: 'The evaluator has asked for additional evidence on some criteria.' },
    APPROVED:    { icon: '✅', label: 'Approved',           color: '#065f46', bg: '#d1fae5', desc: 'This evaluation has been approved. You\'ll be able to create a new one next year.' },
    REJECTED:    { icon: '❌', label: 'Rejected',           color: '#991b1b', bg: '#fee2e2', desc: 'This evaluation was rejected. Please review the feedback and resubmit.' },
  };
  const meta = statusMeta[evaluation?.status] || statusMeta['CREATED'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden',
        animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Header stripe */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          padding: '24px 28px 20px',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>
            Evaluation Already Exists
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>
            You can only submit one evaluation per year.
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ fontSize: '14px', color: '#374151', marginBottom: '16px', lineHeight: '1.6' }}>
            An evaluation for <strong>{evaluation?.period}</strong> already exists in your account.
            A new evaluation cannot be created until the current one is completed or a new year begins.
          </div>

          {/* Status chip */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            background: meta.bg, borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
          }}>
            <div style={{ fontSize: '24px', lineHeight: 1 }}>{meta.icon}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: meta.color, marginBottom: '4px' }}>
                Current Status: {meta.label}
              </div>
              <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
                {meta.desc}
              </div>
            </div>
          </div>

          {/* Status explanation legend */}
          <div style={{
            background: '#f9fafb', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '10px' }}>
              📖 Status Guide
            </div>
            {[
              { icon: '📝', label: 'Created',      desc: 'Draft created, not yet started' },
              { icon: '⏳', label: 'In Progress',  desc: 'Being filled in by the organization' },
              { icon: '📤', label: 'Submitted',    desc: 'Awaiting evaluator review' },
              { icon: '🔍', label: 'Proof Req.',   desc: 'Evaluator needs more evidence' },
              { icon: '✅', label: 'Approved',     desc: 'Evaluation validated' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px' }}>{s.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', width: '80px' }}>{s.label}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{s.desc}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', background: '#f3f4f6', border: 'none',
                borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                color: '#374151', cursor: 'pointer',
              }}
            >
              ← Go Back
            </button>
            <button
              onClick={onGoToEval}
              style={{
                flex: 2, padding: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                border: 'none', borderRadius: '10px', fontSize: '14px',
                fontWeight: '600', color: 'white', cursor: 'pointer',
              }}
            >
              Open Current Evaluation →
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

/* ─────────────────── Main Page ─────────────────── */
const NewEvaluationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingEvaluations, setExistingEvaluations] = useState([]);
  const [error, setError] = useState('');
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  useEffect(() => {
    checkExisting();
  }, []);

  const checkExisting = async () => {
    try {
      const data = await evaluationService.getMyEvaluations();
      setExistingEvaluations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const currentYearEvaluation = existingEvaluations.find(e =>
    String(e.period || '').includes(String(currentYear))
  );
  const hasCurrentYearEvaluation = Boolean(currentYearEvaluation);

  const handleStart = async () => {
    if (hasCurrentYearEvaluation) {
      setShowBlockedModal(true);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const evaluation = await evaluationService.createEvaluation({});
      navigate(`/organization/evaluations/edit/${evaluation.evaluationId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create evaluation');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: { minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
    card: { background: 'white', borderRadius: '16px', padding: '48px', width: '100%', maxWidth: '560px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
    icon: { fontSize: '56px', textAlign: 'center', marginBottom: '16px' },
    title: { fontSize: '26px', fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: '8px' },
    subtitle: { fontSize: '15px', color: '#6b7280', textAlign: 'center', marginBottom: '36px', lineHeight: '1.6' },
    error: { padding: '12px 16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '20px' },
    infoBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px', marginBottom: '28px' },
    infoTitle: { fontSize: '13px', fontWeight: '700', color: '#1e40af', marginBottom: '8px' },
    infoItem: { fontSize: '13px', color: '#3b82f6', marginBottom: '4px' },
    buttons: { display: 'flex', gap: '12px' },
    cancelBtn: { flex: 1, padding: '14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
    startBtn: { flex: 2, padding: '14px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  };

  if (checking) {
    return (
      <div style={{ ...styles.page }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>⏳</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showBlockedModal && (
        <BlockedModal
          evaluation={currentYearEvaluation}
          onGoToEval={() => navigate(`/organization/evaluations/edit/${currentYearEvaluation.evaluationId}`)}
          onClose={() => setShowBlockedModal(false)}
        />
      )}

      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.icon}>🏛️</div>
          <h1 style={styles.title}>Start Annual Governance Evaluation</h1>
          <p style={styles.subtitle}>
            This evaluation is completed once per year and is automatically created for <strong>{currentYear}</strong>.
          </p>

          {error && <div style={styles.error}>⚠️ {error}</div>}

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>📋 What happens next:</div>
            <div style={styles.infoItem}>✅ Evaluate each of the 12 governance principles</div>
            <div style={styles.infoItem}>✅ Select maturity level (0–3) per criterion</div>
            <div style={styles.infoItem}>✅ Upload supporting evidence documents</div>
            <div style={styles.infoItem}>✅ Save drafts and continue later from the dashboard</div>
          </div>

          <div style={styles.buttons}>
            <button style={styles.cancelBtn} onClick={() => navigate('/organization/evaluations')}>Cancel</button>
            <button
              style={{ ...styles.startBtn, opacity: loading ? 0.7 : 1 }}
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? '⏳ Creating...' : `🚀 Start ${currentYear} Evaluation →`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewEvaluationPage;