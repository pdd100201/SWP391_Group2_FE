import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createSession, getMenu } from '../api/qrApi'
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
  const [stockAlert, setStockAlert] = useState({ itemId: null, msg: '' })
  const [activeCategory, setActiveCategory] = useState('')

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
        const [sessionData, menuData] = await Promise.all([
          createSession(tableId),
          getMenu(),
        ])
        if (cancelled) return

        sessionStorage.setItem('qr_session_token', sessionData.sessionToken)
        sessionStorage.setItem('qr_table_id', sessionData.tableId)
        setTableNumber(sessionData.tableNumber || `Bàn ${tableId}`)
        setCategories(menuData.categories || [])
      } catch {
        if (!cancelled) setError('Không thể tải menu. Vui lòng thử lại.')
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
        setStockAlert({ itemId: item.itemId, msg: `Chỉ còn ${item.canServe} phần trong bếp` })
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

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="qr-menu">
        <div className="qr-menu__sticky-top">
          <div className="qr-menu__header">
            <h1>Thực đơn</h1>
          </div>
        </div>
        <div className="qr-menu__loading">
          <div className="qr-menu__spinner" />
          <span>Đang tải menu...</span>
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
            <h1>Thực đơn</h1>
          </div>
        </div>
        <div className="qr-menu__error">
          <span>{error}</span>
          <button className="qr-menu__retry-btn" onClick={() => window.location.reload()}>
            Thử lại
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
          <h1>Thực đơn</h1>
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
                    <span className="qr-menu__sold-out">Hết món</span>
                  ) : (
                    <button
                      className={`qr-menu__add-btn${inCart ? ' qr-menu__add-btn--added' : ''}`}
                      onClick={() => addToCart(item)}
                    >
                      {inCart ? `+${inCart.quantity}` : '+ Thêm'}
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
          <span>Xem giỏ hàng</span>
          <span className="qr-menu__cart-fab-badge">{totalItems}</span>
        </button>
      )}
    </div>
  )
}
