import { Navigate, useLocation } from 'react-router-dom'

function RequireAuth({ children, allowedRoles }) {
  const location = useLocation()
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    if (role === 'CUSTOMER') {
      return <Navigate to="/" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default RequireAuth
