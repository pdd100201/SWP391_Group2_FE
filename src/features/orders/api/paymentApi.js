import axiosClient from '../../../shared/services/axiosClient'

// API thanh toán phiên bản theo invoice/order.
// File được giữ trong feature Order vì màn hình đơn có thể chuyển tiếp sang bước thanh toán.
export const paymentApi = {
  // Lấy hóa đơn hiện có; backend sẽ tạo mới nếu order chưa có invoice.
  getOrCreateInvoice: (orderId) => axiosClient.get(`/payments/orders/${orderId}/invoice`),
  getInvoice: (invoiceId) => axiosClient.get(`/payments/invoices/${invoiceId}`),

  // Khuyến mãi được áp vào hóa đơn, không áp trực tiếp vào từng món.
  applyPromotion: (invoiceId, code) => axiosClient.post(`/payments/invoices/${invoiceId}/promotion`, { code }),
  removePromotion: (invoiceId) => axiosClient.delete(`/payments/invoices/${invoiceId}/promotion`),

  // payload chứa phương thức và dữ liệu cần thiết để backend xử lý giao dịch.
  processPayment: (invoiceId, payload) => axiosClient.post(`/payments/invoices/${invoiceId}/pay`, payload),
}
