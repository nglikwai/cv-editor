import React from 'react'
import { EditableInput } from './EditableInput'

const categoryLabels = {
  dcsScada: 'DCS/SCADA',
  plcPlatforms: 'PLC Platforms',
  documentation: 'Documentation',
  cyberFocus: 'Cyber Focus',
}

export const Tools = ({ tools, dataKey = 'toolsAndTechnologies', updateField }) => {
  if (!tools || Object.keys(tools).length === 0) return null

  const handleToolChange = (category, index, value) => {
    updateField(`${dataKey}.${category}[${index}]`, value)
  }

  return (
    <div className="cv-section pt-1 pb-4 px-8">
      <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
        <span className="shrink-0">Selected Expertise &amp; Technologies</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div className="space-y-2.5">
        {Object.entries(tools).map(([category, items]) => {
          const showEmpty = items?.[items.length - 1]?.trim()
          const itemsToRender = showEmpty ? [...items, ''] : (items || [])

          return (
            <div key={category} className="text-base leading-[1.15] flex gap-2">
              <p className="font-semibold shrink-0 text-deep-blue uppercase text-xs tracking-wide w-36">
                {categoryLabels[category] || category}:{' '}
              </p>
              <p className="text-text-dark">
                {itemsToRender.map((item, index) => (
                  <span key={index} className={index >= (items?.length || 0) ? 'print:hidden' : undefined}>
                    {index > 0 && <span className="text-text-light">, </span>}
                    <EditableInput
                      value={item}
                      onChange={(value) => handleToolChange(category, index, value)}
                      className="inline text-base text-text-dark"
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
