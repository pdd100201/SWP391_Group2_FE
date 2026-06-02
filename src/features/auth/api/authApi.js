import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080'

export const login = (email, password) => {
  return axios.post(`${API_BASE_URL}/api/auth/login`, {
    email,
    password,
  })
}

export const registerCustomer = (payload) => {
  return axios.post(`${API_BASE_URL}/api/auth/customer/register`, payload)
}

export const loginWithGoogle = (credentialToken) => {
  return axios.post(`${API_BASE_URL}/api/auth/google`, {
    credentialToken,
  })
}
