import { useCallback, useEffect, useMemo, useState } from 'react'
import { CreditCard, Eye, Printer, ReceiptText, RefreshCw, Search, WalletCards, X } from 'lucide-react'
import { revenueApi } from '../api/revenueApi'
import { printInvoice } from '../../../shared/utils/printInvoice'
import './RevenueScreen.css'

const todayInputValue = () => {
  const now = new Date()
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 10)
}

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} ₫`
const paidDate = (bill) => String(bill.paidAt || '').slice(0, 10)
const paidTime = (bill) => {
  if (!bill.paidAt) return '-'
  const value = new Date(bill.paidAt)
  if (Number.isNaN(value.getTime())) return String(bill.paidAt).replace('T', ' ')
  return value.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const tableLabel = (order) => order?.tableName || order?.tableNumber || `Table ${order?.tableId || '-'}`
const groupTables = (group) => (group?.orders || []).map(tableLabel).join(', ') || '-'

function RevenueScreen() {
  const [bills, setBills] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFilter, setDateFilter] = useState(todayInputValue())
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedBill, setSelectedBill] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [billsResponse, groupsResponse] = await Promise.all([
        revenueApi.getPaidBills(),
        revenueApi.getOrderGroups(),
      ])
      setBills(billsResponse.data || [])
      setGroups(groupsResponse.data || [])
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Unable to load revenue data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial synchronization with paid Bills and their table-order breakdowns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const groupsByReservation = useMemo(
    () => new Map(groups.map((group) => [Number(group.reservationId), group])),
    [groups]
  )
  const paidBills = useMemo(() => bills
    .filter((bill) => bill.status === 'PAID' || bill.paymentStatus === 'PAID')
    .map((bill) => ({ ...bill, group: groupsByReservation.get(Number(bill.reservationId)) || null })),
  [bills, groupsByReservation])

  const filteredBills = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return paidBills
      .filter((bill) => !dateFilter || paidDate(bill) === dateFilter)
      .filter((bill) => methodFilter === 'ALL' || bill.paymentProvider === methodFilter)
      .filter((bill) => {
        if (!keyword) return true
        return [
          bill.billCode,
          bill.paymentCode,
          bill.reservationId,
          bill.group?.reservationGuestName,
          groupTables(bill.group),
        ].some((value) => String(value || '').toLowerCase().includes(keyword))
      })
      .sort((left, right) => String(right.paidAt || right.updatedAt).localeCompare(String(left.paidAt || left.updatedAt)))
  }, [dateFilter, methodFilter, paidBills, search])

  const summary = useMemo(() => {
    const total = filteredBills.reduce((sum, bill) => sum + Number(bill.total || 0), 0)
    const cash = filteredBills
      .filter((bill) => bill.paymentProvider === 'CASH')
      .reduce((sum, bill) => sum + Number(bill.total || 0), 0)
    const sepay = filteredBills
      .filter((bill) => bill.paymentProvider === 'SEPAY')
      .reduce((sum, bill) => sum + Number(bill.total || 0), 0)
    return { total, cash, sepay, count: filteredBills.length }
  }, [filteredBills])

  if (loading) return <div className="revenue-loading">Loading revenue...</div>

  return (
    <section className="revenue-screen">
      <header className="revenue-header">
        <div>
          <span className="revenue-eyebrow"><WalletCards size={16} /> Revenue</span>
          <h1>Revenue</h1>
          <p>Each row is one paid reservation bill, regardless of how many tables it contains.</p>
        </div>
        <button type="button" className="revenue-button revenue-button--secondary" onClick={load}>
          <RefreshCw size={17} /> Refresh
        </button>
      </header>

      {error ? <div className="revenue-alert">{error}</div> : null}

      <div className="revenue-summary">
        <article><span>Total revenue</span><strong>{money(summary.total)}</strong></article>
        <article><span>Paid bills</span><strong>{summary.count}</strong></article>
        <article><span>Cash</span><strong>{money(summary.cash)}</strong></article>
        <article><span>SePay</span><strong>{money(summary.sepay)}</strong></article>
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
          <span>Search paid bills</span>
          <div>
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Bill, guest, table, payment code..." />
          </div>
        </label>
        <button type="button" className="revenue-button revenue-button--ghost" onClick={() => setDateFilter('')}>All dates</button>
      </div>

      <section className="revenue-table-card">
        <div className="revenue-table-head">
          <h2>Paid bills</h2>
          <span>{filteredBills.length} records</span>
        </div>
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <thead>
              <tr>
                <th>Paid time</th>
                <th>Bill</th>
                <th>Guest / Tables</th>
                <th>Method</th>
                <th>Payment code</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr><td colSpan="7" className="revenue-empty">No paid bills match your filters.</td></tr>
              ) : filteredBills.map((bill) => (
                <tr key={bill.id} className="revenue-clickable-row" onClick={() => setSelectedBill(bill)}>
                  <td>{paidTime(bill)}</td>
                  <td><strong>{bill.billCode}</strong><small>Reservation #{bill.reservationId}</small></td>
                  <td><strong>{bill.group?.reservationGuestName || 'Guest'}</strong><small>{groupTables(bill.group)}</small></td>
                  <td>
                    <span className={`revenue-method revenue-method--${String(bill.paymentProvider || '').toLowerCase()}`}>
                      <CreditCard size={14} /> {bill.paymentProvider || '-'}
                    </span>
                  </td>
                  <td>{bill.paymentCode || '-'}</td>
                  <td className="revenue-amount">{money(bill.total)}</td>
                  <td>
                    <button
                      type="button"
                      className="revenue-icon-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedBill(bill)
                      }}
                    ><Eye size={16} /> Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedBill ? (
        <div className="revenue-modal-backdrop" onClick={() => setSelectedBill(null)}>
          <div className="revenue-modal" onClick={(event) => event.stopPropagation()}>
            <div className="revenue-modal-head">
              <div>
                <span className="revenue-eyebrow"><ReceiptText size={16} /> Bill detail</span>
                <h2>{selectedBill.billCode}</h2>
                <p>Paid at {paidTime(selectedBill)}</p>
              </div>
              <div className="revenue-modal-actions">
                <button
                  type="button"
                  className="revenue-icon-button"
                  onClick={() => printInvoice({ group: selectedBill.group, bill: selectedBill })}
                >
                  <Printer size={16} /> Print invoice
                </button>
                <button type="button" className="revenue-modal-close" onClick={() => setSelectedBill(null)}><X size={18} /></button>
              </div>
            </div>

            <div className="revenue-detail-grid">
              <span>Reservation <strong>#{selectedBill.reservationId}</strong></span>
              <span>Guest <strong>{selectedBill.group?.reservationGuestName || '-'}</strong></span>
              <span>Tables <strong>{groupTables(selectedBill.group)}</strong></span>
              <span>Method <strong>{selectedBill.paymentProvider || '-'}</strong></span>
              <span>Payment code <strong>{selectedBill.paymentCode || '-'}</strong></span>
              <span>Status <strong>{selectedBill.paymentStatus || selectedBill.status}</strong></span>
            </div>

            <div className="revenue-detail-items">
              <h3>Table order breakdown</h3>
              {selectedBill.group?.orders?.length ? selectedBill.group.orders.map((order) => (
                <section className="revenue-table-order" key={order.id}>
                  <header><span><strong>{tableLabel(order)}</strong><small>{order.orderCode}</small></span><b>{money(order.subtotal ?? order.total)}</b></header>
                  {(order.items || []).filter((item) => item.status !== 'CANCELLED').length ? (
                    order.items.filter((item) => item.status !== 'CANCELLED').map((item) => (
                      <article key={item.id}>
                        <div><strong>{item.menuItemName}</strong><small>{item.note || 'No special request'}</small></div>
                        <span>x{item.quantity}</span>
                        <b>{money(item.lineTotal)}</b>
                      </article>
                    ))
                  ) : <p className="revenue-empty revenue-empty--compact">No billable items for this table.</p>}
                </section>
              )) : <p className="revenue-empty revenue-empty--compact">Order breakdown is unavailable.</p>}
            </div>

            <div className="revenue-detail-total">
              <span>Subtotal <strong>{money(selectedBill.subtotal)}</strong></span>
              <span>Discount <strong>-{money(selectedBill.discountAmount || 0)}</strong></span>
              <span>Total <strong>{money(selectedBill.total)}</strong></span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default RevenueScreen
