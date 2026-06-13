import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: import.meta.env.VITE_S3_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_S3_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_S3_SECRET_ACCESS_KEY,
  },
})

const BUCKET = 'likwai'
const CV_KEY = 'cv-generator/cv.json'
const SETTINGS_KEY = 'cv-generator/settings.json'

export const loadFromS3 = async () => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: CV_KEY,
    })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return null
    }
    throw error
  }
}

export const saveToS3 = async (data) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: CV_KEY,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  })
  await s3Client.send(command)
}

export const loadSettings = async () => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: SETTINGS_KEY,
    })
    const response = await s3Client.send(command)
    const text = await response.Body.transformToString()
    return JSON.parse(text)
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return null
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
  })
  await s3Client.send(command)
}
