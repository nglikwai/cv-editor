import React from 'react'
import { Header } from './Header'
import { Summary } from './Summary'
import { Experience } from './Experience'
import { Tools } from './Tools'
import { Certifications } from './Certifications'
import { Education } from './Education'
import { Languages } from './Languages'

const KNOWN_KEYS = new Set([
  'meta', 'basics', 'summary', 'skills', 'experience',
  'education', 'languages', 'certificationsAndAffiliations',
  'sectionsOrder', 'notes',
])

export const CVPage = ({ cvData, updateField }) => {
  const toolsKey = Object.keys(cvData).find(
    k => !KNOWN_KEYS.has(k) && cvData[k] !== null && typeof cvData[k] === 'object' && !Array.isArray(cvData[k])
  ) || 'toolsAndTechnologies'

  return (
    <div id="cv-content" className="cv-container w-[210mm] min-h-[297mm] mx-auto my-5 print:my-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] print:shadow-none relative box-border">
      <Header basics={cvData.basics} updateField={updateField} />
      <Summary summary={cvData.summary} updateField={updateField} />
      <Experience experience={cvData.experience} updateField={updateField} />
      <Tools tools={cvData[toolsKey]} dataKey={toolsKey} updateField={updateField} />
      <Certifications certifications={cvData.certificationsAndAffiliations} updateField={updateField} />
      <Education education={cvData.education} updateField={updateField} />
      <Languages languages={cvData.languages} updateField={updateField} />
    </div>
  )
}
