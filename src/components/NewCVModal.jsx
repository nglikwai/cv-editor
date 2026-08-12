import { useEffect, useState } from 'react'
import { FiCopy, FiFilePlus } from 'react-icons/fi'

const formatDate = (date) => new Date(date).toLocaleString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export const NewCVModal = ({ isOpen, boardTag, saves, onCancel, onConfirm }) => {
  const [mode, setMode] = useState('template')
  const [sourceName, setSourceName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const latest = saves[0]
    setMode(latest ? 'clone' : 'template')
    setSourceName(latest?.name || '')
    setCreating(false)
  }, [isOpen, saves])

  if (!isOpen) return null

  const selectedSave = saves.find((save) => save.name === sourceName) || saves[0]

  const handleConfirm = async () => {
    setCreating(true)
    try {
      const completed = await onConfirm(mode === 'clone' ? selectedSave : null)
      if (completed !== false) onCancel()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4 print:hidden"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border-light bg-bg-light/60">
          <h2 className="text-base font-semibold text-deep-blue">Create new CV</h2>
          <p className="text-xs text-text-light mt-1">
            {boardTag ? <>It will be added to the <strong>{boardTag}</strong> board.</> : 'Choose a starting point for the new CV.'}
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => saves.length && setMode('clone')}
              disabled={!saves.length}
              className={`p-4 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === 'clone'
                  ? 'border-deep-blue bg-deep-blue/5 ring-2 ring-deep-blue/10'
                  : 'border-border-light hover:bg-bg-light'
              }`}
            >
              <FiCopy size={18} className={mode === 'clone' ? 'text-deep-blue' : 'text-text-light'} />
              <span className="block text-sm font-semibold text-text-dark mt-2">Clone a CV</span>
              <span className="block text-[11px] text-text-light mt-0.5">Copy an existing CV</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === 'template'
                  ? 'border-deep-blue bg-deep-blue/5 ring-2 ring-deep-blue/10'
                  : 'border-border-light hover:bg-bg-light'
              }`}
            >
              <FiFilePlus size={18} className={mode === 'template' ? 'text-deep-blue' : 'text-text-light'} />
              <span className="block text-sm font-semibold text-text-dark mt-2">Use template</span>
              <span className="block text-[11px] text-text-light mt-0.5">Start from the base CV</span>
            </button>
          </div>

          {mode === 'clone' && selectedSave && (
            <div className="mt-5">
              <label htmlFor="clone-cv" className="block text-xs font-semibold text-text-dark mb-1.5">
                CV to clone
              </label>
              <select
                id="clone-cv"
                value={selectedSave.name}
                onChange={(event) => setSourceName(event.target.value)}
                className="w-full border border-border-light rounded-lg px-3 py-2.5 text-sm text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-deep-blue/20"
              >
                {saves.map((save, index) => (
                  <option key={save.name} value={save.name}>
                    {`${save.name}${index === 0 ? ' — Latest' : ''} · ${formatDate(save.lastModified)}`}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-text-light mt-2">
                The most recently updated CV in this board is selected by default.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border-light bg-bg-light/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={creating}
            className="px-4 py-2 text-sm text-text-light hover:text-text-dark transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={creating || (mode === 'clone' && !selectedSave)}
            className="px-4 py-2 text-sm font-medium text-white bg-deep-blue rounded-lg hover:bg-light-blue transition-colors disabled:opacity-40"
          >
            {creating ? 'Creating…' : mode === 'clone' ? 'Clone CV' : 'Create from template'}
          </button>
        </div>
      </div>
    </div>
  )
}
