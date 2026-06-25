// Lưu ý: Sửa lại đường dẫn import axiosClient cho đúng với thư mục dự án của bạn
import axiosClient from '../../../shared/services/axiosClient'

export const tableApi = {
  getAll: () => axiosClient.get('/tables'),
  getById: (id) => axiosClient.get(`/tables/${id}`),
  create: (data) => axiosClient.post('/tables', data),
  update: (id, data) => axiosClient.put(`/tables/${id}`, data),
  toggleActive: (id) => axiosClient.patch(`/tables/${id}/toggle-active`),
  updateStatus: (id, status) => axiosClient.patch(`/tables/${id}/status`, { status }),
  delete: (id) => axiosClient.delete(`/tables/${id}`),
  search: (params) => axiosClient.get('/tables/search', { params }),
}