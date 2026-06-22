/**
 * axiosClient.js
 * -------------------------------------------------------------------
 * Cấu hình instance axios dùng chung cho toàn bộ ứng dụng.
 *
 * Lý do tạo instance riêng thay vì dùng trực tiếp `axios`:
 *  - Chỉ cần cấu hình baseURL, timeout, headers một lần duy nhất
 *  - Tất cả request trong app đều đi qua cùng một interceptor chain
 *  - Dễ thay đổi địa chỉ backend (chỉ sửa baseURL ở đây)
 *  - Dễ thêm xác thực token hoặc refresh token sau này
 */
import axios from 'axios';

/**
 * axiosClient - Instance axios được cấu hình sẵn cho dự án này.
 *
 * baseURL: Địa chỉ backend Spring Boot chạy ở localhost:8080.
 *          Mọi request chỉ cần chỉ định path tương đối (vd: '/auth/login')
 *          thay vì phải gõ full URL.
 *
 * headers: Đặt Content-Type mặc định là JSON để backend biết cách parse body.
 */
const axiosClient = axios.create({
  baseURL: 'http://localhost:8080/api', // Địa chỉ Backend của bạn
  headers: {
    'Content-Type': 'application/json',
  },
});

// Bạn có thể thêm interceptors ở đây để xử lý Token sau này.
// Ví dụ:
//   axiosClient.interceptors.request.use(config => {
//     const token = localStorage.getItem('token');
//     if (token) config.headers.Authorization = `Bearer ${token}`;
//     return config;
//   });
//
//   axiosClient.interceptors.response.use(
//     response => response,
//     error => {
//       // Xử lý lỗi 401 (hết hạn token), redirect về /login...
//       return Promise.reject(error);
//     }
//   );

export default axiosClient;