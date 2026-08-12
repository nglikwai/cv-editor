import { useState, useEffect } from 'react'
import { cvToMarkdown } from '../utils/cvToMarkdown'

export const JsonEditorModal = ({ isOpen, visible = true, onClose, cvData, onConfirm, showSnackbar }) => {
  const [jsonText, setJsonText] = useState('')
  const [markdownText, setMarkdownText] = useState('')
  const [view, setView] = useState('json')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setJsonText(JSON.stringify(cvData, null, 2))
      setMarkdownText(cvToMarkdown(cvData))
      setView('json')
      setError('')
    }
  }, [isOpen, cvData])

  useEffect(() => {
    if (!isOpen || !visible) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, visible, onClose])

  const handleConfirm = () => {
    try {
      const parsed = JSON.parse(jsonText)
      onConfirm(parsed)
      onClose()
    } catch (e) {
      setError('Invalid JSON: ' + e.message)
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text)
      setJsonText(JSON.stringify(parsed, null, 2))
      onConfirm(parsed)
      onClose()
      showSnackbar?.('Successfully pasted!')
    } catch (e) {
      setError('Invalid JSON from clipboard: ' + e.message)
    }
  }

  const handleViewChange = (nextView) => {
    if (nextView === 'markdown') {
      try {
        setMarkdownText(cvToMarkdown(JSON.parse(jsonText)))
        setError('')
      } catch (e) {
        setError('Fix the JSON before opening Markdown view: ' + e.message)
        return
      }
    }
    setView(nextView)
  }

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownText)
      showSnackbar?.('Markdown copied to clipboard!')
    } catch (e) {
      setError('Unable to copy Markdown: ' + e.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-[2000] pointer-events-none print:hidden ${visible ? '' : 'hidden'}`}>
      <aside className="left-settings-drawer pointer-events-auto absolute top-16 bottom-0 left-0 bg-white shadow-2xl border-r border-border-light w-[640px] max-w-[calc(100vw-1rem)] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-deep-blue">CV Data</h2>
            <p className="text-xs text-text-light mt-0.5">Edit structured JSON or preview it as Markdown.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-1 p-1 mb-3 bg-bg-light border border-border-light rounded-lg self-start">
            {[
              { id: 'json', label: 'JSON' },
              { id: 'markdown', label: 'Markdown' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleViewChange(option.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  view === option.id
                    ? 'bg-white text-deep-blue shadow-sm'
                    : 'text-text-light hover:text-text-dark'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <textarea
            value={view === 'json' ? jsonText : markdownText}
            readOnly={view === 'markdown'}
            onChange={view === 'json' ? (e) => {
              setJsonText(e.target.value)
              setError('')
            } : undefined}
            className="flex-1 w-full p-4 font-mono text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-light-blue focus:border-transparent"
            placeholder={view === 'json' ? 'Paste your JSON here...' : 'Markdown preview'}
            aria-label={view === 'json' ? 'CV JSON editor' : 'CV Markdown preview'}
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap justify-between gap-3">
          {view === 'json' ? (
            <button
              onClick={handlePaste}
              className="px-6 py-2.5 border border-gray-300 rounded cursor-pointer text-sm font-medium transition-all duration-200 text-gray-700 hover:bg-gray-100"
            >
              Paste from Clipboard
            </button>
          ) : (
            <button
              onClick={handleCopyMarkdown}
              className="px-6 py-2.5 border border-gray-300 rounded cursor-pointer text-sm font-medium transition-all duration-200 text-gray-700 hover:bg-gray-100"
            >
              Copy Markdown
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded cursor-pointer text-sm font-medium transition-all duration-200 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2.5 border-none rounded cursor-pointer text-sm font-medium transition-all duration-200 bg-golden-yellow text-deep-blue hover:bg-golden-hover"
            >
              Confirm
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
