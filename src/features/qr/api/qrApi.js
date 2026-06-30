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
