import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  Tag,
  X,
  XCircle,
} from 'lucide-react'
import { paymentApi } from '../api/paymentApi'
import { printInvoice } from '../../../shared/utils/printInvoice'
import './OrderPaymentScreen.css'

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VND`
const errorMessage = (error, fallback) => error.response?.data?.message || fallback

const tableLabel = (value) => {
  if (value?.tableNumber && value?.tableName && value.tableNumber !== value.tableName) {
    return `${value.tableNumber} - ${value.tableName}`
  }
  return value?.tableName || value?.tableNumber || `Table ${value?.tableId || '-'}`
}

const activeItems = (orders) => orders
  .filter((order) => order.status !== 'CANCELLED')
  .flatMap((order) => order.items || [])
  .filter((item) => item.status !== 'CANCELLED' && item.status !== 'VOIDED')

function OrderPaymentScreen() {
  const { reservationId } = useParams()
  const navigate = useNavigate()
  const role = String(sessionStorage.getItem('role') || '').replace('ROLE_', '').toUpperCase()
  const [group, setGroup] = useState(null)
  const [promotionCode, setPromotionCode] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('SEPAY')
  const [showCashConfirm, setShowCashConfirm] = useState(false)
  const [voidModal, setVoidModal] = useState({ open: false, item: null, reason: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const bill = group?.bill || null
  const billStatus = bill?.status || 'DRAFT'
  const orders = useMemo(() => group?.orders || [], [group])
  const items = useMemo(() => activeItems(orders), [orders])
  const allServed = items.length > 0 && items.every((item) => item.status === 'SERVED')
  const billEditable = billStatus === 'DRAFT'
  const canCreatePayment = billEditable && allServed && Number(bill?.total ?? group?.subtotal ?? 0) > 0
  const canComplete = group?.reservationStatus === 'ARRIVED' && billStatus === 'PAID' && allServed
  const canVoidServedItems = ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(role) && billStatus !== 'PAID'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await paymentApi.getGroup(reservationId)
      setGroup(response.data)
      if (response.data?.bill?.paymentProvider) {
        setSelectedPaymentMethod(response.data.bill.paymentProvider)
      }
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load payment.'))
    } finally {
      setLoading(false)
    }
  }, [reservationId])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const run = async (action, fallback, afterSuccess) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await load()
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
      () => paymentApi.applyPromotion(reservationId, promotionCode.trim()),
      'Unable to apply promotion.',
      () => setPromotionCode('')
    )
  }

  const removePromotion = () => {
    run(() => paymentApi.removePromotion(reservationId), 'Unable to remove promotion.')
  }

  const createSepayPayment = () => {
    run(() => paymentApi.createSepayPayment(reservationId), 'Unable to create SePay payment.')
  }

  const confirmCashPayment = () => {
    run(
      () => paymentApi.createCashPayment(reservationId),
      'Unable to confirm cash payment.',
      () => setShowCashConfirm(false)
    )
  }

  const cancelPayment = () => {
    run(() => paymentApi.cancelPayment(reservationId), 'Unable to cancel the pending payment.')
  }

  const openVoidModal = (item) => {
    setVoidModal({ open: true, item, reason: '' })
  }

  const closeVoidModal = () => {
    if (busy) return
    setVoidModal({ open: false, item: null, reason: '' })
  }

  const confirmVoidItem = () => {
    const reason = voidModal.reason.trim()
    if (!voidModal.item || !reason) return
    run(
      () => paymentApi.voidItem(voidModal.item.order.id, voidModal.item.id, reason),
      'Unable to void this item.',
      () => setVoidModal({ open: false, item: null, reason: '' })
    )
  }

  const completeReservation = () => {
    run(() => paymentApi.completeReservation(reservationId), 'Unable to complete reservation.', () => {
      navigate('/dashboard/orders-service')
    })
  }

  if (loading) return <div className="payment-loading">Loading payment...</div>

  if (!group) {
    return (
      <section className="payment-screen">
        <button type="button" className="payment-back" onClick={() => navigate('/dashboard/orders-service')}>
          <ArrowLeft size={17} /> Back to orders
        </button>
        <div className="payment-alert">{error || 'Payment not found.'}</div>
      </section>
    )
  }

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
          <h1>{bill?.billCode || `Reservation #${group.reservationId}`}</h1>
          <p>Reservation #{group.reservationId} - {group.reservationGuestName}</p>
        </div>
        <div className={`payment-status payment-status--${String(billStatus).toLowerCase()}`}>
          {bill?.paymentStatus || billStatus}
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
              <span>Guest <strong>{group.reservationGuestName}</strong></span>
              <span>Reservation <strong>#{group.reservationId}</strong></span>
              <span>Tables <strong>{orders.map(tableLabel).join(', ') || '-'}</strong></span>
              <span>Serving status <strong>{allServed ? 'Served' : 'In progress'}</strong></span>
            </div>
            <div className="payment-items">
              {orders.flatMap((order) => (order.items || []).map((item) => ({ ...item, order }))).map((item) => (
                <article key={`${item.order.id}-${item.id}`} className={item.status === 'VOIDED' ? 'payment-item--voided' : ''}>
                  <div>
                    <strong>{item.menuItemName}</strong>
                    <small>{tableLabel(item.order)} - {item.note || 'No special request'}</small>
                    {item.status === 'VOIDED' ? (
                      <small>Voided: {item.voidReason || 'No reason provided'}</small>
                    ) : null}
                  </div>
                  <span>x{item.quantity}</span>
                  <b>{money(item.lineTotal)}</b>
                  {canVoidServedItems && item.status === 'SERVED' ? (
                    <button
                      type="button"
                      className="payment-item-void"
                      disabled={busy}
                      onClick={() => openVoidModal(item)}
                    >
                      <XCircle size={15} /> Void
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="payment-panel">
            <div className="payment-panel-title">
              <Tag size={18} />
              <h2>Promotion</h2>
            </div>
            {billEditable ? (
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
            ) : null}
            {bill?.promotionCode ? (
              <div className="payment-applied-promo">
                <span><strong>{bill.promotionCode}</strong>{bill.promotionName ? ` - ${bill.promotionName}` : ''}</span>
                {billEditable ? (
                  <button type="button" disabled={busy} onClick={removePromotion}>
                    <X size={15} /> Remove
                  </button>
                ) : null}
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
              <span>Subtotal <strong>{money(bill?.subtotal ?? group.subtotal)}</strong></span>
              <span>Discount <strong>-{money(bill?.discountAmount || 0)}</strong></span>
              <span>Total <strong>{money(bill?.total ?? group.subtotal)}</strong></span>
            </div>
          </section>

          <section className="payment-panel payment-qr-panel">
            <div className="payment-panel-title">
              <CreditCard size={18} />
              <h2>Payment method</h2>
            </div>

            {!allServed && billStatus !== 'PAID' ? (
              <div className="payment-next-step payment-next-step--warning">
                Finish and serve all non-cancelled dishes before creating payment.
              </div>
            ) : null}

            <button
              type="button"
              className={`payment-method-card payment-method-card--cash ${selectedPaymentMethod === 'CASH' ? 'is-active' : ''}`}
              disabled={busy || billStatus === 'PAID'}
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
              disabled={busy || billStatus === 'PAID'}
              onClick={() => setSelectedPaymentMethod('SEPAY')}
            >
              <div>
                <span><QrCode size={17} /> SePay QR</span>
                <p>Generate a bank transfer QR and wait for webhook confirmation.</p>
              </div>
              <i className="payment-method-radio" />
            </button>

            {selectedPaymentMethod === 'CASH' ? (
              <div className="payment-method-action">
                {billStatus !== 'PAID' ? (
                  <button
                    type="button"
                    className="payment-button payment-button--secondary"
                    disabled={busy || !canCreatePayment}
                    onClick={() => setShowCashConfirm(true)}
                  >
                    Confirm Cash
                  </button>
                ) : bill?.paymentProvider === 'CASH' ? (
                  <div className="payment-paid">Paid by cash.</div>
                ) : (
                  <div className="payment-note">Payment was completed with {bill?.paymentProvider || 'another method'}.</div>
                )}
              </div>
            ) : null}

            {selectedPaymentMethod === 'SEPAY' ? (
              <div className="payment-method-action">
                {bill?.paymentCode ? (
                  <div className="payment-code-box">
                    <span>Transfer content</span>
                    <strong>{bill.paymentCode}</strong>
                  </div>
                ) : null}
                {bill?.paymentQrImageUrl ? (
                    //FE nhận paymentQrImageUrl rồi hiển thị ảnh:
                  <img className="payment-qr" src={bill.paymentQrImageUrl} alt="SePay payment QR" />
                ) : (
                  <p className="payment-note">Create the payment QR when the bill is ready.</p>
                )}
                {bill?.paymentCheckoutUrl ? (
                  <a className="payment-button payment-button--secondary" href={bill.paymentCheckoutUrl} target="_blank" rel="noreferrer">
                    Open payment page
                  </a>
                ) : null}
                {billStatus === 'PENDING' ? (
                  <button type="button" className="payment-button payment-button--secondary" disabled={busy} onClick={cancelPayment}>
                    <XCircle size={17} /> Cancel pending payment
                  </button>
                ) : billStatus !== 'PAID' ? (
                  <button
                    type="button"
                    className="payment-button payment-button--primary"
                    disabled={busy || !canCreatePayment}
                    onClick={createSepayPayment}
                  >
                    <QrCode size={17} /> Create SePay QR
                  </button>
                ) : (
                  <div className="payment-paid">Payment received.</div>
                )}
              </div>
            ) : null}
          </section>

          {billStatus === 'PAID' ? (
            <button
              type="button"
              className="payment-button payment-button--secondary payment-print-button"
              onClick={() => printInvoice({ group, bill })}
            >
              <Printer size={17} /> Print invoice
            </button>
          ) : null}

          <button
            type="button"
            className="payment-button payment-button--success payment-close"
            disabled={busy || !canComplete}
            onClick={completeReservation}
          >
            <Check size={18} /> Complete reservation
          </button>
        </aside>
      </div>

      {showCashConfirm && (
        <div className="payment-modal-backdrop" onClick={() => !busy && setShowCashConfirm(false)}>
          <div className="payment-modal" onClick={(event) => event.stopPropagation()}>
            <div className="payment-modal-icon"><Banknote size={28} /></div>
            <h2>Confirm Cash Payment</h2>
            <p>Confirm that staff has received cash for this reservation.</p>
            <div className="payment-modal-summary">
              <span>Reservation <strong>#{group.reservationId}</strong></span>
              <span>Guest <strong>{group.reservationGuestName}</strong></span>
              <span>Total <strong>{money(bill?.total ?? group.subtotal)}</strong></span>
            </div>
            <div className="payment-modal-actions">
              <button type="button" className="payment-button payment-button--secondary" disabled={busy} onClick={() => setShowCashConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="payment-button payment-button--primary" disabled={busy} onClick={confirmCashPayment}>
                {busy ? 'Confirming...' : 'Confirm Cash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {voidModal.open && (
        <div className="payment-modal-backdrop" onClick={closeVoidModal}>
          <div className="payment-modal" onClick={(event) => event.stopPropagation()}>
            <div className="payment-modal-icon"><XCircle size={28} /></div>
            <h2>Void Served Item</h2>
            <p>
              Remove <strong>{voidModal.item?.menuItemName}</strong> from this bill and keep an audit record.
            </p>
            <div className="payment-modal-summary">
              <span>Quantity <strong>x{voidModal.item?.quantity}</strong></span>
              <span>Amount <strong>{money(voidModal.item?.lineTotal)}</strong></span>
            </div>
            <label className="payment-void-reason">
              <span>Reason</span>
              <textarea
                value={voidModal.reason}
                onChange={(event) => setVoidModal((prev) => ({ ...prev, reason: event.target.value }))}
                maxLength={255}
                rows={3}
                placeholder="Example: Waiter ordered the wrong dish"
              />
            </label>
            <div className="payment-modal-actions">
              <button type="button" className="payment-button payment-button--secondary" disabled={busy} onClick={closeVoidModal}>
                Cancel
              </button>
              <button
                type="button"
                className="payment-button payment-button--primary"
                disabled={busy || !voidModal.reason.trim()}
                onClick={confirmVoidItem}
              >
                {busy ? 'Voiding...' : 'Void item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default OrderPaymentScreen
