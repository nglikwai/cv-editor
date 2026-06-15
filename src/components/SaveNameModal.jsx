import { useEffect, useRef, useState } from 'react'

const sanitize = (name) =>
  name.trim().replace(/[^a-zA-Z0-9\-_. ]/g, '').slice(0, 80)

export const SaveNameModal = ({ isOpen, onConfirm, onCancel, defaultName }) => {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setName(defaultName || '')
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [isOpen, defaultName])

  const handleConfirm = () => {
    const safe = sanitize(name)
    if (safe) onConfirm(safe)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onCancel()
  }

  if (!isOpen) return null

  const safe = sanitize(name)

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
          onKeyDown={handleKeyDown}
          className="w-full border border-border-light rounded-lg px-3 py-2 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-deep-blue/30"
        />
        <div className="flex justify-end gap-2 mt-4">
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
