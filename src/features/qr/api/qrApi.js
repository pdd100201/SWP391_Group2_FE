import axios from 'axios'

const BASE_URL = 'http://localhost:8080/api/qr'

export const createSession = (tableId) =>
  axios.post(`${BASE_URL}/session/${tableId}`).then((res) => res.data)

export const getMenu = () =>
  axios.get(`${BASE_URL}/menu`).then((res) => res.data)

export const createOrder = (sessionToken, items) =>
  axios
    .post(`${BASE_URL}/order`, { sessionToken, items })
    .then((res) => res.data)

export const getOrderStatus = (orderId) =>
  axios.get(`${BASE_URL}/order/${orderId}`).then((res) => res.data)

export const getActiveOrder = (tableId) =>
  axios.get(`${BASE_URL}/table/${tableId}/active-order`)
    .then((res) => res.data)
    .catch((err) => {
      if (err.response?.status === 404) return null
      throw err
    })

// ── Staff-facing QR order management (requires JWT) ─────────────────
function authHeaders() {
  const token = sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getOpenQrOrders = () =>
  axios.get(`${BASE_URL}/orders`, { headers: authHeaders() })
    .then((res) => (res.data || []).filter((o) => o.status === 'OPEN'))

export const getQrOrderDetail = (orderId) =>
  axios.get(`${BASE_URL}/order/${orderId}`, { headers: authHeaders() })
    .then((res) => res.data)

export const addQrItem = (orderId, menuItemId, quantity) =>
  axios.post(`${BASE_URL}/orders/${orderId}/items`, { menuItemId, quantity }, { headers: authHeaders() })
    .then((res) => res.data)

export const updateQrItem = (orderId, itemId, quantity, note) =>
  axios.patch(`${BASE_URL}/orders/${orderId}/items/${itemId}`, { quantity, note }, { headers: authHeaders() })
    .then((res) => res.data)

export const removeQrItem = (orderId, itemId) =>
  axios.delete(`${BASE_URL}/orders/${orderId}/items/${itemId}`, { headers: authHeaders() })
    .then((res) => res.data)

export const submitQrOrder = (orderId) =>
  axios.post(`${BASE_URL}/orders/${orderId}/submit`, {}, { headers: authHeaders() })
    .then((res) => res.data)

export const advanceQrItem = (orderId, itemId, nextStatus) =>
  axios.patch(
    `${BASE_URL}/orders/${orderId}/items/${itemId}/status`,
    { status: nextStatus },
    { headers: authHeaders() },
  ).then((res) => res.data)

export const closeQrOrder = (orderId) =>
  axios.patch(
    `${BASE_URL}/orders/${orderId}/status`,
    { status: 'CLOSED' },
    { headers: authHeaders() },
  ).then((res) => res.data)
