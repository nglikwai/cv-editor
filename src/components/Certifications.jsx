import React from 'react'
import { EditableInput } from './EditableInput'

export const Certifications = ({ certifications, updateField }) => {
  const handleFieldChange = (index, field, value) => {
    updateField(`certificationsAndAffiliations[${index}].${field}`, value)
  }

  if (!certifications?.length) return null

  const showEmpty = certifications[certifications.length - 1]?.title?.trim()
  const itemsToRender = showEmpty ? [...certifications, { title: '', issuer: '' }] : certifications

  return (
    <div className="cv-section py-5 px-8">
      <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
        <span className="shrink-0">Certifications & Affiliations</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div className="space-y-2">
        {itemsToRender.map((cert, index) => (
          <div key={index} className={`flex justify-between items-center text-base py-1.5 px-2 bg-bg-light rounded${index >= certifications.length ? ' print:hidden' : ''}`}>
            <div className="font-medium text-text-dark">
              <EditableInput
                value={cert.title}
                onChange={(v) => handleFieldChange(index, 'title', v)}
                className="text-base font-medium"
                placeholder={index >= certifications.length ? 'Add certification...' : ''}
              />
            </div>
            {(cert.issuer || index >= certifications.length) && (
              <div className="text-text-light italic text-base">
                <EditableInput
                  value={cert.issuer}
                  onChange={(v) => handleFieldChange(index, 'issuer', v)}
                  className="text-base text-right italic"
                  placeholder={index >= certifications.length ? 'Issuer' : ''}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
