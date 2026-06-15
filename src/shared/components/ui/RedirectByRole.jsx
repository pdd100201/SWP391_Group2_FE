import { Navigate } from 'react-router-dom'

function RedirectByRole() {
  const token = sessionStorage.getItem('token')
  const role = sessionStorage.getItem('role')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (role === 'CUSTOMER') {
    return <Navigate to="/" replace />
  }

  return <Navigate to="/dashboard" replace />
}

export default RedirectByRole
