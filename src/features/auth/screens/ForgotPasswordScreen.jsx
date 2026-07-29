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
  // navigate dung de chuyen trang sau khi gui OTP thanh cong hoac bam Back.
  const navigate = useNavigate()
  // Luu email nguoi dung nhap va cac trang thai hien thi loi/loading.
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Khi bam Send OTP, form submit vao ham nay.
  const handleSubmit = async (event) => {
    event.preventDefault()
    // Xoa loi/message cu moi lan submit.
    setError('')
    setSuccessMessage('')

    // Khong cho goi API neu user chua nhap email.
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    try {
      // Goi BE de tao OTP va gui OTP ve email nguoi dung.
      setIsSubmitting(true)
      const response = await forgotPassword(email)
      setSuccessMessage(response.data)
      // Gui OTP thanh cong thi chuyen sang man Verify OTP, mang email tren URL.
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`)
    } catch (err) {
      // Neu email khong ton tai hoac BE loi thi hien message loi.
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      // Luon tat loading, du API thanh cong hay that bai.
      setIsSubmitting(false)
    }
  }

  // JSX giao dien cua man Forgot Password.
  return (
    <div className="auth-screen">
      <Navbar />
      <main className="auth-screen__main">
        <div className="auth-screen__card">
          <div className="auth-screen__brand">Golden Spoon</div>
          <div className="auth-screen__content">
            <h1>Forgot Password</h1>
            {/* Chi hien loi/message khi state co gia tri. */}
            {error && <p className="auth-screen__error">{error}</p>}
            {successMessage && <p className="auth-screen__success">{successMessage}</p>}
            {/* Nut type submit trong form se chay handleSubmit. */}
            <form className="auth-screen__form" onSubmit={handleSubmit}>
              <InputField
                icon={Mail}
                type="email"
                value={email}
                // User go email den dau thi setEmail luu vao state den do.
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                ariaLabel="Email"
              />
              {/* Dang goi API thi khoa nut va hien Please wait. */}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : 'Send OTP'}
              </Button>
              {/* Nut Back khong submit form, chi chuyen ve man Login. */}
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
