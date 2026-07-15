import axios from 'axios'

const API_BASE = 'http://localhost:8080/api/menu'
const CATEGORY_API = 'http://localhost:8080/api/menu-categories'

const authConfig = () => ({
  // Các API quản trị Menu yêu cầu JWT; lấy token tại thời điểm gọi để tránh dùng token cũ.
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },
})

export const menuService = {
  // Tập trung endpoint Menu tại một nơi để screen không phụ thuộc chi tiết HTTP.
  getAll: () => axios.get(API_BASE, authConfig()),
  getCategories: () => axios.get(CATEGORY_API, authConfig()),
  create: (data) => axios.post(API_BASE, data, authConfig()),
  update: (id, data) => axios.put(`${API_BASE}/${id}`, data, authConfig()),
  toggleActive: (id) => axios.patch(`${API_BASE}/${id}/toggle-active`, {}, authConfig()),
}
