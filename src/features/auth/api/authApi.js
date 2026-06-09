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

export const forgotPassword = (email) => {
  return axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email })
}

export const verifyOtp = (email, otp) => {
  return axios.post(`${API_BASE_URL}/api/auth/verify-otp`, { email, otp })
}

export const resetPassword = (email, newPassword) => {
  return axios.post(`${API_BASE_URL}/api/auth/reset-password`, { email, newPassword })
}
