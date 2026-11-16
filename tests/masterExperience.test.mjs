import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyMasterExperience, masterJobDatesNeedReview, validateMasterExperience } from '../src/utils/masterExperience.js'

const fixture = () => ({
  schemaVersion: 1, updatedAt: null,
  analysis: { method: 'llm', analyzedAt: '2026-11-14T12:00:00.000Z', sourceItemCount: 3, approach: 'Merged alternate wording by meaning.' },
  jobs: [{
    id: 'job-1', company: 'Example Ltd', titles: ['Engineer'], companyAliases: [],
    startDate: '2020-01', endDate: '2022-01', isCurrent: false, dateDisplay: '',
    locations: [], focuses: [], sources: ['CV A', 'CV B'],
    variants: [{ company: 'Example Ltd', title: 'Engineer', startDate: '2020-01', endDate: '2022-01', isCurrent: false, dateDisplay: '', sources: ['CV A'] }],
    items: [{ id: 'point-1', text: 'Maintained accurate inventory records and checked discrepancies.', labels: ['Inventory records'], titles: ['Engineer'], sources: ['CV A', 'CV B'], sourceItemIds: ['original-1', 'original-2', 'original-3'] }],
  }],
})

test('retains LLM analysis metadata and supporting evidence IDs through validation', () => {
  assert.deepEqual(validateMasterExperience(fixture()), fixture())
})

test('keeps a new user empty and accepts master files saved before analysis metadata existed', () => {
  assert.deepEqual(validateMasterExperience(emptyMasterExperience()), emptyMasterExperience())
  const legacy = fixture()
  delete legacy.analysis
  delete legacy.jobs[0].items[0].sourceItemIds
  const validated = validateMasterExperience(legacy)
  assert.equal(validated.analysis, undefined)
  assert.deepEqual(validated.jobs[0].items[0].sourceItemIds, [])
})

test('rejects repeated points within a job without combining unrelated employers', () => {
  const master = fixture()
  master.jobs[0].items.push({ ...master.jobs[0].items[0], id: 'point-2', text: '  MAINTAINED ACCURATE INVENTORY RECORDS AND CHECKED DISCREPANCIES  ' })
  assert.throws(() => validateMasterExperience(master), /more than once/)
  master.jobs[0].items.pop()
  const otherJob = structuredClone(master.jobs[0])
  otherJob.id = 'job-2'; otherJob.company = 'Other Ltd'; otherJob.items[0].id = 'point-2'
  master.jobs.push(otherJob)
  assert.equal(validateMasterExperience(master).jobs.length, 2)
})

test('validates JSON shape, dates, item types and unique IDs before saving', () => {
  assert.throws(() => validateMasterExperience({ jobs: [] }), /schemaVersion/)
  const badDate = fixture(); badDate.jobs[0].startDate = '2020-19'
  assert.throws(() => validateMasterExperience(badDate), /Start date/)
  const badItems = fixture(); badItems.jobs[0].items[0].text = { invalid: true }
  assert.throws(() => validateMasterExperience(badItems), /Experience item/)
  const duplicateId = fixture(); duplicateId.jobs[0].items[0].id = duplicateId.jobs[0].id
  assert.throws(() => validateMasterExperience(duplicateId), /unique ID/)
})

test('rejects malformed analysis metadata', () => {
  const master = fixture(); master.analysis.method = 'collection'
  assert.throws(() => validateMasterExperience(master), /Analysis method/)
  master.analysis.method = 'llm'; master.analysis.sourceItemCount = -1
  assert.throws(() => validateMasterExperience(master), /sourceItemCount/)
  master.analysis.sourceItemCount = 3; master.analysis.analyzedAt = 'invalid'
  assert.throws(() => validateMasterExperience(master), /timestamp/)
})

test('retains source date disagreements and flags inconsistent date labels for review', () => {
  const master = fixture()
  master.jobs[0].variants[0].dateDisplay = 'Jan 2020 – Jan 2022'
  assert.equal(masterJobDatesNeedReview(master.jobs[0]), false)
  master.jobs[0].variants[0].dateDisplay = 'Jan 2019 - Jan 2022'
  assert.equal(masterJobDatesNeedReview(master.jobs[0]), true)
  master.jobs[0].variants[0].dateDisplay = ''; master.jobs[0].variants[0].isCurrent = true
  assert.equal(masterJobDatesNeedReview(master.jobs[0]), true)
  assert.deepEqual(validateMasterExperience(master).jobs[0].variants, master.jobs[0].variants)
})
