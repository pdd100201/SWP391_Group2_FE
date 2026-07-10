import axios from 'axios'
import axiosClient from '../../../shared/services/axiosClient'

const PUBLIC_API = 'http://localhost:8080/api/order-access'

export const orderApi = {
  // Staff order workspace endpoints. axiosClient attaches the JWT automatically.
  getAll: (active = true) => axiosClient.get('/orders', { params: { active } }),
  getById: (orderId) => axiosClient.get(`/orders/${orderId}`),
  getByReservation: (reservationId) => axiosClient.get(`/orders/by-reservation/${reservationId}`),
  create: (payload) => axiosClient.post('/orders', payload),
  addItem: (orderId, payload) => axiosClient.post(`/orders/${orderId}/items`, payload),
  updateItem: (orderId, itemId, payload) => axiosClient.patch(`/orders/${orderId}/items/${itemId}`, payload),
  removeItem: (orderId, itemId) => axiosClient.delete(`/orders/${orderId}/items/${itemId}`),
  submit: (orderId) => axiosClient.post(`/orders/${orderId}/submit`),
  updateItemStatus: (orderId, itemId, status) =>
    axiosClient.patch(`/orders/${orderId}/items/${itemId}/status`, { status }),
  applyPromotion: (orderId, code) => axiosClient.patch(`/orders/${orderId}/promotion`, { code }),
  removePromotion: (orderId) => axiosClient.delete(`/orders/${orderId}/promotion`),
  createSepayPayment: (orderId) => axiosClient.patch(`/orders/${orderId}/payment`),
  getLatestPayment: (orderId) => axiosClient.get(`/payments/orders/${orderId}/latest`),
  close: (orderId) => axiosClient.patch(`/orders/${orderId}/close`),
  cancel: (orderId) => axiosClient.patch(`/orders/${orderId}/cancel`),
  // Payment/invoice calls are colocated because they operate on the selected order.
  getInvoice: (orderId) => axiosClient.get(`/payments/orders/${orderId}/invoice`),
  issueInvoice: (orderId) => axiosClient.post(`/payments/orders/${orderId}/invoice`),
  getInvoiceById: (invoiceId) => axiosClient.get(`/payments/invoices/${invoiceId}`),
  applyPromotion: (invoiceId, code) => axiosClient.post(`/payments/invoices/${invoiceId}/promotion`, { code }),
  removePromotion: (invoiceId) => axiosClient.delete(`/payments/invoices/${invoiceId}/promotion`),
  payInvoice: (invoiceId, payload) => axiosClient.post(`/payments/invoices/${invoiceId}/pay`, payload),
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
