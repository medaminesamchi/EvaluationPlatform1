import React, { useState, useEffect, useCallback } from 'react';
import governanceService from '../../Services/governanceService';

const GovernancePage = () => {
  const [framework, setFramework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPrinciple, setExpandedPrinciple] = useState(null);
  const [expandedPractice, setExpandedPractice] = useState(null);

  // Modal state
  const [modal, setModal] = useState(null); // { type: 'principle'|'practice'|'criterion', mode: 'add'|'edit', data: {}, parentId?: ... }
  const [saving, setSaving] = useState(false);

  const loadFramework = useCallback(async () => {
    try {
      setLoading(true);
      const data = await governanceService.getFramework();
      setFramework(data);
    } catch (e) {
      console.error('Failed to load framework:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFramework(); }, [loadFramework]);

  // ---- Handlers ----
  const openAddPrinciple = () => {
    setModal({ type: 'principle', mode: 'add', data: { name: '', description: '', orderIndex: framework.length + 1 } });
  };

  const openEditPrinciple = (p) => {
    setModal({ type: 'principle', mode: 'edit', data: { id: p.principleId, name: p.name, description: p.description || '', orderIndex: p.orderIndex } });
  };

  const openAddPractice = (principleId) => {
    const principle = framework.find(p => p.principleId === principleId);
    const count = principle?.practices?.length || 0;
    setModal({ type: 'practice', mode: 'add', parentId: principleId, data: { name: '', description: '', orderIndex: count + 1 } });
  };

  const openEditPractice = (pr) => {
    setModal({ type: 'practice', mode: 'edit', data: { id: pr.practiceId, name: pr.name, description: pr.description || '', orderIndex: pr.orderIndex } });
  };

  const openAddCriterion = (practiceId) => {
    const practice = framework.flatMap(p => p.practices).find(pr => pr.practiceId === practiceId);
    const count = practice?.criteria?.length || 0;
    setModal({
      type: 'criterion', mode: 'add', parentId: practiceId,
      data: { description: '', evidenceText: '', referenceText: '', orderIndex: count + 1,
              level0Description: '', level1Description: '', level2Description: '', level3Description: '' }
    });
  };

  const openEditCriterion = (c) => {
    setModal({
      type: 'criterion', mode: 'edit',
      data: {
        id: c.criterionId, description: c.description || '', evidenceText: c.evidenceText || '',
        referenceText: c.referenceText || '', orderIndex: c.orderIndex,
        level0Description: c.level0Description || '', level1Description: c.level1Description || '',
        level2Description: c.level2Description || '', level3Description: c.level3Description || '',
      }
    });
  };

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      const { type, mode, data, parentId } = modal;
      if (type === 'principle') {
        if (mode === 'add') await governanceService.createPrinciple(data);
        else await governanceService.updatePrinciple(data.id, data);
      } else if (type === 'practice') {
        if (mode === 'add') await governanceService.createPractice({ ...data, principleId: parentId });
        else await governanceService.updatePractice(data.id, data);
      } else if (type === 'criterion') {
        if (mode === 'add') await governanceService.createCriterion({ ...data, practiceId: parentId });
        else await governanceService.updateCriterion(data.id, data);
      }
      setModal(null);
      await loadFramework();
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.details || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to deactivate this item?')) return;
    try {
      if (type === 'principle') await governanceService.deletePrinciple(id);
      else if (type === 'practice') await governanceService.deletePractice(id);
      else await governanceService.deleteCriterion(id);
      await loadFramework();
    } catch (e) {
      alert('Delete failed');
    }
  };

  const updateModalField = (field, value) => {
    setModal(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  // ---- Styles ----
  const s = {
    page: { padding: '28px 32px', minHeight: '100vh', background: '#f8fafc' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
    title: { fontSize: '24px', fontWeight: '700', color: '#111827' },
    subtitle: { fontSize: '14px', color: '#6b7280', marginTop: '4px' },
    addBtn: (color = '#2563eb') => ({
      padding: '8px 18px', background: color, color: 'white', border: 'none', borderRadius: '8px',
      fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    }),
    smallBtn: (bg = '#f3f4f6', color = '#374151') => ({
      padding: '4px 12px', background: bg, color, border: '1px solid #e5e7eb', borderRadius: '6px',
      fontSize: '12px', cursor: 'pointer', fontWeight: '500',
    }),
    card: {
      background: 'white', borderRadius: '10px', marginBottom: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb', overflow: 'hidden',
    },
    cardHeader: (expanded) => ({
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 20px', cursor: 'pointer', background: expanded ? '#f0f9ff' : 'white',
      transition: 'background 0.15s',
    }),
    practiceCard: {
      margin: '0 20px 10px', padding: '14px 16px', background: '#f9fafb',
      borderRadius: '8px', border: '1px solid #e5e7eb',
    },
    criterionRow: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '10px 12px', background: 'white', borderRadius: '6px',
      marginBottom: '6px', border: '1px solid #f3f4f6',
    },
    badge: (color) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontWeight: '600', background: color + '15', color,
    }),
    // Modal
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    },
    modalBox: {
      background: 'white', borderRadius: '12px', padding: '28px', width: '560px',
      maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    },
    modalTitle: { fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '20px' },
    field: { marginBottom: '14px' },
    label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' },
    input: {
      width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px',
      fontSize: '13px', boxSizing: 'border-box', outline: 'none',
    },
    textarea: {
      width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px',
      fontSize: '13px', boxSizing: 'border-box', minHeight: '70px', resize: 'vertical', outline: 'none',
    },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading governance framework...</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Governance Framework Management</div>
          <div style={s.subtitle}>{framework.length} principles, {framework.reduce((a, p) => a + (p.practices?.length || 0), 0)} practices, {framework.reduce((a, p) => a + (p.practices || []).reduce((b, pr) => b + (pr.criteria?.length || 0), 0), 0)} criteria</div>
        </div>
        <button style={s.addBtn()} onClick={openAddPrinciple}>+ Add Principle</button>
      </div>

      {/* Principles */}
      {framework.map((principle) => {
        const isExp = expandedPrinciple === principle.principleId;
        return (
          <div key={principle.principleId} style={s.card}>
            <div style={s.cardHeader(isExp)} onClick={() => setExpandedPrinciple(isExp ? null : principle.principleId)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={s.badge('#2563eb')}>P{principle.orderIndex}</span>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>{principle.name}</span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>{principle.practices?.length || 0} practices</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button style={s.smallBtn('#dbeafe', '#1d4ed8')} onClick={(e) => { e.stopPropagation(); openEditPrinciple(principle); }}>Edit</button>
                <button style={s.smallBtn('#fee2e2', '#dc2626')} onClick={(e) => { e.stopPropagation(); handleDelete('principle', principle.principleId); }}>Delete</button>
                <span style={{ fontSize: '18px', transform: isExp ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-block' }}>&#9660;</span>
              </div>
            </div>

            {isExp && (
              <div style={{ padding: '12px 0' }}>
                <div style={{ padding: '0 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Practices</span>
                  <button style={s.smallBtn('#dcfce7', '#16a34a')} onClick={() => openAddPractice(principle.principleId)}>+ Add Practice</button>
                </div>

                {(principle.practices || []).map((practice) => {
                  const isPrExp = expandedPractice === practice.practiceId;
                  return (
                    <div key={practice.practiceId} style={s.practiceCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                           onClick={() => setExpandedPractice(isPrExp ? null : practice.practiceId)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={s.badge('#059669')}>Pr{practice.orderIndex}</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{practice.name}</span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{practice.criteria?.length || 0} criteria</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button style={s.smallBtn('#dbeafe', '#1d4ed8')} onClick={(e) => { e.stopPropagation(); openEditPractice(practice); }}>Edit</button>
                          <button style={s.smallBtn('#fee2e2', '#dc2626')} onClick={(e) => { e.stopPropagation(); handleDelete('practice', practice.practiceId); }}>Delete</button>
                          <span style={{ fontSize: '14px', transform: isPrExp ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-block' }}>&#9660;</span>
                        </div>
                      </div>

                      {isPrExp && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Criteria</span>
                            <button style={s.smallBtn('#fef3c7', '#b45309')} onClick={() => openAddCriterion(practice.practiceId)}>+ Add Criterion</button>
                          </div>

                          {(practice.criteria || []).map((criterion) => (
                            <div key={criterion.criterionId} style={s.criterionRow}>
                              <div style={{ flex: 1, marginRight: '12px' }}>
                                <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>{criterion.description}</div>
                                {criterion.evidenceText && (
                                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Proof: {criterion.evidenceText}</div>
                                )}
                                {criterion.referenceText && (
                                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Ref: {criterion.referenceText}</div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                <button style={s.smallBtn('#dbeafe', '#1d4ed8')} onClick={() => openEditCriterion(criterion)}>Edit</button>
                                <button style={s.smallBtn('#fee2e2', '#dc2626')} onClick={() => handleDelete('criterion', criterion.criterionId)}>Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>
              {modal.mode === 'add' ? 'Add' : 'Edit'} {modal.type.charAt(0).toUpperCase() + modal.type.slice(1)}
            </div>

            {/* Principle / Practice fields */}
            {(modal.type === 'principle' || modal.type === 'practice') && (
              <>
                <div style={s.field}>
                  <label style={s.label}>Name *</label>
                  <input style={s.input} value={modal.data.name || ''} onChange={(e) => updateModalField('name', e.target.value)} placeholder="Enter name..." />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Description</label>
                  <textarea style={s.textarea} value={modal.data.description || ''} onChange={(e) => updateModalField('description', e.target.value)} placeholder="Enter description..." />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Order Index</label>
                  <input style={s.input} type="number" value={modal.data.orderIndex || 0} onChange={(e) => updateModalField('orderIndex', parseInt(e.target.value) || 0)} />
                </div>
              </>
            )}

            {/* Criterion fields */}
            {modal.type === 'criterion' && (
              <>
                <div style={s.field}>
                  <label style={s.label}>Label (Description) *</label>
                  <textarea style={s.textarea} value={modal.data.description || ''} onChange={(e) => updateModalField('description', e.target.value)} placeholder="Criterion label..." />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Expected Proof (Preuve)</label>
                  <textarea style={s.textarea} value={modal.data.evidenceText || ''} onChange={(e) => updateModalField('evidenceText', e.target.value)} placeholder="What proof is expected..." />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Reference (Ref)</label>
                  <textarea style={s.textarea} value={modal.data.referenceText || ''} onChange={(e) => updateModalField('referenceText', e.target.value)} placeholder="Legal or normative reference..." />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Order Index</label>
                  <input style={s.input} type="number" value={modal.data.orderIndex || 0} onChange={(e) => updateModalField('orderIndex', parseInt(e.target.value) || 0)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[0, 1, 2, 3].map(lvl => (
                    <div key={lvl} style={s.field}>
                      <label style={s.label}>Level {lvl} Description</label>
                      <input style={s.input} value={modal.data[`level${lvl}Description`] || ''} onChange={(e) => updateModalField(`level${lvl}Description`, e.target.value)} placeholder={`Level ${lvl}...`} />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={s.modalActions}>
              <button style={s.smallBtn()} onClick={() => setModal(null)}>Cancel</button>
              <button style={s.addBtn(modal.mode === 'add' ? '#059669' : '#2563eb')} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : modal.mode === 'add' ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernancePage;