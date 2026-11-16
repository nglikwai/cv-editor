import { useState, useEffect } from 'react'
import { FiCode } from 'react-icons/fi'

import { RIGHT_PANEL_WIDTHS, SidePanel, panelButton, panelButtonPrimary } from './SidePanel'
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
    <SidePanel
      title="CV Data"
      icon={FiCode}
      description="Edit structured JSON or preview it as Markdown."
      width={RIGHT_PANEL_WIDTHS.json}
      visible={visible}
      onClose={onClose}
      closeLabel="Close CV data editor"
      bodyClassName="flex flex-col overflow-hidden"
      contentClassName="flex-1 min-h-0 flex flex-col"
      footer={(
        <>
          {view === 'json' ? (
            <button type="button" onClick={handlePaste} className={`${panelButton} mr-auto`}>Paste from Clipboard</button>
          ) : (
            <button type="button" onClick={handleCopyMarkdown} className={`${panelButton} mr-auto`}>Copy Markdown</button>
          )}
          <button type="button" onClick={onClose} className={panelButton}>Cancel</button>
          <button type="button" onClick={handleConfirm} className={panelButtonPrimary}>Confirm</button>
        </>
      )}
    >
      <div className="flex items-center gap-1 p-1 mb-3 bg-bg-light border border-border-light rounded-lg self-start">
        {[
          { id: 'json', label: 'JSON' },
          { id: 'markdown', label: 'Markdown' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleViewChange(option.id)}
            aria-pressed={view === option.id}
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
        <div role="alert" className="mb-3 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
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
        spellCheck={false}
        className="flex-1 min-h-0 w-full p-3 font-mono text-xs leading-relaxed border border-border-light rounded-xl bg-bg-light/50 text-text-dark resize-none focus:outline-none focus:ring-2 focus:ring-deep-blue/20"
        placeholder={view === 'json' ? 'Paste your JSON here...' : 'Markdown preview'}
        aria-label={view === 'json' ? 'CV JSON editor' : 'CV Markdown preview'}
      />
    </SidePanel>
  )
}
