import axiosClient from '../../../shared/services/axiosClient';

export const promotionApi = {
  getAll: (params) => axiosClient.get('/promotions', { params }),
  getById: (id) => axiosClient.get(`/promotions/${id}`),
  create: (data) => axiosClient.post('/promotions', data),
  update: (id, data) => axiosClient.put(`/promotions/${id}`, data),
  toggleStatus: (id, isActive) => axiosClient.patch(`/promotions/${id}/status`, { isActive }),
  delete: (id) => axiosClient.delete(`/promotions/${id}`),
};
