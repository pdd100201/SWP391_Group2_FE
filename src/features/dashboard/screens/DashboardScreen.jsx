import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart2, RefreshCw, DollarSign, CreditCard, Layers, Calendar, UtensilsCrossed, Users, Search, X } from 'lucide-react'
import { dashboardApi } from '../api/dashboardApi'
import './DashboardScreen.css'

/**
 * ====================================================================================
 * BẢN HƯỚNG DẪN CHI TIẾT DÀNH CHO LẬP TRÌNH VIÊN REACT (DASHBOARD REPORT SCREEN)
 * ====================================================================================
 * CÁCH REACT HOẠT ĐỘNG THEO TỪNG BƯỚC (STEP-BY-STEP FLOW):
 * 
 * 1. KHỞI TẠO STATE (Trạng thái giao diện):
 *    - useState(null/true): Khai báo nơi lưu trữ dữ liệu động (stats, loading, error, startDate, endDate, groupBy).
 *    - Mỗi khi State thay đổi, React sẽ tự động vẽ lại (Re-render) thành phần giao diện liên quan.
 * 
 * 2. GỌI API BẮT ĐẦU TẢI DỮ LIỆU (useEffect & useCallback):
 *    - useEffect(() => { fetchStats() }, [fetchStats]): Ngay khi màn hình vừa mở (Mount), 
 *      React kích hoạt hàm fetchStats() để gọi sang Spring Boot Backend qua Axios.
 * 
 * 3. QUY TRÌNH GỬI REQUEST & NHẬN DỮ LIỆU (Axios Request -> Spring Boot -> Response):
 *    - dashboardApi.getRevenueStats({ startDate, endDate, groupBy }): Gửi request HTTP GET sang Backend.
 *    - Khi Backend trả về JSON thành công -> React gọi setStats(response.data) -> Tắt Loading.
 * 
 * 4. VẼ GIAO DIỆN (UI Rendering):
 *    - renderKpiCards(): Vẽ 3 thẻ chỉ số (Tổng doanh thu, Số giao dịch, Giá trị trung bình AOV).
 *    - renderSvgChart(): Vẽ biểu đồ đường cong doanh thu bằng thẻ SVG với hiệu ứng Gradient.
 *    - renderSummaryTable(): Vẽ bảng dữ liệu 3 cột chi tiết (Thời gian, Doanh thu, Giao dịch).
 * ====================================================================================
 */

const EMPTY_CHART_DATA = []

// Helper chuyển đổi số tiền sang dạng hiển thị VND
const formatVND = (value) => {
  return `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VND`
}

// Helper lấy chuỗi ngày hôm nay (YYYY-MM-DD)
const getTodayString = () => {
  const now = new Date()
  const offset = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return offset.toISOString().slice(0, 10)
}

// Helper lấy ngày quá khứ cách đây N ngày
const getPastDateString = (daysAgo) => {
  const now = new Date()
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  const offset = new Date(past.getTime() - past.getTimezoneOffset() * 60000)
  return offset.toISOString().slice(0, 10)
}

