import axios from 'axios'

// Địa chỉ backend dành cho món ăn và danh mục món ăn.
const API_BASE = 'http://localhost:8080/api/menu'
const CATEGORY_API = 'http://localhost:8080/api/menu-categories'

const authConfig = () => ({
  // Lấy JWT tại đúng thời điểm gọi API để luôn sử dụng token đăng nhập mới nhất.
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },
})

export const menuService = {
  // Tập trung toàn bộ request của Menu tại một nơi để màn hình không phải biết chi tiết endpoint.
  // GET: lấy dữ liệu; POST: tạo mới; PUT: cập nhật; PATCH: chỉ thay đổi trạng thái hoạt động.
  getAll: () => axios.get(API_BASE, authConfig()),
  getCategories: () => axios.get(CATEGORY_API, authConfig()),
  create: (data) => axios.post(API_BASE, data, authConfig()),
  update: (id, data) => axios.put(`${API_BASE}/${id}`, data, authConfig()),
  toggleActive: (id) => axios.patch(`${API_BASE}/${id}/toggle-active`, {}, authConfig()),
}
