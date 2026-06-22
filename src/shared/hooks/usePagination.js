import { useState, useMemo } from 'react'

/**
 * Hook phân trang phía frontend.
 *
 * Cách dùng:
 *   const pagination = usePagination(allItems, PAGE_SIZE)
 *   // Hiển thị:  pagination.currentItems
 *   // Reset khi filter thay đổi: pagination.reset()
 *
 * Để thay đổi số dòng mỗi trang, chỉ cần sửa hằng số PAGE_SIZE
 * ở đầu file component tương ứng.
 */
export function usePagination(items, pageSize) {
  const [page, setPage] = useState(0)

  // Tổng số phần tử và số trang
  const totalElements = items.length
  const totalPages = Math.ceil(totalElements / pageSize) || 0

  // Danh sách phần tử của trang hiện tại
  const currentItems = useMemo(
    () => items.slice(page * pageSize, (page + 1) * pageSize),
    [items, page, pageSize]
  )

  // Chỉ số hiển thị "Showing X–Y of Z"
  const startIdx = totalElements === 0 ? 0 : page * pageSize + 1
  const endIdx = Math.min((page + 1) * pageSize, totalElements)

  // Danh sách số trang hiển thị trên thanh phân trang
  const getPageNumbers = (maxVisible = 5) => {
    const pages = []
    let start = Math.max(0, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible)
    if (end - start < maxVisible) start = Math.max(0, end - maxVisible)
    for (let i = start; i < end; i++) pages.push(i)
    return pages
  }

  // Reset về trang đầu (gọi khi search / filter thay đổi)
  const reset = () => setPage(0)

  return {
    page,
    setPage,
    totalPages,
    totalElements,
    currentItems,
    startIdx,
    endIdx,
    getPageNumbers,
    reset,
    isFirst: page === 0,
    isLast: page >= totalPages - 1,
  }
}
