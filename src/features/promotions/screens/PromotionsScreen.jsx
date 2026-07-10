import React, { useEffect, useMemo, useState } from 'react';
import { Edit, Loader2, Plus, Power, Save, Search, Trash2, X } from 'lucide-react';
import { promotionApi } from '../api/promotionApi';
import './PromotionsScreen.css';

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
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalMode, setModalMode] = useState(null);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await promotionApi.getAll();
      setPromotions(response.data || response || []);
    } catch (err) {
      console.error('Error fetching promotions:', err);
      setError(readError(err, 'Failed to load promotions.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const filteredPromotions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return promotions.filter((promo) => {
      const matchesSearch =
        !keyword ||
        promo.code?.toLowerCase().includes(keyword) ||
        promo.name?.toLowerCase().includes(keyword) ||
        promo.description?.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? promo.isActive : !promo.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [promotions, search, statusFilter]);

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
    setSaving(true);
    setError('');

    try {
      const payload = buildPayload(form);
      const response =
        modalMode === 'edit'
          ? await promotionApi.update(editingPromotion.id, payload)
          : await promotionApi.create(payload);

      const saved = response.data || response;
      setPromotions((prev) => {
        if (modalMode === 'edit') {
          return prev.map((promo) => (promo.id === saved.id ? saved : promo));
        }
        return [saved, ...prev];
      });
      closeModal();
    } catch (err) {
      console.error('Error saving promotion:', err);
      setError(readError(err, 'Failed to save promotion.'));
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
    const confirmed = window.confirm(`Delete promotion ${promotion.code}? Used promotions should be deactivated instead.`);
    if (!confirmed) return;

    try {
      await promotionApi.delete(promotion.id);
      setPromotions((prev) => prev.filter((item) => item.id !== promotion.id));
    } catch (err) {
      console.error('Error deleting promotion:', err);
      alert(readError(err, 'Failed to delete promotion.'));
    }
  };

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
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select className="promo-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
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
              {filteredPromotions.length > 0 ? (
                filteredPromotions.map((promotion) => (
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
  return error?.response?.data?.message || error?.response?.data?.error || fallback;
}

export default PromotionsScreen;
