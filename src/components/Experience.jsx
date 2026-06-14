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
  const experienceToRender = showEmptyExp ? [...experience, { role: '', company: '', location: '', startDate: '', endDate: '' }] : experience

  return (
    <div className="cv-section py-3 px-8">
      <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-2.5">
        <span className="shrink-0">Professional Experience</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div className="space-y-0">
        {experienceToRender.map((exp, expIndex) => {
          const isEmptyTrailer = expIndex >= experience.length
          const highlights = exp.highlights || []
          const showEmptyHighlight = highlights.length > 0 && highlights[highlights.length - 1]?.trim()
          const highlightsToRender = showEmptyHighlight ? [...highlights, ''] : highlights
          const hasNextReal = expIndex < experience.length - 1

          return (
            <div key={expIndex} className={`experience-item flex gap-3${isEmptyTrailer ? ' print:hidden' : ''}`}>
              {/* Timeline */}
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className="w-2 h-2 rounded-full bg-golden-yellow shrink-0" />
                {hasNextReal && <div className="w-px flex-1 bg-golden-yellow/25 mt-1" />}
              </div>
              {/* Content */}
              <div className="flex-1 pb-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-deep-blue leading-tight">
                      <EditableInput
                        value={exp.role}
                        onChange={(v) => handleFieldChange(expIndex, 'role', v)}
                        className="font-semibold text-sm"
                        placeholder={isEmptyTrailer ? 'Add role...' : ''}
                      />
                    </div>
                    <div className="text-xs text-text-light">
                      <EditableInput
                        value={`${exp.company || ''}${exp.location ? `, ${exp.location}` : ''}`}
                        onChange={(v) => {
                          const parts = v.split(', ')
                          handleFieldChange(expIndex, 'company', parts[0])
                          if (parts.length > 1) {
                            handleFieldChange(expIndex, 'location', parts.slice(1).join(', '))
                          }
                        }}
                        className="text-xs text-text-light"
                        placeholder={isEmptyTrailer ? 'Company, Location' : ''}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-white bg-deep-blue py-0.5 px-2.5 rounded-full font-medium shrink-0">
                    <EditableInput
                      value={formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                      onChange={(v) => handleFieldChange(expIndex, 'dateDisplay', v)}
                      className="text-xs text-right w-auto min-w-20 text-white"
                      placeholder={isEmptyTrailer ? 'Date range' : ''}
                    />
                  </div>
                </div>
                {highlightsToRender.length > 0 && (
                  <ul className="mt-1 [&>li]:leading-tight">
                    {highlightsToRender.map((highlight, hIndex) => (
                      <li key={hIndex} className={`pl-4 relative text-sm text-text-dark before:content-['▸'] before:absolute before:left-0 before:top-0 before:text-golden-yellow before:text-sm${hIndex >= highlights.length ? ' print:hidden' : ''}`}>
                        <EditableTextarea
                          value={highlight}
                          onChange={(v) => handleHighlightChange(expIndex, hIndex, v)}
                          className="text-sm leading-tight"
                          placeholder={hIndex >= highlights.length ? 'Add highlight...' : ''}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
