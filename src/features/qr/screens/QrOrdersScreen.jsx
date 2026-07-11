import { useEffect, useState } from 'react'
import { Check, ChefHat, ClipboardList, QrCode, RefreshCw } from 'lucide-react'
import axios from 'axios'
import './QrOrdersScreen.css'

const ORDER_STATUS_LABELS = {
  OPEN: 'Đang mở',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã huỷ',
  PENDING: 'Chờ xử lý',
}

const ITEM_STATUS_LABELS = {
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang làm',
  READY: 'Sẵn sàng',
  SERVED: 'Đã phục vụ',
  CANCELLED: 'Đã huỷ',
}

const ITEM_NEXT = {
  CONFIRMED: { label: 'Bắt đầu làm', next: 'PREPARING' },
  PREPARING: { label: 'Xong món', next: 'READY' },
  READY: { label: 'Đã phục vụ', next: 'SERVED' },
}

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} ₫`

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function authHeaders() {
  const token = sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const BASE = 'http://localhost:8080/api/qr'

export default function QrOrdersScreen() {
  const [orders, setOrders] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadOrders(showLoading = true) {
    if (showLoading) { setLoading(true); setError('') }
    try {
      const res = await axios.get(`${BASE}/orders`, { headers: authHeaders() })
      const list = res.data || []
      setOrders(list)
      setSelectedId((prev) => list.some((o) => o.orderId === prev) ? prev : (list[0]?.orderId ?? null))
    } catch {
      if (showLoading) setError('Không thể tải danh sách đơn hàng.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  async function loadDetail(orderId) {
    if (!orderId) { setDetail(null); return }
    try {
      const res = await axios.get(`${BASE}/order/${orderId}`, { headers: authHeaders() })
      setDetail(res.data)
    } catch {
      setDetail(null)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadOrders() }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDetail(selectedId) }, [selectedId])

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      const res = await action()
      setDetail(res.data)
      loadOrders(false)
    } catch (e) {
      setError(e.response?.data?.message || 'Có lỗi xảy ra.')
    } finally {
      setBusy(false)
    }
  }

  function advanceItem(itemId, nextStatus) {
    run(() => axios.patch(
      `${BASE}/orders/${detail.orderId}/items/${itemId}/status`,
      { status: nextStatus },
      { headers: authHeaders() },
    ))
  }

  async function submitAll() {
    const confirmed = detail?.items?.filter((i) => i.itemStatus === 'CONFIRMED') || []
    if (!confirmed.length) return
    setBusy(true)
    setError('')
    try {
      await Promise.all(confirmed.map((item) =>
        axios.patch(
          `${BASE}/orders/${detail.orderId}/items/${item.orderItemId}/status`,
          { status: 'PREPARING' },
          { headers: authHeaders() },
        ),
      ))
      await loadDetail(detail.orderId)
      loadOrders(false)
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể cập nhật trạng thái.')
    } finally {
      setBusy(false)
    }
  }

  function closeOrder() {
    run(() => axios.patch(
      `${BASE}/orders/${detail.orderId}/status`,
      { status: 'CLOSED' },
      { headers: authHeaders() },
    ))
  }

  const hasConfirmed = detail?.items?.some((i) => i.itemStatus === 'CONFIRMED')
  const canClose = detail?.status === 'OPEN'
    && detail?.items?.length > 0
    && detail.items.every((i) => i.itemStatus === 'SERVED' || i.itemStatus === 'CANCELLED')
    && detail.items.some((i) => i.itemStatus === 'SERVED')

  if (loading) return <div className="qro-loading">Đang tải đơn hàng...</div>

  return (
    <section className="qro-screen">
      <header className="qro-header">
        <div>
          <span className="qro-eyebrow"><QrCode size={15} /> QR Self-Orders</span>
          <h1>Đơn hàng tự đặt qua QR</h1>
          <p>Theo dõi và xử lý các đơn hàng khách tự đặt qua mã QR tại bàn.</p>
        </div>
        <button type="button" className="qro-btn qro-btn--secondary" onClick={() => loadOrders()} disabled={busy}>
          <RefreshCw size={17} /> Làm mới
        </button>
      </header>

      {error && <div className="qro-alert">{error}</div>}

      <div className="qro-workspace">
        {/* Left: order list */}
        <aside className="qro-list-panel">
          <div className="qro-panel-title">
            <ClipboardList size={18} /> Đơn hàng <span>{orders.length}</span>
          </div>
          {orders.length === 0
            ? <p className="qro-empty">Chưa có đơn hàng nào.</p>
            : orders.map((order) => (
              <button
                type="button"
                key={order.orderId}
                className={`qro-list-card${selectedId === order.orderId ? ' is-active' : ''}`}
                onClick={() => setSelectedId(order.orderId)}
              >
                <span>
                  <strong>Bàn {order.tableId || '—'}</strong>
                  <small>{formatDateTime(order.createdAt)}</small>
                </span>
                <span className={`qro-badge qro-badge--${order.status || 'default'}`}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
                <b>{money(order.totalAmount)}</b>
              </button>
            ))
          }
        </aside>

        {/* Right: order detail */}
        <main className="qro-detail-panel">
          {!detail
            ? <div className="qro-empty qro-empty--large">Chọn một đơn hàng để xem chi tiết.</div>
            : (
              <>
                <div className="qro-detail-head">
                  <div>
                    <h2>Đơn #{detail.orderId}</h2>
                    <p>Bàn {detail.tableId || '—'} · {formatDateTime(detail.createdAt)}</p>
                  </div>
                  <span className={`qro-badge qro-badge--${detail.status || 'default'}`}>
                    {ORDER_STATUS_LABELS[detail.status] || detail.status}
                  </span>
                </div>

                <div className="qro-section-title">
                  <h3>Món đã đặt</h3>
                  <strong>{money(detail.totalAmount)}</strong>
                </div>

                <div className="qro-items">
                  {detail.items?.length === 0 && <p className="qro-empty">Chưa có món nào.</p>}
                  {detail.items?.map((item) => {
                    const action = ITEM_NEXT[item.itemStatus]
                    return (
                      <article
                        key={item.orderItemId}
                        className={`qro-item qro-item--${(item.itemStatus || '').toLowerCase()}`}
                      >
                        <div className="qro-item-main">
                          <strong>{item.itemName || `Món #${item.itemId}`}</strong>
                          <span className="qro-item-status">
                            {ITEM_STATUS_LABELS[item.itemStatus] || item.itemStatus}
                          </span>
                        </div>
                        <span className="qro-item-qty">×{item.quantity}</span>
                        <strong className="qro-item-price">{money(item.subtotal)}</strong>
                        {action
                          ? (
                            <button
                              type="button"
                              className="qro-next-btn"
                              disabled={busy}
                              onClick={() => advanceItem(item.orderItemId, action.next)}
                            >
                              {action.label}
                            </button>
                          )
                          : <span className="qro-item-placeholder" />
                        }
                      </article>
                    )
                  })}
                </div>

                <div className="qro-primary-actions">
                  {hasConfirmed && (
                    <button type="button" className="qro-btn qro-btn--primary" disabled={busy} onClick={submitAll}>
                      <ChefHat size={17} /> Bắt đầu làm tất cả
                    </button>
                  )}
                  <button
                    type="button"
                    className="qro-btn qro-btn--success"
                    disabled={busy || !canClose}
                    onClick={closeOrder}
                  >
                    <Check size={17} /> Đóng đơn
                  </button>
                </div>
              </>
            )
          }
        </main>
      </div>
    </section>
  )
}
