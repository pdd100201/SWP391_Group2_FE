import { useMemo, useState } from 'react'
import { Bell, LogOut, Menu, Search, UserCircle2, X } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import './MainLayout.css'

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const breadcrumb = useMemo(() => {
    const path = location.pathname.replace('/dashboard', '')
    if (!path || path === '/') return ['Dashboard']
    return ['Dashboard', ...path.split('/').filter(Boolean).map((segment) => segment.replace(/-/g, ' '))]
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('fullName')
    localStorage.removeItem('email')
    window.dispatchEvent(new Event('auth-changed'))
    navigate('/login')
  }

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className={`dashboard-layout__backdrop ${sidebarOpen ? 'dashboard-layout__backdrop--show' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="dashboard-layout__content">
        <header className="dashboard-layout__header">
          <div className="dashboard-layout__header-left">
            <button
              type="button"
              className="dashboard-layout__menu-button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <nav className="dashboard-layout__breadcrumbs" aria-label="Breadcrumbs">
              {breadcrumb.map((item, index) => (
                <span key={`${item}-${index}`} className="dashboard-layout__breadcrumb-item">
                  {index > 0 && <span className="dashboard-layout__breadcrumb-separator">/</span>}
                  <span className={index === breadcrumb.length - 1 ? 'dashboard-layout__breadcrumb-current' : ''}>
                    {item}
                  </span>
                </span>
              ))}
            </nav>
          </div>

          <div className="dashboard-layout__header-right">
            <button type="button" className="dashboard-layout__icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>

            <div className="dashboard-layout__profile">
              <div className="dashboard-layout__profile-avatar" aria-hidden="true">
                <UserCircle2 size={20} />
              </div>
              <div className="dashboard-layout__profile-meta">
                <strong>{localStorage.getItem('fullName') || 'Admin User'}</strong>
                <span>{localStorage.getItem('role') || 'Administrator'}</span>
              </div>
            </div>

            <button type="button" className="dashboard-layout__logout-button" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="dashboard-layout__main">
          <div className="dashboard-layout__searchbar">
            <Search size={18} />
            <input type="search" placeholder="Search dashboard" aria-label="Search dashboard" />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
