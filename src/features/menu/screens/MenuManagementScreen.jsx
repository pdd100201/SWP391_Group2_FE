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

// Mẫu dữ liệu rỗng dùng khi người quản lý mở form tạo một món mới.
const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  imageUrl: '',
  price: '',
}

const PAGE_SIZE = 8

// Định dạng giá thành kiểu tiền Việt Nam, ví dụ 149000 thành "149.000 VND".
const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VND`

// Đếm số từ trong mô tả để giới hạn nội dung ở mức tối đa 200 từ.
const wordCount = (value) => value.trim() ? value.trim().split(/\s+/).length : 0

// Lấy thông báo lỗi cụ thể do backend trả về; nếu không có thì dùng thông báo dự phòng.
function getErrorMessage(error, fallback) {
  const errors = error.response?.data?.errors
  if (errors) return Object.values(errors).join('. ')
  return error.response?.data?.message || fallback
}

// Hiển thị nhãn trạng thái của món bằng màu sắc và biểu tượng dễ nhận biết.
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
  // Modal này dùng chung cho cả tạo mới và chỉnh sửa:
  // item = null là tạo mới; item có dữ liệu là chỉnh sửa món đang tồn tại.
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

  // saving khóa nút lưu khi request đang chạy; error chứa lỗi hiển thị ngay trong form.
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Mọi ô nhập liệu dùng chung hàm này; thuộc tính "name" của ô quyết định field nào được cập nhật.
  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    // Ngăn trình duyệt tải lại trang theo hành vi mặc định của thẻ form.
    event.preventDefault()
    setError('')

    // Kiểm tra dữ liệu ở frontend để người dùng nhận phản hồi ngay trước khi gọi backend.
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

    // Chuẩn hóa dữ liệu trước khi gửi: bỏ khoảng trắng thừa và chuyển giá sang dạng số.
    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      // ImageUploader đã upload file trước; request tạo món chỉ gửi URL HTTPS của Cloudinary.
      imageUrl: form.imageUrl.trim() || null,
      price,
    }

    setSaving(true)
    try {
      // Nếu có item thì cập nhật món cũ; nếu không có item thì tạo món mới.
      const response = item
        ? await menuService.update(item.id, payload)
        : await menuService.create(payload)

      // Báo cho màn hình cha biết món đã lưu thành công để cập nhật danh sách và đóng modal.
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
  // Role được lưu sau khi đăng nhập. Chỉ ADMIN và MANAGER nhìn thấy các thao tác quản trị.
  // Đây là kiểm soát giao diện; backend vẫn kiểm tra JWT và role để bảo vệ API.
  const role = sessionStorage.getItem('role')
  const canManage = ['ADMIN', 'MANAGER'].includes(role)

  // Dữ liệu chính lấy từ backend.
  const [menuItems, setMenuItems] = useState([])
  const [menuCategories, setMenuCategories] = useState([])

  // Trạng thái tải dữ liệu và lỗi dùng chung của toàn màn hình.
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Các điều kiện tìm kiếm/lọc được xử lý trực tiếp trên danh sách đã tải về.
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [availability, setAvailability] = useState('')

  // Trạng thái điều khiển modal tạo/sửa và nút bật/tắt món.
  const [editingItem, setEditingItem] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      // Tải danh sách món và danh mục song song để giảm thời gian chờ của màn hình.
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
    // Đồng bộ dữ liệu từ backend một lần khi người dùng mở màn hình quản lý Menu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [])

  const filteredItems = menuItems.filter((item) => {
    // Lọc tại frontend vì endpoint hiện trả toàn bộ menu trong một request.
    // Một món chỉ được hiển thị khi đồng thời thỏa từ khóa, danh mục và trạng thái.
    const matchesKeyword = item.name.toLowerCase().includes(keyword.trim().toLowerCase())
    const matchesCategory = !category || item.category === category
    const matchesAvailability = !availability || item.availability === availability
    return matchesKeyword && matchesCategory && matchesAvailability
  })
  const pagination = usePagination(filteredItems, PAGE_SIZE)

  // Danh mục ở bộ lọc được rút ra từ các món hiện có; Set giúp loại bỏ tên bị lặp.
  const filterCategories = [...new Set(menuItems.map((item) => item.category))].sort()

  // Các con số tổng quan luôn được tính trên toàn bộ menu, không phụ thuộc bộ lọc hiện tại.
  const stats = {
    total: menuItems.length,
    available: menuItems.filter((item) => item.availability === 'AVAILABLE').length,
    inactive: menuItems.filter((item) => item.availability === 'INACTIVE').length,
  }

  const handleRefresh = () => {
    // Xóa các điều kiện lọc rồi lấy lại dữ liệu mới nhất từ backend.
    setKeyword('')
    setCategory('')
    setAvailability('')
    pagination.reset()
    loadData()
  }

  const openCreate = () => {
    // Không truyền món hiện tại để DishModal chuyển sang chế độ tạo mới.
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleSaved = (savedItem) => {
    // Nếu là chỉnh sửa thì thay đúng card cũ; nếu là tạo mới thì thêm món lên đầu danh sách.
    // Cách này giúp giao diện cập nhật ngay mà không phải gọi lại API lấy toàn bộ menu.
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
    // Ghi nhớ ID đang xử lý để chỉ khóa nút của món đó, tránh người dùng nhấn liên tục.
    setTogglingId(item.id)
    setError('')
    try {
      const response = await menuService.toggleActive(item.id)

      // Backend trả về món sau khi đổi trạng thái; thay đúng phần tử tương ứng trong state.
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
      {/* Tiêu đề màn hình và các thao tác tải lại/tạo món. */}
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

      {/* Thống kê nhanh tổng số món, số món đang phục vụ và số món đã ngừng phục vụ. */}
      <section className="menu-stats">
        <article><UtensilsCrossed /><div><strong>{stats.total}</strong><span>Total dishes</span></div></article>
        <article><CheckCircle2 /><div><strong>{stats.available}</strong><span>Available</span></div></article>
        <article><AlertTriangle /><div><strong>{stats.inactive}</strong><span>Inactive</span></div></article>
      </section>

      {/* Bộ lọc hoạt động ngay trên dữ liệu đã tải, không phát sinh thêm request. */}
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

      {/* Chọn đúng trạng thái giao diện: đang tải, không có kết quả hoặc danh sách món. */}
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

      {/* Modal chỉ tồn tại trong cây giao diện khi người dùng có quyền và modal đang mở. */}
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
