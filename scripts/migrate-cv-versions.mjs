import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const apply = process.argv.includes('--apply')
const bucket = process.env.VITE_S3_BUCKET || 'likwai'
const folder = 'willcv'
const client = new S3Client({
  region: process.env.VITE_S3_REGION,
  credentials: {
    accessKeyId: process.env.VITE_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_S3_SECRET_ACCESS_KEY,
  },
})

const families = [
  { name: 'Adepto_OTSE', matches: (name) => name.startsWith('Adepto_OTSE') },
  { name: 'AkzoNobel_OTAE', matches: (name) => name.startsWith('AkzoNobel_OTAE') },
  { name: 'CE', matches: (name) => name.startsWith('CE_') },
  { name: 'Deloitte', matches: (name) => name.startsWith('Deloitte_') },
  { name: 'Drax_OTCSE', matches: (name) => name.startsWith('Drax_OTCSE') },
  { name: 'GE_OTICS', matches: (name) => name.startsWith('GE_OTICS') },
  { name: 'GeneralTech', matches: (name) => name.startsWith('GeneralTech_') },
  { name: 'Nestle', matches: (name) => name.startsWith('Nestle_') },
  { name: 'Reckitt_GTE', matches: (name) => name.startsWith('Reckitt_GTE') },
  { name: 'Reckitt_PE', matches: (name) => name.startsWith('Reckitt_PE') },
  { name: 'SCH', matches: (name) => name.startsWith('SCH_') },
  { name: 'SSE', matches: (name) => name.startsWith('SSE_') },
  { name: 'SnControlsEng', matches: (name) => name.startsWith('SnControlsEng_') },
  { name: 'Sweco_Leeds', matches: (name) => name.startsWith('Sweco_Leeds_') },
  {
    name: 'Sweco_Warrington',
    matches: (name) => name.startsWith('Sweco_Warrington') || name === 'Sweco_starting',
  },
  { name: 'Tech', matches: (name) => name.startsWith('Tech_') },
  { name: 'UUEngineer', matches: (name) => name.startsWith('UUEngineer_') },
  { name: 'Bilfinger_CS_PM', matches: (name) => name.startsWith('bilfinger_CS_PM_') },
]

const testFiles = new Set(['2026-06-15 1251', '3'])
const metaNames = new Set(['board', 'settings', 'tags'])
const statusRank = new Map([
  ['draft', 0],
  ['applied', 2],
  ['phone', 3],
  ['video', 4],
  ['technical', 5],
  ['final', 6],
  ['offer', 7],
])

const listAll = async (prefix) => {
  const objects = []
  let continuationToken
  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }))
    objects.push(...(response.Contents || []))
    continuationToken = response.NextContinuationToken
  } while (continuationToken)
  return objects
}

const readText = async (key) => {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  return response.Body.transformToString()
}

const readJson = async (key) => JSON.parse(await readText(key))

const putJsonText = async (key, body) => {
  JSON.parse(body)
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'application/json',
  }))
}

const putJson = async (key, value) => {
  await putJsonText(key, JSON.stringify(value, null, 2))
}

const mapLimit = async (items, limit, operation) => {
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      await operation(items[index], index)
    }
  })
  await Promise.all(workers)
}

const objects = await listAll(`${folder}/`)
const rootFiles = objects
  .filter((object) => new RegExp(`^${folder}/[^/]+\\.json$`).test(object.Key))
  .map((object) => ({
    key: object.Key,
    name: object.Key.slice(`${folder}/`.length).replace(/\.json$/, ''),
    modified: object.LastModified,
  }))
  .filter((file) => !metaNames.has(file.name))

const rootNames = new Set(rootFiles.map((file) => file.name))
const conflicts = families.filter((family) => rootNames.has(family.name))
if (conflicts.length) {
  throw new Error(`Canonical files already exist: ${conflicts.map((family) => family.name).join(', ')}`)
}

