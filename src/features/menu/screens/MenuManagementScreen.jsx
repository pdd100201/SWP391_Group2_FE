import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  PackageX,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { usePagination } from '../../../shared/hooks/usePagination'
import { menuService } from '../services/menuService'
import './MenuManagementScreen.css'

const MENU_CATEGORIES = ['Appetizer', 'Main Course', 'Side Dish', 'Dessert', 'Beverage']
const PAGE_SIZE = 6
const MAX_DISH_NAME_LENGTH = 80
const MAX_DESCRIPTION_LENGTH = 500
const MAX_IMAGE_URL_LENGTH = 500
const MAX_PRICE = 999999999

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  imageUrl: '',
  price: '',
}

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} ₫`

function getErrorMessage(error, fallback) {
  const errors = error.response?.data?.errors
  if (errors) return Object.values(errors).join('. ')
  return error.response?.data?.message || fallback
}

function isValidUrl(value) {
  if (!value.trim()) return true
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

function validateMenuForm(form) {
  const errors = {}
  const name = form.name.trim()
  const imageUrl = form.imageUrl.trim()
  const description = form.description.trim()
  const price = Number(form.price)

  if (!name) errors.name = 'Dish name is required'
  else if (name.length < 2) errors.name = 'Dish name must be at least 2 characters'
  else if (name.length > MAX_DISH_NAME_LENGTH) errors.name = `Dish name must not exceed ${MAX_DISH_NAME_LENGTH} characters`

  if (!form.category) errors.category = 'Category is required'
  else if (!MENU_CATEGORIES.includes(form.category)) errors.category = 'Choose a valid category'

  if (form.price === '') errors.price = 'Dish price is required'
  else if (!Number.isFinite(price) || price <= 0) errors.price = 'Dish price must be greater than 0'
  else if (price > MAX_PRICE) errors.price = 'Dish price is too large'

  if (imageUrl.length > MAX_IMAGE_URL_LENGTH) errors.imageUrl = `Image URL must not exceed ${MAX_IMAGE_URL_LENGTH} characters`
  else if (!isValidUrl(imageUrl)) errors.imageUrl = 'Image URL must start with http:// or https://'

  if (description.length > MAX_DESCRIPTION_LENGTH) errors.description = `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`

  return errors
}

function AvailabilityBadge({ status }) {
  const config = {
    AVAILABLE: { label: 'Available', className: 'menu-badge--available', icon: CheckCircle2 },
    INACTIVE: { label: 'Inactive', className: 'menu-badge--inactive', icon: AlertTriangle },
  }
  const current = config[status] || config.INACTIVE
  const Icon = current.icon

  return (
    <span className={`menu-badge ${current.className}`}>
      <Icon size={13} />
      {current.label}
    </span>
  )
}

function DishModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(() => item
    ? {
        name: item.name,
        category: item.category,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        price: item.price?.toString() || '',
      }
    : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const nextFieldErrors = validateMenuForm(form)
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) {
      setError('Please fix the highlighted fields before saving')
      return
    }
    const price = Number(form.price)

    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      price,
    }

    setSaving(true)
    try {
      const response = item
        ? await menuService.update(item.id, payload)
        : await menuService.create(payload)
      onSaved(response.data)
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to save menu item'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="menu-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="menu-modal" onClick={(event) => event.stopPropagation()}>
        <header className="menu-modal__header">
          <div>
            <span className="menu-modal__eyebrow">Menu item</span>
            <h2>{item ? 'Edit menu item' : 'Create menu item'}</h2>
          </div>
          <button type="button" className="menu-icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          {error && <div className="menu-form-error"><AlertTriangle size={16} />{error}</div>}

          <div className="menu-form-grid">
            <label className="menu-field">
              <span>Dish name *</span>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                maxLength={MAX_DISH_NAME_LENGTH}
                className={fieldErrors.name ? 'is-invalid' : ''}
                placeholder="e.g. Garlic Butter Salmon"
              />
              {fieldErrors.name && <small className="menu-field-error">{fieldErrors.name}</small>}
            </label>
            <label className="menu-field">
              <span>Category *</span>
              <select name="category" value={form.category} onChange={updateField} className={fieldErrors.category ? 'is-invalid' : ''}>
                <option value="">Select category</option>
                {MENU_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
              {fieldErrors.category && <small className="menu-field-error">{fieldErrors.category}</small>}
            </label>
            <label className="menu-field">
              <span>Price (VND) *</span>
              <input
                name="price"
                type="number"
                min="0"
                step="1000"
                value={form.price}
                onChange={updateField}
                className={fieldErrors.price ? 'is-invalid' : ''}
                placeholder="54000"
              />
              {fieldErrors.price && <small className="menu-field-error">{fieldErrors.price}</small>}
            </label>
            <label className="menu-field">
              <span>Image URL</span>
              <input
                name="imageUrl"
                value={form.imageUrl}
                onChange={updateField}
                maxLength={MAX_IMAGE_URL_LENGTH}
                className={fieldErrors.imageUrl ? 'is-invalid' : ''}
                placeholder="https://..."
              />
              {fieldErrors.imageUrl && <small className="menu-field-error">{fieldErrors.imageUrl}</small>}
            </label>
            <label className="menu-field menu-field--full">
              <span>Description</span>
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                maxLength={MAX_DESCRIPTION_LENGTH}
                className={fieldErrors.description ? 'is-invalid' : ''}
                rows="3"
              />
              {fieldErrors.description && <small className="menu-field-error">{fieldErrors.description}</small>}
            </label>
          </div>

          <div className="menu-price-preview">
            <CircleDollarSign size={18} />
            <span>Menu price</span>
            <strong>{money(form.price)}</strong>
          </div>

          <footer className="menu-modal__actions">
            <button type="button" className="menu-button menu-button--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="menu-button menu-button--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save menu item'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function MenuManagementScreen() {
  const role = sessionStorage.getItem('role')
  const canManage = ['ADMIN', 'MANAGER'].includes(role)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [availability, setAvailability] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const menuResponse = await menuService.getAll()
      setMenuItems(menuResponse.data)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load menu management data'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredItems = useMemo(() => menuItems.filter((item) => {
    const matchesKeyword = item.name.toLowerCase().includes(keyword.trim().toLowerCase())
    const matchesCategory = !category || item.category === category
    const matchesAvailability = !availability || item.availability === availability
    return matchesKeyword && matchesCategory && matchesAvailability
  }), [menuItems, keyword, category, availability])

  const pagination = usePagination(filteredItems, PAGE_SIZE)

  useEffect(() => {
    pagination.reset()
  }, [keyword, category, availability])

  useEffect(() => {
    if (pagination.page > 0 && pagination.page >= pagination.totalPages) {
      pagination.setPage(Math.max(0, pagination.totalPages - 1))
    }
  }, [pagination.page, pagination.totalPages])

  const categories = [...new Set(menuItems.map((item) => item.category))].sort()
  const stats = {
    total: menuItems.length,
    available: menuItems.filter((item) => item.availability === 'AVAILABLE').length,
    inactive: menuItems.filter((item) => item.availability === 'INACTIVE').length,
  }

  const handleRefresh = () => {
    setKeyword('')
    setCategory('')
    setAvailability('')
    loadData()
  }

  const openCreate = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleSaved = (savedItem) => {
    setMenuItems((current) => {
      const exists = current.some((item) => item.id === savedItem.id)
      return exists
        ? current.map((item) => item.id === savedItem.id ? savedItem : item)
        : [savedItem, ...current]
    })
    setModalOpen(false)
    setEditingItem(null)
  }

  const toggleActive = async (item) => {
    setTogglingId(item.id)
    setError('')
    try {
      const response = await menuService.toggleActive(item.id)
      setMenuItems((current) => current.map((currentItem) =>
        currentItem.id === item.id ? response.data : currentItem
      ))
    } catch (toggleError) {
      setError(getErrorMessage(toggleError, 'Unable to change menu item status'))
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="menu-screen">
      <header className="menu-screen__header">
        <div>
          <span className="menu-screen__eyebrow"><ChefHat size={16} /> Menu pricing</span>
          <h1>Menu Management</h1>
          <p>Create dishes with a direct selling price.</p>
        </div>
        <div className="menu-screen__actions">
          <button type="button" className="menu-button menu-button--secondary" onClick={handleRefresh}>
            <RefreshCw size={16} /> Refresh
          </button>
          {canManage && (
            <button type="button" className="menu-button menu-button--primary" onClick={openCreate}>
              <Plus size={17} /> Add menu item
            </button>
          )}
        </div>
      </header>

      <section className="menu-stats">
        <article><UtensilsCrossed /><div><strong>{stats.total}</strong><span>Total dishes</span></div></article>
        <article><CheckCircle2 /><div><strong>{stats.available}</strong><span>Available</span></div></article>
        <article><PackageX /><div><strong>{stats.inactive}</strong><span>Inactive</span></div></article>
      </section>

      <section className="menu-filters">
        <label className="menu-search">
          <Search size={17} />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Search dishes..." />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((itemCategory) => <option key={itemCategory}>{itemCategory}</option>)}
        </select>
        <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
          <option value="">All availability</option>
          <option value="AVAILABLE">Available</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </section>

      {error && <div className="menu-page-error"><AlertTriangle size={18} />{error}</div>}

      {loading ? (
        <div className="menu-loading"><RefreshCw className="menu-spin" /><span>Loading menu...</span></div>
      ) : filteredItems.length === 0 ? (
        <div className="menu-empty"><ChefHat size={44} /><h2>No menu items found</h2><p>Create a dish or clear the current filters.</p></div>
      ) : (
        <section className="menu-grid">
          {pagination.currentItems.map((item) => (
            <article className="menu-card" key={item.id}>
              <div className="menu-card__image">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name} />
                  : <div className="menu-card__placeholder"><ChefHat size={34} /></div>}
                <AvailabilityBadge status={item.availability} />
              </div>
              <div className="menu-card__body">
                <div className="menu-card__title-row">
                  <div><span>{item.category}</span><h2>{item.name}</h2></div>
                  {canManage && (
                    <button
                      type="button"
                      className="menu-icon-button"
                      onClick={() => { setEditingItem(item); setModalOpen(true) }}
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil size={17} />
                    </button>
                  )}
                </div>
                <p className="menu-card__description">{item.description || 'No description provided.'}</p>

                <div className="menu-card__price">
                  <span>Price</span>
                  <strong>{money(item.price)}</strong>
                </div>

                {canManage && (
                  <button
                    type="button"
                    className={`menu-button menu-button--wide ${item.isActive ? 'menu-button--danger-soft' : 'menu-button--primary'}`}
                    onClick={() => toggleActive(item)}
                    disabled={togglingId === item.id}
                  >
                    {togglingId === item.id ? 'Updating...' : item.isActive ? 'Stop serving manually' : 'Activate dish'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="menu-pagination-bar">
          <span>Showing {pagination.startIdx}-{pagination.endIdx} of {pagination.totalElements}</span>
          <div className="menu-pagination">
            <button type="button" aria-label="First page" disabled={pagination.isFirst} onClick={() => pagination.setPage(0)}><ChevronFirst size={16} /></button>
            <button type="button" aria-label="Previous page" disabled={pagination.isFirst} onClick={() => pagination.setPage(pagination.page - 1)}><ChevronLeft size={16} /></button>
            {pagination.getPageNumbers().map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === pagination.page ? 'is-active' : ''}
                onClick={() => pagination.setPage(pageNumber)}
              >
                {pageNumber + 1}
              </button>
            ))}
            <button type="button" aria-label="Next page" disabled={pagination.isLast} onClick={() => pagination.setPage(pagination.page + 1)}><ChevronRight size={16} /></button>
            <button type="button" aria-label="Last page" disabled={pagination.isLast} onClick={() => pagination.setPage(Math.max(0, pagination.totalPages - 1))}><ChevronLast size={16} /></button>
          </div>
        </div>
      )}

      {canManage && modalOpen && (
        <DishModal
          item={editingItem}
          onClose={() => { setModalOpen(false); setEditingItem(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default MenuManagementScreen
