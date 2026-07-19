import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getActiveOrder } from '../api/qrApi'
import './QrOrderStatusScreen.css'

const ITEM_STATUS = {
  DRAFT:     'Draft',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY:     'Ready',
  SERVED:    'Served',
  CANCELLED: 'Cancelled',
}

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}


export default function QrOrderStatusScreen() {
  const { tableId } = useParams()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchStatus() {
    try {
      const data = await getActiveOrder(tableId)
      setOrder(data)
      setError(null)
    } catch {
      setError('Unable to load order status. Retrying...')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 30000)
    return () => clearInterval(timer)
  }, [tableId])

  if (loading) {
    return (
      <div className="qr-status">
        <div className="qr-status__header">
          <div>
            <h1>Order status</h1>
            <div className="qr-status__order-id">Table #{tableId}</div>
          </div>
          {tableId && (
            <button className="qr-status__back-btn" onClick={() => navigate(`/qr/table/${tableId}`)}>
              ← Menu
            </button>
          )}
        </div>
        <div className="qr-status__loading">
          <div className="qr-status__spinner" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="qr-status">
        <div className="qr-status__header">
          <div>
            <h1>Order status</h1>
            <div className="qr-status__order-id">Table #{tableId}</div>
          </div>
          {tableId && (
            <button className="qr-status__back-btn" onClick={() => navigate(`/qr/table/${tableId}`)}>
              ← Menu
            </button>
          )}
        </div>
        <div className="qr-status__error">
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="qr-status">
      <div className="qr-status__header">
        <div>
          <h1>Order status</h1>
          <div className="qr-status__order-id">Table #{tableId}</div>
        </div>
        {tableId && (
          <button className="qr-status__back-btn" onClick={() => navigate(`/qr/table/${tableId}`)}>
            ← Menu
          </button>
        )}
      </div>

      <div className="qr-status__body">
        {/* Items list */}
        {order?.items?.length > 0 && (
          <>
            <div className="qr-status__section-title">Order items</div>
            <div className="qr-status__items-card">
              {Object.values(
                order.items.reduce((acc, item) => {
                  const key = `${item.itemName}-${item.itemStatus}-${item.note || ''}`
                  if (acc[key]) {
                    acc[key].quantity += item.quantity
                    acc[key].subtotal += item.subtotal
                  } else {
                    acc[key] = { ...item }
                  }
                  return acc
                }, {})
              ).map((item) => (
                <div key={`${item.itemName}-${item.itemStatus}-${item.note || ''}`} className="qr-status__order-item">
                  <div className="qr-status__order-item-left">
                    <span className="qr-status__order-item-name">
                      {item.itemName || `Item #${item.itemId}`}
                    </span>
                    <small className="qr-status__order-item-note">
                      {item.note || 'No special request'}
                    </small>
                    <span className="qr-status__order-item-qty">x{item.quantity}</span>
                  </div>
                  <div className="qr-status__order-item-right">
                    <span className="qr-status__item-badge">
                      {ITEM_STATUS[item.itemStatus] || item.itemStatus}
                    </span>
                    <span className="qr-status__order-item-subtotal">
                      {formatPrice(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Total */}
        <div className="qr-status__total-card">
          <span className="qr-status__total-label">Total</span>
          <span className="qr-status__total-value">{formatPrice(order?.totalAmount || 0)}</span>
        </div>

        <div className="qr-status__refresh-note">
          Auto-refreshes every 30 seconds
        </div>
      </div>
    </div>
  )
}
