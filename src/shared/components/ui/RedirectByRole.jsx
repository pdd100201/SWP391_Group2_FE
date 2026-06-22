/**
 * RedirectByRole.jsx
 * -------------------------------------------------------------------
 * Component điều hướng tự động dựa trên role của người dùng hiện tại.
 * Được sử dụng cho route /home — một "dispatcher" route không có UI,
 * chỉ có nhiệm vụ redirect người dùng đến đúng nơi theo vai trò.
 *
 * Luồng xử lý:
 *  1. Không có token → chưa đăng nhập → về /login
 *  2. Role là CUSTOMER → về trang chủ công khai (/)
 *  3. Các role còn lại (ADMIN, MANAGER, RECEPTIONIST, WAITER) → vào /dashboard
 */
import { Navigate } from 'react-router-dom'

/**
 * RedirectByRole - Component không render UI, chỉ thực hiện điều hướng.
 * Đọc thông tin từ localStorage và quyết định redirect đến trang phù hợp.
 *
 * @returns {JSX.Element} Luôn trả về <Navigate /> component
 */
function RedirectByRole() {
  // Kiểm tra xem người dùng có token hợp lệ không (đã đăng nhập chưa)
  const token = localStorage.getItem('token')

  // Đọc vai trò để quyết định điều hướng đến đâu
  const role = localStorage.getItem('role')

  // Chưa có token → chưa đăng nhập → bắt buộc về trang login
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Người dùng là CUSTOMER → không có quyền vào dashboard
  // → redirect về trang chủ công khai (HomeScreen)
  if (role === 'CUSTOMER') {
    return <Navigate to="/" replace />
  }

  // Tất cả role còn lại (ADMIN, MANAGER, RECEPTIONIST, WAITER...)
  // → redirect vào trang dashboard quản lý
  return <Navigate to="/dashboard" replace />
}

export default RedirectByRole
