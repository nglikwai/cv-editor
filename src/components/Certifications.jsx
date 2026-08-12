import React from 'react'
import { EditableInput } from './EditableInput'

export const Certifications = ({ certifications, updateField, sectionTitle = 'Certifications & Affiliations' }) => {
  const handleFieldChange = (index, field, value) => {
    updateField(`certificationsAndAffiliations[${index}].${field}`, value)
  }

  if (!certifications?.length) return null

  return (
    <div className="cv-section cv-certifications py-4 px-8">
      <h2 className="cv-text-section flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
        <span className="shrink-0">{sectionTitle}</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div className="cv-certification-list">
        {certifications.map((cert, index) => (
          <div key={index} className="cv-configurable-text cv-text-large flex justify-between items-center text-base py-1.5 px-2 bg-bg-light rounded">
            <div className="font-medium text-text-dark">
              <EditableInput
                value={cert.title}
                onChange={(v) => handleFieldChange(index, 'title', v)}
                className="cv-configurable-text cv-text-large text-base font-medium"
              />
            </div>
            {cert.issuer && (
              <div className="text-text-light italic text-base">
                <EditableInput
                  value={cert.issuer}
                  onChange={(v) => handleFieldChange(index, 'issuer', v)}
                  className="cv-configurable-text cv-text-large text-base text-right italic"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
