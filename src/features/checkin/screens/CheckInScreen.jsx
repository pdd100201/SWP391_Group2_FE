import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock, Phone, Search, Table2, UsersRound } from 'lucide-react'
import { checkinApi } from '../api/checkinApi'

import './CheckInScreen.css'
import {getAllReservations} from "../../reservations/api/reservationApi.js";
import {tableApi} from "../../tables/api/tableApi.js";

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
  const [reservations, setReservations] = useState([])
  const [tables, setTables] = useState([])
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayInputValue())
  const [selectedReservationId, setSelectedReservationId] = useState(null)
  const [pendingAssignment, setPendingAssignment] = useState(null)
  const [hint, setHint] = useState('Select a reservation first, then choose an available table.')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [occupiedTableDetails, setOccupiedTableDetails] = useState(null);

  // State quản lý bộ lọc
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

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

      // 🟢 CỤC NÀY ĐÃ SỬA: Lọc thẳng tay các bàn bị Deactive ra ngoài
      const nextTables = Array.isArray(tableResponse.data)
          ? tableResponse.data
              .filter(table => table.isActive === true) // Chỉ lấy bàn đang active
              .map(normalizeTable)
          : []

      setReservations(nextReservations)
      setTables(nextTables)
    } catch (err) {
      console.error("Lỗi khi load dữ liệu thật:", err);
      setReservations([])
      setTables([])
      setError('Unable to load live check-in data. Please check your backend connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // 🌟 ĐÃ FIX ĐỘNG: Tự động gom danh sách Khu vực (Types) từ DB
  const dynamicSections = useMemo(() => {
    const sections = new Set(tables.map(t => t.tableType || 'Dining Room'))
    return Array.from(sections)
  }, [tables])

  // 🌟 ĐÃ FIX ĐỘNG: Tự động gom danh sách Trạng thái (Statuses) thực tế tồn tại từ DB
  const dynamicStatuses = useMemo(() => {
    const statuses = new Set(tables.map(t => t.status))
    return Array.from(statuses) // Sẽ trả về mảng dạng ['AVAILABLE', 'OCCUPIED'...] tùy dữ liệu dưới DB
  }, [tables])

  // Lọc dữ liệu bàn theo Khu vực & Trạng thái đã chọn ở Dropdown
  const tablesBySection = useMemo(() => {
    return tables.reduce((groups, table) => {
      const section = table.tableType || 'Dining Room'

      if (selectedSection !== 'All' && section !== selectedSection) {
        return groups
      }

      if (selectedStatus !== 'All' && table.status !== selectedStatus) {
        return groups
      }

      if (!groups[section]) groups[section] = []
      groups[section].push(table)
      return groups
    }, {})
  }, [tables, selectedSection, selectedStatus])

  const handleReservationSelect = (reservation) => {
    setSelectedReservationId(reservation.reservationId)
    setHint(`Ready to assign ${reservation.fullName}. Choose a green available table.`)
  }

  const handleTableClick = async (table) => {
    if (table.status === 'OCCUPIED') {
      try {
        const response = await checkinApi.getActiveGuestByTable(table.id);
        setOccupiedTableDetails({
          table,
          guest: response.data
        });
      } catch (err) {
        console.error("Lỗi khi lấy thông tin khách từ DB:", err);
        alert("Could not fetch active guest details. Please try again.");
      }
      return;
    }

    if (!selectedReservation) {
      setHint('Pick a reservation from the queue before assigning a table.');
      return;
    }

    if (table.status !== 'AVAILABLE') {
      setHint(`${table.tableNumber} is not available for check-in.`);
      return;
    }

    setPendingAssignment({ reservation: selectedReservation, table });
  };

  const confirmAssignment = async () => {
    if (!pendingAssignment) return
    const { reservation, table } = pendingAssignment

    const resId = reservation.reservationId || reservation.id;
    const tblId = table.id;

    if (!resId || !tblId) {
      console.error("Lỗi: Không tìm thấy ID hợp lệ!", { resId, tblId });
      alert("Dữ liệu ID của bàn hoặc lịch đặt không hợp lệ. Vui lòng F12 xem Console.");
      return;
    }

    try {
      await checkinApi.assignTable({
        reservationId: resId,
        tableId: tblId
      });

      setReservations((prev) => prev.map((item) => {
        const currentId = item.reservationId || item.id;
        return currentId === resId ? { ...item, status: 'ARRIVED' } : item;
      }));

      setTables((prev) => prev.map((item) => (
          item.id === tblId ? { ...item, status: 'OCCUPIED' } : item
      )));

      setSelectedReservationId(null);
      setPendingAssignment(null);
      setHint(`Checked in ${reservation.fullName} at table ${table.tableNumber}.`);

    } catch (err) {
      console.error("Chi tiết lỗi nhận từ Backend:", err.response ? err.response.data : err);
      alert("Không thể thực hiện check-in! Vui lòng kiểm tra lại kết nối hoặc trạng thái bàn.");
      setPendingAssignment(null);
    }
  }

  // Hàm phụ trợ để hiển thị chữ trên Dropdown cho đẹp (Ví dụ: AVAILABLE -> Available)
  const formatStatusLabel = (statusString) => {
    if (!statusString) return '';
    return statusString.charAt(0).toUpperCase() + statusString.slice(1).toLowerCase();
  }

  return (
      <section className="checkin-screen">
        <header className="checkin-hero">
          <div>
            <p className="checkin-hero__eyebrow">Dashboard / Check-in</p>
            <h1>Check-in</h1>
            <p>Assign today's active reservations to available dining tables.</p>
          </div>
          <div className="checkin-hero__status">
            <span>{filteredReservations.length}</span>
            <small>waiting</small>
          </div>
        </header>

        {error && <div className="checkin-alert">{error}</div>}

        <div className="checkin-layout">
          <aside className="checkin-panel checkin-panel--queue">
            <div className="checkin-panel__header">
              <div>
                <h2>Reservations Queue</h2>
                <p>{selectedDate}</p>
              </div>
            </div>

            <div className="checkin-filterbar">
              <label className="checkin-search" htmlFor="checkin-search">
                <Search size={16} />
                <input
                    id="checkin-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by guest name or phone number..."
                />
              </label>

              <label className="checkin-date" htmlFor="checkin-date">
                <CalendarDays size={16} />
                <input
                    id="checkin-date"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                />
              </label>
            </div>

            <div className="checkin-queue">
              {loading ? (
                  <div className="checkin-empty">Loading reservations...</div>
              ) : filteredReservations.length === 0 ? (
                  <div className="checkin-empty">No active reservations for this date.</div>
              ) : (
                  filteredReservations.map((reservation) => (
                      <button
                          key={reservation.reservationId}
                          type="button"
                          className={`checkin-reservation ${selectedReservationId === reservation.reservationId ? 'checkin-reservation--active' : ''}`}
                          onClick={() => handleReservationSelect(reservation)}
                      >
                  <span className="checkin-reservation__topline">
                    <strong>{displayValue(reservation.fullName)}</strong>
                    <span>{reservation.status}</span>
                  </span>
                        <span className="checkin-reservation__meta">
                    <span><Clock size={14} /> {displayValue(reservation.reservationTime)}</span>
                    <span><UsersRound size={14} /> {displayValue(reservation.numberOfGuests)} pax</span>
                  </span>
                        <span className="checkin-reservation__phone">
                    <Phone size={14} /> {displayValue(reservation.phone)}
                  </span>
                        {reservation.note && <span className="checkin-reservation__note">{reservation.note}</span>}
                      </button>
                  ))
              )}
            </div>
          </aside>

          <main className="checkin-panel checkin-panel--floor">
            <div className="checkin-panel__header checkin-panel__header--floor">
              <div>
                <h2>Table Floor Plan</h2>
                <p>{hint}</p>
              </div>
              <div className="checkin-legend">
                {dynamicStatuses.map((status) => (
                    <span key={status} style={{ textTransform: 'capitalize' }}>
      <i className={`checkin-legend__dot checkin-legend__dot--${status.toLowerCase()}`} />
                      {formatStatusLabel(status)}
    </span>
                ))}
              </div>
            </div>

            {/* BỘ LỌC DẠNG DROPDOWN - TẤT CẢ ĐỀU ĐỒNG BỘ ĐỘNG TỪ DB */}
            <div style={{ display: 'flex', gap: '12px', padding: '12px 24px', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
              {/* Dropdown 1: Khu vực bàn (All Types) */}
              <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#1e293b',
                    fontSize: '14px',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '130px'
                  }}
              >
                <option value="All">All Types</option>
                {dynamicSections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                ))}
              </select>

              {/* Dropdown 2: Trạng thái bàn (All Statuses) - ĐÃ ĐỔI THÀNH MAP ĐỘNG TỪ DB */}
              <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#1e293b',
                    fontSize: '14px',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '130px'
                  }}
              >
                <option value="All">All Statuses</option>
                {dynamicStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                ))}
              </select>
            </div>

            <div className={`checkin-floor ${!selectedReservation ? 'checkin-floor--waiting' : ''}`}>
              {Object.keys(tablesBySection).length === 0 ? (
                  <div className="checkin-empty">No tables found matching the filters.</div>
              ) : (
                  Object.entries(tablesBySection).map(([section, sectionTables]) => (
                      <section key={section} className="checkin-section">
                        <div className="checkin-section__title">
                          <h3>{section}</h3>
                          <span>{sectionTables.length} tables</span>
                        </div>
                        <div className="checkin-table-grid">
                          {sectionTables.map((table) => {
                            const isAvailable = table.status === 'AVAILABLE'
                            const canAssign = Boolean(selectedReservation) && isAvailable
                            return (
                                <button
                                    key={table.id}
                                    type="button"
                                    className={`checkin-table checkin-table--${table.status.toLowerCase()} ${canAssign ? 'checkin-table--assignable' : ''}`}
                                    onClick={() => handleTableClick(table)}
                                    aria-disabled={!canAssign}
                                >
                                  <span className="checkin-table__icon"><Table2 size={18} /></span>
                                  <strong>{table.tableNumber}</strong>
                                  <span>{table.tableName}</span>
                                  <small>{table.capacity} pax</small>
                                </button>
                            )
                          })}
                        </div>
                      </section>
                  ))
              )}
            </div>
          </main>
        </div>

        {/* POP-UP 1: XÁC NHẬN GÁN BÀN TRỐNG */}
        {pendingAssignment && (
            <div className="checkin-modal-backdrop" onClick={() => setPendingAssignment(null)}>
              <div className="checkin-modal" onClick={(event) => event.stopPropagation()}>
                <h2>Confirm Check-in</h2>
                <p>
                  Assign Table <strong>{pendingAssignment.table.tableNumber}</strong> to Guest{' '}
                  <strong>{pendingAssignment.reservation.fullName}</strong> ({pendingAssignment.reservation.numberOfGuests} pax)?
                </p>
                <div className="checkin-modal__actions">
                  <button type="button" className="checkin-modal__secondary" onClick={() => setPendingAssignment(null)}>
                    Cancel
                  </button>
                  <button type="button" className="checkin-modal__primary" onClick={confirmAssignment}>
                    Confirm Check-in
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* POP-UP 2: HIỂN THỊ THÔNG TIN KHÁCH ĐANG NGỒI KHI CLICK BÀN ĐỎ */}
        {occupiedTableDetails && (
            <div className="checkin-modal-backdrop" onClick={() => setOccupiedTableDetails(null)}>
              <div className="checkin-modal" onClick={(event) => event.stopPropagation()}>
                <h2>Table {occupiedTableDetails.table.tableNumber} Details</h2>
                <div style={{ margin: '15px 0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <p><strong>Guest Name:</strong> {displayValue(occupiedTableDetails.guest.fullName)}</p>
                  <p><strong>Phone:</strong> {displayValue(occupiedTableDetails.guest.phone)}</p>
                  <p><strong>Number of Guests:</strong> {displayValue(occupiedTableDetails.guest.numberOfGuests)} pax</p>
                  <p><strong>Check-in Time:</strong> {displayValue(occupiedTableDetails.guest.checkInTime)}</p>
                </div>
                <div className="checkin-modal__actions">
                  <button type="button" className="checkin-modal__secondary" onClick={() => setOccupiedTableDetails(null)}>
                    Close
                  </button>
                  <button
                      type="button"
                      className="checkin-modal__primary"
                      onClick={() => alert(`Redirecting to order: ${occupiedTableDetails.guest.orderId}`)}
                  >
                    Go to Orders & Service
                  </button>
                </div>
              </div>
            </div>
        )}
      </section>
  )
}

export default CheckInScreen