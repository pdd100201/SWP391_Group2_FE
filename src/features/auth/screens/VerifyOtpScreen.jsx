import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import { verifyOtp } from '../api/authApi'
import './AuthScreen.css'

function VerifyOtpScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = useMemo(() => new URLSearchParams(location.search).get('email') || '', [location.search])
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!otp.trim()) {
      setError('OTP is required')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await verifyOtp(email, otp)
      setSuccessMessage(response.data)
      navigate(`/reset-password?email=${encodeURIComponent(email)}`)
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
            <h1>Verify OTP</h1>
            {error && <p className="auth-screen__error">{error}</p>}
            {successMessage && <p className="auth-screen__success">{successMessage}</p>}
            <form className="auth-screen__form" onSubmit={handleSubmit}>
              <div className="auth-screen__field">
                <Lock className="auth-screen__field-icon" aria-hidden="true" />
                <input
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter OTP"
                  aria-label="OTP"
                />
              </div>
              <button type="submit" className="auth-screen__primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : 'Verify OTP'}
              </button>
              <button type="button" className="auth-screen__secondary-button" onClick={() => navigate('/forgot-password')}>
                Back
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default VerifyOtpScreen
