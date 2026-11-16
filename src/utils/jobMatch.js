export const MATCH_CATEGORIES = ['Hard skills', 'Soft skills', 'Qualifications']
export const MATCH_STATES = { evidenced: { label: 'Evidenced', value: 1 }, transferable: { label: 'Transferable', value: 0.5 }, gap: { label: 'Not evidenced', value: 0 } }
export const MAX_DESCRIPTION_LENGTH = 20000
const weights = { 'Hard skills': 2, 'Soft skills': 1, Qualifications: 2 }

export const validateJobProfile = (profile) => {
  if (!profile || typeof profile.title !== 'string' || !profile.title.trim()) throw new Error('Enter a job title.')
  // A job can be saved with only its description; keywords can follow later.
  const items = profile.requirements ?? []
  if (!Array.isArray(items) || items.length > 40) throw new Error('Add up to 40 job requirements.')
  const requirements = items.map((item) => {
    // The evidence rating is optional: the ATS score only needs the keyword.
    const state = item?.state ?? 'gap'
    if (!item?.label?.trim() || !MATCH_CATEGORIES.includes(item.category) || !MATCH_STATES[state]) throw new Error('Complete the keyword and category for every requirement.')
    if (state !== 'gap' && !item.evidence?.trim()) throw new Error('Add a short quote from the CV for evidenced or transferable requirements.')
    const aliases = Array.isArray(item.aliases)
      ? [...new Set(item.aliases.filter((alias) => typeof alias === 'string').map((alias) => alias.trim().slice(0, 80)).filter(Boolean))].slice(0, 10)
      : []
    return { label: item.label.trim().slice(0, 120), aliases, category: item.category, state, evidence: (item.evidence || '').trim().slice(0, 1000), essential: Boolean(item.essential) }
  })
  const text = (key) => typeof profile[key] === 'string' ? profile[key].trim().slice(0, 500) : ''
  const description = typeof profile.description === 'string' ? profile.description.trim().slice(0, MAX_DESCRIPTION_LENGTH) : ''
  return { title: text('title'), company: text('company'), location: text('location'), sourceUrl: /^https?:\/\//i.test(text('sourceUrl')) ? text('sourceUrl') : '', description, requirements }
}

// The small part of a job kept in the shared board file for dashboard cards.
// Everything else (description, requirements) lives in the job's own file.
export const summarizeJobProfile = (profile) => profile
  ? { title: profile.title || '', company: profile.company || '', location: profile.location || '', sourceUrl: profile.sourceUrl || '' }
  : null

// Search employment, qualifications and practical details, not keyword lists or target summaries.
const collectText = (value) => typeof value === 'string' ? value : value && typeof value === 'object' ? Object.values(value).map(collectText).join('\n') : ''
const evidenceText = (cv) => collectText({ experience: cv?.experience, education: cv?.education, certifications: cv?.certificationsAndAffiliations, languages: cv?.languages, driving: cv?.basics?.driving }).toLowerCase()
// Manual evidence coverage: how well the hand-rated quotes support each
// requirement. Kept for the detail view; the headline score is the ATS match.
export const assessEvidenceCoverage = (profile, cv) => {
  if (!profile?.requirements?.length || !cv) return null
  const corpus = evidenceText(cv)
  const requirements = profile.requirements.map((item) => ({ ...item, needsReview: item.state !== 'gap' && (!item.evidence || !corpus.includes(item.evidence.toLowerCase())) }))
  const score = (items) => {
    const total = items.reduce((sum, item) => sum + weights[item.category], 0)
    if (!total || items.some((item) => item.needsReview)) return null
    return Math.round(items.reduce((sum, item) => sum + weights[item.category] * (MATCH_STATES[item.state]?.value || 0), 0) * 100 / total)
  }
  return { score: score(requirements), requirements, categories: MATCH_CATEGORIES.map((category) => ({ category, score: score(requirements.filter((item) => item.category === category)), count: requirements.filter((item) => item.category === category).length })), gaps: requirements.filter((item) => item.state === 'gap').length, essentialGaps: requirements.filter((item) => item.essential && item.state !== 'evidenced').length }
}

// ---------------------------------------------------------------------------
// ATS keyword match
//
// Applicant tracking systems mostly check whether the advert's keywords appear
// in the CV text. This estimates that: every keyword is searched for in the
// text that is printed on the CV, and the score is the weighted share found.
// ---------------------------------------------------------------------------
export const ATS_STATES = {
  found: { label: 'Found', value: 1 },
  partial: { label: 'Partial', value: 0.5 },
  missing: { label: 'Missing', value: 0 },
}

// Keys that never appear on the printed CV.
const NON_CV_KEYS = new Set(['meta', 'presentation', 'notes', 'clonedFrom', 'sectionsOrder'])
const STOP_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'to', 'for', 'with', 'or', 'on', 'at', 'by', 'as'])

