import { formatDateRange } from './dateUtils.js'

export const emptyMasterExperience = () => ({ schemaVersion: 1, updatedAt: null, jobs: [] })

const clean = (value) => typeof value === 'string' ? value.trim() : ''
const normalized = (value) => clean(value).toLowerCase().replace(/\s+/g, ' ')
const addUnique = (values, value) => {
  const text = clean(value)
  if (text && !values.some((item) => normalized(item) === normalized(text))) values.push(text)
}
export const validateMasterExperience = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1 || !Array.isArray(value.jobs)) {
    throw new Error('Master JSON needs schemaVersion: 1 and a jobs array.')
  }
  if (value.jobs.length > 500) throw new Error('The master list can contain up to 500 jobs.')
  const string = (text, label, max = 20000) => {
    if (typeof text !== 'string' || text.length > max) throw new Error(`${label} must be text, up to ${max} characters.`)
    return text.trim()
  }
  const strings = (items, label) => {
    if (!Array.isArray(items) || items.length > 2000) throw new Error(`${label} must be a list of text values.`)
    const result = []
    for (const item of items) addUnique(result, string(item, label))
    return result
  }
  const ids = new Set()
  const id = (input) => {
    const result = input == null ? crypto.randomUUID() : string(input, 'ID', 200)
    if (!result || ids.has(result)) throw new Error('Every job and experience item needs a unique ID.')
    ids.add(result)
    return result
  }
  const date = (input, label) => {
    const result = string(input ?? '', label, 10)
    if (result && !/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(result)) throw new Error(`${label} must be YYYY-MM or YYYY-MM-DD.`)
    return result
  }
  let analysis
  if (value.analysis != null) {
    const input = value.analysis
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.method !== 'llm') throw new Error('Analysis method must be llm.')
    if (typeof input.analyzedAt !== 'string' || !Number.isFinite(Date.parse(input.analyzedAt))) throw new Error('Analysis needs a valid analyzedAt timestamp.')
    if (!Number.isSafeInteger(input.sourceItemCount) || input.sourceItemCount < 0) throw new Error('Analysis sourceItemCount must be a non-negative integer.')
    analysis = { method: 'llm', analyzedAt: input.analyzedAt, sourceItemCount: input.sourceItemCount, approach: string(input.approach ?? '', 'Analysis approach', 2000) }
  }
  return {
    schemaVersion: 1,
    ...(analysis ? { analysis } : {}),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    jobs: value.jobs.map((job, index) => {
      if (!job || typeof job !== 'object' || Array.isArray(job)) throw new Error(`Job ${index + 1} must be an object.`)
      const company = string(job.company ?? '', 'Employer', 500)
      const titles = strings(job.titles, 'Job titles')
      if (!company && !titles.length) throw new Error(`Job ${index + 1} needs an employer or job title.`)
      if (!Array.isArray(job.items) || job.items.length > 5000) throw new Error(`Job ${index + 1} needs an items array (up to 5,000 items).`)
      if (typeof job.isCurrent !== 'boolean') throw new Error(`Job ${index + 1}: isCurrent must be true or false.`)
      const itemTexts = new Set()
      return {
        id: id(job.id), company, titles,
        companyAliases: strings(job.companyAliases ?? [], 'Employer names'),
        variants: (() => {
          if (!Array.isArray(job.variants ?? []) || (job.variants || []).length > 2000) throw new Error('Source variants must be a list (up to 2,000 entries).')
          return (job.variants || []).map((variant) => {
            if (!variant || typeof variant !== 'object' || Array.isArray(variant) || typeof variant.isCurrent !== 'boolean') throw new Error('Each source variant needs its job details and isCurrent flag.')
            return { company: string(variant.company ?? '', 'Source employer', 500), title: string(variant.title ?? '', 'Source title', 500), startDate: date(variant.startDate, 'Source start date'), endDate: date(variant.endDate, 'Source end date'), isCurrent: variant.isCurrent, dateDisplay: string(variant.dateDisplay ?? '', 'Source date label', 200), sources: strings(variant.sources ?? [], 'Source CVs') }
          })
        })(),
        startDate: date(job.startDate, 'Start date'), endDate: date(job.endDate, 'End date'),
        isCurrent: job.isCurrent, dateDisplay: string(job.dateDisplay ?? '', 'Date label', 200),
        locations: strings(job.locations ?? [], 'Locations'), focuses: strings(job.focuses ?? [], 'Focus areas'),
        sources: strings(job.sources ?? [], 'Source CVs'),
        items: job.items.map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Every experience item must be an object.')
          const text = string(item.text, 'Experience item')
          if (!text) throw new Error('Experience items cannot be empty.')
          const identity = normalized(text).replace(/[.!?]+$/, '')
          if (itemTexts.has(identity)) throw new Error('The same experience item appears more than once in this job.')
          itemTexts.add(identity)
          return { id: id(item.id), text, labels: strings(item.labels ?? [], 'Labels'), titles: strings(item.titles ?? [], 'Item job titles'), sources: strings(item.sources ?? [], 'Source CVs'), sourceItemIds: strings(item.sourceItemIds ?? [], 'Source experience IDs') }
        }),
      }
    }),
  }
}


export const masterJobDatesNeedReview = (job) => {
  const variants = job.variants || []
  if (new Set(variants.map((variant) => `${variant.endDate}:${variant.isCurrent}`)).size > 1) return true
  const compact = (value) => String(value || '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, '')
  return variants.some((variant) => (
    (variant.isCurrent && !!variant.endDate)
    || (variant.startDate && variant.dateDisplay && compact(variant.dateDisplay) !== compact(formatDateRange(variant.startDate, variant.endDate, variant.isCurrent)))
  ))
}
