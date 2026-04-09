import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import evaluatorService from '../../Services/evaluatorService';

const QueuePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'

  const filteredEvaluations = evaluations.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'pending') return e.status === 'SUBMITTED' || e.status === 'PROOF_REQUESTED';
    return e.status === filter.toUpperCase();
  });

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const data = await evaluatorService.getQueue();
      console.log('✅ Queue data received:', data);

      if (!Array.isArray(data)) {
        console.error('❌ Queue data is not an array:', data);
        setEvaluations([]);
        return;
      }

      setEvaluations(data);
    } catch (error) {
      console.error('❌ Error loading queue:', error);
      console.error('❌ Error response:', error.response?.data);
      alert('Failed to load evaluations: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
    header: { marginBottom: '32px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' },
    subtitle: { fontSize: '16px', color: '#6b7280' },
    table: { width: '100%', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    th: { padding: '16px', textAlign: 'left', background: '#f9fafb', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' },
    td: { padding: '16px', borderBottom: '1px solid #e5e7eb', fontSize: '14px', color: '#6b7280' },
    button: {
      padding: '8px 16px',
      background: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{t('evaluator.evaluationQueue')}</h1>
        <p style={styles.subtitle}>Review and approve pending evaluations</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {['pending', 'approved', 'rejected', 'all'].map(status => {
          const isActive = filter === status;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#2563eb' : 'white',
                color: isActive ? 'white' : '#4b5563',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 4px rgba(37,99,235,0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
              }}
            >
              {status === 'pending' ? '⏳ Pending Review' :
               status === 'approved' ? '✅ Approved' :
               status === 'rejected' ? '❌ Rejected' : '📋 All'}
            </button>
          );
        })}
      </div>

      {filteredEvaluations.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>{filter === 'pending' ? '✅' : '📋'}</div>
          <h3 style={{ fontSize: '18px', color: '#111827', marginBottom: '8px' }}>
            No evaluations found
          </h3>
          <p style={{ color: '#6b7280' }}>
            {filter === 'pending' ? 'All caught up! No evaluations waiting for review.' : 'No evaluations match this filter.'}
          </p>
        </div>
      ) : (
        <div style={styles.table}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={styles.th}>{t('evaluation.evaluationName')}</th>
                <th style={styles.th}>Organization</th>
                <th style={styles.th}>{t('common.period')}</th>
                <th style={styles.th}>{t('common.score')}</th>
                <th style={styles.th}>{t('evaluation.submitted')}</th>
                <th style={styles.th}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvaluations.map((evaluation) => (
                <tr key={evaluation.evaluationId}>
                  <td style={styles.td}>
                    <strong style={{ color: '#111827' }}>{evaluation.name}</strong>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {evaluation.status === 'SUBMITTED' ? '📥 Submitted' :
                       evaluation.status === 'PROOF_REQUESTED' ? '⚠️ Requested Proof' :
                       evaluation.status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'}
                    </div>
                  </td>
                  <td style={styles.td}>{evaluation.organization?.name || 'N/A'}</td>
                  <td style={styles.td}>{evaluation.period}</td>
                  <td style={styles.td}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      background: evaluation.totalScore >= 70 ? '#d1fae5' : '#fee2e2',
                      color: evaluation.totalScore >= 70 ? '#065f46' : '#dc2626',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {evaluation.totalScore ? Math.round(evaluation.totalScore) + '%' : 'N/A'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(evaluation.submittedAt || evaluation.createdAt).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.button}
                      onClick={() => navigate(`/evaluator/review/${evaluation.evaluationId}`)}
                      onMouseEnter={(e) => (e.target.style.background = '#1d4ed8')}
                      onMouseLeave={(e) => (e.target.style.background = '#2563eb')}
                    >
                      {evaluation.status === 'SUBMITTED' ? 'Review' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QueuePage;