import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import './AuthScreen.css'

const API_BASE_URL = 'http://localhost:8080'

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (isLogin) {
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: formData.email,
          password: formData.password,
        })

        sessionStorage.setItem('token', response.data.token)
        sessionStorage.setItem('role', response.data.role)
        sessionStorage.setItem('fullName', response.data.fullName)
        sessionStorage.setItem('email', response.data.email)
        window.dispatchEvent(new Event('auth-changed'))

        if (response.data.role === 'CUSTOMER') {
          navigate('/')
        } else {
          navigate('/dashboard')
        }
        return
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }

      const response = await axios.post(`${API_BASE_URL}/api/auth/customer/register`, {
        fullName: formData.fullName,
        customersEmail: formData.customersEmail,
        password: formData.password,
        phone: formData.phone,
        avatarUrl: formData.avatarUrl,
      })

      localStorage.setItem('token', response.data.token)
      localStorage.setItem('role', response.data.role)
      localStorage.setItem('fullName', response.data.fullName)
      localStorage.setItem('email', response.data.email)
      window.dispatchEvent(new Event('auth-changed'))
      navigate('/')
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

            <button type="button" className="auth-screen__google-button">
              <span className="auth-screen__google-badge" aria-hidden="true">G</span>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default AuthScreen
