import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronFirst, ChevronLast, Eye, Pencil, Power, Search, Plus, ChevronLeft, ChevronRight, QrCode, Trash2 } from 'lucide-react'
import { tableApi } from '../api/tableApi'
import { usePagination } from '../../../shared/hooks/usePagination'
import './TableManagementScreen.css'
import { QRCodeSVG } from 'qrcode.react' // Thư viện tự sinh QR

const INITIAL_TABLES = []

const STATUS_OPTIONS = ['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING']
const TYPE_OPTIONS = ['ALL', 'Main Hall', 'VIP Room', 'Patio']

const STATUS_LABELS = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  CLEANING: 'CLEANING',
}

const PAGE_SIZE = 10

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

const mapUiTableToApiRequest = (table) => ({
  tableNumber: String(table.tableNumber ?? table.id ?? '').trim(),
  tableName: String(table.name ?? '').trim(),
  tableType: String(table.type ?? '').trim(),
  capacity: Number(table.capacity),
  qrCode: table.qrCode ?? '',
})

function TableManagementScreen() {
  const userRole = sessionStorage.getItem('role');
  const isBoss = userRole && (userRole.toUpperCase() === 'ADMIN' || userRole.toUpperCase() === 'MANAGER');

  const [tables, setTables] = useState(INITIAL_TABLES)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [selectedTable, setSelectedTable] = useState(null)
  const [editTable, setEditTable] = useState(null)
  const [qrModalTable, setQrModalTable] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTable, setNewTable] = useState({ id: '', name: '', type: 'Main Hall', capacity: 2, status: 'AVAILABLE', active: true })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createError, setCreateError] = useState('')
  const [editError, setEditError] = useState('')

  // 🟢 HỆ THỐNG STATE QUẢN LÝ CÁC MODAL XÁC NHẬN (CONFIRMATION MODALS)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '', // 'CREATE', 'EDIT', 'TOGGLE_ACTIVE', 'DELETE'
    title: '',
    text: '',
    data: null // Lưu thông tin data tạm thời để xử lý sau khi bấm confirm
  })

  const loadTables = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await tableApi.getAll()
      setTables(Array.isArray(response.data) ? response.data.map(mapApiTableToUi) : [])
    } catch {
      setTables([])
      setError('Unable to load table data from server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTables()
  }, [loadTables])

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const q = search.trim().toLowerCase()
      const matchesSearch = !q || [table.tableNumber ?? table.id, table.name, table.type].some((value) => String(value).toLowerCase().includes(q))
      const matchesStatus = statusFilter === 'ALL' || table.status === statusFilter
      const matchesType = typeFilter === 'ALL' || table.type === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [tables, search, statusFilter, typeFilter])

  const pagination = usePagination(filteredTables, PAGE_SIZE)

  useEffect(() => {
    pagination.reset()
  }, [search, statusFilter, typeFilter])

  useEffect(() => {
    if (pagination.page > 0 && pagination.page >= pagination.totalPages) {
      pagination.setPage(Math.max(0, pagination.totalPages - 1))
    }
  }, [pagination.page, pagination.totalPages])

  const updateStatus = async (tableId, nextStatus) => {
    try {
      await tableApi.updateStatus(tableId, nextStatus)
      setTables((prev) => prev.map((table) => (table.id === tableId ? { ...table, status: nextStatus } : table)))
    } catch {
      setError('Unable to update table status.')
    }
  }

  // --- 1. XỬ LÝ THÊM MỚI (Bật modal hỏi trước) ---
  const triggerCreateConfirm = (event) => {
    event.preventDefault()
    setCreateError('')
    if (!newTable.id.trim() || !newTable.name.trim()) {
      setCreateError('Table ID and Table Name are required.')
      return
    }

    const dupNumber = tables.some((t) => (t.tableNumber ?? t.id ?? '').toLowerCase() === newTable.id.trim().toLowerCase())
    if (dupNumber) {
      setCreateError(`Table ID "${newTable.id.trim()}" already exists.`)
      return
    }
    const dupName = tables.some((t) => (t.name ?? '').toLowerCase() === newTable.name.trim().toLowerCase())
    if (dupName) {
      setCreateError(`Table Name "${newTable.name.trim()}" already exists.`)
      return
    }

    setConfirmModal({
      isOpen: true,
      type: 'CREATE',
      title: 'Create New Table',
      text: `Are you sure you want to add Table "${newTable.name.trim()}" to the restaurant system?`
    })
  }

  const executeCreate = async () => {
    try {
      const payload = mapUiTableToApiRequest({ ...newTable, tableNumber: newTable.id.trim() })
      const response = await tableApi.create(payload)
      if (!response.data) throw new Error('No data returned.')
      setTables((prev) => [mapApiTableToUi(response.data), ...prev])
      setIsCreateOpen(false)
      setNewTable({ id: '', name: '', type: 'Main Hall', capacity: 2, status: 'AVAILABLE', active: true })
      closeConfirmModal()
    } catch {
      setCreateError('Unable to create table on server.')
      closeConfirmModal()
    }
  }

  // --- 2. XỬ LÝ CẬP NHẬT (Bật modal hỏi trước) ---
  const triggerEditConfirm = (event) => {
    event.preventDefault()
    if (!editTable) return
    setEditError('')

    if (!String(editTable.name ?? '').trim() || !String(editTable.type ?? '').trim() || !editTable.capacity || Number(editTable.capacity) < 1) {
      setEditError('Please fill in all fields correctly.')
      return
    }

    const dupName = tables.some((t) => t.id !== editTable.id && (t.name ?? '').toLowerCase() === String(editTable.name).trim().toLowerCase())
    if (dupName) {
      setEditError(`Table Name "${String(editTable.name).trim()}" already exists.`)
      return
    }

    setConfirmModal({
      isOpen: true,
      type: 'EDIT',
      title: 'Update Table Information',
      text: `Are you sure you want to save changes for Table "${editTable.name}"?`
    })
  }

  const executeEdit = async () => {
    try {
      await tableApi.update(editTable.id, mapUiTableToApiRequest(editTable))
      await tableApi.updateStatus(editTable.id, editTable.status)
      setTables((prev) => prev.map((table) => (table.id === editTable.id ? { ...table, ...editTable } : table)))
      setEditTable(null)
      closeConfirmModal()
    } catch {
      setEditError('Unable to update table on server.')
      closeConfirmModal()
    }
  }

  // --- 3. XỬ LÝ ACTIVE / DEACTIVE (Bật modal hỏi trước) ---
  const triggerToggleActiveConfirm = (table) => {
    const actionText = table.active ? 'Deactivate' : 'Activate'
    setConfirmModal({
      isOpen: true,
      type: 'TOGGLE_ACTIVE',
      title: `${actionText} Restaurant Table`,
      text: `Are you sure you want to ${actionText.toLowerCase()} table "${table.name || table.tableNumber}"?`,
      data: table
    })
  }

  const executeToggleActive = async () => {
    const table = confirmModal.data
    if (!table) return
    try {
      await tableApi.toggleActive(table.id)
      await loadTables()
      closeConfirmModal()
    } catch {
      setError('Unable to change table active status.')
      closeConfirmModal()
    }
  }

  // --- 4. XỬ LÝ XÓA BÀN (Bật modal hỏi trước) ---
  const triggerDeleteConfirm = (table) => {
    setConfirmModal({
      isOpen: true,
      type: 'DELETE',
      title: 'Delete Restaurant Table',
      text: `Are you sure you want to delete table "${table.name || table.tableNumber}"? This action cannot be undone.`,
      data: table
    })
  }

  const executeDelete = async () => {
    const table = confirmModal.data
    if (!table) return
    try {
      await tableApi.delete(table.id)
      await loadTables()
      closeConfirmModal()
    } catch {
      setError('Unable to delete table on server.')
      closeConfirmModal()
    }
  }

  // Hàm tổng hợp xử lý khi Admin ấn nút đồng ý "Confirm" trên Modal chung
  const handleFinalConfirm = () => {
    switch (confirmModal.type) {
      case 'CREATE': executeCreate(); break;
      case 'EDIT': executeEdit(); break;
      case 'TOGGLE_ACTIVE': executeToggleActive(); break;
      case 'DELETE': executeDelete(); break;
      default: closeConfirmModal();
    }
  }

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: '', title: '', text: '', data: null })
  }

  return (
      <div className="table-mgmt">
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

        {error && <div className="table-mgmt__notice">{error}</div>}

        <div className="table-mgmt__toolbar">
          <div className="table-mgmt__search">
            <Search size={16} className="table-mgmt__search-icon" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by Table Number, Name or Type..." />
          </div>

          <div className="table-mgmt__filters">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All Types' : option}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All Statuses' : option}</option>)}
            </select>
          </div>
        </div>

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
                              fontWeight: 'bold'
                            }}
                            title="Nhấn để đổi trạng thái"
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="OCCUPIED">OCCUPIED</option>
                          <option value="RESERVED">RESERVED</option>
                          <option value="CLEANING">CLEANING</option>
                        </select>
                        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', opacity: 0.7, color: 'inherit' }}>▼</span>
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

        <div className="table-mgmt__footer">
          <span>Showing {pagination.startIdx}–{pagination.endIdx} of {pagination.totalElements}</span>
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

        {/* --- MODAL XEM CHI TIẾT --- */}
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

        {/* --- MODAL SỬA BÀN --- */}
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

        {/* --- MODAL THÊM BÀN --- */}
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

        {/* --- MODAL HIỂN THỊ QR --- */}
        {qrModalTable && (
            <div className="table-mgmt__modal-backdrop" onClick={() => setQrModalTable(null)}>
              <div className="table-mgmt__modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                <h2>QR Code - {qrModalTable.name || `Table ${qrModalTable.tableNumber}`}</h2>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>Scan this QR code to access digital menu and ordering.</p>
                <div style={{ margin: '20px auto', padding: '15px', background: '#fff', display: 'inline-block', borderRadius: '8px', border: '1px solid #eee' }}>
                  <QRCodeSVG value={`http://localhost:5173/order?tableId=${qrModalTable.id}`} size={200} bgColor={"#ffffff"} fgColor={"#000000"} level={"H"} />
                </div>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>ID bàn cố định: <strong style={{ color: '#111' }}>{qrModalTable.id}</strong></div>
                <button type="button" className="table-mgmt__close" onClick={() => setQrModalTable(null)}>Close</button>
              </div>
            </div>
        )}

        {/* MODAL XÁC NHẬN CHUNG (SỬ DỤNG CHO THÊM, SỬA, KHÓA, XÓA) */}

        {confirmModal.isOpen && (
            <div className="custom-modal-backdrop" onClick={closeConfirmModal}>
              <div className={`custom-modal-card custom-modal-card--${confirmModal.type.toLowerCase()}`} onClick={(e) => e.stopPropagation()}>

                {/* Vòng tròn Icon thay đổi linh hoạt theo loại hành động */}
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