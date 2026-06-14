function InputField({
  icon: Icon,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  ariaLabel,
  autoComplete,
  passwordToggle,
}) {
  return (
    <div className={`input-field-wrapper auth-screen__field ${passwordToggle ? 'auth-screen__field--password' : ''}`}>
      {Icon && <Icon className="input-field-icon auth-screen__field-icon" aria-hidden="true" />}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        autoComplete={autoComplete}
      />
      {passwordToggle}
    </div>
  )
}

export default InputField
