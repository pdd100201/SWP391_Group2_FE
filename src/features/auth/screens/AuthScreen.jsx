import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import Button from '../../../shared/components/ui/Button'
import InputField from '../../../shared/components/ui/InputField'
import { forgotPassword, login, loginWithGoogle, registerCustomer, resetPassword, verifyOtp } from '../api/authApi'
import './AuthScreen.css'

function AuthScreen() {
  // Router state: biet URL hien tai va dung de chuyen trang sau khi login/register.
  const location = useLocation()
  const navigate = useNavigate()
  // Hien/an mat khau trong input password.
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // Form co 4 buoc: credentials, forgot-email, otp, new-password.
  const [authStep, setAuthStep] = useState('credentials') // credentials | forgot-email | otp | new-password
  //Cho biết OTP đã xác thực chưa.
  // Chi cho reset password sau khi OTP da verify thanh cong.
  const [otpVerified, setOtpVerified] = useState(false)
  // Tat ca du lieu input duoc gom vao formData.
  const [formData, setFormData] = useState({
    fullName: '',
    customersEmail: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    otp: '',
    resetEmail: '',
    newPassword: '',
    confirmNewPassword: '',
  })
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dua vao URL de xac dinh dang hien form Login hay Register.
  const activeTab = location.pathname === '/register' ? 'register' : 'login'
  const isLogin = activeTab === 'login'

  // Doi tab Login/Register va reset loi, message, OTP step.
  const changeAuthTab = (path) => {
    setError('')
    setSuccessMessage('')
    setAuthStep('credentials')
    setOtpVerified(false)
    navigate(path)
  }

  // Dung chung cho moi input: field nao thay doi thi update field do trong formData.
  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }
  // Sau khi login/register thanh cong: luu token/user info va chuyen trang theo role.
  const persistAuthAndRedirect = (data) => {
    sessionStorage.setItem('token', data.token)
    sessionStorage.setItem('role', data.role)
    sessionStorage.setItem('fullName', data.fullName)
    sessionStorage.setItem('email', data.email)
    window.dispatchEvent(new Event('auth-changed'))
    //chuyển trang theo role
    if (data.role === 'CUSTOMER') {
      navigate('/')
    } else {
      navigate('/dashboard')
    }
  }
  // Login Google
  /**Google trả credential token
   -> FE gửi credential token cho backend
   -> backend verify Google token
   -> backend trả JWT hệ thống
   -> FE lưu JWT và chuyển trang**/
  // Google tra credential token; FE gui token nay ve BE de BE verify va tra JWT cua he thong.
  const handleGoogleSuccess = async (response) => {
    try {
      setError('')
      setIsSubmitting(true)
      //FE lay response.credential roi gui token cho BE xac thuc
      const backendResponse = await loginWithGoogle(response.credential)
      persistAuthAndRedirect(backendResponse.data)
    } catch (err) {
      const message = err.response?.data?.message || 'Google login failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }
  //hiển thị lỗi khi login Google không thành công.
  // Login Google bi huy hoac that bai thi hien loi.
  const handleGoogleError = () => {
    setError('Google login was cancelled or failed')
  }
  //Submit không reload trang
  // Submit chinh cua man auth: xu ly forgot password, OTP, reset password, login, register.
  const handleSubmit = async (event) => {
    event.preventDefault()
    //xóa lỗi cũ/ xóa message thành công cũ/ bật loading submit
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      // Buoc 1 quen mat khau: gui email de BE tao/gui OTP.
      if (authStep === 'forgot-email') {
        if (!formData.resetEmail.trim()) {
          setError('Email is required')
          return
        }
        await forgotPassword(formData.resetEmail)
        setAuthStep('otp')
        return
      }

      // Buoc 2 quen mat khau: gui OTP cho BE kiem tra.
      if (authStep === 'otp') {
        if (!formData.otp.trim()) {
          setError('OTP is required')
          return
        }
        // đúng otp thì đánh dấu verify --> đặt pass mới
        await verifyOtp(formData.resetEmail, formData.otp)
        setOtpVerified(true)
        setAuthStep('new-password')
        return
      }

      // Buoc 3 quen mat khau: dat mat khau moi sau khi OTP dung.
      if (authStep === 'new-password') {
        if (!formData.newPassword.trim()) {
          setError('New password is required')
          return
        }
        if (formData.newPassword !== formData.confirmNewPassword) {
          setError('Passwords do not match')
          return
        }
        await resetPassword(formData.resetEmail, formData.newPassword)
        setSuccessMessage('Password reset successfully. You can now login.')
        setError('')
        setAuthStep('credentials')
        navigate('/login')
        return
      }

      // Luong login bang email/password.
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

      // Luong register customer: validate form truoc khi goi API dang ky.
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
      //gom dât gui cho backend
      const response = await registerCustomer({
        fullName: formData.fullName,
        customersEmail: formData.customersEmail,
        password: formData.password,
        phone: formData.phone,
        avatarUrl: formData.avatarUrl,
      })
      //dki success thi goi ham nay
      persistAuthAndRedirect(response.data)
    } catch (err) {
      // Uu tien hien loi validate field tu BE; neu khong co thi hien loi tong quat.
      const status = err.response?.status
      const backendMessage = err.response?.data?.message
      const fieldErrors = err.response?.data?.errors

      if (fieldErrors && typeof fieldErrors === 'object') {
        const prioritizedField = isLogin
          ? fieldErrors.password || fieldErrors.email
          : fieldErrors.confirmPassword || fieldErrors.password || fieldErrors.customersEmail || fieldErrors.phone || fieldErrors.fullName

        setError(prioritizedField || backendMessage || 'Please check your input again')
      } else {
        setError(
          backendMessage ||
            (isLogin && status === 401
              ? 'Incorrect email or password'
              : status === 400
                ? 'Please check your input again'
                : 'Something went wrong')
        )
      }

      setSuccessMessage('')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Khi bam Forgot password: doi form sang buoc nhap email reset password.
  const openForgotFlow = () => {
    setError('')
    setSuccessMessage('')
    setAuthStep('forgot-email')
    setFormData((prev) => ({ ...prev, resetEmail: prev.email || prev.customersEmail }))
  }

  // Tieu de tren form thay doi theo buoc hien tai.
  const renderTitle = () => {
    if (authStep === 'forgot-email') return 'Forgot Password'
    if (authStep === 'otp') return 'Verify OTP'
    if (authStep === 'new-password') return 'Set New Password'
    return isLogin ? 'Login' : 'Register'
  }

  // Render noi dung form tuy theo authStep.
  const renderForm = () => {
    // Form nhap email de yeu cau gui OTP.
    if (authStep === 'forgot-email') {
      return (
        <>
          <InputField
            icon={Mail}
            type="email"
            name="resetEmail"
            value={formData.resetEmail}
            onChange={handleChange}
            placeholder="Enter your email"
            ariaLabel="Enter your email"
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : 'Send OTP'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAuthStep('credentials')}>
            Back to Login
          </Button>
        </>
      )
    }

    // Form nhap OTP da duoc gui ve email.
    if (authStep === 'otp') {
      return (
        <>
          <InputField
            icon={Lock}
            type="text"
            name="otp"
            value={formData.otp}
            onChange={handleChange}
            placeholder="Enter OTP"
            ariaLabel="Enter OTP"
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : 'Verify OTP'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAuthStep('forgot-email')}>
            Back
          </Button>
     
        </>
      )
    }

    // Form dat mat khau moi sau khi OTP dung.
    if (authStep === 'new-password') {
      return (
        <>
          <InputField
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="New Password"
            ariaLabel="New Password"
            passwordToggle={
              <button
                type="button"
                className="auth-screen__eye-button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            }
          />
          <InputField
            icon={Lock}
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmNewPassword"
            value={formData.confirmNewPassword}
            onChange={handleChange}
            placeholder="Confirm New Password"
            ariaLabel="Confirm New Password"
            passwordToggle={
              <button
                type="button"
                className="auth-screen__eye-button"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            }
          />
          <Button type="submit" disabled={isSubmitting || !otpVerified}>
            {isSubmitting ? 'Please wait...' : 'Reset Password'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAuthStep('credentials')}>
            Back to Login
          </Button>
        </>
      )
    }

    // Mac dinh la form credentials: Login hoac Register.
    return (
      <>
        {/* Register moi can fullName va phone; Login khong hien 2 field nay. */}
        {!isLogin && (
          <>
            <InputField
              icon={User}
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Full Name"
              ariaLabel="Full Name"
            />

            <InputField
              icon={Phone}
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              ariaLabel="Phone Number"
            />
          </>
        )}

        {/* Login dung field email, Register dung field customersEmail theo request BE. */}
        <InputField
          icon={Mail}
          type="email"
          name={isLogin ? 'email' : 'customersEmail'}
          value={isLogin ? formData.email : formData.customersEmail}
          onChange={handleChange}
          placeholder="Email"
          ariaLabel="Email"
        />

        <InputField
          icon={Lock}
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          ariaLabel="Password"
          passwordToggle={
            <button
              type="button"
              className="auth-screen__eye-button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          }
        />

        {/* Register can confirm password de FE kiem tra 2 mat khau co trung nhau khong. */}
        {!isLogin && (
          <InputField
            icon={Lock}
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm Password"
            ariaLabel="Confirm Password"
            passwordToggle={
              <button
                type="button"
                className="auth-screen__eye-button"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            }
          />
        )}

        {/* Login moi hien Remember me va Forgot password. */}
        {isLogin && (
          <div className="auth-screen__meta-row">
            <label className="auth-screen__remember">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <button type="button" className="auth-screen__link-button" onClick={openForgotFlow}>
              Forgot password?
            </button>
          </div>
        )}

        {/* Nut submit doi text theo trang hien tai va bi khoa khi dang goi API. */}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
        </Button>
      </>
    )
  }

  // JSX chinh cua man hinh auth.
  return (
    <div className="auth-screen">
      <Navbar />
      <main className="auth-screen__main">
        <div className="auth-screen__card">
          <div className="auth-screen__brand">Golden Spoon</div>

          {/* Hai tab Login/Register thuc chat chuyen URL /login va /register. */}
          <div className="auth-screen__tabs" role="tablist" aria-label="Authentication modes">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={`auth-screen__tab ${isLogin ? 'auth-screen__tab--active' : ''}`}
              onClick={() => changeAuthTab('/login')}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={`auth-screen__tab ${!isLogin ? 'auth-screen__tab--active' : ''}`}
              onClick={() => changeAuthTab('/register')}
            >
              Register
            </button>
          </div>

          <div className="auth-screen__content">
            <h1>{renderTitle()}</h1>

            {/* Hien loi hoac thong bao thanh cong neu co. */}
            {error && <p className="auth-screen__error" role="alert">{error}</p>}
            {successMessage && <p className="auth-screen__success" role="status">{successMessage}</p>}

            {/* Tat ca form deu submit vao handleSubmit, ben trong handleSubmit tu chia theo authStep/isLogin. */}
            <form className="auth-screen__form" onSubmit={handleSubmit}>
              {renderForm()}
            </form>

            {/* Chi hien Google Login o man Login/Register, khong hien trong luong forgot password. */}
            {authStep === 'credentials' && (
              <>
                <div className="auth-screen__divider">
                  <span>Or continue with</span>
                </div>
                {/* Sau khi bam Sign in with Google, thu vien Google se mo popup/prompt chon account. */}
                <div className="auth-screen__google-button">
                  {/* Chon account xong thi GoogleLogin goi handleGoogleSuccess. */}
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} width="100%" />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default AuthScreen
