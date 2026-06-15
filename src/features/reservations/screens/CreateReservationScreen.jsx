import { useMemo, useState } from 'react'
import { CalendarDays, Clock, Mail, Phone, Users } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
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
  const storedGuest = useMemo(getStoredGuest, [])
  const [formData, setFormData] = useState({
    ...initialForm,
    fullName: storedGuest.fullName,
    email: storedGuest.email,
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'numberOfGuests' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
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
        <section className="reservation-hero">
          <div>
            <p className="reservation-eyebrow">Online Reservation</p>
            <h1>Reserve your table</h1>
            <p>Choose a date, time, and party size. Golden Spoon will keep your request in pending status until staff confirms it.</p>
          </div>
        </section>

        <form className="reservation-form" onSubmit={handleSubmit}>
          {message && <div className="reservation-alert reservation-alert--success">{message}</div>}
          {error && <div className="reservation-alert reservation-alert--error">{error}</div>}

          <div className="reservation-form__grid">
            <label className="reservation-field">
              <span>Full name</span>
              <input name="fullName" value={formData.fullName} onChange={handleChange} required />
            </label>

            <label className="reservation-field">
              <span>Phone</span>
              <div className="reservation-field__control">
                <Phone size={18} />
                <input name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
            </label>

            <label className="reservation-field">
              <span>Email</span>
              <div className="reservation-field__control">
                <Mail size={18} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
            </label>

            <label className="reservation-field">
              <span>Date</span>
              <div className="reservation-field__control">
                <CalendarDays size={18} />
                <input type="date" name="reservationDate" value={formData.reservationDate} onChange={handleChange} required />
              </div>
            </label>

            <label className="reservation-field">
              <span>Time</span>
              <div className="reservation-field__control">
                <Clock size={18} />
                <input type="time" name="reservationTime" value={formData.reservationTime} onChange={handleChange} required />
              </div>
            </label>

            <label className="reservation-field">
              <span>Guests</span>
              <div className="reservation-field__control">
                <Users size={18} />
                <input min="1" type="number" name="numberOfGuests" value={formData.numberOfGuests} onChange={handleChange} required />
              </div>
            </label>
          </div>

          <label className="reservation-field">
            <span>Note</span>
            <textarea name="note" value={formData.note} onChange={handleChange} rows="4" />
          </label>

          <button type="submit" className="reservation-primary-button" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create reservation'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default CreateReservationScreen
