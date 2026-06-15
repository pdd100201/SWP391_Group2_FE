/**
 * RequireAuth.jsx
 * -------------------------------------------------------------------
 * Component bảo vệ route (Route Guard) — đảm bảo chỉ những người dùng
 * đã đăng nhập và có role phù hợp mới được truy cập vào các trang bên trong.
 *
 * Cách hoạt động:
 *  1. Kiểm tra token trong localStorage (người dùng đã đăng nhập chưa?)
 *  2. Nếu có allowedRoles, kiểm tra role người dùng có nằm trong danh sách không
 *  3. Render nội dung (children hoặc <Outlet />) nếu đủ điều kiện
 *
 * Cách dùng:
 *  - Wrap route bằng RequireAuth để bảo vệ toàn bộ layout
 *  - Truyền allowedRoles để giới hạn thêm theo vai trò
 *
 * @example
 *  <Route element={<RequireAuth allowedRoles={['ADMIN', 'MANAGER']}><MainLayout /></RequireAuth>}>
 *    <Route path="/dashboard/inventory" element={<InventoryScreen />} />
 *  </Route>
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'

/**
 * RequireAuth - Component bảo vệ route theo trạng thái đăng nhập và role.
 *
 * @param {React.ReactNode} children    - Nội dung con cần bảo vệ (optional, có thể dùng Outlet)
 * @param {string[]} allowedRoles       - Danh sách các role được phép truy cập
 *                                        Nếu không truyền, chỉ kiểm tra đã đăng nhập hay chưa
 * @returns {React.ReactNode}           - children/Outlet nếu được phép, hoặc <Navigate> nếu không
 */
function RequireAuth({ children, allowedRoles }) {
  // Lấy vị trí hiện tại để lưu lại, giúp redirect về đúng trang sau khi login
  const location = useLocation()

  // Đọc token từ localStorage — nếu có nghĩa là người dùng đã đăng nhập
  const token = localStorage.getItem('token')

  // Đọc role người dùng để kiểm tra quyền truy cập
  const role = localStorage.getItem('role')

  // KIỂM TRA 1: Chưa đăng nhập → redirect về trang login
  // Lưu `state.from = location` để sau khi login xong có thể quay lại đúng trang
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // KIỂM TRA 2: Đã đăng nhập nhưng role không được phép truy cập
  // allowedRoles?.length: chỉ kiểm tra nếu có danh sách role được chỉ định
  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    // CUSTOMER không có quyền vào dashboard → về trang chủ công khai
    if (role === 'CUSTOMER') {
      return <Navigate to="/" replace />
    }
    // Các role khác (staff) không có quyền vào trang này → về dashboard chính
    return <Navigate to="/dashboard" replace />
  }

  // Mọi điều kiện thỏa mãn: render nội dung được bảo vệ
  // Nếu được dùng như layout route wrapper (không có children), render nested routes via Outlet
  return children ?? <Outlet />
}

export default RequireAuth
