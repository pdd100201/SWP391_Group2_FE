import axiosClient from '../../../shared/services/axiosClient'

export const paymentApi = {
  getOrCreateInvoice: (orderId) => axiosClient.get(`/payments/orders/${orderId}/invoice`),
  getInvoice: (invoiceId) => axiosClient.get(`/payments/invoices/${invoiceId}`),
  applyPromotion: (invoiceId, code) => axiosClient.post(`/payments/invoices/${invoiceId}/promotion`, { code }),
  removePromotion: (invoiceId) => axiosClient.delete(`/payments/invoices/${invoiceId}/promotion`),
  processPayment: (invoiceId, payload) => axiosClient.post(`/payments/invoices/${invoiceId}/pay`, payload),
}
