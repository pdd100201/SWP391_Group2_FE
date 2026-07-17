import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChefHat,
  ClipboardList,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react'
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

// Đồng bộ với điều kiện Active Orders ở backend để cập nhật UI ngay sau mỗi thao tác.
const isActiveOrder = (order) => {
  if (order.status !== 'OPEN') return false
  const serviceInProgress = order.serviceStatus !== 'SERVED'
  const paymentOutstanding = Number(order.total) > 0 && order.paymentStatus !== 'PAID'
  return serviceInProgress || paymentOutstanding
}

function OrdersServiceScreen({ activeView = false }) {
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
  const [promotionCode, setPromotionCode] = useState('')

  const selected = orders.find((order) => order.id === selectedId) || null
  const paymentStatus = selected?.paymentStatus || 'NOT_CREATED'
  const canCreatePayment = selected?.serviceStatus === 'SERVED'
    && Number(selected?.total || 0) > 0
    && !['PENDING', 'PAID'].includes(paymentStatus)
  const canCloseOrder = selected?.serviceStatus === 'SERVED' && paymentStatus === 'PAID'
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
    reservation.status === 'ARRIVED'
      && (reservation.tableId || reservation.tableIds?.length)
      && !reservation.orderId
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ordersResponse, menuResponse, reservationsResponse] = await Promise.all([
        // Order Management lấy toàn bộ lịch sử; Active Orders yêu cầu backend lọc nghiệp vụ.
        orderApi.getAll(activeView),
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
  }, [activeView])

  useEffect(() => {
    // Initial data synchronization with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

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
      if (activeView && !isActiveOrder(next)) return current.filter((order) => order.id !== next.id)
      const exists = current.some((order) => order.id === next.id)
      return exists ? current.map((order) => order.id === next.id ? next : order) : [next, ...current]
    })
    if (!activeView || isActiveOrder(next)) setSelectedId(next.id)
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

  const applyPromotion = () => {
    if (!selected || !promotionCode.trim()) return
    run(() => orderApi.applyPromotion(selected.id, promotionCode.trim()), 'Unable to apply promotion.')
      .then(() => setPromotionCode(''))
  }

  const removePromotion = () => {
    if (!selected) return
    run(() => orderApi.removePromotion(selected.id), 'Unable to remove promotion.')
  }

  const createPayment = () => {
    if (!selected) return
    run(() => orderApi.createPayment(selected.id), 'Unable to create SePay payment QR.')
  }

  const nextStatus = (item) => {
    if (['ADMIN', 'MANAGER'].includes(role) && item.status === 'CONFIRMED') return 'PREPARING'
    if (['ADMIN', 'MANAGER'].includes(role) && item.status === 'PREPARING') return 'READY'
    if (['ADMIN', 'MANAGER', 'WAITER'].includes(role) && item.status === 'READY') return 'SERVED'
    return null
  }

  if (loading) return <div className="orders-loading">Loading order workspace...</div>

  return (
    <section className="orders-screen">
      <header className="orders-header">
        <div>
          <span className="orders-eyebrow"><ChefHat size={15} /> Orders &amp; Service</span>
          <h1>{activeView ? 'Active orders' : 'Order management'}</h1>
          <p>{activeView
            ? 'Orders still being served or waiting for payment.'
            : 'Create orders and manage the complete order history across every status.'}</p>
        </div>
        <button type="button" className="orders-button orders-button--secondary" onClick={load} disabled={busy}>
          <RefreshCw size={17} /> Refresh
        </button>
      </header>

      {error && <div className="orders-alert">{error}</div>}

      {!activeView && <div className="orders-create-bar">
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
      </div>}

      <div className="orders-workspace">
        <aside className="orders-list-panel">
          <div className="orders-panel-title">
            <ClipboardList size={18} /> {activeView ? 'Active orders' : 'All orders'} <span>{orders.length}</span>
          </div>
          {orders.length === 0 ? <p className="orders-empty">{activeView ? 'No active orders.' : 'No orders found.'}</p> : orders.map((order) => (
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
              <span className={`orders-payment-badge orders-payment-badge--${(order.paymentStatus || 'unpaid').toLowerCase()}`}>
                {order.paymentStatus || 'UNPAID'}
              </span>
              <b>{money(order.total)}</b>
            </button>
          ))}
        </aside>

        <main className="orders-detail-panel">
          {!selected ? <div className="orders-empty orders-empty--large">Select an order to view its details.</div> : (
            <>
              <div className="orders-detail-head">
                <div>
                  <h2>{selected.orderCode}</h2>
                  <p>Reservation #{selected.reservationId} - {selected.reservationGuestName} - {tableLabel(selected)} - Waiter {selected.waiterName}</p>
                  <div className="orders-detail-statuses">
                    <span className={`orders-order-badge orders-order-badge--${selected.status.toLowerCase()}`}>{selected.status}</span>
                    <span className={`orders-payment-badge orders-payment-badge--${(selected.paymentStatus || 'unpaid').toLowerCase()}`}>
                      {selected.paymentStatus || 'UNPAID'}
                    </span>
                  </div>
                </div>
                <div className="orders-detail-actions">
                  {selected.status === 'OPEN' && <button type="button" className="orders-button orders-button--danger" disabled={busy} onClick={() => run(
                    () => orderApi.cancel(selected.id), 'Unable to cancel order.')}>
                    <XCircle size={16} /> Cancel
                  </button>}
                </div>
              </div>

              <div className="orders-content-grid">
                <div>
                  <div className="orders-section-title"><h3>Order items</h3><strong>{money(selected.total)}</strong></div>
                  {selected.status === 'OPEN' && <>
                    <div className="orders-promotion-box">
                      <div className="orders-promotion-form">
                        <Tag size={17} />
                        <input
                          value={promotionCode}
                          onChange={(event) => setPromotionCode(event.target.value)}
                          placeholder="Enter promotion code"
                        />
                        <button
                          type="button"
                          className="orders-button orders-button--secondary"
                          disabled={busy || !promotionCode.trim()}
                          onClick={applyPromotion}
                        >
                          Apply
                        </button>
                      </div>
                      {selected.promotionCode ? (
                        <div className="orders-applied-promo">
                          <span>Applied: <strong>{selected.promotionCode}</strong> {selected.promotionName ? `- ${selected.promotionName}` : ''}</span>
                          <button type="button" disabled={busy} onClick={removePromotion}>Remove</button>
                        </div>
                      ) : null}
                      <div className="orders-bill-summary">
                        <span>Subtotal <strong>{money(selected.subtotal ?? selected.total)}</strong></span>
                        <span>Discount <strong>-{money(selected.discountAmount || 0)}</strong></span>
                        <span>Total <strong>{money(selected.total)}</strong></span>
                      </div>
                    </div>
                    <section className={`orders-payment-box ${paymentStatus === 'PAID' ? 'orders-payment-box--paid' : ''}`}>
                      <div className="orders-payment-head">
                        <span><CreditCard size={17} /> SePay payment</span>
                        <strong>{paymentStatus.replace('_', ' ')}</strong>
                      </div>
                      {selected.paymentCode ? (
                        <div className="orders-payment-info">
                          <span>Transfer content: <strong>{selected.paymentCode}</strong></span>
                          <span>Amount: <strong>{money(selected.total)}</strong></span>
                        </div>
                      ) : (
                        <p className="orders-payment-note">The QR can be created after every dish has been served.</p>
                      )}
                      {selected.paymentQrImageUrl ? (
                        <img className="orders-sepay-qr" src={selected.paymentQrImageUrl} alt="SePay payment QR" />
                      ) : null}
                      {paymentStatus === 'PAID' ? (
                        <div className="orders-payment-paid">Payment received.</div>
                      ) : (
                        <button
                          type="button"
                          className="orders-button orders-button--primary"
                          disabled={busy || !canCreatePayment}
                          onClick={createPayment}
                        >
                          <QrCode size={17} /> Create SePay QR
                        </button>
                      )}
                    </section>
                  </>}
                  <div className="orders-items">
                    {selected.items.length === 0 && <p className="orders-empty">
                      {selected.status === 'OPEN' ? 'Add dishes from the menu below.' : 'This order has no items.'}
                    </p>}
                    {selected.items.map((item) => {
                      const target = nextStatus(item)
                      return (
                        <article className={`orders-item orders-item--${item.status.toLowerCase()}`} key={item.id}>
                          <img src={item.menuItemImageUrl || '/favicon.svg'} alt="" />
                          <div className="orders-item-main">
                            <strong>{item.menuItemName}</strong>
                            {selected.status === 'OPEN' && ['DRAFT', 'CONFIRMED'].includes(item.status) ? (
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
                            <button type="button" disabled={busy || selected.status !== 'OPEN' || !['DRAFT', 'CONFIRMED'].includes(item.status) || item.quantity <= 1}
                              onClick={() => run(() => orderApi.updateItem(selected.id, item.id, { quantity: item.quantity - 1, note: item.note }), 'Unable to update quantity.')}>
                              <Minus size={14} />
                            </button>
                            <b>{item.quantity}</b>
                            <button type="button" disabled={busy || selected.status !== 'OPEN' || !['DRAFT', 'CONFIRMED'].includes(item.status)}
                              onClick={() => run(() => orderApi.updateItem(selected.id, item.id, { quantity: item.quantity + 1, note: item.note }), 'Unable to update quantity.')}>
                              <Plus size={14} />
                            </button>
                          </div>
                          <strong>{money(item.lineTotal)}</strong>
                          {selected.status === 'OPEN' && target ? (
                            <button type="button" className="orders-next-button" disabled={busy}
                              onClick={() => run(() => orderApi.updateItemStatus(selected.id, item.id, target), 'Unable to update item status.')}>
                              {target.replace('_', ' ')}
                            </button>
                          ) : (
                            <button type="button" className="orders-trash-button" disabled={busy || selected.status !== 'OPEN' || !['DRAFT', 'CONFIRMED'].includes(item.status)}
                              onClick={() => run(() => orderApi.removeItem(selected.id, item.id), 'Unable to remove item.')}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </article>
                      )
                    })}
                  </div>

                  {selected.status === 'OPEN' && <div className="orders-primary-actions">
                    <button type="button" className="orders-button orders-button--primary" disabled={busy || !selected.items.some((item) => item.status === 'DRAFT')}
                      onClick={() => run(() => orderApi.submit(selected.id), 'Unable to submit order.')}>
                      <Send size={17} /> Submit draft items
                    </button>
                    <button type="button" className="orders-button orders-button--success" disabled={busy || !canCloseOrder}
                      onClick={() => run(() => orderApi.close(selected.id), 'Unable to close order.')}>
                      <Check size={17} /> Close order
                    </button>
                  </div>}

                  {selected.status === 'OPEN' && <>
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
                  </>}
                </div>

              </div>
            </>
          )}
        </main>
      </div>
    </section>
  )
}

export default OrdersServiceScreen
