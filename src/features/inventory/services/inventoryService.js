import axios from 'axios'

const API_BASE = 'http://localhost:8080/api/inventory'

const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },
})

export const inventoryService = {
  /** Lấy toàn bộ danh sách */
  getAll: () => axios.get(API_BASE, getAuthHeaders()),

  /** Lấy 1 item theo id */
  getById: (id) => axios.get(`${API_BASE}/${id}`, getAuthHeaders()),

  /** Tạo item mới */
  create: (data) => axios.post(API_BASE, data, getAuthHeaders()),

  /** Cập nhật số lượng */
  updateQuantity: (id, data) =>
    axios.put(`${API_BASE}/${id}/quantity`, data, getAuthHeaders()),

  /** Toggle active/inactive */
  toggleActive: (id) =>
    axios.patch(`${API_BASE}/${id}/toggle-active`, {}, getAuthHeaders()),

  /** Cập nhật status (override hoặc null để reset về auto) */
  updateStatus: (id, statusOverride) =>
    axios.put(`${API_BASE}/${id}/status`, { statusOverride }, getAuthHeaders()),

  /** Tìm kiếm với filters */
  search: (params) =>
    axios.get(`${API_BASE}/search`, { ...getAuthHeaders(), params }),
}
