import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import Navbar from '../../../shared/components/layout/Navbar/Navbar'
import Footer from '../../../shared/components/layout/Footer/Footer'
import InputField from '../../../shared/components/ui/InputField'
import { changePassword, getProfile, updateAvatar, updateProfile } from '../api/profileApi'
import './ProfileScreen.css'

function ProfileScreen() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [avatarSuccess, setAvatarSuccess] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [profileForm, setProfileForm] = useState({ fullName: '', phoneNumber: '' })
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [submittingSection, setSubmittingSection] = useState('')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const response = await getProfile()
        setProfile(response.data)
        setProfileForm({
          fullName: response.data.fullName || '',
          phoneNumber: response.data.phoneNumber || '',
        })
      } catch (err) {
        setProfileError(err.response?.data?.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const userName = useMemo(() => profile?.fullName || sessionStorage.getItem('fullName') || 'User', [profile])

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    try {
      setSubmittingSection('profile')
      const response = await updateProfile(profileForm)
      setProfile(response.data)
      setProfileSuccess('Profile updated successfully')
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSubmittingSection('')
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!passwordForm.oldPassword.trim()) {
      setPasswordError('Old password is required')
      return
    }
    if (!passwordForm.newPassword.trim()) {
      setPasswordError('New password is required')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long')
      return
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(passwordForm.newPassword)) {
      setPasswordError('New password must include letters and numbers')
      return
    }

    try {
      setSubmittingSection('password')
      const response = await changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordSuccess(response.data)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      const backendErrors = err.response?.data?.errors
      const firstBackendError =
        backendErrors && typeof backendErrors === 'object'
          ? Object.values(backendErrors).find((message) => typeof message === 'string' && message.trim())
          : ''

      setPasswordError(firstBackendError || err.response?.data?.message || 'Failed to change password')
    } finally {
      setSubmittingSection('')
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      setAvatarError('Please choose an avatar image')
      return
    }

    try {
      setAvatarError('')
      setAvatarSuccess('')
      setSubmittingSection('avatar')
      const response = await updateAvatar(avatarFile)
      setProfile(response.data)
      setAvatarSuccess('Avatar updated successfully')
      setAvatarFile(null)
    } catch (err) {
      setAvatarError(err.response?.data?.message || 'Failed to upload avatar')
    } finally {
      setSubmittingSection('')
    }
  }

  return (
    <div className="profile-page">
      <Navbar />
      <main className="profile-page__main">
        <div className="profile-page__container">
          <div className="profile-page__header">
            <div>
              <p className="profile-page__eyebrow">Personal Center</p>
              <h1>View & Update Personal Profile</h1>
              <p className="profile-page__subtitle">Manage your account information, security, and avatar in one place.</p>
            </div>
            <div className="profile-page__summary-card">
              <div className="profile-page__avatar">{userName.charAt(0).toUpperCase()}</div>
              <div>
                <strong>{userName}</strong>
                <p>{profile?.email || sessionStorage.getItem('email') || 'No email'}</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="profile-page__loading">Loading profile...</div>
          ) : (
            <div className="profile-page__grid">
              <section className="profile-card">
                <h2>Personal Information</h2>
                {profileError && <p className="profile-message profile-message--error">{profileError}</p>}
                {profileSuccess && <p className="profile-message profile-message--success">{profileSuccess}</p>}
                <form className="profile-form" onSubmit={handleProfileSubmit}>
                  <label>
                    Full name
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    />
                  </label>
                  <label>
                    Phone number
                    <input
                      type="tel"
                      value={profileForm.phoneNumber}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                    />
                  </label>
                  <button type="submit" disabled={submittingSection === 'profile'}>
                    {submittingSection === 'profile' ? 'Saving...' : 'Update Profile'}
                  </button>
                </form>
              </section>

              <section className="profile-card">
                <h2>Change Password</h2>
                <form className="profile-form" onSubmit={handlePasswordSubmit}>
                  {passwordError && <p className="profile-message profile-message--error">{passwordError}</p>}
                {passwordSuccess && <p className="profile-message profile-message--success">{passwordSuccess}</p>}
                  <div className="profile-form-group">
                    <label>Old password</label>
                    <InputField
                      icon={Lock}
                      type={showOldPassword ? 'text' : 'password'}
                      value={passwordForm.oldPassword}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))}
                      placeholder="Old password"
                      passwordToggle={
                        <button
                          type="button"
                          className="profile-eye-btn-fix"
                          onClick={() => setShowOldPassword((prev) => !prev)}
                        >
                          {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                  </div>
                  <div className="profile-form-group">
                    <label>New password</label>
                    <InputField
                      icon={Lock}
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                      placeholder="New password"
                      passwordToggle={
                        <button
                          type="button"
                          className="profile-eye-btn-fix"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                  </div>
                  <div className="profile-form-group">
                    <label>Confirm new password</label>
                    <InputField
                      icon={Lock}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      placeholder="Confirm new password"
                      passwordToggle={
                        <button
                          type="button"
                          className="profile-eye-btn-fix"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                  </div>
                  <button type="submit" disabled={submittingSection === 'password'}>
                    {submittingSection === 'password' ? 'Updating...' : 'Change Password'}
                  </button>
                </form>
              </section>

              <section className="profile-card profile-card--wide">
                <h2>Upload Profile Avatar</h2>
                {avatarError && <p className="profile-message profile-message--error">{avatarError}</p>}
                {avatarSuccess && <p className="profile-message profile-message--success">{avatarSuccess}</p>}
                <div className="profile-avatar-upload">
                  <div className="profile-avatar-preview">
                    {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="Avatar preview" /> : <span>{userName.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="profile-avatar-actions">
                    <input type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} />
                    <button type="button" onClick={handleAvatarUpload} disabled={submittingSection === 'avatar'}>
                      {submittingSection === 'avatar' ? 'Uploading...' : 'Upload Avatar'}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ProfileScreen
