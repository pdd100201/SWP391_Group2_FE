import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import HomeScreen from '../features/home/screens/HomeScreen'
import QrMenuScreen from '../features/qr/screens/QrMenuScreen'
import QrCartScreen from '../features/qr/screens/QrCartScreen'
import QrOrderStatusScreen from '../features/qr/screens/QrOrderStatusScreen'
import QrOrderRedirect from '../features/qr/screens/QrOrderRedirect'
import AuthScreen from '../features/auth/screens/AuthScreen'
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen'
import VerifyOtpScreen from '../features/auth/screens/VerifyOtpScreen'
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen'
import MenuManagementScreen from '../features/menu/screens/MenuManagementScreen'
import ProfileScreen from '../features/profile/screens/ProfileScreen'
import DashboardProfileScreen from '../features/profile/screens/DashboardProfileScreen'
import StaffAccountPage from '../features/accounts/screens/StaffAccountPage'
import CustomerAccountPage from '../features/accounts/screens/CustomerAccountPage'
import CreateReservationScreen from '../features/reservations/screens/CreateReservationScreen'
import ReservationHistoryScreen from '../features/reservations/screens/ReservationHistoryScreen'
import DashboardReservationsScreen from '../features/reservations/screens/DashboardReservationsScreen'
import OrdersServiceScreen from '../features/orders/screens/OrdersServiceScreen'
import RevenueScreen from '../features/revenue/screens/RevenueScreen'
import PublicOrderScreen from '../features/orders/screens/PublicOrderScreen'
import CheckInScreen from '../features/checkin/screens/CheckInScreen'
import MainLayout from '../shared/components/layout/MainLayout/MainLayout'
import RequireAuth from '../shared/components/ui/RequireAuth'
import RedirectByRole from '../shared/components/ui/RedirectByRole'
import PromotionsScreen from '../features/promotions/screens/PromotionsScreen'
import DashboardScreen from '../features/dashboard/screens/DashboardScreen'

const TableManagementScreen = lazy(() => import('../features/tables/screens/TableManagementScreen'))

function DashboardPage() {
  return <div className="dashboard-placeholder">Dashboard content goes here</div>
}

function DashboardIndex() {
  const role = sessionStorage.getItem('role')
  if (role === 'ADMIN' || role === 'MANAGER') {
    return <DashboardScreen isDashboardOnly={true} />
  }
  if (role === 'RECEPTIONIST') {
    return <Navigate to="/dashboard/check-in" replace />
  }
  if (role === 'WAITER') {
    return <Navigate to="/dashboard/orders-service" replace />
  }
  return <div className="dashboard-placeholder">Welcome to the Dashboard</div>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/register" element={<AuthScreen />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      <Route path="/verify-otp" element={<VerifyOtpScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/order-access/:token" element={<PublicOrderScreen />} />
      <Route
        path="/reservations"
        element={(
          <RequireAuth allowedRoles={['CUSTOMER']}>
            <CreateReservationScreen />
          </RequireAuth>
        )}
      />
      <Route
        path="/reservations/create"
        element={(
          <RequireAuth allowedRoles={['CUSTOMER']}>
            <CreateReservationScreen />
          </RequireAuth>
        )}
      />
      <Route
        path="/reservation-history"
        element={(
          <RequireAuth allowedRoles={['CUSTOMER']}>
            <ReservationHistoryScreen />
          </RequireAuth>
        )}
      />
      <Route
        path="/profile"
        element={(
          <RequireAuth allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER', 'CUSTOMER']}>
            <ProfileScreen />
          </RequireAuth>
        )}
      />
      <Route
        path="/dashboard/profile"
        element={(
          <RequireAuth allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER']}>
            <MainLayout />
          </RequireAuth>
        )}
      >
        <Route index element={<ProfileScreen />} />
      </Route>
      <Route path="/home" element={<RedirectByRole />} />
      <Route
        path="/dashboard"
        element={(
          <RequireAuth allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER']}>
            <MainLayout />
          </RequireAuth>
        )}
      >
        <Route index element={<DashboardIndex />} />
        <Route path="check-in" element={<CheckInScreen />} />
        <Route
          path="tables"
          element={(
            <Suspense fallback={<div className="dashboard-placeholder">Loading tables...</div>}>
              <TableManagementScreen />
            </Suspense>
          )}
        />
        <Route path="reservations" element={<DashboardReservationsScreen />} />
        <Route path="orders-service" element={<OrdersServiceScreen />} />
        <Route path="orders-service/active" element={<Navigate to="/dashboard/orders-service" replace />} />
        <Route path="orders-service/:orderId/payment" element={<Navigate to="/dashboard/orders-service" replace />} />
        <Route path="orders-service/active" element={<OrdersServiceScreen activeView />} />
        <Route
          path="revenue"
          element={(
            <RequireAuth allowedRoles={['ADMIN', 'MANAGER']}>
              <RevenueScreen />
            </RequireAuth>
          )}
        />
        <Route
          path="menu-management"
          element={(
            <RequireAuth allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER']}>
              <MenuManagementScreen />
            </RequireAuth>
          )}
        />
          <Route
              path="promotions"
              element={(
                  <RequireAuth allowedRoles={['ADMIN', 'MANAGER']}>
                      <PromotionsScreen />
                  </RequireAuth>
              )}
          />
        <Route
          path="reports"
          element={(
            <RequireAuth allowedRoles={['ADMIN', 'MANAGER']}>
              <DashboardScreen />
            </RequireAuth>
          )}
        />
        <Route path="account-management" element={<DashboardPage />} />
        <Route path="accounts/staff" element={<StaffAccountPage />} />
        <Route path="accounts/customer" element={<CustomerAccountPage />} />
        <Route path="profile" element={<DashboardProfileScreen />} />
      </Route>
      <Route path="/order" element={<QrOrderRedirect />} />
      <Route path="/qr/table/:tableId" element={<QrMenuScreen />} />
      <Route path="/qr/table/:tableId/cart" element={<QrCartScreen />} />
      <Route path="/qr/order/:orderId/status" element={<QrOrderStatusScreen />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default AppRoutes