// Helper định dạng ngày giờ thanh toán
const paidTime = (tx) => {
  if (!tx.paidAt) return '-'
  const value = new Date(tx.paidAt)
  if (Number.isNaN(value.getTime())) return String(tx.paidAt).replace('T', ' ')
  return value.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DashboardScreen({ isDashboardOnly = false }) {
  const navigate = useNavigate()
  // ── Các State quản lý dữ liệu (Giữ nguyên cấu trúc logic gốc) ──
  const [stats, setStats] = useState(null)
  const [overview, setOverview] = useState(null) // Thống kê tổng hợp hoạt động
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── Các State quản lý bộ lọc thời gian ──
  const [startDate, setStartDate] = useState(getPastDateString(30)) // Lọc từ 30 ngày trước
  const [endDate, setEndDate] = useState(getTodayString()) // Lọc đến ngày hôm nay
  const [groupBy, setGroupBy] = useState('DAY') // Gom nhóm theo: DAY, MONTH, YEAR

  // State hiển thị Tooltip nổi
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, label: '', value: 0, txCount: 0 })

  // Các State quản lý modal chi tiết giao dịch
  const [showTxModal, setShowTxModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [expandedTxId, setExpandedTxId] = useState(null)
  const [modalSearch, setModalSearch] = useState('')
  const [showSummaryTable, setShowSummaryTable] = useState(false)

  // Helper tính khoảng cách số ngày giữa 2 chuỗi YYYY-MM-DD
  const getDaysDiff = (startStr, endStr) => {
    if (!startStr || !endStr) return 0
    const start = new Date(startStr)
    const end = new Date(endStr)
    const diffTime = end - start
    if (Number.isNaN(diffTime)) return 0
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Xác định các chế độ hiển thị được phép dựa trên số ngày lọc
  const allowedModes = useMemo(() => {
    const days = getDaysDiff(startDate, endDate)
    if (days === 0) {
      return ['HOUR']
    }
    if (days > 0 && days <= 31) {
      return ['DAY']
    }
    if (days > 31 && days <= 366) {
      return ['DAY', 'MONTH']
    }
    return ['MONTH', 'YEAR']
  }, [startDate, endDate])

  // Đồng bộ hóa chế độ hiển thị groupBy khi khoảng ngày thay đổi
  useEffect(() => {
    if (allowedModes.length > 0 && !allowedModes.includes(groupBy)) {
      setGroupBy(allowedModes[0])
    }
  }, [allowedModes, groupBy])

  // ── Hàm gọi API tải dữ liệu ──
  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Đảm bảo groupBy hợp lệ với khoảng ngày hiện tại trước khi gọi API
      const days = getDaysDiff(startDate, endDate)
      let validModes = ['DAY']
      if (days === 0) {
        validModes = ['HOUR']
      } else if (days > 0 && days <= 31) {
        validModes = ['DAY']
      } else if (days > 31 && days <= 366) {
        validModes = ['DAY', 'MONTH']
      } else {
        validModes = ['MONTH', 'YEAR']
      }

      let effectiveGroupBy = groupBy
      if (!validModes.includes(effectiveGroupBy)) {
        effectiveGroupBy = validModes[0]
      }

      // 1. Lấy dữ liệu thống kê doanh thu vẽ biểu đồ
      const response = await dashboardApi.getRevenueStats({
        startDate,
        endDate,
        groupBy: effectiveGroupBy.toLowerCase(),
      })
      setStats(response.data)

      // 2. Nếu ở trang chủ Dashboard, lấy thêm số liệu hoạt động tổng quan
      if (isDashboardOnly) {
        const overviewRes = await dashboardApi.getDashboardOverview()
        setOverview(overviewRes.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve statistical data.')
      setStats(null) // Xóa dữ liệu cũ khi gặp lỗi bộ lọc
      setOverview(null)
    } finally {
      setLoading(false)
    }
  }, [endDate, groupBy, isDashboardOnly, startDate])

  // Tự động tải lại dữ liệu khi các bộ lọc thay đổi
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchStats()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchStats])

  // ── Hàm xử lý nút lọc nhanh (7 ngày, 30 ngày, tháng này) ──
  const handleQuickFilter = (days) => {
    const today = getTodayString()
    setEndDate(today)
    setGroupBy('DAY')
    if (days === 'THIS_MONTH') {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const offset = new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000)
      setStartDate(offset.toISOString().slice(0, 10))
    } else {
      setStartDate(getPastDateString(days))
    }
  }

  // ── Hàm xử lý sự kiện di chuột hiển thị tooltip ──
  const handleMouseEnter = (event, item, x, y) => {
    setTooltip({
      show: true,
      x: x,
      y: y,
      label: item.timeLabel,
      value: item.revenue || 0,
      txCount: item.transactionCount || 0,
    })
  }

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, show: false }))
  }

  // ── Hàm xuất báo cáo sang file Excel có kiểu dáng (Styled Excel) ──
  // Giải thích: Trích xuất dữ liệu biểu đồ hiện tại và xuất thành file Excel được thiết lập sẵn style, màu sắc cột và định dạng số.
  // Đầu vào: Không có. Đầu ra: Tải xuống tệp Excel (.xls).
  const handleExportExcel = () => {
    if (!chartData || chartData.length === 0) return

    // Tạo các dòng dữ liệu dạng HTML tr
    const rowsHtml = chartData.map((item) => `
      <tr>
        <td style="border: 1px solid #DDE5E3; text-align: left; font-family: Segoe UI, sans-serif; font-size: 10pt; height: 25px; padding: 4px 8px;">${item.timeLabel}</td>
        <td style="border: 1px solid #DDE5E3; text-align: right; font-family: Segoe UI, sans-serif; font-size: 10pt; height: 25px; padding: 4px 8px; mso-number-format: '\\#,\\#\\#0';">${Math.round(item.revenue || 0)}</td>
        <td style="border: 1px solid #DDE5E3; text-align: right; font-family: Segoe UI, sans-serif; font-size: 10pt; height: 25px; padding: 4px 8px; mso-number-format: '\\#,\\#\\#0';">${item.transactionCount}</td>
      </tr>
    `).join('')

    // Tính toán tổng số lượng và tổng doanh thu kỳ lọc
    const totalRev = chartData.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0)
    const totalTx = chartData.reduce((acc, curr) => acc + (Number(curr.transactionCount) || 0), 0)

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Revenue Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body style="font-family: Segoe UI, sans-serif; margin: 20px;">
        <table cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
          <!-- Header Báo cáo thương hiệu -->
          <tr>
            <td colspan="3" style="font-size: 16pt; font-weight: bold; color: #0F5C49; font-family: Segoe UI, sans-serif; height: 40px; text-align: left; vertical-align: middle;">GOLDEN SPOON RESTAURANT</td>
          </tr>
          <tr>
            <td colspan="3" style="font-size: 13pt; font-weight: 600; color: #1F2937; font-family: Segoe UI, sans-serif; height: 30px; text-align: left; vertical-align: middle;">CASH FLOW REVENUE REPORT</td>
          </tr>
          <tr>
            <td colspan="3" style="font-size: 9.5pt; color: #64748B; font-family: Segoe UI, sans-serif; height: 24px; text-align: left; vertical-align: middle; padding-bottom: 15px;">
              Filter Period: ${startDate} to ${endDate} | Grouped by: ${groupBy.toLowerCase()}
            </td>
          </tr>
          <tr>
            <td colspan="3" style="height: 10px;"></td>
          </tr>
          
          <!-- Tiêu đề cột được tô màu xanh lá đậm thương hiệu và set độ rộng rộng rãi -->
          <tr style="background-color: #0F5C49; color: #FFFFFF; font-weight: bold;">
            <th style="border: 1px solid #DDE5E3; background-color: #0F5C49; color: #FFFFFF; font-family: Segoe UI, sans-serif; font-size: 11pt; font-weight: bold; text-align: left; width: 160px; height: 35px; padding: 4px 8px;">Time Period</th>
            <th style="border: 1px solid #DDE5E3; background-color: #0F5C49; color: #FFFFFF; font-family: Segoe UI, sans-serif; font-size: 11pt; font-weight: bold; text-align: right; width: 200px; height: 35px; padding: 4px 8px;">Revenue (VND)</th>
            <th style="border: 1px solid #DDE5E3; background-color: #0F5C49; color: #FFFFFF; font-family: Segoe UI, sans-serif; font-size: 11pt; font-weight: bold; text-align: right; width: 140px; height: 35px; padding: 4px 8px;">Transactions</th>
          </tr>
          
          <!-- Các dòng dữ liệu -->
          ${rowsHtml}
          
          <!-- Dòng Tổng cộng in đậm -->
          <tr style="background-color: #F8FAFC; font-weight: bold;">
            <td style="border: 1px solid #DDE5E3; font-family: Segoe UI, sans-serif; font-size: 10.5pt; font-weight: bold; height: 30px; padding: 4px 8px; text-align: left; background-color: #F1F5F9;">Total</td>
            <td style="border: 1px solid #DDE5E3; font-family: Segoe UI, sans-serif; font-size: 10.5pt; font-weight: bold; height: 30px; padding: 4px 8px; text-align: right; background-color: #F1F5F9; mso-number-format: '\\#,\\#\\#0';">${totalRev}</td>
            <td style="border: 1px solid #DDE5E3; font-family: Segoe UI, sans-serif; font-size: 10.5pt; font-weight: bold; height: 30px; padding: 4px 8px; text-align: right; background-color: #F1F5F9; mso-number-format: '\\#,\\#\\#0';">${totalTx}</td>
          </tr>
        </table>
      </body>
      </html>
    `

    // Tải tệp tin Excel (.xls) có định dạng html
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `revenue_report_${startDate}_to_${endDate}_by_${groupBy.toLowerCase()}.xls`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ── Tính toán số liệu vẽ SVG ──
  const chartData = stats?.chartData || EMPTY_CHART_DATA

  // Kiểm tra bộ lọc nhanh nào đang khớp với khoảng ngày hiện tại
  const activeQuickFilter = useMemo(() => {
    const today = getTodayString()
    if (endDate !== today) return null

    if (startDate === getPastDateString(7)) return 7
    if (startDate === getPastDateString(30)) return 30

    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const offset = new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000)
    const firstDayStr = offset.toISOString().slice(0, 10)
    if (startDate === firstDayStr) return 'THIS_MONTH'

    return null
  }, [startDate, endDate])

  // Tìm doanh thu lớn nhất làm mốc đỉnh cột
  const maxRevenue = useMemo(() => {
    const maxVal = Math.max(...chartData.map((d) => d.revenue || 0))
    return maxVal === 0 ? 1 : maxVal
  }, [chartData])

  // Kiểm tra doanh thu kỳ lọc có toàn bộ bằng 0 không
  const isAllZero = useMemo(() => {
    return chartData.length === 0 || chartData.every((item) => (Number(item.revenue) || 0) === 0)
  }, [chartData])

  // ── HÀM CON 1: Render Toolbar lọc dữ liệu ──
  // Giải thích: Hàm này dùng để vẽ các ô chọn ngày, nút lọc nhanh và chọn gom nhóm.
  // Đầu vào: Không có. Đầu ra: JSX toolbar điều khiển bộ lọc.
  const renderFilters = () => (
    <div className="dashboard-toolbar">
      {/* Bên trái: Từ ngày & Đến ngày */}
      <div className="dashboard-toolbar__left">
        <div className="dashboard-toolbar__group">
          <label>From date</label>
          <input type="date" className="dashboard-toolbar__input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="dashboard-toolbar__group">
          <label>To date</label>
          <input type="date" className="dashboard-toolbar__input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Chính giữa: Lọc nhanh */}
      <div className="dashboard-toolbar__center">
        <div className="dashboard-toolbar__group">
          <label>Quick Filter</label>
          <div className="dashboard-quick-filters">
            <button
              type="button"
              className={`dashboard-quick-btn ${activeQuickFilter === 7 ? 'dashboard-quick-btn--active' : ''}`}
              onClick={() => handleQuickFilter(7)}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`dashboard-quick-btn ${activeQuickFilter === 30 ? 'dashboard-quick-btn--active' : ''}`}
              onClick={() => handleQuickFilter(30)}
            >
              30 Days
            </button>
            <button
              type="button"
              className={`dashboard-quick-btn ${activeQuickFilter === 'THIS_MONTH' ? 'dashboard-quick-btn--active' : ''}`}
              onClick={() => handleQuickFilter('THIS_MONTH')}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Bên phải: Xem theo */}
      <div className="dashboard-toolbar__right">
        <div className="dashboard-toolbar__group">
          <label>View by</label>
          <div className="dashboard-toggle-group">
            {['HOUR', 'DAY', 'MONTH', 'YEAR'].map((mode) => {
              const isAllowed = allowedModes.includes(mode)
              const label = mode === 'HOUR' ? 'Hour' : mode === 'DAY' ? 'Day' : mode === 'MONTH' ? 'Month' : 'Year'
              
              // Ẩn nút xem theo Giờ nếu khoảng ngày lọc dài hơn 1 ngày
              if (mode === 'HOUR' && !isAllowed) return null
              
              return (
                <button
                  key={mode}
                  type="button"
                  className={`dashboard-toggle-btn ${groupBy === mode ? 'dashboard-toggle-btn--active' : ''} ${!isAllowed ? 'dashboard-toggle-btn--disabled' : ''}`}
                  onClick={() => isAllowed && setGroupBy(mode)}
                  disabled={!isAllowed}
                  title={!isAllowed ? 'Not available for this date range' : ''}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  // ── HÀM CON 2: Render các thẻ KPI ──
  // Giải thích: Vẽ các thẻ chỉ số KPI hoạt động. Nếu là trang chủ Dashboard, vẽ 6 thẻ tổng hợp kèm Icon. Nếu là Báo cáo, vẽ 2 thẻ doanh thu kèm Icon.
  // Đầu vào: Không có. Đầu ra: JSX lưới các thẻ KPI.
  const renderKpiCards = () => {
    if (isDashboardOnly && overview) {
      return (
        <div className="dashboard-kpis dashboard-kpis--6cols">
          <article className="dashboard-card" onClick={() => navigate('/dashboard/reports')}>
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Total Revenue (30 Days)</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                <DollarSign size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{formatVND(overview.totalRevenue)}</div>
          </article>
          <article className="dashboard-card" onClick={() => navigate('/dashboard/reports')}>
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Successful Transactions</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(15, 92, 73, 0.1)', color: '#0F5C49' }}>
                <CreditCard size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{overview.successfulTransactions} txs</div>
          </article>
          <article className="dashboard-card" onClick={() => navigate('/dashboard/tables')}>
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Total Tables</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#64748B' }}>
                <Layers size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{overview.totalTables} tables</div>
          </article>
          <article className="dashboard-card" onClick={() => navigate('/dashboard/reservations')}>
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Reservations</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}>
                <Calendar size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{overview.totalReservations} booking</div>
          </article>
          <article className="dashboard-card" onClick={() => navigate('/dashboard/menu-management')}>
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Menu Items</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#D97706' }}>
                <UtensilsCrossed size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{overview.totalMenuItems} dishes</div>
          </article>
          <article className="dashboard-card" onClick={() => navigate('/dashboard/accounts/staff')}>
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Active Staff</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED' }}>
                <Users size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{overview.totalStaff} staff</div>
          </article>
        </div>
      )
    }

    const handleCardClick = (title) => {
      if (isDashboardOnly) {
        navigate('/dashboard/reports')
      } else {
        setModalTitle(title)
        setShowTxModal(true)
        setExpandedTxId(null)
        setModalSearch('')
      }
    }

    return (
      <div className="dashboard-kpis dashboard-kpis--3cols">
        <article className="dashboard-card dashboard-card--interactive" onClick={() => handleCardClick('Revenue Transaction Details')}>
          <div className="dashboard-card__header">
            <div className="dashboard-card__title">Total Revenue (Period)</div>
            <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="dashboard-card__value">{formatVND(stats?.totalRevenuePeriod)}</div>
          <div className="dashboard-card__click-hint">Click to view details</div>
        </article>
        
        <article className="dashboard-card dashboard-card--interactive" onClick={() => handleCardClick('Successful Transactions')}>
          <div className="dashboard-card__header">
            <div className="dashboard-card__title">Successful Transactions</div>
            <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(15, 92, 73, 0.1)', color: '#0F5C49' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div className="dashboard-card__value">{stats?.transactionCountPeriod} transactions</div>
          <div className="dashboard-card__click-hint">Click to view details</div>
        </article>

        <article className="dashboard-card dashboard-card--interactive" onClick={() => handleCardClick('Average Order Value (AOV)')}>
          <div className="dashboard-card__header">
            <div className="dashboard-card__title">Average Order Value (AOV)</div>
            <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="dashboard-card__value">{formatVND(stats?.averageOrderValue)}</div>
          <div className="dashboard-card__click-hint">Click to view details</div>
        </article>
      </div>
    )
  }

  // ── HÀM CON 3: Render Biểu đồ miền SVG (Area Chart) ──
  // Giải thích: Vẽ biểu đồ miền xu hướng doanh thu dòng tiền dạng đường cong nối điểm kèm dải chuyển sắc gradient fill.
  // Đầu vào: Không có. Đầu ra: JSX chứa biểu đồ miền SVG hoặc thông báo rỗng.
  const renderSvgChart = () => {
    if (isAllZero) {
      return (
        <div className="dashboard-empty">
          <BarChart2 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div>No revenue recorded during this period.</div>
        </div>
      )
    }

    const chartWidth = 900
    const chartHeight = 320
    const paddingLeft = 65
    const paddingRight = 30
    const paddingTop = 30
    const paddingBottom = 45

    // Tính toán tọa độ phân phối đều cho từng điểm dữ liệu xu hướng
    const points = chartData.map((item, idx) => {
      const x = paddingLeft + (idx / (chartData.length - 1 || 1)) * (chartWidth - paddingLeft - paddingRight)
      const ratio = maxRevenue > 0 ? (item.revenue || 0) / maxRevenue : 0
      const y = chartHeight - paddingBottom - ratio * (chartHeight - paddingTop - paddingBottom)
      return { x, y, item, idx }
    })

    // Xây dựng chuỗi path nối các điểm dữ liệu và chuỗi path khép kín để đổ màu gradient
    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
      : ''

    const gridlineValues = [0, 0.25, 0.5, 0.75, 1]

    return (
      <div className="svg-chart-container" style={{ position: 'relative', width: '100%' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width="100%"
          height={chartHeight}
          style={{ overflow: 'visible', display: 'block' }}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Tạo dải màu chuyển sắc từ xanh thương hiệu xuống trong suốt cho biểu đồ miền */}
            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F5C49" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0F5C49" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Đường lưới gióng ngang nét đứt */}
          {gridlineValues.map((ratio, idx) => {
            const y = chartHeight - paddingBottom - ratio * (chartHeight - paddingTop - paddingBottom)
            return (
              <line
                key={`grid-${idx}`}
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )
          })}

          {/* Đường gióng dọc khi di chuột qua điểm (Crosshair) */}
          {tooltip.show && (
            <line
              x1={tooltip.x}
              y1={paddingTop}
              x2={tooltip.x}
              y2={chartHeight - paddingBottom}
              stroke="#0F5C49"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          )}

          {/* Nhãn thang đo trục Y */}
          {gridlineValues.map((ratio, idx) => {
            const val = ratio * maxRevenue
            const y = chartHeight - paddingBottom - ratio * (chartHeight - paddingTop - paddingBottom)
            return (
              <text
                key={`y-label-${idx}`}
                x={paddingLeft - 12}
                y={y + 4}
                textAnchor="end"
                style={{ fontSize: 11, fill: 'var(--sb-text-muted)', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}
              >
                {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val.toLocaleString('vi-VN')}
              </text>
            )
          })}

          {/* Vẽ vùng tô màu Gradient mờ */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#area-gradient)"
            />
          )}

          {/* Vẽ đường xu hướng chính */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#0F5C49"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Nhãn mốc thời gian trục X */}
          {points.map((p, idx) => {
            const step = Math.ceil(chartData.length / 8) || 1
            if (idx % step !== 0 && idx !== chartData.length - 1) return null
            return (
              <text
                key={`x-label-${idx}`}
                x={p.x}
                y={chartHeight - paddingBottom + 22}
                textAnchor="middle"
                style={{ fontSize: 11, fill: 'var(--sb-text-muted)', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}
              >
                {groupBy === 'DAY' ? p.item.timeLabel.slice(5) : p.item.timeLabel}
              </text>
            )
          })}

          {/* Các điểm tròn giao điểm dữ liệu tương tác */}
          {points.map((p) => {
            const isHovered = tooltip.show && tooltip.label === p.item.timeLabel
            return (
              <g key={`point-${p.idx}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#0F5C49' : '#FFFFFF'}
                  stroke="#0F5C49"
                  strokeWidth={isHovered ? 3 : 2}
                  style={{ transition: 'all 0.12s ease' }}
                />
                {/* Vùng vô hình lớn để bắt sự kiện hover nhạy bén hơn */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={20}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleMouseEnter(e, p.item, p.x, p.y)}
                  onMouseMove={(e) => handleMouseEnter(e, p.item, p.x, p.y)}
                />
              </g>
            )
          })}
        </svg>

        {/* Khối tooltip nổi định vị động */}
        {tooltip.show && (
          <div
            className="chart-tooltip"
            style={{
              position: 'absolute',
              left: `${tooltip.x}px`,
              top: `${tooltip.y - 12}px`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 10,
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              padding: '8px 12px',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              fontSize: '0.8rem',
              lineHeight: 1.4,
              minWidth: 150,
              border: '1px solid #475569'
            }}
          >
            <div style={{ fontWeight: 600, color: '#94A3B8', marginBottom: 2 }}>{tooltip.label}</div>
            <div style={{ color: '#10B981', fontWeight: 700 }}>Revenue: {formatVND(tooltip.value)}</div>
            <div style={{ color: '#38BDF8', fontSize: '0.75rem' }}>Transactions: {tooltip.txCount} txs</div>
          </div>
        )}
      </div>
    )
  }

  // ── HÀM CON 4: Render Bảng dữ liệu 3 cột tóm tắt ──
  // Giải thích: Vẽ bảng tóm tắt 3 cột: Mốc thời gian, Doanh thu, Số giao dịch (Sắp xếp thời gian mới nhất lên trên).
  // Đầu vào: Không có. Đầu ra: JSX bảng dữ liệu.
  const renderSummaryTable = () => (
    <div className="dashboard-table-card">
      <div className="dashboard-table-card__header-toggle" onClick={() => setShowSummaryTable(!showSummaryTable)}>
        <h2>Detailed Data Summary</h2>
        <button type="button" className="details-toggle-btn">
          {showSummaryTable ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      {showSummaryTable && (
        <div className="dashboard-table-wrap" style={{ marginTop: 20 }}>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Time Period</th>
                <th>Revenue</th>
                <th>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {[...chartData].reverse().map((item) => (
                <tr key={item.timeLabel}>
                  <td><strong>{item.timeLabel}</strong></td>
                  <td style={{ fontWeight: 600 }}>{formatVND(item.revenue)}</td>
                  <td>{item.transactionCount} transactions</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  // ── HÀM CON: Render biểu đồ phương thức thanh toán Doughnut SVG ──
  const renderPaymentMethodsChart = () => {
    const methods = stats?.paymentMethods || []
    if (methods.length === 0) {
      return (
        <div className="dashboard-empty-compact">
          No payment methods data.
        </div>
      )
    }

    const totalAmount = methods.reduce((acc, m) => acc + (m.totalAmount || 0), 0)
    const totalCount = methods.reduce((acc, m) => acc + (m.count || 0), 0)

    if (totalAmount === 0) {
      return (
        <div className="dashboard-empty-compact">
          No payment methods recorded.
        </div>
      )
    }

    const circumference = 314.159
    let accumulatedPercent = 0

    const colors = {
      CASH: '#10B981', 
      SEPAY: '#38BDF8', 
      UNKNOWN: '#64748B' 
    }

    return (
      <div className="payment-methods-breakdown">
        <div className="doughnut-container">
          <svg width="150" height="150" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="10"
            />
            {methods.map((method) => {
              const pct = totalAmount > 0 ? (method.totalAmount || 0) / totalAmount : 0
              const strokeLength = pct * circumference
              const strokeOffset = circumference - strokeLength + (accumulatedPercent * circumference)
              accumulatedPercent -= pct 
              
              const color = colors[method.provider] || colors.UNKNOWN

              return (
                <circle
                  key={method.provider}
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke={color}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  transform="rotate(-90 60 60)"
                  style={{
                    transition: 'stroke-dashoffset 0.8s ease-in-out',
                    strokeLinecap: 'round'
                  }}
                />
              )
            })}
            <text x="60" y="58" textAnchor="middle" className="doughnut-text-val">
              {totalCount}
            </text>
            <text x="60" y="73" textAnchor="middle" className="doughnut-text-lbl">
              txs
            </text>
          </svg>
        </div>

        <div className="methods-legend">
          {methods.map((method) => {
            const pctAmount = totalAmount > 0 ? ((method.totalAmount || 0) / totalAmount) * 100 : 0
            const color = colors[method.provider] || colors.UNKNOWN
            return (
              <div key={method.provider} className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: color }} />
                <div className="legend-info">
                  <div className="legend-header-line">
                    <span className="legend-name">{method.provider}</span>
                    <span className="legend-pct">{pctAmount.toFixed(1)}%</span>
                  </div>
                  <span className="legend-amount">{formatVND(method.totalAmount)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── HÀM CON: Render biểu đồ cột ngang top món bán chạy ──
  const renderTopSellingItemsChart = () => {
    const items = stats?.topSellingItems || []
    if (items.length === 0) {
      return (
        <div className="dashboard-empty-compact">
          No menu items sold in this period.
        </div>
      )
    }

    const maxQty = Math.max(...items.map(item => item.quantity), 1)

    return (
      <div className="top-selling-items">
        {items.map((item, idx) => {
          const ratio = (item.quantity / maxQty) * 100
          return (
            <div key={item.name} className="top-selling-row">
              <div className="top-selling-info">
                <div className="top-item-rank-name">
                  <span className="top-item-rank">#{idx + 1}</span>
                  <span className="top-item-name">{item.name}</span>
                </div>
                <span className="top-item-qty">{item.quantity} sold</span>
              </div>
              <div className="top-selling-bar-container">
                <div 
                  className="top-selling-bar" 
                  style={{ 
                    width: `${ratio}%`,
                    backgroundColor: `hsla(166, 73%, ${25 + idx * 5}%, 0.85)` 
                  }}
                />
                <span className="top-item-revenue">{formatVND(item.revenue)}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── HÀM CON: Render Modal danh sách chi tiết giao dịch ──
  const renderTxModal = () => {
    if (!showTxModal) return null

    const transactions = stats?.transactions || []
    const isRevenueMode = modalTitle.includes('Revenue')
    const isAovMode = modalTitle.includes('Average')
    const isSuccessMode = modalTitle.includes('Successful')

    // Tính toán các chỉ số nhanh phục vụ Widget đầu Modal
    const totalCashAmount = transactions.filter(t => t.provider === 'CASH').reduce((sum, t) => sum + (t.amount || 0), 0)
    const totalSepayAmount = transactions.filter(t => t.provider === 'SEPAY').reduce((sum, t) => sum + (t.amount || 0), 0)
    const countCash = transactions.filter(t => t.provider === 'CASH').length
    const countSepay = transactions.filter(t => t.provider === 'SEPAY').length
    const aov = stats?.averageOrderValue || 0
    const aboveAvgCount = transactions.filter(t => (t.amount || 0) >= aov).length
    const belowAvgCount = transactions.filter(t => (t.amount || 0) < aov).length

    // Lọc theo từ khóa tìm kiếm
    const filteredTxs = transactions.filter((tx) => {
      const keyword = modalSearch.trim().toLowerCase()
      if (!keyword) return true
      return (
        String(tx.paymentCode || '').toLowerCase().includes(keyword) ||
        String(tx.orderCode || '').toLowerCase().includes(keyword) ||
        String(tx.guestName || '').toLowerCase().includes(keyword) ||
        String(tx.tableNames || '').toLowerCase().includes(keyword) ||
        String(tx.waiterName || '').toLowerCase().includes(keyword)
      )
    })

    // Sắp xếp dữ liệu đặc trưng cho từng loại chỉ số
    if (isRevenueMode) {
      // Báo cáo doanh thu: Sắp xếp theo giá tiền giảm dần (Giao dịch lớn nhất lên đầu)
      filteredTxs.sort((a, b) => (b.amount || 0) - (a.amount || 0))
    } else if (isSuccessMode) {
      // Số giao dịch: Sắp xếp theo thời gian thanh toán mới nhất
      filteredTxs.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    } else if (isAovMode) {
      // Giá trị trung bình: Sắp xếp theo độ lệch tuyệt đối so với AOV (hiển thị ngoại lai trước)
      filteredTxs.sort((a, b) => Math.abs(b.amount - aov) - Math.abs(a.amount - aov))
    }

    // Vẽ Widget thống kê nhanh tương ứng với từng chỉ số
    const renderModalWidget = () => {
      if (isRevenueMode) {
        return (
          <div className="modal-widget">
            <div className="widget-item">
              <span className="widget-label">Cash Revenue</span>
              <strong className="widget-value text-emerald">{formatVND(totalCashAmount)}</strong>
              <small className="widget-sub">({stats?.totalRevenuePeriod > 0 ? ((totalCashAmount / stats.totalRevenuePeriod) * 100).toFixed(1) : 0}%)</small>
            </div>
            <div className="widget-item">
              <span className="widget-label">SePay Revenue</span>
              <strong className="widget-value text-sky">{formatVND(totalSepayAmount)}</strong>
              <small className="widget-sub">({stats?.totalRevenuePeriod > 0 ? ((totalSepayAmount / stats.totalRevenuePeriod) * 100).toFixed(1) : 0}%)</small>
            </div>
          </div>
        )
      }
      if (isSuccessMode) {
        return (
          <div className="modal-widget">
            <div className="widget-item">
              <span className="widget-label">Cash Payments</span>
              <strong className="widget-value text-emerald">{countCash} transactions</strong>
              <small className="widget-sub">({transactions.length > 0 ? ((countCash / transactions.length) * 100).toFixed(1) : 0}%)</small>
            </div>
            <div className="widget-item">
              <span className="widget-label">SePay Payments</span>
              <strong className="widget-value text-sky">{countSepay} transactions</strong>
              <small className="widget-sub">({transactions.length > 0 ? ((countSepay / transactions.length) * 100).toFixed(1) : 0}%)</small>
            </div>
          </div>
        )
      }
      if (isAovMode) {
        return (
          <div className="modal-widget">
            <div className="widget-item">
              <span className="widget-label">Average Order Value (AOV)</span>
              <strong className="widget-value text-blue">{formatVND(aov)}</strong>
              <small className="widget-sub">Formula: Total Revenue / Count</small>
            </div>
            <div className="widget-item">
              <span className="widget-label">High Spend (&ge; AOV)</span>
              <strong className="widget-value text-emerald">{aboveAvgCount} bills</strong>
              <small className="widget-sub">Above average</small>
            </div>
            <div className="widget-item">
              <span className="widget-label">Low Spend (&lt; AOV)</span>
              <strong className="widget-value text-amber">{belowAvgCount} bills</strong>
              <small className="widget-sub">Below average</small>
            </div>
          </div>
        )
      }
      return null
    }

    const colSpanVal = isAovMode ? 7 : 6

    return (
      <div className="dashboard-modal-backdrop" onClick={() => setShowTxModal(false)}>
        <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
          <div className="dashboard-modal-header">
            <div>
              <h2>{modalTitle}</h2>
              <p>Period: {startDate} to {endDate}</p>
            </div>
            <button className="dashboard-modal-close" onClick={() => setShowTxModal(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="dashboard-modal-search">
            <div className="dashboard-modal-search__wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search code, guest, table, waiter..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
              />
            </div>
            <span className="search-count">{filteredTxs.length} records</span>
          </div>

          <div className="dashboard-modal-body">
            {/* Widget hiển thị thông số nhanh khác biệt cho mỗi nút bấm */}
            {renderModalWidget()}

            <div className="dashboard-modal-table-wrap">
              <table className="dashboard-modal-table">
                <thead>
                  <tr>
                    <th>Paid Time</th>
                    <th>Order Code</th>
                    <th>Guest / Tables</th>
                    <th>Method</th>
                    <th>Amount</th>
                    {isAovMode && <th>Spending level</th>}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxs.length === 0 ? (
                    <tr>
                      <td colSpan={colSpanVal} className="dashboard-modal-empty">
                        No transactions found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredTxs.map((tx) => {
                      const isExpanded = expandedTxId === tx.id
                      return (
                        <>
                          <tr 
                            key={tx.id} 
                            className={`dashboard-modal-row ${isExpanded ? 'dashboard-modal-row--expanded' : ''}`}
                            onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                          >
                            <td>{paidTime(tx)}</td>
                            <td>
                              <strong>{tx.orderCode}</strong>
                              <small>{tx.paymentCode}</small>
                            </td>
                            <td>
                              <strong>{tx.guestName || 'Walk-in Guest'}</strong>
                              <small>{tx.tableNames || 'No Table Assigned'}</small>
                            </td>
                            <td>
                              <span className={`method-badge method-badge--${String(tx.provider).toLowerCase()}`}>
                                {tx.provider}
                              </span>
                            </td>
                            <td className="amount-col">{formatVND(tx.amount)}</td>
                            {isAovMode && (
                              <td>
                                {(() => {
                                  const diffPct = aov > 0 ? ((tx.amount - aov) / aov) * 100 : 0
                                  const isAbove = (tx.amount || 0) >= aov
                                  return (
                                    <span className={`aov-diff-badge ${isAbove ? 'aov-diff-badge--above' : 'aov-diff-badge--below'}`}>
                                      {isAbove ? 'High Spend' : 'Low Spend'}
                                      <small>{isAbove ? '+' : ''}{diffPct.toFixed(0)}% vs avg</small>
                                    </span>
                                  )
                                })()}
                              </td>
                            )}
                            <td>
                              <button className="details-toggle-btn">
                                {isExpanded ? 'Hide items' : 'Show items'}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`items-${tx.id}`} className="row-details-expanded">
                              <td colSpan={colSpanVal}>
                                <div className="expanded-details-box">
                                  <div className="expanded-meta">
                                    <span>Waiter: <strong>{tx.waiterName || 'Unassigned'}</strong></span>
                                    <span>Payment Method: <strong>{tx.provider}</strong></span>
                                  </div>
                                  <div className="expanded-items">
                                    <h4>Ordered items:</h4>
                                    {tx.items && tx.items.length > 0 ? (
                                      tx.items.map((item) => {
                                        const isVoided = item.status === 'VOIDED'
                                        return (
                                        <div key={item.id} className={`expanded-item-row${isVoided ? ' expanded-item-row--voided' : ''}`}>
                                          <div className="expanded-item-name">
                                            <strong>{item.menuItemName}</strong>
                                            {item.note && <small className="note-text">Note: {item.note}</small>}
                                            {isVoided && (
                                              <small className="voided-text">VOIDED{item.voidReason ? `: ${item.voidReason}` : ''}</small>
                                            )}
                                          </div>
                                          <span className="expanded-item-qty">x{item.quantity}</span>
                                          <span className="expanded-item-price">{formatVND(item.unitPrice)}</span>
                                          <span className="expanded-item-total">{formatVND(item.subtotal)}</span>
                                        </div>
                                        )
                                      })
                                    ) : (
                                      <p className="no-items-text">No item information.</p>
                                    )}
                                  </div>
                                  <div className="expanded-bill-summary">
                                    <span>Subtotal <strong>{formatVND(tx.subtotal ?? tx.amount)}</strong></span>
                                    <span>Promotion <strong>{tx.promotionCode ? `${tx.promotionCode}${tx.promotionName ? ` - ${tx.promotionName}` : ''}` : 'No promotion applied'}</strong></span>
                                    <span>Discount <strong>-{formatVND(tx.discountAmount || 0)}</strong></span>
                                    <span>Total <strong>{formatVND(tx.total ?? tx.amount)}</strong></span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="dashboard-modal-footer">
            <div className="footer-summary">
              <span>Total Transactions: <strong>{filteredTxs.length}</strong></span>
              <span>Total Amount: <strong>{formatVND(filteredTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0))}</strong></span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Hàm render chính của Component ──
  return (
    <section className="dashboard-screen">
      <header className="dashboard-header">
        <div>
          <h1>{isDashboardOnly ? 'Restaurant Dashboard Overview' : 'Cash Flow Revenue Report'}</h1>
          <p>
            {isDashboardOnly
              ? 'Key performance statistics and revenue overview for the last 30 days.'
              : 'Statistics of cash inflow from fully completed transactions.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {!isDashboardOnly && (
            <button
              type="button"
              className="dashboard-quick-btn"
              style={{ gap: 6 }}
              onClick={handleExportExcel}
              disabled={isAllZero}
            >
              Export Excel
            </button>
          )}
          <button type="button" className="dashboard-quick-btn" style={{ gap: 6 }} onClick={fetchStats}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </header>

      {/* Lọc điều khiển */}
      {!isDashboardOnly && renderFilters()}

      {/* Hiển thị thông báo lỗi từ backend nếu khoảng ngày không hợp lệ */}
      {error && (
        <div className="dashboard-error">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">Loading revenue data...</div>
      ) : (
        <>
          {/* Chỉ render số liệu và biểu đồ khi có dữ liệu stats hợp lệ */}
          {stats && (
            <>
              {/* Các Thẻ KPI chỉ số */}
              {renderKpiCards()}

              {/* Biểu đồ cột SVG */}
              <div className="dashboard-chart-card">
                <h2>Revenue Trend Chart</h2>
                {renderSvgChart()}
              </div>

              {/* Biểu đồ phụ: Phân phối phương thức & Món bán chạy */}
              {!isDashboardOnly && (
                <div className="dashboard-charts-grid">
                  <div className="dashboard-chart-card dashboard-chart-card--half">
                    <h2>Payment Methods Distribution</h2>
                    {renderPaymentMethodsChart()}
                  </div>
                  <div className="dashboard-chart-card dashboard-chart-card--half">
                    <h2>Top Selling Menu Items</h2>
                    {renderTopSellingItemsChart()}
                  </div>
                </div>
              )}

              {/* Bảng chi tiết 3 cột */}
              {!isDashboardOnly && renderSummaryTable()}
            </>
          )}
        </>
      )}

      {/* Render modal giao dịch chi tiết */}
      {renderTxModal()}
    </section>
  )
}

export default DashboardScreen
