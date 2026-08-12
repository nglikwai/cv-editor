import 'server-only'

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.S3_BUCKET || 'likwai'
const FOLDER = 'cv-workspace'
const LEGACY_FOLDER = 'willcv'
const SETTINGS_KEY = `${FOLDER}/settings.json`
const LEGACY_SETTINGS_KEY = `${LEGACY_FOLDER}/settings.json`
const TAGS_KEY = `${FOLDER}/will/tags.json`
const BOARD_KEY = `${FOLDER}/will/board.json`
const VERSIONS_FOLDER = `${FOLDER}/versions`
const NO_CACHE = 'no-store, no-cache, must-revalidate, max-age=0'

export const DEFAULT_BOARD_COLUMNS = [
  { id: 'archived', title: 'Archived', color: '#94a3b8' },
  { id: 'draft', title: 'Draft', color: '#64748b' },
  { id: 'applied', title: 'Applied', color: '#d4a039' },
  { id: 'phone', title: 'Phone Interview', color: '#0ea5e9' },
  { id: 'video', title: 'Video Interview', color: '#6366f1' },
  { id: 'technical', title: 'Technical Interview', color: '#7c3aed' },
  { id: 'final', title: 'Final Interview', color: '#db2777' },
  { id: 'offer', title: 'Offer', color: '#16a34a' },
]

const DEFAULT_BOARD = {
  columns: DEFAULT_BOARD_COLUMNS,
  statuses: {},
}

const userFolder = (userId = 'default') => userId === 'default'
  ? `${FOLDER}/will`
  : `${FOLDER}/${encodeURIComponent(userId)}`
const legacyCvKey = (name) => `${LEGACY_FOLDER}/${name}.json`
const legacyVersionPrefix = (name) => `${LEGACY_FOLDER}/versions/${encodeURIComponent(name)}/`
const legacyVersionKey = (name, versionId) => `${legacyVersionPrefix(name)}${encodeURIComponent(versionId)}.json`
const legacyTagsKey = `${LEGACY_FOLDER}/tags.json`
const legacyBoardKey = `${LEGACY_FOLDER}/board.json`
const userTagsKey = (userId = 'default') => userId === 'default' ? TAGS_KEY : `${userFolder(userId)}/tags.json`
const userBoardKey = (userId = 'default') => userId === 'default' ? BOARD_KEY : `${userFolder(userId)}/board.json`
const cvKey = (name, userId = 'default') => `${userFolder(userId)}/${name}.json`
const versionPrefix = (name, userId = 'default') => `${userFolder(userId)}/versions/${encodeURIComponent(name)}/`
const versionKey = (name, versionId, userId = 'default') => `${versionPrefix(name, userId)}${encodeURIComponent(versionId)}.json`

const loadTags = async (userId = 'default') => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: userTagsKey(userId), ResponseCacheControl: NO_CACHE })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey' && userId === 'default') {
      const legacy = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: legacyTagsKey, ResponseCacheControl: NO_CACHE })).catch(() => null)
      if (legacy) return JSON.parse(await legacy.Body.transformToString())
      return {}
    }
    if (error.name === 'NoSuchKey') return {}
    throw error
  }
}

const saveTags = async (tags, userId = 'default') => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: userTagsKey(userId),
    Body: JSON.stringify(tags, null, 2),
    ContentType: 'application/json',
    CacheControl: NO_CACHE,
  })
  await s3Client.send(command)
}

const META_KEYS = new Set([SETTINGS_KEY, TAGS_KEY, BOARD_KEY, `${FOLDER}/`])

