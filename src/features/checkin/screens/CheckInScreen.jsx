import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock, Search, UsersRound, CheckCircle2, HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { checkinApi } from '../api/checkinApi'
import { getAllReservations } from "../../reservations/api/reservationApi.js"
import { tableApi } from "../../tables/api/tableApi.js"
import './CheckInScreen.css'

const todayInputValue = () => {
  const now = new Date()
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 10)
}

const ACTIVE_RESERVATION_STATUSES = new Set(['PENDING', 'CONFIRMED'])

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

const normalizeReservation = (reservation) => ({
  reservationId: reservation.reservationId ?? reservation.id,
  fullName: reservation.fullName ?? reservation.guestName ?? reservation.name ?? 'Guest',
  phone: reservation.phone ?? reservation.phoneNumber ?? '',
  reservationDate: reservation.reservationDate ?? reservation.date ?? '',
  reservationTime: reservation.reservationTime ?? reservation.time ?? '',
  numberOfGuests: reservation.numberOfGuests ?? reservation.guestCount ?? reservation.guests ?? 0,
  status: reservation.status ?? 'PENDING',
  note: reservation.note ?? reservation.specialRequest ?? '',
})

const normalizeTable = (table) => ({
  id: table.id,
  tableNumber: table.tableNumber ?? table.id,
  tableName: table.tableName ?? table.name ?? table.tableNumber ?? table.id,
  tableType: table.tableType ?? table.type ?? 'Dining Room',
  capacity: table.capacity ?? 0,
  status: table.status ?? 'AVAILABLE',
})

