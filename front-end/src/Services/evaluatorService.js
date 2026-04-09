import API from './api';

const evaluatorService = {
  getQueue: async () => {
    const response = await API.get('/evaluator/queue');
    return response.data;
  },

  getEvaluationDetails: async (id) => {
    const response = await API.get(`/evaluator/evaluations/${id}/details`);
    return response.data;
  },

  approveEvaluation: async (id, body) => {
    const response = await API.post(`/evaluator/evaluations/${id}/approve`, body || {});
    return response.data;
  },

  rejectEvaluation: async (id, reason) => {
    const response = await API.post(`/evaluator/evaluations/${id}/reject`, { reason });
    return response.data;
  },

  requestProof: async (id, body) => {
    const response = await API.post(`/evaluator/evaluations/${id}/request-proof`, body);
    return response.data;
  },

  getFile: async (evalId, filename) => {
    const response = await API.get(`/evaluator/evaluations/${evalId}/file/${filename}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export default evaluatorService;