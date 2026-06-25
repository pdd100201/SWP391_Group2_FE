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

const DEMO_RESERVATIONS = [
  {
    reservationId: 'R-1001',
    fullName: 'Linh Tran',
    phone: '0901234567',
    reservationDate: todayInputValue(),
    reservationTime: '18:30',
    numberOfGuests: 4,
    status: 'CONFIRMED',
    note: 'Window seat preferred',
  },
  {
    reservationId: 'R-1002',
    fullName: 'Minh Nguyen',
    phone: '0918887766',
    reservationDate: todayInputValue(),
    reservationTime: '19:00',
    numberOfGuests: 2,
    status: 'PENDING',
    note: '',
  },
  {
    reservationId: 'R-1003',
    fullName: 'An Pham',
    phone: '0987654321',
    reservationDate: todayInputValue(),
    reservationTime: '20:15',
    numberOfGuests: 6,
    status: 'CONFIRMED',
    note: 'Birthday dinner',
  },
]

const DEMO_TABLES = [
  { id: 'T01', tableNumber: 'T01', tableName: 'Table 1', tableType: 'Main Hall', capacity: 2, status: 'AVAILABLE' },
  { id: 'T02', tableNumber: 'T02', tableName: 'Table 2', tableType: 'Main Hall', capacity: 2, status: 'OCCUPIED' },
  { id: 'T03', tableNumber: 'T03', tableName: 'Table 3', tableType: 'Main Hall', capacity: 4, status: 'AVAILABLE' },
  { id: 'T04', tableNumber: 'T04', tableName: 'Table 4', tableType: 'Main Hall', capacity: 4, status: 'AVAILABLE' },
  { id: 'T05', tableNumber: 'T05', tableName: 'Table 5', tableType: 'Main Hall', capacity: 6, status: 'OCCUPIED' },
  { id: 'VIP-1', tableNumber: 'VIP-1', tableName: 'VIP Room 1', tableType: 'VIP Room', capacity: 8, status: 'AVAILABLE' },
  { id: 'VIP-2', tableNumber: 'VIP-2', tableName: 'VIP Room 2', tableType: 'VIP Room', capacity: 10, status: 'OCCUPIED' },
  { id: 'P01', tableNumber: 'P01', tableName: 'Patio Table 1', tableType: 'Patio', capacity: 4, status: 'AVAILABLE' },
  { id: 'P02', tableNumber: 'P02', tableName: 'Patio Table 2', tableType: 'Patio', capacity: 4, status: 'AVAILABLE' },
  { id: 'P03', tableNumber: 'P03', tableName: 'Patio Table 3', tableType: 'Patio', capacity: 6, status: 'OCCUPIED' },
]

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
  const [reservations, setReservations] = useState(DEMO_RESERVATIONS)
  const [tables, setTables] = useState(DEMO_TABLES)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayInputValue())
  const [selectedReservationId, setSelectedReservationId] = useState(null)
  const [pendingAssignment, setPendingAssignment] = useState(null)
  const [hint, setHint] = useState('Select a reservation first, then choose an available table.')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          ? tableResponse.data.map(normalizeTable)
          : []

      setReservations(nextReservations.length ? nextReservations : DEMO_RESERVATIONS)
      setTables(nextTables.length ? nextTables : DEMO_TABLES)
    } catch (err) {
      console.error("Lỗi khi load dữ liệu thật:", err);
      setReservations(DEMO_RESERVATIONS)
      setTables(DEMO_TABLES)
      setError('Unable to load live check-in data, showing demo data instead.')
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

  const tablesBySection = useMemo(() => {
    return tables.reduce((groups, table) => {
      const section = table.tableType || 'Dining Room'
      if (!groups[section]) groups[section] = []
      groups[section].push(table)
      return groups
    }, {})
  }, [tables])

  const handleReservationSelect = (reservation) => {
    setSelectedReservationId(reservation.reservationId)
    setHint(`Ready to assign ${reservation.fullName}. Choose a green available table.`)
  }

  const handleTableClick = (table) => {
    if (!selectedReservation) {
      setHint('Pick a reservation from the queue before assigning a table.')
      return
    }

    if (table.status !== 'AVAILABLE') {
      setHint(`${table.tableNumber} is not available for check-in.`)
      return
    }

    setPendingAssignment({ reservation: selectedReservation, table })
  }

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
                <span><i className="checkin-legend__dot checkin-legend__dot--available" /> Available</span>
                <span><i className="checkin-legend__dot checkin-legend__dot--occupied" /> Occupied</span>
              </div>
            </div>

            <div className={`checkin-floor ${!selectedReservation ? 'checkin-floor--waiting' : ''}`}>
              {Object.entries(tablesBySection).map(([section, sectionTables]) => (
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
              ))}
            </div>
          </main>
        </div>

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
      </section>
  )
}

export default CheckInScreen