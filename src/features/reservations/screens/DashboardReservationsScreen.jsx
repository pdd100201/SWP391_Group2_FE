import { useEffect, useMemo, useState } from 'react'
import { cancelReservation, confirmReservation, createWalkInReservation, getAllReservations } from '../api/reservationApi'
import './ReservationScreens.css'

const createInitialWalkInForm = () => {
  const now = new Date()
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
  const pad = (value) => String(value).padStart(2, '0')

  return {
    fullName: '',
    phone: '',
    email: '',
    reservationDate: `${nextHour.getFullYear()}-${pad(nextHour.getMonth() + 1)}-${pad(nextHour.getDate())}`,
    reservationTime: `${pad(nextHour.getHours())}:${pad(nextHour.getMinutes())}`,
    numberOfGuests: 2,
    note: '',
  }
}

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

const reservationDateTimeLabel = (reservation) => {
  const values = [displayValue(reservation?.reservationDate), displayValue(reservation?.reservationTime)]
    .filter((value) => value !== '-')
  return values.length ? values.join(' ') : '-'
}

const reservationTables = (reservation) => {
  const tableNames = Array.isArray(reservation?.tableNames) ? reservation.tableNames.filter(Boolean) : []
  const tableNumbers = Array.isArray(reservation?.tableNumbers) ? reservation.tableNumbers.filter(Boolean) : []
  const tableIds = Array.isArray(reservation?.tableIds) ? reservation.tableIds.filter(Boolean) : []

  if (tableNames.length) return tableNames
  if (tableNumbers.length) return tableNumbers
  if (reservation?.tableName) return [reservation.tableName]
  if (reservation?.tableNumber) return [reservation.tableNumber]
  if (tableIds.length) return tableIds.map((tableId) => `Table ${tableId}`)
  if (reservation?.tableId) return [`Table ${reservation.tableId}`]
  return []
}

const canCancelReservation = (status, role) => status === 'PENDING'
  || (status === 'ARRIVED' && ['ADMIN', 'MANAGER'].includes(role))
const canConfirmReservation = (status) => status === 'PENDING'
const reservationOrders = (reservation) => {
  if (Array.isArray(reservation.orders) && reservation.orders.length) return reservation.orders
  if (!reservation.orderId) return []
  return [{
    id: reservation.orderId,
    orderCode: reservation.orderCode,
    status: reservation.orderStatus,
    tableNumber: reservation.tableNumber,
  }]
}

