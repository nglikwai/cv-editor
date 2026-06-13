import React from 'react'
import { EditableTextarea } from './EditableInput'

export const Summary = ({ summary, updateField }) => {
  return (
    <div className="cv-section pt-5 pb-2 px-8">
      <h2 className="text-sm font-bold uppercase text-deep-blue pb-1.5 mb-2 tracking-wide border-b-2 border-golden-yellow flex items-center before:content-[''] before:w-1 before:h-3.5 before:bg-golden-yellow before:mr-2 before:inline-block">
        Professional Summary
      </h2>
      <div className="text-sm text-text-dark leading-snug">
        <EditableTextarea
          value={summary}
          onChange={(v) => updateField('summary', v)}
          placeholder="Enter your professional summary..."
          rows={3}
          className="text-sm leading-snug"
        />
      </div>
    </div>
  )
}
