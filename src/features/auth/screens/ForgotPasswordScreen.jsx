import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import { forgotPassword } from '../api/authApi'
import './AuthScreen.css'

function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await forgotPassword(email)
      setSuccessMessage(response.data)
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`)
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
            <h1>Forgot Password</h1>
            {error && <p className="auth-screen__error">{error}</p>}
            {successMessage && <p className="auth-screen__success">{successMessage}</p>}
            <form className="auth-screen__form" onSubmit={handleSubmit}>
              <div className="auth-screen__field">
                <Mail className="auth-screen__field-icon" aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  aria-label="Email"
                />
              </div>
              <button type="submit" className="auth-screen__primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : 'Send OTP'}
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

export default ForgotPasswordScreen
