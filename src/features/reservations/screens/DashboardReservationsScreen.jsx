import { useEffect, useMemo, useState } from 'react'
import { cancelReservation, confirmReservation, getAllReservations } from '../api/reservationApi'
import './ReservationScreens.css'

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

const canCancelReservation = (status) => status === 'PENDING'
const canConfirmReservation = (status) => status === 'PENDING'

function DashboardReservationsScreen() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelingId, setCancelingId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filteredReservations = useMemo(() => {
    if (statusFilter === 'ALL') return reservations
    return reservations.filter((reservation) => reservation.status === statusFilter)
  }, [reservations, statusFilter])

  const loadReservations = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getAllReservations()
      setReservations(response.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load reservations.')
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

  const handleConfirm = async (reservationId) => {
    setConfirmingId(reservationId)
    setError('')
    try {
      const response = await confirmReservation(reservationId)
      setReservations((prev) => prev.map((item) => (
        item.reservationId === reservationId ? response.data : item
      )))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not confirm reservation.')
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <section className="dashboard-reservations">
      <header className="reservation-list-header">
        <div>
          <p className="reservation-eyebrow">Reservations</p>
          <h1>All reservations</h1>
        </div>

        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </header>

      {error && <div className="reservation-alert reservation-alert--error">{error}</div>}
      {loading ? (
        <div className="reservation-empty">Loading reservations...</div>
      ) : filteredReservations.length === 0 ? (
        <div className="reservation-empty">No reservations found.</div>
      ) : (
        <div className="reservation-table-wrap">
          <table className="reservation-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Contact</th>
                <th>Date</th>
                <th>Time</th>
                <th>Guests</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map((reservation) => (
                <tr key={reservation.reservationId}>
                  <td>
                    <strong>{displayValue(reservation.fullName)}</strong>
                    <span>{displayValue(reservation.note)}</span>
                  </td>
                  <td>
                    <span>{displayValue(reservation.phone)}</span>
                    <span>{displayValue(reservation.email)}</span>
                  </td>
                  <td>{displayValue(reservation.reservationDate)}</td>
                  <td>{displayValue(reservation.reservationTime)}</td>
                  <td>{displayValue(reservation.numberOfGuests)}</td>
                  <td>
                    <span className={`reservation-status reservation-status--${reservation.status?.toLowerCase()}`}>
                      {displayValue(reservation.status)}
                    </span>
                  </td>
                  <td>
                    {canConfirmReservation(reservation.status) ? (
                      <div className="reservation-action-group">
                        <button
                          type="button"
                          className="reservation-confirm-button"
                          disabled={confirmingId === reservation.reservationId || cancelingId === reservation.reservationId}
                          onClick={() => handleConfirm(reservation.reservationId)}
                        >
                          {confirmingId === reservation.reservationId ? 'Confirming...' : 'Confirm'}
                        </button>

                        {canCancelReservation(reservation.status) && (
                          <button
                            type="button"
                            className="reservation-secondary-button"
                            disabled={cancelingId === reservation.reservationId || confirmingId === reservation.reservationId}
                            onClick={() => handleCancel(reservation.reservationId)}
                          >
                            {cancelingId === reservation.reservationId ? 'Canceling...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="reservation-action-placeholder">No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default DashboardReservationsScreen
