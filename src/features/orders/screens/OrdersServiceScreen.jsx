import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRightLeft,
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
import { usePagination } from '../../../shared/hooks/usePagination'
import { orderApi } from '../api/orderApi'
import './OrdersServiceScreen.css'

const GROUPS_PER_PAGE = 6
const GROUP_FILTERS = [
  { value: 'ACTIVE', label: 'Current' },
  { value: 'OPEN', label: 'Open' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ALL', label: 'All history' },
]

const itemStatusLabels = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  CANCELLED: 'Cancelled',
}

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} ₫`
const statusClass = (value) => String(value || 'unknown').toLowerCase().replaceAll('_', '-')
const errorMessage = (error, fallback) => error.response?.data?.message || fallback
const groupDate = (group) => Date.parse(group.createdAt || '') || 0
const tableLabel = (value) => {
  if (!value?.tableId && !value?.tableNumber && !value?.tableName) return 'No table assigned'
  if (value.tableNumber && value.tableName && value.tableNumber !== value.tableName) {
    return `${value.tableNumber} - ${value.tableName}`
  }
  return value.tableName || value.tableNumber || `Table ${value.tableId}`
}

const reservationTablesLabel = (reservation) => {
  const names = Array.isArray(reservation?.tableNames) ? reservation.tableNames.filter(Boolean) : []
  const numbers = Array.isArray(reservation?.tableNumbers) ? reservation.tableNumbers.filter(Boolean) : []
  if (names.length) return names.join(', ')
  if (numbers.length) return numbers.join(', ')
  return tableLabel(reservation)
}

const normalizeGroup = (group) => ({
  ...group,
  orders: [...(group?.orders || [])].sort((left, right) => (
    String(left.tableNumber || left.tableName || left.tableId || '')
      .localeCompare(String(right.tableNumber || right.tableName || right.tableId || ''), undefined, { numeric: true })
  )),
})

const groupItems = (group) => (group?.orders || [])
  .filter((order) => order.status !== 'CANCELLED')
  .flatMap((order) => order.items || [])
const activeItems = (group) => groupItems(group).filter((item) => item.status !== 'CANCELLED')
const allItemsServed = (group) => activeItems(group).every((item) => item.status === 'SERVED')
const groupSubtotal = (group) => Number(group?.bill?.subtotal ?? group?.subtotal ?? 0)
const groupTotal = (group) => Number(group?.bill?.total ?? group?.subtotal ?? 0)

const orderServiceInProgress = (order) => {
  if (order.status !== 'OPEN') return false
  if (order.serviceStatus) return order.serviceStatus !== 'SERVED'

  const items = order.items || []
  const nonCancelledItems = items.filter((item) => item.status !== 'CANCELLED')
  return items.length === 0 || nonCancelledItems.some((item) => item.status !== 'SERVED')
}

const isActiveGroup = (group) => {
  if (group.reservationStatus !== 'ARRIVED') return false
  const serviceInProgress = (group.orders || []).some(orderServiceInProgress)
  const paymentOutstanding = Boolean(group.bill)
    && groupSubtotal(group) > 0
    && group.bill.status !== 'PAID'
  return serviceInProgress || paymentOutstanding
}

const matchesFilter = (group, filter) => {
  if (filter === 'ALL') return true
  if (filter === 'ACTIVE') return isActiveGroup(group)
  if (filter === 'OPEN') return (group.orders || []).some((order) => order.status === 'OPEN')
  if (filter === 'COMPLETED') {
    return group.reservationStatus === 'COMPLETED'
      || ((group.orders || []).length > 0 && group.orders.every((order) => order.status === 'CLOSED'))
  }
  return group.reservationStatus === 'CANCELLED'
    || ((group.orders || []).length > 0 && group.orders.every((order) => order.status === 'CANCELLED'))
}

const normalizeSearchTerm = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

const matchesGroupSearch = (group, rawTerm) => {
  const term = normalizeSearchTerm(rawTerm).trim()
  if (!term) return true

  const searchableValues = [
    group.reservationId,
    group.reservationGuestName,
    group.reservationStatus,
    group.bill?.id,
    group.bill?.billCode,
    group.bill?.status,
    group.bill?.paymentCode,
    group.bill?.paymentStatus,
    group.bill?.paymentProvider,
    ...(group.orders || []).flatMap((order) => [
      order.id,
      order.orderCode,
      order.tableId,
      order.tableNumber,
      order.tableName,
      order.waiterName,
      order.status,
      order.serviceStatus,
      ...(order.items || []).flatMap((item) => [
        item.menuItemName,
        item.category,
        item.status,
      ]),
    ]),
  ]

  return normalizeSearchTerm(searchableValues.join(' ')).includes(term)
}

function OrdersServiceScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [routeTarget] = useState(() => ({
    reservationId: Number(searchParams.get('reservationId')) || null,
    orderId: Number(searchParams.get('orderId')) || null,
    tableId: Number(searchParams.get('tableId')) || null,
    filter: GROUP_FILTERS.some(({ value }) => value === String(searchParams.get('filter') || '').toUpperCase())
      ? String(searchParams.get('filter')).toUpperCase()
      : 'ACTIVE',
  }))
  const [groups, setGroups] = useState([])
  const [activeReservationIds, setActiveReservationIds] = useState(() => new Set())
  const [selectedReservationId, setSelectedReservationId] = useState(routeTarget.reservationId)
  const [selectedOrderId, setSelectedOrderId] = useState(routeTarget.orderId)
  const [menu, setMenu] = useState([])
  const [reservations, setReservations] = useState([])
  const [reservationId, setReservationId] = useState('')
  const [category, setCategory] = useState('All')
  const [dishSearch, setDishSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState(routeTarget.filter)
  const [transferTarget, setTransferTarget] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const role = String(sessionStorage.getItem('role') || '').replace('ROLE_', '')
  const sortedGroups = useMemo(
    () => [...groups].sort((left, right) => groupDate(right) - groupDate(left) || Number(right.reservationId) - Number(left.reservationId)),
    [groups]
  )
  const filteredGroups = useMemo(
    () => sortedGroups.filter((group) => (
      matchesGroupSearch(group, orderSearch)
      && (groupFilter === 'ACTIVE'
        ? activeReservationIds.has(Number(group.reservationId))
        : matchesFilter(group, groupFilter))
    )),
    [activeReservationIds, groupFilter, orderSearch, sortedGroups]
  )
  const pagination = usePagination(filteredGroups, GROUPS_PER_PAGE)
  const setOrdersPage = pagination.setPage
  const selectedGroup = groups.find((group) => group.reservationId === selectedReservationId) || null
  const selectedOrder = selectedGroup?.orders.find((order) => order.id === selectedOrderId)
    || selectedGroup?.orders[0]
    || null
  const bill = selectedGroup?.bill || null
  const billStatus = bill?.status || 'DRAFT'
  const billEditable = billStatus === 'DRAFT'
  const canComplete = selectedGroup?.reservationStatus === 'ARRIVED'
    && billStatus === 'PAID'
    && allItemsServed(selectedGroup)
  const activeGroupCount = activeReservationIds.size

  const categories = useMemo(
    () => ['All', ...new Set(menu.map((item) => item.category).filter(Boolean))],
    [menu]
  )
  const availableMenu = useMemo(() => menu.filter((item) => {
    const available = item.isActive && ['AVAILABLE', 'LIMITED'].includes(item.availability)
    const categoryMatches = category === 'All' || item.category === category
    const searchMatches = item.name?.toLowerCase().includes(dishSearch.trim().toLowerCase())
    return available && categoryMatches && searchMatches
  }), [category, dishSearch, menu])
  const groupsByReservationId = useMemo(
    () => new Map(groups.map((group) => [Number(group.reservationId), group])),
    [groups]
  )
  const reservationsNeedingOrders = reservations.filter((reservation) => {
    if (reservation.status !== 'ARRIVED') return false
    const assignedTableIds = Array.isArray(reservation.tableIds) && reservation.tableIds.length
      ? reservation.tableIds.map(Number)
      : [Number(reservation.tableId)].filter(Boolean)
    if (!assignedTableIds.length) return false
    const group = groupsByReservationId.get(Number(reservation.reservationId))
    const orderTableIds = new Set((group?.orders || []).map((order) => Number(order.tableId)))
    return assignedTableIds.some((tableId) => !orderTableIds.has(tableId))
  })

  const upsertGroup = useCallback((rawGroup) => {
    const next = normalizeGroup(rawGroup)
    setGroups((current) => {
      const exists = current.some((group) => group.reservationId === next.reservationId)
      return exists
        ? current.map((group) => group.reservationId === next.reservationId ? next : group)
        : [next, ...current]
    })
    setActiveReservationIds((current) => {
      const updated = new Set(current)
      const reservationKey = Number(next.reservationId)
      if (isActiveGroup(next)) updated.add(reservationKey)
      else updated.delete(reservationKey)
      return updated
    })
    setSelectedReservationId(next.reservationId)
    setSelectedOrderId((current) => next.orders.some((order) => order.id === current)
      ? current
      : next.orders[0]?.id || null)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [groupsResponse, activeGroupsResponse, menuResponse, reservationsResponse] = await Promise.all([
        orderApi.getGroups(false),
        orderApi.getGroups(true),
        menuService.getAll(),
        getAllReservations(),
      ])
      const nextGroups = (groupsResponse.data || []).map(normalizeGroup)
      const nextActiveReservationIds = new Set(
        (activeGroupsResponse.data || []).map((group) => Number(group.reservationId))
      )
      setGroups(nextGroups)
      setActiveReservationIds(nextActiveReservationIds)
      setMenu(menuResponse.data || [])
      setReservations(reservationsResponse.data || [])

      const nextSortedGroups = [...nextGroups].sort((left, right) => (
        groupDate(right) - groupDate(left) || Number(right.reservationId) - Number(left.reservationId)
      ))
      const requestedGroup = nextSortedGroups.find((group) => (
        routeTarget.orderId && (group.orders || []).some((order) => Number(order.id) === routeTarget.orderId)
      )) || nextSortedGroups.find((group) => (
        Number(group.reservationId) === routeTarget.reservationId
      )) || nextSortedGroups.find((group) => (
        routeTarget.tableId && (group.orders || []).some((order) => Number(order.tableId) === routeTarget.tableId)
      ))
      const requestedGroupMatchesFilter = !requestedGroup
        || (routeTarget.filter === 'ACTIVE'
          ? nextActiveReservationIds.has(Number(requestedGroup.reservationId))
          : matchesFilter(requestedGroup, routeTarget.filter))
      const nextFilter = requestedGroupMatchesFilter ? routeTarget.filter : 'ALL'
      const nextVisibleGroups = nextSortedGroups.filter((group) => (
        nextFilter === 'ACTIVE'
          ? nextActiveReservationIds.has(Number(group.reservationId))
          : matchesFilter(group, nextFilter)
      ))
      const nextGroup = requestedGroup || nextVisibleGroups[0] || null
      const selectedGroupIndex = nextVisibleGroups.findIndex((group) => (
        Number(group.reservationId) === Number(nextGroup?.reservationId)
      ))
      setGroupFilter(nextFilter)
      setOrdersPage(selectedGroupIndex < 0 ? 0 : Math.floor(selectedGroupIndex / GROUPS_PER_PAGE))
      setSelectedReservationId(nextGroup?.reservationId || null)
      const requestedOrder = nextGroup?.orders.find((order) => (
        Number(order.id) === routeTarget.orderId || Number(order.tableId) === routeTarget.tableId
      ))
      setSelectedOrderId(requestedOrder?.id || nextGroup?.orders[0]?.id || null)
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load the order workspace.'))
    } finally {
      setLoading(false)
    }
  }, [routeTarget, setOrdersPage])

  useEffect(() => {
    // Initial synchronization with the grouped Order API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const refreshGroup = useCallback(async (targetReservationId) => {
    const response = await orderApi.getGroup(targetReservationId)
    upsertGroup(response.data)
    return response.data
  }, [upsertGroup])

  const run = async (action, fallback, targetReservationId = selectedGroup?.reservationId) => {
    setBusy(true)
    setError('')
    try {
      await action()
      if (targetReservationId) await refreshGroup(targetReservationId)
      return true
    } catch (actionError) {
      setError(errorMessage(actionError, fallback))
      return false
    } finally {
      setBusy(false)
    }
  }

  const createOrders = async () => {
    if (!reservationId) return
    setBusy(true)
    setError('')
    try {
      const response = await orderApi.create({ reservationId: Number(reservationId) })
      upsertGroup(response.data)
      setReservationId('')
      setOrderSearch('')
      setGroupFilter('ACTIVE')
      pagination.setPage(0)
    } catch (actionError) {
      setError(errorMessage(actionError, 'Unable to create table orders.'))
    } finally {
      setBusy(false)
    }
  }

  const selectGroup = (group) => {
    setSelectedReservationId(group.reservationId)
    setSelectedOrderId(group.orders[0]?.id || null)
    setTransferTarget('')
  }

  const changeFilter = (nextFilter) => {
    setGroupFilter(nextFilter)
    pagination.setPage(0)
    const first = sortedGroups.find((group) => (
      nextFilter === 'ACTIVE'
        ? activeReservationIds.has(Number(group.reservationId))
        : matchesFilter(group, nextFilter)
    ))
    if (first) selectGroup(first)
    else {
      setSelectedReservationId(null)
      setSelectedOrderId(null)
    }
  }

  const changeOrderSearch = (value) => {
    const nextFilter = value.trim() ? 'ALL' : 'ACTIVE'
    const nextGroups = sortedGroups.filter((group) => (
      matchesGroupSearch(group, value)
      && (nextFilter === 'ACTIVE'
        ? activeReservationIds.has(Number(group.reservationId))
        : matchesFilter(group, nextFilter))
    ))

    setOrderSearch(value)
    setGroupFilter(nextFilter)
    pagination.setPage(0)
    if (nextGroups[0]) selectGroup(nextGroups[0])
    else {
      setSelectedReservationId(null)
      setSelectedOrderId(null)
    }
  }

  const changePage = (nextPage) => {
    pagination.setPage(nextPage)
    const next = filteredGroups[nextPage * GROUPS_PER_PAGE]
    if (next) selectGroup(next)
  }

  const nextItemStatus = (item) => {
    if (!['ADMIN', 'MANAGER', 'WAITER'].includes(role)) return null
    if (item.status === 'CONFIRMED') return 'PREPARING'
    if (item.status === 'PREPARING') return 'READY'
    if (item.status === 'READY') return 'SERVED'
    return null
  }

  const transferOrder = async () => {
    const targetTableId = Number(transferTarget)
    if (!selectedOrder || !Number.isInteger(targetTableId) || targetTableId <= 0) return
    const succeeded = await run(
      () => orderApi.transferTable(selectedOrder.id, targetTableId),
      'Unable to transfer this order.'
    )
    if (succeeded) setTransferTarget('')
  }

  if (loading) return <div className="orders-loading">Loading order workspace...</div>

  return (
    <section className="orders-screen">
      <header className="orders-header">
        <div>
          <span className="orders-eyebrow"><ChefHat size={15} /> Orders &amp; Service</span>
          <h1>Order management</h1>
          <p>Manage every reservation, its table orders, and one shared bill.</p>
        </div>
        <button type="button" className="orders-button orders-button--secondary" onClick={load} disabled={busy}>
          <RefreshCw size={17} /> Refresh
        </button>
      </header>

      {error ? <div className="orders-alert">{error}</div> : null}

      <div className="orders-create-bar">
        <label className="orders-reservation-field">
          <span>Checked-in reservation</span>
          <select value={reservationId} onChange={(event) => setReservationId(event.target.value)}>
            <option value="">Choose a reservation with missing table orders</option>
            {reservationsNeedingOrders.map((reservation) => (
              <option key={reservation.reservationId} value={reservation.reservationId}>
                #{reservation.reservationId} - {reservation.fullName} - {reservationTablesLabel(reservation)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="orders-button orders-button--primary" onClick={createOrders} disabled={!reservationId || busy}>
          <Plus size={17} /> Create / sync table orders
        </button>
        <div className={`orders-create-status ${reservationsNeedingOrders.length === 0 ? 'is-complete' : ''}`}>
          {reservationsNeedingOrders.length === 0 ? <Check size={17} /> : <ClipboardList size={17} />}
          <small>
            {reservationsNeedingOrders.length === 0
              ? 'Every checked-in reservation already has its table orders.'
              : `${reservationsNeedingOrders.length} checked-in reservation(s) still need table orders.`}
          </small>
        </div>
      </div>

      <div className="orders-workspace">
        <aside className="orders-list-panel">
          <div className="orders-panel-title">
            <ClipboardList size={18} /> Reservations <span>{filteredGroups.length}</span>
          </div>
          <label className="orders-search orders-group-search">
            <Search size={16} />
            <input
              type="search"
              value={orderSearch}
              onChange={(event) => changeOrderSearch(event.target.value)}
              placeholder="Search all orders"
              aria-label="Search all orders, including paid orders"
            />
          </label>
          <small className="orders-search-hint">
            Paid orders are hidden from Current, but remain searchable.
          </small>
          <div className="orders-filter-tabs" aria-label="Reservation order filters">
            {GROUP_FILTERS.map((filter) => (
              <button
                type="button"
                key={filter.value}
                className={groupFilter === filter.value ? 'is-active' : ''}
                onClick={() => changeFilter(filter.value)}
              >
                {filter.label}{filter.value === 'ACTIVE' ? ` (${activeGroupCount})` : ''}
              </button>
            ))}
          </div>
          <div className="orders-list-cards">
            {pagination.currentItems.length === 0 ? (
              <p className="orders-empty">No reservation orders found.</p>
            ) : pagination.currentItems.map((group) => (
              <button
                type="button"
                key={group.reservationId}
                className={`orders-list-card ${selectedReservationId === group.reservationId ? 'is-active' : ''}`}
                onClick={() => selectGroup(group)}
              >
                <span>
                  <strong>Reservation #{group.reservationId}</strong>
                  <small>{group.reservationGuestName || 'Guest'} · {group.orders.length} table order(s)</small>
                </span>
                <span className="orders-card-tables">
                  {group.orders.map((order) => tableLabel(order)).join(', ') || 'No tables'}
                </span>
                <span className={`orders-payment-badge orders-payment-badge--${statusClass(group.bill?.status || 'draft')}`}>
                  Bill {group.bill?.status || 'DRAFT'}
                </span>
                <b>{money(groupTotal(group))}</b>
              </button>
            ))}
          </div>
          {pagination.totalPages > 1 ? (
            <nav className="orders-pagination" aria-label="Reservation order pages">
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
          ) : null}
        </aside>

        <main className="orders-detail-panel">
          {!selectedGroup ? (
            <div className="orders-empty orders-empty--large">Select a reservation to view its table orders.</div>
          ) : (
            <>
              <div className="orders-detail-head">
                <div>
                  <h2>Reservation #{selectedGroup.reservationId}</h2>
                  <p>{selectedGroup.reservationGuestName || 'Guest'} · {selectedGroup.orders.length} table order(s)</p>
                  <div className="orders-detail-statuses">
                    <span className={`orders-order-badge orders-order-badge--${statusClass(selectedGroup.reservationStatus)}`}>
                      {selectedGroup.reservationStatus}
                    </span>
                    <span className={`orders-payment-badge orders-payment-badge--${statusClass(billStatus)}`}>
                      Bill {billStatus}
                    </span>
                  </div>
                </div>
                <div className="orders-detail-actions">
                  <button
                    type="button"
                    className="orders-button orders-button--success"
                    disabled={busy || !canComplete}
                    onClick={() => run(
                      () => orderApi.completeReservation(selectedGroup.reservationId),
                      'Unable to complete this reservation.'
                    )}
                  >
                    <Check size={17} /> Complete reservation
                  </button>
                </div>
              </div>

              {billStatus !== 'DRAFT' ? (
                <div className="orders-lock-note">
                  Bill is {billStatus}. Dish, table, and promotion changes are locked.
                </div>
              ) : null}

              <div className="orders-content-grid">
                <div className="orders-table-orders">
                  {selectedGroup.orders.map((order) => {
                    const orderEditable = billEditable && order.status === 'OPEN'
                    const isSelected = selectedOrder?.id === order.id
                    return (
                      <section
                        key={order.id}
                        className={`orders-table-order ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <header className="orders-table-order__head">
                          <div>
                            <span className="orders-table-name">{tableLabel(order)}</span>
                            <strong>{order.orderCode}</strong>
                            <small>Waiter {order.waiterName || 'Unassigned'}</small>
                          </div>
                          <div>
                            <span className={`orders-service-badge orders-service-badge--${statusClass(order.serviceStatus)}`}>
                              {String(order.serviceStatus || 'NO ITEMS').replaceAll('_', ' ')}
                            </span>
                            <span className={`orders-order-badge orders-order-badge--${statusClass(order.status)}`}>
                              {order.status}
                            </span>
                            <b>{money(order.subtotal ?? order.total)}</b>
                          </div>
                        </header>

                        <div className="orders-items">
                          {(order.items || []).length === 0 ? (
                            <p className="orders-empty orders-empty--compact">No dishes have been added to this table.</p>
                          ) : order.items.map((item) => {
                            const targetStatus = nextItemStatus(item)
                            const canEditDraft = orderEditable && item.status === 'DRAFT'
                            const canRemove = orderEditable && ['DRAFT', 'CONFIRMED'].includes(item.status)
                            return (
                              <article className={`orders-item orders-item--${statusClass(item.status)}`} key={item.id}>
                                <img src={item.menuItemImageUrl || '/favicon.svg'} alt="" />
                                <div className="orders-item-main">
                                  <strong>{item.menuItemName}</strong>
                                  {canEditDraft ? (
                                    <input
                                      className="orders-item-note"
                                      defaultValue={item.note || ''}
                                      placeholder="Special request"
                                      onBlur={(event) => {
                                        const note = event.target.value.trim()
                                        if (note !== (item.note || '')) run(
                                          () => orderApi.updateItem(order.id, item.id, { quantity: item.quantity, note: note || null }),
                                          'Unable to update the dish note.'
                                        )
                                      }}
                                    />
                                  ) : <small>{item.note || 'No special request'}</small>}
                                  <span className="orders-item-status">{itemStatusLabels[item.status] || item.status}</span>
                                </div>
                                <div className="orders-quantity">
                                  <button
                                    type="button"
                                    disabled={busy || !canEditDraft || item.quantity <= 1}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      run(
                                        () => orderApi.updateItem(order.id, item.id, { quantity: item.quantity - 1, note: item.note }),
                                        'Unable to update the quantity.'
                                      )
                                    }}
                                  ><Minus size={14} /></button>
                                  <b>{item.quantity}</b>
                                  <button
                                    type="button"
                                    disabled={busy || !canEditDraft}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      run(
                                        () => orderApi.updateItem(order.id, item.id, { quantity: item.quantity + 1, note: item.note }),
                                        'Unable to update the quantity.'
                                      )
                                    }}
                                  ><Plus size={14} /></button>
                                </div>
                                <strong>{money(item.lineTotal)}</strong>
                                <div className="orders-item-actions">
                                  {orderEditable && targetStatus ? (
                                    <button
                                      type="button"
                                      className="orders-next-button"
                                      disabled={busy}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        run(
                                          () => orderApi.updateItemStatus(order.id, item.id, targetStatus),
                                          'Unable to update the dish status.'
                                        )
                                      }}
                                    >{itemStatusLabels[targetStatus]}</button>
                                  ) : null}
                                  {canRemove ? (
                                    <button
                                      type="button"
                                      className="orders-trash-button"
                                      disabled={busy}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        run(() => orderApi.removeItem(order.id, item.id), 'Unable to remove the dish.')
                                      }}
                                      aria-label="Remove or cancel dish"
                                    ><Trash2 size={15} /></button>
                                  ) : null}
                                </div>
                              </article>
                            )
                          })}
                        </div>

                        {orderEditable ? (
                          <div className="orders-order-actions" onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              className="orders-button orders-button--primary"
                              disabled={busy || !(order.items || []).some((item) => item.status === 'DRAFT')}
                              onClick={() => run(() => orderApi.submit(order.id), 'Unable to submit draft dishes.')}
                            >
                              <Send size={16} /> Submit draft items
                            </button>
                            <button
                              type="button"
                              className="orders-button orders-button--danger"
                              disabled={busy}
                              onClick={() => run(() => orderApi.cancel(order.id), 'Unable to cancel this table order.')}
                            >
                              <XCircle size={16} /> Cancel table order
                            </button>
                          </div>
                        ) : null}
                      </section>
                    )
                  })}

                  {selectedOrder && billEditable && selectedOrder.status === 'OPEN' ? (
                    <section className="orders-transfer-box">
                      <div>
                        <ArrowRightLeft size={18} />
                        <span>
                          <strong>Transfer {selectedOrder.orderCode}</strong>
                          <small>Enter the target table ID. A table with another order cannot be selected.</small>
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={transferTarget}
                        onChange={(event) => setTransferTarget(event.target.value)}
                        placeholder="Target table ID"
                      />
                      <button type="button" className="orders-button orders-button--secondary" disabled={busy || !transferTarget} onClick={transferOrder}>
                        Transfer
                      </button>
                    </section>
                  ) : null}

                  {selectedOrder && billEditable && selectedOrder.status === 'OPEN' ? (
                    <section className="orders-menu-section">
                      <div className="orders-section-title">
                        <div>
                          <h3>Add dishes to {tableLabel(selectedOrder)}</h3>
                          <small>Dishes are added only to {selectedOrder.orderCode}.</small>
                        </div>
                      </div>
                      <div className="orders-menu-toolbar">
                        <label className="orders-search">
                          <Search size={16} />
                          <input value={dishSearch} onChange={(event) => setDishSearch(event.target.value)} placeholder="Search dishes" />
                        </label>
                        <div className="orders-categories">
                          {categories.map((itemCategory) => (
                            <button
                              type="button"
                              key={itemCategory}
                              className={category === itemCategory ? 'is-active' : ''}
                              onClick={() => setCategory(itemCategory)}
                            >
                              {itemCategory}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="orders-menu-grid">
                        {availableMenu.map((item) => (
                          <article key={item.id}>
                            <img src={item.imageUrl || '/favicon.svg'} alt="" />
                            <div><small>{item.category}</small><strong>{item.name}</strong><span>{money(item.price)}</span></div>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => run(
                                () => orderApi.addItem(selectedOrder.id, { menuItemId: item.id, quantity: 1, note: null }),
                                'Unable to add the dish.'
                              )}
                            ><Plus size={16} /> Add</button>
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>

                <aside className="orders-bill-panel">
                  <div className="orders-bill-title">
                    <CreditCard size={18} />
                    <div><strong>Payment</strong><small>Manage bill, discount, cash, and SePay QR on the payment page.</small></div>
                  </div>

                  <div className={`orders-payment-box ${billStatus === 'PAID' ? 'orders-payment-box--paid' : ''}`}>
                    <div className="orders-payment-head">
                      <span><CreditCard size={17} /> {bill?.billCode || 'Shared bill'}</span>
                      <strong>{bill?.paymentStatus || billStatus}</strong>
                    </div>
                    <p className="orders-payment-note">
                      Open the payment page to apply promotion codes, review totals, create SePay QR, or record cash payment.
                    </p>
                    <button
                      type="button"
                      className="orders-button orders-button--primary"
                      onClick={() => navigate(`/dashboard/orders-service/${selectedGroup.reservationId}/payment`)}
                    >
                      <CreditCard size={17} /> Open payment
                    </button>
                  </div>
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
