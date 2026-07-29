import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ChefHat,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { menuService } from '../services/menuService'
import { usePagination } from '../../../shared/hooks/usePagination'
import ImageUploader from '../../../shared/components/ui/ImageUploader/ImageUploader'
import './MenuManagementScreen.css'

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  imageUrl: '',
  price: '',
}

const PAGE_SIZE = 8

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VND`
const wordCount = (value) => value.trim() ? value.trim().split(/\s+/).length : 0

function getErrorMessage(error, fallback) {
  const errors = error.response?.data?.errors
  if (errors) return Object.values(errors).join('. ')
  return error.response?.data?.message || fallback
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

function DishModal({ item, categories, onClose, onSaved }) {
  // Một modal dùng chung cho cả tạo mới và chỉnh sửa; item=null là chế độ tạo mới.
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
    if (!Number.isSafeInteger(price) || price <= 0) {
      setError('Price must be a positive integer')
      return
    }
    if (!form.description.trim()) {
      setError('Dish description is required')
      return
    }
    if (wordCount(form.description) > 200) {
      setError('Dish description must not exceed 200 words')
      return
    }
    if (!form.imageUrl.trim()) {
      setError('Dish image is required')
      return
    }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      // ImageUploader đã upload file trước và đưa secure URL của Cloudinary vào state.
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
              <input name="name" value={form.name} onChange={updateField} maxLength="100" required placeholder="e.g. Garlic Butter Salmon" />
            </label>
            <label className="menu-field">
              <span>Category *</span>
              <select name="category" value={form.category} onChange={updateField} required>
                <option value="">Select category</option>
                {item?.category && !categories.some((category) => category.name === item.category) && (
                  <option value={item.category}>{item.category}</option>
                )}
                {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
            </label>
            <label className="menu-field">
              <span>Price (VND) *</span>
              <input
                name="price"
                type="number"
                min="1"
                step="1"
                required
                value={form.price}
                onChange={updateField}
                placeholder="e.g. 149000"
              />
            </label>
            <div className="menu-field">
              {/* Ảnh món ăn được gom vào thư mục golden-spoon/menu trên Cloudinary. */}
              <ImageUploader label="Dish image *" folder="menu" value={form.imageUrl}
                onChange={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))} />
            </div>
            <label className="menu-field menu-field--full">
              <span>Description * ({wordCount(form.description)}/200 words)</span>
              <textarea name="description" value={form.description} onChange={updateField} rows="3" required />
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
  const [menuCategories, setMenuCategories] = useState([])
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
      const [menuResponse, categoryResponse] = await Promise.all([
        menuService.getAll(),
        menuService.getCategories(),
      ])
      setMenuItems(menuResponse.data)
      setMenuCategories(categoryResponse.data)
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
    // Lọc tại client vì endpoint hiện trả toàn bộ menu trong một request.
    const matchesKeyword = item.name.toLowerCase().includes(keyword.trim().toLowerCase())
    const matchesCategory = !category || item.category === category
    const matchesAvailability = !availability || item.availability === availability
    return matchesKeyword && matchesCategory && matchesAvailability
  })
  const pagination = usePagination(filteredItems, PAGE_SIZE)

  const filterCategories = [...new Set(menuItems.map((item) => item.category))].sort()
  const stats = {
    total: menuItems.length,
    available: menuItems.filter((item) => item.availability === 'AVAILABLE').length,
    inactive: menuItems.filter((item) => item.availability === 'INACTIVE').length,
  }

  const handleRefresh = () => {
    setKeyword('')
    setCategory('')
    setAvailability('')
    pagination.reset()
    loadData()
  }

  const openCreate = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleSaved = (savedItem) => {
    // Cập nhật đúng card vừa lưu để không cần gọi lại API lấy toàn bộ danh sách.
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
        <article><AlertTriangle /><div><strong>{stats.inactive}</strong><span>Inactive</span></div></article>
      </section>

      <section className="menu-filters">
        <label className="menu-search">
          <Search size={17} />
          <input value={keyword} onChange={(event) => { setKeyword(event.target.value); pagination.reset() }} placeholder="Search dishes..." />
        </label>
        <select value={category} onChange={(event) => { setCategory(event.target.value); pagination.reset() }}>
          <option value="">All categories</option>
          {filterCategories.map((itemCategory) => <option key={itemCategory}>{itemCategory}</option>)}
        </select>
        <select value={availability} onChange={(event) => { setAvailability(event.target.value); pagination.reset() }}>
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
        <>
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

          <div className="menu-pagination-footer">
            <span>Showing {pagination.startIdx}-{pagination.endIdx} of {pagination.totalElements}</span>
            <div className="menu-pagination">
              <button type="button" aria-label="First page" disabled={pagination.isFirst} onClick={() => pagination.setPage(0)}><ChevronFirst size={16} /></button>
              <button type="button" aria-label="Previous page" disabled={pagination.isFirst} onClick={() => pagination.setPage(pagination.page - 1)}><ChevronLeft size={16} /></button>
              {pagination.getPageNumbers().map((pageNumber) => (
                <button key={pageNumber} type="button" className={pageNumber === pagination.page ? 'is-active' : ''} onClick={() => pagination.setPage(pageNumber)}>
                  {pageNumber + 1}
                </button>
              ))}
              <button type="button" aria-label="Next page" disabled={pagination.isLast} onClick={() => pagination.setPage(pagination.page + 1)}><ChevronRight size={16} /></button>
              <button type="button" aria-label="Last page" disabled={pagination.isLast} onClick={() => pagination.setPage(Math.max(0, pagination.totalPages - 1))}><ChevronLast size={16} /></button>
            </div>
          </div>
        </>
      )}

      {canManage && modalOpen && (
        <DishModal
          item={editingItem}
          categories={menuCategories}
          onClose={() => { setModalOpen(false); setEditingItem(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default MenuManagementScreen
