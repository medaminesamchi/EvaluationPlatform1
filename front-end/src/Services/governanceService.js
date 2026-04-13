import API from './api';

const governanceService = {
  // ---- READ ----
  getFramework: async () => {
    const response = await API.get('/governance/framework');
    return response.data;
  },
  getPrinciples: async () => {
    const response = await API.get('/governance/principles');
    return response.data;
  },
  getPracticesByPrinciple: async (principleId) => {
    const response = await API.get(`/governance/principles/${principleId}/practices`);
    return response.data;
  },
  getCriteriaByPractice: async (practiceId) => {
    const response = await API.get(`/governance/practices/${practiceId}/criteria`);
    return response.data;
  },

  // ---- PRINCIPLES CRUD ----
  createPrinciple: async (data) => {
    const response = await API.post('/governance/principles', data);
    return response.data;
  },
  updatePrinciple: async (id, data) => {
    const response = await API.put(`/governance/principles/${id}`, data);
    return response.data;
  },
  deletePrinciple: async (id) => {
    const response = await API.delete(`/governance/principles/${id}`);
    return response.data;
  },

  // ---- PRACTICES CRUD ----
  createPractice: async (data) => {
    const response = await API.post('/governance/practices', data);
    return response.data;
  },
  updatePractice: async (id, data) => {
    const response = await API.put(`/governance/practices/${id}`, data);
    return response.data;
  },
  deletePractice: async (id) => {
    const response = await API.delete(`/governance/practices/${id}`);
    return response.data;
  },

  // ---- CRITERIA CRUD ----
  createCriterion: async (data) => {
    const response = await API.post('/governance/criteria', data);
    return response.data;
  },
  updateCriterion: async (id, data) => {
    const response = await API.put(`/governance/criteria/${id}`, data);
    return response.data;
  },
  deleteCriterion: async (id) => {
    const response = await API.delete(`/governance/criteria/${id}`);
    return response.data;
  },
};

export default governanceService;