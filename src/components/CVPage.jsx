import React from 'react'
import { Header } from './Header'
import { Summary } from './Summary'
import { Skills } from './Skills'
import { Experience } from './Experience'
import { Tools } from './Tools'
import { Certifications } from './Certifications'
import { Education } from './Education'
import { Languages } from './Languages'

export const CVPage = ({ cvData, updateField }) => {
  return (
    <div id="cv-content" className="cv-container w-[210mm] min-h-[297mm] mx-auto my-5 print:my-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] print:shadow-none relative box-border">
      <Header basics={cvData.basics} updateField={updateField} />
      <Summary summary={cvData.summary} updateField={updateField} />
      <Experience experience={cvData.experience} updateField={updateField} />
      <Skills skills={cvData.skills} updateField={updateField} />
      <Tools tools={cvData.toolsAndTechnologies} updateField={updateField} />
      <Certifications certifications={cvData.certificationsAndAffiliations} updateField={updateField} />
      <Education education={cvData.education} updateField={updateField} />
      <Languages languages={cvData.languages} updateField={updateField} />
    </div>
  )
}
