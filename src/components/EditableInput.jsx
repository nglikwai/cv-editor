import React, { useRef, useLayoutEffect } from 'react'

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

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    // Collapse to 1px first to force a full reflow, then measure true scroll height
    textarea.style.height = '1px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [value])

  const handleChange = (e) => {
    const textarea = e.target
    textarea.style.height = '1px'
    textarea.style.height = `${textarea.scrollHeight}px`
    onChange(e.target.value)
  }

  return (
    <textarea
      ref={textareaRef}
      className={`editable-textarea border border-transparent bg-transparent font-[inherit] text-inherit w-full px-0.5 pt-0 pb-[5px] resize-none overflow-hidden transition-colors duration-150 leading-tight rounded-sm hover:bg-golden-yellow/10 hover:border-golden-yellow/50 focus:outline-none focus:border-golden-yellow focus:bg-golden-yellow/10 ${className}`}
      value={value || ''}
      placeholder={placeholder}
      onChange={handleChange}
      rows={1}
    />
  )
}
