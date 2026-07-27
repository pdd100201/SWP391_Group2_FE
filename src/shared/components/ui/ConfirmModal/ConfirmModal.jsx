import { useEffect, useRef } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import './ConfirmModal.css'

function ConfirmModal({ open, title, message, onConfirm, onCancel, loading = false, confirmText = 'Delete', confirmVariant = 'danger' }) {
  const cancelRef = useRef(null)
  const Icon = confirmVariant === 'danger' ? AlertTriangle : CheckCircle

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus()
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open && !loading) onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div className="confirm-modal__backdrop" onClick={!loading ? onCancel : undefined}>
      <div className="confirm-modal__card" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className={`confirm-modal__icon-wrapper confirm-modal__icon-wrapper--${confirmVariant}`}>
          <Icon size={28} />
        </div>

        <h2 id="confirm-title" className="confirm-modal__title">{title || 'Confirm Action'}</h2>
        <p className="confirm-modal__message">{message || 'Are you sure you want to proceed? This action cannot be undone.'}</p>

        <div className="confirm-modal__actions">
          <button
            type="button"
            ref={cancelRef}
            className="confirm-modal__btn confirm-modal__btn--cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`confirm-modal__btn confirm-modal__btn--${confirmVariant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
