import { formatDateRange } from './dateUtils'

const titleFromKey = (key) => key
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

const compact = (values) => values.filter((value) => value !== null && value !== undefined && String(value).trim())

const renderCategorizedObject = (lines, value) => {
  Object.entries(value || {}).forEach(([category, items]) => {
    if (category === 'sectionTitle' || items === null || items === undefined) return
    lines.push(`### ${titleFromKey(category)}`, '')
    if (Array.isArray(items)) {
      items.forEach((item) => lines.push(`- ${typeof item === 'object' ? compact(Object.values(item)).join(' — ') : item}`))
    } else if (typeof items === 'object') {
      Object.entries(items).forEach(([key, item]) => lines.push(`- **${titleFromKey(key)}:** ${item}`))
    } else {
      lines.push(String(items))
    }
    lines.push('')
  })
}

export const cvToMarkdown = (cv = {}) => {
  const lines = []
  const basics = cv.basics || {}
  const fullName = basics.name?.full || compact([basics.name?.given, basics.name?.family]).join(' ')

  if (fullName) lines.push(`# ${fullName}`, '')
  if (basics.headline) lines.push(`*${basics.headline}*`, '')

  const location = compact([
    basics.location?.city,
    basics.location?.region,
    basics.location?.country,
  ]).join(', ')
  if (location) lines.push(location, '')

  const linkedin = basics.contacts?.linkedin
  const contactItems = compact([
    basics.contacts?.phone,
    basics.contacts?.email,
    linkedin?.url ? `[${linkedin.label || 'LinkedIn'}](${linkedin.url})` : linkedin?.label,
  ])
  if (contactItems.length) lines.push(contactItems.join(' · '), '')

  if (cv.summary) lines.push('## Professional Summary', '', cv.summary, '')

  if (cv.experience?.length) {
    lines.push('## Professional Experience', '')
    cv.experience.forEach((job) => {
      lines.push(`### ${job.role || 'Role'}`)
      const employer = compact([job.company, job.location]).join(' · ')
      const dates = formatDateRange(job.startDate, job.endDate, job.isCurrent)
      if (employer || dates) lines.push(compact([employer && `**${employer}**`, dates]).join(' | '))
      if (job.focus) lines.push('', `*Focus: ${job.focus}*`)
      if (job.highlights?.length) {
        lines.push('')
        job.highlights.forEach((highlight) => {
          if (typeof highlight === 'string') lines.push(`- ${highlight}`)
          else lines.push(`- ${highlight.keyword ? `**${highlight.keyword}:** ` : ''}${highlight.text || ''}`)
        })
      }
      lines.push('')
    })
  }

  if (cv.skills && Object.keys(cv.skills).length) {
    lines.push(`## ${cv.skills.sectionTitle || 'Skills'}`, '')
    renderCategorizedObject(lines, cv.skills)
  }

  const knownKeys = new Set([
    'meta', 'presentation', 'basics', 'summary', 'skills', 'experience', 'education', 'languages',
    'certificationsAndAffiliations', 'sectionsOrder', 'notes', 'clonedFrom',
  ])
  Object.entries(cv).forEach(([key, value]) => {
    if (knownKeys.has(key) || !value || typeof value !== 'object' || Array.isArray(value)) return
    lines.push(`## ${titleFromKey(key)}`, '')
    renderCategorizedObject(lines, value)
  })

  if (cv.certificationsAndAffiliations?.length) {
    lines.push('## Certifications & Affiliations', '')
    cv.certificationsAndAffiliations.forEach((item) => {
      lines.push(`- **${item.title || item.name || 'Credential'}**${item.issuer ? ` — ${item.issuer}` : ''}`)
    })
    lines.push('')
  }

  if (cv.education?.length) {
    lines.push('## Education', '')
    cv.education.forEach((item) => {
      const qualification = compact([item.degree, item.field]).join(', ')
      const years = compact([item.startDate, item.endDate]).join('–')
      lines.push(`- **${qualification || 'Qualification'}**${item.institution ? ` — ${item.institution}` : ''}${years ? ` (${years})` : ''}`)
    })
    lines.push('')
  }

  if (cv.languages?.length) {
    lines.push('## Languages', '')
    cv.languages.forEach((item) => {
      lines.push(`- **${item.language || 'Language'}**${item.proficiency ? ` — ${item.proficiency}` : ''}`)
    })
    lines.push('')
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}
