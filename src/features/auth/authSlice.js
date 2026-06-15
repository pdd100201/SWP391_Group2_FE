/**
 * authSlice.js
 * -------------------------------------------------------------------
 * File này dành cho Redux Toolkit slice quản lý trạng thái xác thực
 * (authentication state) toàn cục của ứng dụng.
 *
 * Hiện tại file chưa được triển khai — dự án đang lưu thông tin
 * xác thực trực tiếp vào localStorage (token, role, fullName, email)
 * và đọc lại mỗi khi cần, thay vì dùng Redux store.
 *
 * Kế hoạch tương lai (khi tích hợp Redux Toolkit):
 *  - createSlice: định nghĩa actions login, logout, setUser
 *  - initialState: { token: null, role: null, user: null, isAuthenticated: false }
 *  - extraReducers: xử lý kết quả async từ createAsyncThunk
 *  - Middleware persist: đồng bộ state với localStorage
 */
