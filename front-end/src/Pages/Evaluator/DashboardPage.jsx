import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import evaluatorService from '../../Services/evaluatorService';

const EvaluatorDashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await evaluatorService.getQueue();
      setEvaluations(data);
      console.log('✅ Loaded data:', data.length, 'evaluations');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    pending: evaluations.filter(e => e.status === 'SUBMITTED' || e.status === 'PROOF_REQUESTED').length,
    approved: evaluations.filter(e => e.status === 'APPROVED').length,
    rejected: evaluations.filter(e => e.status === 'REJECTED').length,
    total: evaluations.length
  };

  // Sort and grab recent pending evaluations
  const recentPending = evaluations
    .filter(e => e.status === 'SUBMITTED' || e.status === 'PROOF_REQUESTED')
    .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
    .slice(0, 3);

  const styles = {
    container: { padding: '32px', maxWidth: '1400px', margin: '0 auto' },
    header: { marginBottom: '36px' },
    title: { fontSize: '32px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' },
    subtitle: { fontSize: '16px', color: '#64748b' },
    statsGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px'
    },
    statCard: (bg, color) => ({
      background: bg, padding: '28px', borderRadius: '20px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden'
    }),
    statLabel: { fontSize: '15px', fontWeight: '600', color: '#475569', marginBottom: '12px', zIndex: 1 },
    statValue: (color) => ({ fontSize: '48px', fontWeight: '800', color: color, lineHeight: '1', zIndex: 1 }),
    sectionTitle: { fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    actionsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
    
    // Recent items
    recentList: { display: 'flex', flexDirection: 'column', gap: '16px' },
    recentCard: {
      background: 'white', padding: '20px', borderRadius: '16px',
      border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer',
    },
    actionBtn: { padding: '10px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    
    // Quick Actions
    quickActionsBox: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '20px', padding: '32px', color: 'white' },
    quickActionBtn: {
      display: 'block', width: '100%', padding: '16px', background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white',
      fontSize: '15px', fontWeight: '600', textAlign: 'left', cursor: 'pointer',
      transition: 'background 0.2s', marginBottom: '12px'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
         <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>
           <div style={{ fontSize: '48px', marginBottom: '16px' }}>⌛</div>
           <div>Loading dashboard data...</div>
         </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Evaluator Dashboard</h1>
        <p style={styles.subtitle}>Welcome back, {user?.name}. Here's an overview of the evaluation queue.</p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard('white', '#3b82f6')}>
          <div style={styles.statLabel}>Pending Review</div>
          <div style={styles.statValue('#3b82f6')}>{stats.pending}</div>
          <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '100px', opacity: 0.05 }}>⏳</div>
        </div>
        <div style={styles.statCard('white', '#10b981')}>
          <div style={styles.statLabel}>Approved</div>
          <div style={styles.statValue('#10b981')}>{stats.approved}</div>
          <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '100px', opacity: 0.05 }}>✅</div>
        </div>
        <div style={styles.statCard('white', '#ef4444')}>
          <div style={styles.statLabel}>Rejected</div>
          <div style={styles.statValue('#ef4444')}>{stats.rejected}</div>
          <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '100px', opacity: 0.05 }}>❌</div>
        </div>
      </div>

      <div style={styles.actionsRow}>
        {/* Left Column: Recent Tasks */}
        <div>
          <div style={styles.sectionTitle}>
            Action Required
            {stats.pending > 0 && (
              <button 
                onClick={() => navigate('/evaluator/queue')} 
                style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: '600', cursor: 'pointer' }}
              >
                View full queue →
              </button>
            )}
          </div>
          
          <div style={styles.recentList}>
            {recentPending.length > 0 ? recentPending.map((evalItem) => (
              <div 
                key={evalItem.evaluationId} 
                style={styles.recentCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                    {evalItem.organization?.name || 'Unknown Organization'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', gap: '12px' }}>
                    <span>🏷️ {evalItem.name}</span>
                    <span>🕒 {new Date(evalItem.submittedAt || evalItem.createdAt).toLocaleDateString()}</span>
                    {evalItem.status === 'PROOF_REQUESTED' && (
                      <span style={{ color: '#d97706', fontWeight: '600' }}>⚠️ Proof Requested</span>
                    )}
                  </div>
                </div>
                <button 
                  style={styles.actionBtn}
                  onClick={() => navigate(`/evaluator/review/${evalItem.evaluationId}`)}
                >
                  Review
                </button>
              </div>
            )) : (
              <div style={{ padding: '40px', background: 'white', borderRadius: '16px', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎉</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#475569' }}>All caught up!</div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>No pending evaluations to review.</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Links */}
        <div>
          <div style={styles.sectionTitle}>Dashboard Hub</div>
          <div style={styles.quickActionsBox}>
            <div style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px' }}>Workspace</div>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
              Access all your evaluation tools from here, review pending workflows, or check past approvals.
            </p>
            
            <button 
              style={styles.quickActionBtn}
              onClick={() => navigate('/evaluator/queue')}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
              📋 Open Evaluation Queue 
            </button>
            <button 
              style={styles.quickActionBtn}
              onClick={() => { navigate('/evaluator/queue'); /* User must click 'approved' tab */ }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
              ✅ View Approved History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluatorDashboardPage;