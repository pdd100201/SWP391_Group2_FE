import axiosClient from '../../../shared/services/axiosClient'

export const revenueApi = {
  getPaidOrders: () => axiosClient.get('/orders', { params: { active: false } }),
}
