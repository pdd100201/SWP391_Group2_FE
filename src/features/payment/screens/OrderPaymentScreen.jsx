import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  QrCode,
  ReceiptText,
  RefreshCw,
  Tag,
  X,
} from 'lucide-react'
import { paymentApi } from '../api/paymentApi'
import './OrderPaymentScreen.css'

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VND`
const errorMessage = (error, fallback) => error.response?.data?.message || fallback

const serviceStatusLabels = {
  HAS_DRAFT: 'Has draft items',
  PREPARING: 'Preparing',
  READY: 'Ready to serve',
  SERVED: 'Served',
}

const tableLabel = (value) => {
  const tableNames = Array.isArray(value?.tableNames) ? value.tableNames.filter(Boolean) : []
  const tableNumbers = Array.isArray(value?.tableNumbers) ? value.tableNumbers.filter(Boolean) : []
  if (tableNames.length > 0) return tableNames.join(', ')
  if (tableNumbers.length > 0) return tableNumbers.join(', ')
  if (!value?.tableId) return 'No table assigned'
  return value.tableName || value.tableNumber || `Table ${value.tableId}`
}

function OrderPaymentScreen() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [promotionCode, setPromotionCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('SEPAY')
  const [showCashConfirm, setShowCashConfirm] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await paymentApi.getOrder(orderId)
      setOrder(response.data)
      if (response.data?.paymentProvider) {
        setSelectedPaymentMethod(response.data.paymentProvider)
      }
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load order payment.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [orderId])

  const run = async (action, fallback, afterSuccess) => {
    setBusy(true)
    setError('')
    try {
      const response = await action()
      setOrder(response.data)
      if (response.data?.paymentProvider) {
        setSelectedPaymentMethod(response.data.paymentProvider)
      }
      afterSuccess?.()
    } catch (actionError) {
      setError(errorMessage(actionError, fallback))
    } finally {
      setBusy(false)
    }
  }

  const applyPromotion = () => {
    if (!promotionCode.trim()) return
    run(
      () => paymentApi.applyPromotion(order.id, promotionCode.trim()),
      'Unable to apply promotion.',
      () => setPromotionCode('')
    )
  }

  const removePromotion = () => {
    run(() => paymentApi.removePromotion(order.id), 'Unable to remove promotion.')
  }

  const createSepayPayment = () => {
    run(() => paymentApi.createSepayPayment(order.id), 'Unable to create SePay payment.')
  }

  const createCashPayment = () => {
    setShowCashConfirm(true)
  }

  const confirmCashPayment = () => {
    run(
      () => paymentApi.createCashPayment(order.id),
      'Unable to confirm cash payment.',
      () => setShowCashConfirm(false)
    )
  }

  const closeOrder = () => {
    run(() => paymentApi.closeOrder(order.id), 'Unable to close order.', () => {
      navigate('/dashboard/orders-service')
    })
  }

  if (loading) return <div className="payment-loading">Loading payment...</div>

  if (!order) {
    return (
      <section className="payment-screen">
        <button type="button" className="payment-back" onClick={() => navigate('/dashboard/orders-service')}>
          <ArrowLeft size={17} /> Back to orders
        </button>
        <div className="payment-alert">{error || 'Order not found.'}</div>
      </section>
    )
  }

  const paymentStatus = order.paymentStatus || 'NOT CREATED'
  const canClose = order.serviceStatus === 'SERVED' && order.paymentStatus === 'PAID'
  const isBillReady = order.serviceStatus === 'SERVED'
  const canCreatePayment = isBillReady && order.paymentStatus !== 'PAID'
  const paymentMethodLocked = order.paymentStatus === 'PAID'

  return (
    <section className="payment-screen">
      <header className="payment-header">
        <button type="button" className="payment-back" onClick={() => navigate('/dashboard/orders-service')}>
          <ArrowLeft size={17} /> Back to orders
        </button>
        <button type="button" className="payment-button payment-button--secondary" onClick={load} disabled={busy}>
          <RefreshCw size={17} /> Refresh
        </button>
      </header>

      {error ? <div className="payment-alert">{error}</div> : null}

      <div className="payment-title-row">
        <div>
          <span className="payment-eyebrow"><CreditCard size={16} /> Payment</span>
          <h1>{order.orderCode}</h1>
          <p>Reservation #{order.reservationId} - {order.reservationGuestName} - {tableLabel(order)}</p>
        </div>
        <div className={`payment-status payment-status--${paymentStatus.toLowerCase().replace(' ', '-')}`}>
          {paymentStatus}
        </div>
      </div>

      <div className="payment-grid">
        <main className="payment-main">
          <section className="payment-panel">
            <div className="payment-panel-title">
              <ReceiptText size={18} />
              <h2>Order detail</h2>
            </div>
            <div className="payment-order-meta">
              <span>Guest <strong>{order.reservationGuestName}</strong></span>
              <span>Tables <strong>{tableLabel(order)}</strong></span>
              <span>Waiter <strong>{order.waiterName || 'Unassigned'}</strong></span>
              <span>Serving status <strong>{serviceStatusLabels[order.serviceStatus] || order.serviceStatus}</strong></span>
            </div>
            <div className="payment-items">
              {order.items.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.menuItemName}</strong>
                    <small>{item.note || 'No special request'}</small>
                  </div>
                  <span>x{item.quantity}</span>
                  <b>{money(item.lineTotal)}</b>
                </article>
              ))}
            </div>
          </section>

          <section className="payment-panel">
            <div className="payment-panel-title">
              <Tag size={18} />
              <h2>Promotion</h2>
            </div>
            <div className="payment-promo-form">
              <input
                value={promotionCode}
                onChange={(event) => setPromotionCode(event.target.value)}
                placeholder="Enter promotion code"
              />
              <button
                type="button"
                className="payment-button payment-button--secondary"
                disabled={busy || !promotionCode.trim()}
                onClick={applyPromotion}
              >
                Apply
              </button>
            </div>
            {order.promotionCode ? (
              <div className="payment-applied-promo">
                <span><strong>{order.promotionCode}</strong>{order.promotionName ? ` - ${order.promotionName}` : ''}</span>
                <button type="button" disabled={busy} onClick={removePromotion}>
                  <X size={15} /> Remove
                </button>
              </div>
            ) : (
              <p className="payment-note">No promotion applied.</p>
            )}
          </section>
        </main>

        <aside className="payment-side">
          <section className="payment-panel payment-bill">
            <h2>Bill summary</h2>
            <div>
              <span>Subtotal <strong>{money(order.subtotal ?? order.total)}</strong></span>
              <span>Discount <strong>-{money(order.discountAmount || 0)}</strong></span>
              <span>Total <strong>{money(order.total)}</strong></span>
            </div>
          </section>

          <section className="payment-panel payment-qr-panel">
            <div className="payment-panel-title">
              <CreditCard size={18} />
              <h2>Payment method</h2>
            </div>

            {!isBillReady && order.paymentStatus !== 'PAID' ? (
              <div className="payment-next-step payment-next-step--warning">
                Finish and serve all order items before creating payment.
              </div>
            ) : null}

            <button
              type="button"
              className={`payment-method-card payment-method-card--cash ${selectedPaymentMethod === 'CASH' ? 'is-active' : ''}`}
              disabled={busy || paymentMethodLocked}
              onClick={() => setSelectedPaymentMethod('CASH')}
            >
              <div>
                <span><Banknote size={17} /> Cash</span>
                <p>Confirm this after staff receives cash at the counter.</p>
              </div>
              <i className="payment-method-radio" />
            </button>

            <button
              type="button"
              className={`payment-method-card payment-method-card--sepay ${selectedPaymentMethod === 'SEPAY' ? 'is-active' : ''}`}
              disabled={busy || paymentMethodLocked}
              onClick={() => setSelectedPaymentMethod('SEPAY')}
            >
              <div>
                <span><QrCode size={17} /> SePay QR</span>
                <p>Generate a bank transfer QR and wait for webhook confirmation.</p>
              </div>
              <i className="payment-method-radio" />
            </button>

            {selectedPaymentMethod === 'CASH' && (
              <div className="payment-method-action">
                {order.paymentStatus !== 'PAID' ? (
                <button
                  type="button"
                  className="payment-button payment-button--secondary"
                  disabled={busy || !canCreatePayment || Number(order.total) <= 0}
                  onClick={createCashPayment}
                >
                  Confirm Cash
                </button>
                ) : order.paymentProvider === 'CASH' ? (
                  <div className="payment-paid">Paid by cash.</div>
                ) : (
                  <div className="payment-note">Payment was completed with {order.paymentProvider || 'another method'}.</div>
                )}
              </div>
            )}

            {selectedPaymentMethod === 'SEPAY' && (
              <div className="payment-method-action">
                {order.paymentProvider === 'SEPAY' && order.paymentCode ? (
                  <div className="payment-code-box">
                    <span>Transfer content</span>
                    <strong>{order.paymentCode}</strong>
                  </div>
                ) : null}
                {order.paymentProvider === 'SEPAY' && order.paymentQrImageUrl ? (
                  <img className="payment-qr" src={order.paymentQrImageUrl} alt="SePay payment QR" />
                ) : (
                  <p className="payment-note">Create the payment QR when the bill is ready.</p>
                )}
                {order.paymentStatus !== 'PAID' ? (
                  <button
                    type="button"
                    className="payment-button payment-button--primary"
                    disabled={busy || !canCreatePayment || Number(order.total) <= 0}
                    onClick={createSepayPayment}
                  >
                    <QrCode size={17} /> Create SePay QR
                  </button>
                ) : (
                  <div className="payment-paid">Payment received.</div>
                )}
              </div>
            )}
          </section>

          {order.paymentStatus === 'PAID' && !canClose ? (
            <div className="payment-next-step payment-next-step--warning">
              Payment received. Return to Order Service, submit/serve remaining items, then close this order.
              <button
                type="button"
                className="payment-button payment-button--secondary"
                onClick={() => navigate('/dashboard/orders-service')}
              >
                Back to Order Service
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="payment-button payment-button--success payment-close"
            disabled={busy || !canClose}
            onClick={closeOrder}
          >
            <Check size={18} /> Close order
          </button>
        </aside>
      </div>

      {showCashConfirm && (
        <div className="payment-modal-backdrop" onClick={() => !busy && setShowCashConfirm(false)}>
          <div className="payment-modal" onClick={(event) => event.stopPropagation()}>
            <div className="payment-modal-icon">
              <Banknote size={28} />
            </div>
            <h2>Confirm Cash Payment</h2>
            <p>
              Confirm that staff has received cash for this order.
            </p>
            <div className="payment-modal-summary">
              <span>Order <strong>{order.orderCode}</strong></span>
              <span>Guest <strong>{order.reservationGuestName}</strong></span>
              <span>Total <strong>{money(order.total)}</strong></span>
            </div>
            <div className="payment-modal-actions">
              <button
                type="button"
                className="payment-button payment-button--secondary"
                disabled={busy}
                onClick={() => setShowCashConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="payment-button payment-button--primary"
                disabled={busy}
                onClick={confirmCashPayment}
              >
                {busy ? 'Confirming...' : 'Confirm Cash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default OrderPaymentScreen
