import axiosClient from '../../../shared/services/axiosClient'

export const menuService = {
  getAll: () => axiosClient.get('/menu'),
  create: (data) => axiosClient.post('/menu', data),
  update: (id, data) => axiosClient.put(`/menu/${id}`, data),
  toggleActive: (id) => axiosClient.patch(`/menu/${id}/toggle-active`),
  reserve: (id, servings, referenceCode) =>
    axiosClient.post(`/menu/${id}/reservations`, { servings, referenceCode }),
  serveReservation: (reservationId) =>
    axiosClient.post(`/menu/reservations/${reservationId}/serve`),
  releaseReservation: (reservationId) =>
    axiosClient.post(`/menu/reservations/${reservationId}/release`),
}
