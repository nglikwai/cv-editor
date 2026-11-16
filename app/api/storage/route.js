import {
  loadMasterExperience,
  saveMasterExperience,
  deleteSave,
  deleteVersion,
  listSaves,
  listVersions,
  loadBoard,
  loadJobDetail,
  getCvTimeline,
  loadFromS3,
  loadSettings,
  loadVersionFromS3,
  saveSettings,
  saveToS3,
  updateSaveStatus,
  updateSaveDeadline,
  updateSaveJobProfile,
} from '../../../src/lib/s3-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const operations = {
  loadMasterExperience: ({ userId }) => loadMasterExperience(userId),
  saveMasterExperience: ({ data, userId }) => saveMasterExperience(data, userId),
  listSaves: ({ userId }) => listSaves(userId),
  loadFromS3: ({ name, userId }) => loadFromS3(name, userId),
  listVersions: ({ name, userId }) => listVersions(name, userId),
  loadVersionFromS3: ({ name, versionId, userId }) => loadVersionFromS3(name, versionId, userId),
  deleteVersion: ({ name, versionId, userId }) => deleteVersion(name, versionId, userId),
  deleteSave: ({ name, userId }) => deleteSave(name, userId),
  saveToS3: ({ data, name, tags, createVersion, userId }) => saveToS3(data, name, tags, createVersion, userId),
  loadSettings: () => loadSettings(),
  saveSettings: ({ data }) => saveSettings(data),
  loadBoard: ({ userId }) => loadBoard(userId),
  getCvTimeline: ({ name, userId }) => getCvTimeline(name, userId),
  loadJobDetail: ({ name, userId }) => loadJobDetail(name, userId),
  updateSaveJobProfile: ({ name, profile, userId }) => updateSaveJobProfile(name, profile, userId),
  updateSaveDeadline: ({ name, deadline, userId }) => updateSaveDeadline(name, deadline, userId),
  updateSaveStatus: ({ name, status, userId }) => updateSaveStatus(name, status, userId),
}

export async function POST(request) {
  try {
    const body = await request.json()
    const operation = operations[body.operation]
    if (!operation) return Response.json({ error: 'Unknown storage operation' }, { status: 400 })

    const data = await operation(body)
    return Response.json({ data })
  } catch (error) {
    if (error.status === 400) return Response.json({ error: error.message }, { status: 400 })
    console.error('Storage request failed:', error)
    return Response.json({ error: 'Storage request failed' }, { status: 500 })
  }
}
