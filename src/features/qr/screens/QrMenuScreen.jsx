import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createSession, getMenu, getActiveOrder } from '../api/qrApi'
import './QrMenuScreen.css'

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

export default function QrMenuScreen() {
  const { tableId } = useParams()
  const navigate = useNavigate()

  const [tableNumber, setTableNumber] = useState('')
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState(loadCart)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notCheckedIn, setNotCheckedIn] = useState(false)
  const [stockAlert, setStockAlert] = useState({ itemId: null, msg: '' })
  const [activeCategory, setActiveCategory] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)

  const stickyTopRef = useRef(null)   // wrapper chứa header + nav
  const navInnerRef = useRef(null)    // scrollable nav bar inner
  const categoryRefs = useRef({})    // { categoryName: DOM element }
  const isScrollingToCategory = useRef(false)

  // ── Fetch session + menu ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      try {
        const [sessionData, menuData, orderData] = await Promise.all([
          createSession(tableId),
          getMenu(),
          getActiveOrder(tableId),
        ])
        if (cancelled) return

        sessionStorage.setItem('qr_session_token', sessionData.sessionToken)
        sessionStorage.setItem('qr_table_id', sessionData.tableId)
        setTableNumber(sessionData.tableNumber || `Table ${tableId}`)
        setCategories(menuData.categories || [])
        setActiveOrder(orderData || null)
      } catch (err) {
        if (!cancelled) {
          if (err?.response?.status === 409) {
            setNotCheckedIn(true)
          } else {
            setError('The menu could not be loaded. Please try again.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [tableId])

  // ── IntersectionObserver: detect category đang nhìn thấy ─────────
  useEffect(() => {
    if (categories.length === 0) return

    const stickyHeight = stickyTopRef.current?.offsetHeight || 120
    const rootMarginTop = `-${stickyHeight + 8}px`

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToCategory.current) return
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.dataset.category)
          }
        })
      },
      { rootMargin: `${rootMarginTop} 0px -55% 0px`, threshold: 0 }
    )

    Object.values(categoryRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [categories])

  // ── Auto-scroll nav button của active category vào tầm nhìn ──────
  useEffect(() => {
    if (!activeCategory || !navInnerRef.current) return
    const btn = navInnerRef.current.querySelector(`[data-nav="${CSS.escape(activeCategory)}"]`)
    if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeCategory])

  // ── Scroll đến section category ──────────────────────────────────
  function scrollToCategory(name) {
    setActiveCategory(name)
    isScrollingToCategory.current = true
    setTimeout(() => { isScrollingToCategory.current = false }, 800)
    const el = categoryRefs.current[name]
    if (!el) return
    const stickyHeight = stickyTopRef.current?.offsetHeight || 120
    const top = el.getBoundingClientRect().top + window.scrollY - stickyHeight - 8
    window.scrollTo({ top, behavior: 'smooth' })
  }

  // ── Giỏ hàng ─────────────────────────────────────────────────────
  function addToCart(item) {
    if (item.canServe <= 0) return

    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.itemId)
      const currentQty = existing ? existing.quantity : 0

      if (currentQty >= item.canServe) {
        setStockAlert({ itemId: item.itemId, msg: `Only ${item.canServe} serving(s) available` })
        setTimeout(() => setStockAlert({ itemId: null, msg: '' }), 2500)
        return prev
      }

      let next
      if (existing) {
        next = prev.map((c) =>
          c.itemId === item.itemId ? { ...c, quantity: c.quantity + 1 } : c
        )
      } else {
        next = [...prev, { ...item, quantity: 1 }]
      }
      saveCart(next)
      return next
    })
  }

  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0)

  const itemStatusLabel = {
    DRAFT: 'Draft',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY: 'Ready',
    SERVED: 'Served',
    CANCELLED: 'Cancelled',
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="qr-menu">
        <div className="qr-menu__sticky-top">
          <div className="qr-menu__header">
            <h1>Menu</h1>
          </div>
        </div>
        <div className="qr-menu__loading">
          <div className="qr-menu__spinner" />
          <span>Loading menu...</span>
        </div>
      </div>
    )
  }

  // ── Bàn chưa check-in ────────────────────────────────────────────
  if (notCheckedIn) {
    return (
      <div className="qr-menu">
        <div className="qr-menu__sticky-top">
          <div className="qr-menu__header">
            <h1>Menu</h1>
          </div>
        </div>
        <div className="qr-menu__error" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🪑</div>
          <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Table not checked in</div>
          <div style={{ color: '#666', fontSize: 14 }}>
            Please contact a staff member for assistance.
          </div>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="qr-menu">
        <div className="qr-menu__sticky-top">
          <div className="qr-menu__header">
            <h1>Menu</h1>
          </div>
        </div>
        <div className="qr-menu__error">
          <span>{error}</span>
          <button className="qr-menu__retry-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div className="qr-menu">
      {/* Sticky: header + category nav */}
      <div className="qr-menu__sticky-top" ref={stickyTopRef}>
        <div className="qr-menu__header">
          <h1>Menu</h1>
          <span className="qr-menu__table-badge">{tableNumber}</span>
        </div>

        <nav className="qr-menu__cat-nav">
          <div className="qr-menu__cat-nav-inner" ref={navInnerRef}>
            {categories.map((cat) => (
              <button
                key={cat.categoryName}
                data-nav={cat.categoryName}
                className={`qr-menu__cat-nav-btn${activeCategory === cat.categoryName ? ' qr-menu__cat-nav-btn--active' : ''}`}
                onClick={() => scrollToCategory(cat.categoryName)}
              >
                {cat.categoryName}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Active order banner */}
      {activeOrder && (
        <div className="qr-active-order">
          <div className="qr-active-order__header">
            <span className="qr-active-order__title">Current order</span>
            <span className="qr-active-order__id">{activeOrder.orderCode || `#${activeOrder.orderId}`}</span>
          </div>
          <ul className="qr-active-order__list">
            {Object.values(
              (activeOrder.items || [])
                .filter((item) => item.itemStatus !== 'CANCELLED')
                .reduce((acc, item) => {
                  const key = `${item.itemName}-${item.itemStatus}`
                  if (acc[key]) {
                    acc[key].quantity += item.quantity
                  } else {
                    acc[key] = { ...item }
                  }
                  return acc
                }, {})
            ).map((item) => (
              <li key={`${item.itemName}-${item.itemStatus}`} className="qr-active-order__row">
                <span className="qr-active-order__item-name">{item.itemName}</span>
                <span className="qr-active-order__item-qty">x{item.quantity}</span>
                <span className={`qr-active-order__status qr-active-order__status--${(item.itemStatus || 'confirmed').toLowerCase()}`}>
                  {itemStatusLabel[item.itemStatus] || item.itemStatus}
                </span>
              </li>
            ))}
          </ul>
          <div className="qr-active-order__footer">
            <button
              className="qr-active-order__view-btn"
              onClick={() => navigate(`/qr/table/${tableId}/status`)}
            >
              View details
            </button>
          </div>
        </div>
      )}

      {/* Menu body */}
      <div className="qr-menu__body">
        {categories.map((category) => (
          <div
            key={category.categoryName}
            className="qr-menu__category"
            ref={(el) => { categoryRefs.current[category.categoryName] = el }}
            data-category={category.categoryName}
          >
            <h2 className="qr-menu__category-title">{category.categoryName}</h2>

            {category.items.map((item) => {
              const inCart = cart.find((c) => c.itemId === item.itemId)
              const soldOut = item.canServe <= 0
              const showAlert = stockAlert.itemId === item.itemId
              return (
                <div key={item.itemId} className="qr-menu__item">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.itemName}
                      className="qr-menu__item-img"
                    />
                  ) : (
                    <div className="qr-menu__item-img-placeholder">🍽️</div>
                  )}
                  <div className="qr-menu__item-info">
                    <div className="qr-menu__item-name">{item.itemName}</div>
                    {item.description && (
                      <div className="qr-menu__item-desc">{item.description}</div>
                    )}
                    <div className="qr-menu__item-price">{formatPrice(item.price)}</div>
                    {showAlert && (
                      <div className="qr-menu__stock-alert">{stockAlert.msg}</div>
                    )}
                  </div>
                  {soldOut ? (
                    <span className="qr-menu__sold-out">Sold out</span>
                  ) : (
                    <button
                      className={`qr-menu__add-btn${inCart ? ' qr-menu__add-btn--added' : ''}`}
                      onClick={() => addToCart(item)}
                    >
                      {inCart ? `+${inCart.quantity}` : '+ Add'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {totalItems > 0 && (
        <button
          className="qr-menu__cart-fab"
          onClick={() => navigate(`/qr/table/${tableId}/cart`)}
        >
          <span>View cart</span>
          <span className="qr-menu__cart-fab-badge">{totalItems}</span>
        </button>
      )}
    </div>
  )
}
