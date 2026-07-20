import axios from 'axios'
import axiosClient from '../../../shared/services/axiosClient'

const PUBLIC_API = 'http://localhost:8080/api/order-access'

export const orderApi = {
  // Order Management reads reservation groups, while dish mutations stay scoped
  // to the exact table order selected by the waiter.
  getAll: (active = true) => axiosClient.get('/orders', { params: { active } }),
  getGroups: (active = false) => axiosClient.get('/orders/groups', { params: { active } }),
  getGroup: (reservationId) => axiosClient.get(`/orders/groups/${reservationId}`),
  getById: (orderId) => axiosClient.get(`/orders/${orderId}`),
  getByReservation: (reservationId) => axiosClient.get(`/orders/by-reservation/${reservationId}`),
  create: (payload) => axiosClient.post('/orders', payload),
  addItem: (orderId, payload) => axiosClient.post(`/orders/${orderId}/items`, payload),
  updateItem: (orderId, itemId, payload) => axiosClient.patch(`/orders/${orderId}/items/${itemId}`, payload),
  removeItem: (orderId, itemId) => axiosClient.delete(`/orders/${orderId}/items/${itemId}`),
  submit: (orderId) => axiosClient.post(`/orders/${orderId}/submit`),
  updateItemStatus: (orderId, itemId, status) =>
    axiosClient.patch(`/orders/${orderId}/items/${itemId}/status`, { status }),
  transferTable: (orderId, targetTableId) =>
    axiosClient.patch(`/orders/${orderId}/transfer-table`, { targetTableId }),
  cancel: (orderId) => axiosClient.patch(`/orders/${orderId}/cancel`),
  completeReservation: (reservationId) =>
    axiosClient.patch(`/orders/reservations/${reservationId}/complete`),

  // Promotion and payment belong to the single bill shared by every table order
  // in the reservation.
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
  // Guest endpoints use a public order token instead of staff authentication.
  getOrder: (token) => axios.get(`${PUBLIC_API}/${token}`),
  getMenu: (token) => axios.get(`${PUBLIC_API}/${token}/menu`),
  addItem: (token, payload) => axios.post(`${PUBLIC_API}/${token}/items`, payload),
  updateItem: (token, itemId, payload) => axios.patch(`${PUBLIC_API}/${token}/items/${itemId}`, payload),
  removeItem: (token, itemId) => axios.delete(`${PUBLIC_API}/${token}/items/${itemId}`),
  submit: (token) => axios.post(`${PUBLIC_API}/${token}/submit`),
}
