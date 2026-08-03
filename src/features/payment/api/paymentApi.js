import axiosClient from '../../../shared/services/axiosClient'

export const paymentApi = {
  getGroup: (reservationId) => axiosClient.get(`/orders/groups/${reservationId}`),
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
  voidItem: (orderId, itemId, reason, quantity) =>
    axiosClient.post(`/orders/${orderId}/items/${itemId}/void`, { reason, quantity }),
  completeReservation: (reservationId) =>
    axiosClient.patch(`/orders/reservations/${reservationId}/complete`),
}
