import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import './HomeScreen.css'

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
            Book a Table Now
          </button>
        </div>
      </section>
    </div>
  )
}

export default HomeScreen
