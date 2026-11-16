import test from 'node:test'
import assert from 'node:assert/strict'
import { getDeadlineInfo, isDateOnly, londonToday, matchesDeadlineFilter, normalizeDeadline, validateDeadline } from '../src/utils/deadlines.js'

const today = '2026-11-14'
const dated = (date) => ({ status: 'date', date })

test('validates calendar dates and rejects malformed or impossible dates', () => {
  assert.equal(isDateOnly('2028-02-29'), true)
  for (const date of ['2026-02-29', '2026-11-31', '2026-1-2', 'bad', undefined]) assert.equal(isDateOnly(date), false)
  assert.throws(() => validateDeadline(dated('2026-02-29')), /valid closing date/)
  assert.throws(() => validateDeadline({ status: 'date' }), /valid closing date/)
})

test('London date is independent of server timezone and respects BST', () => {
  assert.equal(londonToday(new Date('2026-06-30T23:30:00Z')), '2026-07-01')
  assert.equal(londonToday(new Date('2026-11-14T23:30:00Z')), '2026-11-14')
})

test('keeps today open and changes to closed on the next UK calendar day', () => {
  assert.equal(getDeadlineInfo(dated(today), today).detail, 'Closes today')
  assert.equal(getDeadlineInfo(dated('2026-11-15'), today).detail, 'Closes tomorrow')
  assert.equal(getDeadlineInfo(dated('2026-11-17'), today).detail, '3 days left')
  assert.equal(getDeadlineInfo(dated(today), '2026-11-15').kind, 'closed')
})

test('closing-soon filters include the boundary and exclude closed or unstated dates', () => {
  assert.equal(matchesDeadlineFilter(dated(today), 'next-7', today), true)
  assert.equal(matchesDeadlineFilter(dated('2026-11-21'), 'next-7', today), true)
  assert.equal(matchesDeadlineFilter(dated('2026-11-22'), 'next-7', today), false)
  assert.equal(matchesDeadlineFilter(dated('2026-12-14'), 'next-30', today), true)
  assert.equal(matchesDeadlineFilter(dated('2026-12-15'), 'next-30', today), false)
  assert.equal(matchesDeadlineFilter(dated('2026-11-13'), 'next-7', today), false)
  assert.equal(matchesDeadlineFilter({ status: 'not-stated' }, 'next-7', today), false)
})

test('distinguishes unknown, explicitly unstated, general CVs and early closure', () => {
  assert.equal(normalizeDeadline(null).status, 'unknown')
  assert.equal(getDeadlineInfo({ status: 'not-stated' }, today).label, 'No deadline stated')
  assert.equal(matchesDeadlineFilter(null, 'unknown', today), true)
  assert.equal(matchesDeadlineFilter({ status: 'not-applicable' }, 'not-applicable', today), true)
  assert.equal(matchesDeadlineFilter({ status: 'closed', date: '2026-11-30' }, 'closed', today), true)
  assert.equal(matchesDeadlineFilter({ status: 'closed' }, 'upcoming', today), false)
})

test('does not keep a stale date when changing to no deadline', () => {
  assert.equal(validateDeadline({ status: 'not-stated', date: '2026-11-17' }).date, '')
  assert.equal(matchesDeadlineFilter(dated('2026-11-13'), 'dated', today), true)
})

test('validates source links and checked dates before persisting', () => {
  assert.throws(() => validateDeadline({ status: 'unknown', sourceUrl: 'javascript:alert(1)' }), /http/)
  assert.throws(() => validateDeadline({ status: 'unknown', checkedAt: '2026-11-31' }), /checked date/)
  assert.throws(() => validateDeadline({ status: 'invented' }), /valid deadline status/)
  assert.equal(validateDeadline({ status: 'not-stated', sourceUrl: 'https://example.com/job', checkedAt: today }).checkedAt, today)
})


test('missing deadline filter includes unknown and unstated dates, excluding closed jobs and templates', () => {
  assert.equal(matchesDeadlineFilter({ status: 'unknown', checkedAt: today }, 'missing', today), true)
  assert.equal(matchesDeadlineFilter({ status: 'not-stated' }, 'missing', today), true)
  assert.equal(matchesDeadlineFilter(null, 'missing', today), true)
  assert.equal(matchesDeadlineFilter({ status: 'closed' }, 'missing', today), false)
  assert.equal(matchesDeadlineFilter({ status: 'not-applicable' }, 'missing', today), false)
  assert.equal(matchesDeadlineFilter(dated('2026-11-18'), 'missing', today), false)
})
