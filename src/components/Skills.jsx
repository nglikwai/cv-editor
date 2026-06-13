import React from 'react'
import { EditableInput } from './EditableInput'

export const Skills = ({ skills, updateField }) => {
  const handleSkillChange = (index, value) => {
    updateField(`skills.core[${index}]`, value)
  }

  if (!skills?.core?.length) return null

  const coreSkills = skills.core
  const showEmpty = coreSkills[coreSkills.length - 1]?.trim()
  const itemsToRender = showEmpty ? [...coreSkills, ''] : coreSkills

  return (
    <div className="cv-section py-3 px-8">
      <h2 className="text-sm font-bold uppercase text-deep-blue pb-1.5 mb-2 tracking-wide border-b-2 border-golden-yellow flex items-center before:content-[''] before:w-1 before:h-3.5 before:bg-golden-yellow before:mr-2 before:inline-block">
        Core Skills
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {itemsToRender.map((skill, index) => (
          <span key={index} className={`inline-flex items-center bg-bg-light py-1 px-2 rounded border-l-2 border-golden-yellow text-sm font-medium text-text-dark${index >= coreSkills.length ? ' print:hidden' : ''}`}>
            <EditableInput
              value={skill}
              onChange={(v) => handleSkillChange(index, v)}
              className="text-sm w-auto min-w-8 bg-transparent font-medium"
              placeholder={index >= coreSkills.length ? 'Add skill...' : ''}
            />
          </span>
        ))}
      </div>
    </div>
  )
}
