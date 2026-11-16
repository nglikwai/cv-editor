import { useMemo } from 'react'
import { formatJobDescription } from '../utils/jobDescription'

const InlineText = ({ text }) => text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (
  part.startsWith('**') && part.endsWith('**')
    ? <strong key={index} className="font-semibold text-text-dark">{part.slice(2, -2)}</strong>
    : part
))

export const JobDescription = ({ text }) => {
  const blocks = useMemo(() => formatJobDescription(text), [text])
  return <div className="space-y-3 text-xs text-text-dark break-words leading-6">
    {blocks.map((block, index) => {
      if (block.type === 'heading') return <h3 key={index} className="pt-2 first:pt-0 text-[11px] font-bold uppercase tracking-wide text-deep-blue border-b border-border-light pb-1"><InlineText text={block.text} /></h3>
      if (block.type === 'list') {
        const List = block.ordered ? 'ol' : 'ul'
        return <List key={index} start={block.start} className={`pl-4 space-y-2 marker:text-text-light ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item, itemIndex) => <li key={itemIndex} className="pl-1"><InlineText text={item} /></li>)}
        </List>
      }
      return <p key={index}><InlineText text={block.text} /></p>
    })}
  </div>
}
