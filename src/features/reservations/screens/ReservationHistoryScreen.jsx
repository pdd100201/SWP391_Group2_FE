import { useEffect, useState } from 'react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
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
        <header className="reservation-list-header">
          <div>
            <p className="reservation-eyebrow">Reservation History</p>
            <h1>Your reservations</h1>
          </div>
        </header>

        {error && <div className="reservation-alert reservation-alert--error">{error}</div>}
        {loading ? (
          <div className="reservation-empty">Loading reservations...</div>
        ) : reservations.length === 0 ? (
          <div className="reservation-empty">No reservations found.</div>
        ) : (
          <div className="reservation-list">
            {reservations.map((reservation) => {
              const canCancel = canCancelReservation(reservation.status)

              return (
                <article key={reservation.reservationId} className="reservation-card">
                  <div>
                    <div className="reservation-card__title-row">
                      <h2>{displayValue(reservation.reservationDate)} at {displayValue(reservation.reservationTime)}</h2>
                      <span className={`reservation-status reservation-status--${reservation.status?.toLowerCase()}`}>
                        {displayValue(reservation.status)}
                      </span>
                    </div>
                    <p>{displayValue(reservation.numberOfGuests)} guests - {displayValue(reservation.fullName)}</p>
                    <p>{displayValue(reservation.phone)} - {displayValue(reservation.email)}</p>
                    {reservation.note && <p className="reservation-card__note">{reservation.note}</p>}
                  </div>

                  {canCancel ? (
                    <button
                      type="button"
                      className="reservation-secondary-button"
                      disabled={cancelingId === reservation.reservationId}
                      onClick={() => handleCancel(reservation.reservationId)}
                    >
                      {cancelingId === reservation.reservationId ? 'Canceling...' : 'Cancel'}
                    </button>
                  ) : (
                    <span className="reservation-action-placeholder">No action</span>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default ReservationHistoryScreen
