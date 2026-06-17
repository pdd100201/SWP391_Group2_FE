import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import { cancelReservation, getMyReservations } from '../api/reservationApi'
import './ReservationScreens.css'

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

const canCancelReservation = (status) => status === 'PENDING'

function ReservationHistoryScreen() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelingId, setCancelingId] = useState(null)
  const navigate = useNavigate()

  const loadReservations = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getMyReservations()
      setReservations(response.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load reservation history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReservations()
  }, [])

  const handleCancel = async (reservationId) => {
    setCancelingId(reservationId)
    setError('')
    try {
      const response = await cancelReservation(reservationId)
      setReservations((prev) => prev.map((item) => (
        item.reservationId === reservationId ? response.data : item
      )))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel reservation.')
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <div className="reservation-page">
      <Navbar />

      <main className="reservation-page__main">
        <header className="reservation-header-section" style={{ textAlign: 'left', marginBottom: '36px' }}>
          <span className="reservation-eyebrow">My Account</span>
          <h1 className="reservation-title" style={{ fontSize: '2.5rem' }}>Reservation History</h1>
          <p className="reservation-subtitle" style={{ margin: '0', maxWidth: 'none' }}>
            View and manage your table reservations below.
          </p>
        </header>

        {error && <div className="reservation-alert reservation-alert--error">{error}</div>}
        {loading ? (
          <div className="reservation-loading">Loading reservations...</div>
        ) : reservations.length === 0 ? (
          <div className="reservation-empty-state">
            <p>You don't have any reservations yet.</p>
            <button
              type="button"
              className="reservation-primary-button"
              onClick={() => navigate('/reservations/create')}
            >
              Book a Table
            </button>
          </div>
        ) : (
          <div className="reservation-list">
            {reservations.map((reservation) => {
              const canCancel = canCancelReservation(reservation.status)

              return (
                <article key={reservation.reservationId} className="reservation-card">
                  <div className="reservation-card__body">
                    <div className="reservation-card__header-row">
                      <h2 className="reservation-card__date-time">
                        {displayValue(reservation.reservationDate)} at {displayValue(reservation.reservationTime)}
                      </h2>
                      <span className={`reservation-status-badge reservation-status-badge--${reservation.status?.toLowerCase()}`}>
                        {displayValue(reservation.status)}
                      </span>
                    </div>

                    <div className="reservation-card__details">
                      <div className="reservation-card__detail-item">
                        <strong>Guests:</strong> {displayValue(reservation.numberOfGuests)} {reservation.numberOfGuests > 1 ? 'people' : 'person'}
                      </div>
                      <div className="reservation-card__detail-item">
                        <strong>Name:</strong> {displayValue(reservation.fullName)}
                      </div>
                      <div className="reservation-card__detail-item">
                        <strong>Contact:</strong> {displayValue(reservation.phone)} | {displayValue(reservation.email)}
                      </div>
                    </div>

                    {reservation.note && (
                      <div className="reservation-card__note-box">
                        <strong>Note / Special Request:</strong> "{reservation.note}"
                      </div>
                    )}
                  </div>

                  <div className="reservation-card__actions">
                    {canCancel ? (
                      <button
                        type="button"
                        className="reservation-cancel-btn"
                        disabled={cancelingId === reservation.reservationId}
                        onClick={() => handleCancel(reservation.reservationId)}
                      >
                        {cancelingId === reservation.reservationId ? 'Canceling...' : 'Cancel Reservation'}
                      </button>
                    ) : (
                      <span className="reservation-no-action">No action</span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default ReservationHistoryScreen