const grouped = families.map((family) => ({
  ...family,
  files: rootFiles
    .filter((file) => family.matches(file.name))
    .sort((a, b) => new Date(a.modified) - new Date(b.modified)),
}))

const assigned = new Set(grouped.flatMap((family) => family.files.map((file) => file.name)))
const expectedStandalone = new Set([
  'Bilfinger - Operational Technology OT Cyber Security Project Engineer - Submissi',
  'Senior Controls Engineer - Daresbury V.1',
  'Senior Software Engineer - Control  Automation_expsum_OK',
])
const unexpected = rootFiles.filter((file) => (
  !assigned.has(file.name) && !testFiles.has(file.name) && !expectedStandalone.has(file.name)
))

if (grouped.some((family) => !family.files.length)) {
  throw new Error(`Empty families: ${grouped.filter((family) => !family.files.length).map((family) => family.name).join(', ')}`)
}
if (assigned.size !== 117) throw new Error(`Expected 117 grouped files, found ${assigned.size}`)
if (unexpected.length) throw new Error(`Unexpected ungrouped files: ${unexpected.map((file) => file.name).join(', ')}`)
if ([...testFiles].some((name) => !rootNames.has(name))) throw new Error('One or more expected test files is missing')

const [tags, board] = await Promise.all([
  readJson(`${folder}/tags.json`),
  readJson(`${folder}/board.json`),
])

const plan = grouped.map((family) => {
  const latest = family.files.at(-1)
  const familyTags = [...new Set(family.files.flatMap((file) => tags[file.name] || []))]
  const statuses = family.files.map((file) => board.statuses?.[file.name] || 'draft')
  const status = statuses.reduce((best, candidate) => (
    (statusRank.get(candidate) ?? -1) > (statusRank.get(best) ?? -1) ? candidate : best
  ), 'draft')
  return {
    family: family.name,
    versions: family.files.length,
    latest: latest.name,
    tags: familyTags,
    status,
  }
})

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  sourceFiles: assigned.size,
  canonicalCVs: plan.length,
  deletedTests: [...testFiles],
  retainedStandalone: [...expectedStandalone],
  plan,
}, null, 2))

if (!apply) process.exit(0)

const versionWrites = grouped.flatMap((family) => family.files.map((file) => ({ family, file })))
await mapLimit(versionWrites, 8, async ({ family, file }) => {
  const body = await readText(file.key)
  const versionId = new Date(file.modified).toISOString()
  const key = `${folder}/versions/${encodeURIComponent(family.name)}/${encodeURIComponent(versionId)}.json`
  await putJsonText(key, body)
})

await mapLimit(grouped, 6, async (family) => {
  const latest = family.files.at(-1)
  const body = await readText(latest.key)
  await putJsonText(`${folder}/${family.name}.json`, body)
})

for (const family of grouped) {
  const familyPlan = plan.find((item) => item.family === family.name)
  for (const file of family.files) {
    delete tags[file.name]
    if (board.statuses) delete board.statuses[file.name]
  }
  if (familyPlan.tags.length) tags[family.name] = familyPlan.tags
  else delete tags[family.name]
  if (!board.statuses) board.statuses = {}
  if (familyPlan.status !== 'draft') board.statuses[family.name] = familyPlan.status
  else delete board.statuses[family.name]
}

for (const name of testFiles) {
  delete tags[name]
  if (board.statuses) delete board.statuses[name]
}

await Promise.all([
  putJson(`${folder}/tags.json`, tags),
  putJson(`${folder}/board.json`, board),
])

const keysToDelete = [
  ...grouped.flatMap((family) => family.files.map((file) => ({ Key: file.key }))),
  ...[...testFiles].map((name) => ({ Key: `${folder}/${name}.json` })),
]
await client.send(new DeleteObjectsCommand({
  Bucket: bucket,
  Delete: { Objects: keysToDelete, Quiet: true },
}))

console.log(`Migration complete: ${grouped.length} canonical CVs, ${versionWrites.length} versions, ${keysToDelete.length} legacy files removed.`)
