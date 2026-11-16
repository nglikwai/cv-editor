import { useEffect, useRef, useState } from 'react'
import { DEADLINE_STATUSES, londonToday, normalizeDeadline, validateDeadline } from '../utils/deadlines'

export const DeadlineModal = ({ save, onCancel, onSave }) => {
  const [deadline, setDeadline] = useState(() => normalizeDeadline(save.deadline))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    dialogRef.current?.focus()
    return () => previousFocus?.focus?.()
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const next = validateDeadline({ ...deadline, checkedAt: londonToday() })
      setSaving(true)
      await onSave(save.name, next)
    } catch (err) {
      setError(err.message || 'Could not save deadline. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const keyDown = (event) => {
    if (event.key === 'Escape' && !saving) onCancel()
    if (event.key !== 'Tab') return
    const controls = [...dialogRef.current.querySelectorAll('input, select, button, a[href]')].filter((el) => !el.disabled)
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault(); last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4 print:hidden" onClick={() => !saving && onCancel()}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="deadline-title" tabIndex={-1} onKeyDown={keyDown} onClick={(event) => event.stopPropagation()} className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 text-text-dark">
        <h2 id="deadline-title" className="text-base font-semibold text-deep-blue">Job deadline</h2>
        <p className="text-sm text-text-light mt-1 mb-5 break-words">{save.name}</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-semibold">
            Deadline status
            <select value={deadline.status} onChange={(event) => setDeadline((current) => ({ ...current, status: event.target.value }))} className="block w-full mt-1.5 rounded-lg border border-border-light bg-white p-2.5 text-sm" disabled={saving}>
              {DEADLINE_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {['date', 'closed'].includes(deadline.status) && (
            <label className="block text-xs font-semibold">
              Closing date{deadline.status === 'closed' ? ' (optional)' : ''}
              <input type="date" required={deadline.status === 'date'} value={deadline.date} onChange={(event) => setDeadline((current) => ({ ...current, date: event.target.value }))} className="block w-full mt-1.5 rounded-lg border border-border-light bg-white p-2.5 text-sm" disabled={saving} />
            </label>
          )}
          <label className="block text-xs font-semibold">
            Advert link (optional)
            <input type="url" value={deadline.sourceUrl} onChange={(event) => setDeadline((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://…" className="block w-full mt-1.5 rounded-lg border border-border-light bg-white p-2.5 text-sm" disabled={saving} />
          </label>
          <p className="text-xs text-text-light">Use the advert’s closing date, rather than its start date. Dates use UK time; check the advert for an exact closing time or early closure.</p>
          {deadline.sourceUrl && /^https?:\/\//i.test(deadline.sourceUrl) && <a href={deadline.sourceUrl} target="_blank" rel="noreferrer" className="inline-block text-sm text-deep-blue underline">View advert</a>}
          {deadline.checkedAt && <p className="text-xs text-text-light">Last checked: {deadline.checkedAt}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} disabled={saving} className="px-3 py-2 text-sm rounded-lg border border-border-light disabled:opacity-40">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-deep-blue text-white disabled:opacity-40">{saving ? 'Saving…' : 'Save deadline'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
