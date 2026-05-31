import { useState } from 'react'
import { FaUserCircle } from 'react-icons/fa'
import './Navbar.css'

const navItems = ['Home', 'Reservations', 'About Us', 'Contact']
const userMenuItems = ['Login', 'Register']

function Navbar() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

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
          <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="navbar__link">
            {item}
          </a>
        ))}
      </nav>

      <div className="navbar__actions">
        <div
          className="navbar__user"
          onMouseEnter={() => setIsUserMenuOpen(true)}
          onMouseLeave={() => setIsUserMenuOpen(false)}
        >
          <button
            type="button"
            className="navbar__icon-button"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            onClick={() => setIsUserMenuOpen((open) => !open)}
          >
            <FaUserCircle />
          </button>

          {isUserMenuOpen && (
            <div className="navbar__dropdown" role="menu" aria-label="User menu">
              {userMenuItems.map((item) => (
                <a key={item} href={`/${item.toLowerCase()}`} role="menuitem" className="navbar__dropdown-item">
                  {item}
                </a>
              ))}
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
