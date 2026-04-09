import { GOVERNANCE_PRINCIPLES as FALLBACK } from './constants';

/** 12 accent colors aligned with previous static UI */
const PRINCIPLE_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4',
  '#6366f1', '#8b5cf6', '#ef4444', '#22c55e', '#14b8a6', '#dc2626',
];

/**
 * Maps GET /api/governance/framework response to the shape used by evaluation forms.
 * API: principleId, name, description, orderIndex, practices[].practiceId, name, criteria[].criterionId, description, evidenceText, referenceText
 */
export function normalizeGovernanceFramework(apiList) {
  if (!Array.isArray(apiList) || apiList.length === 0) {
    return FALLBACK;
  }

  return apiList.map((p, idx) => {
    const order = p.orderIndex != null ? p.orderIndex : idx + 1;
    const color = PRINCIPLE_COLORS[(order - 1) % PRINCIPLE_COLORS.length];
    return {
      id: p.principleId,
      number: order,
      name: p.name,
      description: p.description || '',
      color,
      practices: (p.practices || []).map((pr) => ({
        id: pr.practiceId,
        name: pr.name,
        description: pr.description,
        criteria: (pr.criteria || []).map((c) => ({
          id: c.criterionId,
          text: c.description,
          evidence: c.evidenceText || '',
          reference: c.referenceText || '',
        })),
      })),
    };
  });
}
