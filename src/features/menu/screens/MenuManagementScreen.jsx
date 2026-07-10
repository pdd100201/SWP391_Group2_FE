import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Clock3,
  PackageX,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { menuService } from '../services/menuService'
import './MenuManagementScreen.css'

const MENU_CATEGORIES = ['Appetizer', 'Main Course', 'Side Dish', 'Dessert', 'Beverage']

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  imageUrl: '',
  price: '',
}

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VND`

function getErrorMessage(error, fallback) {
  const errors = error.response?.data?.errors
  if (errors) return Object.values(errors).join('. ')
  return error.response?.data?.message || fallback
}

function AvailabilityBadge({ status }) {
  const config = {
    AVAILABLE: { label: 'Available', className: 'menu-badge--available', icon: CheckCircle2 },
    LIMITED: { label: 'Limited', className: 'menu-badge--limited', icon: Clock3 },
    OUT_OF_STOCK: { label: 'Out of stock', className: 'menu-badge--out', icon: PackageX },
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

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const price = Number(form.price)
    if (!form.name.trim() || !form.category) {
      setError('Dish name and category are required')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Price must be greater than 0')
      return
    }

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
            <span className="menu-modal__eyebrow">Simple pricing</span>
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
              <input name="name" value={form.name} onChange={updateField} placeholder="e.g. Garlic Butter Salmon" />
            </label>
            <label className="menu-field">
              <span>Category *</span>
              <select name="category" value={form.category} onChange={updateField}>
                <option value="">Select category</option>
                {item?.category && !MENU_CATEGORIES.includes(item.category) && (
                  <option value={item.category}>{item.category}</option>
                )}
                {MENU_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="menu-field">
              <span>Price (VND) *</span>
              <input
                name="price"
                type="number"
                min="1"
                step="1000"
                value={form.price}
                onChange={updateField}
                placeholder="e.g. 149000"
              />
            </label>
            <label className="menu-field">
              <span>Image URL</span>
              <input name="imageUrl" value={form.imageUrl} onChange={updateField} placeholder="https://..." />
            </label>
            <label className="menu-field menu-field--full">
              <span>Description</span>
              <textarea name="description" value={form.description} onChange={updateField} rows="3" />
            </label>
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
      const response = await menuService.getAll()
      setMenuItems(response.data)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load menu items'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial API synchronization for this management screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [])

  const filteredItems = menuItems.filter((item) => {
    const matchesKeyword = item.name.toLowerCase().includes(keyword.trim().toLowerCase())
    const matchesCategory = !category || item.category === category
    const matchesAvailability = !availability || item.availability === availability
    return matchesKeyword && matchesCategory && matchesAvailability
  })

  const categories = [...new Set(menuItems.map((item) => item.category))].sort()
  const stats = {
    total: menuItems.length,
    available: menuItems.filter((item) => item.availability === 'AVAILABLE').length,
    limited: menuItems.filter((item) => item.availability === 'LIMITED').length,
    unavailable: menuItems.filter((item) => ['OUT_OF_STOCK', 'INACTIVE'].includes(item.availability)).length,
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
        <article><Clock3 /><div><strong>{stats.limited}</strong><span>Limited</span></div></article>
        <article><PackageX /><div><strong>{stats.unavailable}</strong><span>Unavailable</span></div></article>
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
          <option value="LIMITED">Limited</option>
          <option value="OUT_OF_STOCK">Out of stock</option>
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
          {filteredItems.map((item) => (
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

                <div className="menu-card__metrics">
                  <div><span>Price</span><strong>{money(item.price)}</strong></div>
                  <div><span>Status</span><strong>{item.availability?.replaceAll('_', ' ') || 'Unavailable'}</strong></div>
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
