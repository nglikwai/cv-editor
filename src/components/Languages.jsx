import React from 'react'
import { EditableInput } from './EditableInput'

export const Languages = ({ languages, updateField }) => {
  const handleFieldChange = (index, field, value) => {
    updateField(`languages[${index}].${field}`, value)
  }

  if (!languages?.length) return null

  return (
    <div className="cv-section py-3 px-8">
      <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-2.5">
        <span className="shrink-0">Languages</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div className="flex flex-wrap gap-3 text-sm">
        {languages.map((lang, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span className="font-semibold text-deep-blue uppercase tracking-wide">
              <EditableInput
                value={lang.language}
                onChange={(v) => handleFieldChange(index, 'language', v)}
                className="font-semibold text-sm w-auto min-w-10 uppercase tracking-wide"
              />
            </span>
            <span className="text-golden-yellow">&mdash;</span>
            <span className="text-text-light italic">
              <EditableInput
                value={lang.proficiency}
                onChange={(v) => handleFieldChange(index, 'proficiency', v)}
                className="text-sm w-auto min-w-10 italic"
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
