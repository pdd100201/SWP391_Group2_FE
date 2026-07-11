import { useCallback, useEffect, useState } from 'react'
import {
  Plus, Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, X, UserCircle2, Power,
} from 'lucide-react'
import { getStaffAccounts, getStaffById, createStaff, updateStaff, deleteStaff, toggleStaffStatus } from '../api/accountApi'
import { usePagination } from '../../../shared/hooks/usePagination'
import { useToast } from '../../../shared/components/ui/Toast/Toast'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal/ConfirmModal'
import LoadingSpinner from '../../../shared/components/ui/LoadingSpinner/LoadingSpinner'
import ImageUploader from '../../../shared/components/ui/ImageUploader/ImageUploader'
import './StaffAccountPage.css'

const PAGE_SIZE = 10

const ROLES = ['ADMIN', 'MANAGER', 'WAITER', 'RECEPTIONIST']

const ROLE_COLORS = {
  ADMIN: { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' },
  MANAGER: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' },
  WAITER: { bg: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' },
  RECEPTIONIST: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' },
}

const INITIAL_FORM = { fullName: '', email: '', phone: '', password: '', role: 'WAITER', avatarUrl: '' }

function StaffAccountPage() {
  const showToast = useToast()

  const [allAccounts, setAllAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('')

  const pagination = usePagination(allAccounts, PAGE_SIZE)

  const [viewData, setViewData] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [formModal, setFormModal] = useState({ open: false, mode: 'create', data: INITIAL_FORM })
  const [formLoading, setFormLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' })
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.keyword = search
      if (roleFilter) params.role = roleFilter
      if (isActiveFilter !== '') params.isActive = isActiveFilter === 'true'
      const res = await getStaffAccounts(params)
      setAllAccounts(res.data?.data || [])
    } catch {
      showToast('Failed to load staff accounts', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, isActiveFilter, showToast])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const [searchInput, setSearchInput] = useState('')
  const handleSearch = () => { setSearch(searchInput); pagination.reset() }

  const handleView = async (id) => {
    setViewLoading(true)
    setViewData({})
    try {
      const res = await getStaffById(id)
      setViewData(res.data?.data || res.data)
    } catch {
      showToast('Failed to load account details', 'error')
      setViewData(null)
    } finally {
      setViewLoading(false)
    }
  }

  const handleToggleStatus = async (id) => {
    try {
      await toggleStaffStatus(id)
      showToast('Status updated successfully')
      fetchAccounts()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error')
    }
  }

  const openCreate = () => {
    setFormErrors({})
    setFormModal({ open: true, mode: 'create', data: { ...INITIAL_FORM } })
  }

  const openEdit = (account) => {
    setFormErrors({})
    setFormModal({
      open: true,
      mode: 'edit',
      data: {
        id: account.id,
        fullName: account.fullName || '',
        email: account.email || '',
        phone: account.phone || '',
        password: '',
        role: account.role || 'WAITER',
        avatarUrl: account.avatarUrl || '',
      },
    })
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormModal((prev) => ({ ...prev, data: { ...prev.data, [name]: value } }))
    setFormErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const errs = {}
    const d = formModal.data
    if (!d.fullName.trim()) errs.fullName = 'Full name is required'
    if (!d.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errs.email = 'Invalid email format'
    if (!d.phone.trim()) errs.phone = 'Phone number is required'
    else if (!/^0[1-9][0-9]{8,9}$/.test(d.phone)) errs.phone = 'Phone must start with 0, second digit 1-9, and be 10-11 digits'
    if (formModal.mode === 'create') {
      if (!d.password.trim()) errs.password = 'Password is required'
      else if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(d.password)) errs.password = 'Password must be at least 8 characters and include letters and numbers'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setFormLoading(true)
    try {
      const payload = { ...formModal.data }
      if (formModal.mode === 'edit' && !payload.password) delete payload.password
      if (formModal.mode === 'create') {
        await createStaff(payload)
        showToast('Staff account created successfully')
      } else {
        await updateStaff(payload.id, payload)
        showToast('Staff account updated successfully')
      }
      setFormModal({ open: false, mode: 'create', data: INITIAL_FORM })
      fetchAccounts()
    } catch (err) {
      showToast(err.response?.data?.message || `Failed to ${formModal.mode} account`, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    try {
      await deleteStaff(deleteModal.id)
      showToast('Staff account deleted successfully')
      setDeleteModal({ open: false, id: null, name: '' })
      fetchAccounts()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete account', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page__header">
        <div>
          <h1 className="staff-page__title">Staff Accounts</h1>
          <p className="staff-page__subtitle">Manage all staff members in your restaurant</p>
        </div>
        <button type="button" className="staff-page__create-btn" onClick={openCreate}>
          <Plus size={18} /><span>Create Account</span>
        </button>
      </div>

      <div className="staff-page__filters">
        <div className="staff-page__search">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button type="button" className="staff-page__search-btn" onClick={handleSearch}>
            <Search size={18} />
          </button>
        </div>
        <div className="staff-page__filter-group">
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); pagination.reset() }}>
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={isActiveFilter} onChange={(e) => { setIsActiveFilter(e.target.value); pagination.reset() }}>
            <option value="">All Status</option>
            <option value="true">ACTIVE</option>
            <option value="false">DEACTIVE</option>
          </select>
        </div>
      </div>

      <div className="staff-page__table-wrapper">
        {loading && <LoadingSpinner overlay />}
        <table className="staff-page__table">
          <thead>
            <tr>
              <th>STT</th><th>Avatar</th><th>Full Name</th><th>Email</th>
              <th>Phone</th><th>Role</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && pagination.currentItems.length === 0 && (
              <tr><td colSpan={8} className="staff-page__empty">No staff accounts found</td></tr>
            )}
            {pagination.currentItems.map((acc, idx) => (
              <tr key={acc.id}>
                <td>{pagination.startIdx + idx}</td>
                <td>
                  {acc.avatarUrl
                    ? <img src={acc.avatarUrl} alt="" className="staff-page__avatar" />
                    : <div className="staff-page__avatar-placeholder"><UserCircle2 size={28} /></div>}
                </td>
                <td className="staff-page__name">{acc.fullName}</td>
                <td>{acc.email}</td>
                <td>{acc.phone}</td>
                <td>
                  <span className="staff-page__badge"
                    style={{ background: ROLE_COLORS[acc.role]?.bg, color: ROLE_COLORS[acc.role]?.color }}>
                    {acc.role}
                  </span>
                </td>
                <td>
                  <span className={`staff-page__status staff-page__status--${acc.isActive ? 'active' : 'deactive'}`}>
                    {acc.isActive ? 'ACTIVE' : 'DEACTIVE'}
                  </span>
                </td>
                <td>
                  <div className="staff-page__actions">
                    <button type="button" className="staff-page__action-btn staff-page__action-btn--view" title="View" onClick={() => handleView(acc.id)}><Eye size={16} /></button>
                    <button type="button" className="staff-page__action-btn staff-page__action-btn--edit" title="Edit" onClick={() => openEdit(acc)}><Pencil size={16} /></button>
                    <button type="button"
                      className={`staff-page__action-btn ${acc.isActive ? 'staff-page__action-btn--deactive' : 'staff-page__action-btn--active'}`}
                      title={acc.isActive ? 'Deactivate' : 'Activate'}
                      onClick={() => handleToggleStatus(acc.id)}>
                      <Power size={16} />
                    </button>
                    <button type="button" className="staff-page__action-btn staff-page__action-btn--delete" title="Delete" onClick={() => setDeleteModal({ open: true, id: acc.id, name: acc.fullName })}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 0 && (
        <div className="staff-page__pagination">
          <span className="staff-page__pagination-info">
            Showing {pagination.startIdx}–{pagination.endIdx} of {pagination.totalElements}
          </span>
          <div className="staff-page__pagination-controls">
            <button type="button" disabled={pagination.isFirst} onClick={() => pagination.setPage(0)}><ChevronsLeft size={16} /></button>
            <button type="button" disabled={pagination.isFirst} onClick={() => pagination.setPage(pagination.page - 1)}><ChevronLeft size={16} /></button>
            {pagination.getPageNumbers().map((p) => (
              <button key={p} type="button" className={p === pagination.page ? 'active' : ''} onClick={() => pagination.setPage(p)}>{p + 1}</button>
            ))}
            <button type="button" disabled={pagination.isLast} onClick={() => pagination.setPage(pagination.page + 1)}><ChevronRight size={16} /></button>
            <button type="button" disabled={pagination.isLast} onClick={() => pagination.setPage(pagination.totalPages - 1)}><ChevronsRight size={16} /></button>
          </div>
        </div>
      )}

      {viewData && (
        <div className="staff-page__modal-backdrop" onClick={() => setViewData(null)}>
          <div className="staff-page__modal" onClick={(e) => e.stopPropagation()}>
            <div className="staff-page__modal-header">
              <h2>Account Details</h2>
              <button type="button" className="staff-page__modal-close" onClick={() => setViewData(null)}><X size={20} /></button>
            </div>
            <div className="staff-page__modal-body">
              {viewLoading ? <LoadingSpinner /> : (
                <div className="staff-page__detail">
                  <div className="staff-page__detail-avatar">
                    {viewData.avatarUrl ? <img src={viewData.avatarUrl} alt="" /> : <UserCircle2 size={64} />}
                  </div>
                  <div className="staff-page__detail-grid">
                    <div className="staff-page__detail-item"><label>Full Name</label><span>{viewData.fullName}</span></div>
                    <div className="staff-page__detail-item"><label>Email</label><span>{viewData.email}</span></div>
                    <div className="staff-page__detail-item"><label>Phone</label><span>{viewData.phone}</span></div>
                    <div className="staff-page__detail-item">
                      <label>Role</label>
                      <span className="staff-page__badge" style={{ background: ROLE_COLORS[viewData.role]?.bg, color: ROLE_COLORS[viewData.role]?.color }}>{viewData.role}</span>
                    </div>
                    <div className="staff-page__detail-item">
                      <label>Status</label>
                      <span className={`staff-page__status staff-page__status--${viewData.isActive ? 'active' : 'deactive'}`}>
                        {viewData.isActive ? 'ACTIVE' : 'DEACTIVE'}
                      </span>
                    </div>
                    {viewData.createdAt && (
                      <div className="staff-page__detail-item">
                        <label>Created At</label>
                        <span>{new Date(viewData.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {formModal.open && (
        <div className="staff-page__modal-backdrop" onClick={() => !formLoading && setFormModal({ open: false, mode: 'create', data: INITIAL_FORM })}>
          <div className="staff-page__modal staff-page__modal--form" onClick={(e) => e.stopPropagation()}>
            <div className="staff-page__modal-header">
              <h2>{formModal.mode === 'create' ? 'Create Staff Account' : 'Edit Staff Account'}</h2>
              <button type="button" className="staff-page__modal-close" disabled={formLoading} onClick={() => setFormModal({ open: false, mode: 'create', data: INITIAL_FORM })}><X size={20} /></button>
            </div>
            <form className="staff-page__form" onSubmit={handleFormSubmit}>
              <div className="staff-page__form-grid">
                <div className="staff-page__form-field">
                  <label htmlFor="staff-fullName">Full Name <span>*</span></label>
                  <input id="staff-fullName" name="fullName" value={formModal.data.fullName} onChange={handleFormChange} placeholder="Enter full name" />
                  {formErrors.fullName && <p className="staff-page__form-error">{formErrors.fullName}</p>}
                </div>
                <div className="staff-page__form-field">
                  <label htmlFor="staff-email">Email <span>*</span></label>
                  <input id="staff-email" name="email" type="email" value={formModal.data.email} onChange={handleFormChange} placeholder="Enter email" />
                  {formErrors.email && <p className="staff-page__form-error">{formErrors.email}</p>}
                </div>
                <div className="staff-page__form-field">
                  <label htmlFor="staff-phone">Phone <span>*</span></label>
                  <input id="staff-phone" name="phone" value={formModal.data.phone} onChange={handleFormChange} placeholder="Enter phone number" />
                  {formErrors.phone && <p className="staff-page__form-error">{formErrors.phone}</p>}
                </div>
                <div className="staff-page__form-field">
                  <label htmlFor="staff-password">
                    Password {formModal.mode === 'create' ? <span>*</span> : <small>(leave blank to keep)</small>}
                  </label>
                  <input id="staff-password" name="password" type="password" value={formModal.data.password} onChange={handleFormChange} placeholder={formModal.mode === 'create' ? 'Enter password' : 'Leave blank to keep current'} />
                  {formErrors.password && <p className="staff-page__form-error">{formErrors.password}</p>}
                </div>
                <div className="staff-page__form-field">
                  <label htmlFor="staff-role">Role <span>*</span></label>
                  <select id="staff-role" name="role" value={formModal.data.role} onChange={handleFormChange}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="staff-page__form-field">
                  <ImageUploader label="Staff avatar" folder="avatars" value={formModal.data.avatarUrl}
                    onChange={(avatarUrl) => setFormModal((current) => ({ ...current, data: { ...current.data, avatarUrl } }))} />
                </div>
              </div>
              <div className="staff-page__form-actions">
                <button type="button" className="staff-page__form-btn staff-page__form-btn--cancel" disabled={formLoading} onClick={() => setFormModal({ open: false, mode: 'create', data: INITIAL_FORM })}>Cancel</button>
                <button type="submit" className="staff-page__form-btn staff-page__form-btn--submit" disabled={formLoading}>
                  {formLoading ? 'Saving...' : formModal.mode === 'create' ? 'Create Account' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteModal.open}
        title="Delete Staff Account"
        message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ open: false, id: null, name: '' })}
        loading={deleteLoading}
      />
    </div>
  )
}

export default StaffAccountPage
