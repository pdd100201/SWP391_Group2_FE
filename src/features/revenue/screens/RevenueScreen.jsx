import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Eye, ReceiptText, RefreshCw, Search, WalletCards, X } from 'lucide-react'
import { revenueApi } from '../api/revenueApi'
import './RevenueScreen.css'

const todayInputValue = () => {
  const now = new Date()
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 10)
}

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VND`

const tableLabel = (value) => {
  const tableNames = Array.isArray(value?.tableNames) ? value.tableNames.filter(Boolean) : []
  const tableNumbers = Array.isArray(value?.tableNumbers) ? value.tableNumbers.filter(Boolean) : []
  if (tableNames.length > 0) return tableNames.join(', ')
  if (tableNumbers.length > 0) return tableNumbers.join(', ')
  if (!value?.tableId) return 'No table assigned'
  return value.tableName || value.tableNumber || `Table ${value.tableId}`
}

const paidDate = (order) => {
  if (!order.paidAt) return ''
  return String(order.paidAt).slice(0, 10)
}

const paidTime = (order) => {
  if (!order.paidAt) return '-'
  const value = new Date(order.paidAt)
  if (Number.isNaN(value.getTime())) return String(order.paidAt).replace('T', ' ')
  return value.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RevenueScreen() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFilter, setDateFilter] = useState(todayInputValue())
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await revenueApi.getPaidOrders()
      setOrders(response.data || [])
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Unable to load revenue data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const paidOrders = useMemo(() => (
    orders.filter((order) => order.paymentStatus === 'PAID')
  ), [orders])

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return paidOrders
      .filter((order) => !dateFilter || paidDate(order) === dateFilter)
      .filter((order) => methodFilter === 'ALL' || order.paymentProvider === methodFilter)
      .filter((order) => {
        if (!keyword) return true
        return [
          order.orderCode,
          order.reservationGuestName,
          order.paymentCode,
          tableLabel(order),
          order.waiterName,
        ].some((value) => String(value || '').toLowerCase().includes(keyword))
      })
      .sort((a, b) => String(b.paidAt || b.updatedAt).localeCompare(String(a.paidAt || a.updatedAt)))
  }, [dateFilter, methodFilter, paidOrders, search])

  const summary = useMemo(() => {
    const total = filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    const cash = filteredOrders
      .filter((order) => order.paymentProvider === 'CASH')
      .reduce((sum, order) => sum + Number(order.total || 0), 0)
    const sepay = filteredOrders
      .filter((order) => order.paymentProvider === 'SEPAY')
      .reduce((sum, order) => sum + Number(order.total || 0), 0)
    return { total, cash, sepay, count: filteredOrders.length }
  }, [filteredOrders])

  if (loading) return <div className="revenue-loading">Loading revenue...</div>

  return (
    <section className="revenue-screen">
      <header className="revenue-header">
        <div>
          <span className="revenue-eyebrow"><WalletCards size={16} /> Revenue</span>
          <h1>Revenue</h1>
          <p>Track paid restaurant bills by date and payment method.</p>
        </div>
        <button type="button" className="revenue-button revenue-button--secondary" onClick={load}>
          <RefreshCw size={17} /> Refresh
        </button>
      </header>

      {error ? <div className="revenue-alert">{error}</div> : null}

      <div className="revenue-summary">
        <article>
          <span>Total revenue</span>
          <strong>{money(summary.total)}</strong>
        </article>
        <article>
          <span>Paid orders</span>
          <strong>{summary.count}</strong>
        </article>
        <article>
          <span>Cash</span>
          <strong>{money(summary.cash)}</strong>
        </article>
        <article>
          <span>SePay</span>
          <strong>{money(summary.sepay)}</strong>
        </article>
      </div>

      <div className="revenue-toolbar">
        <label>
          <span>Date</span>
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </label>
        <label>
          <span>Method</span>
          <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
            <option value="ALL">All methods</option>
            <option value="CASH">Cash</option>
            <option value="SEPAY">SePay</option>
          </select>
        </label>
        <label className="revenue-search">
          <span>Search</span>
          <div>
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order, guest, table, payment code..."
            />
          </div>
        </label>
        <button type="button" className="revenue-button revenue-button--ghost" onClick={() => setDateFilter('')}>
          All dates
        </button>
      </div>

      <section className="revenue-table-card">
        <div className="revenue-table-head">
          <h2>Paid bills</h2>
          <span>{filteredOrders.length} records</span>
        </div>
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <thead>
              <tr>
                <th>Paid time</th>
                <th>Order</th>
                <th>Guest / Tables</th>
                <th>Method</th>
                <th>Payment code</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="revenue-empty">No paid bills match your filters.</td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="revenue-clickable-row" onClick={() => setSelectedOrder(order)}>
                  <td>{paidTime(order)}</td>
                  <td>
                    <strong>{order.orderCode}</strong>
                    <small>Waiter {order.waiterName || 'Unassigned'}</small>
                  </td>
                  <td>
                    <strong>{order.reservationGuestName}</strong>
                    <small>{tableLabel(order)}</small>
                  </td>
                  <td>
                    <span className={`revenue-method revenue-method--${String(order.paymentProvider).toLowerCase()}`}>
                      <CreditCard size={14} /> {order.paymentProvider}
                    </span>
                  </td>
                  <td>{order.paymentCode || '-'}</td>
                  <td className="revenue-amount">{money(order.total)}</td>
                  <td>
                    <button
                      type="button"
                      className="revenue-icon-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedOrder(order)
                      }}
                    >
                      <Eye size={16} /> Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <div className="revenue-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="revenue-modal" onClick={(event) => event.stopPropagation()}>
            <div className="revenue-modal-head">
              <div>
                <span className="revenue-eyebrow"><ReceiptText size={16} /> Bill detail</span>
                <h2>{selectedOrder.orderCode}</h2>
                <p>Paid at {paidTime(selectedOrder)}</p>
              </div>
              <button type="button" className="revenue-modal-close" onClick={() => setSelectedOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="revenue-detail-grid">
              <span>Guest <strong>{selectedOrder.reservationGuestName}</strong></span>
              <span>Tables <strong>{tableLabel(selectedOrder)}</strong></span>
              <span>Waiter <strong>{selectedOrder.waiterName || 'Unassigned'}</strong></span>
              <span>Method <strong>{selectedOrder.paymentProvider}</strong></span>
              <span>Payment code <strong>{selectedOrder.paymentCode || '-'}</strong></span>
              <span>Status <strong>{selectedOrder.paymentStatus}</strong></span>
            </div>

            <div className="revenue-detail-items">
              <h3>Order items</h3>
              {selectedOrder.items?.length ? selectedOrder.items.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.menuItemName}</strong>
                    <small>{item.note || 'No special request'}</small>
                  </div>
                  <span>x{item.quantity}</span>
                  <b>{money(item.lineTotal)}</b>
                </article>
              )) : <p className="revenue-empty revenue-empty--compact">No items.</p>}
            </div>

            <div className="revenue-detail-total">
              <span>Subtotal <strong>{money(selectedOrder.subtotal ?? selectedOrder.total)}</strong></span>
              <span>Discount <strong>-{money(selectedOrder.discountAmount || 0)}</strong></span>
              <span>Total <strong>{money(selectedOrder.total)}</strong></span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default RevenueScreen
