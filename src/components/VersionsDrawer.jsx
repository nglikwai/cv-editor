import { useEffect, useState } from 'react'
import { FiCheck, FiClock, FiTrash2 } from 'react-icons/fi'

import { deleteVersion, listVersions } from '../services/s3'
import { RIGHT_PANEL_WIDTHS, SidePanel } from './SidePanel'

const formatDate = (date) =>
  new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// Saved-version history for the open CV, shown in the right-hand drawer
// beside the other CV tools. It stays open while you open versions, so you
// can step through them and compare.
export const VersionsDrawer = ({
  isOpen,
  visible = true,
  onClose,
  cvName,
  currentVersionId,
  onLoadVersion,
  hasUnsavedChanges = false,
  refreshKey,
  userId = 'default',
}) => {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmLoad, setConfirmLoad] = useState(null)
  const [error, setError] = useState(null)

  // Reloads when a save finishes (refreshKey), so new versions appear live.
  useEffect(() => {
    if (!isOpen || !cvName) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)
    listVersions(cvName, userId)
      .then((list) => { if (!cancelled) setVersions(list) })
      .catch((err) => {
        console.error('Error listing versions:', err)
        if (!cancelled) setError('Failed to load versions')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isOpen, cvName, userId, refreshKey])

  useEffect(() => {
    setConfirmDelete(null)
    setConfirmLoad(null)
  }, [isOpen, cvName, currentVersionId])

  const handleLoad = async (versionId) => {
    // Opening another version replaces what is on screen, so ask first when
    // there are edits that have not been saved.
    const key = versionId || 'latest'
    if (hasUnsavedChanges && confirmLoad !== key) {
      setConfirmLoad(key)
      setConfirmDelete(null)
      return
    }
    setConfirmLoad(null)
    setLoadingId(key)
    try {
      await onLoadVersion(versionId)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (versionId) => {
    if (confirmDelete !== versionId) {
      setConfirmDelete(versionId)
      setConfirmLoad(null)
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

  const openButtonClass = 'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-deep-blue'
  const openLabel = (key) => confirmLoad === key ? 'Discard edits & open' : 'Open'
  const openTone = (key) => confirmLoad === key
    ? 'bg-amber-500 text-white border-transparent hover:bg-amber-600'
    : 'text-deep-blue border-deep-blue/20 hover:bg-deep-blue hover:text-white hover:border-transparent'

  return (
    <SidePanel
      title="Saved Versions"
      icon={FiClock}
      description={cvName}
      width={RIGHT_PANEL_WIDTHS.versions}
      visible={visible}
      padded={false}
      onClose={onClose}
      closeLabel="Close saved versions"
    >
          {error && (
            <div role="alert" className="mx-4 lg:mx-5 mb-3 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <ul className="divide-y divide-border-light border-t border-border-light">
            <li className="flex items-center justify-between gap-3 px-4 lg:px-5 py-3 bg-deep-blue/[0.03]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-deep-blue">Latest</p>
                  {!currentVersionId && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                      <FiCheck size={10} /> Open now
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-light mt-0.5">Current editable version</p>
              </div>
              <button
                type="button"
                onClick={() => handleLoad(null)}
                disabled={!currentVersionId || !!loadingId}
                className={`${openButtonClass} ${openTone('latest')}`}
              >
                {loadingId === 'latest' ? 'Opening…' : openLabel('latest')}
              </button>
            </li>

            {loading && versions.length === 0 ? (
              <li className="text-sm text-text-light text-center py-10">Loading versions…</li>
            ) : versions.length === 0 ? (
              <li className="text-sm text-text-light text-center px-4 lg:px-5 py-10">
                No saved history yet. Choose “New version” when saving to keep a snapshot you can return to.
              </li>
            ) : (
              versions.map((version, index) => {
                const selected = currentVersionId === version.id
                const busy = loadingId === version.id
                return (
                  <li
                    key={version.id}
                    className={`flex items-center justify-between gap-3 px-4 lg:px-5 py-3 transition-colors ${selected ? 'bg-deep-blue/[0.05]' : 'hover:bg-bg-light'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-dark">Version {versions.length - index}</p>
                        {selected && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-deep-blue bg-deep-blue/10 rounded-full px-2 py-0.5">
                            <FiCheck size={10} /> Open now
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-light mt-0.5">{formatDate(version.lastModified)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDelete(version.id)}
                        disabled={!!loadingId}
                        title={confirmDelete === version.id ? 'Click again to delete permanently' : 'Delete version'}
                        aria-label={confirmDelete === version.id ? `Confirm deleting version ${versions.length - index}` : `Delete version ${versions.length - index}`}
                        className={`flex items-center gap-1.5 p-2 text-xs font-semibold leading-none rounded-lg border transition-colors disabled:opacity-40 ${
                          confirmDelete === version.id
                            ? 'bg-red-600 text-white border-transparent'
                            : 'text-red-400 border-red-200 hover:bg-red-600 hover:text-white hover:border-transparent'
                        }`}
                      >
                        <FiTrash2 size={16} />
                        {confirmDelete === version.id && <span>Delete?</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoad(version.id)}
                        disabled={selected || !!loadingId}
                        className={`${openButtonClass} ${openTone(version.id)}`}
                      >
                        {busy ? 'Opening…' : openLabel(version.id)}
                      </button>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
    </SidePanel>
  )
}
