import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUserCircle } from 'react-icons/fa'
import './Navbar.css'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Reservations', to: '/reservations' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

function Navbar() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const syncUser = () => {
      const fullName = sessionStorage.getItem('fullName')
      const role = sessionStorage.getItem('role')
      const token = sessionStorage.getItem('token')
      const email = sessionStorage.getItem('email')

      if (token && fullName) {
        setUser({ fullName, role, email })
      } else {
        setUser(null)
      }
    }

    syncUser()
    window.addEventListener('storage', syncUser)
    window.addEventListener('auth-changed', syncUser)

    return () => {
      window.removeEventListener('storage', syncUser)
      window.removeEventListener('auth-changed', syncUser)
    }
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('fullName')
    sessionStorage.removeItem('email')
    setUser(null)
    setIsUserMenuOpen(false)
    window.dispatchEvent(new Event('auth-changed'))
    navigate('/')
  }

  const handleProfileClick = () => {
    setIsUserMenuOpen(false)
    navigate('/profile')
  }

  const handleMenuClick = (target) => {
    setIsUserMenuOpen(false)
    navigate(target)
  }

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <div className="navbar__logo" aria-hidden="true">
          GS
        </div>
        <div className="navbar__brand-text">
          <span>Golden Spoon</span>
          <small>Restaurant</small>
        </div>
      </div>

      <nav className="navbar__nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link key={item.label} to={item.to} className="navbar__link">
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="navbar__actions">
        <div className="navbar__user">
          <button
            type="button"
            className="navbar__user-trigger"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            onClick={() => setIsUserMenuOpen((open) => !open)}
          >
            <FaUserCircle className="navbar__user-icon" />
            <span className="navbar__user-name">
              {user?.fullName || 'Account'}
            </span>
          </button>

          {isUserMenuOpen && (
            <div className="navbar__dropdown" role="menu" aria-label="User menu">
              {user ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="navbar__dropdown-item navbar__dropdown-item--button"
                    onClick={handleProfileClick}
                  >
                    View Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="navbar__dropdown-item navbar__dropdown-item--button"
                    onClick={() => handleMenuClick('/reservation-history')}
                  >
                    Reservation History
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="navbar__dropdown-item navbar__dropdown-item--button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="navbar__dropdown-item navbar__dropdown-item--button"
                    onClick={() => handleMenuClick('/login')}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="navbar__dropdown-item navbar__dropdown-item--button"
                    onClick={() => handleMenuClick('/register')}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <button type="button" className="navbar__book-button">
          Make a Reservations
        </button>
      </div>
    </header>
  )
}

export default Navbar
