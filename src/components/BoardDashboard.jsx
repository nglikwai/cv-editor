import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiBriefcase,
  FiCheck,
  FiChevronDown,
  FiPlus,
  FiRefreshCw,
  FiTag,
  FiTrash2,
} from 'react-icons/fi'
import { deleteSave, listSaves, loadBoard, updateSaveStatus } from '../services/s3'

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
}) => {
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
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className={`group bg-white rounded-lg border border-border-light shadow-sm p-3 cursor-pointer active:cursor-grabbing transition-all select-none ${
        isDragging
          ? 'opacity-40 scale-95 rotate-1'
          : isLoading
            ? 'opacity-60 pointer-events-none'
            : 'hover:shadow-md hover:border-deep-blue/30 hover:bg-deep-blue/[0.02]'
      }`}
      title="Click to open in editor · Drag to change status"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-semibold text-text-dark leading-snug break-words flex-1">
          {save.name}
        </h4>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(save.name)
            }}
            title={confirmDelete === save.name ? 'Confirm delete' : 'Delete'}
            className={`p-1.5 rounded-md transition-colors ${
              confirmDelete === save.name
                ? 'bg-red-600 text-white'
                : 'text-text-light hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-text-light mb-2" title={formatDate(save.lastModified)}>
        {isLoading ? 'Opening…' : formatRelative(save.lastModified)}
      </p>

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
}) => {
  return (
    <div
      className={`flex flex-col min-w-[260px] w-[260px] max-h-full rounded-xl transition-colors ${
        dragOver ? 'bg-deep-blue/5 ring-2 ring-deep-blue/20' : 'bg-bg-light/80'
      }`}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className="flex items-center gap-2 px-3 py-3 sticky top-0 z-10">
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

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-2 min-h-[120px]">
        {saves.length === 0 ? (
          <div
            className={`rounded-lg border-2 border-dashed px-3 py-8 text-center text-xs text-text-light transition-colors ${
              dragOver ? 'border-deep-blue/40 bg-white/50' : 'border-border-light'
            }`}
          >
            Drop CV here
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
      { value: '', label: 'All job types', count: saves.length },
      ...tags.map((tag) => ({
        value: tag,
        label: tag,
        count: saves.filter((save) => (save.tags || []).includes(tag)).length,
      })),
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
        className={`group flex items-center gap-2.5 w-44 sm:w-52 px-3 py-2 rounded-xl border bg-white text-left transition-all ${
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
                  key={option.value || 'all'}
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

export const BoardDashboard = ({ onCreateNew, onLoad }) => {
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

  const fetchBoard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)
      const [savesList, board] = await Promise.all([listSaves(), loadBoard()])
      setSaves(savesList)
      setColumns(board.columns)
    } catch (err) {
      console.error('Error loading board:', err)
      setError(err.message || 'Failed to load board')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  const boardTags = useMemo(
    () => [...new Set(saves.flatMap((save) => save.tags || []))].sort((a, b) => a.localeCompare(b)),
    [saves],
  )

  useEffect(() => {
    if (selectedBoardTag && !boardTags.includes(selectedBoardTag)) {
      setSelectedBoardTag('')
    }
  }, [boardTags, selectedBoardTag])

  const boardSaves = useMemo(
    () => selectedBoardTag
      ? saves.filter((save) => (save.tags || []).includes(selectedBoardTag))
      : saves,
    [saves, selectedBoardTag],
  )

  const filteredSaves = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return boardSaves
    return boardSaves.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.tags || []).some((t) => t.toLowerCase().includes(q)),
    )
  }, [boardSaves, filter])

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
    if (!name) return

    const save = saves.find((s) => s.name === name)
    if (!save || save.status === columnId) return

    // Optimistic update
    setSaves((prev) =>
      prev.map((s) => (s.name === name ? { ...s, status: columnId } : s)),
    )

    try {
      await updateSaveStatus(name, columnId)
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
      await deleteSave(name)
      setSaves((prev) => prev.filter((s) => s.name !== name))
    } catch (err) {
      console.error('Error deleting save:', err)
      setError('Failed to delete: ' + err.message)
    }
  }

  const totalCount = boardSaves.length

  return (
    <div className="h-full min-h-0 bg-[#f1f5f9] flex flex-col print:hidden">
      {/* Header */}
      <header className="bg-white border-b border-border-light px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BoardPicker
            saves={saves}
            tags={boardTags}
            value={selectedBoardTag}
            onChange={setSelectedBoardTag}
          />
          <span className="text-xs text-text-light hidden sm:inline">
            {totalCount} version{totalCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => onCreateNew(selectedBoardTag)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 bg-deep-blue text-white rounded-lg hover:bg-light-blue transition-colors shrink-0"
        >
          <FiPlus size={16} />
          <span className="hidden sm:inline">New CV</span>
        </button>

        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name or tag…"
          className="hidden lg:block w-44 xl:w-56 text-sm border border-border-light rounded-lg px-3 py-1.5 text-text-dark focus:outline-none focus:ring-2 focus:ring-deep-blue/20 bg-bg-light/50"
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
      <div className="flex-1 overflow-hidden p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-text-light">
            Loading board…
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
          <div className="h-full overflow-x-auto">
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
                  onClick={() => onCreateNew(selectedBoardTag)}
                  className="mt-1 text-sm font-medium px-4 py-2 bg-deep-blue text-white rounded-lg hover:bg-light-blue transition-colors"
                >
                  New CV
                </button>
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
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <footer className="px-5 py-2 border-t border-border-light bg-white/80 text-[11px] text-text-light flex items-center gap-4 shrink-0">
        <span>Click a card to open in editor · Drag between columns to update status</span>
      </footer>
    </div>
  )
}
