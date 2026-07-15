import axiosClient from './axiosClient'

export const mediaService = {
  uploadImage: (file, folder = 'general') => {
    // Backend nhận multipart/form-data với đúng hai field: file và thư mục nghiệp vụ.
    // API secret không xuất hiện ở frontend; việc ký request Cloudinary diễn ra tại backend.
    const data = new FormData()
    data.append('file', file)
    data.append('folder', folder)
    return axiosClient.post('/media/images', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
