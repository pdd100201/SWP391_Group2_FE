import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Power, Settings2, Loader2 } from 'lucide-react';
import { promotionApi } from '../api/promotionApi'; // Ông nhớ check lại đường dẫn import này nhé
import './PromotionsScreen.css';

function PromotionsScreen() {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // 1. Hàm fetch toàn bộ danh sách Promotions từ Backend
    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const response = await promotionApi.getAll();
            // Axios trả về dữ liệu nằm trong response.data, ông check cấu trúc BE trả về nhé
            setPromotions(response.data || response);
        } catch (error) {
            console.error("Error fetching promotions:", error);
            alert("Failed to load promotions. Please try again!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    // 4. Hàm Bật/Tắt trạng thái kích hoạt (Active/Deactive)
    const handleToggleStatus = async (id, currentStatus) => {
        try {
            const nextStatus = !currentStatus;
            await promotionApi.toggleStatus(id, nextStatus);

            // Cập nhật nhanh state ở FE để user thấy thay đổi luôn không cần reload toàn bộ trang
            setPromotions(prev =>
                prev.map(promo => promo.id === id ? { ...promo, isActive: nextStatus } : promo)
            );
        } catch (error) {
            console.error("Error toggling promotion status:", error);
            alert("Could not update status. Please try again.");
        }
    };

    // 5. Hàm Xóa Promotion
    const handleDelete = async (id, code) => {
        if (window.confirm(`Are you sure you want to delete promotion code: ${code}?`)) {
            try {
                await promotionApi.delete(id);
                alert("Deleted promotion successfully!");
                // Lọc bỏ thằng vừa xóa khỏi danh sách hiển thị
                setPromotions(prev => prev.filter(promo => promo.id !== id));
            } catch (error) {
                console.error("Error deleting promotion:", error);
                alert("Failed to delete promotion.");
            }
        }
    };

    // Xử lý bộ lọc Search & Filter trên Front-end từ dữ liệu đã lấy về
    const filteredPromos = promotions.filter(p => {
        const promoName = p.name ? p.name.toLowerCase() : '';
        const promoCode = p.code ? p.code.toLowerCase() : '';
        const matchSearch = promoName.includes(search.toLowerCase()) ||
            promoCode.includes(search.toLowerCase());

        const matchStatus = statusFilter === 'ALL' ? true :
            statusFilter === 'ACTIVE' ? p.isActive : !p.isActive;
        return matchSearch && matchStatus;
    });

    const formatValue = (type, value) => {
        return type === 'PERCENTAGE' ? `${value}%` : `$${value}`;
    };

    return (
        <div className="promotions-screen">
            {/* HEADER */}
            <header className="promo-header">
                <div className="promo-header__info">
                    <h1>Promotions Management</h1>
                    <p>Create and manage discount codes, special offers, and their application conditions.</p>
                </div>
                {/* Nút bấm mở modal thêm mới (Sẽ xử lý logic modal ở bước sau) */}
                <button className="promo-btn-add" onClick={() => alert("Chức năng Create đang đợi ông viết tiếp!")}>
                    <Plus size={18} /> Add New Promotion
                </button>
            </header>

            {/* TOOLBAR */}
            <div className="promo-toolbar">
                <div className="promo-search">
                    <Search size={18} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Search by Promo Code or Name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="promo-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                </select>
            </div>

            {/* DATA TABLE / LOADING */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', gap: '10px', color: '#0e5c47' }}>
                    <Loader2 className="animate-spin" size={24} />
                    <span>Loading promotions from server...</span>
                </div>
            ) : (
                <div className="promo-table-container">
                    <table className="promo-table">
                        <thead>
                        <tr>
                            <th>Promo Code</th>
                            <th>Campaign Name</th>
                            <th>Discount Value</th>
                            <th>Valid Period</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredPromos.length > 0 ? (
                            filteredPromos.map(promo => (
                                <tr key={promo.id}>
                                    <td>
                                        <span className="promo-code">{promo.code}</span>
                                    </td>
                                    <td>
                                        <strong>{promo.name}</strong>
                                        <div className="promo-type">
                                            {promo.type === 'PERCENTAGE' ? 'Percentage Discount' : 'Fixed Amount Discount'}
                                        </div>
                                    </td>
                                    <td>
                                        <strong style={{ color: '#0e5c47', fontSize: '1.1rem' }}>
                                            {formatValue(promo.type, promo.value)}
                                        </strong>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>{promo.startDate}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>to {promo.endDate}</div>
                                    </td>
                                    <td>
                      <span className={`promo-status promo-status--${promo.isActive ? 'active' : 'inactive'}`}>
                        {promo.isActive ? 'Active' : 'Inactive'}
                      </span>
                                    </td>
                                    <td>
                                        <div className="promo-actions" style={{ justifyContent: 'center' }}>
                                            {/* Nút quản lý điều kiện */}
                                            <button className="promo-btn-action" title="Manage Conditions">
                                                <Settings2 size={18} />
                                            </button>

                                            {/* Nút Bật/Tắt trạng thái */}
                                            <button
                                                className="promo-btn-action promo-btn-action--power"
                                                style={{ color: promo.isActive ? '#10b981' : '#64748b' }}
                                                title={promo.isActive ? "Deactivate" : "Activate"}
                                                onClick={() => handleToggleStatus(promo.id, promo.isActive)}
                                            >
                                                <Power size={18} />
                                            </button>

                                            {/* Nút Sửa */}
                                            <button className="promo-btn-action" title="Edit Promotion">
                                                <Edit size={18} />
                                            </button>

                                            {/* Nút Xóa */}
                                            <button
                                                className="promo-btn-action promo-btn-action--delete"
                                                title="Delete"
                                                onClick={() => handleDelete(promo.id, promo.code)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                    No promotions found matching your criteria.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default PromotionsScreen;