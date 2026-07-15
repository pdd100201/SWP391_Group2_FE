import { useMemo, useState } from 'react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import { createReservation } from '../api/reservationApi'
import './ReservationScreens.css'

const initialForm = {
  fullName: '',
  phone: '',
  email: '',
  reservationDate: '',
  reservationTime: '',
  numberOfGuests: 2,
  note: '',
}

function getStoredGuest() {
  return {
    fullName: sessionStorage.getItem('fullName') || localStorage.getItem('fullName') || '',
    email: sessionStorage.getItem('email') || localStorage.getItem('email') || '',
  }
}

function CreateReservationScreen() {
  const [formData, setFormData] = useState(() => {
    const storedGuest = getStoredGuest()
    return {
      ...initialForm,
      fullName: storedGuest.fullName,
      email: storedGuest.email,
    }
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const todayStr = useMemo(() => {
    const local = new Date()
    // format to YYYY-MM-DD
    const yyyy = local.getFullYear()
    const mm = String(local.getMonth() + 1).padStart(2, '0')
    const dd = String(local.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'numberOfGuests' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    // 1. Validate guest count limit
    if (formData.numberOfGuests < 1 || formData.numberOfGuests > 30) {
      setError('Number of guests must be between 1 and 30.')
      return
    }

    // 2. Validate reservation time is not in the past
    const selectedDateTime = new Date(`${formData.reservationDate}T${formData.reservationTime}`)
    const currentDateTime = new Date()
    if (isNaN(selectedDateTime.getTime()) || selectedDateTime < currentDateTime) {
      setError('Reservation time cannot be in the past.')
      return
    }
    // const selectedDateTime = new Date(`${formData.reservationDate}T${formData.reservationTime}`)
    // const currentDateTime = new Date()
    // const minimumReservationTime = new Date(currentDateTime.getTime() + 2 * 60 * 60 * 1000)
    //
    // if (isNaN(selectedDateTime.getTime()) || selectedDateTime < minimumReservationTime) {
    //   setError('Reservations must be made at least 2 hours in advance.')
    //   return
    // }
    setSubmitting(true)
    setMessage('')
    setError('')

    try {
      await createReservation(formData)
      setMessage('Reservation created successfully. Your request is pending confirmation.')
      setFormData((prev) => ({
        ...initialForm,
        fullName: prev.fullName,
        phone: prev.phone,
        email: prev.email,
      }))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create reservation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="reservation-page">
      <Navbar />

      <main className="reservation-page__main reservation-page__main--public">
        <section className="reservation-header-section">
          <span className="reservation-eyebrow">Online Reservation</span>
          <h1 className="reservation-title">Book A Table</h1>
          <p className="reservation-subtitle">
            Choose your preferred date, time, and party size. Golden Spoon will hold your request in pending status until our staff confirms it.
          </p>
        </section>

        <form className="reservation-form" onSubmit={handleSubmit}>
          {message && <div className="reservation-alert reservation-alert--success">{message}</div>}
          {error && <div className="reservation-alert reservation-alert--error">{error}</div>}

          <div className="reservation-form__grid">
            <div className="reservation-form-group">
              <label htmlFor="fullName" className="reservation-label">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="reservation-input"
              />
            </div>

            <div className="reservation-form-group">
              <label htmlFor="phone" className="reservation-label">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                required
                className="reservation-input"
              />
            </div>

            <div className="reservation-form-group">
              <label htmlFor="email" className="reservation-label">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                className="reservation-input"
              />
            </div>

            <div className="reservation-form-group">
              <label htmlFor="numberOfGuests" className="reservation-label">Number of Guests</label>
              <input
                id="numberOfGuests"
                name="numberOfGuests"
                type="number"
                min="1"
                max="30"
                placeholder="Number of guests"
                value={formData.numberOfGuests}
                onChange={handleChange}
                required
                className="reservation-input"
              />
            </div>

            <div className="reservation-form-group">
              <label htmlFor="reservationDate" className="reservation-label">Date</label>
              <input
                id="reservationDate"
                name="reservationDate"
                type="date"
                min={todayStr}
                value={formData.reservationDate}
                onChange={handleChange}
                required
                className="reservation-input reservation-input--date"
              />
            </div>

            <div className="reservation-form-group">
              <label htmlFor="reservationTime" className="reservation-label">Time</label>
              <input
                id="reservationTime"
                name="reservationTime"
                type="time"
                value={formData.reservationTime}
                onChange={handleChange}
                required
                className="reservation-input reservation-input--time"
              />
            </div>
          </div>

          <div className="reservation-form-group reservation-form-group--full">
            <label htmlFor="note" className="reservation-label">Note / Special Request</label>
            <textarea
              id="note"
              name="note"
              placeholder="Any special requests (allergies, high chairs, preferred seating area, etc.)"
              value={formData.note}
              onChange={handleChange}
              rows="4"
              className="reservation-textarea"
            />
          </div>

          <button type="submit" className="reservation-submit-button" disabled={submitting}>
            {submitting ? 'Processing...' : 'Create Reservation'}
          </button>
        </form>
      </main>

      <Footer />
    </div>
  )
}

export default CreateReservationScreen

