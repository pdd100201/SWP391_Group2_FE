// Thay đổi đường dẫn import này cho đúng với file cấu hình axios trong project của ông nhé
// Ví dụ: import axiosClient from '../../utils/axiosClient'
import axiosClient from '../../../shared/services/axiosClient';

export const promotionApi = {
    // 1. View Promotions: Lấy danh sách tất cả khuyến mãi
    getAll: (params) => {
        // Có thể truyền params để search/filter từ backend nếu cần
        return axiosClient.get('/promotions', { params });
    },

    // Lấy chi tiết 1 khuyến mãi cụ thể (dùng khi mở Modal Edit hoặc View detail)
    getById: (id) => {
        return axiosClient.get(`/promotions/${id}`);
    },

    // 2. Create Promotion: Tạo mới khuyến mãi
    create: (data) => {
        return axiosClient.post('/promotions', data);
    },

    // 3. Update Promotion: Cập nhật thông tin khuyến mãi (tên, value, thời gian...)
    update: (id, data) => {
        return axiosClient.put(`/promotions/${id}`, data);
    },

    // 4. Active/Deactive Promotion: Bật/Tắt trạng thái nhanh
    toggleStatus: (id, isActive) => {
        // Thường dùng PATCH cho việc update 1 trường nhỏ
        return axiosClient.patch(`/promotions/${id}/status`, { isActive });
    },

    // 5. Delete Promotion: Xóa khuyến mãi
    delete: (id) => {
        return axiosClient.delete(`/promotions/${id}`);
    },

    // 6. Manage Promotion Conditions: Quản lý điều kiện áp dụng
    // Lấy điều kiện hiện tại của mã
    getConditions: (id) => {
        return axiosClient.get(`/promotions/${id}/conditions`);
    },

    // Cập nhật điều kiện (Ví dụ: Đơn tối thiểu 500k, áp dụng cho món A, món B...)
    updateConditions: (id, conditionsData) => {
        return axiosClient.put(`/promotions/${id}/conditions`, conditionsData);
    }
};