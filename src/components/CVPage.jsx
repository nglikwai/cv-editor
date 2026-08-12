import React from 'react'
import { Header } from './Header'
import { Summary } from './Summary'
import { Experience } from './Experience'
import { Tools } from './Tools'
import { Certifications } from './Certifications'
import { Education } from './Education'
import { Languages } from './Languages'

const KNOWN_KEYS = new Set([
  'meta', 'presentation', 'basics', 'summary', 'skills', 'experience',
  'education', 'languages', 'certificationsAndAffiliations',
  'sectionsOrder', 'notes',
])

export const CV_TEMPLATES = [
  { id: 'classic', name: 'Classic' },
  { id: 'modern', name: 'Modern' },
]

const ModernTemplate = ({ cvData, updateField, toolsKey }) => (
  <>
    <Header basics={cvData.basics} updateField={updateField} multilineHeadline />
    <Summary summary={cvData.summary} updateField={updateField} />
    <Experience experience={cvData.experience} updateField={updateField} />
    <Tools tools={cvData[toolsKey]} dataKey={toolsKey} updateField={updateField} />
    <Certifications certifications={cvData.certificationsAndAffiliations} updateField={updateField} />
    <Education education={cvData.education} updateField={updateField} showDate />
    <Languages languages={cvData.languages} updateField={updateField} />
  </>
)

const ClassicTemplate = ({ cvData, updateField, toolsKey }) => (
  <>
    <div className="classic-hero">
      <Header basics={cvData.basics} updateField={updateField} multilineHeadline />
      <Summary summary={cvData.summary} updateField={updateField} hideHeading />
    </div>
    <main className="classic-body">
      <Experience experience={cvData.experience} updateField={updateField} />
      <Tools tools={cvData[toolsKey]} dataKey={toolsKey} updateField={updateField} sectionTitle="Skills" />
      <Certifications certifications={cvData.certificationsAndAffiliations} updateField={updateField} sectionTitle="Qualifications" />
      <Education education={cvData.education} updateField={updateField} />
      <Languages languages={cvData.languages} updateField={updateField} />
    </main>
  </>
)

const TEMPLATE_COMPONENTS = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
}

export const CVPage = ({ cvData, updateField }) => {
  const toolsKey = Object.keys(cvData).find((key) => (
    !KNOWN_KEYS.has(key) && cvData[key] !== null && typeof cvData[key] === 'object' && !Array.isArray(cvData[key])
  )) || 'toolsAndTechnologies'
  const requestedTemplate = cvData.presentation?.templateId || 'modern'
  const normalizedTemplate = requestedTemplate === 'simple' ? 'classic' : requestedTemplate
  const templateId = TEMPLATE_COMPONENTS[normalizedTemplate] ? normalizedTemplate : 'classic'
  const Template = TEMPLATE_COMPONENTS[templateId]

  return (
    <div
      id="cv-content"
      data-template={templateId}
      className={`cv-container cv-template-${templateId} w-[210mm] min-h-[297mm] mx-auto my-5 print:my-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] print:shadow-none relative box-border`}
    >
      <Template cvData={cvData} updateField={updateField} toolsKey={toolsKey} />
    </div>
  )
}
