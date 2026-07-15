import { useEffect, useMemo, useState } from 'react'
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
  
  // Sorting State
  const [sortBy, setSortBy] = useState('createdAt') // 'createdAt' or 'numberOfGuests'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' or 'desc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    reservationId: null,
    dateTimeStr: '',
  })

  const navigate = useNavigate()

  // Sorting logic
  const sortedReservations = useMemo(() => {
    const list = [...reservations]
    list.sort((a, b) => {
      let valA = a[sortBy]
      let valB = b[sortBy]

      if (sortBy === 'numberOfGuests') {
        const numA = Number(valA) || 0
        const numB = Number(valB) || 0
        return sortOrder === 'asc' ? numA - numB : numB - numA
      }

      // Default sorting by creation date/time (or reservationDate + reservationTime if createdAt is missing)
      const dateA = new Date(valA || `${a.reservationDate}T${a.reservationTime}`)
      const dateB = new Date(valB || `${b.reservationDate}T${b.reservationTime}`)
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })
    return list
  }, [reservations, sortBy, sortOrder])

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
      const response = await getMyReservations()
      setReservations(response.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load reservation history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadReservations, 0)
    return () => window.clearTimeout(timer)
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

  const triggerCancelModal = (reservationId, date, time) => {
    setConfirmModal({
      isOpen: true,
      reservationId,
      dateTimeStr: `${date} at ${time}`,
    })
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
          <>
            {/* Controls panel for Sorting */}
            <div className="reservation-controls-bar">
              <div className="reservation-control-group">
                <label htmlFor="sortBy" className="reservation-control-label">Sort By:</label>
                <select
                  id="sortBy"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(event) => {
                    const [field, order] = event.target.value.split('-')
                    setSortBy(field)
                    setSortOrder(order)
                    setCurrentPage(1)
                  }}
                  className="reservation-control-select"
                >
                  <option value="createdAt-desc">Date Added (Newest)</option>
                  <option value="createdAt-asc">Date Added (Oldest)</option>
                  <option value="numberOfGuests-desc">Guests (High to Low)</option>
                  <option value="numberOfGuests-asc">Guests (Low to High)</option>
                </select>
              </div>
            </div>

            {/* List of cards */}
            <div className="reservation-list">
              {paginatedReservations.map((reservation) => {
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
                          onClick={() => triggerCancelModal(reservation.reservationId, reservation.reservationDate, reservation.reservationTime)}
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
      </main>

      <Footer />

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="custom-confirm-modal-overlay">
          <div className="custom-confirm-modal">
            <h2 className="custom-confirm-modal__title">Cancel Reservation</h2>
            <p className="custom-confirm-modal__message">
              Are you sure you want to cancel your table reservation on <strong>{confirmModal.dateTimeStr}</strong>? This action cannot be undone.
            </p>
            <div className="custom-confirm-modal__actions">
              <button
                type="button"
                className="custom-confirm-modal__btn custom-confirm-modal__btn--cancel"
                onClick={() => setConfirmModal({ isOpen: false, reservationId: null, dateTimeStr: '' })}
              >
                No, Keep It
              </button>
              <button
                type="button"
                className="custom-confirm-modal__btn custom-confirm-modal__btn--danger"
                onClick={() => {
                  const { reservationId } = confirmModal
                  setConfirmModal({ isOpen: false, reservationId: null, dateTimeStr: '' })
                  handleCancel(reservationId)
                }}
              >
                Yes, Cancel Reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReservationHistoryScreen
