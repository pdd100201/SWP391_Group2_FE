import { Navigate, Route, Routes } from 'react-router-dom'
import HomeScreen from '../features/home/screens/HomeScreen'
import AuthScreen from '../features/auth/screens/AuthScreen'
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen'
import VerifyOtpScreen from '../features/auth/screens/VerifyOtpScreen'
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen'
import ProfileScreen from '../features/profile/screens/ProfileScreen'
import CreateReservationScreen from '../features/reservations/screens/CreateReservationScreen'
import ReservationHistoryScreen from '../features/reservations/screens/ReservationHistoryScreen'
import DashboardReservationsScreen from '../features/reservations/screens/DashboardReservationsScreen'
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
      <Route path="/home" element={<RedirectByRole />} />
      <Route
        path="/dashboard"
        element={(
          <RequireAuth allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER']}>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </RequireAuth>
        )}
      />
      <Route
        path="/dashboard/reservations"
        element={(
          <RequireAuth allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']}>
            <MainLayout>
              <DashboardReservationsScreen />
            </MainLayout>
          </RequireAuth>
        )}
      />
      <Route
        path="/dashboard/*"
        element={(
          <RequireAuth allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER']}>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </RequireAuth>
        )}
      />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default AppRoutes
