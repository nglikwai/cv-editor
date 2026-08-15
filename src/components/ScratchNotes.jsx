import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FiClipboard, FiMinus } from 'react-icons/fi'
import { workspaceStorageKey } from '../hooks/useWorkspaceUser'
import { getCvTimeline } from '../services/s3'

const POSITION_KEY = 'cv-scratch-notes-position'
const HEADER_OFFSET = 72
const MARGIN = 8

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
      data-scratch-no-drag
      onClick={() => onOpenCv(name)}
      className="text-deep-blue font-medium hover:underline underline-offset-2 truncate max-w-full"
      title={`Open ${name} in editor`}
    >
      {name}
    </button>
  )
}

const defaultPosition = () => ({ left: 16, top: 96 })

const loadPosition = (userId) => {
  try {
    const saved = JSON.parse(localStorage.getItem(workspaceStorageKey(POSITION_KEY, userId)) || 'null')
    if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) {
      return { left: saved.left, top: saved.top }
    }
  } catch {
    // Position persistence is optional when storage is unavailable.
  }
  return defaultPosition()
}

const savePosition = (userId, position) => {
  try {
    localStorage.setItem(workspaceStorageKey(POSITION_KEY, userId), JSON.stringify(position))
  } catch {
    // Position persistence is optional when storage is unavailable.
  }
}

const clampPosition = (left, top, width, height) => {
  const maxLeft = window.innerWidth - width - MARGIN
  const maxTop = window.innerHeight - height - MARGIN
  return {
    left: Math.min(Math.max(MARGIN, left), Math.max(MARGIN, maxLeft)),
    top: Math.min(Math.max(HEADER_OFFSET, top), Math.max(HEADER_OFFSET, maxTop)),
  }
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

export const ScratchNotes = ({
  value,
  onChange,
  cvName,
  clonedFrom = '',
  userId = 'default',
  refreshKey,
  onOpenCv,
  open: openProp,
  onOpenChange,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [events, setEvents] = useState([])
  const [position, setPosition] = useState({ left: 16, top: 96 })
  const [dragging, setDragging] = useState(false)
  const panelRef = useRef(null)
  const notesRef = useRef(null)
  const dragRef = useRef(null)
  const positionRef = useRef(position)
  const text = typeof value === 'string' ? value : ''

  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    setPosition(loadPosition(userId))
  }, [userId])

  useLayoutEffect(() => {
    if (!open) return
    sizeNotesTextarea(notesRef.current)
  }, [open, text])

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return undefined

    const keepOnScreen = () => {
      setPosition((current) => clampPosition(current.left, current.top, panel.offsetWidth, panel.offsetHeight))
    }

    keepOnScreen()
    window.addEventListener('resize', keepOnScreen)
    return () => window.removeEventListener('resize', keepOnScreen)
  }, [open, text])

  useEffect(() => {
    if (!open || !cvName) {
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
  }, [open, cvName, userId, refreshKey])

  const startDrag = (event) => {
    if (event.button != null && event.button !== 0) return
    if (event.target.closest('[data-scratch-no-drag]')) return
    const panel = panelRef.current
    if (!panel) return

    const rect = panel.getBoundingClientRect()
    dragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = (event) => {
    if (!dragRef.current || !panelRef.current) return
    const next = clampPosition(
      event.clientX - dragRef.current.offsetX,
      event.clientY - dragRef.current.offsetY,
      panelRef.current.offsetWidth,
      panelRef.current.offsetHeight,
    )
    positionRef.current = next
    setPosition(next)
  }

  const endDrag = (event) => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    savePosition(userId, positionRef.current)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const panelStyle = { left: position.left, top: position.top }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="scratch-notes scratch-notes-toggle hidden md:flex fixed top-1/2 left-4 -translate-y-1/2 z-[1000] print:hidden flex-col items-center gap-1.5 px-2.5 py-3 rounded-full border bg-white/10 backdrop-blur-md border-white/20 shadow-[0_4px_24px_rgba(0,0,0,0.15)] text-black/70 hover:text-black transition-colors"
        aria-label="Open scratch notes"
        title="Scratch notes"
      >
        <FiClipboard size={18} />
      </button>
    )
  }

  return (
    <aside
      ref={panelRef}
      style={panelStyle}
      className="scratch-notes fixed z-[1000] print:hidden w-72 max-h-[min(36rem,calc(100vh-8rem))] flex flex-col rounded-2xl border bg-white/10 backdrop-blur-md border-white/20 shadow-[0_4px_24px_rgba(0,0,0,0.15)] overflow-hidden max-md:!left-3 max-md:!right-3 max-md:!top-auto max-md:!bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] max-md:!w-auto max-md:max-h-[min(70dvh,calc(100dvh-9rem))]"
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/20 shrink-0 select-none touch-none ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-dark leading-none">Scratch notes</p>
          <p className="text-[10px] text-text-light mt-1 leading-none">Drag to move · not printed</p>
        </div>
        <button
          type="button"
          data-scratch-no-drag
          onClick={() => setOpen(false)}
          className="w-7 h-7 rounded-lg text-text-light hover:text-text-dark hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Collapse scratch notes"
        >
          <FiMinus size={16} />
        </button>
      </div>
      <textarea
        ref={notesRef}
        rows={1}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Company site, job posting, interview notes…"
        className="w-full resize-none bg-transparent px-3 py-2.5 text-sm text-text-dark leading-relaxed placeholder:text-text-light/70 focus:outline-none"
        spellCheck="true"
      />
      <div className="border-t border-white/20 px-3 py-2.5 overflow-y-auto min-h-0">
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
                    <span className="w-px flex-1 bg-white/30 mt-1 min-h-3" />
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
    </aside>
  )
}
