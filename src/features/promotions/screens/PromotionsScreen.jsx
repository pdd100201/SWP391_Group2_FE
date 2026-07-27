import { useEffect, useState } from 'react';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Edit, Loader2, Plus, Power, Save, Search, Trash2, X } from 'lucide-react';
import { useToast } from '../../../shared/components/ui/Toast/ToastContext';
import ConfirmModal from '../../../shared/components/ui/ConfirmModal/ConfirmModal';
import { promotionApi } from '../api/promotionApi';
import './PromotionsScreen.css';

const PAGE_SIZE = 10;

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
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  const [modalMode, setModalMode] = useState(null);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

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
    const timer = window.setTimeout(fetchPromotions, 0);
    return () => window.clearTimeout(timer);
  }, [page, search, statusFilter]);

  useEffect(() => {
    if (pageInfo.totalPages > 0 && page >= pageInfo.totalPages) {
      setPage(pageInfo.totalPages - 1);
    }
  }, [page, pageInfo.totalPages]);

  const totalPages = pageInfo.totalPages;
  const totalElements = pageInfo.totalElements;
  const startIdx = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, totalElements);
  const isFirstPage = page === 0;
  const isLastPage = totalPages === 0 || page >= totalPages - 1;

  const getPageNumbers = (maxVisible = 5) => {
    const pages = [];
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible);
    if (end - start < maxVisible) start = Math.max(0, end - maxVisible);
    for (let i = start; i < end; i += 1) pages.push(i);
    return pages;
  };

  const openCreateModal = () => {
    setEditingPromotion(null);
    setForm(defaultForm());
    setError('');
    setModalMode('create');
  };

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
    if (saving) return;
    setModalMode(null);
    setEditingPromotion(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
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
    setConfirmAction({ type: 'delete', promotion });
  };

  const getConfirmContent = () => {
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
      <header className="promo-header">
        <div className="promo-header__info">
          <h1>Promotions Management</h1>
          <p>Create bill-level discount codes and control when they can be used.</p>
        </div>
        <button className="promo-btn-add" onClick={openCreateModal}>
          <Plus size={18} /> Add Promotion
        </button>
      </header>

      {error && !modalMode ? <div className="promo-alert">{error}</div> : null}

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
        <div className="promo-loading">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading promotions...</span>
        </div>
      ) : (
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

            {error ? <div className="promo-alert">{error}</div> : null}

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
  if (promotion.type === 'PERCENT') {
    return `${numberText(promotion.value)}%`;
  }
  return formatMoney(promotion.value);
}

function formatMoney(value) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(numeric);
}

function formatLimit(value) {
  return value === null || value === undefined ? 'No limit' : formatMoney(value);
}

function formatDateTime(value) {
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
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function valueToInput(value) {
  return value === null || value === undefined ? '' : String(value);
}

function numberText(value) {
  return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

function readError(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}

export default PromotionsScreen;
