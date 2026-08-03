import {
  LayoutDashboard,
  Table2,
  CalendarRange,
  ShoppingBag,
  UtensilsCrossed,
  BadgePercent,
  BarChart3,
  Users,
} from 'lucide-react'

export const dashboardNavItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
  {
    label: 'Check-in & Tables',
    icon: Table2,
    roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER'],
    children: [
      { label: 'Check-in', to: '/dashboard/check-in', roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST'] },
      { label: 'Tables', to: '/dashboard/tables' },
    ],
  },
  { label: 'Reservations', to: '/dashboard/reservations', icon: CalendarRange },
  {
    label: 'Orders & Service',
    icon: ShoppingBag,
    children: [
      { label: 'Order management', to: '/dashboard/orders-service' },
      { label: 'Revenue', to: '/dashboard/revenue', roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST'] },
    ],
  },
  { label: 'Menu Management', to: '/dashboard/menu-management', icon: UtensilsCrossed, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Promotions', to: '/dashboard/promotions', icon: BadgePercent, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Reports', to: '/dashboard/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
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
