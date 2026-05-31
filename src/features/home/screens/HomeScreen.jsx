import { FaLeaf } from 'react-icons/fa'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import './HomeScreen.css'

const aboutImages = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
]

const featuredCategories = [
  {
    title: 'Beef Dishes',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80',
  },
  {
    title: 'Chicken Dishes',
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=500&q=80',
  },
  {
    title: 'Pork Dishes',
    image: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?auto=format&fit=crop&w=500&q=80',
  },
  {
    title: 'Fish Dishes',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=500&q=80',
  },
]

function HomeScreen() {
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
              At Golden Spoon, we prioritize our customers above all else, dedicated to providing experiences of the
              highest quality. Each dish, crafted with our exclusive recipes, brings a fresh and unique flavor to our
              guests. We sincerely thank you for choosing us.
            </p>
            <a href="#more" className="home-screen__about-link">
              See More —
            </a>
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
            <FaLeaf className="home-screen__section-icon" aria-hidden="true" />
            <h2>Featured Categories</h2>
            <FaLeaf className="home-screen__section-icon home-screen__section-icon--right" aria-hidden="true" />
          </div>

          <div className="home-screen__category-grid">
            {featuredCategories.map((category) => (
              <article key={category.title} className="home-screen__category-card">
                <img src={category.image} alt={category.title} className="home-screen__category-image" />
                <h3>{category.title}</h3>
                <p>Exquisitely prepared dishes with the most unique flavors.</p>
              </article>
            ))}
          </div>

          <div className="home-screen__pagination" aria-label="Slider pagination">
            <span className="home-screen__pagination-dot home-screen__pagination-dot--active" />
            <span className="home-screen__pagination-dot" />
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomeScreen
