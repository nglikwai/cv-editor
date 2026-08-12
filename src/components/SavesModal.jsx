import { useEffect, useState } from 'react'
import { FiCheck, FiClock, FiDownload, FiTrash2 } from 'react-icons/fi'
import { deleteVersion, listVersions } from '../services/s3'

const formatDate = (date) =>
  new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const SavesModal = ({
  isOpen,
  onClose,
  cvName,
  currentVersionId,
  onLoadVersion,
  userId = 'default',
}) => {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen || !cvName) return
    setLoading(true)
    setError(null)
    setConfirmDelete(null)
    listVersions(cvName, userId)
      .then(setVersions)
      .catch((err) => {
        console.error('Error listing versions:', err)
        setError('Failed to load versions')
      })
      .finally(() => setLoading(false))
  }, [isOpen, cvName, userId])

  const handleLoad = async (versionId) => {
    setLoadingId(versionId || 'latest')
    try {
      await onLoadVersion(versionId)
      onClose()
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (versionId) => {
    if (confirmDelete !== versionId) {
      setConfirmDelete(versionId)
      return
    }

    setConfirmDelete(null)
    setLoadingId(versionId)
    try {
      await deleteVersion(cvName, versionId, userId)
      setVersions((current) => current.filter((version) => version.id !== versionId))
      if (currentVersionId === versionId) await onLoadVersion(null)
    } catch (err) {
      console.error('Error deleting version:', err)
      setError('Failed to delete version')
    } finally {
      setLoadingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] print:hidden"
      onClick={() => { setConfirmDelete(null); onClose() }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[480px] max-w-[calc(100vw-2rem)] max-h-[70vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 border-b border-border-light flex items-start gap-2">
          <FiClock className="text-golden-yellow shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-deep-blue">
              Saved Versions
            </h3>
            <p className="text-xs text-text-light mt-1 truncate">{cvName}</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {error && (
            <div className="mx-6 mt-4 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <ul className="divide-y divide-border-light">
            <li className="flex items-center justify-between gap-3 px-6 py-3 bg-deep-blue/[0.03]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-deep-blue">Latest</p>
                  {!currentVersionId && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                      <FiCheck size={10} /> Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-light mt-0.5">Current editable version</p>
              </div>
              <button
                onClick={() => handleLoad(null)}
                disabled={!currentVersionId || !!loadingId}
                title="Load latest"
                className="p-2 text-deep-blue rounded-lg border border-deep-blue/20 hover:bg-deep-blue hover:text-white hover:border-transparent transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <FiDownload />
              </button>
            </li>

            {loading ? (
              <li className="text-sm text-text-light text-center py-10">Loading versions…</li>
            ) : versions.length === 0 ? (
              <li className="text-sm text-text-light text-center px-6 py-10">
                No saved history yet. Save this CV to create its first version.
              </li>
            ) : (
              versions.map((version, index) => {
                const selected = currentVersionId === version.id
                const busy = loadingId === version.id
                return (
                  <li
                    key={version.id}
                    className={`flex items-center justify-between gap-3 px-6 py-3 transition-colors ${selected ? 'bg-deep-blue/[0.05]' : 'hover:bg-bg-light'}`}
                    onClick={() => confirmDelete && setConfirmDelete(null)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-dark">
                          Version {versions.length - index}
                        </p>
                        {selected && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-deep-blue bg-deep-blue/10 rounded-full px-2 py-0.5">
                            <FiCheck size={10} /> Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-light mt-0.5">{formatDate(version.lastModified)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(event) => { event.stopPropagation(); handleDelete(version.id) }}
                        disabled={!!loadingId}
                        title={confirmDelete === version.id ? 'Confirm delete' : 'Delete version'}
                        className={`p-2 rounded-lg border transition-colors disabled:opacity-40 ${
                          confirmDelete === version.id
                            ? 'bg-red-600 text-white border-transparent'
                            : 'text-red-400 border-red-200 hover:bg-red-600 hover:text-white hover:border-transparent'
                        }`}
                      >
                        <FiTrash2 />
                      </button>
                      <button
                        onClick={(event) => { event.stopPropagation(); handleLoad(version.id) }}
                        disabled={selected || !!loadingId}
                        title="Load version"
                        className="p-2 text-deep-blue rounded-lg border border-deep-blue/20 hover:bg-deep-blue hover:text-white hover:border-transparent transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <FiDownload className={busy ? 'animate-pulse' : ''} />
                      </button>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
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
