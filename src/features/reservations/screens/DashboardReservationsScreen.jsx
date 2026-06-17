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
    <section className="dashboard-reservations-container">
      <header className="dashboard-reservations__header">
        <div className="dashboard-reservations__title-area">
          <h1 className="dashboard-title">Reservations Manager</h1>
          <p className="dashboard-subtitle">Monitor and manage all restaurant table reservations.</p>
        </div>

        <div className="dashboard-filter-area">
          <label htmlFor="statusFilter" className="dashboard-filter-label">Status Filter:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="dashboard-select"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </header>

      {error && <div className="reservation-alert reservation-alert--error">{error}</div>}

      {loading ? (
        <div className="dashboard-reservations__loading">Loading reservations...</div>
      ) : filteredReservations.length === 0 ? (
        <div className="dashboard-reservations__empty">No reservations found.</div>
      ) : (
        <div className="dashboard-table-card">
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Guest Information</th>
                  <th>Date &amp; Time</th>
                  <th>Guests</th>
                  <th>Special Request</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map((reservation) => (
                  <tr key={reservation.reservationId}>
                    <td className="guest-info-cell">
                      <span className="guest-name">{displayValue(reservation.fullName)}</span>
                      <span className="guest-contact">{displayValue(reservation.phone)}</span>
                      <span className="guest-contact">{displayValue(reservation.email)}</span>
                    </td>
                    <td className="date-time-cell">
                      <span className="date-val">{displayValue(reservation.reservationDate)}</span>
                      <span className="time-val">{displayValue(reservation.reservationTime)}</span>
                    </td>
                    <td className="guests-cell">
                      <span className="guests-count">{displayValue(reservation.numberOfGuests)}</span>
                    </td>
                    <td className="note-cell">
                      {reservation.note ? (
                        <div className="guest-note-text" title={reservation.note}>
                          {reservation.note}
                        </div>
                      ) : (
                        <span className="no-note">-</span>
                      )}
                    </td>
                    <td className="status-cell">
                      <span className={`reservation-status-badge reservation-status-badge--${reservation.status?.toLowerCase()}`}>
                        {displayValue(reservation.status)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {canConfirmReservation(reservation.status) ? (
                        <div className="dashboard-action-buttons">
                          <button
                            type="button"
                            className="dashboard-btn-confirm"
                            disabled={confirmingId === reservation.reservationId || cancelingId === reservation.reservationId}
                            onClick={() => handleConfirm(reservation.reservationId)}
                          >
                            {confirmingId === reservation.reservationId ? 'Confirming...' : 'Confirm'}
                          </button>

                          {canCancelReservation(reservation.status) && (
                            <button
                              type="button"
                              className="dashboard-btn-cancel"
                              disabled={cancelingId === reservation.reservationId || confirmingId === reservation.reservationId}
                              onClick={() => handleCancel(reservation.reservationId)}
                            >
                              {cancelingId === reservation.reservationId ? 'Canceling...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="dashboard-no-action">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

export default DashboardReservationsScreen

