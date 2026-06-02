import { useEffect, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import { login, loginWithGoogle, registerCustomer } from '../api/authApi'
import './AuthScreen.css'

function AuthScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(location.pathname === '/register' ? 'register' : 'login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    customersEmail: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setActiveTab(location.pathname === '/register' ? 'register' : 'login')
    setError('')
  }, [location.pathname])

  const isLogin = activeTab === 'login'

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const persistAuthAndRedirect = (data) => {
    sessionStorage.setItem('token', data.token)
    sessionStorage.setItem('role', data.role)
    sessionStorage.setItem('fullName', data.fullName)
    sessionStorage.setItem('email', data.email)
    window.dispatchEvent(new Event('auth-changed'))

    if (data.role === 'CUSTOMER') {
      navigate('/')
    } else {
      navigate('/dashboard')
    }
  }

  const handleGoogleSuccess = async (response) => {
    try {
      setError('')
      setIsSubmitting(true)
      const backendResponse = await loginWithGoogle(response.credential)
      persistAuthAndRedirect(backendResponse.data)
    } catch (err) {
      const message = err.response?.data?.message || 'Google login failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleError = () => {
    setError('Google login was cancelled or failed')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (isLogin) {
        if (!formData.email.trim()) {
          setError('Email is required')
          return
        }
        if (!formData.password.trim()) {
          setError('Password is required')
          return
        }

        const response = await login(formData.email, formData.password)

        persistAuthAndRedirect(response.data)
        return
      }

      if (!formData.fullName.trim()) {
        setError('Full name is required')
        return
      }
      if (!formData.phone.trim()) {
        setError('Phone number is required')
        return
      }
      if (!formData.customersEmail.trim()) {
        setError('Email is required')
        return
      }
      if (!formData.password.trim()) {
        setError('Password is required')
        return
      }
      if (!formData.confirmPassword.trim()) {
        setError('Confirm password is required')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }

      const response = await registerCustomer({
        fullName: formData.fullName,
        customersEmail: formData.customersEmail,
        password: formData.password,
        phone: formData.phone,
        avatarUrl: formData.avatarUrl,
      })

      persistAuthAndRedirect(response.data)
    } catch (err) {
      const message = err.response?.data?.message || 'Something went wrong'
      setError(message)
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

          <div className="auth-screen__tabs" role="tablist" aria-label="Authentication modes">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={`auth-screen__tab ${isLogin ? 'auth-screen__tab--active' : ''}`}
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={`auth-screen__tab ${!isLogin ? 'auth-screen__tab--active' : ''}`}
              onClick={() => navigate('/register')}
            >
              Register
            </button>
          </div>

          <div className="auth-screen__content">
            <h1>{isLogin ? 'Login' : 'Register'}</h1>

            {error && <p className="auth-screen__error" role="alert">{error}</p>}

            <form className="auth-screen__form" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="auth-screen__field">
                    <User className="auth-screen__field-icon" aria-hidden="true" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Full Name"
                      aria-label="Full Name"
                    />
                  </div>

                  <div className="auth-screen__field">
                    <Phone className="auth-screen__field-icon" aria-hidden="true" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Phone Number"
                      aria-label="Phone Number"
                    />
                  </div>
                </>
              )}

              <div className="auth-screen__field">
                <Mail className="auth-screen__field-icon" aria-hidden="true" />
                <input
                  type="email"
                  name={isLogin ? 'email' : 'customersEmail'}
                  value={isLogin ? formData.email : formData.customersEmail}
                  onChange={handleChange}
                  placeholder="Email"
                  aria-label="Email"
                />
              </div>

              <div className="auth-screen__field auth-screen__field--password">
                <Lock className="auth-screen__field-icon" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  aria-label="Password"
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

              {!isLogin && (
                <div className="auth-screen__field auth-screen__field--password">
                  <Lock className="auth-screen__field-icon" aria-hidden="true" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    aria-label="Confirm Password"
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
              )}

              {isLogin && (
                <div className="auth-screen__meta-row">
                  <label className="auth-screen__remember">
                    <input type="checkbox" />
                    <span>Remember me</span>
                  </label>
                  <a href="#forgot-password">Forgot password?</a>
                </div>
              )}

              <button type="submit" className="auth-screen__primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
              </button>
            </form>

            <div className="auth-screen__divider">
              <span>Or continue with</span>
            </div>

            <div className="auth-screen__google-button">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} width="100%" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default AuthScreen
