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
  { label: 'Check-in & Tables', to: '/dashboard/check-in-tables', icon: Table2 },
  { label: 'Reservations', to: '/dashboard/reservations', icon: CalendarRange },
  { label: 'Orders & Service', to: '/dashboard/orders-service', icon: ShoppingBag },
  { label: 'Menu Management', to: '/dashboard/menu-management', icon: UtensilsCrossed },
  { label: 'Promotions', to: '/dashboard/promotions', icon: BadgePercent },
  { label: 'Inventory', to: '/dashboard/inventory', icon: Boxes },
  { label: 'Reports', to: '/dashboard/reports', icon: BarChart3 },
  { label: 'Account Management', to: '/dashboard/account-management', icon: Users },
]
