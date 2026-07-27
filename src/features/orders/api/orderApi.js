import axios from 'axios'
import axiosClient from '../../../shared/services/axiosClient'

const PUBLIC_API = 'http://localhost:8080/api/order-access'

export const orderApi = {
  // Các API đọc danh sách đơn theo reservation; tham số active quyết định có lấy
  // những nhóm đã hoàn tất/hủy hay chỉ lấy các nhóm còn đang phục vụ.
  getAll: (active = true) => axiosClient.get('/orders', { params: { active } }),
  getGroups: (active = false) => axiosClient.get('/orders/groups', { params: { active } }),
  getGroup: (reservationId) => axiosClient.get(`/orders/groups/${reservationId}`),
  getById: (orderId) => axiosClient.get(`/orders/${orderId}`),
  getByReservation: (reservationId) => axiosClient.get(`/orders/by-reservation/${reservationId}`),

  // Tạo đồng bộ một đơn bàn cho từng bàn đã gán vào reservation ARRIVED.
  create: (payload) => axiosClient.post('/orders', payload),

  // Các thao tác với món luôn gắn vào đúng orderId của bàn đang được chọn.
  addItem: (orderId, payload) => axiosClient.post(`/orders/${orderId}/items`, payload),
  updateItem: (orderId, itemId, payload) => axiosClient.patch(`/orders/${orderId}/items/${itemId}`, payload),
  removeItem: (orderId, itemId) => axiosClient.delete(`/orders/${orderId}/items/${itemId}`),

  // Gửi toàn bộ món DRAFT xuống bếp và cập nhật tiến độ phục vụ từng món.
  submit: (orderId) => axiosClient.post(`/orders/${orderId}/submit`),
  updateItemStatus: (orderId, itemId, status) =>
    axiosClient.patch(`/orders/${orderId}/items/${itemId}/status`, { status }),

  // Hủy một đơn bàn hoặc hoàn tất toàn bộ reservation sau khi hóa đơn đã thanh toán.
  cancel: (orderId) => axiosClient.patch(`/orders/${orderId}/cancel`),
  completeReservation: (reservationId) =>
    axiosClient.patch(`/orders/reservations/${reservationId}/complete`),

  // Mọi đơn bàn trong cùng reservation dùng chung một hóa đơn.
  // Nhóm API này đọc hóa đơn, áp/xóa khuyến mãi và chọn phương thức thanh toán.
  getBill: (reservationId) => axiosClient.get(`/payments/bills/reservations/${reservationId}`),
  applyPromotion: (reservationId, code) =>
    axiosClient.patch(`/payments/bills/reservations/${reservationId}/promotion`, { code }),
  removePromotion: (reservationId) =>
    axiosClient.delete(`/payments/bills/reservations/${reservationId}/promotion`),
  createSepayPayment: (reservationId) =>
    axiosClient.post(`/payments/bills/reservations/${reservationId}/sepay`),
  createCashPayment: (reservationId) =>
    axiosClient.post(`/payments/bills/reservations/${reservationId}/cash`),
  cancelPayment: (reservationId) =>
    axiosClient.post(`/payments/bills/reservations/${reservationId}/cancel-payment`),
}

export const publicOrderApi = {
  // Khách gọi các endpoint công khai bằng token trên mã QR thay vì JWT của nhân viên.
  // Token chỉ cho phép thao tác trên đúng đơn bàn đã được cấp.
  getOrder: (token) => axios.get(`${PUBLIC_API}/${token}`),
  getMenu: (token) => axios.get(`${PUBLIC_API}/${token}/menu`),
  addItem: (token, payload) => axios.post(`${PUBLIC_API}/${token}/items`, payload),
  updateItem: (token, itemId, payload) => axios.patch(`${PUBLIC_API}/${token}/items/${itemId}`, payload),
  removeItem: (token, itemId) => axios.delete(`${PUBLIC_API}/${token}/items/${itemId}`),
  submit: (token) => axios.post(`${PUBLIC_API}/${token}/submit`),
}
