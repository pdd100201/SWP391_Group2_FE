function Button({
  type = 'button',
  variant = 'primary',
  disabled = false,
  onClick,
  children,
  className = '',
}) {
  const variantClass = variant === 'secondary' ? 'auth-screen__secondary-button' : 'auth-screen__primary-button'

  return (
    <button type={type} className={`${variantClass} ${className}`.trim()} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

export default Button
