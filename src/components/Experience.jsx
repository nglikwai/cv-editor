import React from 'react'
import { EditableInput, EditableTextarea } from './EditableInput'
import { formatDateRange } from '../utils/dateUtils'

export const Experience = ({ experience, updateField }) => {
  const handleFieldChange = (expIndex, field, value) => {
    updateField(`experience[${expIndex}].${field}`, value)
  }

  const handleHighlightChange = (expIndex, highlightIndex, value) => {
    updateField(`experience[${expIndex}].highlights[${highlightIndex}]`, value)
  }

  if (!experience?.length) return null

  const showEmptyExp = experience[experience.length - 1]?.role?.trim()
  const experienceToRender = showEmptyExp
    ? [...experience, { role: '', company: '', location: '', startDate: '', endDate: '' }]
    : experience

  return (
    <div className="cv-section py-5 px-8">
      <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
        <span className="shrink-0">Professional Experience</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div>
        {experienceToRender.map((exp, expIndex) => {
          const isEmptyTrailer = expIndex >= experience.length
          const hasNextReal = expIndex < experience.length - 1
          const highlights = exp.highlights || []
          const showEmptyHighlight = highlights.length > 0 && highlights[highlights.length - 1]?.trim()
          const highlightsToRender = showEmptyHighlight ? [...highlights, ''] : highlights
          const isPageBreak = expIndex === 1 || expIndex === 3

          return (
            <div
              key={expIndex}
              className={[
                'experience-item',
                isEmptyTrailer ? 'print:hidden' : '',
                isPageBreak ? 'print:break-before-page' : '',
              ].filter(Boolean).join(' ')}
            >
              {/*
                Screen: flex so the timeline dot column sits beside content normally.
                Print:  block so every job is a clean block element — no flex
                        stacking-context issues that reorder text selection or split jobs.
              */}
              <div className="flex gap-3 print:block">
                {/* Timeline column — hidden in print (not needed without flex) */}
                <div className="flex flex-col items-center shrink-0 pt-1 print:hidden">
                  <div className="w-2 h-2 rounded-full bg-golden-yellow shrink-0" />
                  {hasNextReal && <div className="w-px flex-1 bg-golden-yellow/25 mt-1" />}
                </div>

                {/* Content — break-inside-avoid keeps each job together on print */}
                <div className="flex-1 pb-6 print:pb-4">
                  {/* Job header — compact vertical stack, date aligned with title */}
                  <div className="flex flex-col gap-[3px]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-[17px] text-deep-blue leading-none">
                        <EditableInput
                          value={exp.role}
                          onChange={(v) => handleFieldChange(expIndex, 'role', v)}
                          className="font-semibold text-[17px]"
                          placeholder={isEmptyTrailer ? 'Add role...' : ''}
                        />
                      </div>
                      <div className="text-[13px] text-white bg-deep-blue py-0.5 px-2.5 rounded-full font-medium shrink-0">
                        <EditableInput
                          value={formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                          onChange={(v) => handleFieldChange(expIndex, 'dateDisplay', v)}
                          className="text-[13px] w-auto min-w-16 text-white"
                          placeholder={isEmptyTrailer ? 'Date range' : ''}
                        />
                      </div>
                    </div>
                    <div className="text-[15px] text-text-light leading-none">
                      <EditableInput
                        value={`${exp.company || ''}${exp.location ? `, ${exp.location}` : ''}`}
                        onChange={(v) => {
                          const parts = v.split(', ')
                          handleFieldChange(expIndex, 'company', parts[0])
                          if (parts.length > 1) {
                            handleFieldChange(expIndex, 'location', parts.slice(1).join(', '))
                          }
                        }}
                        className="text-[15px] text-text-light"
                        placeholder={isEmptyTrailer ? 'Company, Location' : ''}
                      />
                    </div>
                  </div>

                  {highlightsToRender.length > 0 && (
                    <ul className="mt-3 space-y-3">
                      {highlightsToRender.map((highlight, hIndex) => (
                        <li
                          key={hIndex}
                          className={[
                            "pl-4 relative text-[15px] text-text-dark leading-[1.6]",
                            "before:content-['▸'] before:absolute before:left-0 before:top-0 before:text-golden-yellow before:text-[15px]",
                            hIndex >= highlights.length ? 'print:hidden' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          <EditableTextarea
                            value={highlight}
                            onChange={(v) => handleHighlightChange(expIndex, hIndex, v)}
                            className="text-[15px] leading-[1.6]"
                            placeholder={hIndex >= highlights.length ? 'Add highlight...' : ''}
                          />
                        </li>
                      ))}
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
