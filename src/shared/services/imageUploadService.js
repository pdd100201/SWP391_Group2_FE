import axiosClient from './axiosClient'

export const uploadImage = (file, folder = 'general') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  return axiosClient.post('/uploads/images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
