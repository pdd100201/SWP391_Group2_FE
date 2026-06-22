import axiosClient from '../../../shared/services/axiosClient'

export const createReservation = (payload) => {
  return axiosClient.post('/reservations', payload)
}

export const getMyReservations = () => {
  return axiosClient.get('/reservations/me')
}

export const getAllReservations = () => {
  return axiosClient.get('/reservations')
}

export const cancelReservation = (reservationId) => {
  return axiosClient.patch(`/reservations/${reservationId}/cancel`)
}

export const confirmReservation = (reservationId) => {
  return axiosClient.patch(`/reservations/${reservationId}/confirm`)
}
