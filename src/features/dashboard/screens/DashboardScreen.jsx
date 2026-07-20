import { useEffect, useMemo, useState } from 'react'
import { BarChart2, RefreshCw } from 'lucide-react'
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
      const response = await dashboardApi.getRevenueStats({
        startDate,
        endDate,
        groupBy: groupBy.toLowerCase(),
      })
      setStats(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve statistical data.')
      setStats(null) // Xóa dữ liệu cũ khi gặp lỗi bộ lọc
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
  const handleMouseEnter = (event, item) => {
    const rect = event.target.getBoundingClientRect()
    const container = event.target.closest('.svg-chart-container').getBoundingClientRect()
    setTooltip({
      show: true,
      x: rect.left - container.left + rect.width / 2,
      y: rect.top - container.top,
      label: item.timeLabel,
      value: item.revenue,
      txCount: item.transactionCount,
    })
  }

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, show: false }))
  }

  // ── Hàm xuất báo cáo sang file CSV ──
  // Giải thích: Trích xuất dữ liệu biểu đồ hiện tại để tạo file CSV tải xuống.
  // Đầu vào: Không có. Đầu ra: Tải xuống tệp CSV.
  const handleExportCSV = () => {
    if (!chartData || chartData.length === 0) return

    // Cấu hình tiêu đề cột
    const headers = ['Time Period', 'Revenue (VND)', 'Transactions']
    
    // Định dạng dữ liệu từng dòng
    const rows = chartData.map((item) => [
      item.timeLabel,
      Math.round(item.revenue || 0),
      item.transactionCount
    ])
    
    // Gộp dữ liệu theo định dạng CSV chuẩn, thêm dòng sep=, ở đầu để Excel nhận diện đúng phân tách cột
    const csvContent = [
      'sep=,',
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n')

    // Thêm mã BOM UTF-8 để Microsoft Excel nhận diện kí tự chuẩn xác
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `revenue_report_${startDate}_to_${endDate}_by_${groupBy.toLowerCase()}.csv`)
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

  // ── HÀM CON 2: Render 2 thẻ KPI đơn giản ──
  // Giải thích: Vẽ hai thẻ thể hiện Tổng doanh thu trong khoảng chọn và Số giao dịch thành công.
  // Đầu vào: totalRevenue (Tổng tiền), txCount (Số đơn). Đầu ra: JSX hai cột KPI.
  const renderKpiCards = (totalRevenue, txCount) => (
    <div className="dashboard-kpis">
      <article className="dashboard-card">
        <div className="dashboard-card__title">Total Revenue (Period)</div>
        <div className="dashboard-card__value">{formatVND(totalRevenue)}</div>
      </article>
      <article className="dashboard-card">
        <div className="dashboard-card__title">Successful Transactions</div>
        <div className="dashboard-card__value">{txCount} transactions</div>
      </article>
    </div>
  )

  // ── HÀM CON 3: Render Biểu đồ cột SVG ──
  // Giải thích: Tính toán tọa độ và vẽ các cột biểu đồ SVG, hỗ trợ căn giữa cột khi danh sách ngắn.
  // Đầu vào: Không có. Đầu ra: JSX chứa biểu đồ cột SVG hoặc thông báo rỗng.
  const renderSvgChart = () => {
    if (isAllZero) {
      return (
        <div className="dashboard-empty">
          <BarChart2 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div>No revenue recorded during this period.</div>
        </div>
      )
    }

    const plotWidth = chartWidth - chartPadding.left - chartPadding.right
    const count = chartData.length
    const barSpacing = count > 15 ? 6 : 16
    
    // Giới hạn độ rộng cột tối đa là 40px và căn giữa các cột trên biểu đồ
    const maxBarWidth = count < 6 ? 40 : (plotWidth - barSpacing * (count - 1)) / count
    const barWidth = Math.max(Math.min(maxBarWidth, 40), 4)
    const totalWidth = count * barWidth + (count - 1) * barSpacing
    const startX = chartPadding.left + (plotWidth - totalWidth) / 2

    return (
      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
          {/* Trục hoành và trục tung */}
          {[0, 0.5, 1].map((ratio, index) => {
            const y = chartHeight - chartPadding.bottom - ratio * (chartHeight - chartPadding.top - chartPadding.bottom)
            return (
              <g key={index}>
                <line x1={chartPadding.left} y1={y} x2={chartWidth - chartPadding.right} y2={y} className="svg-chart-grid-line" />
                <text x={chartPadding.left - 10} y={y + 4} textAnchor="end" className="svg-chart-axis-text">{formatVND(ratio * maxRevenue)}</text>
              </g>
            )
          })}
          
          {/* Vẽ cột */}
          {chartData.map((item, i) => {
            const x = startX + i * (barWidth + barSpacing)
            const barHeightVal = ((item.revenue || 0) / maxRevenue) * (chartHeight - chartPadding.top - chartPadding.bottom)
            const y = chartHeight - chartPadding.bottom - barHeightVal
            const showLabel = count <= 12 || i % Math.ceil(count / 10) === 0

            return (
              <g key={item.timeLabel}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeightVal, 2)}
                  rx={barWidth > 6 ? 2 : 0}
                  className="svg-chart-bar"
                  onMouseEnter={(e) => handleMouseEnter(e, item)}
                  onMouseLeave={handleMouseLeave}
                />
                {showLabel && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - chartPadding.bottom + 18}
                    textAnchor="middle"
                    className="svg-chart-axis-text"
                    transform={count > 8 ? `rotate(-20, ${x + barWidth / 2}, ${chartHeight - chartPadding.bottom + 18})` : ''}
                  >
                    {groupBy === 'DAY' ? item.timeLabel.slice(5) : item.timeLabel}
                  </text>
                )}
              </g>
            )
          })}
          <line x1={chartPadding.left} y1={chartHeight - chartPadding.bottom} x2={chartWidth - chartPadding.right} y2={chartHeight - chartPadding.bottom} className="svg-chart-axis-line" />
        </svg>

        {tooltip.show && (
          <div className="chart-tooltip" style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}>
            <strong>{tooltip.label}</strong>
            Revenue: {formatVND(tooltip.value)}
            <br />
            Transactions: {tooltip.txCount} txs
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
              onClick={handleExportCSV}
              disabled={isAllZero}
            >
              Export CSV
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
              {/* 2 Thẻ KPI chính */}
              {renderKpiCards(stats.totalRevenuePeriod, stats.transactionCountPeriod)}

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
