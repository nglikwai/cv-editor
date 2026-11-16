import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getCvTimeline } from '../services/s3'


const STATUS_LABELS = {
  archived: 'Archived',
  draft: 'Draft',
  applied: 'Applied',
  phone: 'Phone interview',
  video: 'Video interview',
  technical: 'Technical interview',
  final: 'Final interview',
  offer: 'Offer',
}

const STATUS_COLORS = {
  archived: '#94a3b8',
  draft: '#64748b',
  applied: '#d4a039',
  phone: '#0ea5e9',
  video: '#6366f1',
  technical: '#7c3aed',
  final: '#db2777',
  offer: '#16a34a',
}

const formatTimelineDate = (date) =>
  new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const eventLabel = (event) => {
  if (event.type === 'created') return event.clonedFrom ? 'Cloned' : 'Created'
  if (event.type === 'edited') return 'Edited'
  if (event.type === 'version') return 'New version'
  if (event.type === 'status') return STATUS_LABELS[event.status] || event.status
  return event.type
}

const eventColor = (event) => {
  if (event.type === 'created') return '#1a365d'
  if (event.type === 'edited') return '#64748b'
  if (event.type === 'version') return '#d4a039'
  return STATUS_COLORS[event.status] || '#64748b'
}

const CloneSourceLink = ({ name, onOpenCv }) => {
  if (!name) return null
  if (!onOpenCv) return <span>{name}</span>
  return (
    <button
      type="button"
      onClick={() => onOpenCv(name)}
      className="text-deep-blue font-medium hover:underline underline-offset-2 truncate max-w-full"
      title={`Open ${name} in editor`}
    >
      {name}
    </button>
  )
}

const MAX_NOTE_ROWS = 15

const sizeNotesTextarea = (textarea) => {
  if (!textarea) return
  const styles = getComputedStyle(textarea)
  const lineHeight = Number.parseFloat(styles.lineHeight) || 22
  const padding = (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0)
  const minHeight = padding + lineHeight
  const maxHeight = padding + lineHeight * MAX_NOTE_ROWS
  textarea.style.height = '1px'
  const contentHeight = textarea.scrollHeight
  textarea.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`
  textarea.style.overflowY = contentHeight > maxHeight + 1 ? 'auto' : 'hidden'
}

// Notes and activity for the job this CV targets. Rendered inside the job
// sidebar; `active` is false while another sidebar tab is showing.
export const ScratchNotes = ({
  value,
  onChange,
  cvName,
  clonedFrom = '',
  userId = 'default',
  refreshKey,
  onOpenCv,
  active = true,
}) => {
  const [events, setEvents] = useState([])
  const notesRef = useRef(null)
  const text = typeof value === 'string' ? value : ''

  useLayoutEffect(() => {
    if (active) sizeNotesTextarea(notesRef.current)
  }, [active, text])

  useEffect(() => {
    if (!active || !cvName) {
      setEvents([])
      return undefined
    }

    let cancelled = false
    getCvTimeline(cvName, userId)
      .then((result) => {
        if (!cancelled) setEvents(result?.events || [])
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })

    return () => {
      cancelled = true
    }
  }, [active, cvName, userId, refreshKey])

  return (
    <div className="px-4 py-4 lg:px-5">
      <label htmlFor="job-notes" className="block text-[10px] uppercase tracking-wider font-semibold text-text-light mb-2">
        Notes <span className="normal-case tracking-normal font-normal">· saved with the CV, never printed</span>
      </label>
      <textarea
        id="job-notes"
        ref={notesRef}
        rows={3}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Company site, job posting, interview notes…"
        className="w-full resize-none rounded-xl border border-border-light bg-bg-light/50 px-3 py-2.5 text-sm text-text-dark leading-relaxed placeholder:text-text-light/70 focus:outline-none focus:ring-2 focus:ring-deep-blue/20"
        spellCheck="true"
      />
      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-text-light mb-2">Timeline</p>
        {!cvName ? (
          clonedFrom ? (
            <p className="text-[11px] text-text-light">
              Cloned from <CloneSourceLink name={clonedFrom} onOpenCv={onOpenCv} />. Save this CV to start a timeline.
            </p>
          ) : (
            <p className="text-[11px] text-text-light">Save this CV to start a timeline.</p>
          )
        ) : events.length === 0 ? (
          <p className="text-[11px] text-text-light">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-2.5">
            {events.map((event, index) => (
              <li key={`${event.type}-${event.at}-${index}`} className="flex gap-2.5">
                <span className="relative flex flex-col items-center pt-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: eventColor(event) }}
                  />
                  {index < events.length - 1 && (
                    <span className="w-px flex-1 bg-border-light mt-1 min-h-3" />
                  )}
                </span>
                <div className="min-w-0 pb-0.5">
                  <p className="text-xs font-semibold text-text-dark leading-none">{eventLabel(event)}</p>
                  {event.clonedFrom && (
                    <p className="text-[11px] text-text-dark/80 mt-1 flex items-baseline gap-1 min-w-0">
                      <span className="shrink-0">from</span>
                      <CloneSourceLink name={event.clonedFrom} onOpenCv={onOpenCv} />
                    </p>
                  )}
                  <p className="text-[10px] text-text-light mt-1 leading-none">{formatTimelineDate(event.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
