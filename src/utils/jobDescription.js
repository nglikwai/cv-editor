const SECTION_LABELS = 'about (?:the role|the job|us|you|the company)|(?:key |main )?(?:responsibilities|duties)|(?:key |essential |desirable )?(?:requirements|qualifications|skills|criteria)|person specification|what (?:you.ll (?:do|bring)|we (?:offer|offer you|are looking for))|benefits|how to apply|salary|working (?:hours|pattern)'
const inlineSections = new RegExp(`(^|\\s)((?:${SECTION_LABELS}):)`, 'gi')
const knownHeading = new RegExp(`^(?:${SECTION_LABELS})$`, 'i')

// Plain text only: interpret structure without injecting pasted HTML or
// rewriting the advert's wording. Unknown prose stays as paragraphs.
export const formatJobDescription = (text = '') => {
  const lines = String(text).replace(/\r\n?/g, '\n')
    .replace(inlineSections, '$1\n\n$2\n')
    .replace(/([^\n])\s+[•●▪◦]\s+/g, '$1\n• ')
    .split('\n')
  const blocks = []
  let paragraph = []
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    const heading = line.replace(/^#{1,6}\s+/, '').replace(/^\*\*(.+)\*\*$/, '$1').replace(/:$/, '')
    if (/^#{1,6}\s/.test(line) || /^\*\*[^*]+\*\*:?$/.test(line) || knownHeading.test(heading) || (line.length < 75 && line.endsWith(':'))) {
      flush()
      blocks.push({ type: 'heading', text: heading })
      continue
    }
    const bullet = line.match(/^(?:[-*•●▪◦–]\s+|\d+[.)]\s+)(.+)$/)
    if (bullet) {
      flush()
      const ordered = /^\d/.test(line)
      let list = blocks.at(-1)
      if (list?.type !== 'list' || list.ordered !== ordered) {
        list = { type: 'list', ordered, start: ordered ? parseInt(line, 10) : undefined, items: [] }
        blocks.push(list)
      }
      list.items.push(bullet[1])
      continue
    }
    paragraph.push(line)
  }
  flush()
  return blocks
}
