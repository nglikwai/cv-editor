const request = async (operation, payload = {}) => {
  const response = await fetch('/api/storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, ...payload }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Storage request failed')
  return result.data
}

export const listSaves = (userId = 'default') => request('listSaves', { userId })
export const loadFromS3 = (name, userId = 'default') => request('loadFromS3', { name, userId })
export const listVersions = (name, userId = 'default') => request('listVersions', { name, userId })
export const loadVersionFromS3 = (name, versionId, userId = 'default') => request('loadVersionFromS3', { name, versionId, userId })
export const deleteVersion = (name, versionId, userId = 'default') => request('deleteVersion', { name, versionId, userId })
export const deleteSave = (name, userId = 'default') => request('deleteSave', { name, userId })
export const saveToS3 = (data, name, tags = [], createVersion = true, userId = 'default') => request('saveToS3', { data, name, tags, createVersion, userId })
export const loadSettings = () => request('loadSettings')
export const saveSettings = (data) => request('saveSettings', { data })
export const loadBoard = (userId = 'default') => request('loadBoard', { userId })
export const updateSaveStatus = (name, status, userId = 'default') => request('updateSaveStatus', { name, status, userId })

