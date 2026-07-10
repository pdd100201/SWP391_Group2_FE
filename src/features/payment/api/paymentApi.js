import axiosClient from '../../../shared/services/axiosClient'

export const paymentApi = {
  getOrder: (orderId) => axiosClient.get(`/orders/${orderId}`),
  applyPromotion: (orderId, code) => axiosClient.patch(`/orders/${orderId}/promotion`, { code }),
  removePromotion: (orderId) => axiosClient.delete(`/orders/${orderId}/promotion`),
  createSepayPayment: (orderId) => axiosClient.patch(`/orders/${orderId}/payment`),
  closeOrder: (orderId) => axiosClient.patch(`/orders/${orderId}/close`),
  getLatestPayment: (orderId) => axiosClient.get(`/payments/orders/${orderId}/latest`),
}
