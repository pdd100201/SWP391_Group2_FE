import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import Button from '../../../shared/components/ui/Button'
import InputField from '../../../shared/components/ui/InputField'
import { verifyOtp } from '../api/authApi'
import './AuthScreen.css'

function VerifyOtpScreen() {
  // navigate dung de chuyen trang, location dung de doc query string tren URL.
  const navigate = useNavigate()
  const location = useLocation()
  // Lay email tu URL, vi man verify OTP can biet OTP nay thuoc email nao.
  const email = useMemo(() => new URLSearchParams(location.search).get('email') || '', [location.search])
  // Luu OTP nguoi dung nhap va cac trang thai hien thi loi/loading.
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Khi bam Verify OTP, form submit vao day.
  const handleSubmit = async (event) => {
    event.preventDefault()
    // Xoa loi/message cu moi lan submit.
    setError('')
    setSuccessMessage('')

    // Khong cho goi API neu user chua nhap OTP.
    if (!otp.trim()) {
      setError('OTP is required')
      return
    }

    try {
      // Goi BE kiem tra OTP theo email lay tu URL.
      setIsSubmitting(true)
      const response = await verifyOtp(email, otp)
      setSuccessMessage(response.data)
      // OTP dung thi chuyen sang man dat mat khau moi, van mang email tren URL.
      navigate(`/reset-password?email=${encodeURIComponent(email)}`)
    } catch (err) {
      // OTP sai/het han hoac BE loi thi hien message loi.
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      // Luon tat loading, du thanh cong hay that bai.
      setIsSubmitting(false)
    }
  }

  // JSX giao dien cua man Verify OTP.
  return (
    <div className="auth-screen">
      <Navbar />
      <main className="auth-screen__main">
        <div className="auth-screen__card">
          <div className="auth-screen__brand">Golden Spoon</div>
          <div className="auth-screen__content">
            <h1>Verify OTP</h1>
            {/* Chi hien loi/message khi state co gia tri. */}
            {error && <p className="auth-screen__error">{error}</p>}
            {successMessage && <p className="auth-screen__success">{successMessage}</p>}
            {/* Nut type submit trong form se chay handleSubmit. */}
            <form className="auth-screen__form" onSubmit={handleSubmit}>
              <InputField
                icon={Lock}
                type="text"
                value={otp}
                // User go OTP den dau thi setOtp luu vao state den do.
                onChange={(event) => setOtp(event.target.value)}
                placeholder="Enter OTP"
                ariaLabel="OTP"
              />
              {/* Dang goi API thi khoa nut va hien Please wait. */}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : 'Verify OTP'}
              </Button>
              {/* Nut Back khong submit form, chi quay lai man forgot password. */}
              <Button type="button" variant="secondary" onClick={() => navigate('/forgot-password')}>
                Back
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default VerifyOtpScreen
