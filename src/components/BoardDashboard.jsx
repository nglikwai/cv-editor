import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  FiBriefcase,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiCalendar,
  FiPlus,
  FiRefreshCw,
  FiTag,
  FiTrash2,
} from 'react-icons/fi'
import { deleteSave, listSaves, loadBoard, updateSaveStatus, updateSaveDeadline } from '../services/s3'
import { NewCVModal } from './NewCVModal'
import { DeadlineModal } from './DeadlineModal'
import { DEADLINE_FILTERS, getDeadlineInfo, londonToday, matchesDeadlineFilter } from '../utils/deadlines'
import { workspaceStorageKey } from '../hooks/useWorkspaceUser'

const DASHBOARD_PREFERENCES_KEY = 'cv-dashboard-preferences'

const loadDashboardPreferences = (userId = 'default') => {
  try {
    const saved = JSON.parse(localStorage.getItem(workspaceStorageKey(DASHBOARD_PREFERENCES_KEY, userId)) || '{}')
    const validRanges = [2, 4, 6, 'all']
    return {
      boardTag: typeof saved.boardTag === 'string' ? saved.boardTag : '',
      monthRange: validRanges.includes(saved.monthRange) ? saved.monthRange : 2,
      deadlineFilter: DEADLINE_FILTERS.some((option) => option.value === saved.deadlineFilter) ? saved.deadlineFilter : 'all',
    }
  } catch {
    return { boardTag: '', monthRange: 2, deadlineFilter: 'all' }
  }
}

const formatDate = (date) =>
  new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatRelative = (date) => {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}

