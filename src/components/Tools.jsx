import React from 'react'
import { EditableInput } from './EditableInput'

const categoryLabels = {
  dcsScada: 'DCS/SCADA',
  plcPlatforms: 'PLC Platforms',
  documentation: 'Documentation',
  cyberFocus: 'Cyber Focus'
}

export const Tools = ({ tools, updateField }) => {
  if (!tools || Object.keys(tools).length === 0) return null

  const handleToolChange = (category, index, value) => {
    updateField(`toolsAndTechnologies.${category}[${index}]`, value)
  }

  return (
    <div className="cv-section py-3 px-8">
      <h2 className="text-sm font-bold uppercase text-deep-blue pb-1.5 mb-2 tracking-wide border-b-2 border-golden-yellow flex items-center before:content-[''] before:w-1 before:h-3.5 before:bg-golden-yellow before:mr-2 before:inline-block">
        Tools & Technologies
      </h2>
      <div className="space-y-0.5">
        {Object.entries(tools).map(([category, items]) => {
          const showEmpty = items?.[items.length - 1]?.trim()
          const itemsToRender = showEmpty ? [...items, ''] : (items || [])

          return (
            <div key={category} className="text-sm leading-snug flex gap-2">
              <p className="font-semibold shrink-0 text-deep-blue uppercase text-xs tracking-wide w-32">{categoryLabels[category] || category}: </p>
              <p className="text-text-dark">
                {itemsToRender.map((item, index) => (
                  <span key={index} className={index >= (items?.length || 0) ? 'print:hidden' : undefined}>
                    {index > 0 && <span className="text-text-light">, </span>}
                    <EditableInput
                      value={item}
                      onChange={(value) => handleToolChange(category, index, value)}
                      className="inline text-sm text-text-dark"
                      placeholder={index >= (items?.length || 0) ? 'Add...' : ''}
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
