import React, { useRef, useEffect } from 'react'

export const EditableInput = ({ value, onChange, className = '', placeholder = '' }) => {
  return (
    <input
      type="text"
      className={`editable-input border border-transparent bg-transparent font-[inherit] text-inherit px-0.5 py-0 transition-colors duration-150 leading-[inherit] rounded-sm hover:bg-golden-yellow/10 hover:border-golden-yellow/50 focus:outline-none focus:border-golden-yellow focus:bg-golden-yellow/10 ${className}`}
      style={{ fieldSizing: 'content' }}
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export const EditableTextarea = ({ value, onChange, className = '', placeholder = '' }) => {
  const textareaRef = useRef(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  }, [value])

  const handleChange = (e) => {
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
    onChange(e.target.value)
  }

  return (
    <textarea
      ref={textareaRef}
      className={`editable-textarea border border-transparent bg-transparent font-[inherit] text-inherit w-full px-0.5 py-0 resize-none transition-colors duration-150 leading-tight overflow-hidden rounded-sm hover:bg-golden-yellow/10 hover:border-golden-yellow/50 focus:outline-none focus:border-golden-yellow focus:bg-golden-yellow/10 ${className}`}
      style={{ fieldSizing: 'content' }}
      value={value || ''}
      placeholder={placeholder}
      onChange={handleChange}
      rows={1}
    />
  )
}
