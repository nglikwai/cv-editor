import React from 'react'
import { EditableInput } from './EditableInput'

export const Education = ({ education, updateField }) => {
  const handleFieldChange = (index, field, value) => {
    updateField(`education[${index}].${field}`, value)
  }

  if (!education?.length) return null

  return (
    <div className="cv-section py-3 px-8">
      <h2 className="text-sm font-bold uppercase text-deep-blue pb-1.5 mb-2 tracking-wide border-b-2 border-golden-yellow flex items-center before:content-[''] before:w-1 before:h-3.5 before:bg-golden-yellow before:mr-2 before:inline-block">
        Education
      </h2>
      <div className="space-y-2">
        {education.map((edu, index) => (
          <div key={index} className="py-1.5 px-2 bg-bg-light border-l-2 border-golden-yellow rounded-r">
            <div className="font-semibold text-sm text-deep-blue leading-tight">
              <EditableInput
                value={`${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`}
                onChange={(v) => {
                  const match = v.match(/^(.+?)(?: in (.+))?$/)
                  if (match) {
                    handleFieldChange(index, 'degree', match[1])
                    if (match[2]) handleFieldChange(index, 'field', match[2])
                  }
                }}
                className="font-semibold text-sm"
              />
            </div>
            <div className="text-sm text-text-light">
              <EditableInput
                value={edu.institution}
                onChange={(v) => handleFieldChange(index, 'institution', v)}
                className="text-sm"
              />
            </div>
            {edu.notes?.length > 0 && (
              <div className="text-xs text-golden-yellow font-semibold italic">
                {edu.notes.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