function DashboardReservationsScreen() {
  const role = String(sessionStorage.getItem('role') || '').replace('ROLE_', '')
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelingId, setCancelingId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false)
  const [walkInForm, setWalkInForm] = useState(createInitialWalkInForm)
  const [creatingWalkIn, setCreatingWalkIn] = useState(false)
  const [walkInError, setWalkInError] = useState('')
  const [detailReservation, setDetailReservation] = useState(null)
  const userRole = sessionStorage.getItem('role')?.toUpperCase()
  const canCreateWalkIn = ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(userRole)
  
  // Sorting State
  const [sortBy, setSortBy] = useState('createdAt') // 'createdAt' or 'numberOfGuests'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' or 'desc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '', // 'confirm', 'cancel', or 'walk-in'
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

  // Pagination pagination logic
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
    // Initial data synchronization with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleWalkInChange = (event) => {
    const { name, value } = event.target
    setWalkInForm((prev) => ({
      ...prev,
      [name]: name === 'numberOfGuests' ? Number(value) : value,
    }))
  }

  const openWalkInModal = () => {
    setWalkInForm(createInitialWalkInForm())
    setWalkInError('')
    setIsWalkInModalOpen(true)
  }

  const closeWalkInModal = () => {
    if (creatingWalkIn) return
    setIsWalkInModalOpen(false)
    setWalkInError('')
  }

  const handleCreateWalkIn = async (event) => {
    event.preventDefault()
    setWalkInError('')
    setConfirmModal({
      isOpen: true,
      type: 'walk-in',
      reservationId: null,
      guestName: walkInForm.fullName,
    })
  }

  const confirmCreateWalkIn = async () => {
    setCreatingWalkIn(true)
    setWalkInError('')
    setError('')
    try {
      const payload = {
        ...walkInForm,
        numberOfGuests: Number(walkInForm.numberOfGuests),
      }
      const response = await createWalkInReservation(payload)
      setReservations((prev) => [response.data, ...prev])
      setStatusFilter('ALL')
      setCurrentPage(1)
      setIsWalkInModalOpen(false)
      setConfirmModal({ isOpen: false, type: '', reservationId: null, guestName: '' })
    } catch (err) {
      setConfirmModal({ isOpen: false, type: '', reservationId: null, guestName: '' })
      setWalkInError(err.response?.data?.message || 'Could not create walk-in reservation.')
    } finally {
      setCreatingWalkIn(false)
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
          {canCreateWalkIn && (
            <button
              type="button"
              className="dashboard-btn-primary"
              onClick={openWalkInModal}
            >
              + Walk-in Reservation
            </button>
          )}

          <div className="dashboard-filter-group" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="statusFilter" className="dashboard-filter-label">Status Filter:</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setCurrentPage(1)
                }}
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
                  setCurrentPage(1)
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
                    <th>Order</th>
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
                      <td className="status-cell">
                        {reservationOrders(reservation).length ? (
                          <div className="reservation-order-list">
                            {reservationOrders(reservation).map((order) => (
                              <span key={order.id} title={`Order status: ${order.status}`}>
                                <strong>{order.tableNumber || `Table ${order.tableId || '-'}`}</strong>
                                {order.orderCode || `#${order.id}`} - {order.status}
                              </span>
                            ))}
                          </div>
                        ) : <span className="dashboard-no-action">Not opened</span>}
                      </td>
                      <td className="actions-cell">
                        <div className="dashboard-action-buttons">
                          <button
                            type="button"
                            className="dashboard-btn-detail"
                            onClick={() => setDetailReservation(reservation)}
                          >
                            Detail
                          </button>

                          {canConfirmReservation(reservation.status) && (
                            <button
                              type="button"
                              className="dashboard-btn-confirm"
                              disabled={confirmingId === reservation.reservationId || cancelingId === reservation.reservationId}
                              onClick={() => triggerModal('confirm', reservation.reservationId, reservation.fullName)}
                            >
                              {confirmingId === reservation.reservationId ? 'Confirming...' : 'Confirm'}
                            </button>
                          )}

                          {canCancelReservation(reservation.status, role) && (
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

      {isWalkInModalOpen && (
        <div className="custom-confirm-modal-overlay">
          <div className="walk-in-modal">
            <div className="walk-in-modal__header">
              <div>
                <h2 className="walk-in-modal__title">Create Walk-in Reservation</h2>
                <p className="walk-in-modal__subtitle">Create a confirmed reservation for a guest without a customer account.</p>
              </div>
              <button
                type="button"
                className="walk-in-modal__close"
                onClick={closeWalkInModal}
                aria-label="Close walk-in reservation form"
              >
                x
              </button>
            </div>

            {walkInError && <div className="reservation-alert reservation-alert--error">{walkInError}</div>}

            <form className="walk-in-form" onSubmit={handleCreateWalkIn}>
              <label className="walk-in-form__field">
                <span>Guest name</span>
                <input
                  name="fullName"
                  value={walkInForm.fullName}
                  onChange={handleWalkInChange}
                  required
                  placeholder="Phan Huu Dong"
                />
              </label>

              <label className="walk-in-form__field">
                <span>Phone</span>
                <input
                  name="phone"
                  value={walkInForm.phone}
                  onChange={handleWalkInChange}
                  required
                  placeholder="0358685368"
                />
              </label>

              <label className="walk-in-form__field walk-in-form__field--full">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={walkInForm.email}
                  onChange={handleWalkInChange}
                  required
                  placeholder="guest@example.com"
                />
              </label>

              <label className="walk-in-form__field">
                <span>Date</span>
                <input
                  type="date"
                  name="reservationDate"
                  value={walkInForm.reservationDate}
                  onChange={handleWalkInChange}
                  required
                />
              </label>

              <label className="walk-in-form__field">
                <span>Time</span>
                <input
                  type="time"
                  name="reservationTime"
                  value={walkInForm.reservationTime}
                  onChange={handleWalkInChange}
                  required
                />
              </label>

              <label className="walk-in-form__field">
                <span>Guests</span>
                <input
                  type="number"
                  name="numberOfGuests"
                  min="1"
                  max="30"
                  value={walkInForm.numberOfGuests}
                  onChange={handleWalkInChange}
                  required
                />
              </label>

              <label className="walk-in-form__field walk-in-form__field--full">
                <span>Note</span>
                <textarea
                  name="note"
                  value={walkInForm.note}
                  onChange={handleWalkInChange}
                  rows="3"
                  placeholder="Special request or internal note"
                />
              </label>

              <div className="walk-in-form__actions">
                <button
                  type="button"
                  className="custom-confirm-modal__btn custom-confirm-modal__btn--cancel"
                  onClick={closeWalkInModal}
                  disabled={creatingWalkIn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="custom-confirm-modal__btn custom-confirm-modal__btn--confirm"
                  disabled={creatingWalkIn}
                >
                  {creatingWalkIn ? 'Creating...' : 'Create Confirmed Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailReservation && (
        <div className="custom-confirm-modal-overlay" onClick={() => setDetailReservation(null)}>
          <div className="reservation-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="reservation-detail-modal__header">
              <div>
                <h2 className="reservation-detail-modal__title">Reservation #{detailReservation.reservationId}</h2>
                <p className="reservation-detail-modal__subtitle">{reservationDateTimeLabel(detailReservation)}</p>
              </div>
              <span className={`reservation-status-badge reservation-status-badge--${detailReservation.status?.toLowerCase()}`}>
                {displayValue(detailReservation.status)}
              </span>
            </div>

            <div className="reservation-detail-grid">
              <div className="reservation-detail-field">
                <span>Guest name</span>
                <strong>{displayValue(detailReservation.fullName)}</strong>
              </div>
              <div className="reservation-detail-field">
                <span>Phone</span>
                <strong>{displayValue(detailReservation.phone)}</strong>
              </div>
              <div className="reservation-detail-field">
                <span>Email</span>
                <strong>{displayValue(detailReservation.email)}</strong>
              </div>
              <div className="reservation-detail-field">
                <span>Guests</span>
                <strong>{displayValue(detailReservation.numberOfGuests)}</strong>
              </div>
              <div className="reservation-detail-field reservation-detail-field--full">
                <span>Assigned tables</span>
                <strong>{reservationTables(detailReservation).join(', ') || '-'}</strong>
              </div>
              <div className="reservation-detail-field reservation-detail-field--full">
                <span>Special request</span>
                <strong>{displayValue(detailReservation.note)}</strong>
              </div>
            </div>

            <div className="reservation-detail-section">
              <h3>Orders</h3>
              {reservationOrders(detailReservation).length ? (
                <div className="reservation-detail-orders">
                  {reservationOrders(detailReservation).map((order) => (
                    <div className="reservation-detail-order" key={order.id || order.orderCode}>
                      <strong>{order.orderCode || `Order #${order.id}`}</strong>
                      <span>
                        {order.tableNumber || order.tableName || `Table ${order.tableId || '-'}`} - {displayValue(order.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="reservation-detail-empty">Not opened</p>
              )}
            </div>

            <div className="reservation-detail-modal__actions">
              <button
                type="button"
                className="custom-confirm-modal__btn custom-confirm-modal__btn--confirm"
                onClick={() => setDetailReservation(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="custom-confirm-modal-overlay">
          <div className="custom-confirm-modal">
            <h2 className="custom-confirm-modal__title">
              {confirmModal.type === 'walk-in'
                ? 'Create Walk-in Reservation'
                : confirmModal.type === 'confirm' ? 'Confirm Reservation' : 'Cancel Reservation'}
            </h2>
            {confirmModal.type === 'walk-in' ? (
              <div className="custom-confirm-modal__message">
                <p>
                  Create a confirmed reservation for <strong>{walkInForm.fullName}</strong>?
                </p>
                <div className="walk-in-confirm-summary">
                  <span>Phone: <strong>{walkInForm.phone}</strong></span>
                  <span>Email: <strong>{walkInForm.email}</strong></span>
                  <span>Date &amp; time: <strong>{walkInForm.reservationDate} {walkInForm.reservationTime}</strong></span>
                  <span>Guests: <strong>{walkInForm.numberOfGuests}</strong></span>
                </div>
                <p>This reservation will be created as CONFIRMED and can appear in the check-in queue.</p>
              </div>
            ) : (
              <p className="custom-confirm-modal__message">
                Are you sure you want to {confirmModal.type === 'confirm' ? 'CONFIRM' : 'CANCEL'} the table reservation for <strong>{confirmModal.guestName}</strong>? This action cannot be undone.
              </p>
            )}
            <div className="custom-confirm-modal__actions">
              <button
                type="button"
                className="custom-confirm-modal__btn custom-confirm-modal__btn--cancel"
                onClick={() => setConfirmModal({ isOpen: false, type: '', reservationId: null, guestName: '' })}
                disabled={creatingWalkIn}
              >
                No, Go Back
              </button>
              <button
                type="button"
                className={`custom-confirm-modal__btn ${confirmModal.type === 'cancel' ? 'custom-confirm-modal__btn--danger' : 'custom-confirm-modal__btn--confirm'}`}
                disabled={creatingWalkIn}
                onClick={() => {
                  const { type, reservationId } = confirmModal
                  if (type === 'walk-in') {
                    confirmCreateWalkIn()
                  } else if (type === 'confirm') {
                    setConfirmModal({ isOpen: false, type: '', reservationId: null, guestName: '' })
                    handleConfirm(reservationId)
                  } else {
                    setConfirmModal({ isOpen: false, type: '', reservationId: null, guestName: '' })
                    handleCancel(reservationId)
                  }
                }}
              >
                {confirmModal.type === 'walk-in'
                  ? (creatingWalkIn ? 'Creating...' : 'Yes, Create')
                  : `Yes, ${confirmModal.type === 'confirm' ? 'Confirm' : 'Cancel'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default DashboardReservationsScreen
