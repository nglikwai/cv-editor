import React from 'react'
import { EditableTextarea } from './EditableInput'

export const Summary = ({ summary, updateField }) => {
  return (
    <div className="cv-section pt-5 pb-4 px-8">
      <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
        <span className="shrink-0">Professional Summary</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div className="text-[15px] text-text-dark leading-[1.65]">
        <EditableTextarea
          value={summary}
          onChange={(v) => updateField('summary', v)}
          placeholder="Enter your professional summary..."
          rows={3}
          className="text-[15px] leading-[1.65]"
        />
      </div>
    </div>
  )
}
