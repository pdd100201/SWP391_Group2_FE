import { useEffect, useMemo, useState } from 'react'

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
  const lastAvailablePage = Math.max(totalPages - 1, 0)
  const currentPage = Math.min(page, lastAvailablePage)

  useEffect(() => {
    if (page > lastAvailablePage) {
      // Keep mutations and filter changes from leaving the list on an empty page.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPage(lastAvailablePage)
    }
  }, [lastAvailablePage, page])

  // Danh sách phần tử của trang hiện tại
  const currentItems = useMemo(
    () => items.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [currentPage, items, pageSize]
  )

  // Chỉ số hiển thị "Showing X–Y of Z"
  const startIdx = totalElements === 0 ? 0 : currentPage * pageSize + 1
  const endIdx = Math.min((currentPage + 1) * pageSize, totalElements)

  // Danh sách số trang hiển thị trên thanh phân trang
  const getPageNumbers = (maxVisible = 5) => {
    const pages = []
    let start = Math.max(0, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible)
    if (end - start < maxVisible) start = Math.max(0, end - maxVisible)
    for (let i = start; i < end; i++) pages.push(i)
    return pages
  }

  // Reset về trang đầu (gọi khi search / filter thay đổi)
  const reset = () => setPage(0)

  return {
    page: currentPage,
    setPage,
    totalPages,
    totalElements,
    currentItems,
    startIdx,
    endIdx,
    getPageNumbers,
    reset,
    isFirst: currentPage === 0,
    isLast: currentPage >= totalPages - 1,
  }
}
