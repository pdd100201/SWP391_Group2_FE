import axiosClient from './axiosClient'

// Đóng gói API upload ảnh dùng chung cho Menu, avatar và các module khác.
export const mediaService = {
  uploadImage: (file, folder = 'general') => {
    // Backend nhận multipart/form-data với đúng hai field: file và thư mục nghiệp vụ.
    // API secret không xuất hiện ở frontend; việc ký request Cloudinary diễn ra tại backend.
    const data = new FormData()

    // Tên field phải khớp @RequestParam("file") và @RequestParam("folder") ở backend.
    data.append('file', file)
    data.append('folder', folder)
    return axiosClient.post('/media/images', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
