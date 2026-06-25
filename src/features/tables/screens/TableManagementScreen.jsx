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

const PAGE_SIZE = 5

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

  const toggleActive = async (tableId) => {
    try {
      await tableApi.toggleActive(tableId)
      await loadTables()
    } catch {
      setError('Unable to change table active status.')
    }
  }

  const updateStatus = async (tableId, nextStatus) => {
    try {
      await tableApi.updateStatus(tableId, nextStatus)
      setTables((prev) => prev.map((table) => (table.id === tableId ? { ...table, status: nextStatus } : table)))
    } catch {
      setError('Unable to update table status.')
    }
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setCreateError('')
    if (!newTable.id.trim() || !newTable.name.trim()) {
      setCreateError('Table ID and Table Name are required.')
      return
    }

    const dupNumber = tables.some(
        (t) => (t.tableNumber ?? t.id ?? '').toLowerCase() === newTable.id.trim().toLowerCase()
    )
    if (dupNumber) {
      setCreateError(`Table ID "${newTable.id.trim()}" already exists. Please choose a different ID.`)
      return
    }
    const dupName = tables.some(
        (t) => (t.name ?? '').toLowerCase() === newTable.name.trim().toLowerCase()
    )
    if (dupName) {
      setCreateError(`Table Name "${newTable.name.trim()}" already exists. Please choose a different name.`)
      return
    }

    try {
      const payload = mapUiTableToApiRequest({
        ...newTable,
        tableNumber: newTable.id.trim(),
      })
      const response = await tableApi.create(payload)
      if (!response.data) throw new Error('No data returned from server.')
      setTables((prev) => [mapApiTableToUi(response.data), ...prev])
      setIsCreateOpen(false)
      setCreateError('')
      setNewTable({ id: '', name: '', type: 'Main Hall', capacity: 2, status: 'AVAILABLE', active: true })
    } catch (err) {
      const serverMsg = err?.response?.data?.message ?? err?.response?.data ?? null
      if (err?.response?.status === 409) {
        setCreateError(serverMsg ?? 'This table number already exists on the server.')
      } else if (err?.response?.status === 400) {
        setCreateError(serverMsg ?? 'Invalid table data. Please check all fields.')
      } else {
        setCreateError('Unable to create table on server. Please try again.')
      }
    }
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!editTable) return
    setEditError('')

    if (!String(editTable.name ?? '').trim()) {
      setEditError('Table Name is required.')
      return
    }
    if (!String(editTable.type ?? '').trim()) {
      setEditError('Table Type is required.')
      return
    }
    if (!editTable.capacity || Number(editTable.capacity) < 1) {
      setEditError('Capacity must be at least 1.')
      return
    }

    const dupName = tables.some(
        (t) => t.id !== editTable.id &&
            (t.name ?? '').toLowerCase() === String(editTable.name).trim().toLowerCase()
    )
    if (dupName) {
      setEditError(`Table Name "${String(editTable.name).trim()}" already exists. Please choose a different name.`)
      return
    }

    try {
      await tableApi.update(editTable.id, mapUiTableToApiRequest(editTable))
      await tableApi.updateStatus(editTable.id, editTable.status)

      setTables((prev) => prev.map((table) => (table.id === editTable.id ? { ...table, ...editTable } : table)))
      setEditTable(null)
      setEditError('')
    } catch (err) {
      const serverMsg = err?.response?.data?.message ?? err?.response?.data ?? null
      if (err?.response?.status === 409) {
        setEditError(serverMsg ?? 'This table number already exists on the server.')
      } else if (err?.response?.status === 400) {
        setEditError(serverMsg ?? 'Invalid table data. Please check all fields.')
      } else {
        setEditError('Unable to update table on server. Please try again.')
      }
    }
  }

  const handleCreateStatusButton = async (table) => {
    await updateStatus(table.id, table.status)
  }

  const handleDeleteTable = async (table) => {
    const confirmDelete = window.confirm(`Delete table ${table.tableNumber ?? table.id}?`)
    if (!confirmDelete) return

    try {
      await tableApi.delete(table.id)
      await loadTables()
    } catch {
      setError('Unable to delete table on server.')
    }
  }

  return (
      <div className="table-mgmt">
        <div className="table-mgmt__header">
          <div>
            <p className="table-mgmt__breadcrumb">Dashboard / Tables / Table Management</p>
            <h1>Table Management</h1>
            <p>Manage all tables and their current status in your restaurant.</p>
          </div>
          <button type="button" className="table-mgmt__add-btn" onClick={() => setIsCreateOpen(true)}>
            <Plus size={18} /> Add New Table
          </button>
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
                      <button type="button" className={`table-mgmt__status-badge table-mgmt__status-badge--${table.status.toLowerCase()}`} onClick={() => handleCreateStatusButton(table)}>
                        {STATUS_LABELS[table.status]}
                      </button>
                    </td>
                    <td>
                      <button
                          type="button"
                          className="table-mgmt__qr-btn"
                          title="QR Code"
                          onClick={() => setQrModalTable(table)}
                      >
                        <QrCode size={18} />
                      </button>
                    </td>
                    <td>
                      <div className="table-mgmt__actions">
                        <button type="button" onClick={() => setSelectedTable(table)} title="View Table Details"><Eye size={16} /></button>
                        <button type="button" onClick={() => setEditTable(table)} title="Update Table Information"><Pencil size={16} /></button>
                        <button
                            type="button"
                            className={`table-mgmt__action-btn ${table.active ? 'table-mgmt__action-btn--active' : 'table-mgmt__action-btn--deactive'}`}
                            onClick={() => toggleActive(table.id)}
                            title={table.active ? 'Deactivate table' : 'Activate table'}
                        >
                          <Power size={16} />
                        </button>
                        <button type="button" className="table-mgmt__action-btn table-mgmt__action-btn--delete" onClick={() => handleDeleteTable(table)} title="Delete table">
                          <Trash2 size={16} />
                        </button>
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

        {selectedTable && (
            <div className="table-mgmt__modal-backdrop" onClick={() => setSelectedTable(null)}>
              <div className="table-mgmt__modal" onClick={(e) => e.stopPropagation()}>
                <h2>View Table Details</h2>
                <div className="table-mgmt__form table-mgmt__form--read-only">
                  <label className="table-mgmt__field">
                    <span>Table ID</span>
                    <div className="table-mgmt__read-value">{selectedTable.tableNumber ?? selectedTable.id}</div>
                  </label>
                  <label className="table-mgmt__field">
                    <span>Table Name</span>
                    <div className="table-mgmt__read-value">{selectedTable.name}</div>
                  </label>
                  <label className="table-mgmt__field">
                    <span>Type</span>
                    <div className="table-mgmt__read-value">{selectedTable.type}</div>
                  </label>
                  <label className="table-mgmt__field">
                    <span>Capacity</span>
                    <div className="table-mgmt__read-value">{selectedTable.capacity}</div>
                  </label>
                  <label className="table-mgmt__field">
                    <span>Status</span>
                    <div className="table-mgmt__read-value">{selectedTable.status}</div>
                  </label>
                  <label className="table-mgmt__field">
                    <span>Active</span>
                    <div className="table-mgmt__read-value">{selectedTable.active ? 'Active' : 'Inactive'}</div>
                  </label>
                </div>
                <button type="button" className="table-mgmt__close" onClick={() => setSelectedTable(null)}>Close</button>
              </div>
            </div>
        )}

        {editTable && (
            <div className="table-mgmt__modal-backdrop" onClick={() => { setEditTable(null); setEditError('') }}>
              <div className="table-mgmt__modal" onClick={(e) => e.stopPropagation()}>
                <h2>Update Table Information</h2>
                {editError && <div className="table-mgmt__create-error">{editError}</div>}
                <form className="table-mgmt__form" onSubmit={handleEditSubmit}>
                  <label className="table-mgmt__field">
                    <span>Table ID</span>
                    <input value={editTable.tableNumber ?? editTable.id} disabled />
                  </label>
                  <label className="table-mgmt__field">
                    <span>Table Name</span>
                    <input value={editTable.name} onChange={(e) => { setEditTable((prev) => ({ ...prev, name: e.target.value })); setEditError('') }} placeholder="Table name" />
                  </label>
                  <label className="table-mgmt__field">
                    <span>Type</span>
                    <input value={editTable.type} onChange={(e) => { setEditTable((prev) => ({ ...prev, type: e.target.value })); setEditError('') }} placeholder="Type" />
                  </label>
                  <label className="table-mgmt__field">
                    <span>Capacity</span>
                    <input type="number" min="1" value={editTable.capacity} onChange={(e) => { setEditTable((prev) => ({ ...prev, capacity: Number(e.target.value) })); setEditError('') }} placeholder="Capacity" />
                  </label>
                  <label className="table-mgmt__field">
                    <span>Status</span>
                    <select value={editTable.status} onChange={(e) => setEditTable((prev) => ({ ...prev, status: e.target.value }))}>
                      {STATUS_OPTIONS.filter((option) => option !== 'ALL').map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  <button type="submit">Save Changes</button>
                </form>
              </div>
            </div>
        )}

        {isCreateOpen && (
            <div className="table-mgmt__modal-backdrop" onClick={() => { setIsCreateOpen(false); setCreateError('') }}>
              <div className="table-mgmt__modal" onClick={(e) => e.stopPropagation()}>
                <h2>Add New Table</h2>
                {createError && <div className="table-mgmt__create-error">{createError}</div>}
                <form className="table-mgmt__form" onSubmit={handleCreate}>
                  <label className="table-mgmt__field">
                    <span>Table ID</span>
                    <input value={newTable.id} onChange={(e) => { setNewTable((prev) => ({ ...prev, id: e.target.value })); setCreateError('') }} placeholder="Table ID" />
                  </label>
                  <label className="table-mgmt__field">
                    <span>Table Name</span>
                    <input value={newTable.name} onChange={(e) => { setNewTable((prev) => ({ ...prev, name: e.target.value })); setCreateError('') }} placeholder="Table name" />
                  </label>
                  <label className="table-mgmt__field">
                    <span>Type</span>
                    <input value={newTable.type} onChange={(e) => setNewTable((prev) => ({ ...prev, type: e.target.value }))} placeholder="Type" />
                  </label>
                  <label className="table-mgmt__field">
                    <span>Capacity</span>
                    <input type="number" value={newTable.capacity} onChange={(e) => setNewTable((prev) => ({ ...prev, capacity: Number(e.target.value) }))} placeholder="0" />
                  </label>
                  <label className="table-mgmt__field">
                    <span>Status</span>
                    <select value={newTable.status} onChange={(e) => setNewTable((prev) => ({ ...prev, status: e.target.value }))}>
                      {STATUS_OPTIONS.filter((option) => option !== 'ALL').map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  <button type="submit">Create Table</button>
                </form>
              </div>
            </div>
        )}

        {/* ========================================================= */}
        {/* 🟢 MODAL HIỂN THỊ VÀ TỰ ĐỘNG VẼ MÃ QR TỪ ID BÀN 🟢 */}
        {qrModalTable && (
            <div className="table-mgmt__modal-backdrop" onClick={() => setQrModalTable(null)}>
              <div className="table-mgmt__modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                <h2>QR Code - {qrModalTable.name || `Table ${qrModalTable.tableNumber}`}</h2>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>Scan this QR code to access digital menu and ordering.</p>

                {/* Thành phần Vẽ mã QR */}
                <div style={{ margin: '20px auto', padding: '15px', background: '#fff', display: 'inline-block', borderRadius: '8px', border: '1px solid #eee' }}>
                  <QRCodeSVG
                      value={`http://localhost:5173/order?tableId=${qrModalTable.id}`} // URL trang gọi món kèm ID bàn
                      size={200}
                      bgColor={"#ffffff"}
                      fgColor={"#000000"}
                      level={"H"} // Chất lượng quét cao nhất
                  />
                </div>

                <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
                  ID bàn cố định: <strong style={{ color: '#111' }}>{qrModalTable.id}</strong>
                </div>

                <button type="button" className="table-mgmt__close" onClick={() => setQrModalTable(null)}>
                  Close
                </button>
              </div>
            </div>
        )}
        {/* ========================================================= */}
      </div>
  )
}

export default TableManagementScreen