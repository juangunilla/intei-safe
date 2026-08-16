import api from './api';

const projectService = {
  list: (params, config = {}) => api.get('/projects', { ...config, params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (project) => api.post('/projects', project),
  update: (id, project, config = {}) => api.put(`/projects/${id}`, project, config),
  remove: (id) => api.delete(`/projects/${id}`),
  duplicate: (id) => api.post(`/projects/${id}/duplicate`),
};

export default projectService;
