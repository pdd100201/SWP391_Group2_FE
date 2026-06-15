import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Clock3,
  PackageX,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { inventoryService } from '../../inventory/services/inventoryService'
import { menuService } from '../services/menuService'
import './MenuManagementScreen.css'

const MENU_CATEGORIES = ['Appetizer', 'Main Course', 'Seafood', 'Dessert', 'Beverage', 'Other']

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  imageUrl: '',
  profitMarginPercent: '100',
  ingredients: [{ inventoryItemId: '', requiredQuantity: '' }],
}

const money = (value) => `${Math.round(value || 0).toLocaleString('vi-VN')} ₫`

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

function DishModal({ item, inventory, onClose, onSaved }) {
  const [form, setForm] = useState(() => item
    ? {
        name: item.name,
        category: item.category,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        profitMarginPercent: item.profitMarginPercent.toString(),
        ingredients: item.ingredients.map((ingredient) => ({
          inventoryItemId: ingredient.inventoryItemId.toString(),
          requiredQuantity: ingredient.requiredQuantity.toString(),
        })),
      }
    : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const inventoryById = useMemo(
    () => new Map(inventory.map((ingredient) => [ingredient.id, ingredient])),
    [inventory]
  )

  const foodCost = form.ingredients.reduce((total, row) => {
    const ingredient = inventoryById.get(Number(row.inventoryItemId))
    const quantity = Number(row.requiredQuantity)
    if (!ingredient || !Number.isFinite(quantity) || quantity <= 0) return total
    return total + (ingredient.pricePerUnit || 0) * quantity
  }, 0)
  const margin = Number(form.profitMarginPercent) || 0
  const suggestedPrice = Math.ceil((foodCost * (1 + margin / 100)) / 1000) * 1000
  const missingPrice = form.ingredients.some((row) => {
    const ingredient = inventoryById.get(Number(row.inventoryItemId))
    return ingredient && ingredient.pricePerUnit == null
  })

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const updateIngredient = (index, field, value) => {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      ),
    }))
  }

  const addIngredient = () => {
    setForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, { inventoryItemId: '', requiredQuantity: '' }],
    }))
  }

  const removeIngredient = (index) => {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, rowIndex) => rowIndex !== index),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const ingredients = form.ingredients
      .filter((row) => row.inventoryItemId && row.requiredQuantity)
      .map((row) => ({
        inventoryItemId: Number(row.inventoryItemId),
        requiredQuantity: Number(row.requiredQuantity),
      }))

    if (!form.name.trim() || !form.category || ingredients.length === 0) {
      setError('Dish name, category and at least one recipe ingredient are required')
      return
    }
    if (new Set(ingredients.map((ingredient) => ingredient.inventoryItemId)).size !== ingredients.length) {
      setError('Each inventory ingredient can only appear once in a recipe')
      return
    }
    if (ingredients.some((ingredient) => ingredient.requiredQuantity <= 0)) {
      setError('Ingredient quantity must be greater than 0')
      return
    }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      profitMarginPercent: Number(form.profitMarginPercent),
      ingredients,
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
            <span className="menu-modal__eyebrow">Single-size recipe</span>
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
              <span>Profit margin (%) *</span>
              <input
                name="profitMarginPercent"
                type="number"
                min="0"
                step="1"
                value={form.profitMarginPercent}
                onChange={updateField}
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

          <section className="menu-recipe-editor">
            <div className="menu-recipe-editor__header">
              <div>
                <h3>Recipe ingredients</h3>
                <p>Quantities use the same unit configured in Inventory.</p>
              </div>
              <button type="button" className="menu-button menu-button--secondary" onClick={addIngredient}>
                <Plus size={15} /> Add ingredient
              </button>
            </div>

            <div className="menu-recipe-editor__rows">
              {form.ingredients.map((row, index) => {
                const selected = inventoryById.get(Number(row.inventoryItemId))
                return (
                  <div className="menu-recipe-row" key={`${index}-${row.inventoryItemId}`}>
                    <label className="menu-field">
                      <span>Inventory item</span>
                      <select
                        value={row.inventoryItemId}
                        onChange={(event) => updateIngredient(index, 'inventoryItemId', event.target.value)}
                      >
                        <option value="">Select ingredient</option>
                        {inventory.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.itemName} ({ingredient.availableQuantity ?? ingredient.quantity} {ingredient.unit} available)
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="menu-field">
                      <span>Quantity per serving</span>
                      <div className="menu-quantity-input">
                        <input
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          value={row.requiredQuantity}
                          onChange={(event) => updateIngredient(index, 'requiredQuantity', event.target.value)}
                        />
                        <b>{selected?.unit || 'unit'}</b>
                      </div>
                    </label>
                    <div className="menu-recipe-row__cost">
                      <span>Ingredient cost</span>
                      <strong>
                        {selected && row.requiredQuantity
                          ? money((selected.pricePerUnit || 0) * Number(row.requiredQuantity))
                          : '—'}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="menu-icon-button menu-icon-button--danger"
                      onClick={() => removeIngredient(index)}
                      disabled={form.ingredients.length === 1}
                      aria-label="Remove ingredient"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="menu-cost-preview">
            <div><Calculator size={18} /><span>Food cost</span><strong>{money(foodCost)}</strong></div>
            <div><CircleDollarSign size={18} /><span>Suggested price</span><strong>{money(suggestedPrice)}</strong></div>
            <div><span>Margin</span><strong>{margin}%</strong></div>
            {missingPrice && <small>Some ingredients have no price, so the cost is incomplete.</small>}
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
  const [menuItems, setMenuItems] = useState([])
  const [inventory, setInventory] = useState([])
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
      const [menuResponse, inventoryResponse] = await Promise.all([
        menuService.getAll(),
        inventoryService.getAll(),
      ])
      setMenuItems(menuResponse.data)
      setInventory(inventoryResponse.data.filter((item) => item.isActive))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load menu management data'))
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
          <span className="menu-screen__eyebrow"><ChefHat size={16} /> Inventory-linked recipes</span>
          <h1>Menu Management</h1>
          <p>Build exact recipes, track serving capacity and price dishes from live inventory costs.</p>
        </div>
        <div className="menu-screen__actions">
          <button type="button" className="menu-button menu-button--secondary" onClick={handleRefresh}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="menu-button menu-button--primary" onClick={openCreate}>
            <Plus size={17} /> Add menu item
          </button>
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
        <div className="menu-loading"><RefreshCw className="menu-spin" /><span>Loading menu and inventory...</span></div>
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
                  <button
                    type="button"
                    className="menu-icon-button"
                    onClick={() => { setEditingItem(item); setModalOpen(true) }}
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil size={17} />
                  </button>
                </div>
                <p className="menu-card__description">{item.description || 'No description provided.'}</p>

                <div className="menu-card__metrics">
                  <div><span>Food cost</span><strong>{money(item.foodCost)}</strong></div>
                  <div><span>Suggested price</span><strong>{money(item.suggestedPrice)}</strong></div>
                  <div><span>Margin</span><strong>{item.profitMarginPercent}%</strong></div>
                  <div><span>Can serve</span><strong>{item.availableServings} portions</strong></div>
                </div>

                <div className="menu-card__recipe">
                  <strong>Recipe per serving</strong>
                  <div>
                    {item.ingredients.map((ingredient) => (
                      <span key={ingredient.inventoryItemId}>
                        {ingredient.inventoryItemName}: {ingredient.requiredQuantity} {ingredient.unit}
                      </span>
                    ))}
                  </div>
                </div>

                {item.blockingIngredients.length > 0 && (
                  <div className="menu-card__warning">
                    <AlertTriangle size={15} />
                    Blocked by: {item.blockingIngredients.join(', ')}
                  </div>
                )}
                {!item.costComplete && (
                  <div className="menu-card__warning">
                    <CircleDollarSign size={15} />
                    Cost is incomplete because an ingredient has no price.
                  </div>
                )}

                <button
                  type="button"
                  className={`menu-button menu-button--wide ${item.isActive ? 'menu-button--danger-soft' : 'menu-button--primary'}`}
                  onClick={() => toggleActive(item)}
                  disabled={togglingId === item.id}
                >
                  {togglingId === item.id ? 'Updating...' : item.isActive ? 'Stop serving manually' : 'Activate dish'}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {modalOpen && (
        <DishModal
          item={editingItem}
          inventory={inventory}
          onClose={() => { setModalOpen(false); setEditingItem(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default MenuManagementScreen
