import { useEffect, useState } from 'react'
import { FiClock, FiDownload, FiTrash2 } from 'react-icons/fi'
import { deleteSave, listSaves } from '../services/s3'

const formatDate = (date) =>
  new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const SavesModal = ({ isOpen, onClose, onLoad }) => {
  const [saves, setSaves] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingName, setLoadingName] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    listSaves()
      .then(setSaves)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isOpen])

  const handleLoad = async (name) => {
    setLoadingName(name)
    await onLoad(name)
    setLoadingName(null)
    onClose()
  }

  const handleDelete = async (name) => {
    if (confirmDelete !== name) {
      setConfirmDelete(name)
      return
    }
    try {
      await deleteSave(name)
      setSaves((prev) => prev.filter((s) => s.name !== name))
    } catch (err) {
      console.error('Error deleting save:', err)
    } finally {
      setConfirmDelete(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] print:hidden"
      onClick={() => { setConfirmDelete(null); onClose() }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 border-b border-border-light flex items-center gap-2">
          <FiClock className="text-golden-yellow shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-deep-blue">
            Saved Versions
          </h3>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-sm text-text-light text-center py-10">Loading...</p>
          ) : saves.length === 0 ? (
            <p className="text-sm text-text-light text-center py-10">No saves found.</p>
          ) : (
            <ul className="divide-y divide-border-light">
              {saves.map((save) => (
                <li
                  key={save.name}
                  className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-bg-light transition-colors"
                  onClick={() => confirmDelete && setConfirmDelete(null)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-dark truncate">{save.name}</p>
                    <p className="text-xs text-text-light mt-0.5">{formatDate(save.lastModified)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(save.name) }}
                      disabled={!!loadingName}
                      title={confirmDelete === save.name ? 'Confirm delete' : 'Delete'}
                      className={`p-2 rounded-lg border transition-colors disabled:opacity-40 ${
                        confirmDelete === save.name
                          ? 'bg-red-600 text-white border-transparent'
                          : 'text-red-400 border-red-200 hover:bg-red-600 hover:text-white hover:border-transparent'
                      }`}
                    >
                      <FiTrash2 />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLoad(save.name) }}
                      disabled={!!loadingName}
                      title="Load"
                      className="p-2 text-deep-blue rounded-lg border border-deep-blue/20 hover:bg-deep-blue hover:text-white hover:border-transparent transition-colors disabled:opacity-40"
                    >
                      <FiDownload />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-6 py-3 border-t border-border-light flex justify-end">
          <button
            onClick={onClose}
            className="text-sm text-text-light hover:text-text-dark transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
