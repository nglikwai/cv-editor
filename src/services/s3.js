import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

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

const cvKey = (name) => `${FOLDER}/${name}.json`

export const listSaves = async () => {
  const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${FOLDER}/` })
  const response = await s3Client.send(command)
  return (response.Contents || [])
    .filter((obj) => obj.Key !== `${FOLDER}/` && obj.Key !== SETTINGS_KEY)
    .map((obj) => ({
      key: obj.Key,
      name: obj.Key.slice(`${FOLDER}/`.length).replace(/\.json$/, ''),
      lastModified: obj.LastModified,
      size: obj.Size,
    }))
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
}

export const loadFromS3 = async (name) => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: cvKey(name) })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey') return null
    throw error
  }
}

export const loadLatestFromS3 = async () => {
  const saves = await listSaves()
  if (!saves.length) return { data: null, name: null }
  const data = await loadFromS3(saves[0].name)
  return { data, name: saves[0].name }
}

export const deleteSave = async (name) => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: cvKey(name) })
  await s3Client.send(command)
}

export const saveToS3 = async (data, name) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: cvKey(name),
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  })
  await s3Client.send(command)
}

export const loadSettings = async () => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: SETTINGS_KEY })
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
  })
  await s3Client.send(command)
}
