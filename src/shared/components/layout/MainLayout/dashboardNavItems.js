import {
  LayoutDashboard,
  Table2,
  CalendarRange,
  ShoppingBag,
  UtensilsCrossed,
  BadgePercent,
  Boxes,
  BarChart3,
  Users,
} from 'lucide-react'

export const dashboardNavItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Check-in & Tables',
    icon: Table2,
    roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER'],
    children: [
      { label: 'Check-in', to: '/dashboard/check-in' },
      { label: 'Tables', to: '/dashboard/tables' },
    ],
  },
  { label: 'Reservations', to: '/dashboard/reservations', icon: CalendarRange },
  {
    label: 'Orders & Service',
    icon: ShoppingBag,
    children: [
      { label: 'Order Management', to: '/dashboard/orders-service/management' },
      { label: 'Active Orders', to: '/dashboard/orders-service/active' },
    ],
  },
  { label: 'Menu Management', to: '/dashboard/menu-management', icon: UtensilsCrossed },
  { label: 'Promotions', to: '/dashboard/promotions', icon: BadgePercent },
  { label: 'Inventory', to: '/dashboard/inventory', icon: Boxes },
  { label: 'Reports', to: '/dashboard/reports', icon: BarChart3 },
  {
    label: 'Account Management',
    icon: Users,
    roles: ['ADMIN', 'MANAGER'],
    children: [
      { label: 'Staff Account', to: '/dashboard/accounts/staff' },
      { label: 'Customer Account', to: '/dashboard/accounts/customer' },
    ],
  },
]
