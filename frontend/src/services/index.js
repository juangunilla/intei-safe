import api from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const userService = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const roleService = {
  getAll: () => api.get('/roles'),
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

export const aiPlanService = {
  getCapabilities: () => api.get('/ai/plans/capabilities'),
  generate: ({ instruction, document, context, requestId }) =>
    api.post('/ai/plans/generate', { instruction, document, context, requestId }),
  analyzeBuilding: ({ document, context, requestId }) =>
    api.post('/ai/plans/analyze-building', { document, context, requestId }),
  generateEvacuation: ({ document, context, requestId }) =>
    api.post('/ai/plans/generate-evacuation', { document, context, requestId }),
  correctEvacuation: ({ document, context, requestId }) =>
    api.post('/ai/plans/correct-evacuation', { document, context, requestId }),
};
export const advisorNarrativeService = {
  getCapabilities: () => api.get('/ai/advisor/narrative/capabilities'),
  generate: (payload, signal) => api.post('/ai/advisor/narrative', payload, { signal }),
};
export const regulatoryService = {
  analyze: ({ profile, document }) => api.post('/regulatory/analyze', { profile, document }),
};
export { default as projectService } from './projectService';
