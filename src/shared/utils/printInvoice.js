const formatMoney = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VND`

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ')
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const tableLabel = (order) => {
  if (order?.tableNumber && order?.tableName && order.tableNumber !== order.tableName) {
    return `${order.tableNumber} - ${order.tableName}`
  }
  return order?.tableName || order?.tableNumber || `Table ${order?.tableId || '-'}`
}

const orderItems = (orders) => (orders || [])
  .filter((order) => order.status !== 'CANCELLED')
  .flatMap((order) => (order.items || [])
    .filter((item) => item.status !== 'CANCELLED')
    .map((item) => ({ ...item, tableName: tableLabel(order), orderCode: order.orderCode })))

export const printInvoice = ({ group, bill }) => {
  const activeBill = bill || group?.bill || {}
  const orders = group?.orders || []
  const items = orderItems(orders)
  const invoiceWindow = window.open('', '_blank', 'width=900,height=720')

  if (!invoiceWindow) {
    window.alert('Please allow pop-ups to print the invoice.')
    return
  }

  const rows = items.length
    ? items.map((item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.menuItemName || 'Item')}</strong>
          <small>${escapeHtml(item.tableName)}${item.note ? ` - ${escapeHtml(item.note)}` : ''}</small>
        </td>
        <td>${escapeHtml(item.quantity || 0)}</td>
        <td>${formatMoney(Number(item.lineTotal || 0) / Number(item.quantity || 1))}</td>
        <td>${formatMoney(item.lineTotal)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" class="empty">No billable items.</td></tr>'

  const paidAt = activeBill.paidAt || activeBill.updatedAt || new Date().toISOString()
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Invoice ${escapeHtml(activeBill.billCode || '')}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; color: #111827; font-family: Arial, sans-serif; background: #f8fafc; }
          .invoice { max-width: 760px; margin: 0 auto; padding: 28px; background: #fff; border: 1px solid #e5e7eb; }
          .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #064e3b; padding-bottom: 18px; }
          h1, h2, p { margin: 0; }
          h1 { color: #064e3b; font-size: 28px; }
          h2 { margin-top: 4px; font-size: 16px; color: #475569; font-weight: 600; }
          .meta { margin-top: 20px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 22px; }
          .meta span, .summary span { display: flex; justify-content: space-between; gap: 12px; color: #475569; }
          .meta strong, .summary strong { color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th { text-align: left; background: #f1f5f9; color: #334155; font-size: 12px; text-transform: uppercase; }
          th, td { padding: 11px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
          td:nth-child(2), td:nth-child(3), td:nth-child(4), th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; white-space: nowrap; }
          small { display: block; margin-top: 4px; color: #64748b; }
          .summary { margin-left: auto; margin-top: 22px; width: min(330px, 100%); display: grid; gap: 9px; }
          .total { padding-top: 10px; border-top: 2px solid #064e3b; font-size: 18px; font-weight: 800; }
          .empty { text-align: center; color: #64748b; }
          .footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 12px; }
          @media print {
            body { padding: 0; background: #fff; }
            .invoice { border: 0; max-width: none; }
          }
        </style>
      </head>
      <body>
        <main class="invoice">
          <section class="top">
            <div>
              <h1>Golden Spoon</h1>
              <h2>Restaurant Invoice</h2>
            </div>
            <div>
              <p><strong>${escapeHtml(activeBill.billCode || `Reservation #${group?.reservationId || '-'}`)}</strong></p>
              <small>Paid at ${escapeHtml(formatDateTime(paidAt))}</small>
            </div>
          </section>

          <section class="meta">
            <span>Guest <strong>${escapeHtml(group?.reservationGuestName || '-')}</strong></span>
            <span>Reservation <strong>#${escapeHtml(group?.reservationId || activeBill.reservationId || '-')}</strong></span>
            <span>Tables <strong>${escapeHtml(orders.map(tableLabel).join(', ') || '-')}</strong></span>
            <span>Payment <strong>${escapeHtml(activeBill.paymentProvider || '-')}</strong></span>
            <span>Payment code <strong>${escapeHtml(activeBill.paymentCode || '-')}</strong></span>
            <span>Status <strong>${escapeHtml(activeBill.paymentStatus || activeBill.status || '-')}</strong></span>
          </section>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <section class="summary">
            <span>Subtotal <strong>${formatMoney(activeBill.subtotal || group?.subtotal || 0)}</strong></span>
            <span>Discount <strong>-${formatMoney(activeBill.discountAmount || 0)}</strong></span>
            <span class="total">Total <strong>${formatMoney(activeBill.total || group?.subtotal || 0)}</strong></span>
          </section>

          <p class="footer">Thank you for dining at Golden Spoon Restaurant.</p>
        </main>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `

  invoiceWindow.document.open()
  invoiceWindow.document.write(html)
  invoiceWindow.document.close()
}
