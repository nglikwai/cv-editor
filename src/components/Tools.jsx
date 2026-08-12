import React from 'react'
import { EditableInput } from './EditableInput'

const categoryLabels = {
  dcsScada: 'DCS/SCADA',
  plcPlatforms: 'PLC Platforms',
  documentation: 'Documentation',
  cyberFocus: 'Cyber Focus',
}

export const Tools = ({ tools, dataKey = 'toolsAndTechnologies', updateField, sectionTitle = 'Selected Expertise & Technologies' }) => {
  if (!tools || Object.keys(tools).length === 0) return null

  const handleToolChange = (category, index, value) => {
    updateField(`${dataKey}.${category}[${index}]`, value)
  }

  return (
    <div className="cv-section cv-tools py-4 px-8">
      <h2 className="cv-text-section flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
        <span className="shrink-0">{sectionTitle}</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div className="cv-skill-list">
        {Object.entries(tools).map(([category, items]) => {
          return (
            <div key={category} className="cv-configurable-text cv-text-large text-base leading-[1.5] flex gap-2">
              <p className="font-semibold shrink-0 text-deep-blue uppercase text-xs tracking-wide w-36">
                {categoryLabels[category] || category}:{' '}
              </p>
              <p className="text-text-dark">
                {(items || []).map((item, index) => (
                  <span key={index}>
                    {index > 0 && <span className="text-text-light">, </span>}
                    <EditableInput
                      value={item}
                      onChange={(value) => handleToolChange(category, index, value)}
                      className="cv-configurable-text cv-text-large inline text-base text-text-dark"
                    />
                  </span>
                ))}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