export const listSaves = async (userId = 'default') => {
  const prefix = `${userFolder(userId)}/`
  const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix })
  const [response, legacyResponse, tags, board] = await Promise.all([
    s3Client.send(command),
    userId === 'default'
      ? s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${LEGACY_FOLDER}/` })).catch(() => ({ Contents: [] }))
      : Promise.resolve({ Contents: [] }),
    loadTags(userId).catch(() => ({})),
    loadBoard(userId).catch(() => ({ ...DEFAULT_BOARD, statuses: {} })),
  ])
  const objects = [...(response.Contents || []), ...(legacyResponse.Contents || [])]
  return objects
    .filter((obj) => {
      if (obj.Key === userTagsKey(userId) || obj.Key === userBoardKey(userId) || !obj.Key.endsWith('.json')) return false
      const sourcePrefix = obj.Key.startsWith(prefix) ? prefix : `${LEGACY_FOLDER}/`
      const relativeKey = obj.Key.slice(sourcePrefix.length)
      return !relativeKey.includes('/')
    })
    .map((obj) => {
      const sourcePrefix = obj.Key.startsWith(prefix) ? prefix : `${LEGACY_FOLDER}/`
      const name = obj.Key.slice(sourcePrefix.length).replace(/\.json$/, '')
      return {
        key: obj.Key,
        name,
        lastModified: obj.LastModified,
        size: obj.Size,
        tags: tags[name] || [],
        status: board.statuses[name] || 'draft',
      }
    })
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
}

export const loadFromS3 = async (name, userId = 'default') => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: cvKey(name, userId), ResponseCacheControl: NO_CACHE })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey' && userId === 'default') {
      const legacy = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: legacyCvKey(name), ResponseCacheControl: NO_CACHE })).catch(() => null)
      if (legacy) return JSON.parse(await legacy.Body.transformToString())
      return null
    }
    if (error.name === 'NoSuchKey') return null
    throw error
  }
}

export const listVersions = async (name, userId = 'default') => {
  const prefix = versionPrefix(name, userId)
  const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix })
  const [response, legacyResponse] = await Promise.all([
    s3Client.send(command),
    userId === 'default'
      ? s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: legacyVersionPrefix(name) })).catch(() => ({ Contents: [] }))
      : Promise.resolve({ Contents: [] }),
  ])

  return [...(response.Contents || []), ...(legacyResponse.Contents || [])]
    .filter((object) => object.Key.endsWith('.json'))
    .map((object) => {
      const encodedId = object.Key.slice(prefix.length).replace(/\.json$/, '')
      return {
        id: decodeURIComponent(encodedId),
        lastModified: object.LastModified,
        size: object.Size,
      }
    })
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
}

export const loadVersionFromS3 = async (name, versionId, userId = 'default') => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: versionKey(name, versionId, userId),
      ResponseCacheControl: NO_CACHE,
    })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey' && userId === 'default') {
      const legacy = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: legacyVersionKey(name, versionId), ResponseCacheControl: NO_CACHE })).catch(() => null)
      return legacy ? JSON.parse(await legacy.Body.transformToString()) : null
    }
    if (error.name === 'NoSuchKey') return null
    throw error
  }
}

export const deleteVersion = async (name, versionId, userId = 'default') => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: versionKey(name, versionId, userId),
  })
  await s3Client.send(command)
}

export const loadLatestFromS3 = async (userId = 'default') => {
  const saves = await listSaves(userId)
  if (!saves.length) return { data: null, name: null, tags: [] }
  const data = await loadFromS3(saves[0].name, userId)
  return { data, name: saves[0].name, tags: saves[0].tags }
}

export const deleteSave = async (name, userId = 'default') => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: cvKey(name, userId) })
  await s3Client.send(command)
  const versionsCommand = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: versionPrefix(name, userId),
  })
  const versions = await s3Client.send(versionsCommand)
  if (versions.Contents?.length) {
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: {
        Objects: versions.Contents.map((object) => ({ Key: object.Key })),
        Quiet: true,
      },
    }))
  }
  const [tags, board] = await Promise.all([loadTags(userId), loadBoard(userId)])
  const jobs = []
  if (name in tags) {
    delete tags[name]
    jobs.push(saveTags(tags, userId))
  }
  if (name in board.statuses) {
    delete board.statuses[name]
    jobs.push(saveBoard(board, userId))
  }
  await Promise.all(jobs)
}

export const saveToS3 = async (data, name, tags = [], createVersion = true, userId = 'default') => {
  const body = JSON.stringify(data, null, 2)

  if (createVersion) {
    const versionId = new Date().toISOString()
    const versionCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: versionKey(name, versionId, userId),
      Body: body,
      ContentType: 'application/json',
      CacheControl: NO_CACHE,
    })
    await s3Client.send(versionCommand)
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: cvKey(name, userId),
    Body: body,
    ContentType: 'application/json',
    CacheControl: NO_CACHE,
  })
  await s3Client.send(command)

  const allTags = await loadTags(userId)
  if (tags.length) {
    allTags[name] = tags
  } else {
    delete allTags[name]
  }
  await saveTags(allTags, userId)
}

export const loadSettings = async () => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: SETTINGS_KEY, ResponseCacheControl: NO_CACHE })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      const legacy = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: LEGACY_SETTINGS_KEY, ResponseCacheControl: NO_CACHE })).catch(() => null)
      return legacy ? JSON.parse(await legacy.Body.transformToString()) : null
    }
    throw error
  }
}

export const saveSettings = async (data) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: SETTINGS_KEY,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
    CacheControl: NO_CACHE,
  })
  await s3Client.send(command)
}

export const loadBoard = async (userId = 'default') => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: userBoardKey(userId), ResponseCacheControl: NO_CACHE })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    const data = JSON.parse(text)
    const hasLegacyInterviewColumn = data.columns?.some((column) => column.id === 'interview')
    const statuses = Object.fromEntries(
      Object.entries(data.statuses || {}).map(([name, status]) => [
        name,
        status === 'interview' ? 'phone' : status === 'ready' ? 'draft' : status,
      ]),
    )
    const columns = data.columns?.length && !hasLegacyInterviewColumn
      ? data.columns
      : DEFAULT_BOARD_COLUMNS
    return {
      columns: [
        ...columns.filter((column) => column.id === 'archived'),
        ...columns.filter((column) => column.id !== 'archived' && column.id !== 'ready'),
      ],
      statuses,
    }
  } catch (error) {
    if (error.name === 'NoSuchKey' && userId === 'default') {
      const legacy = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: legacyBoardKey, ResponseCacheControl: NO_CACHE })).catch(() => null)
      if (legacy) {
        const data = JSON.parse(await legacy.Body.transformToString())
        return { ...data, statuses: data.statuses || {} }
      }
    }
    if (error.name === 'NoSuchKey') return { ...DEFAULT_BOARD, statuses: {} }
    throw error
  }
}

export const saveBoard = async (board, userId = 'default') => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: userBoardKey(userId),
    Body: JSON.stringify(board, null, 2),
    ContentType: 'application/json',
    CacheControl: NO_CACHE,
  })
  await s3Client.send(command)
}

export const updateSaveStatus = async (name, status, userId = 'default') => {
  const board = await loadBoard(userId)
  board.statuses[name] = status
  await saveBoard(board, userId)
  return board
}
