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
      <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-deep-blue mb-2.5">
        <span className="shrink-0">Core Skills</span>
        <span className="flex-1 h-px bg-golden-yellow/50" />
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {itemsToRender.map((skill, index) => (
          <span key={index} className={`inline-flex items-center bg-deep-blue/5 py-0.5 px-2.5 rounded-full border border-golden-yellow/40 text-xs font-medium text-text-dark${index >= coreSkills.length ? ' print:hidden' : ''}`}>
            <EditableInput
              value={skill}
              onChange={(v) => handleSkillChange(index, v)}
              className="text-xs w-auto min-w-8 bg-transparent font-medium"
              placeholder={index >= coreSkills.length ? 'Add skill...' : ''}
            />
          </span>
        ))}
      </div>
    </div>
  )
}
