import axiosClient from '../../../shared/services/axiosClient'

export const revenueApi = {
  getPaidBills: () => axiosClient.get('/payments/bills', { params: { status: 'PAID' } }),
  getOrderGroups: () => axiosClient.get('/orders/groups', { params: { active: false } }),
}
