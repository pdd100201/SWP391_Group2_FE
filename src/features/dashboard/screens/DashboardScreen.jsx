import { useEffect, useMemo, useState } from 'react'
import { BarChart2, RefreshCw, DollarSign, CreditCard, Layers, Calendar, UtensilsCrossed, Users } from 'lucide-react'
import { dashboardApi } from '../api/dashboardApi'
import './DashboardScreen.css'

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

function DashboardScreen({ isDashboardOnly = false }) {
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

  // ── Hàm gọi API tải dữ liệu ──
  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Lấy dữ liệu thống kê doanh thu vẽ biểu đồ
      const response = await dashboardApi.getRevenueStats({
        startDate,
        endDate,
        groupBy: groupBy.toLowerCase(),
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
  }

  // Tự động tải lại dữ liệu khi các bộ lọc thay đổi
  useEffect(() => {
    fetchStats()
  }, [startDate, endDate, groupBy])

  // ── Hàm xử lý nút lọc nhanh (7 ngày, 30 ngày, tháng này) ──
  const handleQuickFilter = (days) => {
    const today = getTodayString()
    setEndDate(today)
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
  const chartWidth = 800
  const chartHeight = 300
  const chartPadding = { top: 30, right: 30, bottom: 50, left: 80 }
  const chartData = stats?.chartData || []

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
            {['DAY', 'MONTH', 'YEAR'].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`dashboard-toggle-btn ${groupBy === mode ? 'dashboard-toggle-btn--active' : ''}`}
                onClick={() => setGroupBy(mode)}
              >
                {mode === 'DAY' ? 'Day' : mode === 'MONTH' ? 'Month' : 'Year'}
              </button>
            ))}
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
          <article className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Total Revenue (30 Days)</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                <DollarSign size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{formatVND(overview.totalRevenue)}</div>
          </article>
          <article className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Successful Transactions</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(15, 92, 73, 0.1)', color: '#0F5C49' }}>
                <CreditCard size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{overview.successfulTransactions} txs</div>
          </article>
          <article className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Total Tables</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#64748B' }}>
                <Layers size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{overview.totalTables} tables</div>
          </article>
          <article className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Reservations</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}>
                <Calendar size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{overview.totalReservations} booking</div>
          </article>
          <article className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="dashboard-card__title">Menu Items</div>
              <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#D97706' }}>
                <UtensilsCrossed size={18} />
              </div>
            </div>
            <div className="dashboard-card__value">{overview.totalMenuItems} dishes</div>
          </article>
          <article className="dashboard-card">
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

    return (
      <div className="dashboard-kpis">
        <article className="dashboard-card">
          <div className="dashboard-card__header">
            <div className="dashboard-card__title">Total Revenue (Period)</div>
            <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="dashboard-card__value">{formatVND(stats?.totalRevenuePeriod)}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__header">
            <div className="dashboard-card__title">Successful Transactions</div>
            <div className="dashboard-card__icon" style={{ backgroundColor: 'rgba(15, 92, 73, 0.1)', color: '#0F5C49' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div className="dashboard-card__value">{stats?.transactionCountPeriod} transactions</div>
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
      <h2>Detailed Data Summary</h2>
      <div className="dashboard-table-wrap">
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
    </div>
  )

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

              {/* Bảng chi tiết 3 cột */}
              {!isDashboardOnly && renderSummaryTable()}
            </>
          )}
        </>
      )}
    </section>
  )
}

export default DashboardScreen
