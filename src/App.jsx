import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import HomeScreen from './features/home/screens/HomeScreen'
import AuthScreen from './features/auth/screens/AuthScreen'
import MainLayout from './shared/components/layout/MainLayout/MainLayout'
import RequireAuth from './shared/components/ui/RequireAuth'
import RedirectByRole from './shared/components/ui/RedirectByRole'
import InventoryScreen from './features/inventory/screens/InventoryScreen'

function DashboardPage() {
  return <div className="dashboard-placeholder">Dashboard content goes here</div>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/login" element={<AuthScreen />} />
        <Route path="/register" element={<AuthScreen />} />
        <Route path="/home" element={<RedirectByRole />} />

        {/*
         * Dashboard shell: RequireAuth guards the outer wrapper,
         * MainLayout provides the shell with Sidebar + Header.
         * Child <Route>s are rendered via <Outlet /> inside MainLayout.
         */}
        <Route
          element={
            <RequireAuth allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'WAITER']}>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Inventory – ADMIN & MANAGER only */}
          <Route
            path="/dashboard/inventory"
            element={
              <RequireAuth allowedRoles={['ADMIN', 'MANAGER']}>
                <InventoryScreen />
              </RequireAuth>
            }
          />

          {/* Placeholder routes for other sections */}
          <Route path="/dashboard/check-in-tables" element={<DashboardPage />} />
          <Route path="/dashboard/reservations" element={<DashboardPage />} />
          <Route path="/dashboard/orders-service" element={<DashboardPage />} />
          <Route path="/dashboard/menu-management" element={<DashboardPage />} />
          <Route path="/dashboard/promotions" element={<DashboardPage />} />
          <Route path="/dashboard/reports" element={<DashboardPage />} />
          <Route path="/dashboard/account-management" element={<DashboardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
