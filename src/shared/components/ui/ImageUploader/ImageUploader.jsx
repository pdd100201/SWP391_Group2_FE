import { useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { mediaService } from '../../../services/mediaService'
import './ImageUploader.css'

function ImageUploader({ value, onChange, folder = 'general', label = 'Image' }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Upload ngay khi người dùng chọn file. Component cha chỉ nhận URL Cloudinary hoàn chỉnh,
    // vì vậy có thể dùng component này cho Menu, avatar và các module khác.
    setUploading(true)
    setError('')
    try {
      const response = await mediaService.uploadImage(file, folder)
      // Không lưu File/base64 vào form; database chỉ cần lưu secure URL do Cloudinary trả về.
      onChange(response.data.url)
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'Unable to upload image')
    } finally {
      setUploading(false)
      // Reset input để sự kiện change vẫn chạy nếu người dùng chọn lại đúng file vừa chọn.
      event.target.value = ''
    }
  }

  return (
    <div className="image-uploader">
      <span className="image-uploader__label">{label}</span>
      <div className="image-uploader__body">
        {value ? <img src={value} alt={`${label} preview`} /> : <div className="image-uploader__placeholder"><ImagePlus size={24} /></div>}
        <div className="image-uploader__actions">
          <label className="image-uploader__button">
            <ImagePlus size={16} /> {uploading ? 'Uploading...' : value ? 'Replace image' : 'Upload image'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={uploading} />
          </label>
          {value && <button type="button" onClick={() => onChange('')} disabled={uploading}><Trash2 size={15} /> Remove</button>}
          <small>JPEG, PNG, WebP or GIF. Maximum 10 MB.</small>
        </div>
      </div>
      {error && <small className="image-uploader__error">{error}</small>}
    </div>
  )
}

export default ImageUploader
