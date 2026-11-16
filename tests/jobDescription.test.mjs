import test from 'node:test'
import assert from 'node:assert/strict'
import { formatJobDescription } from '../src/utils/jobDescription.js'

test('structures pasted inline sections and bullets without rewriting the text', () => {
  assert.deepEqual(formatJobDescription('About the role: Help our team. Responsibilities: • Build tools • Review code Requirements: JavaScript'), [
    { type: 'heading', text: 'About the role' },
    { type: 'paragraph', text: 'Help our team.' },
    { type: 'heading', text: 'Responsibilities' },
    { type: 'list', ordered: false, start: undefined, items: ['Build tools', 'Review code'] },
    { type: 'heading', text: 'Requirements' },
    { type: 'paragraph', text: 'JavaScript' },
  ])
})

test('preserves prose, paragraph breaks and text that resembles HTML', () => {
  assert.deepEqual(formatJobDescription('Work with the team\non useful tools.\n\n<script>alert(1)</script>'), [
    { type: 'paragraph', text: 'Work with the team on useful tools.' },
    { type: 'paragraph', text: '<script>alert(1)</script>' },
  ])
})

test('recognizes markdown headings, bold headings and numbered lists', () => {
  assert.deepEqual(formatJobDescription('## Duties\n3. Build **tools**\n4. Review code\n\n**Benefits**\nFlexible hours'), [
    { type: 'heading', text: 'Duties' },
    { type: 'list', ordered: true, start: 3, items: ['Build **tools**', 'Review code'] },
    { type: 'heading', text: 'Benefits' },
    { type: 'paragraph', text: 'Flexible hours' },
  ])
})
