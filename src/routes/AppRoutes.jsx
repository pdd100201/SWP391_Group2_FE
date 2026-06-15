import { Navigate, Route, Routes } from 'react-router-dom'
import HomeScreen from '../features/home/screens/HomeScreen'
import AuthScreen from '../features/auth/screens/AuthScreen'
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen'
import VerifyOtpScreen from '../features/auth/screens/VerifyOtpScreen'
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen'
import InventoryScreen from '../features/inventory/screens/InventoryScreen'
import MenuManagementScreen from '../features/menu/screens/MenuManagementScreen'
import ProfileScreen from '../features/profile/screens/ProfileScreen'
import MainLayout from '../shared/components/layout/MainLayout/MainLayout'
import RequireAuth from '../shared/components/ui/RequireAuth'
import RedirectByRole from '../shared/components/ui/RedirectByRole'

function DashboardPage() {
  return <div className="dashboard-placeholder">Dashboard content goes here</div>
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
      <Route
        path="/profile"
        element={(
          <RequireAuth allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER', 'CUSTOMER']}>
            <ProfileScreen />
          </RequireAuth>
        )}
      />
      <Route path="/home" element={<RedirectByRole />} />
      <Route
        path="/dashboard"
        element={(
          <RequireAuth allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER']}>
            <MainLayout />
          </RequireAuth>
        )}
      >
        <Route index element={<DashboardPage />} />
        <Route path="check-in-tables" element={<DashboardPage />} />
        <Route path="reservations" element={<DashboardPage />} />
        <Route path="orders-service" element={<DashboardPage />} />
        <Route
          path="menu-management"
          element={(
            <RequireAuth allowedRoles={['ADMIN', 'MANAGER']}>
              <MenuManagementScreen />
            </RequireAuth>
          )}
        />
        <Route path="promotions" element={<DashboardPage />} />
        <Route
          path="inventory"
          element={(
            <RequireAuth allowedRoles={['ADMIN', 'MANAGER']}>
              <InventoryScreen />
            </RequireAuth>
          )}
        />
        <Route path="reports" element={<DashboardPage />} />
        <Route path="account-management" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default AppRoutes