function CheckInScreen() {
  const navigate = useNavigate()
  const [reservations, setReservations] = useState([])
  const [tables, setTables] = useState([])
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayInputValue())
  const [selectedReservationId, setSelectedReservationId] = useState(null)
  const [pendingAssignment, setPendingAssignment] = useState(null)
  const [hint, setHint] = useState('Select a reservation first, then choose an available table.')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [occupiedTableDetails, setOccupiedTableDetails] = useState(null)

  const [selectedSection, setSelectedSection] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  const loadCheckInData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [reservationResponse, tableResponse] = await Promise.all([
        getAllReservations(),
        tableApi.getAll(),
      ])

      const nextReservations = Array.isArray(reservationResponse.data)
          ? reservationResponse.data.map(normalizeReservation)
          : []

      const nextTables = Array.isArray(tableResponse.data)
          ? tableResponse.data
              .filter(table => table.isActive === true)
              .map(normalizeTable)
          : []

      setReservations(nextReservations)
      setTables(nextTables)
    } catch (err) {
      console.error("Error loading data:", err)
      setReservations([])
      setTables([])
      setError('Unable to load live check-in data. Please check your backend connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCheckInData()
  }, [loadCheckInData])

  const filteredReservations = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return reservations
        .filter((reservation) => ACTIVE_RESERVATION_STATUSES.has(reservation.status))
        .filter((reservation) => reservation.reservationDate === selectedDate)
        .filter((reservation) => {
          if (!keyword) return true
          return [reservation.fullName, reservation.phone].some((value) => (
              String(value).toLowerCase().includes(keyword)
          ))
        })
        .sort((a, b) => String(a.reservationTime).localeCompare(String(b.reservationTime)))
  }, [reservations, search, selectedDate])

  const selectedReservation = useMemo(() => (
      filteredReservations.find((reservation) => reservation.reservationId === selectedReservationId) ?? null
  ), [filteredReservations, selectedReservationId])

  const dynamicSections = useMemo(() => {
    const sections = new Set(tables.map(t => t.tableType || 'Dining Room'))
    return Array.from(sections)
  }, [tables])

  const dynamicStatuses = useMemo(() => {
    const statuses = new Set(tables.map(t => t.status))
    return Array.from(statuses)
  }, [tables])

  const tablesBySection = useMemo(() => {
    return tables.reduce((groups, table) => {
      const section = table.tableType || 'Dining Room'

      if (selectedSection !== 'All' && section !== selectedSection) return groups
      if (selectedStatus !== 'All' && table.status !== selectedStatus) return groups

      if (!groups[section]) groups[section] = []
      groups[section].push(table)
      return groups
    }, {})
  }, [tables, selectedSection, selectedStatus])

  const handleReservationSelect = (reservation) => {
    setSelectedReservationId(reservation.reservationId)
    setHint(`Ready to assign ${reservation.fullName}. Choose an available table below.`)
  }

  const handleTableClick = async (table) => {
    if (table.status === 'OCCUPIED') {
      try {
        const response = await checkinApi.getActiveGuestByTable(table.id)
        setOccupiedTableDetails({ table, guest: response.data })
      } catch (err) {
        console.error("Error fetching active guest details:", err)
        alert("Could not fetch active guest details. Please try again.")
      }
      return
    }

    if (!selectedReservation) {
      setHint('Select a reservation from the queue first before choosing a table.')
      return
    }

    if (table.status !== 'AVAILABLE') {
      setHint(`Table ${table.tableNumber} is currently not available.`)
      return
    }

    setPendingAssignment({ reservation: selectedReservation, table })
  }

  const confirmAssignment = async () => {
    if (!pendingAssignment) return
    const { reservation, table } = pendingAssignment

    const resId = reservation.reservationId || reservation.id
    const tblId = table.id

    try {
      await checkinApi.assignTable({ reservationId: resId, tableId: tblId })

      setReservations((prev) => prev.map((item) => {
        const currentId = item.reservationId || item.id
        return currentId === resId ? { ...item, status: 'ARRIVED' } : item
      }))

      setTables((prev) => prev.map((item) => (
          item.id === tblId ? { ...item, status: 'OCCUPIED' } : item
      )))

      setSelectedReservationId(null)
      setPendingAssignment(null)
      setHint(`Successfully checked in ${reservation.fullName} at table ${table.tableNumber}.`)
    } catch (err) {
      console.error("Check-in error:", err)
      alert("Failed to execute check-in! Please check connections or table status.")
      setPendingAssignment(null)
    }
  }

  const formatStatusLabel = (statusString) => {
    if (!statusString) return ''
    return statusString.charAt(0).toUpperCase() + statusString.slice(1).toLowerCase()
  }

  return (
      <div className="checkin-screen">
        <header className="checkin-hero">
          <div>
            <p className="checkin-hero__eyebrow">Dashboard / Check-in</p>
            <h1>Check-in</h1>
            <p>Assign today's active reservations to available dining tables and manage guest arrival.</p>
          </div>
          <div className="checkin-hero__status">
            <span>{filteredReservations.length}</span>
            <small>waiting</small>
          </div>
        </header>

        {error && <div className="checkin-alert">{error}</div>}

        <div className="checkin-layout">
          {/* CỘT TRÁI: DANH SÁCH HÀNG ĐỢI ĐẶT CHỖ */}
          <aside className="checkin-panel">
            <div className="checkin-panel__header">
              <h2>Reservations Queue</h2>
              <p>{selectedDate}</p>
            </div>

            <div className="checkin-filterbar">
              <label className="checkin-search" htmlFor="checkin-search">
                <Search size={16} />
                <input
                    id="checkin-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by guest name or phone..."
                />
              </label>

              {/* Ô bộ chọn ngày tích hợp cơ chế click cưỡng chế showPicker */}
              <label
                  className="checkin-date"
                  htmlFor="checkin-date"
                  onClick={(e) => {
                    const inputEl = e.currentTarget.querySelector('input');
                    if (inputEl && typeof inputEl.showPicker === 'function') {
                      inputEl.showPicker();
                    }
                  }}
              >
                <CalendarDays size={16} />
                <input
                    id="checkin-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
              </label>
            </div>

            <div className="checkin-queue">
              {loading ? (
                  <div className="checkin-empty">Loading reservations...</div>
              ) : filteredReservations.length === 0 ? (
                  <div className="checkin-empty">No active reservations for today.</div>
              ) : (
                  filteredReservations.map((reservation, index) => (
                      <div
                          key={reservation.reservationId}
                          className={`checkin-reservation ${selectedReservationId === reservation.reservationId ? 'checkin-reservation--active' : ''}`}
                          onClick={() => handleReservationSelect(reservation)}
                      >
                        <span className="checkin-reservation__index">{index + 1}</span>
                        <div className="checkin-reservation__content">
                          <span className="checkin-reservation__name">{displayValue(reservation.fullName)}</span>
                          <span className="checkin-reservation__details">
                            <Clock size={13} /> {displayValue(reservation.reservationTime)}
                            <span style={{color: '#cbd5e1'}}>|</span>
                            <UsersRound size={13} /> {displayValue(reservation.numberOfGuests)} Pax
                          </span>
                        </div>
                        <button type="button" className="checkin-reservation__btn-trigger">
                          Assign {selectedReservationId === reservation.reservationId ? '...' : ''}
                        </button>
                      </div>
                  ))
              )}
            </div>
          </aside>

          {/* CỘT PHẢI: SƠ ĐỒ MẶT BẰNG BÀN ĂN */}
          <main className="checkin-panel">
            <div className="checkin-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Table Floor Plan</h2>
                <p style={{color: selectedReservation ? '#0e5c47' : '#64748b', fontWeight: selectedReservation ? '600' : '400'}}>
                  {hint}
                </p>
              </div>
              <div className="checkin-legend">
                {dynamicStatuses.map((status) => (
                    <span key={status}>
                      <i className={`checkin-legend__dot checkin-legend__dot--${status.toLowerCase()}`} />
                      {formatStatusLabel(status)}
                    </span>
                ))}
              </div>
            </div>

            {/* THANH THAO TÁC LỌC BÀN THEO ĐIỀU KIỆN */}
            <div className="checkin-toolbar-floor">
              <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                <option value="All">All Types</option>
                {dynamicSections.map((section) => <option key={section} value={section}>{section}</option>)}
              </select>

              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="All">All Statuses</option>
                {dynamicStatuses.map((status) => <option key={status} value={status}>{formatStatusLabel(status)}</option>)}
              </select>
            </div>

            <div className="checkin-floor">
              {Object.keys(tablesBySection).length === 0 ? (
                  <div className="checkin-empty">No dining tables match your filters.</div>
              ) : (
                  Object.entries(tablesBySection).map(([section, sectionTables]) => (
                      <div key={section} className="checkin-section">
                        <div className="checkin-section__title">
                          <h3>{section} <span>({sectionTables.length} tables)</span></h3>
                        </div>
                        <div className="checkin-table-grid">
                          {sectionTables.map((table) => {
                            const isAvailable = table.status === 'AVAILABLE'
                            const canAssign = Boolean(selectedReservation) && isAvailable
                            return (
                                <div
                                    key={table.id}
                                    className={`checkin-table checkin-table--${table.status.toLowerCase()} ${canAssign ? 'checkin-table--assignable' : ''}`}
                                    onClick={() => handleTableClick(table)}
                                >
                                  <div className="checkin-table__top">
                                    {/* Đổi thành tableName để đồng nhất với trang Table Management */}
                                    <strong>{table.tableName}</strong>
                                    <i className="checkin-table__status-dot" />
                                  </div>
                                  <div className="checkin-table__desc">
                                    {formatStatusLabel(table.status)}
                                  </div>
                                  <div className="checkin-table__capacity">{table.capacity} Pax</div>
                                </div>
                            )
                          })}
                        </div>
                      </div>
                  ))
              )}
            </div>
          </main>
        </div>

        {/* MODAL 1: XÁC NHẬN CHECK-IN GÁN BÀN */}
        {pendingAssignment && (
            <div className="custom-modal-backdrop" onClick={() => setPendingAssignment(null)}>
              <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-icon-wrapper">
                  <CheckCircle2 className="custom-modal-icon" size={28} />
                </div>
                <div className="custom-modal-title">Confirm Assigning Table</div>
                <div className="custom-modal-text">
                  Confirm Assigning Guest <strong>[{pendingAssignment.reservation.fullName}] ({pendingAssignment.reservation.numberOfGuests} Pax)</strong> to table <strong>[{pendingAssignment.table.tableNumber} - {pendingAssignment.table.tableType}]</strong>?
                </div>
                <div className="custom-modal-actions">
                  <button type="button" className="custom-btn-cancel" onClick={() => setPendingAssignment(null)}>Cancel</button>
                  <button type="button" className="custom-btn-confirm" onClick={confirmAssignment}>Confirm</button>
                </div>
              </div>
            </div>
        )}

        {/* MODAL 2: XEM NHANH KHÁCH ĐANG NGỒI TẠI BÀN ĐỎ */}
        {occupiedTableDetails && (
            <div className="custom-modal-backdrop" onClick={() => setOccupiedTableDetails(null)}>
              <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-icon-wrapper custom-modal-icon-wrapper--info">
                  <HelpCircle className="custom-modal-icon" size={28} style={{ color: '#3b82f6' }} />
                </div>
                <div className="custom-modal-title">Table {occupiedTableDetails.table.tableNumber} Details</div>
                <div className="custom-modal-text" style={{ textAlign: 'left', background: '#f8fafc', padding: '16px', borderRadius: '12px', marginTop: '12px' }}>
                  <div style={{ marginBottom: '6px' }}><strong>Guest Name:</strong> {displayValue(occupiedTableDetails.guest.fullName)}</div>
                  <div style={{ marginBottom: '6px' }}><strong>Phone Number:</strong> {displayValue(occupiedTableDetails.guest.phone)}</div>
                  <div style={{ marginBottom: '6px' }}><strong>Party Size:</strong> {displayValue(occupiedTableDetails.guest.numberOfGuests)} Pax</div>
                  <div style={{ marginBottom: '6px' }}><strong>Checked-in At:</strong> {displayValue(occupiedTableDetails.guest.checkInTime)}</div>
                  <div><strong>Order:</strong> {displayValue(occupiedTableDetails.guest.orderCode || occupiedTableDetails.guest.orderId)}</div>
                </div>
                <div className="custom-modal-actions" style={{ marginTop: '20px' }}>
                  <button type="button" className="custom-btn-cancel" onClick={() => setOccupiedTableDetails(null)}>Close</button>
                  <button
                      type="button"
                      className="custom-btn-confirm"
                      style={{ background: '#3b82f6' }}
                      onClick={() => navigate('/dashboard/orders-service')}
                  >
                    {occupiedTableDetails.guest.orderId ? 'Manage Order' : 'Create Order'}
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  )
}

export default CheckInScreen
