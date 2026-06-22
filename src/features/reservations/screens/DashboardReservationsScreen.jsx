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

  // Sorting State
  const [sortBy, setSortBy] = useState('createdAt') // 'createdAt' or 'numberOfGuests'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' or 'desc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '', // 'confirm' or 'cancel'
    reservationId: null,
    guestName: '',
  })

  const filteredReservations = useMemo(() => {
    if (statusFilter === 'ALL') return reservations
    return reservations.filter((reservation) => reservation.status === statusFilter)
  }, [reservations, statusFilter])

  // Sorting logic
  const sortedReservations = useMemo(() => {
    const list = [...filteredReservations]
    list.sort((a, b) => {
      let valA = a[sortBy]
      let valB = b[sortBy]

      if (sortBy === 'numberOfGuests') {
        const numA = Number(valA) || 0
        const numB = Number(valB) || 0
        return sortOrder === 'asc' ? numA - numB : numB - numA
      }

      // Default sorting by creation time / reservation date time
      const dateA = new Date(valA || `${a.reservationDate}T${a.reservationTime}`)
      const dateB = new Date(valB || `${b.reservationDate}T${b.reservationTime}`)
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })
    return list
  }, [filteredReservations, sortBy, sortOrder])

  // Reset page when filter or sorting changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, sortBy, sortOrder])

  // Pagination logic
  const totalPages = Math.ceil(sortedReservations.length / itemsPerPage)
  const paginatedReservations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedReservations.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedReservations, currentPage])

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

  const triggerModal = (type, reservationId, guestName) => {
    setConfirmModal({
      isOpen: true,
      type,
      reservationId,
      guestName,
    })
  }

  return (
    <section className="dashboard-reservations-container">
      <header className="dashboard-reservations__header">
        <div className="dashboard-reservations__title-area">
          <h1 className="dashboard-title">Reservations Manager</h1>
          <p className="dashboard-subtitle">Monitor and manage all restaurant table reservations.</p>
        </div>

        <div className="dashboard-filter-area">
          <div className="dashboard-filter-group" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="statusFilter" className="dashboard-filter-label">Status Filter:</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="dashboard-select"
                style={{ minWidth: '130px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="sortBy" className="dashboard-filter-label">Sort By:</label>
              <select
                id="sortBy"
                value={`${sortBy}-${sortOrder}`}
                onChange={(event) => {
                  const [field, order] = event.target.value.split('-')
                  setSortBy(field)
                  setSortOrder(order)
                }}
                className="dashboard-select"
                style={{ minWidth: '180px' }}
              >
                <option value="createdAt-desc">Date Added (Newest)</option>
                <option value="createdAt-asc">Date Added (Oldest)</option>
                <option value="numberOfGuests-desc">Guests (High to Low)</option>
                <option value="numberOfGuests-asc">Guests (Low to High)</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {error && <div className="reservation-alert reservation-alert--error">{error}</div>}

      {loading ? (
        <div className="dashboard-reservations__loading">Loading reservations...</div>
      ) : paginatedReservations.length === 0 ? (
        <div className="dashboard-reservations__empty">No reservations found.</div>
      ) : (
        <>
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
                  {paginatedReservations.map((reservation) => (
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
                              onClick={() => triggerModal('confirm', reservation.reservationId, reservation.fullName)}
                            >
                              {confirmingId === reservation.reservationId ? 'Confirming...' : 'Confirm'}
                            </button>

                            {canCancelReservation(reservation.status) && (
                              <button
                                type="button"
                                className="dashboard-btn-cancel"
                                disabled={cancelingId === reservation.reservationId || confirmingId === reservation.reservationId}
                                onClick={() => triggerModal('cancel', reservation.reservationId, reservation.fullName)}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                &laquo; Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`pagination-btn ${currentPage === page ? 'pagination-btn--active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Next &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="custom-confirm-modal-overlay">
          <div className="custom-confirm-modal">
            <h2 className="custom-confirm-modal__title">
              {confirmModal.type === 'confirm' ? 'Confirm Reservation' : 'Cancel Reservation'}
            </h2>
            <p className="custom-confirm-modal__message">
              Are you sure you want to {confirmModal.type === 'confirm' ? 'CONFIRM' : 'CANCEL'} the table reservation for <strong>{confirmModal.guestName}</strong>? This action cannot be undone.
            </p>
            <div className="custom-confirm-modal__actions">
              <button
                type="button"
                className="custom-confirm-modal__btn custom-confirm-modal__btn--cancel"
                onClick={() => setConfirmModal({ isOpen: false, type: '', reservationId: null, guestName: '' })}
              >
                No, Go Back
              </button>
              <button
                type="button"
                className={`custom-confirm-modal__btn ${confirmModal.type === 'confirm' ? 'custom-confirm-modal__btn--confirm' : 'custom-confirm-modal__btn--danger'}`}
                onClick={() => {
                  const { type, reservationId } = confirmModal
                  setConfirmModal({ isOpen: false, type: '', reservationId: null, guestName: '' })
                  if (type === 'confirm') {
                    handleConfirm(reservationId)
                  } else {
                    handleCancel(reservationId)
                  }
                }}
              >
                Yes, {confirmModal.type === 'confirm' ? 'Confirm' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default DashboardReservationsScreen
