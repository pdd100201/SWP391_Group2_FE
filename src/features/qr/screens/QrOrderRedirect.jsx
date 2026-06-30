import { useSearchParams, Navigate } from 'react-router-dom'

function QrOrderRedirect() {
  const [searchParams] = useSearchParams()
  const tableId = searchParams.get('tableId')

  if (!tableId) return <Navigate to="/" replace />
  return <Navigate to={`/qr/table/${tableId}`} replace />
}

export default QrOrderRedirect
