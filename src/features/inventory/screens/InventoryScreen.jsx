import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Boxes,
  CheckCircle2,
  Info,
  PackageCheck,
  PackageX,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react'
import { inventoryService } from '../services/inventoryService'
import './InventoryScreen.css'

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = ['Vegetables', 'Meat', 'Seafood', 'Spices', 'Beverages', 'Dairy', 'Grains', 'Other']
const UNITS = ['kg', 'gram', 'lít', 'ml', 'cái', 'hộp', 'chai', 'túi', 'thùng']

const INITIAL_FORM = {
  itemName: '',
  category: '',
  unit: '',
  quantity: '',
  minimumQuantity: '',
  pricePerUnit: '',
  supplier: ''  ,
  imageUrl: '',
}

const ITEMS_PER_PAGE = 12

// ─── Status Badge (clickable) ─────────────────────────────────────────────────
function StatusBadge({ status, isOverridden, onEdit, readOnly = false }) {
  const map = {
    IN_STOCK:    { label: 'In Stock',     cls: 'inv-badge--green'  },
    LOW_STOCK:   { label: 'Low Stock',    cls: 'inv-badge--yellow' },
    OUT_OF_STOCK:{ label: 'Out of Stock', cls: 'inv-badge--red'    },
  }
  const { label, cls } = map[status] || { label: status, cls: '' }
  if (readOnly) {
    return (
      <span className={`inv-badge ${cls}`} title={isOverridden ? 'Status manually set' : 'Status auto-calculated'}>
        {label}
        {isOverridden && <span className="inv-badge__manual-dot" aria-label="manually set" />}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={`inv-badge ${cls} inv-badge--btn`}
      onClick={onEdit}
      title={isOverridden ? 'Status: manually set — click to edit' : 'Status: auto-calculated — click to override'}
      aria-label={`Status: ${label}. Click to edit`}
    >
      {label}
      {isOverridden && <span className="inv-badge__manual-dot" aria-label="manually set" />}
      <Pencil size={11} className="inv-badge__edit-icon" aria-hidden="true" />
    </button>
  )
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, id }) {
  return (
    <label className="inv-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="inv-toggle__input"
        checked={checked}
        onChange={onChange}
      />
      <span className="inv-toggle__track" aria-hidden="true" />
    </label>
  )
}

function SortableHeader({ field, label, sortConfig, onSort }) {
  const isActive = sortConfig.field === field
  const direction = isActive ? sortConfig.direction : null
  const SortIcon = direction === 'asc'
    ? ArrowUp
    : direction === 'desc'
      ? ArrowDown
      : ArrowUpDown

  return (
    <th aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}>
      <button
        type="button"
        className={`inv-table__sort-button ${isActive ? 'inv-table__sort-button--active' : ''}`}
        onClick={() => onSort(field)}
        title={`Sort ${label} ${direction === 'asc' ? 'descending' : 'ascending'}`}
      >
        <span>{label}</span>
        <SortIcon size={14} aria-hidden="true" />
      </button>
    </th>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`inv-toast inv-toast--${type}`} role="alert">
      {type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      <span>{message}</span>
      <button type="button" className="inv-toast__close" onClick={onClose} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  )
}

