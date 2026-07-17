import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Send, ShoppingBag, Trash2, UtensilsCrossed } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { publicOrderApi } from '../api/orderApi'
import './PublicOrderScreen.css'

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VND`
// Trang gọi món công khai hiển thị tên bàn từ dữ liệu order lấy bằng token.
const tableLabel = (order) => {
  const tableNames = Array.isArray(order?.tableNames) ? order.tableNames.filter(Boolean) : []
  const tableNumbers = Array.isArray(order?.tableNumbers) ? order.tableNumbers.filter(Boolean) : []
  if (tableNames.length > 0) return tableNames.join(', ')
  if (tableNumbers.length > 0) return tableNumbers.join(', ')
  if (!order?.tableId) return ''
  return order.tableName || order.tableNumber || `Table ${order.tableId}`
}

function PublicOrderScreen() {
  // Trang gọi món dành cho khách, mở từ /order-access/:token.
  const { token } = useParams()
  const [order, setOrder] = useState(null)
  const [menu, setMenu] = useState([])
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const categories = useMemo(() => ['All', ...new Set(menu.map((item) => item.category))], [menu])
  const shownMenu = category === 'All' ? menu : menu.filter((item) => item.category === category)
  const drafts = order?.items.filter((item) => item.status === 'DRAFT') || []

  useEffect(() => {
    // Tải cả order hiện tại và menu công khai trước khi hiển thị trang cho khách.
    const load = async () => {
      try {
        const orderResponse = await publicOrderApi.getOrder(token)
        setOrder(orderResponse.data)
        if (orderResponse.data.status === 'OPEN') {
          const menuResponse = await publicOrderApi.getMenu(token)
          setMenu(menuResponse.data || [])
        }
      } catch (loadError) {
        setError(loadError.response?.data?.message || 'This order link is invalid.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const run = async (action, fallback) => {
    // Thực hiện thao tác order công khai rồi thay order trên màn hình bằng dữ liệu máy chủ trả về.
    setBusy(true)
    setError('')
    try {
      const response = await action()
      setOrder(response.data)
    } catch (actionError) {
      setError(actionError.response?.data?.message || fallback)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="public-order-message">Opening your table menu...</div>
  if (!order) return <div className="public-order-message public-order-message--error">{error}</div>

  return (
    <main className="public-order-screen">
      <header className="public-order-header">
        <span><UtensilsCrossed size={18} /> Golden Spoon</span>
        <h1>Order for {order.reservationGuestName}</h1>
        <p>{order.orderCode}{tableLabel(order) ? ` - ${tableLabel(order)}` : ''} - Add dishes and submit them directly to the kitchen.</p>
      </header>

      {error && <div className="public-order-alert">{error}</div>}
      {order.status !== 'OPEN' && <div className="public-order-closed">This order is closed. Please contact your waiter.</div>}

      {order.status === 'OPEN' && (
        <div className="public-order-layout">
          <section>
            <div className="public-order-categories">
              {categories.map((name) => <button type="button" key={name} className={category === name ? 'is-active' : ''} onClick={() => setCategory(name)}>{name}</button>)}
            </div>
            <div className="public-menu-grid">
              {shownMenu.map((item) => (
                <article key={item.id}>
                  <img src={item.imageUrl || '/favicon.svg'} alt="" />
                  <div><small>{item.category}</small><h2>{item.name}</h2><p>{item.description}</p><strong>{money(item.price)}</strong></div>
                  <button type="button" disabled={busy} onClick={() => run(
                    () => publicOrderApi.addItem(token, { menuItemId: item.id, quantity: 1, note: null }),
                    'Could not add this dish.')}><Plus size={17} /> Add to order</button>
                </article>
              ))}
            </div>
          </section>

          <aside className="public-cart">
            <h2><ShoppingBag size={20} /> Your draft <span>{drafts.length}</span></h2>
            {drafts.length === 0 ? <p className="public-cart-empty">Choose a dish to start your order.</p> : drafts.map((item) => (
              <article key={item.id}>
                <div><strong>{item.menuItemName}</strong><span>{money(item.lineTotal)}</span></div>
                <div className="public-cart-controls">
                  <button type="button" disabled={busy || item.quantity <= 1} onClick={() => run(
                    () => publicOrderApi.updateItem(token, item.id, { quantity: item.quantity - 1, note: item.note }), 'Could not update dish.')}><Minus size={14} /></button>
                  <b>{item.quantity}</b>
                  <button type="button" disabled={busy} onClick={() => run(
                    () => publicOrderApi.updateItem(token, item.id, { quantity: item.quantity + 1, note: item.note }), 'Could not update dish.')}><Plus size={14} /></button>
                  <button type="button" className="is-danger" disabled={busy} onClick={() => run(
                    () => publicOrderApi.removeItem(token, item.id), 'Could not remove dish.')}><Trash2 size={15} /></button>
                </div>
                <input
                  defaultValue={item.note || ''}
                  placeholder="Special request, e.g. no onion"
                  onBlur={(event) => {
                    const note = event.target.value.trim() || null
                    if (note !== item.note) run(
                      () => publicOrderApi.updateItem(token, item.id, { quantity: item.quantity, note }),
                      'Could not save note.')
                  }}
                />
              </article>
            ))}
            <div className="public-cart-total"><span>Draft total</span><strong>{money(drafts.reduce((sum, item) => sum + Number(item.lineTotal), 0))}</strong></div>
            <button type="button" className="public-submit" disabled={busy || drafts.length === 0} onClick={() => run(
              () => publicOrderApi.submit(token), 'Could not submit your dishes.')}><Send size={17} /> Submit to kitchen</button>
            <p className="public-cart-hint">Confirmed dishes can only be changed by restaurant staff.</p>
          </aside>
        </div>
      )}
    </main>
  )
}

export default PublicOrderScreen

