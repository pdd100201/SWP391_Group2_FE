import { ImagePlus, Link, X } from 'lucide-react'
import './ImageUploader.css'

function ImageUploader({ label = 'Image', value = '', onChange }) {
  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => onChange?.(reader.result || '')
    reader.readAsDataURL(file)
  }

  return (
    <div className="image-uploader">
      <span className="image-uploader__label">{label}</span>
      <div className="image-uploader__body">
        <div className="image-uploader__preview">
          {value ? (
            <img src={value} alt={`${label} preview`} />
          ) : (
            <ImagePlus size={28} />
          )}
        </div>
        <div className="image-uploader__controls">
          <label className="image-uploader__file">
            <ImagePlus size={16} />
            <span>Choose image</span>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>
          <label className="image-uploader__url">
            <Link size={15} />
            <input
              value={value || ''}
              onChange={(event) => onChange?.(event.target.value)}
              placeholder="Paste image URL"
            />
          </label>
          {value ? (
            <button type="button" className="image-uploader__clear" onClick={() => onChange?.('')}>
              <X size={15} /> Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default ImageUploader
