import React, { useState, useLayoutEffect, useRef } from 'react'
import { formatDateRange } from '../utils/dateUtils'

const getHighlightString = (highlight) => {
  if (!highlight) return ''
  if (typeof highlight === 'string') return highlight
  return `${highlight.keyword}: ${highlight.text}`
}

const parseHighlight = (value) => {
  const colonIdx = value.indexOf(': ')
  if (colonIdx > -1) {
    return { keyword: value.slice(0, colonIdx), text: value.slice(colonIdx + 2) }
  }
  return value
}

const HighlightDisplay = ({ highlight }) => {
  if (!highlight || typeof highlight === 'string') return <span>{highlight}</span>
  return (
    <span>
      <span className="font-semibold text-deep-blue">{highlight.keyword}:</span>
      {' '}
      {highlight.text}
    </span>
  )
}

export const Experience = ({ experience, updateField }) => {
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const editRef = useRef(null)

  useLayoutEffect(() => {
    const el = editRef.current
    if (!el) return
    el.focus()
    el.select()
    if (el.tagName === 'TEXTAREA') {
      el.style.height = '1px'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [editingId])

  const startEdit = (id, value) => {
    setEditingId(id)
    setEditingValue(value)
  }

  const commitEdit = () => {
    if (!editingId) return
    if (editingId.startsWith('role-')) {
      const i = parseInt(editingId.slice(5))
      updateField(`experience[${i}].role`, editingValue)
    } else if (editingId.startsWith('date-')) {
      const i = parseInt(editingId.slice(5))
      updateField(`experience[${i}].dateDisplay`, editingValue)
    } else if (editingId.startsWith('company-')) {
      const i = parseInt(editingId.slice(8))
      const parts = editingValue.split(', ')
      updateField(`experience[${i}].company`, parts[0])
      if (parts.length > 1) updateField(`experience[${i}].location`, parts.slice(1).join(', '))
    } else if (editingId.startsWith('focus-')) {
      const i = parseInt(editingId.slice(6))
      updateField(`experience[${i}].focus`, editingValue)
    } else {
      const [expIdx, hIdx] = editingId.split('-').map(Number)
      updateField(`experience[${expIdx}].highlights[${hIdx}]`, parseHighlight(editingValue))
    }
    setEditingId(null)
  }

  const handleEditChange = (e) => {
    const el = e.target
    if (el.tagName === 'TEXTAREA') {
      el.style.height = '1px'
      el.style.height = `${el.scrollHeight}px`
    }
    setEditingValue(el.value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setEditingId(null)
    if (e.key === 'Enter' && !e.shiftKey && !editingId?.startsWith('focus-')) {
      e.preventDefault()
      commitEdit()
    }
  }

  const editProps = {
    ref: editRef,
    value: editingValue,
    onChange: handleEditChange,
    onBlur: commitEdit,
    onKeyDown: handleKeyDown,
  }

  const inlineEditClass = "bg-transparent border border-golden-yellow/70 rounded-sm px-0.5 focus:outline-none focus:border-golden-yellow font-[inherit] text-inherit"
  const blockEditClass = "w-full bg-transparent border border-golden-yellow/70 rounded-sm px-0.5 resize-none overflow-hidden focus:outline-none focus:border-golden-yellow font-[inherit] text-inherit leading-[inherit]"

  const DisplaySpan = ({ id, value, className = '', placeholder = '', children }) => (
    <span
      onDoubleClick={() => startEdit(id, value)}
      className={`cursor-text select-text ${className} ${!value ? 'opacity-30' : ''}`}
    >
      {children || value || placeholder}
    </span>
  )

  if (!experience?.length) return null

  return (
    <div className="cv-section cv-experience py-4 px-8">
      <h2 className="cv-text-section flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
        <span className="shrink-0">Professional Experience</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div>
        {experience.map((exp, expIndex) => {
          const hasNextReal = expIndex < experience.length - 1
          const highlights = exp.highlights || []

          const roleId = `role-${expIndex}`
          const dateId = `date-${expIndex}`
          const companyId = `company-${expIndex}`
          const focusId = `focus-${expIndex}`
          const companyDisplay = `${exp.company || ''}${exp.location ? `, ${exp.location}` : ''}`
          const dateDisplay = exp.dateDisplay || formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)

          return (
            <div
              key={expIndex}
              className="experience-item"
            >
              <div className="flex gap-3">
                {/* Timeline column — hidden in print */}
                <div className="experience-timeline flex flex-col items-center shrink-0 pt-1" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                  <div className="w-2 h-2 rounded-full bg-golden-yellow shrink-0" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
                  {hasNextReal && <div className="w-px flex-1 bg-golden-yellow/25 mt-1" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />}
                </div>

                {/* Content */}
                <div className={`experience-content flex-1 ${hasNextReal ? 'cv-job-spacing' : ''}`}>
                  <div className="flex flex-col gap-[3px]">
                    {/* Role + date row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="cv-text-role font-semibold text-[12.75pt] text-deep-blue leading-none">
                        {editingId === roleId ? (
                          <input {...editProps} className={`${inlineEditClass} w-full`} />
                        ) : (
                          <DisplaySpan id={roleId} value={exp.role} placeholder="Add role..." />
                        )}
                      </div>
                      <div className="cv-text-small text-[9.75pt] text-white bg-deep-blue py-0.5 px-2.5 rounded-full font-medium shrink-0">
                        {editingId === dateId ? (
                          <input {...editProps} className={`${inlineEditClass} text-white min-w-16`} />
                        ) : (
                          <DisplaySpan id={dateId} value={dateDisplay} placeholder="Date range" />
                        )}
                      </div>
                    </div>

                    {/* Company / location */}
                    <div className="cv-configurable-text cv-text-base text-[10.5pt] text-text-light leading-none">
                      {editingId === companyId ? (
                        <input {...editProps} className={`${inlineEditClass} w-full`} />
                      ) : (
                        <DisplaySpan id={companyId} value={companyDisplay} placeholder="Company, Location" />
                      )}
                    </div>

                    {/* Focus */}
                    <div className={`cv-experience-focus cv-configurable-text cv-text-small text-[9.75pt] text-text-light italic leading-snug whitespace-pre-wrap ${!exp.focus && editingId !== focusId ? 'print:hidden' : ''}`}>
                        {editingId === focusId ? (
                          <textarea {...editProps} className={blockEditClass} rows={1} />
                        ) : (
                          <DisplaySpan id={focusId} value={exp.focus} placeholder="Add focus...">
                            {exp.focus ? <>Focus: {exp.focus}</> : <span className="opacity-30">Add focus...</span>}
                          </DisplaySpan>
                        )}
                    </div>
                  </div>

                  {/* Highlights */}
                  {highlights.length > 0 && (
                    <ul className="cv-job-item-spacing mt-2">
                      {highlights.map((highlight, hIndex) => {
                        const id = `${expIndex}-${hIndex}`
                        const isEditing = editingId === id

                        return (
                          <li
                            key={hIndex}
                            className="cv-configurable-text cv-text-base pl-4 relative text-[10.5pt] text-text-dark leading-[1.6] before:content-['▸'] before:absolute before:left-0 before:top-0 before:text-golden-yellow before:text-[10.5pt]"
                          >
                            {isEditing ? (
                              <textarea {...editProps} className={blockEditClass} rows={1} />
                            ) : (
                              <span
                                onDoubleClick={() => startEdit(id, getHighlightString(highlight))}
                                className="cursor-text select-text"
                              >
                                <HighlightDisplay highlight={highlight} />
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
