/**
 * inventoryService.js
 * -------------------------------------------------------------------
 * Module tập trung tất cả các lời gọi API liên quan đến kho hàng
 * (Inventory). Mỗi phương thức trong object này tương ứng với một
 * endpoint REST của backend Spring Boot tại cổng 8080.
 *
 * Lý do tách service riêng:
 *  - Tránh lặp code gọi axios ở nhiều component khác nhau
 *  - Dễ thay đổi baseURL hoặc logic xác thực ở một nơi duy nhất
 *  - Dễ mock/test độc lập với UI
 */
import axios from 'axios'

/** Địa chỉ gốc của API kho hàng ở backend */
const API_BASE = 'http://localhost:8080/api/inventory'

/**
 * Tạo object config chứa HTTP headers xác thực JWT.
 * Hàm này được gọi mỗi lần thực hiện request (không cache) để
 * luôn lấy token mới nhất từ localStorage — tránh trường hợp token
 * thay đổi giữa chừng (ví dụ: refresh token).
 *
 * @returns {{ headers: { Authorization: string, Content-Type: string } }}
 */
const getAuthHeaders = () => ({
  headers: {
    // Bearer token được lưu vào localStorage sau khi đăng nhập
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    // Báo cho backend biết body request là JSON
    'Content-Type': 'application/json',
  },
})

/**
 * inventoryService
 * -------------------------------------------------------------------
 * Object chứa toàn bộ các phương thức gọi API kho hàng.
 * Tất cả phương thức đều trả về Promise của axios (caller phải await).
 */
export const inventoryService = {
  /**
   * Lấy toàn bộ danh sách mặt hàng trong kho.
   * Dùng khi cần hiển thị tất cả items mà không cần lọc.
   *
   * @returns {Promise<AxiosResponse>} Mảng tất cả InventoryItem
   */
  getAll: () => axios.get(API_BASE, getAuthHeaders()),

  /**
   * Lấy thông tin chi tiết của một mặt hàng theo ID.
   *
   * @param {number} id - ID của mặt hàng cần lấy
   * @returns {Promise<AxiosResponse>} Đối tượng InventoryItem
   */
  getById: (id) => axios.get(`${API_BASE}/${id}`, getAuthHeaders()),

  /**
   * Tạo một mặt hàng kho mới.
   * Backend sẽ tự động tính status (IN_STOCK/LOW_STOCK/OUT_OF_STOCK)
   * dựa trên quantity và minimumQuantity được gửi lên.
   *
   * @param {Object} data - Dữ liệu mặt hàng mới (itemName, category, unit, quantity, ...)
   * @returns {Promise<AxiosResponse>} InventoryItem vừa được tạo (có id)
   */
  create: (data) => axios.post(API_BASE, data, getAuthHeaders()),

  /**
   * Chỉnh sửa category, unit, quantity, minimumQuantity, pricePerUnit và supplier.
   *
   * @param {number} id   - ID mặt hàng cần chỉnh sửa
   * @param {Object} data - Các thông tin vận hành mới của mặt hàng
   * @returns {Promise<AxiosResponse>} InventoryItem sau khi cập nhật
   */
  updateItem: (id, data) =>
    axios.put(`${API_BASE}/${id}`, data, getAuthHeaders()),

  /**
   * Cập nhật số lượng tồn kho của một mặt hàng.
   * Backend sẽ tự động tính lại status sau khi cập nhật số lượng
   * (trừ khi status đang bị ghi đè thủ công - isStatusOverridden = true).
   *
   * @param {number} id   - ID mặt hàng cần cập nhật
   * @param {Object} data - { quantity: number, note?: string }
   * @returns {Promise<AxiosResponse>} InventoryItem sau khi cập nhật
   */
  updateQuantity: (id, data) =>
    axios.put(`${API_BASE}/${id}/quantity`, data, getAuthHeaders()),

  /**
   * Bật/tắt trạng thái active của mặt hàng (soft delete).
   * Thay vì xóa hẳn khỏi DB, ta chỉ đánh dấu isActive = false
   * để giữ lịch sử và tránh ảnh hưởng dữ liệu liên quan (thực đơn...).
   *
   * @param {number} id - ID mặt hàng cần toggle
   * @returns {Promise<AxiosResponse>} InventoryItem với isActive đã được đảo ngược
   */
  toggleActive: (id) =>
    axios.patch(`${API_BASE}/${id}/toggle-active`, {}, getAuthHeaders()),

  /**
   * Ghi đè trạng thái tồn kho thủ công, hoặc reset về trạng thái tự động.
   * Khi manager muốn hiển thị status khác với giá trị tính tự động
   * (vd: hàng đang về đường, tạm thời set IN_STOCK), họ có thể ghi đè.
   * Truyền null để xóa ghi đè và trở về tính tự động theo quantity.
   *
   * @param {number} id             - ID mặt hàng
   * @param {string|null} statusOverride - 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | null
   * @returns {Promise<AxiosResponse>} InventoryItem sau khi cập nhật status
   */
  updateStatus: (id, statusOverride) =>
    axios.put(`${API_BASE}/${id}/status`, { statusOverride }, getAuthHeaders()),

  /**
   * Tìm kiếm mặt hàng với bộ lọc linh hoạt.
   * Các params được gắn vào query string của URL (không phải body).
   * Ví dụ: GET /api/inventory/search?keyword=tomato&category=Vegetables
   *
   * @param {Object} params - Các tham số lọc: { keyword?, category?, status? }
   * @returns {Promise<AxiosResponse>} Mảng InventoryItem thỏa điều kiện lọc
   */
  search: (params) =>
    axios.get(`${API_BASE}/search`, { ...getAuthHeaders(), params }),
}
