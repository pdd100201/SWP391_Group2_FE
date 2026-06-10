import { ChevronRight, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { dashboardNavItems } from './dashboardNavItems'

function Sidebar({ open, onClose }) {
  return (
    <aside className={`dashboard-layout__sidebar ${open ? 'dashboard-layout__sidebar--open' : ''}`}>
      <div className="dashboard-layout__brand">
        <div className="dashboard-layout__logo">GS</div>
        <div>
          <strong>Golden Spoon</strong>
          <span>Restaurant</span>
        </div>
        <button type="button" className="dashboard-layout__close" onClick={onClose} aria-label="Close sidebar">
          <X size={18} />
        </button>
      </div>

      <nav className="dashboard-layout__nav" aria-label="Dashboard navigation">
        {dashboardNavItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `dashboard-layout__nav-item ${isActive ? 'dashboard-layout__nav-item--active' : ''}`
              }
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              <ChevronRight size={16} className="dashboard-layout__nav-arrow" />
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
