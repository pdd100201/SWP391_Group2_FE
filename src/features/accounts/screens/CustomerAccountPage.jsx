import { useCallback, useEffect, useState } from 'react'
import {
  Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, X, UserCircle2,
} from 'lucide-react'
import {
  getCustomerAccounts, getCustomerById, updateCustomer, deleteCustomer
} from '../api/accountApi'
import { usePagination } from '../../../shared/hooks/usePagination'
import ConfirmModal from '../../../shared/components/ui/ConfirmModal/ConfirmModal'
import LoadingSpinner from '../../../shared/components/ui/LoadingSpinner/LoadingSpinner'
import './CustomerAccountPage.css'

const PAGE_SIZE = 4

const INITIAL_EDIT = { fullName: '', email: '', phone: '', avatarUrl: '' }

function CustomerAccountPage() {
  const showToast = useToast()

  const [allAccounts, setAllAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const pagination = usePagination(allAccounts, PAGE_SIZE)

  const [viewData, setViewData] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [editModal, setEditModal] = useState({ open: false, data: INITIAL_EDIT })
  const [editLoading, setEditLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' })
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.keyword = search
      const res = await getCustomerAccounts(params)
      setAllAccounts(res.data?.data || [])
    } catch {
      showToast('Failed to load customer accounts', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, showToast])


  const handleSearch = () => { setSearch(searchInput); pagination.reset() }

  const handleView = async (id) => {
    setViewLoading(true)
    setViewData({})
    try {
      const res = await getCustomerById(id)
      setViewData(res.data?.data || res.data)
    } catch {
      showToast('Failed to load customer details', 'error')
      setViewData(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = (acc) => {
    setFormErrors({})
    setEditModal({
      open: true,
      data: {
        id: acc.id,
        fullName: acc.fullName || '',
        email: acc.email || '',
        phone: acc.phone || '',
        avatarUrl: acc.avatarUrl || '',
      },
    })
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditModal((prev) => ({ ...prev, data: { ...prev.data, [name]: value } }))
    setFormErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateEdit = () => {
    const errs = {}
    const d = editModal.data
    if (!d.fullName.trim()) errs.fullName = 'Full name is required'
    if (!d.phone.trim()) errs.phone = 'Phone number is required'
    else if (!/^0[1-9][0-9]{8,9}$/.test(d.phone)) errs.phone = 'Phone must start with 0, second digit 1-9, and be 10-11 digits'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!validateEdit()) return
    setEditLoading(true)
    try {
      await updateCustomer(editModal.data.id, editModal.data)
      showToast('Customer updated successfully')
      setEditModal({ open: false, data: INITIAL_EDIT })
      fetchAccounts()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update customer', 'error')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    try {
      await deleteCustomer(deleteModal.id)
      showToast('Customer deleted successfully')
      setDeleteModal({ open: false, id: null, name: '' })
      fetchAccounts()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete customer', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="customer-page">
      <div className="customer-page__header">
        <div>
          <h1 className="customer-page__title">Customer Accounts</h1>
          <p className="customer-page__subtitle">View and manage all registered customers</p>
        </div>
      </div>

      <div className="customer-page__filters">
        <div className="customer-page__search">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button type="button" className="customer-page__search-btn" onClick={handleSearch}>
            <Search size={18} />
          </button>
        </div>
      </div>

      <div className="customer-page__table-wrapper">
        {loading && <LoadingSpinner overlay />}
        <table className="customer-page__table">
          <thead>
            <tr>
              <th>STT</th><th>Avatar</th><th>Full Name</th><th>Email</th>
              <th>Phone</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && pagination.currentItems.length === 0 && (
              <tr><td colSpan={6} className="customer-page__empty">No customer accounts found</td></tr>
            )}
            {pagination.currentItems.map((acc, idx) => (
              <tr key={acc.id}>
                <td>{pagination.startIdx + idx}</td>
                <td>
                  {acc.avatarUrl
                    ? <img src={acc.avatarUrl} alt="" className="customer-page__avatar" />
                    : <div className="customer-page__avatar-placeholder"><UserCircle2 size={28} /></div>}
                </td>
                <td className="customer-page__name">{acc.fullName}</td>
                <td>{acc.email}</td>
                <td>{acc.phone}</td>
                <td>
                  <div className="customer-page__actions">
                    <button type="button" className="customer-page__action-btn customer-page__action-btn--view" title="View" onClick={() => handleView(acc.id)}><Eye size={16} /></button>
                    <button type="button" className="customer-page__action-btn customer-page__action-btn--edit" title="Edit" onClick={() => openEdit(acc)}><Pencil size={16} /></button>
                    <button type="button" className="customer-page__action-btn customer-page__action-btn--delete" title="Delete" onClick={() => setDeleteModal({ open: true, id: acc.id, name: acc.fullName })}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 0 && (
        <div className="customer-page__pagination">
          <span className="customer-page__pagination-info">
            Showing {pagination.startIdx}–{pagination.endIdx} of {pagination.totalElements}
          </span>
          <div className="customer-page__pagination-controls">
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
        <div className="customer-page__modal-backdrop" onClick={() => setViewData(null)}>
          <div className="customer-page__modal" onClick={(e) => e.stopPropagation()}>
            <div className="customer-page__modal-header">
              <h2>Customer Details</h2>
              <button type="button" className="customer-page__modal-close" onClick={() => setViewData(null)}><X size={20} /></button>
            </div>
            <div className="customer-page__modal-body">
              {viewLoading ? <LoadingSpinner /> : (
                <div className="customer-page__detail">
                  <div className="customer-page__detail-avatar">
                    {viewData.avatarUrl ? <img src={viewData.avatarUrl} alt="" /> : <UserCircle2 size={64} />}
                  </div>
                  <div className="customer-page__detail-grid">
                    <div className="customer-page__detail-item"><label>Full Name</label><span>{viewData.fullName}</span></div>
                    <div className="customer-page__detail-item"><label>Email</label><span>{viewData.email}</span></div>
                    <div className="customer-page__detail-item"><label>Phone</label><span>{viewData.phone}</span></div>
                    {viewData.createdAt && (
                      <div className="customer-page__detail-item">
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

      {editModal.open && (
        <div className="customer-page__modal-backdrop" onClick={() => !editLoading && setEditModal({ open: false, data: INITIAL_EDIT })}>
          <div className="customer-page__modal customer-page__modal--form" onClick={(e) => e.stopPropagation()}>
            <div className="customer-page__modal-header">
              <h2>Edit Customer</h2>
              <button type="button" className="customer-page__modal-close" disabled={editLoading} onClick={() => setEditModal({ open: false, data: INITIAL_EDIT })}><X size={20} /></button>
            </div>
            <form className="customer-page__form" onSubmit={handleEditSubmit}>
              <div className="customer-page__form-grid">
                <div className="customer-page__form-field">
                  <label htmlFor="cust-fullName">Full Name <span>*</span></label>
                  <input id="cust-fullName" name="fullName" value={editModal.data.fullName} onChange={handleEditChange} placeholder="Enter full name" />
                  {formErrors.fullName && <p className="customer-page__form-error">{formErrors.fullName}</p>}
                </div>
                <div className="customer-page__form-field">
                  <label htmlFor="cust-email">Email</label>
                  <input id="cust-email" name="email" value={editModal.data.email} disabled className="customer-page__form-field--disabled" />
                </div>
                <div className="customer-page__form-field">
                  <label htmlFor="cust-phone">Phone <span>*</span></label>
                  <input id="cust-phone" name="phone" value={editModal.data.phone} onChange={handleEditChange} placeholder="Enter phone number" />
                  {formErrors.phone && <p className="customer-page__form-error">{formErrors.phone}</p>}
                </div>
                <div className="customer-page__form-field">
                  <label htmlFor="cust-avatar">Avatar URL</label>
                  <input id="cust-avatar" name="avatarUrl" value={editModal.data.avatarUrl} onChange={handleEditChange} placeholder="https://..." />
                </div>
              </div>
              <div className="customer-page__form-actions">
                <button type="button" className="customer-page__form-btn customer-page__form-btn--cancel" disabled={editLoading} onClick={() => setEditModal({ open: false, data: INITIAL_EDIT })}>Cancel</button>
                <button type="submit" className="customer-page__form-btn customer-page__form-btn--submit" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteModal.open}
        title="Delete Customer Account"
        message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ open: false, id: null, name: '' })}
        loading={deleteLoading}
      />
    </div>
  )
}

export default CustomerAccountPage
