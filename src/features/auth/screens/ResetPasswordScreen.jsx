import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import { resetPassword } from '../api/authApi'
import './AuthScreen.css'

function ResetPasswordScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = useMemo(() => new URLSearchParams(location.search).get('email') || '', [location.search])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!newPassword.trim()) {
      setError('New password is required')
      return
    }
    if (!confirmNewPassword.trim()) {
      setError('Confirm password is required')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await resetPassword(email, newPassword)
      setSuccessMessage(response.data)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <Navbar />
      <main className="auth-screen__main">
        <div className="auth-screen__card">
          <div className="auth-screen__brand">Golden Spoon</div>
          <div className="auth-screen__content">
            <h1>Reset Password</h1>
            {error && <p className="auth-screen__error">{error}</p>}
            {successMessage && <p className="auth-screen__success">{successMessage}</p>}
            <form className="auth-screen__form" onSubmit={handleSubmit}>
              <div className="auth-screen__field auth-screen__field--password">
                <Lock className="auth-screen__field-icon" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New Password"
                  aria-label="New Password"
                />
                <button
                  type="button"
                  className="auth-screen__eye-button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              <div className="auth-screen__field auth-screen__field--password">
                <Lock className="auth-screen__field-icon" aria-hidden="true" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  placeholder="Confirm New Password"
                  aria-label="Confirm New Password"
                />
                <button
                  type="button"
                  className="auth-screen__eye-button"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              <button type="submit" className="auth-screen__primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : 'Reset Password'}
              </button>
              <button type="button" className="auth-screen__secondary-button" onClick={() => navigate('/login')}>
                Back to Login
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ResetPasswordScreen