// Lower-case, keep letters/digits and the symbols that matter in skill names
// (C++, C#, .NET, Node.js), and turn everything else into single spaces.
const normalize = (text) => ` ${String(text).toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}+#.]+/gu, ' ').replace(/\.(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim()} `
// Light stemming so "testing"/"tested"/"tests" and "analysis"/"analyse" agree.
const stem = (word) => word.length > 4 ? word.replace(/(ations?|ings?|ed|es|s)$/u, '') : word.length > 3 ? word.replace(/s$/u, '') : word
const words = (normalized) => normalized.trim().split(' ').filter((word) => word && !STOP_WORDS.has(word))

const cvText = (cv) => normalize(collectText(Object.fromEntries(Object.entries(cv || {}).filter(([key]) => !NON_CV_KEYS.has(key)))))

// "Python / TypeScript" lists alternatives; any one of them satisfies the keyword.
const termsFor = (item) => [item.label, ...(item.aliases || [])]
  .flatMap((term) => String(term).split(/\s+\/\s+|\s+\|\s+/))
  .map((term) => term.trim())
  .filter(Boolean)

const matchKeyword = (item, text, stems) => {
  const terms = termsFor(item)
  const exact = terms.find((term) => { const needle = normalize(term); return needle.trim() && text.includes(needle) })
  if (exact) return { status: 'found', term: exact }
  // Every word of the keyword appears somewhere in the CV, but not as the exact phrase.
  const loose = terms.find((term) => { const parts = words(normalize(term)); return parts.length && parts.every((word) => stems.has(stem(word))) })
  return loose ? { status: 'partial', term: loose } : { status: 'missing', term: '' }
}

export const assessJobMatch = (profile, cv) => {
  if (!profile?.requirements?.length || !cv) return null
  const text = cvText(cv)
  const stems = new Set(words(text).map(stem))
  const weightOf = (item) => weights[item.category] * (item.essential ? 2 : 1)
  const requirements = profile.requirements.map((item) => {
    const match = matchKeyword(item, text, stems)
    return { ...item, ats: match.status, matchedTerm: match.term }
  })
  const score = (items) => {
    const total = items.reduce((sum, item) => sum + weightOf(item), 0)
    if (!total) return null
    return Math.round(items.reduce((sum, item) => sum + weightOf(item) * ATS_STATES[item.ats].value, 0) * 100 / total)
  }
  return {
    score: score(requirements),
    requirements,
    categories: MATCH_CATEGORIES.map((category) => {
      const items = requirements.filter((item) => item.category === category)
      return { category, score: score(items), count: items.length }
    }),
    found: requirements.filter((item) => item.ats === 'found').length,
    partial: requirements.filter((item) => item.ats === 'partial').length,
    missing: requirements.filter((item) => item.ats === 'missing').length,
    essentialMissing: requirements.filter((item) => item.essential && item.ats !== 'found').length,
  }
}
