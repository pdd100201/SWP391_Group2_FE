import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChefHat,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { menuService } from '../../menu/services/menuService'
import { getAllReservations } from '../../reservations/api/reservationApi'
import { orderApi } from '../api/orderApi'
import { usePagination } from '../../../shared/hooks/usePagination'
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

const ORDERS_PER_PAGE = 6
const ORDER_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

// Đồng bộ với điều kiện Active Orders ở backend để cập nhật UI ngay sau mỗi thao tác.
const isActiveOrder = (order) => {
  if (order.status !== 'OPEN') return false
  const serviceInProgress = order.serviceStatus !== 'SERVED'
  const paymentOutstanding = Number(order.total) > 0 && order.paymentStatus !== 'PAID'
  return serviceInProgress || paymentOutstanding
}

const matchesOrderFilter = (order, filter) => {
  if (filter === 'ALL') return true
  if (filter === 'ACTIVE') return isActiveOrder(order)
  return order.status === filter
}

const newestFirst = (left, right) => {
  const leftTime = Date.parse(left.createdAt || left.createdDate || '') || 0
  const rightTime = Date.parse(right.createdAt || right.createdDate || '') || 0
  if (leftTime !== rightTime) return rightTime - leftTime
  return Number(right.id || 0) - Number(left.id || 0)
}

function OrdersServiceScreen() {
  const [orders, setOrders] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [menu, setMenu] = useState([])
  const [reservations, setReservations] = useState([])
  const [reservationId, setReservationId] = useState('')
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [orderFilter, setOrderFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const sortedOrders = useMemo(() => [...orders].sort(newestFirst), [orders])
  const filteredOrders = useMemo(
    () => sortedOrders.filter((order) => matchesOrderFilter(order, orderFilter)),
    [sortedOrders, orderFilter]
  )
  const pagination = usePagination(filteredOrders, ORDERS_PER_PAGE)
  const selected = filteredOrders.find((order) => order.id === selectedId) || null
  const activeOrderCount = useMemo(() => orders.filter(isActiveOrder).length, [orders])
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
        // The unified workspace loads full history, then applies status filters and pagination locally.
        orderApi.getAll(false),
        menuService.getAll(),
        getAllReservations(),
      ])
      const nextOrders = [...(ordersResponse.data || [])].sort(newestFirst)
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
  }, [])

  useEffect(() => {
    // Initial data synchronization with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const applyOrder = (next) => {
    const isNewOrder = !orders.some((order) => order.id === next.id)
    const remainsVisible = matchesOrderFilter(next, orderFilter)
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
      const exists = current.some((order) => order.id === next.id)
      return exists ? current.map((order) => order.id === next.id ? next : order) : [next, ...current]
    })
    if (remainsVisible) setSelectedId(next.id)
    else setSelectedId((current) => current === next.id ? null : current)
    if (isNewOrder || !remainsVisible) pagination.setPage(0)
  }

  const changeOrderFilter = (nextFilter) => {
    setOrderFilter(nextFilter)
    pagination.setPage(0)
    setSelectedId(sortedOrders.find((order) => matchesOrderFilter(order, nextFilter))?.id || null)
  }

  const changePage = (nextPage) => {
    pagination.setPage(nextPage)
    setSelectedId(filteredOrders[nextPage * ORDERS_PER_PAGE]?.id || null)
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
    if (!['ADMIN', 'MANAGER', 'WAITER'].includes(role)) return null
    if (item.status === 'CONFIRMED') return 'PREPARING'
    if (item.status === 'PREPARING') return 'READY'
    if (item.status === 'READY') return 'SERVED'
    return null
  }

  if (loading) return <div className="orders-loading">Loading order workspace...</div>

  return (
    <section className="orders-screen">
      <header className="orders-header">
        <div>
          <span className="orders-eyebrow"><ChefHat size={15} /> Orders &amp; Service</span>
          <h1>Order management</h1>
          <p>Create orders and manage the complete order history across every status.</p>
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
          <div className="orders-panel-title">
            <ClipboardList size={18} /> Orders <span>{filteredOrders.length}</span>
          </div>
          <div className="orders-filter-tabs" aria-label="Order filters">
            {ORDER_FILTERS.map((filter) => (
              <button
                type="button"
                key={filter.value}
                className={orderFilter === filter.value ? 'is-active' : ''}
                onClick={() => changeOrderFilter(filter.value)}
              >
                {filter.label}{filter.value === 'ACTIVE' ? ` (${activeOrderCount})` : ''}
              </button>
            ))}
          </div>
          <div className="orders-list-cards">
            {filteredOrders.length === 0 ? <p className="orders-empty">No orders found.</p> : pagination.currentItems.map((order) => (
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
          </div>
          {pagination.totalPages > 1 && (
            <nav className="orders-pagination" aria-label="Order pages">
              <small>{pagination.startIdx}-{pagination.endIdx} of {pagination.totalElements}</small>
              <div>
                <button type="button" disabled={pagination.isFirst} onClick={() => changePage(0)} aria-label="First page"><ChevronFirst size={15} /></button>
                <button type="button" disabled={pagination.isFirst} onClick={() => changePage(pagination.page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
                {pagination.getPageNumbers().map((pageNumber) => (
                  <button type="button" key={pageNumber} className={pagination.page === pageNumber ? 'is-active' : ''} onClick={() => changePage(pageNumber)}>
                    {pageNumber + 1}
                  </button>
                ))}
                <button type="button" disabled={pagination.isLast} onClick={() => changePage(pagination.page + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
                <button type="button" disabled={pagination.isLast} onClick={() => changePage(pagination.totalPages - 1)} aria-label="Last page"><ChevronLast size={15} /></button>
              </div>
            </nav>
          )}
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
                  {selected.status === 'OPEN' && selected.paymentStatus !== 'PAID' && <button
                    type="button"
                    className="orders-button orders-button--primary"
                    onClick={() => navigate(`/dashboard/orders-service/${selected.id}/payment`)}
                  >
                    <CreditCard size={16} /> Payment
                  </button>}
                  {selected.status === 'OPEN' && <button type="button" className="orders-button orders-button--danger" disabled={busy} onClick={() => run(
                    () => orderApi.cancel(selected.id), 'Unable to cancel order.')}>
                    <XCircle size={16} /> Cancel
                  </button>}
                </div>
              </div>

              <div className="orders-content-grid">
                <div>
                  <div className="orders-section-title"><h3>Order items</h3><strong>{money(selected.total)}</strong></div>
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
                    <button type="button" className="orders-button orders-button--success" disabled={busy || selected.serviceStatus !== 'SERVED' || selected.paymentStatus !== 'PAID'}
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
