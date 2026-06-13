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
    <div className="cv-section py-3 px-8">
      <h2 className="text-sm font-bold uppercase text-deep-blue pb-1.5 mb-2 tracking-wide border-b-2 border-golden-yellow flex items-center before:content-[''] before:w-1 before:h-3.5 before:bg-golden-yellow before:mr-2 before:inline-block">
        Certifications & Affiliations
      </h2>
      <div className="space-y-1">
        {itemsToRender.map((cert, index) => (
          <div key={index} className={`flex justify-between items-center text-sm py-1 px-2 bg-bg-light rounded${index >= certifications.length ? ' print:hidden' : ''}`}>
            <div className="font-medium text-text-dark">
              <EditableInput
                value={cert.title}
                onChange={(v) => handleFieldChange(index, 'title', v)}
                className="text-sm font-medium"
                placeholder={index >= certifications.length ? 'Add certification...' : ''}
              />
            </div>
            {(cert.issuer || index >= certifications.length) && (
              <div className="text-text-light italic text-sm">
                <EditableInput
                  value={cert.issuer}
                  onChange={(v) => handleFieldChange(index, 'issuer', v)}
                  className="text-sm text-right italic"
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