// ─── Add Item Modal ───────────────────────────────────────────────────────────
function AddItemModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        minimumQuantity: parseFloat(formData.minimumQuantity),
        pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : null,
      }
      const res = await inventoryService.create(payload)
      onSuccess(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="inv-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Add new inventory item">
      <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal__header">
          <h2 className="inv-modal__title">Add New Inventory Item</h2>
          <button type="button" className="inv-modal__close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="inv-modal__error" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="inv-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="inv-modal__grid">
            <div className="inv-form-field">
              <label htmlFor="add-itemName">Item Name *</label>
              <input
                id="add-itemName"
                name="itemName"
                type="text"
                value={formData.itemName}
                onChange={handleChange}
                placeholder="e.g. Fresh Tomatoes"
                required
              />
            </div>

            <div className="inv-form-field">
              <label htmlFor="add-category">Category *</label>
              <select id="add-category" name="category" value={formData.category} onChange={handleChange} required>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="inv-form-field">
              <label htmlFor="add-unit">Unit *</label>
              <select id="add-unit" name="unit" value={formData.unit} onChange={handleChange} required>
                <option value="">Select unit</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="inv-form-field">
              <label htmlFor="add-quantity">Current Quantity *</label>
              <input
                id="add-quantity"
                name="quantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
                required
              />
            </div>

            <div className="inv-form-field">
              <label htmlFor="add-minimumQuantity">Minimum Quantity *</label>
              <input
                id="add-minimumQuantity"
                name="minimumQuantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.minimumQuantity}
                onChange={handleChange}
                placeholder="0"
                required
              />
            </div>

            <div className="inv-form-field">
              <label htmlFor="add-pricePerUnit">Price / Unit (VND)</label>
              <input
                id="add-pricePerUnit"
                name="pricePerUnit"
                type="number"
                min="0"
                step="1"
                value={formData.pricePerUnit}
                onChange={handleChange}
                placeholder="0"
              />
            </div>

            <div className="inv-form-field inv-form-field--full">
              <label htmlFor="add-supplier">Supplier</label>
              <input
                id="add-supplier"
                name="supplier"
                type="text"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="e.g. Fresh Farm Co."
              />
            </div>

            <div className="inv-form-field inv-form-field--full">
              <label htmlFor="add-imageUrl">Image URL</label>
              <input
                id="add-imageUrl"
                name="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
              {formData.imageUrl && (
                <div className="inv-form-field__preview">
                  <img src={formData.imageUrl} alt="Preview" className="inv-img-preview" />
                </div>
              )}
            </div>
          </div>

          <div className="inv-modal__actions">
            <button type="button" className="inv-btn inv-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="inv-btn inv-btn--primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Update Inventory Item Modal ──────────────────────────────────────────────
function UpdateItemModal({ item, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    category: item.category,
    unit: item.unit,
    quantity: item.quantity?.toString() ?? '',
    minimumQuantity: item.minimumQuantity?.toString() ?? '',
    pricePerUnit: item.pricePerUnit?.toString() ?? '',
    supplier: item.supplier ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const numQty = parseFloat(formData.quantity)
  const numMinQty = parseFloat(formData.minimumQuantity)
  const isBelowMin = !isNaN(numQty) && !isNaN(numMinQty) && numQty <= numMinQty && numQty > 0
  const isOutOfStock = !isNaN(numQty) && numQty === 0
  const needRestock = isBelowMin || isOutOfStock
  const suggestedQty = !isNaN(numMinQty) ? numMinQty * 2 : 0

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const quantity = parseFloat(formData.quantity)
    const minimumQuantity = parseFloat(formData.minimumQuantity)
    const pricePerUnit = formData.pricePerUnit === '' ? null : parseFloat(formData.pricePerUnit)

    if (!formData.category || !formData.unit || Number.isNaN(quantity) || Number.isNaN(minimumQuantity)) {
      setError('Please complete all required fields')
      return
    }

    if (quantity < 0 || minimumQuantity < 0 || (pricePerUnit != null && (Number.isNaN(pricePerUnit) || pricePerUnit < 0))) {
      setError('Quantity, minimum quantity and price cannot be negative')
      return
    }

    setSubmitting(true)
    try {
      const res = await inventoryService.updateItem(item.id, {
        category: formData.category,
        unit: formData.unit,
        quantity,
        minimumQuantity,
        pricePerUnit,
        supplier: formData.supplier.trim() || null,
      })
      onSuccess(res.data)
    } catch (err) {
      const validationErrors = err.response?.data?.errors
      setError(
        validationErrors
          ? Object.values(validationErrors).join('. ')
          : err.response?.data?.message || 'Failed to update inventory item'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="inv-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Edit inventory item">
      <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal__header">
          <h2 className="inv-modal__title">Edit Inventory Item</h2>
          <button type="button" className="inv-modal__close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="inv-modal__item-info">
          <span className="inv-modal__item-name">{item.itemName}</span>
          <span className="inv-modal__item-meta">Correct item details entered during creation</span>
        </div>

        {error && (
          <div className="inv-modal__error" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Live restock warning ── */}
        {needRestock && (
          <div
            className={`inv-restock-alert ${isOutOfStock ? 'inv-restock-alert--danger' : 'inv-restock-alert--warn'}`}
            role="alert"
          >
            <div className="inv-restock-alert__icon">
              {isOutOfStock ? <PackageX size={22} /> : <AlertTriangle size={22} />}
            </div>
            <div className="inv-restock-alert__body">
              <strong>
                {isOutOfStock
                  ? '⚠ Hết hàng! Cần nhập thêm ngay'
                  : '⚠ Tồn kho dưới mức tối thiểu'}
              </strong>
              <p>
                Số lượng hiện tại{' '}
                <em>{isNaN(numQty) ? '—' : numQty} {formData.unit}</em>
                {' '}thấp hơn mức tối thiểu{' '}
                <em>{isNaN(numMinQty) ? '—' : numMinQty} {formData.unit}</em>.
              </p>
              <p className="inv-restock-alert__suggestion">
                <ShoppingCart size={13} />
                Đề xuất: nhập thêm ít nhất{' '}
                <strong>{suggestedQty} {formData.unit}</strong>{' '}
                để đảm bảo vận hành nhà hàng không bị gián đoạn.
              </p>
            </div>
          </div>
        )}

        <form className="inv-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="inv-modal__grid">
            <div className="inv-form-field">
              <label htmlFor="upd-category">Category *</label>
              <select
                id="upd-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                autoFocus
              >
                <option value="">Select category</option>
                {item.category && !CATEGORIES.includes(item.category) && (
                  <option value={item.category}>{item.category}</option>
                )}
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="inv-form-field">
              <label htmlFor="upd-unit">Unit *</label>
              <select id="upd-unit" name="unit" value={formData.unit} onChange={handleChange} required>
                <option value="">Select unit</option>
                {item.unit && !UNITS.includes(item.unit) && (
                  <option value={item.unit}>{item.unit}</option>
                )}
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div className="inv-form-field">
              <label htmlFor="upd-quantity">Quantity *</label>
              <input
                id="upd-quantity"
                name="quantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={handleChange}
                required
                className={needRestock ? (isOutOfStock ? 'inv-input--danger' : 'inv-input--warn') : ''}
              />
            </div>

            <div className="inv-form-field">
              <label htmlFor="upd-minimumQuantity">Min Qty *</label>
              <input
                id="upd-minimumQuantity"
                name="minimumQuantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.minimumQuantity}
                onChange={handleChange}
                required
              />
            </div>

            <div className="inv-form-field">
              <label htmlFor="upd-pricePerUnit">Price / Unit (VND)</label>
              <input
                id="upd-pricePerUnit"
                name="pricePerUnit"
                type="number"
                min="0"
                step="1"
                value={formData.pricePerUnit}
                onChange={handleChange}
                placeholder="0"
              />
            </div>

            <div className="inv-form-field">
              <label htmlFor="upd-supplier">Supplier</label>
              <input
                id="upd-supplier"
                name="supplier"
                type="text"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="e.g. Fresh Farm Co."
              />
            </div>
          </div>

          <div className="inv-modal__actions">
            <button type="button" className="inv-btn inv-btn--ghost" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              className={`inv-btn ${needRestock ? (isOutOfStock ? 'inv-btn--danger' : 'inv-btn--warn') : 'inv-btn--primary'}`}
              disabled={submitting}
            >
              {submitting ? 'Đang cập nhật...' : needRestock ? '⚠ Lưu thay đổi' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Confirm Toggle Modal ─────────────────────────────────────────────────────
function ConfirmToggleModal({ item, onClose, onConfirm, confirming }) {
  const isDeactivating = item.isActive

  return (
    <div
      className="inv-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm status change"
    >
      <div className="inv-modal inv-modal--sm inv-modal--confirm" onClick={(e) => e.stopPropagation()}>
        {/* Icon Header */}
        <div className={`inv-confirm__icon-wrap ${isDeactivating ? 'inv-confirm__icon-wrap--warn' : 'inv-confirm__icon-wrap--success'}`}>
          {isDeactivating
            ? <AlertTriangle size={32} aria-hidden="true" />
            : <CheckCircle2 size={32} aria-hidden="true" />}
        </div>

        {/* Title */}
        <h2 className="inv-confirm__title">
          {isDeactivating ? 'Deactivate Item?' : 'Activate Item?'}
        </h2>

        {/* Item name chip */}
        <div className="inv-confirm__item-chip">
          {item.imageUrl && (
            <img src={item.imageUrl} alt="" className="inv-confirm__item-img" />
          )}
          <span>{item.itemName}</span>
          <span className="inv-confirm__item-cat">{item.category}</span>
        </div>

        {/* Warning message */}
        {isDeactivating ? (
          <div className="inv-confirm__warning">
            <AlertTriangle size={15} aria-hidden="true" />
            <p>
              Hàng hóa này có thể đang được sử dụng trong <strong>thực đơn của nhà hàng</strong>.
              Vô hiệu hóa sẽ ảnh hưởng đến các món ăn liên quan.
              Bạn có chắc chắn muốn tiếp tục?
            </p>
          </div>
        ) : (
          <p className="inv-confirm__note">
            Kích hoạt lại mặt hàng này sẽ cho phép nó xuất hiện trở lại trong hệ thống.
          </p>
        )}

        {/* Actions */}
        <div className="inv-modal__actions">
          <button type="button" className="inv-btn inv-btn--ghost" onClick={onClose} disabled={confirming}>
            Hủy
          </button>
          <button
            type="button"
            id="btn-confirm-toggle"
            className={`inv-btn ${isDeactivating ? 'inv-btn--danger' : 'inv-btn--primary'}`}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming
              ? 'Đang xử lý...'
              : isDeactivating ? 'Vô hiệu hóa' : 'Kích hoạt'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Status Modal ────────────────────────────────────────────────────────
function EditStatusModal({ item, onClose, onSuccess }) {
  const [selected, setSelected] = useState(item.isStatusOverridden ? item.status : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const autoStatus = (() => {
    if (item.quantity <= 0)                       return 'OUT_OF_STOCK'
    if (item.quantity <= item.minimumQuantity)    return 'LOW_STOCK'
    return 'IN_STOCK'
  })()

  const statusLabel = { IN_STOCK: 'In Stock', LOW_STOCK: 'Low Stock', OUT_OF_STOCK: 'Out of Stock' }

  const handleSave = async () => {
    setError('')
    setSubmitting(true)
    try {
      // selected === '' means reset to auto
      const res = await inventoryService.updateStatus(item.id, selected || null)
      onSuccess(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật trạng thái.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="inv-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Edit item status">
      <div className="inv-modal inv-modal--sm" onClick={(e) => e.stopPropagation()}>

        <div className="inv-modal__header">
          <h2 className="inv-modal__title">Chỉnh sửa Trạng thái</h2>
          <button type="button" className="inv-modal__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Item info */}
        <div className="inv-modal__item-info">
          <span className="inv-modal__item-name">{item.itemName}</span>
          <span className="inv-modal__item-meta">{item.category} · {item.unit}</span>
        </div>

        <div className="inv-modal__form">
          {/* Criteria box */}
          <div className="inv-status-criteria">
            <div className="inv-status-criteria__header">
              <Info size={14} aria-hidden="true" />
              <span>Tiêu chí tính tự động</span>
            </div>
            <ul className="inv-status-criteria__list">
              <li>
                <span className="inv-badge inv-badge--green inv-badge--sm">In Stock</span>
                <span>Số lượng &gt; {item.minimumQuantity} {item.unit}</span>
              </li>
              <li>
                <span className="inv-badge inv-badge--yellow inv-badge--sm">Low Stock</span>
                <span>0 &lt; Số lượng ≤ {item.minimumQuantity} {item.unit}</span>
              </li>
              <li>
                <span className="inv-badge inv-badge--red inv-badge--sm">Out of Stock</span>
                <span>Số lượng = 0</span>
              </li>
            </ul>
            <div className="inv-status-criteria__current">
              Hiện tại tính tự động: <strong>{statusLabel[autoStatus]}</strong>
              {item.isStatusOverridden && (
                <span className="inv-status-criteria__overridden"> (đang bị ghi đè)</span>
              )}
            </div>
          </div>

          {/* Manual override select */}
          <div className="inv-form-field" style={{ marginTop: 16 }}>
            <label htmlFor="status-select">Ghi đè thủ công</label>
            <select
              id="status-select"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="inv-status-select"
            >
              <option value="">— Tự động tính (reset) —</option>
              <option value="IN_STOCK">✅  In Stock</option>
              <option value="LOW_STOCK">⚠️  Low Stock</option>
              <option value="OUT_OF_STOCK">🔴  Out of Stock</option>
            </select>
            <span className="inv-form-field__hint">
              Chọn "Tự động tính" để xóa ghi đè và dùng lại tiêu chí số lượng.
            </span>
          </div>

          {error && (
            <div className="inv-modal__error" role="alert" style={{ marginTop: 12 }}>
              <AlertTriangle size={16} /><span>{error}</span>
            </div>
          )}

          <div className="inv-modal__actions" style={{ marginTop: 20 }}>
            <button type="button" className="inv-btn inv-btn--ghost" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            {item.isStatusOverridden && (
              <button
                type="button"
                id="btn-reset-status"
                className="inv-btn inv-btn--ghost"
                onClick={async () => { setSelected(''); await handleSave() }}
                disabled={submitting}
                title="Reset về tự động"
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
            <button
              type="button"
              id="btn-save-status"
              className="inv-btn inv-btn--primary"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function InventoryScreen() {
  const role = sessionStorage.getItem('role')
  const canManage = ['ADMIN', 'MANAGER'].includes(role)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortConfig, setSortConfig] = useState({ field: '', direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [updateTarget, setUpdateTarget] = useState(null)
  const [confirmToggle, setConfirmToggle] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [statusTarget, setStatusTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [alertDismissed, setAlertDismissed] = useState(false)
  const searchTimeout = useRef(null)

  // ── Fetch items ────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async (kw = keyword, cat = categoryFilter) => {
    setLoading(true)
    try {
      const params = {}
      if (kw) params.keyword = kw
      if (cat) params.category = cat
      const res = await inventoryService.search(params)
      setItems(res.data)
    } catch {
      showToast('Failed to load inventory data', 'error')
    } finally {
      setLoading(false)
    }
  }, [keyword, categoryFilter])

  useEffect(() => {
    fetchItems()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced search ───────────────────────────────────────────────────────
  const handleKeywordChange = (e) => {
    const val = e.target.value
    setKeyword(val)
    setCurrentPage(1)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => fetchItems(val, categoryFilter), 400)
  }

  const handleCategoryChange = (e) => {
    const val = e.target.value
    setCategoryFilter(val)
    setCurrentPage(1)
    fetchItems(keyword, val)
  }

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1)
  }

  const handleSort = (field) => {
    setSortConfig((current) => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }))
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    clearTimeout(searchTimeout.current)
    setKeyword('')
    setCategoryFilter('')
    setStatusFilter('')
    setSortConfig({ field: '', direction: 'asc' })
    setCurrentPage(1)
    setAlertDismissed(false)
    fetchItems('', '')
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (message, type = 'success') => setToast({ message, type })
  const clearToast = () => setToast(null)

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddSuccess = (newItem) => {
    setItems((prev) => [newItem, ...prev])
    setCurrentPage(1)
    setShowAddModal(false)
    showToast(`"${newItem.itemName}" added successfully!`)
  }

  const handleUpdateSuccess = (updatedItem) => {
    setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)))
    setUpdateTarget(null)
    setAlertDismissed(false) // re-show banner if new items are low
    if (updatedItem.status === 'OUT_OF_STOCK') {
      showToast(
        `🔴 "${updatedItem.itemName}" đã hết hàng! Hãy nhập thêm để tránh gián đoạn vận hành.`,
        'error'
      )
    } else if (updatedItem.status === 'LOW_STOCK') {
      showToast(
        `⚠ "${updatedItem.itemName}" dưới mức tối thiểu. Cần bổ sung hàng sớm!`,
        'warning'
      )
    } else {
      showToast(`✅ Đã cập nhật "${updatedItem.itemName}"`)
    }
  }

  const handleStatusSuccess = (updatedItem) => {
    setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)))
    setStatusTarget(null)
    showToast(
      updatedItem.isStatusOverridden
        ? `Trạng thái "${updatedItem.itemName}" đã được ghi đè thủ công.`
        : `Trạng thái "${updatedItem.itemName}" đã reset về tự động.`
    )
  }

  // ── Toggle Active (with confirmation) ─────────────────────────────────────
  const requestToggle = (item) => setConfirmToggle(item)

  const handleConfirmToggle = async () => {
    if (!confirmToggle) return
    setToggling(true)
    try {
      const res = await inventoryService.toggleActive(confirmToggle.id)
      setItems((prev) => prev.map((it) => (it.id === res.data.id ? res.data : it)))
      showToast(
        res.data.isActive
          ? `"${res.data.itemName}" đã được kích hoạt trở lại.`
          : `"${res.data.itemName}" đã được vô hiệu hóa.`,
        res.data.isActive ? 'success' : 'warning'
      )
    } catch {
      showToast('Không thể thay đổi trạng thái. Vui lòng thử lại.', 'error')
    } finally {
      setToggling(false)
      setConfirmToggle(null)
    }
  }

  // ── Filtered by status (client-side) ──────────────────────────────────────
  // ── Lọc status PHÍA CLIENT (không gọi thêm API)
  // // Sau khi items đã có từ API, filter ngay trong bộ nhớ React
  const filteredItems = statusFilter
    ? items.filter((it) => it.status === statusFilter)
    : items
  const displayedItems = sortConfig.field
    ? [...filteredItems].sort((a, b) => {
        const aRawValue = a[sortConfig.field]
        const bRawValue = b[sortConfig.field]
        const aValue = Number(aRawValue)
        const bValue = Number(bRawValue)
        const aIsValid = aRawValue != null && Number.isFinite(aValue)
        const bIsValid = bRawValue != null && Number.isFinite(bValue)

        if (!aIsValid && !bIsValid) return 0
        if (!aIsValid) return 1
        if (!bIsValid) return -1

        const comparison = aValue - bValue
        return sortConfig.direction === 'asc' ? comparison : -comparison
      })
    : filteredItems
  const totalPages = Math.max(1, Math.ceil(displayedItems.length / ITEMS_PER_PAGE))
  const activePage = Math.min(currentPage, totalPages)
  const pageStartIndex = (activePage - 1) * ITEMS_PER_PAGE
  const paginatedItems = displayedItems.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: items.length,
    inStock: items.filter((it) => it.status === 'IN_STOCK').length,
    lowStock: items.filter((it) => it.status === 'LOW_STOCK').length,
    outOfStock: items.filter((it) => it.status === 'OUT_OF_STOCK').length,
  }

  // ── Items needing restock (active only) ────────────────────────────────────
  const restockItems = items.filter(
    (it) => it.isActive && (it.status === 'LOW_STOCK' || it.status === 'OUT_OF_STOCK')
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="inv-screen">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}

      {/* Page Header */}
      <div className="inv-screen__header">
        <div>
          <h1 className="inv-screen__title">Inventory Management</h1>
          <p className="inv-screen__subtitle">Track, manage and control all ingredient stock levels</p>
        </div>
        <div className="inv-screen__header-actions">
          <button
            type="button"
            className="inv-btn inv-btn--ghost-sm"
            onClick={handleRefresh}
            aria-label="Refresh inventory"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          {canManage && (
            <button
              type="button"
              id="btn-add-inventory"
              className="inv-btn inv-btn--primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={18} />
              Add New Item
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="inv-stats">
        <article className="inv-stat-card">
          <div className="inv-stat-card__icon inv-stat-card__icon--blue">
            <Boxes size={22} />
          </div>
          <div>
            <span className="inv-stat-card__value">{stats.total}</span>
            <span className="inv-stat-card__label">Total Items</span>
          </div>
        </article>

        <article className="inv-stat-card">
          <div className="inv-stat-card__icon inv-stat-card__icon--green">
            <PackageCheck size={22} />
          </div>
          <div>
            <span className="inv-stat-card__value">{stats.inStock}</span>
            <span className="inv-stat-card__label">In Stock</span>
          </div>
        </article>

        <article className="inv-stat-card">
          <div className="inv-stat-card__icon inv-stat-card__icon--yellow">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="inv-stat-card__value">{stats.lowStock}</span>
            <span className="inv-stat-card__label">Low Stock</span>
          </div>
        </article>

        <article className="inv-stat-card">
          <div className="inv-stat-card__icon inv-stat-card__icon--red">
            <PackageX size={22} />
          </div>
          <div>
            <span className="inv-stat-card__value">{stats.outOfStock}</span>
            <span className="inv-stat-card__label">Out of Stock</span>
          </div>
        </article>
      </div>

      {/* ── Restock Alert Banner ── */}
      {!alertDismissed && restockItems.length > 0 && (
        <div
          className={`inv-restock-banner ${
            restockItems.some((it) => it.status === 'OUT_OF_STOCK')
              ? 'inv-restock-banner--danger'
              : 'inv-restock-banner--warn'
          }`}
          role="alert"
          aria-live="polite"
        >
          <div className="inv-restock-banner__left">
            <Bell size={20} className="inv-restock-banner__bell" />
            <div>
              <strong className="inv-restock-banner__title">
                {restockItems.some((it) => it.status === 'OUT_OF_STOCK')
                  ? `${restockItems.filter((it) => it.status === 'OUT_OF_STOCK').length} mặt hàng đã hết — cần nhập kho ngay!`
                  : `${restockItems.length} mặt hàng dưới mức tối thiểu — cần bổ sung sớm`}
              </strong>
              <ul className="inv-restock-banner__list">
                {restockItems.slice(0, 5).map((it) => (
                  <li key={it.id}>
                    <span
                      className={`inv-restock-banner__dot ${
                        it.status === 'OUT_OF_STOCK'
                          ? 'inv-restock-banner__dot--red'
                          : 'inv-restock-banner__dot--yellow'
                      }`}
                    />
                    <strong>{it.itemName}</strong>:
                    {' '}{it.status === 'OUT_OF_STOCK'
                      ? <span className="inv-restock-banner__out">Hết hàng</span>
                      : <span className="inv-restock-banner__low">
                          Còn {it.availableQuantity ?? it.quantity} {it.unit} khả dụng (min: {it.minimumQuantity})
                        </span>
                    }
                    {' — '}
                    <button
                      type="button"
                      className="inv-restock-banner__action-link"
                      style={{ display: canManage ? undefined : 'none' }}
                      onClick={() => setUpdateTarget(it)}
                    >
                      Cập nhật ngay →
                    </button>
                  </li>
                ))}
                {restockItems.length > 5 && (
                  <li className="inv-restock-banner__more">
                    ...và {restockItems.length - 5} mặt hàng khác.
                    <button
                      type="button"
                      className="inv-restock-banner__action-link"
                      onClick={() => setStatusFilter('LOW_STOCK')}
                    >
                      Xem tất cả →
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <button
            type="button"
            className="inv-restock-banner__dismiss"
            onClick={() => setAlertDismissed(true)}
            aria-label="Ẩn thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="inv-filter-bar">
        <div className="inv-filter-bar__search">
          <Search size={17} className="inv-filter-bar__search-icon" aria-hidden="true" />
          <input
            id="inv-search"
            type="search"
            value={keyword}
            onChange={handleKeywordChange}
            placeholder="Search by item name…"
            aria-label="Search inventory"
            className="inv-filter-bar__input"
          />
        </div>

        <select
          id="inv-filter-category"
          value={categoryFilter}
          onChange={handleCategoryChange}
          className="inv-filter-bar__select"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          id="inv-filter-status"
          value={statusFilter}
          onChange={handleStatusFilterChange}
          className="inv-filter-bar__select"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
      </div>

      {/* Table */}
      <div className="inv-table-wrapper">
        {loading ? (
          <div className="inv-table__loading" role="status" aria-live="polite">
            <RefreshCw size={28} className="inv-table__loading-icon" aria-hidden="true" />
            <span>Loading inventory…</span>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="inv-table__empty">
            <Boxes size={48} aria-hidden="true" />
            <p>No inventory items found</p>
            {canManage && (
              <button
                type="button"
                className="inv-btn inv-btn--primary"
                id="btn-add-inventory-empty"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} /> Add First Item
              </button>
            )}
          </div>
        ) : (
          <table className="inv-table" aria-label="Inventory items">
            <thead>
              <tr>
                <th>Image</th>
                <th>#</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Unit</th>
                <SortableHeader
                  field="quantity"
                  label="Quantity"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  field="minimumQuantity"
                  label="Min Qty"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  field="pricePerUnit"
                  label="Price / Unit"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <th>Supplier</th>
                <th>Status</th>
                <th>Active</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item, index) => (
                <tr key={item.id} className={!item.isActive ? 'inv-table__row--inactive' : ''}>
                  <td className="inv-table__img-cell">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.itemName}
                        className="inv-table__thumbnail"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                      />
                    ) : null}
                    <div
                      className="inv-table__thumbnail-placeholder"
                      style={{ display: item.imageUrl ? 'none' : 'flex' }}
                      aria-label="No image"
                    >
                      <Boxes size={20} />
                    </div>
                  </td>
                  <td className="inv-table__num">{pageStartIndex + index + 1}</td>
                  <td className="inv-table__name">{item.itemName}</td>
                  <td>
                    <span className="inv-category-chip">{item.category}</span>
                  </td>
                  <td>{item.unit}</td>
                  <td className={
                    item.status === 'LOW_STOCK' ? 'inv-table__qty--warn'
                    : item.status === 'OUT_OF_STOCK' ? 'inv-table__qty--danger'
                    : ''
                  }>
                    {item.quantity}
                    {item.reservedQuantity > 0 && (
                      <span className="inv-table__reservation">
                        Giữ: {item.reservedQuantity} · Khả dụng: {item.availableQuantity}
                      </span>
                    )}
                  </td>
                  <td>{item.minimumQuantity}</td>
                  <td>
                    {item.pricePerUnit != null
                      ? `${item.pricePerUnit.toLocaleString('vi-VN')} ₫`
                      : '—'}
                  </td>
                  <td>{item.supplier || '—'}</td>
                  <td>
                    <StatusBadge
                      status={item.status}
                      isOverridden={item.isStatusOverridden}
                      onEdit={() => setStatusTarget(item)}
                      readOnly={!canManage}
                    />
                  </td>
                  <td>
                    {canManage ? (
                      <ToggleSwitch
                        id={`toggle-${item.id}`}
                        checked={item.isActive}
                        onChange={() => requestToggle(item)}
                      />
                    ) : (
                      <span>{item.isActive ? 'Active' : 'Inactive'}</span>
                    )}
                  </td>
                  {canManage && (
                    <td>
                      <button
                        type="button"
                        className="inv-btn inv-btn--action"
                        onClick={() => setUpdateTarget(item)}
                        aria-label={`Edit ${item.itemName}`}
                      >
                        Edit Item
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && displayedItems.length > 0 && (
          <div className="inv-pagination" aria-label="Inventory pagination">
            <span className="inv-pagination__summary">
              Showing {pageStartIndex + 1}-{Math.min(pageStartIndex + ITEMS_PER_PAGE, displayedItems.length)}
              {' '}of {displayedItems.length} items
            </span>
            <div className="inv-pagination__controls">
              <button
                type="button"
                className="inv-pagination__button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={activePage === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1
                return (
                  <button
                    key={page}
                    type="button"
                    className={`inv-pagination__button inv-pagination__page ${
                      activePage === page ? 'inv-pagination__page--active' : ''
                    }`}
                    onClick={() => setCurrentPage(page)}
                    aria-label={`Go to page ${page}`}
                    aria-current={activePage === page ? 'page' : undefined}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                type="button"
                className="inv-pagination__button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={activePage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {canManage && showAddModal && (
        <AddItemModal onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />
      )}
      {canManage && updateTarget && (
        <UpdateItemModal
          item={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}
      {canManage && confirmToggle && (
        <ConfirmToggleModal
          item={confirmToggle}
          onClose={() => !toggling && setConfirmToggle(null)}
          onConfirm={handleConfirmToggle}
          confirming={toggling}
        />
      )}
      {canManage && statusTarget && (
        <EditStatusModal
          item={statusTarget}
          onClose={() => setStatusTarget(null)}
          onSuccess={handleStatusSuccess}
        />
      )}
    </div>
  )
}

export default InventoryScreen
