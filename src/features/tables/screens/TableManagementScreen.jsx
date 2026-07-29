import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronFirst, ChevronLast, Eye, Pencil, Power, Search, Plus, ChevronLeft, ChevronRight, QrCode, Trash2 } from 'lucide-react'
import { tableApi } from '../api/tableApi'
import { usePagination } from '../../../shared/hooks/usePagination'
import './TableManagementScreen.css'
import { QRCodeSVG } from 'qrcode.react' // Thu vien sinh QR code tren frontend.

const INITIAL_TABLES = []

// Cac option dung cho dropdown filter.
const STATUS_OPTIONS = ['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING']
const TYPE_OPTIONS = ['ALL', 'Main Hall', 'VIP Room', 'Patio']

// Moi trang hien thi 10 ban.
const PAGE_SIZE = 10

// Doi data backend tra ve thanh format frontend dung de render UI.
const mapApiTableToUi = (table) => ({
  id: table.id,
  tableNumber: table.tableNumber ?? table.id,
  name: table.tableName ?? table.name ?? '',
  type: table.tableType ?? table.type ?? '',
  capacity: table.capacity ?? 0,
  status: table.status ?? 'AVAILABLE',
  active: table.isActive ?? table.active ?? true,
  qrCode: table.qrCode ?? '',
})

// Doi data tu form frontend thanh request body backend can nhan.
const mapUiTableToApiRequest = (table) => ({
  tableNumber: String(table.tableNumber ?? table.id ?? '').trim(),
  tableName: String(table.name ?? '').trim(),
  tableType: String(table.type ?? '').trim(),
  capacity: Number(table.capacity),
  qrCode: table.qrCode ?? '',
})

