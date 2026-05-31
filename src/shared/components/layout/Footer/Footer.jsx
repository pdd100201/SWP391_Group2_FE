import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import './Footer.css'

const footerQuickLinks = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'Featured Categories', to: '/featured' },
  { label: 'Signature Dishes', to: '/signature' },
  { label: 'Testimonials', to: '/testimonials' },
]
const footerServices = ['Dine In', 'Takeaway', 'Private Events', 'Catering', 'Table Reservations']
const footerContacts = [
  { icon: MapPin, text: '10 Hang Gai Street, Hoan Kiem, Hanoi' },
  { icon: Phone, text: '024 3266 9969' },
  { icon: Mail, text: 'info@goldenspoon.vn' },
  { icon: Clock, text: '24/7 Customer Support' },
]

function Footer() {
  return (
    <footer className="site-footer" id="footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <h2>Golden Spoon Restaurant</h2>
          <p>
            Experience premium dining with warm hospitality, signature flavors, and a refined atmosphere made for memorable gatherings.
          </p>
          <div className="site-footer__socials" aria-label="Social links">
            <a href="#" aria-label="Facebook"><span>Fb</span></a>
            <a href="#" aria-label="Instagram"><span>Ig</span></a>
            <a href="#" aria-label="X"><span>X</span></a>
            <a href="#" aria-label="YouTube"><span>Yt</span></a>
          </div>
        </div>

        <div className="site-footer__column">
          <h3>Quick Links</h3>
          <ul>
            {footerQuickLinks.map((link) => (
              <li key={link.label}><Link to={link.to}>{link.label}</Link></li>
            ))}
          </ul>
        </div>

        <div className="site-footer__column">
          <h3>Services</h3>
          <ul>
            {footerServices.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </div>

        <div className="site-footer__column">
          <h3>Contact Info</h3>
          <ul className="site-footer__contact-list">
            {footerContacts.map(({ icon: Icon, text }) => (
              <li key={text}>
                <Icon size={16} aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p>© 2026 Golden Spoon Restaurant. All rights reserved.</p>
        <div>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms &amp; Conditions</a>
          <a href="#">Cookie Policy</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
