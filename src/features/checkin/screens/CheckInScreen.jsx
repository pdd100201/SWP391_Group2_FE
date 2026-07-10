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
const LOCK_BEFORE_MINUTES = 45
const NO_SHOW_GRACE_MINUTES = 15

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

const getReservationTableIds = (reservation) => (
    reservation?.tableIds?.length ? reservation.tableIds : [reservation?.tableId].filter(Boolean)
)

const isReservationLockActive = (reservation) => {
  if (!reservation?.reservationDate || !reservation?.reservationTime) return false
  const reservationDateTime = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`)
  if (Number.isNaN(reservationDateTime.getTime())) return false

  const diffMinutes = (reservationDateTime.getTime() - Date.now()) / 60000
  return diffMinutes <= LOCK_BEFORE_MINUTES && diffMinutes >= -NO_SHOW_GRACE_MINUTES
}

const normalizeReservation = (reservation) => ({
  reservationId: reservation.reservationId ?? reservation.id,
  tableId: reservation.tableId ?? reservation.table?.id ?? null,
  tableIds: Array.isArray(reservation.tableIds)
      ? reservation.tableIds
      : [reservation.tableId ?? reservation.table?.id].filter(Boolean),
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

  // THAY ĐỔI 1: State lưu DANH SÁCH bàn được chọn thay vì 1 bàn
  const [selectedTables, setSelectedTables] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [hint, setHint] = useState('Select a reservation first, then choose available tables.')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [occupiedTableDetails, setOccupiedTableDetails] = useState(null)
  const [reservedTableDetails, setReservedTableDetails] = useState(null)
  const [changeTableTarget, setChangeTableTarget] = useState(null)
  const [changeTableSelection, setChangeTableSelection] = useState([])
  const [showChangeTableConfirm, setShowChangeTableConfirm] = useState(false)

  const [selectedSection, setSelectedSection] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  const loadCheckInData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [reservationResponse, tableResponse] = await Promise.all([
        getAllReservations(),
        tableApi.getStatusNow(),
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

  // Tính tổng sức chứa của các bàn đang chọn
  const totalSelectedCapacity = useMemo(() => {
    return selectedTables.reduce((sum, t) => sum + t.capacity, 0)
  }, [selectedTables])

  const displayTables = useMemo(() => {
    const isViewingToday = selectedDate === todayInputValue()
    const activeReservedTableIds = new Set()

    reservations
        .filter((reservation) => reservation.reservationDate === selectedDate)
        .filter((reservation) => reservation.status === 'CONFIRMED')
        .filter(isReservationLockActive)
        .forEach((reservation) => {
          getReservationTableIds(reservation).forEach((tableId) => activeReservedTableIds.add(String(tableId)))
        })

    return tables.map((table) => {
      let status = 'AVAILABLE'
      if (isViewingToday && ['OCCUPIED', 'CLEANING'].includes(table.status)) {
        status = table.status
      }
      if (activeReservedTableIds.has(String(table.id)) && status === 'AVAILABLE') {
        status = 'RESERVED'
      }
      return { ...table, status }
    })
  }, [reservations, selectedDate, tables])

  const dynamicSections = useMemo(() => {
    const sections = new Set(displayTables.map(t => t.tableType || 'Dining Room'))
    return Array.from(sections)
  }, [displayTables])

  const dynamicStatuses = useMemo(() => {
    const statuses = new Set(displayTables.map(t => t.status))
    return Array.from(statuses)
  }, [displayTables])

  const changeTableOptions = useMemo(() => (
      displayTables.filter((table) => table.status === 'AVAILABLE')
  ), [displayTables])

  const changeTableReservation = useMemo(() => {
    if (!changeTableTarget?.guest?.reservationId) return null
    return reservations.find((reservation) => (
        String(reservation.reservationId) === String(changeTableTarget.guest.reservationId)
    )) ?? null
  }, [changeTableTarget, reservations])

  const keptChangeTables = useMemo(() => {
    if (!changeTableTarget) return []
    const assignedTableIds = getReservationTableIds(changeTableReservation)
    return displayTables.filter((table) => (
        assignedTableIds.some((tableId) => String(table.id) === String(tableId))
        && String(table.id) !== String(changeTableTarget.table?.id)
    ))
  }, [changeTableReservation, changeTableTarget, displayTables])

  const finalChangeTables = useMemo(() => (
      [...keptChangeTables, ...changeTableSelection]
  ), [changeTableSelection, keptChangeTables])

  const finalChangeCapacity = useMemo(() => (
      finalChangeTables.reduce((sum, table) => sum + table.capacity, 0)
  ), [finalChangeTables])

  const tablesBySection = useMemo(() => {
    return displayTables.reduce((groups, table) => {
      const section = table.tableType || 'Dining Room'

      if (selectedSection !== 'All' && section !== selectedSection) return groups
      if (selectedStatus !== 'All' && table.status !== selectedStatus) return groups

      if (!groups[section]) groups[section] = []
      groups[section].push(table)
      return groups
    }, {})
  }, [displayTables, selectedSection, selectedStatus])

  const handleReservationSelect = (reservation) => {
    setSelectedReservationId(reservation.reservationId)
    const lockedTableIds = getReservationTableIds(reservation)
    const lockedTables = isReservationLockActive(reservation) ? displayTables.filter((table) => (
        lockedTableIds.some((tableId) => String(table.id) === String(tableId))
    )) : []

    if (lockedTables.length > 0) {
      setSelectedTables(lockedTables)
      setHint(`${reservation.fullName} already has ${lockedTables.map((table) => table.tableName).join(', ')} reserved. Confirm check-in when the guest arrives.`)
      return
    }
    setSelectedTables([]) // Reset lại bàn khi chọn khách khác
    setHint(`Ready to assign ${reservation.fullName}. You can select multiple available tables.`)
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

    if (table.status === 'RESERVED') {
      try {
        const response = await checkinApi.getReservedGuestByTable(table.id)
        setReservedTableDetails({ table, guest: response.data })
      } catch (err) {
        console.error("Error fetching reserved guest details:", err)
        alert("Could not fetch reserved guest details. Please try again.")
      }
      return
    }

    if (!selectedReservation) {
      setHint('Select a reservation from the queue first before choosing a table.')
      return
    }

    const lockedTableIds = getReservationTableIds(selectedReservation)
    if (isReservationLockActive(selectedReservation) && lockedTableIds.length > 0) {
      const lockedTables = displayTables.filter((item) => (
          lockedTableIds.some((tableId) => String(item.id) === String(tableId))
      ))
      if (lockedTables.length > 0) {
        setSelectedTables(lockedTables)
        setHint(`${selectedReservation.fullName} already has ${lockedTables.map((item) => item.tableName).join(', ')} reserved. No extra table is needed.`)
      }
      return
    }

    if (table.status !== 'AVAILABLE') {
      setHint(`Table ${table.tableNumber} is currently not available.`)
      return
    }

    // THAY ĐỔI 2: Logic chọn nhiều bàn (Toggle)
    const requiredCapacity = Number(selectedReservation.numberOfGuests) || 0
    const isAlreadySelected = selectedTables.some((selectedTable) => selectedTable.id === table.id)
    if (!isAlreadySelected && requiredCapacity > 0 && totalSelectedCapacity >= requiredCapacity) {
      setHint(`Selected tables already cover ${selectedReservation.numberOfGuests} Pax. Remove a table first if you want to change it.`)
      return
    }

    setSelectedTables((prev) => {
      const isAlreadySelected = prev.some(t => t.id === table.id)
      if (isAlreadySelected) {
        // Bỏ chọn nếu đã có trong mảng
        return prev.filter(t => t.id !== table.id)
      } else {
        // Thêm vào mảng nếu chưa có
        return [...prev, table]
      }
    })
  }

  const confirmAssignment = async () => {
    if (!selectedReservation || selectedTables.length === 0) return
    const resId = selectedReservation.reservationId || selectedReservation.id
    const tableIds = selectedTables.map(t => t.id) // Lấy ra mảng các ID

    try {
      // Bắn mảng ID xuống API (Nhớ phải cập nhật file checkinApi.js)
      await checkinApi.assignTables(resId, { tableIds })

      setReservations((prev) => prev.map((item) => {
        const currentId = item.reservationId || item.id
        return currentId === resId ? { ...item, status: 'ARRIVED' } : item
      }))

      setTables((prev) => prev.map((item) => (
          tableIds.includes(item.id) ? { ...item, status: 'OCCUPIED' } : item
      )))

      setSelectedReservationId(null)
      setSelectedTables([])
      setShowConfirmModal(false)
      setHint(`Successfully checked in ${selectedReservation.fullName} at ${tableIds.length} tables.`)
    } catch (err) {
      console.error("Check-in error:", err)
      alert(err.response?.data?.message || "Failed to execute check-in! Ensure capacity is sufficient.")
      setShowConfirmModal(false)
    }
  }

  const toggleChangeTableSelection = (table) => {
    setChangeTableSelection((prev) => {
      const isSelected = prev.some((item) => item.id === table.id)
      if (isSelected) return prev.filter((item) => item.id !== table.id)

      const requiredCapacity = Number(changeTableTarget?.guest?.numberOfGuests) || 0
      const keptCapacity = keptChangeTables.reduce((sum, item) => sum + item.capacity, 0)
      const currentCapacity = keptCapacity + prev.reduce((sum, item) => sum + item.capacity, 0)
      if (requiredCapacity > 0 && currentCapacity >= requiredCapacity) {
        return prev
      }
      return [...prev, table]
    })
  }

  const requestTableChangeConfirmation = () => {
    if (!changeTableTarget || changeTableSelection.length === 0) return

    const requiredCapacity = Number(changeTableTarget.guest?.numberOfGuests) || 0
    if (finalChangeCapacity < requiredCapacity) {
      alert(`Final tables only cover ${finalChangeCapacity} / ${requiredCapacity} Pax.`)
      return
    }

    setShowChangeTableConfirm(true)
  }

  const submitTableChange = async () => {
    if (!changeTableTarget || changeTableSelection.length === 0) return

    try {
      await checkinApi.changeTables(changeTableTarget.guest.reservationId, {
        tableIds: finalChangeTables.map((table) => table.id),
      })
      setChangeTableTarget(null)
      setChangeTableSelection([])
      setShowChangeTableConfirm(false)
      setOccupiedTableDetails(null)
      await loadCheckInData()
      setHint(`Replaced ${changeTableTarget.table.tableName} with ${changeTableSelection.map((table) => table.tableName).join(', ')} for ${changeTableTarget.guest.fullName}.`)
    } catch (err) {
      console.error("Change table error:", err)
      const errorMessage = err.response?.data?.message
          || err.response?.data?.error
          || (typeof err.response?.data === 'string' ? err.response.data : '')
          || err.message
          || "Failed to change table."
      alert(errorMessage)
      setShowChangeTableConfirm(false)
    }
  }

  const formatStatusLabel = (statusString) => {
    if (!statusString) return ''
    return statusString.charAt(0).toUpperCase() + statusString.slice(1).toLowerCase()
  }

  const isCheckingInReservedTable = selectedTables.some((table) => table.status === 'RESERVED')

  return (
      <div className="checkin-screen" style={{ position: 'relative' }}>
        {/* ... (Giữ nguyên header) ... */}
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
          {/* CỘT TRÁI: (Giữ nguyên không đổi) */}
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
                            <span className={`checkin-reservation__status checkin-reservation__status--${String(reservation.status).toLowerCase()}`}>
                              {displayValue(reservation.status)}
                            </span>
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

          {/* CỘT PHẢI: SƠ ĐỒ BÀN */}
          <main className="checkin-panel" style={{ paddingBottom: selectedTables.length > 0 ? '80px' : '24px' }}>
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
                            // Kiểm tra xem bàn này có nằm trong danh sách đang chọn không
                            const isSelected = selectedTables.some(t => t.id === table.id)

                            return (
                                <div
                                    key={table.id}
                                    // Thêm style inline để đổi màu viền ngay lập tức mà không cần sửa CSS
                                    style={isSelected ? { border: '2px solid #0e5c47', backgroundColor: '#eefcf5', transform: 'scale(1.02)' } : {}}
                                    className={`checkin-table checkin-table--${table.status.toLowerCase()} ${canAssign ? 'checkin-table--assignable' : ''}`}
                                    onClick={() => handleTableClick(table)}
                                >
                                  <div className="checkin-table__top">
                                    <strong>{table.tableName}</strong>
                                    <i className="checkin-table__status-dot" />
                                  </div>
                                  <div className="checkin-table__desc">
                                    {isSelected ? 'Selected' : formatStatusLabel(table.status)}
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

        {/* THAY ĐỔI 3: THANH CÔNG CỤ FLOATING KHI CÓ BÀN ĐƯỢC CHỌN */}
        {selectedTables.length > 0 && selectedReservation && (
            <div style={{
              position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
              background: '#0e5c47', color: 'white', padding: '16px 24px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 100
            }}>
              <div>
                <strong style={{ fontSize: '1.1rem', display: 'block' }}>
                  {isCheckingInReservedTable
                      ? `${selectedTables.length} Reserved Table${selectedTables.length > 1 ? 's' : ''}`
                      : `${selectedTables.length} Tables Selected`}
                </strong>
                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  Total Capacity: {totalSelectedCapacity} / {selectedReservation.numberOfGuests} Pax
                </span>
              </div>
              <button
                  onClick={() => setShowConfirmModal(true)}
                  style={{ background: 'white', color: '#0e5c47', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isCheckingInReservedTable ? 'Check In Guest' : 'Confirm Assignment'}
              </button>
            </div>
        )}

        {/* MODAL 1: XÁC NHẬN GÁN NHIỀU BÀN */}
        {showConfirmModal && selectedReservation && (
            <div className="custom-modal-backdrop" onClick={() => setShowConfirmModal(false)}>
              <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-icon-wrapper">
                  <CheckCircle2 className="custom-modal-icon" size={28} />
                </div>
                <div className="custom-modal-title">
                  {isCheckingInReservedTable ? 'Confirm Check-in' : 'Confirm Multiple Tables'}
                </div>
                <div className="custom-modal-text">
                  {isCheckingInReservedTable ? 'Check in Guest ' : 'Confirm Assigning Guest '}
                  <strong>[{selectedReservation.fullName}] ({selectedReservation.numberOfGuests} Pax)</strong>
                  {isCheckingInReservedTable ? ' at ' : ' to '}
                  <strong>{selectedTables.length} tables</strong>: <br/>
                  <span style={{color: '#0e5c47', fontWeight: 'bold'}}>
                    {selectedTables.map(t => t.tableName).join(', ')}
                  </span> ?
                </div>
                <div className="custom-modal-actions">
                  <button type="button" className="custom-btn-cancel" onClick={() => setShowConfirmModal(false)}>Cancel</button>
                  <button type="button" className="custom-btn-confirm" onClick={confirmAssignment}>
                    {isCheckingInReservedTable ? 'Check In' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* MODAL 2: XEM NHANH KHÁCH (Giữ nguyên) */}
        {occupiedTableDetails && (
            <div className="custom-modal-backdrop" onClick={() => setOccupiedTableDetails(null)}>
              <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-icon-wrapper custom-modal-icon-wrapper--info">
                  <HelpCircle className="custom-modal-icon" size={28} style={{ color: '#3b82f6' }} />
                </div>
                <div className="custom-modal-title">Table {occupiedTableDetails.table.tableNumber} Details</div>
                <div className="custom-modal-text" style={{ textAlign: 'left', background: '#f8fafc', padding: '16px', borderRadius: '12px', marginTop: '12px' }}>
                  <div style={{ marginBottom: '8px' }}><strong>Guest Name:</strong> {displayValue(occupiedTableDetails.guest?.fullName)}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Phone Number:</strong> {displayValue(occupiedTableDetails.guest?.phone)}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Party Size:</strong> {displayValue(occupiedTableDetails.guest?.numberOfGuests)} Pax</div>
                  <div style={{ marginBottom: '8px' }}><strong>Check-in Time:</strong> {displayValue(occupiedTableDetails.guest?.checkInTime)}</div>
                  <div><strong>Order:</strong> {displayValue(occupiedTableDetails.guest?.orderCode || occupiedTableDetails.guest?.orderId)}</div>
                </div>
                <div className="custom-modal-actions" style={{ marginTop: '20px' }}>
                  <button type="button" className="custom-btn-cancel" onClick={() => setOccupiedTableDetails(null)}>Close</button>
                  <button
                      type="button"
                      className="custom-btn-confirm"
                      style={{ background: '#0e5c47' }}
                      onClick={() => {
                        setChangeTableTarget(occupiedTableDetails)
                        setChangeTableSelection([])
                      }}
                  >
                    Change Table
                  </button>
                  <button
                      type="button"
                      className="custom-btn-confirm"
                      style={{ background: '#3b82f6' }}
                      onClick={() => navigate('/dashboard/orders-service')}
                  >
                    {occupiedTableDetails.guest?.orderId ? 'Manage Order' : 'Create Order'}
                  </button>
                </div>
              </div>
            </div>
        )}


        {changeTableTarget && !showChangeTableConfirm && (
            <div className="custom-modal-backdrop" onClick={() => {
              setChangeTableTarget(null)
              setShowChangeTableConfirm(false)
            }}>
              <div className="custom-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
                <div className="custom-modal-icon-wrapper custom-modal-icon-wrapper--info">
                  <CheckCircle2 className="custom-modal-icon" size={28} style={{ color: '#0e5c47' }} />
                </div>
                <div className="custom-modal-title">Replace Table</div>
                <div className="custom-modal-text">
                  Replace <strong>{changeTableTarget.table?.tableName}</strong> for <strong>{changeTableTarget.guest?.fullName}</strong>
                </div>
                <div style={{ margin: '14px 0', color: '#475569', fontWeight: 600 }}>
                  Final Capacity: {finalChangeCapacity} / {changeTableTarget.guest?.numberOfGuests} Pax
                </div>
                {keptChangeTables.length > 0 && (
                    <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                      <strong>Keeping:</strong> {keptChangeTables.map((table) => table.tableName).join(', ')}
                    </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                  {changeTableOptions.length === 0 ? (
                      <div className="checkin-empty" style={{ gridColumn: '1 / -1' }}>No available tables to move this guest.</div>
                  ) : (
                      changeTableOptions.map((table) => {
                        const isSelected = changeTableSelection.some((item) => item.id === table.id)
                        return (
                            <button
                                key={table.id}
                                type="button"
                                onClick={() => toggleChangeTableSelection(table)}
                                style={{
                                  textAlign: 'left',
                                  border: isSelected ? '2px solid #0e5c47' : '1px solid #d8e2ef',
                                  background: isSelected ? '#eefcf5' : '#ffffff',
                                  borderRadius: '10px',
                                  padding: '12px',
                                  cursor: 'pointer',
                                  color: '#0f172a',
                                }}
                            >
                              <strong style={{ display: 'block', marginBottom: '6px' }}>{table.tableName}</strong>
                              <span style={{ color: '#64748b' }}>{table.capacity} Pax</span>
                            </button>
                        )
                      })
                  )}
                </div>
                <div className="custom-modal-actions" style={{ marginTop: '20px' }}>
                  <button
                      type="button"
                      className="custom-btn-cancel"
                      onClick={() => {
                        setChangeTableTarget(null)
                        setChangeTableSelection([])
                        setShowChangeTableConfirm(false)
                      }}
                  >
                    Cancel
                  </button>
                  <button
                      type="button"
                      className="custom-btn-confirm"
                      onClick={requestTableChangeConfirmation}
                      disabled={changeTableSelection.length === 0}
                  >
                    Review Change
                  </button>
                </div>
              </div>
            </div>
        )}


        {showChangeTableConfirm && changeTableTarget && (
            <div className="custom-modal-backdrop" onClick={() => setShowChangeTableConfirm(false)}>
              <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-icon-wrapper" style={{ backgroundColor: '#fffbeb' }}>
                  <HelpCircle className="custom-modal-icon" size={28} style={{ color: '#f59e0b' }} />
                </div>
                <div className="custom-modal-title">Confirm Table Replacement</div>
                <div className="custom-modal-text" style={{ textAlign: 'left', background: '#fffbeb', padding: '16px', borderRadius: '12px', marginTop: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Guest:</strong> {displayValue(changeTableTarget.guest?.fullName)}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Replace:</strong> {displayValue(changeTableTarget.table?.tableName)}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>With:</strong> {changeTableSelection.map((table) => table.tableName).join(', ')}
                  </div>
                  {keptChangeTables.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Keeping:</strong> {keptChangeTables.map((table) => table.tableName).join(', ')}
                      </div>
                  )}
                  <div>
                    <strong>Final Capacity:</strong> {finalChangeCapacity} / {changeTableTarget.guest?.numberOfGuests} Pax
                  </div>
                </div>
                <div className="custom-modal-actions" style={{ marginTop: '20px' }}>
                  <button
                      type="button"
                      className="custom-btn-cancel"
                      onClick={() => setShowChangeTableConfirm(false)}
                  >
                    Back
                  </button>
                  <button
                      type="button"
                      className="custom-btn-confirm"
                      onClick={submitTableChange}
                  >
                    Yes, Replace Table
                  </button>
                </div>
              </div>
            </div>
        )}


        {reservedTableDetails && (
            <div className="custom-modal-backdrop" onClick={() => setReservedTableDetails(null)}>
              <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-icon-wrapper" style={{ backgroundColor: '#fffbeb' }}>
                  <HelpCircle className="custom-modal-icon" size={28} style={{ color: '#f59e0b' }} />
                </div>
                <div className="custom-modal-title">Table {reservedTableDetails.table.tableNumber} Reservation</div>
                <div className="custom-modal-text" style={{ textAlign: 'left', background: '#fffbeb', padding: '16px', borderRadius: '12px', marginTop: '12px' }}>
                  <div style={{ marginBottom: '8px' }}><strong>Guest Name:</strong> {displayValue(reservedTableDetails.guest?.fullName)}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Phone Number:</strong> {displayValue(reservedTableDetails.guest?.phone)}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Party Size:</strong> {displayValue(reservedTableDetails.guest?.numberOfGuests)} Pax</div>
                  <div style={{ marginBottom: '8px' }}><strong>Reservation Time:</strong> {displayValue(reservedTableDetails.guest?.checkInTime)}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Reservation Reference:</strong> {displayValue(reservedTableDetails.guest?.orderCode || reservedTableDetails.guest?.reservationId)}</div>
                </div>
                <div className="custom-modal-actions" style={{ marginTop: '20px' }}>
                  <button type="button" className="custom-btn-cancel" onClick={() => setReservedTableDetails(null)}>Close</button>
                </div>
              </div>
            </div>
        )}
      </div>
  )
}

export default CheckInScreen
