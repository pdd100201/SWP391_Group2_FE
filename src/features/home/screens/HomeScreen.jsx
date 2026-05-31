import { useState } from 'react'
import { Building2, ChefHat, Users, UtensilsCrossed, Leaf, MapPin, Phone, Mail, Clock } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import './HomeScreen.css'

const aboutImages = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
]

const featuredCategories = [
  { title: 'Beef Dishes', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80' },
  { title: 'Chicken Dishes', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=500&q=80' },
  { title: 'Pork Dishes', image: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?auto=format&fit=crop&w=500&q=80' },
  { title: 'Fish Dishes', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=500&q=80' },
  { title: 'Other Dishes', image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=500&q=80' },
]

const featuredSlides = [featuredCategories.slice(0, 4), featuredCategories.slice(1, 5)]

const commitmentCards = [
  { title: 'Diverse Menu', subtitle: 'Golden Spoon Restaurant', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Special Flavor', subtitle: 'Golden Spoon Restaurant', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Exclusive Recipe', subtitle: 'Golden Spoon Restaurant', image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Quality Assurance', subtitle: 'Golden Spoon Restaurant', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80' },
]

const statistics = [
  { icon: Building2, value: '8+', label: 'Stores' },
  { icon: ChefHat, value: '200+', label: 'Staff' },
  { icon: Users, value: '5000+', label: 'Guests' },
  { icon: UtensilsCrossed, value: '50+', label: 'Dishes' },
]

const signatureDishes = [
  { name: 'Mustard Green Salad', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80' },
  { name: 'Vietnamese Fresh Rolls', image: 'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/2024_1_24_638416898024547200_huong-dan-lam-pho-cuon-1.png' },
  { name: 'Banana Blossom Pork Salad', image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=700&q=80' },
  { name: 'Pandan Chicken Rolls', image: 'https://spcdn.shortpixel.ai/spio/ret_img,q_cdnize,to_auto,s_webp:avif/summerandspice.com/wp-content/uploads/2025/03/DSC_5380-684x1024.jpg' },
  { name: 'Baked Chicken Breast with Lime Leaves', image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=700&q=80' },
]

const testimonials = [
  {
    name: 'Sophia Laurent',
    role: 'Local Guest',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    quote: 'Outstanding service, wonderfully attentive staff, and beautifully presented dishes. I will absolutely return!',
  },
  {
    name: 'James Whitfield',
    role: 'Food Blogger',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    quote: 'One of the finest dining experiences I have ever had. Exquisite flavors, elegant plating, and a warm atmosphere.',
  },
  {
    name: 'Elena Rossi',
    role: 'Regular Customer',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    quote: 'The interior design is truly magnificent — every corner feels special. An unforgettable restaurant experience!',
  },
]

const footerQuickLinks = ['Home', 'About Us', 'Featured Categories', 'Signature Dishes', 'Testimonials']

const footerServices = ['Dine In', 'Takeaway', 'Private Events', 'Catering', 'Table Reservations']

const footerContacts = [
  { icon: MapPin, text: '10 Hang Gai Street, Hoan Kiem, Hanoi' },
  { icon: Phone, text: '024 3266 9969' },
  { icon: Mail, text: 'info@goldenspoon.vn' },
  { icon: Clock, text: '24/7 Customer Support' },
]

function HomeScreen() {
  const [activeSlide, setActiveSlide] = useState(0)

  return (
    <div className="home-screen">
      <Navbar />

      <section className="home-screen__hero" id="home">
        <div className="home-screen__overlay" />
        <div className="home-screen__content">
          <h1>Golden Spoon Restaurant</h1>
          <p>Exquisite flavors served in a warm and elegant atmosphere.</p>
          <button type="button" className="home-screen__cta">
            Reserve Now
          </button>
        </div>
      </section>

      <section className="home-screen__about" id="about-us">
        <div className="home-screen__about-inner">
          <div className="home-screen__about-copy">
            <p className="home-screen__about-subtitle">About Us</p>
            <h2>Golden Spoon Restaurant</h2>
            <p className="home-screen__about-description">
              At Golden Spoon, we prioritize our customers above all else, dedicated to providing experiences of the highest quality. Each dish, crafted with our exclusive recipes, brings a fresh and unique flavor to our guests. We sincerely thank you for choosing us.
            </p>
            <a href="#more" className="home-screen__about-link">See More —</a>
          </div>

          <div className="home-screen__about-grid" aria-label="Food gallery">
            <img src={aboutImages[0]} alt="Plated gourmet dish" className="home-screen__about-image home-screen__about-image--top-left" />
            <img src={aboutImages[1]} alt="Elegant seafood dish" className="home-screen__about-image home-screen__about-image--top-right" />
            <img src={aboutImages[2]} alt="Fresh roasted fish dish" className="home-screen__about-image home-screen__about-image--bottom-left" />
            <img src={aboutImages[3]} alt="Signature meal with sauce" className="home-screen__about-image home-screen__about-image--bottom-right" />
          </div>
        </div>
      </section>

      <section className="home-screen__featured" id="featured-categories">
        <div className="home-screen__featured-inner">
          <div className="home-screen__section-title" aria-label="Featured Categories">
            <Leaf className="home-screen__section-icon" aria-hidden="true" />
            <h2>Featured Categories</h2>
            <Leaf className="home-screen__section-icon home-screen__section-icon--right" aria-hidden="true" />
          </div>

          <div className="home-screen__slider" aria-label="Featured categories carousel">
            <div className="home-screen__category-track" style={{ transform: `translateX(-${activeSlide * 50}%)` }}>
              {featuredSlides.map((slide, slideIndex) => (
                <div key={slideIndex} className="home-screen__category-grid">
                  {slide.map((category) => (
                    <article key={`${slideIndex}-${category.title}`} className="home-screen__category-card">
                      <img src={category.image} alt={category.title} className="home-screen__category-image" />
                      <h3>{category.title}</h3>
                      <p>Exquisitely prepared dishes with the most unique flavors.</p>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="slider-controls" aria-label="Featured category navigation">
            <div className="slider-controls__dots" aria-label="Slider pagination">
              {[0, 1].map((index) => (
                <button
                  key={index}
                  type="button"
                  className={`slider-controls__dot ${activeSlide === index ? 'slider-controls__dot--active' : ''}`}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-pressed={activeSlide === index}
                  onClick={() => setActiveSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-screen__signature" id="signature-dishes">
        <div className="home-screen__signature-inner">
          <div className="home-screen__section-title" aria-label="Signature Dishes">
            <Leaf className="home-screen__section-icon" aria-hidden="true" />
            <h2>Signature Dishes</h2>
            <Leaf className="home-screen__section-icon home-screen__section-icon--right" aria-hidden="true" />
          </div>

          <div className="home-screen__signature-grid" aria-label="Signature dishes list">
            {signatureDishes.map((dish) => (
              <article key={dish.name} className="home-screen__signature-card">
                <img src={dish.image} alt={dish.name} className="home-screen__signature-image" />
                <h3>{dish.name}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="commitment-section" id="commitments">
        <div className="commitment-section__inner">
          <div className="hover-cards-row" aria-label="Commitment cards">
            {commitmentCards.map((card) => (
              <article key={card.title} className="hover-card">
                <img src={card.image} alt={card.title} className="hover-card__image" />
                <div className="hover-card__overlay">
                  <p className="hover-card__brand">Golden Spoon Restaurant</p>
                  <h3>
                    {card.title}
                    <span>{card.subtitle}</span>
                  </h3>
                </div>
              </article>
            ))}
          </div>

          <div className="stats-row" aria-label="Restaurant statistics">
            {statistics.map(({ icon: Icon, value, label }, index) => (
              <article key={label} className={`stats-row__item ${index < statistics.length - 1 ? 'stats-row__item--border' : ''}`}>
                <Icon className="stats-row__icon" aria-hidden="true" />
                <div className="stats-row__text">
                  <strong className="stats-row__value">{value}</strong>
                  <span className="stats-row__label">{label}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-screen__testimonials" id="testimonials">
        <div className="home-screen__testimonials-inner">
          <p className="home-screen__eyebrow">Testimonials</p>
          <h2>What Our Guests Say</h2>
          <p className="home-screen__testimonials-subtitle">Guest satisfaction is the true measure of our excellence.</p>

          <div className="home-screen__testimonials-grid">
            {testimonials.map((testimonial) => (
              <article key={testimonial.name} className="home-screen__testimonial-card">
                <div className="home-screen__testimonial-stars" aria-hidden="true">★★★★★</div>
                <p className="home-screen__testimonial-quote">“{testimonial.quote}”</p>
                <div className="home-screen__testimonial-profile">
                  <img src={testimonial.avatar} alt={testimonial.name} className="home-screen__testimonial-avatar" />
                  <div>
                    <h3>{testimonial.name}</h3>
                    <span>{testimonial.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="home-screen__footer" id="footer">
        <div className="home-screen__footer-inner">
          <div className="home-screen__footer-brand">
            <h2>Golden Spoon Restaurant</h2>
            <p>
              Experience premium dining with warm hospitality, signature flavors, and a refined atmosphere made for memorable gatherings.
            </p>
            <div className="home-screen__footer-socials" aria-label="Social links">
              <a href="#" aria-label="Facebook">
                <img src="https://cdn.simpleicons.org/facebook/FFFFFF" alt="Facebook" />
              </a>
              <a href="#" aria-label="Instagram">
                <img src="https://cdn.simpleicons.org/instagram/FFFFFF" alt="Instagram" />
              </a>
              <a href="#" aria-label="X">
                <img src="https://cdn.simpleicons.org/x/FFFFFF" alt="X" />
              </a>
              <a href="#" aria-label="YouTube">
                <img src="https://cdn.simpleicons.org/youtube/FFFFFF" alt="YouTube" />
              </a>
            </div>
          </div>

          <div className="home-screen__footer-column">
            <h3>Quick Links</h3>
            <ul>
              {footerQuickLinks.map((link) => (
                <li key={link}><a href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}>{link}</a></li>
              ))}
            </ul>
          </div>

          <div className="home-screen__footer-column">
            <h3>Services</h3>
            <ul>
              {footerServices.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>

          <div className="home-screen__footer-column">
            <h3>Contact Info</h3>
            <ul className="home-screen__footer-contact-list">
              {footerContacts.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="home-screen__footer-bottom">
          <p>© 2026 Golden Spoon Restaurant. All rights reserved.</p>
          <div>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms &amp; Conditions</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomeScreen
