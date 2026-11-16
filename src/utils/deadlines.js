export const DEADLINE_STATUSES = [
  { value: 'date', label: 'Closing date known' },
  { value: 'not-stated', label: 'No deadline stated in advert' },
  { value: 'unknown', label: 'Deadline unknown / unconfirmed' },
  { value: 'closed', label: 'Advert closed' },
  { value: 'not-applicable', label: 'General CV — no job deadline' },
]

export const DEADLINE_FILTERS = [
  { value: 'all', label: 'All deadlines' },
  { value: 'next-7', label: 'Closing soon' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'closed', label: 'Closed' },
  { value: 'missing', label: 'Missing deadline' },
]

export const isDateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// Treat closing dates as UK calendar dates, including across BST/GMT changes.
export const londonToday = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type) => parts.find((item) => item.type === type).value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export const normalizeDeadline = (value) => {
  const status = DEADLINE_STATUSES.some((option) => option.value === value?.status)
    ? value.status : 'unknown'
  return {
    status: status === 'date' && !isDateOnly(value?.date) ? 'unknown' : status,
    date: ['date', 'closed'].includes(status) && isDateOnly(value?.date) ? value.date : '',
    sourceUrl: typeof value?.sourceUrl === 'string' && /^https?:\/\//i.test(value.sourceUrl) ? value.sourceUrl : '',
    checkedAt: isDateOnly(value?.checkedAt) ? value.checkedAt : '',
  }
}

export const validateDeadline = (value) => {
  if (!value || !DEADLINE_STATUSES.some((option) => option.value === value.status)) {
    throw new Error('Choose a valid deadline status.')
  }
  if (value.status === 'date' && !isDateOnly(value.date)) {
    throw new Error('Enter a valid closing date.')
  }
  if (value.status === 'closed' && value.date && !isDateOnly(value.date)) {
    throw new Error('Enter a valid closing date or leave it empty.')
  }
  if (value.sourceUrl) {
    let url
    try { url = new URL(value.sourceUrl) } catch { throw new Error('Enter a valid advert URL.') }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an http or https advert URL.')
  }
  if (value.checkedAt && !isDateOnly(value.checkedAt)) throw new Error('Enter a valid checked date.')
  return normalizeDeadline(value)
}

export const formatDeadlineDate = (date) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${date}T00:00:00Z`))

export const getDeadlineInfo = (value, today = londonToday()) => {
  const deadline = normalizeDeadline(value)
  const days = deadline.date
    ? Math.round((Date.parse(`${deadline.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)
    : null
  if (deadline.status === 'closed' || (deadline.status === 'date' && days < 0)) {
    return { ...deadline, kind: 'closed', days, label: deadline.status === 'closed' ? 'Advert closed' : `Closed ${formatDeadlineDate(deadline.date)}`, detail: 'Closed / deadline passed', tone: 'closed' }
  }
  if (deadline.status === 'date') {
    const detail = days === 0 ? 'Closes today' : days === 1 ? 'Closes tomorrow' : `${days} days left`
    return { ...deadline, kind: 'upcoming', days, label: `Closes ${formatDeadlineDate(deadline.date)}`, detail, tone: days <= 7 ? 'soon' : 'normal' }
  }
  const labels = { 'not-stated': 'No deadline stated', 'not-applicable': 'General CV · no deadline', unknown: deadline.checkedAt ? 'Deadline unconfirmed' : 'Deadline not checked' }
  return { ...deadline, kind: deadline.status, days: null, label: labels[deadline.status], detail: '', tone: 'muted' }
}

export const matchesDeadlineFilter = (deadline, filter, today = londonToday()) => {
  const info = getDeadlineInfo(deadline, today)
  if (filter === 'all') return true
  if (filter === 'missing') return ['unknown', 'not-stated'].includes(info.kind)
  if (filter === 'dated') return Boolean(info.date)
  if (filter === 'next-7') return info.kind === 'upcoming' && info.days <= 7
  if (filter === 'next-30') return info.kind === 'upcoming' && info.days <= 30
  return info.kind === filter
}
