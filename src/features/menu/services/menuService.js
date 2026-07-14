import axios from 'axios'

const API_BASE = 'http://localhost:8080/api/menu'

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },
})

export const menuService = {
  getAll: () => axios.get(API_BASE, authConfig()),
  create: (data) => axios.post(API_BASE, data, authConfig()),
  update: (id, data) => axios.put(`${API_BASE}/${id}`, data, authConfig()),
  toggleActive: (id) => axios.patch(`${API_BASE}/${id}/toggle-active`, {}, authConfig()),
  reserve: (id, servings, referenceCode) =>
    axios.post(`${API_BASE}/${id}/reservations`, { servings, referenceCode }, authConfig()),
  serveReservation: (reservationId) =>
    axios.post(`${API_BASE}/reservations/${reservationId}/serve`, {}, authConfig()),
  releaseReservation: (reservationId) =>
    axios.post(`${API_BASE}/reservations/${reservationId}/release`, {}, authConfig()),
}
