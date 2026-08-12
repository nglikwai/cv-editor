import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: import.meta.env.VITE_S3_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_S3_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_S3_SECRET_ACCESS_KEY,
  },
})

const BUCKET = import.meta.env.VITE_S3_BUCKET || 'likwai'
const FOLDER = 'willcv'
const SETTINGS_KEY = 'willcv/settings.json'
const TAGS_KEY = 'willcv/tags.json'
const BOARD_KEY = 'willcv/board.json'
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

const cvKey = (name) => `${FOLDER}/${name}.json`
const versionPrefix = (name) => `${VERSIONS_FOLDER}/${encodeURIComponent(name)}/`
const versionKey = (name, versionId) => `${versionPrefix(name)}${encodeURIComponent(versionId)}.json`

const loadTags = async () => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: TAGS_KEY, ResponseCacheControl: NO_CACHE })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey') return {}
    throw error
  }
}

const saveTags = async (tags) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: TAGS_KEY,
    Body: JSON.stringify(tags, null, 2),
    ContentType: 'application/json',
    CacheControl: NO_CACHE,
  })
  await s3Client.send(command)
}

const META_KEYS = new Set([SETTINGS_KEY, TAGS_KEY, BOARD_KEY, `${FOLDER}/`])

export const listSaves = async () => {
  const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${FOLDER}/` })
  const [response, tags, board] = await Promise.all([
    s3Client.send(command),
    loadTags().catch(() => ({})),
    loadBoard().catch(() => ({ ...DEFAULT_BOARD, statuses: {} })),
  ])
  return (response.Contents || [])
    .filter((obj) => {
      if (META_KEYS.has(obj.Key) || !obj.Key.endsWith('.json')) return false
      const relativeKey = obj.Key.slice(`${FOLDER}/`.length)
      return !relativeKey.includes('/')
    })
    .map((obj) => {
      const name = obj.Key.slice(`${FOLDER}/`.length).replace(/\.json$/, '')
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

export const loadFromS3 = async (name) => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: cvKey(name), ResponseCacheControl: NO_CACHE })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey') return null
    throw error
  }
}

export const listVersions = async (name) => {
  const prefix = versionPrefix(name)
  const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix })
  const response = await s3Client.send(command)

  return (response.Contents || [])
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

export const loadVersionFromS3 = async (name, versionId) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: versionKey(name, versionId),
      ResponseCacheControl: NO_CACHE,
    })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey') return null
    throw error
  }
}

export const deleteVersion = async (name, versionId) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: versionKey(name, versionId),
  })
  await s3Client.send(command)
}

export const loadLatestFromS3 = async () => {
  const saves = await listSaves()
  if (!saves.length) return { data: null, name: null, tags: [] }
  const data = await loadFromS3(saves[0].name)
  return { data, name: saves[0].name, tags: saves[0].tags }
}

export const deleteSave = async (name) => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: cvKey(name) })
  await s3Client.send(command)
  const versionsCommand = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: versionPrefix(name),
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
  const [tags, board] = await Promise.all([loadTags(), loadBoard()])
  const jobs = []
  if (name in tags) {
    delete tags[name]
    jobs.push(saveTags(tags))
  }
  if (name in board.statuses) {
    delete board.statuses[name]
    jobs.push(saveBoard(board))
  }
  await Promise.all(jobs)
}

export const saveToS3 = async (data, name, tags = [], createVersion = true) => {
  const body = JSON.stringify(data, null, 2)

  if (createVersion) {
    const versionId = new Date().toISOString()
    const versionCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: versionKey(name, versionId),
      Body: body,
      ContentType: 'application/json',
      CacheControl: NO_CACHE,
    })
    await s3Client.send(versionCommand)
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: cvKey(name),
    Body: body,
    ContentType: 'application/json',
    CacheControl: NO_CACHE,
  })
  await s3Client.send(command)

  const allTags = await loadTags()
  if (tags.length) {
    allTags[name] = tags
  } else {
    delete allTags[name]
  }
  await saveTags(allTags)
}

export const loadSettings = async () => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: SETTINGS_KEY, ResponseCacheControl: NO_CACHE })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey') return null
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

export const loadBoard = async () => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: BOARD_KEY, ResponseCacheControl: NO_CACHE })
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
    if (error.name === 'NoSuchKey') return { ...DEFAULT_BOARD, statuses: {} }
    throw error
  }
}

export const saveBoard = async (board) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: BOARD_KEY,
    Body: JSON.stringify(board, null, 2),
    ContentType: 'application/json',
    CacheControl: NO_CACHE,
  })
  await s3Client.send(command)
}

export const updateSaveStatus = async (name, status) => {
  const board = await loadBoard()
  board.statuses[name] = status
  await saveBoard(board)
  return board
}
