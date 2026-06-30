import React, { useState, useLayoutEffect, useRef } from 'react'
import { EditableInput } from './EditableInput'
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

const MULTILINE_IDS = (id) => id.startsWith('focus-') || /^\d+-\d+$/.test(id)

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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
  }

  const handleNewHighlight = (expIndex, hIndex, value) => {
    updateField(`experience[${expIndex}].highlights[${hIndex}]`, parseHighlight(value))
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

  const showEmptyExp = experience[experience.length - 1]?.role?.trim()
  const experienceToRender = showEmptyExp
    ? [...experience, { role: '', company: '', location: '', startDate: '', endDate: '' }]
    : experience

  return (
    <div className="cv-section py-4 px-8">
      <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
        <span className="shrink-0">Professional Experience</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div>
        {experienceToRender.map((exp, expIndex) => {
          const isEmptyTrailer = expIndex >= experience.length
          const hasNextReal = expIndex < experience.length - 1
          const highlights = exp.highlights || []
          const lastStr = getHighlightString(highlights[highlights.length - 1])
          const showEmptyHighlight = highlights.length > 0 && lastStr?.trim()
          const highlightsToRender = showEmptyHighlight ? [...highlights, ''] : highlights
          const isPageBreak = expIndex === 1 || expIndex === 3

          const roleId = `role-${expIndex}`
          const dateId = `date-${expIndex}`
          const companyId = `company-${expIndex}`
          const focusId = `focus-${expIndex}`
          const companyDisplay = `${exp.company || ''}${exp.location ? `, ${exp.location}` : ''}`
          const dateDisplay = formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)

          return (
            <div
              key={expIndex}
              className={[
                'experience-item',
                isEmptyTrailer ? 'print:hidden' : '',
                isPageBreak ? 'print:break-before-page' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="flex gap-3">
                {/* Timeline column — hidden in print */}
                <div className="flex flex-col items-center shrink-0 pt-1" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                  <div className="w-2 h-2 rounded-full bg-golden-yellow shrink-0" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
                  {hasNextReal && <div className="w-px flex-1 bg-golden-yellow/25 mt-1" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />}
                </div>

                {/* Content */}
                <div className="flex-1 pb-10 print:pb-4">
                  <div className="flex flex-col gap-[3px]">
                    {/* Role + date row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-[12.75pt] text-deep-blue leading-none">
                        {isEmptyTrailer ? (
                          <EditableInput value={exp.role} onChange={(v) => updateField(`experience[${expIndex}].role`, v)} className="font-semibold text-[12.75pt]" placeholder="Add role..." />
                        ) : editingId === roleId ? (
                          <input {...editProps} className={`${inlineEditClass} w-full`} />
                        ) : (
                          <DisplaySpan id={roleId} value={exp.role} placeholder="Add role..." />
                        )}
                      </div>
                      <div className="text-[9.75pt] text-white bg-deep-blue py-0.5 px-2.5 rounded-full font-medium shrink-0">
                        {isEmptyTrailer ? (
                          <EditableInput value={dateDisplay} onChange={(v) => updateField(`experience[${expIndex}].dateDisplay`, v)} className="text-[9.75pt] w-auto min-w-16 text-white" placeholder="Date range" />
                        ) : editingId === dateId ? (
                          <input {...editProps} className={`${inlineEditClass} text-white min-w-16`} />
                        ) : (
                          <DisplaySpan id={dateId} value={dateDisplay} placeholder="Date range" />
                        )}
                      </div>
                    </div>

                    {/* Company / location */}
                    <div className="text-[10.5pt] text-text-light leading-none">
                      {isEmptyTrailer ? (
                        <EditableInput
                          value={companyDisplay}
                          onChange={(v) => {
                            const parts = v.split(', ')
                            updateField(`experience[${expIndex}].company`, parts[0])
                            if (parts.length > 1) updateField(`experience[${expIndex}].location`, parts.slice(1).join(', '))
                          }}
                          className="text-[10.5pt] text-text-light"
                          placeholder="Company, Location"
                        />
                      ) : editingId === companyId ? (
                        <input {...editProps} className={`${inlineEditClass} w-full`} />
                      ) : (
                        <DisplaySpan id={companyId} value={companyDisplay} placeholder="Company, Location" />
                      )}
                    </div>

                    {/* Focus */}
                    {!isEmptyTrailer && (
                      <div className={`mt-2 text-[9.75pt] text-text-light italic leading-snug ${!exp.focus && editingId !== focusId ? 'print:hidden' : ''}`}>
                        {editingId === focusId ? (
                          <textarea {...editProps} className={blockEditClass} rows={1} />
                        ) : (
                          <DisplaySpan id={focusId} value={exp.focus} placeholder="Add focus...">
                            {exp.focus ? <>Focus: {exp.focus}</> : <span className="opacity-30">Add focus...</span>}
                          </DisplaySpan>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Highlights */}
                  {highlightsToRender.length > 0 && (
                    <ul className="mt-2 space-y-2">
                      {highlightsToRender.map((highlight, hIndex) => {
                        const isTrailer = hIndex >= highlights.length
                        const id = `${expIndex}-${hIndex}`
                        const isEditing = editingId === id

                        return (
                          <li
                            key={hIndex}
                            className={[
                              "pl-4 relative text-[10.5pt] text-text-dark leading-[1.6]",
                              "before:content-['▸'] before:absolute before:left-0 before:top-0 before:text-golden-yellow before:text-[10.5pt]",
                              isTrailer ? 'print:hidden' : '',
                            ].filter(Boolean).join(' ')}
                          >
                            {isTrailer ? (
                              <textarea
                                value=""
                                onChange={(e) => handleNewHighlight(expIndex, hIndex, e.target.value)}
                                className={`${blockEditClass} border-transparent placeholder:text-text-dark/30`}
                                placeholder="Add highlight..."
                                rows={1}
                              />
                            ) : isEditing ? (
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
