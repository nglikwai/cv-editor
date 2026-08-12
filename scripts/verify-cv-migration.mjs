import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'

const bucket = process.env.VITE_S3_BUCKET || 'likwai'
const folder = 'willcv'
const client = new S3Client({
  region: process.env.VITE_S3_REGION,
  credentials: {
    accessKeyId: process.env.VITE_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_S3_SECRET_ACCESS_KEY,
  },
})

const expectedFamilies = new Map([
  ['Adepto_OTSE', { versions: 9, tags: ['Technical'], status: 'phone' }],
  ['AkzoNobel_OTAE', { versions: 8, tags: ['Technical'], status: 'applied' }],
  ['CE', { versions: 3, tags: ['Technical'], status: 'draft' }],
  ['Deloitte', { versions: 13, tags: ['compliance'], status: 'draft' }],
  ['Drax_OTCSE', { versions: 10, tags: ['Technical'], status: 'draft' }],
  ['GE_OTICS', { versions: 6, tags: ['Technical'], status: 'video' }],
  ['GeneralTech', { versions: 4, tags: ['Technical'], status: 'phone' }],
  ['Nestle', { versions: 4, tags: ['Technical'], status: 'draft' }],
  ['Reckitt_GTE', { versions: 3, tags: [], status: 'applied' }],
  ['Reckitt_PE', { versions: 10, tags: [], status: 'draft' }],
  ['SCH', { versions: 10, tags: ['Technical'], status: 'draft' }],
  ['SSE', { versions: 10, tags: ['Technical'], status: 'draft' }],
  ['SnControlsEng', { versions: 9, tags: ['Technical'], status: 'draft' }],
  ['Sweco_Leeds', { versions: 3, tags: [], status: 'draft' }],
  ['Sweco_Warrington', { versions: 3, tags: ['Technical'], status: 'draft' }],
  ['Tech', { versions: 5, tags: ['Technical'], status: 'draft' }],
  ['UUEngineer', { versions: 2, tags: ['Technical'], status: 'draft' }],
  ['Bilfinger_CS_PM', { versions: 5, tags: [], status: 'draft' }],
])
const standaloneNames = [
  'Bilfinger - Operational Technology OT Cyber Security Project Engineer - Submissi',
  'Senior Controls Engineer - Daresbury V.1',
  'Senior Software Engineer - Control  Automation_expsum_OK',
]
const metadataNames = new Set(['board', 'settings', 'tags'])

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
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const sorted = (values) => [...values].sort()

const objects = await listAll(`${folder}/`)
const rootObjects = objects.filter((object) => new RegExp(`^${folder}/[^/]+\\.json$`).test(object.Key))
const rootNames = rootObjects
  .map((object) => object.Key.slice(`${folder}/`.length).replace(/\.json$/, ''))
  .filter((name) => !metadataNames.has(name))
const expectedRootNames = [...expectedFamilies.keys(), ...standaloneNames]
assert(
  JSON.stringify(sorted(rootNames)) === JSON.stringify(sorted(expectedRootNames)),
  `Root CV mismatch. Found: ${sorted(rootNames).join(', ')}`,
)

const versionObjects = objects.filter((object) => object.Key.startsWith(`${folder}/versions/`) && object.Key.endsWith('.json'))
assert(versionObjects.length === 117, `Expected 117 versions, found ${versionObjects.length}`)

const versionsByFamily = new Map()
for (const object of versionObjects) {
  const [, , encodedFamily] = object.Key.split('/')
  const family = decodeURIComponent(encodedFamily)
  if (!versionsByFamily.has(family)) versionsByFamily.set(family, [])
  versionsByFamily.get(family).push(object)
}
assert(
  JSON.stringify(sorted(versionsByFamily.keys())) === JSON.stringify(sorted(expectedFamilies.keys())),
  `Version family mismatch. Found: ${sorted(versionsByFamily.keys()).join(', ')}`,
)

for (const [family, expected] of expectedFamilies) {
  const familyVersions = versionsByFamily.get(family) || []
  assert(familyVersions.length === expected.versions, `${family}: expected ${expected.versions} versions, found ${familyVersions.length}`)
}

const [tags, board] = await Promise.all([
  readJson(`${folder}/tags.json`),
  readJson(`${folder}/board.json`),
])
for (const [family, expected] of expectedFamilies) {
  assert(
    JSON.stringify(sorted(tags[family] || [])) === JSON.stringify(sorted(expected.tags)),
    `${family}: tag mismatch`,
  )
  assert((board.statuses?.[family] || 'draft') === expected.status, `${family}: status mismatch`)
}

const validRootNames = new Set(expectedRootNames)
const staleTagNames = Object.keys(tags).filter((name) => !validRootNames.has(name))
const staleStatusNames = Object.keys(board.statuses || {}).filter((name) => !validRootNames.has(name))
assert(!staleTagNames.length, `Tags reference removed CVs: ${staleTagNames.join(', ')}`)
assert(!staleStatusNames.length, `Statuses reference removed CVs: ${staleStatusNames.join(', ')}`)

const jsonObjects = [...rootObjects, ...versionObjects]
let nextIndex = 0
await Promise.all(Array.from({ length: 8 }, async () => {
  while (nextIndex < jsonObjects.length) {
    const object = jsonObjects[nextIndex]
    nextIndex += 1
    JSON.parse(await readText(object.Key))
  }
}))

for (const family of expectedFamilies.keys()) {
  const rootBody = await readText(`${folder}/${family}.json`)
  const latestVersion = (versionsByFamily.get(family) || [])
    .sort((a, b) => a.Key.localeCompare(b.Key))
    .at(-1)
  assert(latestVersion, `${family}: latest version missing`)
  assert(rootBody === await readText(latestVersion.Key), `${family}: root does not match latest version`)
}

console.log(JSON.stringify({
  rootCVs: rootNames.length,
  canonicalCVs: expectedFamilies.size,
  retainedStandalone: standaloneNames.length,
  savedVersions: versionObjects.length,
  validJsonObjects: jsonObjects.length,
  metadataReferencesValid: true,
  canonicalRootsMatchLatestVersions: true,
}, null, 2))
