import { useState, useEffect } from 'react'

export const JsonEditorModal = ({ isOpen, onClose, cvData, onConfirm, showSnackbar }) => {
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setJsonText(JSON.stringify(cvData, null, 2))
      setError('')
    }
  }, [isOpen, cvData])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] print:hidden">
      <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-4xl h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-deep-blue">Edit CV JSON</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value)
              setError('')
            }}
            className="flex-1 w-full p-4 font-mono text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-light-blue focus:border-transparent"
            placeholder="Paste your JSON here..."
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={handlePaste}
            className="px-6 py-2.5 border border-gray-300 rounded cursor-pointer text-sm font-medium transition-all duration-200 text-gray-700 hover:bg-gray-100"
          >
            Paste from Clipboard
          </button>
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
      </div>
    </div>
  )
}
