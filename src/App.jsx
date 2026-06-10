import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import HomeScreen from './features/home/screens/HomeScreen'
import AuthScreen from './features/auth/screens/AuthScreen'
import MainLayout from './shared/components/layout/MainLayout/MainLayout'
import RequireAuth from './shared/components/ui/RequireAuth'
import RedirectByRole from './shared/components/ui/RedirectByRole'
import { ToastProvider } from './shared/components/ui/Toast/Toast'
import StaffAccountPage from './features/accounts/screens/StaffAccountPage'
import CustomerAccountPage from './features/accounts/screens/CustomerAccountPage'

function DashboardPage() {
  return <div className="dashboard-placeholder">Dashboard content goes here</div>
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/login" element={<AuthScreen />} />
          <Route path="/register" element={<AuthScreen />} />
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
            path="/dashboard/accounts/staff"
            element={(
              <RequireAuth allowedRoles={['ADMIN']}>
                <MainLayout>
                  <StaffAccountPage />
                </MainLayout>
              </RequireAuth>
            )}
          />
          <Route
            path="/dashboard/accounts/customer"
            element={(
              <RequireAuth allowedRoles={['ADMIN']}>
                <MainLayout>
                  <CustomerAccountPage />
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
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
