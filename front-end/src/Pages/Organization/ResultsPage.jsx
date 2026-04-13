import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
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
          try {
            const result = await evaluationService.getEvaluationResult(evaluation.evaluationId);
            resultsData[evaluation.evaluationId] = result;
          } catch (e) {
            console.log('Result not yet generated for evaluation:', evaluation.evaluationId);
          }

          const responses = await evaluationService.getResponses(evaluation.evaluationId);
          const reviews = await evaluationService.getCriterionReviews(evaluation.evaluationId);

          const adjustments = {};
          reviews.forEach(r => {
            if (r.adjustedMaturityLevel !== null && r.adjustedMaturityLevel !== undefined) {
              adjustments[`${r.principleId}-${r.practiceId}-${r.criterionId}`] = r.adjustedMaturityLevel;
            }
          });

          const principleScores = [];
          
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
              principleScores.push({
                subject: principle.name,
                A: Math.round(percentage),
                fullMark: 100,
                color: principle.color || '#3b82f6',
                id: principle.id
              });
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
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCertificationLevel = (score) => {
    if (score >= 90) return { name: 'Platinum', color: '#a78bfa' };
    if (score >= 80) return { name: 'Gold', color: '#f59e0b' };
    if (score >= 65) return { name: 'Silver', color: '#9ca3af' };
    if (score >= 50) return { name: 'Bronze', color: '#d97706' };
    return { name: 'Not Certified', color: '#6b7280' };
  };

  const s = {
    page: { padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
    header: { marginBottom: '32px' },
    title: { fontSize: '32px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '8px' },
    subtitle: { fontSize: '16px', color: '#64748b' },
    card: { background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', marginBottom: '24px', border: '1px solid #f1f5f9' },
    topSection: { display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' },
    scoreRing: (color) => ({
      width: '160px', height: '160px', borderRadius: '50%', background: `radial-gradient(circle, white 50%, ${color}15 100%)`,
      border: `6px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 30px ${color}20`
    }),
    evalDetails: { flex: 1, minWidth: '300px' },
    evalName: { fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' },
    evalPeriod: { fontSize: '16px', color: '#64748b', fontWeight: '500', marginBottom: '20px' },
    metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: '12px' },
    metaLabel: { fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '6px' },
    metaValue: { fontSize: '16px', fontWeight: '700', color: '#0f172a' },
    toggleBtn: { width: '100%', padding: '16px', marginTop: '24px', border: 'none', background: '#f1f5f9', borderRadius: '12px', color: '#334155', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' },
    detailsContainer: { marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' },
    chartsRow: { display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '24px' },
    chartBox: { flex: '1 1 400px', background: '#f8fafc', padding: '24px', borderRadius: '16px', minHeight: '350px' },
    chartTitle: { fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', textAlign: 'center' }
  };

  if (loading) {
    return <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>Loading results...</div>;
  }

  if (evaluations.length === 0) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <h1 style={s.title}>Evaluation Results</h1>
          <p style={s.subtitle}>You don't have any finalized evaluation results yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Evaluation Results</h1>
        <p style={s.subtitle}>Detailed breakdowns of your certified governance framework scores.</p>
      </div>

      {evaluations.map(evaluation => {
        const result = results[evaluation.evaluationId];
        const pScores = detailedScores[evaluation.evaluationId] || [];
        const isExp = expandedEvalId === evaluation.evaluationId;
        const cert = getCertificationLevel(result?.finalScore || evaluation.totalScore || 0);

        return (
          <div key={evaluation.evaluationId} style={s.card}>
            <div style={s.topSection}>
              <div style={s.scoreRing(cert.color)}>
                <div style={{ fontSize: '46px', fontWeight: '900', color: cert.color, lineHeight: 1 }}>
                  {Math.round(result?.finalScore || evaluation.totalScore || 0)}<span style={{ fontSize: '24px' }}>%</span>
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginTop: '4px' }}>Final Score</div>
              </div>

              <div style={s.evalDetails}>
                <div style={s.evalName}>{evaluation.name}</div>
                <div style={s.evalPeriod}>{evaluation.period}</div>

                <div style={s.metaGrid}>
                  <div>
                    <div style={s.metaLabel}>Certification</div>
                    <div style={{...s.metaValue, color: cert.color}}>Level: {cert.name}</div>
                  </div>
                  {result ? (
                    <>
                      <div>
                        <div style={s.metaLabel}>Date Issued</div>
                        <div style={s.metaValue}>{new Date(result.issuedDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div style={s.metaLabel}>Valid Until</div>
                        <div style={s.metaValue}>{new Date(result.expiryDate).toLocaleDateString()}</div>
                      </div>
                    </>
                  ) : (
                     <div style={{ gridColumn: 'span 2' }}>
                        <div style={s.metaLabel}>Status</div>
                        <div style={{...s.metaValue, color: '#f59e0b'}}>Result generation pending...</div>
                     </div>
                  )}
                </div>
              </div>
            </div>

            <button 
              style={s.toggleBtn}
              onClick={() => setExpandedEvalId(isExp ? null : evaluation.evaluationId)}
            >
              {isExp ? 'Hide Advanced Analytics' : 'View Advanced Analytics'}
            </button>

            {isExp && pScores.length > 0 && (
              <div style={s.detailsContainer}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Performance Analysis</h3>
                
                <div style={s.chartsRow}>
                  {/* Radar Chart */}
                  <div style={s.chartBox}>
                    <div style={s.chartTitle}>Principle Balance (Radar)</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={pScores}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="A" stroke={cert.color} fill={cert.color} fillOpacity={0.4} />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Score']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart */}
                  <div style={s.chartBox}>
                    <div style={s.chartTitle}>Score by Principle</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={pScores} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="subject" type="category" width={150} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{fill: '#f1f5f9'}}
                          formatter={(value) => [`${value}%`, 'Score']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="A" radius={[0, 6, 6, 0]} barSize={24}>
                          {pScores.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ResultsPage;