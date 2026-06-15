import './LoadingSpinner.css'

function LoadingSpinner({ overlay = false }) {
  if (overlay) {
    return (
      <div className="loading-spinner__overlay">
        <div className="loading-spinner__ring" role="status" aria-label="Loading">
          <div /><div /><div /><div />
        </div>
      </div>
    )
  }

  return (
    <div className="loading-spinner__inline">
      <div className="loading-spinner__ring" role="status" aria-label="Loading">
        <div /><div /><div /><div />
      </div>
    </div>
  )
}

export default LoadingSpinner
