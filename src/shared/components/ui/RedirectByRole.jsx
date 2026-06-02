import { Navigate } from 'react-router-dom'

function RedirectByRole() {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (role === 'CUSTOMER') {
    return <Navigate to="/" replace />
  }

  return <Navigate to="/dashboard" replace />
}

export default RedirectByRole
