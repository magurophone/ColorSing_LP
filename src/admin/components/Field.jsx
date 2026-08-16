import { useId } from 'react'

const Field = ({ label, value, onChange, placeholder, description }) => {
  const inputId = useId()
  const descriptionId = description ? `${inputId}-description` : undefined
  return (
    <div className="mb-5">
      <label htmlFor={inputId} className="block text-sm font-body text-light-blue mb-1">{label}</label>
      {description && <p id={descriptionId} className="text-xs text-gray-500 mb-1">{description}</p>}
      <input
        id={inputId}
        aria-describedby={descriptionId}
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 glass-effect border border-light-blue/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber transition-all text-sm"
      />
    </div>
  )
}

export default Field
