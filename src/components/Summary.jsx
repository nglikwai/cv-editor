import React, { useState, useLayoutEffect, useRef } from 'react'

export const Summary = ({ summary, updateField }) => {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(summary || '')
  const editRef = useRef(null)

  useLayoutEffect(() => {
    const el = editRef.current
    if (!el) return
    el.focus()
    el.select()
    el.style.height = '1px'
    el.style.height = `${el.scrollHeight}px`
  }, [editing])

  const commit = () => {
    updateField('summary', value)
    setEditing(false)
  }

  const handleChange = (e) => {
    const el = e.target
    el.style.height = '1px'
    el.style.height = `${el.scrollHeight}px`
    setValue(el.value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setValue(summary || ''); setEditing(false) }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() }
  }

  // Keep local value in sync if parent changes
  if (!editing && value !== summary) setValue(summary || '')

  return (
    <div className="cv-section pt-8 pb-2 px-8">
      <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
        <span className="shrink-0">Professional Summary</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div className="text-[14px] text-text-dark leading-[1.6]">
        {editing ? (
          <textarea
            ref={editRef}
            value={value}
            onChange={handleChange}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border border-golden-yellow/70 rounded-sm px-0.5 resize-none overflow-hidden focus:outline-none focus:border-golden-yellow font-[inherit] text-inherit leading-[inherit]"
            rows={1}
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={`cursor-text select-text ${!summary ? 'opacity-30' : ''}`}
          >
            {summary || 'Enter your professional summary...'}
          </span>
        )}
      </div>
    </div>
  )
}
