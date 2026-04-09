import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import evaluationService from '../../Services/evaluationService';
import governanceService from '../../Services/governanceService';
import { normalizeGovernanceFramework } from '../../utils/governanceFramework';
import { GOVERNANCE_PRINCIPLES } from '../../utils/constants';

const ResultsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [evaluations, setEvaluations] = useState([]);
  const [results, setResults] = useState({});
  const [detailedScores, setDetailedScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [framework, setFramework] = useState(null);
  const [expandedEvalId, setExpandedEvalId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    governanceService.getFramework().then(fw => {
      if (!cancelled) setFramework(normalizeGovernanceFramework(fw));
    }).catch(() => {
      if (!cancelled) setFramework(GOVERNANCE_PRINCIPLES);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (framework) loadResults();
  }, [framework]);

  const loadResults = async () => {
    try {
      const data = await evaluationService.getMyEvaluations();
      const approvedEvaluations = data.filter(e => e.status === 'APPROVED');
      setEvaluations(approvedEvaluations);

      const resultsData = {};
      const scoresData = {};

      for (const evaluation of approvedEvaluations) {
        try {
          // Fetch overall result
          const result = await evaluationService.getEvaluationResult(evaluation.evaluationId);
          resultsData[evaluation.evaluationId] = result;

          // Fetch responses and reviews to calculate detailed principle scores
          const responses = await evaluationService.getResponses(evaluation.evaluationId);
          const reviews = await evaluationService.getCriterionReviews(evaluation.evaluationId);

          const adjustments = {};
          reviews.forEach(r => {
            if (r.adjustedMaturityLevel !== null && r.adjustedMaturityLevel !== undefined) {
              adjustments[`${r.principleId}-${r.practiceId}-${r.criterionId}`] = r.adjustedMaturityLevel;
            }
          });

          const principleScores = {};
          
          framework.forEach(principle => {
            let sum = 0;
            let criteriaCount = 0;

            principle.practices.forEach(practice => {
              practice.criteria.forEach(criterion => {
                criteriaCount++;
                const key = `${principle.id}-${practice.id}-${criterion.id}`;
                const response = responses.find(
                  r => r.principleId == principle.id && r.practiceId == practice.id && r.criterionId == criterion.id
                );
                const originalLevel = response?.maturityLevel || 0;
                const effectiveLevel = adjustments[key] !== undefined ? adjustments[key] : originalLevel;
                sum += effectiveLevel;
              });
            });

            if (criteriaCount > 0) {
              const maxPoints = criteriaCount * 3;
              const percentage = (sum / maxPoints) * 100;
              principleScores[principle.id] = {
                name: principle.name,
                color: principle.color,
                score: percentage,
              };
            }
          });

          scoresData[evaluation.evaluationId] = principleScores;

        } catch (error) {
          console.error('Error loading result for evaluation:', evaluation.evaluationId, error);
        }
      }
      
      setResults(resultsData);
      setDetailedScores(scoresData);
    } catch (error) {
      console.error('❌ Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCertificationLevel = (score) => {
    if (score >= 90) return { name: t('results.platinum'), color: '#a78bfa' };
    if (score >= 80) return { name: t('results.gold'), color: '#fbbf24' };
    if (score >= 65) return { name: t('results.silver'), color: '#9ca3af' };
    if (score >= 50) return { name: t('results.bronze'), color: '#cd7f32' };
    return { name: t('results.notCertified'), color: '#6b7280' };
  };

  const styles = {
    container: { padding: '32px', maxWidth: '1200px', margin: '0 auto' },
    header: { marginBottom: '32px' },
    title: { fontSize: '32px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' },
    subtitle: { fontSize: '16px', color: '#64748b' },
    card: {
      background: 'white', borderRadius: '20px', padding: '32px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
      marginBottom: '24px', transition: 'all 0.3s'
    },
    topSection: { display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center' },
    scoreCircle: (certColor) => ({
      width: '140px', height: '140px', borderRadius: '50%',
      background: `linear-gradient(135deg, ${certColor}15 0%, ${certColor}25 100%)`,
      border: `4px solid ${certColor}`, color: certColor,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 20px ${certColor}20`
    }),
    evalDetails: { flex: 1, minWidth: '280px' },
    badgeDateBox: { background: '#f8fafc', padding: '16px', borderRadius: '12px', marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    infoText: { fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' },
    infoValue: { fontSize: '15px', color: '#0f172a', fontWeight: '700' },
    toggleBtn: { width: '100%', padding: '16px', background: '#f1f5f9', border: 'none', borderRadius: '12px', marginTop: '24px', color: '#334155', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' },
    actionBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '16px', transition: 'opacity 0.2s', width: '100%' },
    
    // Details Section
    detailsSection: { marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' },
    principleRow: { marginBottom: '16px' },
    principleHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#334155' },
    progressBarTrack: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' },
    
    emptyState: { textAlign: 'center', padding: '80px', background: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div>Loading detailed results...</div>
        </div>
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>{t('results.results')}</h1>
          <p style={styles.subtitle}>{t('results.evaluationResults')}</p>
        </div>
        <div style={styles.emptyState}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
            {t('results.noResults')}
          </h3>
          <p style={{ color: '#64748b', marginBottom: '32px' }}>
            Complete and submit an evaluation to see your detailed results here.
          </p>
          <button style={{ ...styles.actionBtn, width: 'auto' }} onClick={() => navigate('/organization/evaluations/new')}>
            {t('evaluation.createEvaluation')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{t('results.results')}</h1>
        <p style={styles.subtitle}>View your finalized scores, certificates, and detailed principle breakdowns.</p>
      </div>

      <div>
        {evaluations.map(evaluation => {
          const result = results[evaluation.evaluationId];
          const cert = getCertificationLevel(evaluation.totalScore || 0);
          const pScores = detailedScores[evaluation.evaluationId] || {};
          const isExpanded = expandedEvalId === evaluation.evaluationId;

          return (
            <div key={evaluation.evaluationId} style={styles.card}>
              <div style={styles.topSection}>
                {/* Visual Score */}
                <div style={styles.scoreCircle(cert.color)}>
                  <div style={{ fontSize: '42px', fontWeight: '800', lineHeight: '1' }}>{Math.round(evaluation.totalScore || 0)}%</div>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginTop: '6px', opacity: 0.8 }}>Final Score</div>
                </div>

                {/* Details */}
                <div style={styles.evalDetails}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{evaluation.name}</div>
                  <div style={{ fontSize: '15px', color: '#64748b', fontWeight: '500' }}>{evaluation.period}</div>
                  
                  <div style={styles.badgeDateBox}>
                    <div>
                      <div style={styles.infoText}>Certification Level</div>
                      <div style={{ ...styles.infoValue, color: cert.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🏆 {cert.name}
                      </div>
                    </div>
                    {result ? (
                      <div>
                        <div style={styles.infoText}>Valid Until</div>
                        <div style={styles.infoValue}>📅 {new Date(result.expiryDate).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <div>
                        <div style={styles.infoText}>Status</div>
                        <div style={styles.infoValue}>Approved, Result pending...</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations Button */}
                <div style={{ minWidth: '200px' }}>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate(`/organization/recommendations/${evaluation.evaluationId}`)}
                    onMouseEnter={e => e.target.style.opacity = 0.9}
                    onMouseLeave={e => e.target.style.opacity = 1}
                  >
                    View Recommendations →
                  </button>
                </div>
              </div>

              {/* Expand Toggle */}
              <button 
                style={styles.toggleBtn}
                onClick={() => setExpandedEvalId(isExpanded ? null : evaluation.evaluationId)}
                onMouseEnter={e => e.target.style.background = '#e2e8f0'}
                onMouseLeave={e => e.target.style.background = '#f1f5f9'}
              >
                {isExpanded ? 'Hide Detailed Breakdown ▲' : 'Show Principle Score Breakdown ▼'}
              </button>

              {/* Detailed Breakdown Section */}
              {isExpanded && (
                <div style={styles.detailsSection}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '24px' }}>Performance by Principle</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {Object.values(pScores).map((ps, idx) => (
                      <div key={idx} style={styles.principleRow}>
                        <div style={styles.principleHeader}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: ps.color || '#3b82f6' }} />
                            {ps.name}
                          </span>
                          <span style={{ fontWeight: '800' }}>{Math.round(ps.score)}%</span>
                        </div>
                        <div style={styles.progressBarTrack}>
                          <div style={{ 
                            height: '100%', 
                            width: `${ps.score}%`, 
                            background: ps.color || '#3b82f6',
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResultsPage;