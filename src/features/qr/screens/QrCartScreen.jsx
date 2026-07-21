import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createOrder } from '../api/qrApi'
import './QrCartScreen.css'

const CART_KEY = 'qr_cart'

function loadCart() {
  try {
    return JSON.parse(sessionStorage.getItem(CART_KEY) || '[]')
  } catch {
    return []
  }
}

function saveCart(cart) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart))
}

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

export default function QrCartScreen() {
  const { tableId } = useParams()
  const navigate = useNavigate()

  const [cart, setCart] = useState(loadCart)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function updateQuantity(itemId, delta) {
    setCart((prev) => {
      const next = prev
        .map((c) => (c.itemId === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
      saveCart(next)
      return next
    })
  }

  function removeItem(itemId) {
    setCart((prev) => {
      const next = prev.filter((c) => c.itemId !== itemId)
      saveCart(next)
      return next
    })
  }

  function updateNote(itemId, note) {
    setCart((prev) => {
      const next = prev.map((c) => c.itemId === itemId ? { ...c, note } : c)
      saveCart(next)
      return next
    })
  }

  const totalAmount = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0)

  async function handleOrder() {
    setError(null)
    const sessionToken = sessionStorage.getItem('qr_session_token')
    if (!sessionToken) {
      setError('Session expired. Please scan the QR code again.')
      return
    }
    setSubmitting(true)
    try {
      const freshCart = loadCart()
      const payload = freshCart.map((c) => ({ itemId: c.itemId, quantity: c.quantity, note: c.note || null }))
      await createOrder(sessionToken, payload)
      sessionStorage.removeItem(CART_KEY)
      navigate(`/qr/table/${tableId}/status`)
    } catch {
      setError('Order failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="qr-cart">
        <div className="qr-cart__header">
          <button className="qr-cart__back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Cart</h1>
        </div>
        <div className="qr-cart__empty">
          <div className="qr-cart__empty-icon">🛒</div>
          <p>Your cart is empty</p>
          <button
            className="qr-cart__empty-back-btn"
            onClick={() => navigate(`/qr/table/${tableId}`)}
          >
            View menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="qr-cart">
      <div className="qr-cart__header">
        <button className="qr-cart__back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Cart ({totalItems} item{totalItems !== 1 ? 's' : ''})</h1>
      </div>

      <div className="qr-cart__body">
        {error && <div className="qr-cart__toast">{error}</div>}

        {cart.map((item) => (
          <div key={item.itemId} className="qr-cart__item">
            <div className="qr-cart__item-top">
              <span className="qr-cart__item-name">{item.itemName}</span>
              <button
                className="qr-cart__delete-btn"
                onClick={() => removeItem(item.itemId)}
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
            <input
              className="qr-cart__item-note"
              defaultValue={item.note || ''}
              placeholder="Special request (max 150 characters)"
              maxLength={150}
              onBlur={(e) => updateNote(item.itemId, e.target.value.trim() || null)}
            />
            <div className="qr-cart__item-bottom">
              <span className="qr-cart__item-subtotal">
                {formatPrice(item.price * item.quantity)}
              </span>
              <div className="qr-cart__qty">
                <button
                  className="qr-cart__qty-btn"
                  onClick={() => updateQuantity(item.itemId, -1)}
                >
                  −
                </button>
                <span className="qr-cart__qty-value">{item.quantity}</span>
                <button
                  className="qr-cart__qty-btn"
                  onClick={() => updateQuantity(item.itemId, 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="qr-cart__summary">
          <div className="qr-cart__summary-row">
            <span className="qr-cart__summary-label">Items</span>
            <span className="qr-cart__summary-value">{totalItems}</span>
          </div>
          <hr className="qr-cart__summary-divider" />
          <div className="qr-cart__summary-row">
            <span className="qr-cart__summary-total-label">Total</span>
            <span className="qr-cart__summary-total-value">{formatPrice(totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="qr-cart__footer">
        <button
          className="qr-cart__order-btn"
          onClick={handleOrder}
          disabled={submitting}
        >
          {submitting ? 'Placing order...' : 'Place order'}
        </button>
      </div>
    </div>
  )
}
