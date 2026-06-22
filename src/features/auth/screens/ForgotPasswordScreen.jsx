import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import Button from '../../../shared/components/ui/Button'
import InputField from '../../../shared/components/ui/InputField'
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
              <InputField
                icon={Mail}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                ariaLabel="Email"
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : 'Send OTP'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ForgotPasswordScreen
