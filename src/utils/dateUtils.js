export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export const formatDateRange = (startDate, endDate, isCurrent) => {
  const start = formatDate(startDate)
  const end = isCurrent ? 'Present' : formatDate(endDate)
  return `${start} - ${end}`
}
