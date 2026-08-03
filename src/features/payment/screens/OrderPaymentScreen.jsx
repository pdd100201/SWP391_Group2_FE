import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  Minus,
  Plus,
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

// Tao nhan hien thi cho ban. Neu BE tra ve ca ma ban va ten ban thi hien ca hai,
// neu thieu du lieu thi fallback ve tableName, tableNumber hoac tableId.
const tableLabel = (value) => {
  if (value?.tableNumber && value?.tableName && value.tableNumber !== value.tableName) {
    return `${value.tableNumber} - ${value.tableName}`
  }
  return value?.tableName || value?.tableNumber || `Table ${value?.tableId || '-'}`
}

// Lay cac mon can hien trong bill.
// Item VOIDED van phai hien de nhan vien thay lich su huy, chi item CANCELLED/order CANCELLED moi an khoi bill.
const billDisplayItems = (orders) => orders
  .filter((order) => order.status !== 'CANCELLED')
  .flatMap((order) => (order.items || []).map((item) => ({ ...item, order })))
  .filter((item) => item.status !== 'CANCELLED')

function OrderPaymentScreen() {
  // Doc reservationId tu URL de biet dang thanh toan cho reservation nao. (1)
  const { reservationId } = useParams()
  const navigate = useNavigate()
  // Role dung de kiem tra quyen void mon da served.
  const role = String(sessionStorage.getItem('role') || '').replace('ROLE_', '').toUpperCase()

  // group la du lieu tong hop cua trang payment: reservation, table orders va shared bill.
  const [group, setGroup] = useState(null)
  //sau khi nhap ma khuyen mai, gia tri do duoc luu vao state
  const [promotionCode, setPromotionCode] = useState('')
  // Doi state CASh/ Sepay sau khi chon phuong thuc thanh toan
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('SEPAY')

  // State dieu khien modal xac nhan tien mat va modal void mon.
  const [showCashConfirm, setShowCashConfirm] = useState(false)
  const [voidModal, setVoidModal] = useState({ open: false, item: null, reason: '', quantity: 1 })

  // loading dung cho lan tai dau tien, busy dung cho cac thao tac dang goi API.
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Tach bill, orders va items tu group de phan render ben duoi gon hon.
  const bill = group?.bill || null
  const billStatus = bill?.status || 'DRAFT'
  const orders = useMemo(() => group?.orders || [], [group])
  const activeOrders = useMemo(() => orders.filter((order) => order.status !== 'CANCELLED'), [orders])
  const items = useMemo(() => billDisplayItems(orders), [orders])
  const billableItems = useMemo(() => items.filter((item) => item.status !== 'VOIDED'), [items])
  const maxVoidQuantity = Math.max(1, Number(voidModal.item?.quantity) || 1)
  const selectedVoidQuantity = Math.min(Math.max(1, Number(voidModal.quantity) || 1), maxVoidQuantity)
  const selectedVoidAmount = Number(voidModal.item?.unitPrice || 0) * selectedVoidQuantity

  // Cac dieu kien nghiep vu cua trang payment:
  // - Tat ca mon hop le phai SERVED moi duoc tao payment.
  // - Bill PAID va reservation ARRIVED moi duoc complete reservation.
  // - Chi role noi bo duoc void mon, va khong void sau khi bill da PAID.
  const allServed = billableItems.length > 0 && billableItems.every((item) => item.status === 'SERVED')
  const billEditable = billStatus === 'DRAFT'
  const canCreatePayment = billEditable && allServed && Number(bill?.total ?? group?.subtotal ?? 0) > 0
  const canComplete = group?.reservationStatus === 'ARRIVED' && billStatus === 'PAID' && allServed
  const canVoidServedItems = ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(role) && billStatus !== 'PAID'

  // Ham load() duoc goi khi vao trang va khi bam Refresh.
  // No lay du lieu moi nhat tu BE roi cap nhat lai state group.
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // load() de lay du lieu bill/order của reservation (2)
      // API goi FE o getGroup (3)
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

  // Ham run() gom logic lap lai cho cac action API:
  // bat busy, xoa loi cu, goi API, load lai du lieu, sau do chay callback neu co.
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

  // Apply promotion vao bill cua reservation hien tai.
  // API se validate code, thoi gian hieu luc, min bill, usage limit va tinh lai tong tien.
  const applyPromotion = () => {
    //kiem tra user co nhap ma hay khong
    if (!promotionCode.trim()) return
    run(
        //neu co thi thi FE goi ham API
      () => paymentApi.applyPromotion(reservationId, promotionCode.trim()),
      'Unable to apply promotion.',
      () => setPromotionCode('')
    )
  }

  // Xoa promotion dang ap dung khoi bill va tinh lai subtotal/discount/total.
  const removePromotion = () => {
    run(() => paymentApi.removePromotion(reservationId), 'Unable to remove promotion.')
  }

  // Tao thanh toan SePay: BE sinh paymentCode va paymentQrImageUrl.
  // Sau do khach chuyen khoan, SePay webhook se goi BE de mark bill PAID.
  const createSepayPayment = () => {
    //Sau khi API tao thanh cong QR, ham run() goi lai load()
    run(() => paymentApi.createSepayPayment(reservationId), 'Unable to create SePay payment.')
  }

  // Xac nhan tien mat. Khi staff bam confirm, BE mark bill PAID ngay.
  const confirmCashPayment = () => {
    run(
        //goi API request den BE
        // BE tra ket qua thanh cong thi hamf run() goi lai load()
      () => paymentApi.createCashPayment(reservationId),
      'Unable to confirm cash payment.',
      () => setShowCashConfirm(false)
    )
  }

  // Huy payment dang pending, dung khi QR da tao nhung can doi method hoac tao QR moi.
  const cancelPayment = () => {
    run(() => paymentApi.cancelPayment(reservationId), 'Unable to cancel the pending payment.')
  }

  // Mo modal, luu item muon void vao state
  const openVoidModal = (item) => {
    setVoidModal({ open: true, item, reason: '', quantity: 1 })
  }

  // Dong modal void. Neu dang goi API thi khong dong de tranh sai trang thai UI.
  const closeVoidModal = () => {
    if (busy) return
    setVoidModal({ open: false, item: null, reason: '', quantity: 1 })
  }

  const changeVoidQuantity = (nextQuantity) => {
    setVoidModal((prev) => {
      const maxQuantity = Math.max(1, Number(prev.item?.quantity) || 1)
      const quantity = Math.min(Math.max(1, nextQuantity), maxQuantity)
      return { ...prev, quantity }
    })
  }

  // Gui request void item cho BE. BE se luu ly do, cap nhat status item va tinh lai bill.
  const confirmVoidItem = () => {
    const reason = voidModal.reason.trim()
    if (!voidModal.item || !reason) return
    run(
      () => paymentApi.voidItem(voidModal.item.order.id, voidModal.item.id, reason, selectedVoidQuantity),
      'Unable to void this item.',
      () => setVoidModal({ open: false, item: null, reason: '', quantity: 1 })
    )
  }

  // Hoan tat reservation sau khi bill da PAID va cac mon hop le deu SERVED.
  // Khi thanh cong dieu huong ve trang Order management.
  const completeReservation = () => {
    // lay reservationId tu URL và Goi API paymentApi.completeReservation
    run(() => paymentApi.completeReservation(reservationId), 'Unable to complete reservation.', () => {
      navigate('/dashboard/orders-service')
    })
  }

  if (loading) return <div className="payment-loading">Loading payment...</div>

  // Neu khong lay duoc group thi hien loi va nut quay lai, khong render bill rong.
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

      {/* Header hien ma bill, reservation va trang thai thanh toan hien tai. */}
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
          {/* Chi tiet order: thong tin khach, reservation, ban da assign va danh sach mon. */}
          <section className="payment-panel">
            <div className="payment-panel-title">
              <ReceiptText size={18} />
              <h2>Order detail</h2>
            </div>
            <div className="payment-order-meta">
              <span>Guest <strong>{group.reservationGuestName}</strong></span>
              <span>Reservation <strong>#{group.reservationId}</strong></span>
              <span>Tables <strong>{activeOrders.map(tableLabel).join(', ') || '-'}</strong></span>
              <span>Serving status <strong>{allServed ? 'Served' : 'In progress'}</strong></span>
            </div>
            <div className="payment-items">
              {/* Gom item tu tat ca table orders cua reservation de hien tren mot bill chung. */}
              {items.map((item) => (
                <article key={`${item.order.id}-${item.id}`} className={item.status === 'VOIDED' ? 'payment-item--voided' : ''}>
                  <div>
                    <strong>{item.menuItemName}</strong>
                    <small>{tableLabel(item.order)} - {item.note || 'No special request'}</small>
                    {item.status === 'VOIDED' ? (
                      <small className="payment-item-void-reason">Voided: {item.voidReason || 'No reason provided'}</small>
                    ) : null}
                  </div>
                  <span>x{item.quantity}</span>
                  <b>{money(item.lineTotal)}</b>
                  {item.status === 'VOIDED' ? (
                    <em className="payment-item-voided-badge">VOIDED</em>
                  ) : null}
                  {canVoidServedItems && item.status === 'SERVED' ? (
                    <button
                      type="button"
                      className="payment-item-void"
                      disabled={busy}
                      // khi bam void FE goi openVoidModal
                      onClick={() => openVoidModal(item)}
                    >
                      <XCircle size={15} /> Void
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          {/* Promotion chi duoc them/xoa khi bill con DRAFT. Sau khi PAID thi khoa lai. */}
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
                  //Bam apply thi goi ham applyPromotion
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
          {/* Tong ket tien bill sau khi cong subtotal va tru discount cua promotion. */}
          <section className="payment-panel payment-bill">
            <h2>Bill summary</h2>
            <div>
              <span>Subtotal <strong>{money(bill?.subtotal ?? group.subtotal)}</strong></span>
              <span>Discount <strong>-{money(bill?.discountAmount || 0)}</strong></span>
              <span>Total <strong>{money(bill?.total ?? group.subtotal)}</strong></span>
            </div>
          </section>

          {/* Khu vuc chon phuong thuc thanh toan: Cash hoac SePay QR. */}
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
                // chon cash thi chua thanh toan, chi doi state tren FE
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
              // user bam card sepay QR --> FE chay setSelectedPaymentMethod
              onClick={() => setSelectedPaymentMethod('SEPAY')}
            >
              <div>
                <span><QrCode size={17} /> SePay QR</span>
                <p>Generate a bank transfer QR and wait for webhook confirmation.</p>
              </div>
              <i className="payment-method-radio" />
            </button>

            {selectedPaymentMethod === 'CASH' ? (// nut confirm cash nam trong dieu kien
              <div className="payment-method-action">
                {/* Cash can staff bam xac nhan bang modal truoc khi BE mark bill PAID. */}
                {billStatus !== 'PAID' ? (
                  <button
                    type="button"
                    className="payment-button payment-button--secondary"
                    disabled={busy || !canCreatePayment}
                    // khi bam confirm cash no chua goi API ma mo modal xac nhan
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
                {/* SePay hien noi dung chuyen khoan de webhook co the match dung bill. */}
                {bill?.paymentCode ? (
                  <div className="payment-code-box">
                    <span>Transfer content</span>
                    <strong>{bill.paymentCode}</strong>
                  </div>
                ) : null}
                {/* FE nhan paymentQrImageUrl tu BE roi hien thi anh QR cho khach quet. */}
                {bill?.paymentQrImageUrl ? (
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

          {/* Chi cho in hoa don sau khi bill da thanh toan. */}
          {billStatus === 'PAID' ? (
            <button
              type="button"
              className="payment-button payment-button--secondary payment-print-button"
              onClick={() => printInvoice({ group, bill })}
            >
              <Printer size={17} /> Print invoice
            </button>
          ) : null}

          {/* Complete reservation chi enable khi bill PAID va tat ca mon da served. */}
          <button
            type="button"
            className="payment-button payment-button--success payment-close"
            disabled={busy || !canComplete}
            //Sau khi bam, FE goi ham completeReservation
            onClick={completeReservation}
          >
            <Check size={18} /> Complete reservation
          </button>
        </aside>
      </div>

      {/* Modal xac nhan tien mat de tranh bam nham lam bill thanh PAID. */}
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

      {/* Modal void item bat buoc nhap ly do de sau nay co audit trail. */}
      {voidModal.open && (
        <div className="payment-modal-backdrop" onClick={closeVoidModal}>
          <div className="payment-modal" onClick={(event) => event.stopPropagation()}>
            <div className="payment-modal-icon"><XCircle size={28} /></div>
            <h2>Void Served Item</h2>
            <p>
              Remove <strong>{voidModal.item?.menuItemName}</strong> from this bill and keep an audit record.
            </p>
            <div className="payment-modal-summary">
              <span>Available <strong>x{maxVoidQuantity}</strong></span>
              <span>
                Void quantity
                <strong className="payment-void-stepper">
                  <button
                    type="button"
                    disabled={busy || selectedVoidQuantity <= 1}
                    onClick={() => changeVoidQuantity(selectedVoidQuantity - 1)}
                    aria-label="Decrease void quantity"
                  >
                    <Minus size={14} />
                  </button>
                  x{selectedVoidQuantity}
                  <button
                    type="button"
                    disabled={busy || selectedVoidQuantity >= maxVoidQuantity}
                    onClick={() => changeVoidQuantity(selectedVoidQuantity + 1)}
                    aria-label="Increase void quantity"
                  >
                    <Plus size={14} />
                  </button>
                </strong>
              </span>
              <span>Amount <strong>{money(selectedVoidAmount)}</strong></span>
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
