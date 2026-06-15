/**
 * dashboardNavItems.js
 * -------------------------------------------------------------------
 * Khai báo tập trung danh sách các mục điều hướng (nav items) của
 * Dashboard sidebar. Tách ra thành file riêng thay vì hardcode trong
 * Sidebar.jsx giúp:
 *  - Dễ thêm/xóa/sắp xếp lại menu mà không chạm vào UI component
 *  - Có thể lọc items theo role người dùng ở tầng trên
 *  - Tái sử dụng cho breadcrumb, tab navigation hoặc mobile menu
 */

// Import các icon từ thư viện lucide-react để dùng trong sidebar
import {
  LayoutDashboard,  // Icon dashboard tổng quan
  Table2,           // Icon quản lý bàn
  CalendarRange,    // Icon lịch đặt bàn
  ShoppingBag,      // Icon đơn hàng
  UtensilsCrossed,  // Icon menu ẩm thực
  BadgePercent,     // Icon khuyến mãi
  Boxes,            // Icon kho hàng
  BarChart3,        // Icon báo cáo thống kê
  Users,            // Icon quản lý tài khoản
} from 'lucide-react'

/**
 * dashboardNavItems - Mảng cấu hình các mục menu trong sidebar Dashboard.
 *
 * Mỗi item có cấu trúc:
 *  @property {string} label - Tên hiển thị của mục menu
 *  @property {string} to    - Đường dẫn React Router khi click vào menu
 *  @property {React.ComponentType} icon - Component icon từ lucide-react
 *
 * Thứ tự trong mảng = thứ tự hiển thị trong sidebar từ trên xuống dưới.
 */
export const dashboardNavItems = [
  // Trang tổng quan — landing page của dashboard
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },

  // Quản lý check-in khách và sơ đồ bàn nhà hàng
  { label: 'Check-in & Tables', to: '/dashboard/check-in-tables', icon: Table2 },

  // Quản lý đặt bàn trước (reservations)
  { label: 'Reservations', to: '/dashboard/reservations', icon: CalendarRange },

  // Quản lý đơn hàng và phục vụ tại bàn
  { label: 'Orders & Service', to: '/dashboard/orders-service', icon: ShoppingBag },

  // Quản lý thực đơn (thêm/sửa/xóa món ăn)
  {
    label: 'Menu Management',
    to: '/dashboard/menu-management',
    icon: UtensilsCrossed,
    allowedRoles: ['ADMIN', 'MANAGER'],
  },

  // Quản lý các chương trình khuyến mãi, ưu đãi
  { label: 'Promotions', to: '/dashboard/promotions', icon: BadgePercent },

  // Quản lý kho hàng nguyên liệu — chỉ ADMIN và MANAGER được truy cập
  {
    label: 'Inventory',
    to: '/dashboard/inventory',
    icon: Boxes,
    allowedRoles: ['ADMIN', 'MANAGER'],
  },

  // Xem báo cáo doanh thu, thống kê theo kỳ
  { label: 'Reports', to: '/dashboard/reports', icon: BarChart3 },

  // Quản lý tài khoản nhân viên
  { label: 'Account Management', to: '/dashboard/account-management', icon: Users },
]
