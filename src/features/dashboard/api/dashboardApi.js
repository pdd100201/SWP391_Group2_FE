import axiosClient from '../../../shared/services/axiosClient'

/**
 * Service API gọi các cổng dữ liệu phục vụ trang Dashboard.
 */
export const dashboardApi = {
  
  /**
   * Lấy số liệu thống kê doanh thu dòng tiền.
   *
   * @param {Object} params Tham số lọc
   * @param {string} params.startDate Ngày bắt đầu (định dạng YYYY-MM-DD)
   * @param {string} params.endDate Ngày kết thúc (định dạng YYYY-MM-DD)
   * @param {string} params.groupBy Chế độ nhóm (day / month / year)
   */
  getRevenueStats: ({ startDate, endDate, groupBy }) => {
    return axiosClient.get('/dashboard/revenue', {
      params: { startDate, endDate, groupBy }
    })
  }
}
