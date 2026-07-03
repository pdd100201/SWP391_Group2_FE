import axios from 'axios'

const API_BASE = 'http://localhost:8080/api/menu'

// Menu management uses explicit staff auth headers for every menu API call.
const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },
})

export const menuService = {
  // Returns dishes with computed cost, suggested price, stock, and availability.
  getAll: () => axios.get(API_BASE, authConfig()),
  // Sends the full dish form, including recipe ingredient rows.
  create: (data) => axios.post(API_BASE, data, authConfig()),
  update: (id, data) => axios.put(`${API_BASE}/${id}`, data, authConfig()),
  // Soft enable/disable; historical orders keep their saved dish snapshots.
  toggleActive: (id) => axios.patch(`${API_BASE}/${id}/toggle-active`, {}, authConfig()),
  // Inventory reservation operations used by kitchen/menu workflows.
  reserve: (id, servings, referenceCode) =>
    axios.post(`${API_BASE}/${id}/reservations`, { servings, referenceCode }, authConfig()),
  serveReservation: (reservationId) =>
    axios.post(`${API_BASE}/reservations/${reservationId}/serve`, {}, authConfig()),
  releaseReservation: (reservationId) =>
    axios.post(`${API_BASE}/reservations/${reservationId}/release`, {}, authConfig()),
}
