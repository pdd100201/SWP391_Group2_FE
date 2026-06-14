import axiosClient from '../../../shared/services/axiosClient'

export const getProfile = () => {
  return axiosClient.get('/users/profile')
}

export const updateProfile = (payload) => {
  return axiosClient.put('/users/profile', payload)
}

export const changePassword = (payload) => {
  return axiosClient.put('/users/profile/change-password', payload)
}

export const updateAvatar = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return axiosClient.patch('/users/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
