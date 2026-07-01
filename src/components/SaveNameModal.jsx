import { useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'

const sanitize = (name) =>
  name.trim().replace(/[^a-zA-Z0-9\-_. ]/g, '').slice(0, 80)

export const SaveNameModal = ({ isOpen, onConfirm, onCancel, defaultName, defaultTags = [], allTags = [] }) => {
  const [name, setName] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
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

  const handleConfirm = () => {
    const safe = sanitize(name)
    if (!safe) return
    const pending = tagInput.trim()
    const finalTags = pending && !tags.some((t) => t.toLowerCase() === pending.toLowerCase())
      ? [...tags, pending]
      : tags
    onConfirm(safe, finalTags)
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
  const tagSuggestions = allTags.filter((t) => !tags.some((existing) => existing.toLowerCase() === t.toLowerCase()))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-96 p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-deep-blue mb-4">
          Name this save
        </h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleNameKeyDown}
          className="w-full border border-border-light rounded-lg px-3 py-2 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-deep-blue/30"
        />

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
            disabled={!safe}
            className="px-4 py-2 text-sm bg-deep-blue text-white rounded-lg hover:bg-light-blue transition-colors disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
