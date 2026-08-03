import { useEffect, useState } from 'react';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Edit, Loader2, Plus, Power, Save, Search, Trash2, X } from 'lucide-react';
import { useToast } from '../../../shared/components/ui/Toast/ToastContext';
import ConfirmModal from '../../../shared/components/ui/ConfirmModal/ConfirmModal';
import { promotionApi } from '../api/promotionApi';
import './PromotionsScreen.css';

const PAGE_SIZE = 10;

// Form mac dinh khi tao moi promotion.
// Promotion trong du an nay la ma giam gia ap vao tong bill, khong ap vao tung mon an.
const emptyForm = {
  code: '',
  name: '',
  description: '',
  type: 'PERCENT',
  value: '',
  minOrderAmount: '0',
  maxDiscountAmount: '',
  startDate: '',
  endDate: '',
  usageLimit: '',
  status: 'ACTIVE',
};

function PromotionsScreen() {
  const showToast = useToast();

  // State luu danh sach promotion va trang thai load/save cua man hinh.
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State dieu khien filter, search va phan trang.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });

  // State dieu khien modal create/edit va form dang nhap.
  const [modalMode, setModalMode] = useState(null);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // State luu loi hien thi va action dang cho nguoi dung xac nhan.
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Goi API lay danh sach promotion theo phan trang, search va status filter.
  // Backend tra ve dang Page nen FE lay content de render bang va totalPages de render pagination.
  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await promotionApi.getAll({
        page,
        size: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter,
      });
      const data = response.data || response || {};
      setPromotions(data.content || []);
      setPageInfo({
        size: data.size || PAGE_SIZE,
        totalElements: data.totalElements || 0,
        totalPages: data.totalPages || 0,
      });
    } catch (err) {
      console.error('Error fetching promotions:', err);
      setError(readError(err, 'Failed to load promotions.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Moi lan doi page, search hoac status filter thi load lai danh sach promotion.
    const timer = window.setTimeout(fetchPromotions, 0);
    return () => window.clearTimeout(timer);
  }, [page, search, statusFilter]);

  useEffect(() => {
    // Neu xoa item lam tong so page giam thi dua page hien tai ve page hop le cuoi cung.
    if (pageInfo.totalPages > 0 && page >= pageInfo.totalPages) {
      setPage(pageInfo.totalPages - 1);
    }
  }, [page, pageInfo.totalPages]);

  // Tinh cac gia tri hien thi pagination tu pageInfo backend tra ve.
  const totalPages = pageInfo.totalPages;
  const totalElements = pageInfo.totalElements;
  const startIdx = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, totalElements);
  const isFirstPage = page === 0;
  const isLastPage = totalPages === 0 || page >= totalPages - 1;

  const getPageNumbers = (maxVisible = 5) => {
    // Tao danh sach so trang can hien thi, gioi han toi da maxVisible trang.
    const pages = [];
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible);
    if (end - start < maxVisible) start = Math.max(0, end - maxVisible);
    for (let i = start; i < end; i += 1) pages.push(i);
    return pages;
  };

  const openCreateModal = () => {
    // Mo modal tao moi va gan san thoi gian hieu luc mac dinh.
    setEditingPromotion(null);
    setForm(defaultForm());
    setError('');
    setModalMode('create');
  };

  // Mo modal edit va gan data promotion dang chon vao form.
  // Date tu backend phai doi sang format yyyy-MM-ddTHH:mm de input datetime-local doc duoc.
  const openEditModal = (promotion) => {
    setEditingPromotion(promotion);
    setForm({
      code: promotion.code || '',
      name: promotion.name || '',
      description: promotion.description || '',
      type: promotion.type || 'PERCENT',
      value: valueToInput(promotion.value),
      minOrderAmount: valueToInput(promotion.minOrderAmount ?? 0),
      maxDiscountAmount: valueToInput(promotion.maxDiscountAmount),
      startDate: toDateTimeInput(promotion.startDate),
      endDate: toDateTimeInput(promotion.endDate),
      usageLimit: promotion.usageLimit ?? '',
      status: promotion.status || (promotion.isActive ? 'ACTIVE' : 'INACTIVE'),
    });
    setError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    // Khong cho dong modal khi dang save de tranh submit trung hoac mat loading state.
    if (saving) return;
    setModalMode(null);
    setEditingPromotion(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    // Cap nhat form theo name cua tung input, select hoac textarea.
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    // Chua goi API ngay, chi luu action de hien modal xac nhan truoc.
    setConfirmAction({
      type: modalMode === 'edit' ? 'update' : 'create',
      promotion: editingPromotion,
      form: { ...form },
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setSaving(true);
    setError('');

    try {
      if (confirmAction.type === 'delete') {
        // Xoa promotion chi thanh cong neu promotion chua tung duoc bill su dung.
        // Neu da duoc dung thi backend se chan xoa, luc do nen deactivate de giu lich su bill.
        await promotionApi.delete(confirmAction.promotion.id);
        setPromotions((prev) => prev.filter((item) => item.id !== confirmAction.promotion.id));
        setPageInfo((prev) => {
          const nextTotal = Math.max(prev.totalElements - 1, 0);
          return {
            ...prev,
            totalElements: nextTotal,
            totalPages: Math.ceil(nextTotal / PAGE_SIZE),
          };
        });
        setConfirmAction(null);
        showToast('Promotion deleted successfully');
        return;
      }

      // Create va update dung chung payload vi backend nhan cung PromotionRequest.
      const payload = buildPayload(confirmAction.form);
      const isEditMode = confirmAction.type === 'update';
      const response = isEditMode
        ? await promotionApi.update(confirmAction.promotion.id, payload)
        : await promotionApi.create(payload);

      const saved = response.data || response;
      setPromotions((prev) => {
        if (isEditMode) {
          return prev.map((promo) => (promo.id === saved.id ? saved : promo));
        }
        return [saved, ...prev];
      });
      if (!isEditMode) {
        setPageInfo((prev) => {
          const nextTotal = prev.totalElements + 1;
          return {
            ...prev,
            totalElements: nextTotal,
            totalPages: Math.ceil(nextTotal / PAGE_SIZE),
          };
        });
        setPage(0);
      }
      setModalMode(null);
      setEditingPromotion(null);
      setForm(emptyForm);
      setConfirmAction(null);
      showToast(isEditMode ? 'Promotion updated successfully' : 'Promotion created successfully');
    } catch (err) {
      console.error('Error confirming promotion action:', err);
      setConfirmAction(null);
      if (confirmAction.type === 'delete') {
        showToast(readError(err, 'Failed to delete promotion.'), 'error');
      } else {
        setError(readError(err, 'Failed to save promotion.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (promotion) => {
    try {
      // Doi nhanh ACTIVE/INACTIVE ngay tren bang, khong can mo modal edit.
      // FE gui trang thai nguoc voi hien tai, backend tra ve promotion da update.
      const nextStatus = !promotion.isActive;
      const response = await promotionApi.toggleStatus(promotion.id, nextStatus);
      const updated = response.data || response;
      setPromotions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      console.error('Error toggling promotion status:', err);
      alert(readError(err, 'Could not update status.'));
    }
  };

  const handleDelete = async (promotion) => {
    // Khong xoa ngay, chi mo modal confirm de tranh bam nham.
    setConfirmAction({ type: 'delete', promotion });
  };

  const getConfirmContent = () => {
    // Tao noi dung modal confirm tuy theo action dang thuc hien.
    if (!confirmAction) return {};
    if (confirmAction.type === 'delete') {
      return {
        title: 'Delete Promotion',
        message: `Are you sure you want to delete promotion "${confirmAction.promotion.code}"? Used promotions should be deactivated instead.`,
        confirmText: 'Delete',
        confirmVariant: 'danger',
      };
    }
    if (confirmAction.type === 'update') {
      return {
        title: 'Update Promotion Information',
        message: `Are you sure you want to save changes for promotion "${confirmAction.form.code.trim().toUpperCase()}"?`,
        confirmText: 'Confirm',
        confirmVariant: 'success',
      };
    }
    return {
      title: 'Create Promotion',
      message: `Are you sure you want to create promotion "${confirmAction.form.code.trim().toUpperCase()}"?`,
      confirmText: 'Confirm',
      confirmVariant: 'success',
    };
  };

  const confirmContent = getConfirmContent();

  return (
    <div className="promotions-screen">
      {/* Header cua man hinh quan ly promotion va nut mo modal tao moi. */}
      <header className="promo-header">
        <div className="promo-header__info">
          <h1>Promotions Management</h1>
          <p>Create bill-level discount codes and control when they can be used.</p>
        </div>
        <button className="promo-btn-add" onClick={openCreateModal}>
          <Plus size={18} /> Add Promotion
        </button>
      </header>

      {/* Loi load danh sach hien tren man hinh chinh, loi trong modal se hien ben trong modal. */}
      {error && !modalMode ? <div className="promo-alert">{error}</div> : null}

      {/* Thanh search va filter status, khi thay doi se reset ve page dau tien. */}
      <div className="promo-toolbar">
        <div className="promo-search">
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search by code, name, or description..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </div>
        <select
          className="promo-filter"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(0);
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {loading ? (
        // Trang thai loading khi dang goi API lay danh sach promotion.
        <div className="promo-loading">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading promotions...</span>
        </div>
      ) : (
        // Bang danh sach promotion da load tu backend.
        <div className="promo-table-container">
          <table className="promo-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Campaign</th>
                <th>Discount</th>
                <th>Bill Rule</th>
                <th>Valid Period</th>
                <th>Usage</th>
                <th>Status</th>
                <th className="promo-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.length > 0 ? (
                // Moi promotion duoc render thanh mot dong trong bang.
                promotions.map((promotion) => (
                  <tr key={promotion.id}>
                    <td>
                      <span className="promo-code">{promotion.code}</span>
                    </td>
                    <td>
                      <strong>{promotion.name}</strong>
                      {promotion.description ? <div className="promo-muted">{promotion.description}</div> : null}
                    </td>
                    <td>
                      <strong className="promo-discount">{formatDiscount(promotion)}</strong>
                      <div className="promo-muted">{promotion.type === 'PERCENT' ? 'Percent discount' : 'Fixed amount'}</div>
                    </td>
                    <td>
                      <div>Min bill: {formatMoney(promotion.minOrderAmount)}</div>
                      <div className="promo-muted">Max discount: {formatLimit(promotion.maxDiscountAmount)}</div>
                    </td>
                    <td>
                      <div>{formatDateTime(promotion.startDate)}</div>
                      <div className="promo-muted">to {formatDateTime(promotion.endDate)}</div>
                    </td>
                    <td>
                      {promotion.usedCount || 0}
                      <span className="promo-muted"> / {promotion.usageLimit || 'Unlimited'}</span>
                    </td>
                    <td>
                      <span className={`promo-status promo-status--${promotion.isActive ? 'active' : 'inactive'}`}>
                        {promotion.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {/* Cac nut thao tac tren tung promotion: active/deactive, edit va delete. */}
                      <div className="promo-actions">
                        <button
                          className="promo-btn-action promo-btn-action--power"
                          title={promotion.isActive ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleStatus(promotion)}
                        >
                          <Power size={18} />
                        </button>
                        <button className="promo-btn-action" title="Edit" onClick={() => openEditModal(promotion)}>
                          <Edit size={18} />
                        </button>
                        <button
                          className="promo-btn-action promo-btn-action--delete"
                          title="Delete"
                          onClick={() => handleDelete(promotion)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                // Hien thi khi backend tra ve danh sach rong.
                <tr>
                  <td colSpan="8" className="promo-empty">
                    No promotions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 0 ? (
        // Pagination chi hien khi da load xong va co it nhat 1 page.
        <nav className="promo-pagination" aria-label="Promotion pages">
          <span>
            Showing {startIdx}-{endIdx} of {totalElements}
          </span>
          <div className="promo-pagination__controls">
            <button type="button" aria-label="First page" disabled={isFirstPage} onClick={() => setPage(0)}>
              <ChevronFirst size={16} />
            </button>
            <button type="button" aria-label="Previous page" disabled={isFirstPage} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
              <ChevronLeft size={16} />
            </button>
            {getPageNumbers().map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === page ? 'is-active' : ''}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber + 1}
              </button>
            ))}
            <button type="button" aria-label="Next page" disabled={isLastPage} onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}>
              <ChevronRight size={16} />
            </button>
            <button type="button" aria-label="Last page" disabled={isLastPage} onClick={() => setPage(totalPages - 1)}>
              <ChevronLast size={16} />
            </button>
          </div>
        </nav>
      ) : null}

      {modalMode ? (
        // Modal dung chung cho create va edit promotion.
        <div className="promo-modal-backdrop" role="presentation">
          <form className="promo-modal" onSubmit={handleSubmit}>
            <div className="promo-modal__header">
              <div>
                <h2>{modalMode === 'edit' ? 'Edit Promotion' : 'Add Promotion'}</h2>
                <p>Discount applies to the final restaurant order bill.</p>
              </div>
              <button type="button" className="promo-modal__close" onClick={closeModal} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {/* Loi validate/save tu backend hien tai day de nguoi dung sua form. */}
            {error ? <div className="promo-alert">{error}</div> : null}

            {/* Form nhap thong tin promotion theo dung cac field backend yeu cau. */}
            <div className="promo-form-grid">
              <label>
                Code
                <input name="code" value={form.code} onChange={handleChange} placeholder="SUMMER10" required maxLength={50} />
              </label>
              <label>
                Campaign Name
                <input name="name" value={form.name} onChange={handleChange} placeholder="Summer bill discount" required />
              </label>
              <label>
                Discount Type
                <select name="type" value={form.type} onChange={handleChange}>
                  <option value="PERCENT">Percent</option>
                  <option value="FIXED">Fixed Amount</option>
                </select>
              </label>
              <label>
                Discount Value
                <input name="value" type="number" min="0" step="0.01" value={form.value} onChange={handleChange} required />
              </label>
              <label>
                Minimum Bill
                <input name="minOrderAmount" type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={handleChange} />
              </label>
              <label>
                Maximum Discount
                <input name="maxDiscountAmount" type="number" min="0" step="0.01" value={form.maxDiscountAmount} onChange={handleChange} placeholder="Optional" />
              </label>
              <label>
                Start Date
                <input name="startDate" type="datetime-local" value={form.startDate} onChange={handleChange} required />
              </label>
              <label>
                End Date
                <input name="endDate" type="datetime-local" value={form.endDate} onChange={handleChange} required />
              </label>
              <label>
                Usage Limit
                <input name="usageLimit" type="number" min="1" step="1" value={form.usageLimit} onChange={handleChange} placeholder="Unlimited" />
              </label>
              <label>
                Status
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              <label className="promo-form-grid__wide">
                Description
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Internal note shown in management screen" rows="3" />
              </label>
            </div>

            {/* Nut Cancel dong modal, nut submit se mo ConfirmModal truoc khi goi API. */}
            <div className="promo-modal__footer">
              <button type="button" className="promo-btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="promo-btn-primary" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {modalMode === 'edit' ? 'Save Changes' : 'Create Promotion'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal xac nhan dung cho create, update va delete promotion. */}
      <ConfirmModal
        open={Boolean(confirmAction)}
        title={confirmContent.title}
        message={confirmContent.message}
        confirmText={confirmContent.confirmText}
        confirmVariant={confirmContent.confirmVariant}
        loading={saving}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          if (!saving) setConfirmAction(null);
        }}
      />
    </div>
  );
}

function defaultForm() {
  // Khi bam Add Promotion, FE tu dien san thoi gian hieu luc mac dinh la 1 thang.
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return {
    ...emptyForm,
    startDate: toDateTimeInput(now),
    endDate: toDateTimeInput(nextMonth),
  };
}

function buildPayload(form) {
  // Chuan hoa du lieu form truoc khi gui backend.
  // Code duoc trim va viet hoa de tranh trung kieu SUMMER26/summer26.
  // Input number tren HTML van la string nen can doi sang Number.
  // Cac truong optional neu de trong thi gui null.
  // datetime-local khong co giay nen them :00 de khop LocalDateTime ben backend.
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    type: form.type,
    value: Number(form.value),
    minOrderAmount: form.minOrderAmount === '' ? 0 : Number(form.minOrderAmount),
    maxDiscountAmount: form.maxDiscountAmount === '' ? null : Number(form.maxDiscountAmount),
    startDate: `${form.startDate}:00`,
    endDate: `${form.endDate}:00`,
    usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
    status: form.status,
  };
}

function formatDiscount(promotion) {
  // Hien thi gia tri giam theo dung loai: PERCENT la %, FIXED la tien VND.
  if (promotion.type === 'PERCENT') {
    return `${numberText(promotion.value)}%`;
  }
  return formatMoney(promotion.value);
}

function formatMoney(value) {
  // Format tien theo VND de hien thi tren bang promotion.
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(numeric);
}

function formatLimit(value) {
  // Neu khong nhap maxDiscountAmount thi hieu la khong gioi han so tien giam toi da.
  return value === null || value === undefined ? 'No limit' : formatMoney(value);
}

function formatDateTime(value) {
  // Chuyen date time tu backend sang dang hien thi dd/mm/yyyy hh:mm.
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function toDateTimeInput(value) {
  // Chuyen date time sang format yyyy-MM-ddTHH:mm cho input datetime-local.
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function valueToInput(value) {
  // Input HTML dung string nen null/undefined duoc doi thanh chuoi rong.
  return value === null || value === undefined ? '' : String(value);
}

function numberText(value) {
  // Format so ngan gon, dung cho gia tri phan tram.
  return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

function readError(error, fallback) {
  // Uu tien message tra ve tu backend, neu khong co thi dung fallback cua FE.
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}

export default PromotionsScreen;
