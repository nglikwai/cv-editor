import React from 'react'
import { EditableInput } from './EditableInput'

export const Education = ({ education, updateField, showDate = false }) => {
  const handleFieldChange = (index, field, value) => {
    updateField(`education[${index}].${field}`, value)
  }

  if (!education?.length) return null

  return (
    <div className="cv-section cv-education py-4 px-8">
      <h2 className="cv-text-section flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
        <span className="shrink-0">Education</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div className="space-y-2">
        {education.map((edu, index) => {
          const dateDisplay = edu.dateDisplay || [edu.startDate, edu.isCurrent ? 'Present' : edu.endDate]
            .filter((value) => value !== undefined && value !== null && value !== '')
            .join(' - ')
          return (
          <div key={index} className="py-2 px-3 bg-bg-light border-l-2 border-golden-yellow rounded-r">
            <div className="flex items-center justify-between gap-3">
            <div className="cv-configurable-text cv-text-large font-semibold text-base text-deep-blue leading-snug min-w-0">
              <EditableInput
                value={`${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`}
                onChange={(v) => {
                  const match = v.match(/^(.+?)(?: in (.+))?$/)
                  if (match) {
                    handleFieldChange(index, 'degree', match[1])
                    if (match[2]) handleFieldChange(index, 'field', match[2])
                  }
                }}
                className="cv-configurable-text cv-text-large font-semibold text-base"
              />
            </div>
            {showDate && dateDisplay && (
              <div className="cv-text-small text-white bg-deep-blue py-0.5 px-2.5 rounded-full font-medium shrink-0">
                <EditableInput
                  value={dateDisplay}
                  onChange={(v) => handleFieldChange(index, 'dateDisplay', v)}
                  className="cv-text-small w-auto min-w-16 text-white"
                />
              </div>
            )}
            </div>
            <div className="cv-configurable-text cv-text-medium text-[15px] text-text-light mt-0.5">
              <EditableInput
                value={edu.institution}
                onChange={(v) => handleFieldChange(index, 'institution', v)}
                className="cv-configurable-text cv-text-medium text-[15px]"
              />
            </div>
            {edu.notes?.length > 0 && (
              <div className="cv-configurable-text cv-text-small text-xs text-golden-yellow font-semibold italic">
                {edu.notes.join(', ')}
              </div>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