const BoardCard = ({
  save,
  isDragging,
  isLoading,
  confirmDelete,
  onDragStart,
  onDragEnd,
  onLoad,
  onDelete,
  onEditDeadline,
  today,
}) => {
  const deadline = getDeadlineInfo(save.deadline, today)
  const deadlineTone = { soon: 'border-amber-200 bg-amber-50 text-amber-900', closed: 'border-red-200 bg-red-50 text-red-800', normal: 'border-sky-200 bg-sky-50 text-sky-900', muted: 'border-border-light bg-bg-light text-text-light' }[deadline.tone]
  const didDrag = useRef(false)

  const handleClick = () => {
    if (didDrag.current || isLoading) return
    onLoad(save)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        didDrag.current = true
        onDragStart(e, save)
      }}
      onDragEnd={(e) => {
        onDragEnd(e)
        // Allow a short window so the synthetic click after drag is ignored
        setTimeout(() => {
          didDrag.current = false
        }, 50)
      }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className={`group bg-white rounded-2xl border border-border-light shadow-sm p-5 cursor-pointer active:cursor-grabbing transition-all select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-blue ${
        isDragging
          ? 'opacity-40 scale-95 rotate-1'
          : isLoading
            ? 'opacity-60 pointer-events-none'
            : 'hover:shadow-md hover:border-deep-blue/30 hover:bg-deep-blue/[0.02]'
      }`}
      title="Click to open in editor · Drag to change status"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="min-w-0 max-w-full flex-1 text-sm font-semibold text-text-dark leading-snug break-words [overflow-wrap:anywhere]">
          <span className="block text-[10px] uppercase tracking-widest text-teal-700 font-bold mb-1">{save.jobProfile?.company || 'CV workspace'}</span>
          {save.jobProfile?.title || save.name}
          {save.jobProfile?.location && <span className="block text-[11px] font-normal text-text-light mt-1">{save.jobProfile.location}</span>}
        </h4>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(save.name)
            }}
            title={confirmDelete === save.name ? 'Click again to delete permanently' : 'Delete'}
            aria-label={confirmDelete === save.name ? `Confirm deleting ${save.name}` : `Delete ${save.name}`}
            className={`flex items-center gap-1 p-1.5 rounded-md text-[11px] font-semibold leading-none transition-all group-hover:opacity-100 focus-visible:opacity-100 ${
              confirmDelete === save.name
                ? 'bg-red-600 text-white'
                : 'opacity-50 text-text-light hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <FiTrash2 size={13} />
            {confirmDelete === save.name && <span>Delete?</span>}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-text-light mb-2" title={formatDate(save.lastModified)}>
        {isLoading ? 'Opening…' : formatRelative(save.lastModified)}
      </p>

      <button
        type="button"
        draggable={false}
        onClick={(event) => { event.stopPropagation(); onEditDeadline(save) }}
        aria-label={`Edit deadline for ${save.name}`}
        title="Edit job deadline"
        className={`flex w-full items-start gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] mb-2 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-deep-blue ${deadlineTone}`}
      >
        <FiCalendar size={13} className="shrink-0 mt-0.5" />
        <span>
          <span className="block font-semibold">{deadline.label}</span>
          {deadline.detail && deadline.kind !== 'closed' && <span className="block mt-0.5">{deadline.detail}</span>}
        </span>
      </button>

      {save.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {save.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-[10px] leading-none bg-bg-light text-text-light rounded-full px-1.5 py-1"
            >
              <FiTag size={9} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const BoardColumn = ({
  column,
  saves,
  dragOver,
  draggingName,
  loadingName,
  confirmDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onLoad,
  onDelete,
  onEditDeadline,
  today,
}) => {
  return (
    <div
      data-column-id={column.id}
      className={`snap-start [scroll-snap-stop:always] flex flex-col min-w-[min(21rem,calc(100vw-2rem))] w-[min(21rem,calc(100vw-2rem))] max-h-full rounded-xl transition-colors ${
        dragOver ? 'bg-deep-blue/5 ring-2 ring-deep-blue/20' : 'bg-bg-light/80'
      }`}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className="flex items-center gap-2 px-4 py-3.5 sticky top-0 z-10">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-dark flex-1">
          {column.title}
        </h3>
        <span className="text-[11px] font-medium text-text-light bg-white border border-border-light rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
          {saves.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 min-h-[120px]">
        {saves.length === 0 ? (
          <div
            className={`rounded-lg border-2 border-dashed px-3 py-8 text-center text-xs transition-colors ${
              dragOver
                ? 'border-deep-blue/40 bg-white/50 text-deep-blue'
                : draggingName
                  ? 'border-border-light text-text-light'
                  : 'border-transparent text-text-light/70'
            }`}
          >
            {draggingName ? 'Drop CV here' : 'No CVs'}
          </div>
        ) : (
          saves.map((save) => (
            <BoardCard
              key={save.name}
              save={save}
              isDragging={draggingName === save.name}
              isLoading={loadingName === save.name}
              confirmDelete={confirmDelete}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onLoad={onLoad}
              onDelete={onDelete}
              onEditDeadline={onEditDeadline}
              today={today}
            />
          ))
        )}
      </div>
    </div>
  )
}

const BoardPicker = ({ saves, tags, value, onChange }) => {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)

  const options = useMemo(
    () => [
      ...tags
        .map((tag) => ({
          value: tag,
          label: tag,
          count: saves.filter((save) => (save.tags || []).includes(tag)).length,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      {
        value: '',
        label: 'Uncategorized',
        count: saves.filter((save) => !(save.tags || []).length).length,
      },
    ],
    [saves, tags],
  )

  const selectedOption = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={pickerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`group flex items-center gap-2.5 w-52 sm:w-72 px-3 py-2 rounded-xl border bg-white text-left transition-all ${
          open
            ? 'border-deep-blue/50 ring-4 ring-deep-blue/10 shadow-md'
            : 'border-border-light shadow-sm hover:border-deep-blue/30 hover:shadow-md'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Board: ${selectedOption.label}`}
      >
        <span className="w-8 h-8 rounded-lg bg-deep-blue/10 text-deep-blue flex items-center justify-center shrink-0">
          {value ? <FiTag size={15} /> : <FiBriefcase size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-wider font-bold text-text-light leading-none mb-1">
            Board
          </span>
          <span className="block text-sm font-semibold text-text-dark truncate leading-tight">
            {selectedOption.label}
          </span>
        </span>
        <FiChevronDown
          size={16}
          className={`text-text-light shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border-light bg-white shadow-xl overflow-hidden z-50">
          <div className="px-3.5 py-2.5 border-b border-border-light bg-bg-light/60">
            <p className="text-xs font-semibold text-text-dark">Choose a job board</p>
            <p className="text-[11px] text-text-light mt-0.5">Boards are created from your CV tags.</p>
          </div>
          <div role="listbox" aria-label="Job boards" className="p-1.5 max-h-72 overflow-y-auto">
            {options.map((option) => {
              const selected = option.value === value
              return (
                <button
                  key={option.value || 'uncategorized'}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    selected
                      ? 'bg-deep-blue/10 text-deep-blue'
                      : 'text-text-dark hover:bg-bg-light'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    selected ? 'bg-white/80' : 'bg-bg-light text-text-light'
                  }`}>
                    {option.value ? <FiTag size={13} /> : <FiBriefcase size={14} />}
                  </span>
                  <span className="text-sm font-medium truncate flex-1">{option.label}</span>
                  <span className="text-[11px] tabular-nums text-text-light bg-white border border-border-light rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center">
                    {option.count}
                  </span>
                  <FiCheck size={15} className={selected ? 'opacity-100' : 'opacity-0'} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export const BoardDashboard = ({ onCreateNew, onLoad, recoverableDraft, onRecoverDraft, userId = 'default' }) => {
  const [saves, setSaves] = useState([])
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [draggingName, setDraggingName] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [loadingName, setLoadingName] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [selectedBoardTag, setSelectedBoardTag] = useState('')
  const [monthRange, setMonthRange] = useState(2)
  const [prefsUserId, setPrefsUserId] = useState(null)
  const [newCVOpen, setNewCVOpen] = useState(false)
  const [deadlineFilter, setDeadlineFilter] = useState('all')
  const [editingDeadline, setEditingDeadline] = useState(null)
  const [today, setToday] = useState(londonToday)
  const boardScrollRef = useRef(null)
  const initialScrollSet = useRef(false)

  useEffect(() => {
    const preferences = loadDashboardPreferences(userId)
    setSelectedBoardTag(preferences.boardTag)
    setMonthRange(preferences.monthRange)
    setDeadlineFilter(preferences.deadlineFilter)
    setEditingDeadline(null)
    setPrefsUserId(userId)
    initialScrollSet.current = false
  }, [userId])

  useEffect(() => {
    const timer = setInterval(() => setToday(londonToday()), 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchBoard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)
      const [savesList, board] = await Promise.all([listSaves(userId), loadBoard(userId)])
      setSaves(savesList)
      setColumns(board.columns)
    } catch (err) {
      console.error('Error loading board:', err)
      setError(err.message || 'Failed to load board')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  useEffect(() => {
    if (prefsUserId !== userId) return
    try {
      localStorage.setItem(workspaceStorageKey(DASHBOARD_PREFERENCES_KEY, userId), JSON.stringify({
        boardTag: selectedBoardTag,
        monthRange,
        deadlineFilter,
      }))
    } catch {
      // Local preferences are optional when storage is unavailable.
    }
  }, [selectedBoardTag, monthRange, deadlineFilter, userId, prefsUserId])

  useLayoutEffect(() => {
    if (loading || !columns.length || initialScrollSet.current) return

    const container = boardScrollRef.current
    const draftColumn = container?.querySelector('[data-column-id="draft"]')
    if (!container || !draftColumn) return

    const previousScrollBehavior = container.style.scrollBehavior
    container.style.scrollBehavior = 'auto'
    const containerLeft = container.getBoundingClientRect().left
    const draftLeft = draftColumn.getBoundingClientRect().left
    container.scrollLeft += draftLeft - containerLeft
    container.style.scrollBehavior = previousScrollBehavior
    initialScrollSet.current = true
  }, [loading, columns])

  const boardTags = useMemo(
    () => [...new Set(saves.flatMap((save) => save.tags || []))].sort((a, b) => a.localeCompare(b)),
    [saves],
  )

  useEffect(() => {
    if (!loading && selectedBoardTag && !boardTags.includes(selectedBoardTag)) {
      setSelectedBoardTag('')
    }
  }, [boardTags, loading, selectedBoardTag])

  const recentSaves = useMemo(() => {
    if (monthRange === 'all') return saves
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - monthRange)
    return saves.filter((save) => new Date(save.lastModified) >= cutoff)
  }, [saves, monthRange])

  const boardSaves = useMemo(
    () => selectedBoardTag
      ? recentSaves.filter((save) => (save.tags || []).includes(selectedBoardTag))
      : recentSaves.filter((save) => !(save.tags || []).length),
    [recentSaves, selectedBoardTag],
  )

  const filteredSaves = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const matchesSearch = (save) => [
      save.name,
      save.jobProfile?.title,
      save.jobProfile?.company,
      save.jobProfile?.location,
      ...(save.tags || []),
    ].some((value) => typeof value === 'string' && value.toLowerCase().includes(q))
    return boardSaves.filter((save) => (
      (!q || matchesSearch(save)) && matchesDeadlineFilter(save.deadline, deadlineFilter, today)
    ))
  }, [boardSaves, filter, deadlineFilter, today])

  const savesByStatus = useMemo(() => {
    const map = Object.fromEntries(columns.map((c) => [c.id, []]))
    for (const save of filteredSaves) {
      const status = map[save.status] ? save.status : 'draft'
      if (!map[status]) map[status] = []
      map[status].push(save)
    }
    return map
  }, [filteredSaves, columns])

  const handleDragStart = (e, save) => {
    setDraggingName(save.name)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', save.name)
    // Slight delay so the drag image captures the card before opacity changes
    requestAnimationFrame(() => setDraggingName(save.name))
  }

  const handleDragEnd = () => {
    setDraggingName(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== columnId) setDragOverColumn(columnId)
  }

  const handleDragLeave = (e) => {
    // Only clear when leaving the column container itself
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = async (e, columnId) => {
    e.preventDefault()
    setDragOverColumn(null)
    const name = e.dataTransfer.getData('text/plain') || draggingName
    setDraggingName(null)
    if (name) moveSave(name, columnId)
  }

  const moveSave = async (name, columnId) => {
    const save = saves.find((s) => s.name === name)
    if (!save || save.status === columnId) return

    // Optimistic update
    setSaves((prev) =>
      prev.map((s) => (s.name === name ? { ...s, status: columnId } : s)),
    )

    try {
      await updateSaveStatus(name, columnId, userId)
    } catch (err) {
      console.error('Error updating status:', err)
      // Revert
      setSaves((prev) =>
        prev.map((s) => (s.name === name ? { ...s, status: save.status } : s)),
      )
      setError('Failed to update status: ' + err.message)
    }
  }

  const handleLoad = async (save) => {
    setLoadingName(save.name)
    try {
      await onLoad(save.name, save.tags)
    } finally {
      setLoadingName(null)
    }
  }

  const handleDelete = async (name) => {
    if (confirmDelete !== name) {
      setConfirmDelete(name)
      setTimeout(() => setConfirmDelete((cur) => (cur === name ? null : cur)), 3000)
      return
    }
    setConfirmDelete(null)
    try {
      await deleteSave(name, userId)
      setSaves((prev) => prev.filter((s) => s.name !== name))
    } catch (err) {
      console.error('Error deleting save:', err)
      setError('Failed to delete: ' + err.message)
    }
  }

  const handleSaveDeadline = async (name, deadline) => {
    const savedDeadline = await updateSaveDeadline(name, deadline, userId)
    setSaves((current) => current.map((save) => save.name === name ? { ...save, deadline: savedDeadline } : save))
    setEditingDeadline(null)
  }

  const totalCount = boardSaves.length

  return (
    <div className="h-full min-h-0 bg-[var(--app-canvas)] flex flex-col print:hidden">
      {editingDeadline && <DeadlineModal key={editingDeadline.name} save={editingDeadline} onCancel={() => setEditingDeadline(null)} onSave={handleSaveDeadline} />}
      <NewCVModal
        isOpen={newCVOpen}
        boardTag={selectedBoardTag}
        saves={boardSaves}
        onCancel={() => setNewCVOpen(false)}
        onConfirm={(sourceSave) => onCreateNew(selectedBoardTag, sourceSave)}
      />
      {/* Header */}
      <header className="bg-white border-b border-border-light px-4 sm:px-5 py-4 flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BoardPicker
            saves={recentSaves}
            tags={boardTags}
            value={selectedBoardTag}
            onChange={setSelectedBoardTag}
          />
          <span className="text-xs text-text-light hidden sm:inline">
            {filteredSaves.length === totalCount ? totalCount : `${filteredSaves.length} of ${totalCount}`} CV{totalCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center p-1 bg-bg-light border border-border-light rounded-lg" aria-label="CV age range">
          {[
            { value: 2, label: '2m' },
            { value: 4, label: '4m' },
            { value: 6, label: '6m' },
            { value: 'all', label: 'All' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMonthRange(option.value)}
              aria-pressed={monthRange === option.value}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                monthRange === option.value
                  ? 'bg-white text-deep-blue shadow-sm'
                  : 'text-text-light hover:text-text-dark'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-text-light">
          <FiCalendar size={15} aria-hidden="true" />
          <span className="sr-only">Filter by deadline</span>
          <select aria-label="Filter by deadline" value={deadlineFilter} onChange={(event) => setDeadlineFilter(event.target.value)} className="w-40 border border-border-light rounded-lg px-3 py-2 text-xs text-text-dark bg-white">
            {DEADLINE_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <div className="flex-1" />

        {recoverableDraft && (
          <button
            type="button"
            onClick={onRecoverDraft}
            title={`Local draft saved ${formatDate(recoverableDraft.savedAt)}`}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 border border-border-light text-deep-blue bg-white rounded-lg hover:bg-bg-light transition-colors shrink-0"
          >
            <FiClock size={15} />
            <span className="hidden sm:inline">Recover draft</span>
          </button>
        )}

        <button
          onClick={() => setNewCVOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 bg-deep-blue text-white rounded-lg hover:bg-light-blue transition-colors shrink-0"
        >
          <FiPlus size={16} />
          <span className="hidden sm:inline">New CV</span>
        </button>

        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search job, company or tag…"
          aria-label="Search CVs"
          className="w-full order-last basis-full lg:order-none lg:basis-auto lg:w-52 xl:w-64 text-sm border border-border-light rounded-lg px-3 py-2 text-text-dark focus:outline-none focus:ring-2 focus:ring-deep-blue/20 bg-bg-light/50"
        />

        <button
          onClick={() => fetchBoard(true)}
          disabled={refreshing || loading}
          title="Refresh"
          className="p-2 rounded-lg text-text-light hover:text-deep-blue hover:bg-bg-light transition-colors disabled:opacity-40"
        >
          <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-hidden p-3 sm:p-4">
        {loading ? (
          <div role="status" aria-label="Loading board" className="h-full flex gap-3 overflow-hidden">
            {[3, 1, 2, 0].map((cards, index) => (
              <div key={index} className="w-[min(21rem,calc(100vw-2rem))] shrink-0 rounded-xl bg-bg-light/80 p-3 animate-pulse">
                <div className="h-3 w-24 rounded bg-border-light mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: cards }, (_, card) => (
                    <div key={card} className="rounded-2xl border border-border-light bg-white p-4 space-y-2.5">
                      <div className="h-2 w-20 rounded bg-border-light" />
                      <div className="h-3 w-40 rounded bg-border-light" />
                      <div className="h-7 rounded-lg bg-bg-light" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error && !columns.length ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => fetchBoard()}
              className="text-sm px-4 py-2 bg-deep-blue text-white rounded-lg hover:bg-light-blue transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div ref={boardScrollRef} className="h-full overflow-x-auto snap-x snap-mandatory scroll-smooth">
            {error && (
              <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 underline hover:no-underline"
                >
                  dismiss
                </button>
              </div>
            )}
            {saves.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-deep-blue/10 text-deep-blue flex items-center justify-center">
                  <FiPlus size={24} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-dark">Create your first CV</h2>
                  <p className="text-sm text-text-light mt-1">It will appear here after you save it.</p>
                </div>
                <button
                  onClick={() => setNewCVOpen(true)}
                  className="mt-1 text-sm font-medium px-4 py-2 bg-deep-blue text-white rounded-lg hover:bg-light-blue transition-colors"
                >
                  New CV
                </button>
              </div>
            ) : boardSaves.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <FiClock size={24} className="text-text-light" />
                <div>
                  <h2 className="text-base font-semibold text-text-dark">
                    {monthRange === 'all' ? 'This board is empty' : 'No recent CVs on this board'}
                  </h2>
                  <p className="text-sm text-text-light mt-1">
                    {monthRange === 'all'
                      ? `No CVs are ${selectedBoardTag ? `tagged “${selectedBoardTag}”` : 'untagged'} yet.`
                      : `Nothing on the ${selectedBoardTag || 'Uncategorized'} board was updated in the last ${monthRange} months.`}
                  </p>
                </div>
                {monthRange === 'all' ? (
                  <button
                    onClick={() => setNewCVOpen(true)}
                    className="text-sm font-medium px-4 py-2 bg-deep-blue text-white rounded-lg hover:bg-light-blue transition-colors"
                  >
                    New CV
                  </button>
                ) : (
                  <button
                    onClick={() => setMonthRange('all')}
                    className="text-sm font-medium px-4 py-2 border border-border-light text-deep-blue bg-white rounded-lg hover:bg-bg-light transition-colors"
                  >
                    View all CVs
                  </button>
                )}
              </div>
            ) : filteredSaves.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <FiCalendar size={24} className="text-text-light" />
                <h2 className="text-base font-semibold text-text-dark">No CVs match these filters</h2>
                <p className="text-sm text-text-light">Try another deadline filter or search.</p>
                <button type="button" onClick={() => { setFilter(''); setDeadlineFilter('all') }} className="text-sm px-4 py-2 border border-border-light rounded-lg text-deep-blue bg-white">Clear filters</button>
              </div>
            ) : (
              <div className="flex gap-3 h-full min-w-min pb-1">
                {columns.map((column) => (
                  <BoardColumn
                    key={column.id}
                    column={column}
                    saves={savesByStatus[column.id] || []}
                    dragOver={dragOverColumn === column.id}
                    draggingName={draggingName}
                    loadingName={loadingName}
                    confirmDelete={confirmDelete}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onLoad={handleLoad}
                    onDelete={handleDelete}
                    onEditDeadline={setEditingDeadline}
                          today={today}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <footer className="hidden sm:flex px-5 py-2 border-t border-border-light bg-white/80 text-[11px] text-text-light items-center gap-4 shrink-0">
        <span>Click a card to open a tab · Click its deadline to edit · Drag between columns to change status</span>
      </footer>
    </div>
  )
}
