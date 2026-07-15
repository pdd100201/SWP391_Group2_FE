import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrderStatus } from '../api/qrApi'
import './QrOrderStatusScreen.css'

const STEPS = [
  { key: 'PENDING', label: 'Chờ xác nhận', icon: '⏳' },
  { key: 'PREPARING', label: 'Đang chuẩn bị', icon: '👨‍🍳' },
  { key: 'SERVED', label: 'Đã phục vụ', icon: '✅' },
]

const STATUS_ICONS = {
  PENDING: '⏳',
  PREPARING: '👨‍🍳',
  SERVED: '🎉',
}

const ITEM_STATUS = {
  PENDING:   { label: 'Chờ xác nhận', cls: 'pending' },
  PREPARING: { label: 'Đang chuẩn bị', cls: 'preparing' },
  SERVED:    { label: 'Đã phục vụ',   cls: 'served' },
}

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

function getStepIndex(status) {
  return STEPS.findIndex((s) => s.key === status)
}

export default function QrOrderStatusScreen() {
  const { orderId } = useParams()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getOrderStatus(orderId)
      setOrder(data)
      setError(null)
    } catch {
      setError('Không thể tải trạng thái đơn. Đang thử lại...')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    const initialTimer = window.setTimeout(fetchStatus, 0)
    const timer = setInterval(fetchStatus, 30000)
    return () => {
      window.clearTimeout(initialTimer)
      clearInterval(timer)
    }
  }, [fetchStatus])

  if (loading) {
    return (
      <div className="qr-status">
        <div className="qr-status__header">
          <h1>Trạng thái đơn</h1>
          <div className="qr-status__order-id">#{orderId}</div>
        </div>
        <div className="qr-status__loading">
          <div className="qr-status__spinner" />
          <span>Đang tải...</span>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="qr-status">
        <div className="qr-status__header">
          <h1>Trạng thái đơn</h1>
          <div className="qr-status__order-id">#{orderId}</div>
        </div>
        <div className="qr-status__error">
          <span>{error}</span>
        </div>
      </div>
    )
  }

  const currentStepIndex = getStepIndex(order?.status)

  return (
    <div className="qr-status">
      <div className="qr-status__header">
        <h1>Trạng thái đơn hàng</h1>
        <div className="qr-status__order-id">Mã đơn #{orderId}</div>
      </div>

      <div className="qr-status__body">
        {/* Status card */}
        <div className="qr-status__status-card">
          <div className="qr-status__icon">
            {STATUS_ICONS[order?.status] || '📋'}
          </div>
          <div className="qr-status__label">Trạng thái hiện tại</div>
          <span className={`qr-status__badge qr-status__badge--${order?.status || 'default'}`}>
            {STEPS.find((s) => s.key === order?.status)?.label || order?.status}
          </span>

          {/* Stepper */}
          <div className="qr-status__stepper">
            {STEPS.map((step, idx) => {
              const isDone = idx < currentStepIndex
              const isActive = idx === currentStepIndex
              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="qr-status__step">
                    <div
                      className={`qr-status__step-dot${
                        isActive ? ' qr-status__step-dot--active' : ''
                      }${isDone ? ' qr-status__step-dot--done' : ''}`}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`qr-status__step-label${
                        isActive ? ' qr-status__step-label--active' : ''
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`qr-status__step-line${
                        isDone ? ' qr-status__step-line--done' : ''
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Items list */}
        {order?.items?.length > 0 && (
          <>
            <div className="qr-status__section-title">Món đã đặt</div>
            <div className="qr-status__items-card">
              {order.items.map((item) => {
                const itemStatus = ITEM_STATUS[item.itemStatus] || { label: item.itemStatus, cls: 'default' }
                return (
                  <div key={item.orderItemId} className="qr-status__order-item">
                    <div className="qr-status__order-item-left">
                      <span className="qr-status__order-item-name">
                        {item.itemName || `Món #${item.itemId}`}
                      </span>
                      <span className="qr-status__order-item-qty">x{item.quantity}</span>
                    </div>
                    <div className="qr-status__order-item-right">
                      <span className={`qr-status__item-badge qr-status__item-badge--${itemStatus.cls}`}>
                        {itemStatus.label}
                      </span>
                      <span className="qr-status__order-item-subtotal">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Total */}
        <div className="qr-status__total-card">
          <span className="qr-status__total-label">Tổng cộng</span>
          <span className="qr-status__total-value">{formatPrice(order?.totalAmount || 0)}</span>
        </div>

        {/* Payment button */}
        <button
          className="qr-status__pay-btn"
          onClick={() => navigate(`/qr/order/${orderId}/payment`)}
        >
          💳 Thanh toán
        </button>

        <div className="qr-status__refresh-note">
          Tự động cập nhật mỗi 30 giây
        </div>
      </div>
    </div>
  )
}
