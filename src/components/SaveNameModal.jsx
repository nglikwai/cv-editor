import { useEffect, useRef, useState } from 'react'
import { FiCopy, FiFilePlus, FiRefreshCw, FiX } from 'react-icons/fi'

const sanitize = (name) =>
  name.trim().replace(/[^a-zA-Z0-9\-_. ]/g, '').slice(0, 80)

export const SaveNameModal = ({
  isOpen,
  onConfirm,
  onCancel,
  defaultName,
  defaultTags = [],
  allTags = [],
  existingNames = [],
}) => {
  const [mode, setMode] = useState('new')
  const [name, setName] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setMode(defaultName ? 'replace' : 'new')
      setName(defaultName || '')
      setTags(defaultTags)
      setTagInput('')
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [isOpen, defaultName, defaultTags])

  const addTag = (raw) => {
    const tag = raw.trim()
    if (!tag) return
    setTags((prev) => (prev.some((t) => t.toLowerCase() === tag.toLowerCase()) ? prev : [...prev, tag]))
    setTagInput('')
  }

  const removeTag = (tag) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const selectMode = (nextMode) => {
    setMode(nextMode)
    setName(nextMode === 'new' ? '' : defaultName)
    if (nextMode === 'new') setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleConfirm = () => {
    const safe = sanitize(name)
    if (!safe) return
    if (mode === 'new' && existingNames.some(
      (existingName) => existingName.toLowerCase() === safe.toLowerCase(),
    )) return
    const pending = tagInput.trim()
    const finalTags = pending && !tags.some((t) => t.toLowerCase() === pending.toLowerCase())
      ? [...tags, pending]
      : tags
    onConfirm(safe, finalTags, mode)
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onCancel()
  }

  const handleTagInputChange = (e) => {
    const value = e.target.value
    const exactMatch = allTags.find((t) => t.toLowerCase() === value.toLowerCase())
    if (exactMatch) {
      addTag(exactMatch)
      return
    }
    setTagInput(value)
  }

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      removeTag(tags[tags.length - 1])
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  if (!isOpen) return null

  const safe = sanitize(name)
  const nameExists = mode === 'new' && existingNames.some(
    (existingName) => existingName.toLowerCase() === safe.toLowerCase(),
  )
  const canSave = !!safe && !nameExists
  const tagSuggestions = allTags.filter((t) => !tags.some((existing) => existing.toLowerCase() === t.toLowerCase()))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-[36rem] max-w-[calc(100vw-2rem)] p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-deep-blue">
          Save CV
        </h3>
        <p className="text-xs text-text-light mt-1 mb-4">
          {defaultName ? 'Replace this CV, add to its history, or save it as a separate CV.' : 'Create your first saved CV.'}
        </p>

        {defaultName && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <button
              type="button"
              onClick={() => selectMode('replace')}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-colors ${
                mode === 'replace'
                  ? 'border-deep-blue bg-deep-blue/5 ring-2 ring-deep-blue/10'
                  : 'border-border-light hover:bg-bg-light'
              }`}
            >
              <FiRefreshCw className={mode === 'replace' ? 'text-deep-blue' : 'text-text-light'} />
              <span>
                <span className="block text-xs font-semibold text-text-dark">Replace original</span>
                <span className="block text-[10px] text-text-light mt-0.5">No new history entry</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => selectMode('version')}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-colors ${
                mode === 'version'
                  ? 'border-deep-blue bg-deep-blue/5 ring-2 ring-deep-blue/10'
                  : 'border-border-light hover:bg-bg-light'
              }`}
            >
              <FiCopy className={mode === 'version' ? 'text-deep-blue' : 'text-text-light'} />
              <span>
                <span className="block text-xs font-semibold text-text-dark">New version</span>
                <span className="block text-[10px] text-text-light mt-0.5">Same CV history</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => selectMode('new')}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-colors ${
                mode === 'new'
                  ? 'border-deep-blue bg-deep-blue/5 ring-2 ring-deep-blue/10'
                  : 'border-border-light hover:bg-bg-light'
              }`}
            >
              <FiFilePlus className={mode === 'new' ? 'text-deep-blue' : 'text-text-light'} />
              <span>
                <span className="block text-xs font-semibold text-text-dark">New CV</span>
                <span className="block text-[10px] text-text-light mt-0.5">Separate CV and history</span>
              </span>
            </button>
          </div>
        )}

        <label className="block text-xs font-semibold text-text-dark mb-1.5">CV name</label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleNameKeyDown}
          readOnly={!!defaultName && mode !== 'new'}
          className="w-full border border-border-light rounded-lg px-3 py-2 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-deep-blue/30 read-only:bg-bg-light read-only:text-text-light read-only:cursor-not-allowed"
        />
        {nameExists && (
          <p className="text-xs text-red-600 mt-1.5">
            This CV already exists. Open it from the dashboard to save a new version.
          </p>
        )}

        <h3 className="text-xs font-bold uppercase tracking-widest text-deep-blue mt-4 mb-2">
          Tags
        </h3>
        <div className="w-full border border-border-light rounded-lg px-2 py-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-deep-blue/30">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 bg-bg-light text-text-dark text-xs rounded-full pl-2.5 pr-1.5 py-1"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-text-light hover:text-red-500 transition-colors"
                title="Remove tag"
              >
                <FiX size={12} />
              </button>
            </span>
          ))}
          <input
            type="text"
            list="save-tag-suggestions"
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagInputKeyDown}
            placeholder={tags.length ? '' : 'Add a tag...'}
            className="flex-1 min-w-[80px] text-sm text-text-dark focus:outline-none"
          />
          <datalist id="save-tag-suggestions">
            {tagSuggestions.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        </div>

        {tagSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tagSuggestions.map((tag) => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                className="text-xs rounded-full px-2.5 py-1 border border-border-light text-text-light hover:bg-bg-light hover:text-text-dark transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-text-light hover:text-text-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSave}
            className="px-4 py-2 text-sm bg-deep-blue text-white rounded-lg hover:bg-light-blue transition-colors disabled:opacity-40"
          >
            {mode === 'version'
              ? 'Save new version'
              : mode === 'replace'
                ? 'Replace original'
                : defaultName
                  ? 'Save as new CV'
                  : 'Create CV'}
          </button>
        </div>
      </div>
    </div>
  )
}
