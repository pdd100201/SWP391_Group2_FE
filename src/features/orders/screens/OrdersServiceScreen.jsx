import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChefHat,
  ClipboardList,
  Copy,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import QRCode from 'qrcode'
import { menuService } from '../../menu/services/menuService'
import { getAllReservations } from '../../reservations/api/reservationApi'
import { orderApi } from '../api/orderApi'
import './OrdersServiceScreen.css'

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} ₫`
const errorMessage = (error, fallback) => error.response?.data?.message || fallback
const loadErrorMessage = (error) => {
  const status = error.response?.status
  const url = error.config?.url || error.request?.responseURL || 'unknown API'
  if (status === 403) return `You do not have permission to load ${url}.`
  if (status === 401) return 'Your session has expired. Please log in again.'
  if (status) return `Could not load ${url} (HTTP ${status}).`
  return 'Unable to connect to the server.'
}
const tableLabel = (value) => {
  const tableNames = Array.isArray(value?.tableNames) ? value.tableNames.filter(Boolean) : []
  const tableNumbers = Array.isArray(value?.tableNumbers) ? value.tableNumbers.filter(Boolean) : []
  if (tableNames.length > 0) return tableNames.join(', ')
  if (tableNumbers.length > 0) return tableNumbers.join(', ')
  if (!value?.tableId) return 'No table assigned'
  const label = value.tableName || value.tableNumber || `Table ${value.tableId}`
  return value.tableNumber && value.tableName && value.tableName !== value.tableNumber
    ? `${value.tableNumber} - ${value.tableName}`
    : label
}

const statusLabels = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  CANCELLED: 'Cancelled',
}

function OrdersServiceScreen() {
  const [orders, setOrders] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [menu, setMenu] = useState([])
  const [reservations, setReservations] = useState([])
  const [reservationId, setReservationId] = useState('')
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const navigate = useNavigate()

  const selected = orders.find((order) => order.id === selectedId) || null
  const role = sessionStorage.getItem('role')
  const categories = useMemo(
    () => ['All', ...new Set(menu.map((item) => item.category).filter(Boolean))],
    [menu]
  )
  const availableMenu = useMemo(() => menu.filter((item) => {
    const allowed = item.isActive && ['AVAILABLE', 'LIMITED'].includes(item.availability)
    const matchesCategory = category === 'All' || item.category === category
    const matchesSearch = item.name.toLowerCase().includes(search.trim().toLowerCase())
    return allowed && matchesCategory && matchesSearch
  }), [menu, category, search])
  const unusedReservations = reservations.filter((reservation) =>
    ['ARRIVED', 'CONFIRMED'].includes(reservation.status)
      && reservation.tableId
      && !reservation.orderId
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [ordersResponse, menuResponse, reservationsResponse] = await Promise.all([
        orderApi.getAll(true),
        menuService.getAll(),
        getAllReservations(),
      ])
      const nextOrders = ordersResponse.data || []
      setOrders(nextOrders)
      setMenu(menuResponse.data || [])
      setReservations(reservationsResponse.data || [])
      setSelectedId((current) => nextOrders.some((order) => order.id === current)
        ? current
        : nextOrders[0]?.id || null)
    } catch (loadError) {
      setError(loadError.response?.data?.message || loadErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial data synchronization with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  useEffect(() => {
    if (!selected?.qrPath) {
      return
    }
    QRCode.toDataURL(`${window.location.origin}${selected.qrPath}`, { width: 180, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [selected?.qrPath])

  const applyOrder = (next) => {
    setReservations((current) => current.map((reservation) => (
      reservation.reservationId === next.reservationId
        ? {
            ...reservation,
            orderId: next.id,
            orderCode: next.orderCode,
            orderStatus: next.status,
            tableId: next.tableId ?? reservation.tableId,
            tableIds: next.tableIds ?? reservation.tableIds,
            tableNumber: next.tableNumber ?? reservation.tableNumber,
            tableNumbers: next.tableNumbers ?? reservation.tableNumbers,
            tableName: next.tableName ?? reservation.tableName,
            tableNames: next.tableNames ?? reservation.tableNames,
            status: next.status === 'CLOSED'
              ? 'COMPLETED'
              : next.status === 'CANCELLED' ? 'CANCELLED' : next.reservationStatus ?? reservation.status,
          }
        : reservation
    )))
    setOrders((current) => {
      if (next.status !== 'OPEN') return current.filter((order) => order.id !== next.id)
      const exists = current.some((order) => order.id === next.id)
      return exists ? current.map((order) => order.id === next.id ? next : order) : [next, ...current]
    })
    if (next.status === 'OPEN') setSelectedId(next.id)
    else setSelectedId(null)
  }

  const run = async (action, fallback) => {
    setBusy(true)
    setError('')
    try {
      const response = await action()
      applyOrder(response.data)
    } catch (actionError) {
      setError(errorMessage(actionError, fallback))
    } finally {
      setBusy(false)
    }
  }

  const createOrder = () => {
    if (!reservationId) return
    run(() => orderApi.create({ reservationId: Number(reservationId) }), 'Unable to create order.')
      .then(() => setReservationId(''))
  }

  const nextStatus = (item) => {
    if (['ADMIN', 'MANAGER'].includes(role) && item.status === 'CONFIRMED') return 'PREPARING'
    if (['ADMIN', 'MANAGER'].includes(role) && item.status === 'PREPARING') return 'READY'
    if (['ADMIN', 'MANAGER', 'WAITER'].includes(role) && item.status === 'READY') return 'SERVED'
    return null
  }

  const copyQrLink = async () => {
    if (!selected) return
    await navigator.clipboard.writeText(`${window.location.origin}${selected.qrPath}`)
  }

  if (loading) return <div className="orders-loading">Loading order workspace...</div>

  return (
    <section className="orders-screen">
      <header className="orders-header">
        <div>
          <span className="orders-eyebrow"><ChefHat size={15} /> Orders &amp; Service</span>
          <h1>Dining room orders</h1>
          <p>Create an order from an assigned reservation and follow every dish to the table.</p>
        </div>
        <button type="button" className="orders-button orders-button--secondary" onClick={load} disabled={busy}>
          <RefreshCw size={17} /> Refresh
        </button>
      </header>

      {error && <div className="orders-alert">{error}</div>}

      <div className="orders-create-bar">
        <label className="orders-reservation-field">
          <span>Assigned reservation</span>
          <select value={reservationId} onChange={(event) => setReservationId(event.target.value)}>
            <option value="">Choose a checked-in table to open its order</option>
            {unusedReservations.map((reservation) => (
              <option key={reservation.reservationId} value={reservation.reservationId}>
                #{reservation.reservationId} - {reservation.fullName} - {tableLabel(reservation)} - {reservation.reservationDate} {reservation.reservationTime}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="orders-button orders-button--primary" onClick={createOrder} disabled={!reservationId || busy}>
          <Plus size={17} /> Create order
        </button>
        {unusedReservations.length === 0 && (
          <small className="orders-no-reservation">No assigned reservation is waiting for an order.</small>
        )}
      </div>

      <div className="orders-workspace">
        <aside className="orders-list-panel">
          <div className="orders-panel-title"><ClipboardList size={18} /> Active orders <span>{orders.length}</span></div>
          {orders.length === 0 ? <p className="orders-empty">No active orders.</p> : orders.map((order) => (
            <button
              type="button"
              key={order.id}
              className={`orders-list-card ${selectedId === order.id ? 'is-active' : ''}`}
              onClick={() => setSelectedId(order.id)}
            >
              <span><strong>{order.orderCode}</strong><small>{order.reservationGuestName} - {tableLabel(order)}</small></span>
              <span className={`orders-service-badge orders-service-badge--${order.serviceStatus.toLowerCase()}`}>
                {order.serviceStatus.replace('_', ' ')}
              </span>
              <b>{money(order.total)}</b>
            </button>
          ))}
        </aside>

        <main className="orders-detail-panel">
          {!selected ? <div className="orders-empty orders-empty--large">Select or create an order to begin.</div> : (
            <>
              <div className="orders-detail-head">
                <div>
                  <h2>{selected.orderCode}</h2>
                  <p>Reservation #{selected.reservationId} - {selected.reservationGuestName} - {tableLabel(selected)} - Waiter {selected.waiterName}</p>
                </div>
                <div className="orders-detail-actions">
                  <button type="button" className="orders-button orders-button--secondary" onClick={copyQrLink}>
                    <Copy size={16} /> Copy QR link
                  </button>
                  <button
                    type="button"
                    className="orders-button orders-button--primary"
                    onClick={() => navigate(`/dashboard/orders-service/${selected.id}/payment`)}
                  >
                    <CreditCard size={16} /> Payment
                  </button>
                  <button type="button" className="orders-button orders-button--danger" disabled={busy} onClick={() => run(
                    () => orderApi.cancel(selected.id), 'Unable to cancel order.')}>
                    <XCircle size={16} /> Cancel
                  </button>
                </div>
              </div>

              <div className="orders-content-grid">
                <div>
                  <div className="orders-section-title"><h3>Order items</h3><strong>{money(selected.total)}</strong></div>
                  <div className="orders-items">
                    {selected.items.length === 0 && <p className="orders-empty">Add dishes from the menu below.</p>}
                    {selected.items.map((item) => {
                      const target = nextStatus(item)
                      return (
                        <article className={`orders-item orders-item--${item.status.toLowerCase()}`} key={item.id}>
                          <img src={item.menuItemImageUrl || '/favicon.svg'} alt="" />
                          <div className="orders-item-main">
                            <strong>{item.menuItemName}</strong>
                            {['DRAFT', 'CONFIRMED'].includes(item.status) ? (
                              <input
                                className="orders-item-note"
                                defaultValue={item.note || ''}
                                placeholder="Special request"
                                onBlur={(event) => {
                                  const note = event.target.value.trim() || null
                                  if (note !== item.note) run(
                                    () => orderApi.updateItem(selected.id, item.id, { quantity: item.quantity, note }),
                                    'Unable to save item note.')
                                }}
                              />
                            ) : <small>{item.note || 'No special request'}</small>}
                            <span className="orders-item-status">{statusLabels[item.status]}</span>
                          </div>
                          <div className="orders-quantity">
                            <button type="button" disabled={busy || !['DRAFT', 'CONFIRMED'].includes(item.status) || item.quantity <= 1}
                              onClick={() => run(() => orderApi.updateItem(selected.id, item.id, { quantity: item.quantity - 1, note: item.note }), 'Unable to update quantity.')}>
                              <Minus size={14} />
                            </button>
                            <b>{item.quantity}</b>
                            <button type="button" disabled={busy || !['DRAFT', 'CONFIRMED'].includes(item.status)}
                              onClick={() => run(() => orderApi.updateItem(selected.id, item.id, { quantity: item.quantity + 1, note: item.note }), 'Unable to update quantity.')}>
                              <Plus size={14} />
                            </button>
                          </div>
                          <strong>{money(item.lineTotal)}</strong>
                          {target ? (
                            <button type="button" className="orders-next-button" disabled={busy}
                              onClick={() => run(() => orderApi.updateItemStatus(selected.id, item.id, target), 'Unable to update item status.')}>
                              {target.replace('_', ' ')}
                            </button>
                          ) : (
                            <button type="button" className="orders-trash-button" disabled={busy || !['DRAFT', 'CONFIRMED'].includes(item.status)}
                              onClick={() => run(() => orderApi.removeItem(selected.id, item.id), 'Unable to remove item.')}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </article>
                      )
                    })}
                  </div>

                  <div className="orders-primary-actions">
                    <button type="button" className="orders-button orders-button--primary" disabled={busy || !selected.items.some((item) => item.status === 'DRAFT')}
                      onClick={() => run(() => orderApi.submit(selected.id), 'Unable to submit order.')}>
                      <Send size={17} /> Submit draft items
                    </button>
                    <button type="button" className="orders-button orders-button--success" disabled={busy || selected.serviceStatus !== 'SERVED' || selected.paymentStatus !== 'PAID'}
                      onClick={() => run(() => orderApi.close(selected.id), 'Unable to close order.')}>
                      <Check size={17} /> Close order
                    </button>
                  </div>

                  <div className="orders-menu-toolbar">
                    <div className="orders-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dishes" /></div>
                    <div className="orders-categories">{categories.map((name) => (
                      <button type="button" key={name} className={category === name ? 'is-active' : ''} onClick={() => setCategory(name)}>{name}</button>
                    ))}</div>
                  </div>
                  <div className="orders-menu-grid">
                    {availableMenu.map((item) => (
                      <article key={item.id}>
                        <img src={item.imageUrl || '/favicon.svg'} alt="" />
                        <div><small>{item.category}</small><strong>{item.name}</strong><span>{money(item.price)}</span></div>
                        <button type="button" disabled={busy} onClick={() => run(
                          () => orderApi.addItem(selected.id, { menuItemId: item.id, quantity: 1, note: null }),
                          'Unable to add dish.')}><Plus size={16} /> Add</button>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className="orders-qr-card">
                  <span><QrCode size={17} /> Guest ordering QR</span>
                  {qrDataUrl && <img src={qrDataUrl} alt="Guest order QR code" />}
                  <p>Guests can scan this code to add and submit more dishes while the order is open.</p>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>
    </section>
  )
}

export default OrdersServiceScreen
