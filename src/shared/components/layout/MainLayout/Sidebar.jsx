import { useState } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { dashboardNavItems } from './dashboardNavItems'

function Sidebar({ open, onClose }) {
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState({})

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const isChildActive = (children) => {
    return children?.some((child) => location.pathname === child.to)
  }

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

          /* ── Item with children (dropdown) ── */
          if (item.children) {
            const childActive = isChildActive(item.children)
            const isOpen = openMenus[item.label] || childActive

            return (
              <div key={item.label} className="dashboard-layout__nav-group">
                <button
                  type="button"
                  className={`dashboard-layout__nav-item dashboard-layout__nav-parent ${childActive ? 'dashboard-layout__nav-item--active' : ''}`}
                  onClick={() => toggleMenu(item.label)}
                  aria-expanded={isOpen}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  <ChevronDown
                    size={16}
                    className={`dashboard-layout__nav-chevron ${isOpen ? 'dashboard-layout__nav-chevron--open' : ''}`}
                  />
                </button>

                <div className={`dashboard-layout__nav-submenu ${isOpen ? 'dashboard-layout__nav-submenu--open' : ''}`}>
                  {item.children.map((child) => (
                    <NavLink
                      key={child.label}
                      to={child.to}
                      className={({ isActive }) =>
                        `dashboard-layout__nav-subitem ${isActive ? 'dashboard-layout__nav-subitem--active' : ''}`
                      }
                      onClick={onClose}
                    >
                      <span className="dashboard-layout__nav-dot" />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          }

          /* ── Regular flat item ── */
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