function TableManagementScreen() {
  // Lay role de quyet dinh user co duoc them/sua/xoa ban khong.
  const userRole = sessionStorage.getItem('role')
  const isBoss = userRole && (userRole.toUpperCase() === 'ADMIN' || userRole.toUpperCase() === 'MANAGER')

  // Danh sach ban dang hien thi tren man hinh.
  const [tables, setTables] = useState(INITIAL_TABLES)

  // State cua o search va 2 dropdown filter.
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  // selectedTable mo modal xem chi tiet.
  const [selectedTable, setSelectedTable] = useState(null)

  // editTable mo modal sua ban.
  const [editTable, setEditTable] = useState(null)

  // qrModalTable mo modal QR code.
  const [qrModalTable, setQrModalTable] = useState(null)

  // isCreateOpen dieu khien modal them ban.
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Data dang nhap trong form them ban moi.
  const [newTable, setNewTable] = useState({ id: '', name: '', type: 'Main Hall', capacity: 2, status: 'AVAILABLE', active: true })

  // State loading va cac loi hien tren UI.
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createError, setCreateError] = useState('')
  const [editError, setEditError] = useState('')

  // Modal xac nhan chung cho create/edit/toggle/delete.
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '', // CREATE, EDIT, TOGGLE_ACTIVE, DELETE
    title: '',
    text: '',
    data: null, // Luu tam table can xu ly sau khi bam Confirm.
  })

  // Goi API lay danh sach ban tu backend.
  const loadTables = useCallback(async () => {
    // Bat loading va xoa loi cu truoc khi goi API.
    setLoading(true)
    setError('')

    try {
      // Goi GET /tables.
      const response = await tableApi.getAll()

      // Backend tra ve array thi map sang format UI.
      setTables(Array.isArray(response.data) ? response.data.map(mapApiTableToUi) : [])
    } catch {
      // Loi API thi clear list va hien thong bao loi.
      setTables([])
      setError('Unable to load table data from server.')
    } finally {
      // Du thanh cong hay that bai cung tat loading.
      setLoading(false)
    }
  }, [])

  // Khi component vua mo, load danh sach ban.
  useEffect(() => {
    const timer = window.setTimeout(loadTables, 0)
    return () => window.clearTimeout(timer)
  }, [loadTables])

  // Loc ban theo search, status va type.
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      // Lay keyword search va doi ve chu thuong de so sanh.
      const q = search.trim().toLowerCase()

      // Search theo table number, ten ban, hoac loai ban.
      const matchesSearch = !q || [table.tableNumber ?? table.id, table.name, table.type].some((value) => String(value).toLowerCase().includes(q))

      // Neu statusFilter la ALL thi bo qua, nguoc lai phai trung status.
      const matchesStatus = statusFilter === 'ALL' || table.status === statusFilter

      // Neu typeFilter la ALL thi bo qua, nguoc lai phai trung type.
      const matchesType = typeFilter === 'ALL' || table.type === typeFilter

      // Chi hien ban thoa ca 3 dieu kien.
      return matchesSearch && matchesStatus && matchesType
    })
  }, [tables, search, statusFilter, typeFilter])

  // Tao pagination tu danh sach da loc.
  const pagination = usePagination(filteredTables, PAGE_SIZE)
  const { page, totalPages, setPage } = pagination

  // Neu filter lam tong trang giam, dua page hien tai ve trang hop le.
  useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1))
    }
  }, [page, totalPages, setPage])

  // Doi status cua ban ngay tren dropdown trong bang.
  const updateStatus = async (tableId, nextStatus) => {
    try {
      // Goi PATCH /tables/{id}/status.
      await tableApi.updateStatus(tableId, nextStatus)

      // Cap nhat UI local de status doi ngay.
      setTables((prev) => prev.map((table) => (table.id === tableId ? { ...table, status: nextStatus } : table)))
    } catch {
      setError('Unable to update table status.')
    }
  }

  // Khi submit form create, validate truoc roi moi mo modal confirm.
  const triggerCreateConfirm = (event) => {
    // Chan submit form lam reload trang.
    event.preventDefault()

    // Xoa loi cu.
    setCreateError('')

    // Bat buoc co Table ID va Table Name.
    if (!newTable.id.trim() || !newTable.name.trim()) {
      setCreateError('Table ID and Table Name are required.')
      return
    }

    // Kiem tra trung so ban tren danh sach hien tai.
    const dupNumber = tables.some((t) => (t.tableNumber ?? t.id ?? '').toLowerCase() === newTable.id.trim().toLowerCase())
    if (dupNumber) {
      setCreateError(`Table ID "${newTable.id.trim()}" already exists.`)
      return
    }

    // Kiem tra trung ten ban tren danh sach hien tai.
    const dupName = tables.some((t) => (t.name ?? '').toLowerCase() === newTable.name.trim().toLowerCase())
    if (dupName) {
      setCreateError(`Table Name "${newTable.name.trim()}" already exists.`)
      return
    }

    // Hop le thi mo modal confirm, chua goi API create ngay.
    setConfirmModal({
      isOpen: true,
      type: 'CREATE',
      title: 'Create New Table',
      text: `Are you sure you want to add Table "${newTable.name.trim()}" to the restaurant system?`,
    })
  }

  // Chay khi user bam Confirm trong modal create.
  const executeCreate = async () => {
    try {
      // Doi data form sang body backend can.
      const payload = mapUiTableToApiRequest({ ...newTable, tableNumber: newTable.id.trim() })

      // Goi POST /tables.
      const response = await tableApi.create(payload)
      if (!response.data) throw new Error('No data returned.')

      // Them ban moi vao dau danh sach tren UI.
      setTables((prev) => [mapApiTableToUi(response.data), ...prev])

      // Dong modal create va reset form.
      setIsCreateOpen(false)
      setNewTable({ id: '', name: '', type: 'Main Hall', capacity: 2, status: 'AVAILABLE', active: true })
      closeConfirmModal()
    } catch {
      // Loi create thi hien message trong modal create.
      setCreateError('Unable to create table on server.')
      closeConfirmModal()
    }
  }

  // Khi submit form edit, validate truoc roi moi mo modal confirm.
  const triggerEditConfirm = (event) => {
    // Chan submit form lam reload trang.
    event.preventDefault()

    // Khong co ban dang edit thi dung.
    if (!editTable) return

    // Xoa loi cu.
    setEditError('')

    // Validate ten ban, loai ban, capacity.
    if (!String(editTable.name ?? '').trim() || !String(editTable.type ?? '').trim() || !editTable.capacity || Number(editTable.capacity) < 1) {
      setEditError('Please fill in all fields correctly.')
      return
    }

    // Kiem tra ten ban moi co trung voi ban khac khong.
    const dupName = tables.some((t) => t.id !== editTable.id && (t.name ?? '').toLowerCase() === String(editTable.name).trim().toLowerCase())
    if (dupName) {
      setEditError(`Table Name "${String(editTable.name).trim()}" already exists.`)
      return
    }

    // Hop le thi mo modal confirm, chua goi API update ngay.
    setConfirmModal({
      isOpen: true,
      type: 'EDIT',
      title: 'Update Table Information',
      text: `Are you sure you want to save changes for Table "${editTable.name}"?`,
    })
  }

  // Chay khi user bam Confirm trong modal edit.
  const executeEdit = async () => {
    try {
      // Update thong tin co ban cua ban.
      await tableApi.update(editTable.id, mapUiTableToApiRequest(editTable))

      // Update status rieng vi backend co endpoint status rieng.
      await tableApi.updateStatus(editTable.id, editTable.status)

      // Cap nhat table trong state local.
      setTables((prev) => prev.map((table) => (table.id === editTable.id ? { ...table, ...editTable } : table)))

      // Dong modal edit va confirm.
      setEditTable(null)
      closeConfirmModal()
    } catch {
      setEditError('Unable to update table on server.')
      closeConfirmModal()
    }
  }

  // Mo modal confirm truoc khi active/deactive ban.
  const triggerToggleActiveConfirm = (table) => {
    // Neu dang active thi hanh dong la Deactivate, nguoc lai la Activate.
    const actionText = table.active ? 'Deactivate' : 'Activate'

    // Luu table vao confirmModal.data de lat nua executeToggleActive dung.
    setConfirmModal({
      isOpen: true,
      type: 'TOGGLE_ACTIVE',
      title: `${actionText} Restaurant Table`,
      text: `Are you sure you want to ${actionText.toLowerCase()} table "${table.name || table.tableNumber}"?`,
      data: table,
    })
  }

  // Chay khi user bam Confirm de active/deactive ban.
  const executeToggleActive = async () => {
    // Lay table can toggle tu data tam trong modal.
    const table = confirmModal.data
    if (!table) return

    try {
      // Goi PATCH /tables/{id}/toggle-active.
      await tableApi.toggleActive(table.id)

      // Reload lai danh sach de dong bo voi backend.
      await loadTables()
      closeConfirmModal()
    } catch {
      setError('Unable to change table active status.')
      closeConfirmModal()
    }
  }

  // Mo modal confirm truoc khi xoa ban.
  const triggerDeleteConfirm = (table) => {
    // Luu table vao confirmModal.data de lat nua executeDelete dung.
    setConfirmModal({
      isOpen: true,
      type: 'DELETE',
      title: 'Delete Restaurant Table',
      text: `Are you sure you want to delete table "${table.name || table.tableNumber}"? This action cannot be undone.`,
      data: table,
    })
  }

  // Chay khi user bam Confirm de xoa ban.
  const executeDelete = async () => {
    // Lay table can xoa tu data tam trong modal.
    const table = confirmModal.data
    if (!table) return

    try {
      // Goi DELETE /tables/{id}.
      await tableApi.delete(table.id)

      // Reload lai danh sach sau khi xoa.
      await loadTables()
      closeConfirmModal()
    } catch {
      setError('Unable to delete table on server.')
      closeConfirmModal()
    }
  }

  // Nut Confirm cua modal chung se dua vao type de chay dung hanh dong.
  const handleFinalConfirm = () => {
    switch (confirmModal.type) {
      case 'CREATE': executeCreate(); break
      case 'EDIT': executeEdit(); break
      case 'TOGGLE_ACTIVE': executeToggleActive(); break
      case 'DELETE': executeDelete(); break
      default: closeConfirmModal()
    }
  }

  // Dong modal confirm va xoa data tam.
  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: '', title: '', text: '', data: null })
  }

  return (
    <div className="table-mgmt">
      {/* Header va nut Add New Table. Nut Add chi hien voi ADMIN/MANAGER. */}
      <div className="table-mgmt__header">
        <div>
          <p className="table-mgmt__breadcrumb">Dashboard / Tables / Table Management</p>
          <h1>Table Management</h1>
          <p>Manage all tables and their current status in your restaurant.</p>
        </div>
        {isBoss && (
          <button type="button" className="table-mgmt__add-btn" onClick={() => setIsCreateOpen(true)}>
            <Plus size={18} /> Add New Table
          </button>
        )}
      </div>

      {/* Loi chung cua man hinh. */}
      {error && <div className="table-mgmt__notice">{error}</div>}

      {/* Toolbar search va filter. */}
      <div className="table-mgmt__toolbar">
        <div className="table-mgmt__search">
          <Search size={16} className="table-mgmt__search-icon" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); pagination.reset() }} placeholder="Search by Table Number, Name or Type..." />
        </div>

        <div className="table-mgmt__filters">
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); pagination.reset() }}>
            {TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All Types' : option}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); pagination.reset() }}>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All Statuses' : option}</option>)}
          </select>
        </div>
      </div>

      {/* Bang danh sach ban. */}
      <div className="table-mgmt__card">
        {loading && <div className="table-mgmt__loading">Loading table data...</div>}
        <div className="table-mgmt__table-wrap">
          <table className="table-mgmt__table">
            <thead>
              <tr>
                <th>NO</th>
                <th>TABLE NAME</th>
                <th>TYPE</th>
                <th>CAPACITY</th>
                <th>STATUS</th>
                <th>QR</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {pagination.currentItems.map((table, index) => (
                <tr key={table.id}>
                  <td>{pagination.startIdx + index}</td>
                  <td>{table.name}</td>
                  <td>{table.type}</td>
                  <td>{table.capacity}</td>
                  <td>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <select
                        className={`table-mgmt__status-badge table-mgmt__status-badge--${table.status.toLowerCase()}`}
                        value={table.status}
                        onChange={(e) => updateStatus(table.id, e.target.value)}
                        style={{
                          cursor: 'pointer',
                          outline: 'none',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          textAlign: 'center',
                          paddingRight: '22px',
                          paddingLeft: '12px',
                          fontWeight: 'bold',
                        }}
                        title="Click to change status"
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="OCCUPIED">OCCUPIED</option>
                        <option value="RESERVED">RESERVED</option>
                        <option value="CLEANING">CLEANING</option>
                      </select>
                      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', opacity: 0.7, color: 'inherit' }}>v</span>
                    </div>
                  </td>
                  <td>
                    <button type="button" className="table-mgmt__qr-btn" title="QR Code" onClick={() => setQrModalTable(table)}><QrCode size={18} /></button>
                  </td>
                  <td>
                    <div className="table-mgmt__actions">
                      <button type="button" onClick={() => setSelectedTable(table)} title="View Table Details"><Eye size={16} /></button>

                      {isBoss && (
                        <>
                          <button type="button" onClick={() => setEditTable(table)} title="Update Table Information"><Pencil size={16} /></button>
                          <button
                            type="button"
                            className={`table-mgmt__action-btn ${table.active ? 'table-mgmt__action-btn--active' : 'table-mgmt__action-btn--deactive'}`}
                            onClick={() => triggerToggleActiveConfirm(table)}
                            title={table.active ? 'Deactivate table' : 'Activate table'}
                          >
                            <Power size={16} />
                          </button>
                          <button type="button" className="table-mgmt__action-btn table-mgmt__action-btn--delete" onClick={() => triggerDeleteConfirm(table)} title="Delete table">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer phan trang. */}
      <div className="table-mgmt__footer">
        <span>Showing {pagination.startIdx}-{pagination.endIdx} of {pagination.totalElements}</span>
        <div className="table-mgmt__pagination">
          <button type="button" aria-label="First page" disabled={pagination.isFirst} onClick={() => pagination.setPage(0)}><ChevronFirst size={16} /></button>
          <button type="button" aria-label="Previous page" disabled={pagination.isFirst} onClick={() => pagination.setPage(pagination.page - 1)}><ChevronLeft size={16} /></button>
          {pagination.getPageNumbers().map((p) => (
            <button key={p} type="button" className={p === pagination.page ? 'is-active' : ''} onClick={() => pagination.setPage(p)}>{p + 1}</button>
          ))}
          <button type="button" aria-label="Next page" disabled={pagination.isLast} onClick={() => pagination.setPage(pagination.page + 1)}><ChevronRight size={16} /></button>
          <button type="button" aria-label="Last page" disabled={pagination.isLast} onClick={() => pagination.setPage(Math.max(0, pagination.totalPages - 1))}><ChevronLast size={16} /></button>
        </div>
      </div>

      {/* Modal xem chi tiet ban. */}
      {selectedTable && (
        <div className="table-mgmt__modal-backdrop" onClick={() => setSelectedTable(null)}>
          <div className="table-mgmt__modal" onClick={(e) => e.stopPropagation()}>
            <h2>View Table Details</h2>
            <div className="table-mgmt__form table-mgmt__form--read-only">
              <label className="table-mgmt__field"><span>Table ID</span><div className="table-mgmt__read-value">{selectedTable.tableNumber ?? selectedTable.id}</div></label>
              <label className="table-mgmt__field"><span>Table Name</span><div className="table-mgmt__read-value">{selectedTable.name}</div></label>
              <label className="table-mgmt__field"><span>Type</span><div className="table-mgmt__read-value">{selectedTable.type}</div></label>
              <label className="table-mgmt__field"><span>Capacity</span><div className="table-mgmt__read-value">{selectedTable.capacity}</div></label>
              <label className="table-mgmt__field"><span>Status</span><div className="table-mgmt__read-value">{selectedTable.status}</div></label>
              <label className="table-mgmt__field"><span>Active</span><div className="table-mgmt__read-value">{selectedTable.active ? 'Active' : 'Inactive'}</div></label>
            </div>
            <button type="button" className="table-mgmt__close" onClick={() => setSelectedTable(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Modal sua thong tin ban. Submit form se mo confirm modal truoc. */}
      {editTable && (
        <div className="table-mgmt__modal-backdrop" onClick={() => { setEditTable(null); setEditError('') }}>
          <div className="table-mgmt__modal" onClick={(e) => e.stopPropagation()}>
            <h2>Update Table Information</h2>
            {editError && <div className="table-mgmt__create-error">{editError}</div>}
            <form className="table-mgmt__form" onSubmit={triggerEditConfirm}>
              <label className="table-mgmt__field"><span>Table ID</span><input value={editTable.tableNumber ?? editTable.id} disabled /></label>
              <label className="table-mgmt__field"><span>Table Name</span><input value={editTable.name} onChange={(e) => { setEditTable((prev) => ({ ...prev, name: e.target.value })); setEditError('') }} placeholder="Table name" /></label>
              <label className="table-mgmt__field"><span>Type</span><input value={editTable.type} onChange={(e) => { setEditTable((prev) => ({ ...prev, type: e.target.value })); setEditError('') }} placeholder="Type" /></label>
              <label className="table-mgmt__field"><span>Capacity</span><input type="number" min="1" value={editTable.capacity} onChange={(e) => { setEditTable((prev) => ({ ...prev, capacity: Number(e.target.value) })); setEditError('') }} placeholder="Capacity" /></label>
              <label className="table-mgmt__field"><span>Status</span>
                <select value={editTable.status} onChange={(e) => setEditTable((prev) => ({ ...prev, status: e.target.value }))}>
                  {STATUS_OPTIONS.filter((option) => option !== 'ALL').map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <button type="submit">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal them ban moi. Submit form se mo confirm modal truoc. */}
      {isCreateOpen && (
        <div className="table-mgmt__modal-backdrop" onClick={() => { setIsCreateOpen(false); setCreateError('') }}>
          <div className="table-mgmt__modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Table</h2>
            {createError && <div className="table-mgmt__create-error">{createError}</div>}
            <form className="table-mgmt__form" onSubmit={triggerCreateConfirm}>
              <label className="table-mgmt__field"><span>Table ID</span><input value={newTable.id} onChange={(e) => { setNewTable((prev) => ({ ...prev, id: e.target.value })); setCreateError('') }} placeholder="Table ID" /></label>
              <label className="table-mgmt__field"><span>Table Name</span><input value={newTable.name} onChange={(e) => { setNewTable((prev) => ({ ...prev, name: e.target.value })); setCreateError('') }} placeholder="Table name" /></label>
              <label className="table-mgmt__field"><span>Type</span><input value={newTable.type} onChange={(e) => setNewTable((prev) => ({ ...prev, type: e.target.value }))} placeholder="Type" /></label>
              <label className="table-mgmt__field"><span>Capacity</span><input type="number" value={newTable.capacity} onChange={(e) => setNewTable((prev) => ({ ...prev, capacity: Number(e.target.value) }))} placeholder="0" /></label>
              <label className="table-mgmt__field"><span>Status</span>
                <select value={newTable.status} onChange={(e) => setNewTable((prev) => ({ ...prev, status: e.target.value }))}>
                  {STATUS_OPTIONS.filter((option) => option !== 'ALL').map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <button type="submit">Create Table</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal hien thi QR code cua ban. */}
      {qrModalTable && (
        <div className="table-mgmt__modal-backdrop" onClick={() => setQrModalTable(null)}>
          <div className="table-mgmt__modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h2>QR Code - {qrModalTable.name || `Table ${qrModalTable.tableNumber}`}</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>Scan this QR code to access digital menu and ordering.</p>
            <div style={{ margin: '20px auto', padding: '15px', background: '#fff', display: 'inline-block', borderRadius: '8px', border: '1px solid #eee' }}>
              <QRCodeSVG value={`http://localhost:5173/order?tableId=${qrModalTable.id}`} size={200} bgColor="#ffffff" fgColor="#000000" level="H" />
            </div>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>Table ID: <strong style={{ color: '#111' }}>{qrModalTable.id}</strong></div>
            <button type="button" className="table-mgmt__close" onClick={() => setQrModalTable(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Modal xac nhan chung cho CREATE, EDIT, TOGGLE_ACTIVE va DELETE. */}
      {confirmModal.isOpen && (
        <div className="custom-modal-backdrop" onClick={closeConfirmModal}>
          <div className={`custom-modal-card custom-modal-card--${confirmModal.type.toLowerCase()}`} onClick={(e) => e.stopPropagation()}>

            {/* Icon thay doi theo loai hanh dong. */}
            <div className="custom-modal-icon-wrapper">
              {confirmModal.type === 'DELETE' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="custom-modal-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              ) : confirmModal.type === 'TOGGLE_ACTIVE' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="custom-modal-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-5.03c1.519-.852 2.84-2.223 3.83-3.837m-19.822 2.5 1.135-2.012m0 0 1.123-1.993m-1.123 1.993a4.242 4.242 0 0 1-1.18 1.18l-1.185.664m4.536-4.2a4.2 4.2 0 0 1 1.123-1.993l1.122-1.992M19.142 3c-.113.11-.223.22-.331.332L6.896 15.244m12.246-12.244A2.25 2.25 0 1 1 22.5 5.25c0 .54-.192 1.036-.513 1.422M19.142 3a2.25 2.25 0 0 0-3.142 3.142M6.896 15.244A2.25 2.25 0 0 0 5.25 18.75m1.646-3.506A2.25 2.25 0 0 1 8.614 12c.54 0 1.036.192 1.422.513M5.25 18.75a2.25 2.25 0 0 0 3.142-.332l1.123-1.993" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="custom-modal-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              )}
            </div>

            <h2 className="custom-modal-title">{confirmModal.title}</h2>
            <p className="custom-modal-text">{confirmModal.text}</p>

            <div className="custom-modal-actions">
              <button type="button" className="custom-btn-cancel" onClick={closeConfirmModal}>
                Cancel
              </button>
              <button type="button" className="custom-btn-confirm" onClick={handleFinalConfirm}>
                Confirm
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default TableManagementScreen
