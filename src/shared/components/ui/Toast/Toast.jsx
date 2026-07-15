import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { ToastContext } from './ToastContext'
import './Toast.css'

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true)
    }, 3000)
    return () => clearTimeout(timerRef.current)
  }, [])

  const handleClose = () => {
    clearTimeout(timerRef.current)
    setExiting(true)
  }

  const handleAnimationEnd = () => {
    if (exiting) onRemove(toast.id)
  }

  const Icon = toast.type === 'success' ? CheckCircle : XCircle

  return (
    <div
      className={`toast-item toast-item--${toast.type} ${exiting ? 'toast-item--exit' : ''}`}
      role="alert"
      onAnimationEnd={handleAnimationEnd}
    >
      <Icon size={20} className="toast-item__icon" />
      <span className="toast-item__message">{toast.message}</span>
      <button type="button" className="toast-item__close" onClick={handleClose} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const showToast = useCallback((message, type = 'success') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
