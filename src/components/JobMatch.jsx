import { useEffect, useRef, useState } from 'react'
import { ATS_STATES, MATCH_CATEGORIES, validateJobProfile } from '../utils/jobMatch'

// Keyword chip colours by ATS result: found in the CV, words found but not the phrase, or missing.
export const atsChipColors = { found: 'bg-emerald-50 text-emerald-800 border-emerald-100', partial: 'bg-amber-50 text-amber-800 border-amber-100', missing: 'bg-slate-100 text-slate-500 border-slate-200' }
export const MatchOverview = ({ match, showKeywords = true }) => (
  <div className="w-full text-left rounded-xl bg-slate-50/80 border border-slate-100 p-4">
    {match ? <>
      <div className="flex gap-3 items-center">
        <div className="relative w-[72px] h-[72px] shrink-0" role="img" aria-label={`ATS keyword match ${match.score} out of 100`}>
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90" aria-hidden="true"><circle cx="40" cy="40" r="33" fill="none" stroke="#e2e8f0" strokeWidth="6" /><circle cx="40" cy="40" r="33" fill="none" stroke="#0f766e" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(match.score || 0) * 2.07345} 207.345`} /></svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-xl text-slate-900">{match.score ?? '—'}</strong><span className="text-[9px] text-slate-500">/ 100</span></div>
        </div>
        <div className="flex-1 min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">ATS keyword match</p>
          {match.categories.filter((item) => item.count).map((item) => <div key={item.category} className="mb-1.5"><div className="flex justify-between text-[10px] text-slate-600"><span>{item.category}</span><span>{item.score}%</span></div><div className="h-1 mt-1 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-teal-600 rounded-full" style={{ width: `${item.score || 0}%` }} /></div></div>)}
        </div>
      </div>
      {showKeywords && <div className="mt-3 space-y-2">{MATCH_CATEGORIES.slice(0, 2).map((category) => { const items = match.requirements.filter((item) => item.category === category); return items.length ? <div key={category}><p className="text-[9px] uppercase font-bold tracking-wide text-slate-400 mb-1">{category}</p><div className="flex flex-wrap gap-1">{items.slice(0, 3).map((item, index) => <span key={index} title={`${item.label}: ${ATS_STATES[item.ats].label}`} className={`border rounded-md px-1.5 py-1 text-[10px] leading-none ${atsChipColors[item.ats]}`}>{item.label}</span>)}{items.length > 3 && <span className="text-[10px] px-1 py-1 text-slate-400">+{items.length - 3}</span>}</div></div> : null })}</div>}
      <p className="mt-3 text-[10px] text-slate-500 flex justify-between"><span>{match.essentialMissing ? `${match.essentialMissing} essential keyword${match.essentialMissing === 1 ? '' : 's'} not found` : `${match.found} of ${match.requirements.length} keywords found`}</span></p>
    </> : <div><p className="text-xs font-semibold text-slate-700">Add job keywords</p><p className="text-[11px] text-slate-500 mt-1">Add the job’s keywords to see how many of them an ATS would find in this CV.</p></div>}
  </div>
)

// The editable shape of a job file, in a stable key order for copy and paste.
// The optional evidence note is only written out when one has been recorded.
const toJobJson = (profile) => JSON.stringify({
  title: profile.title || '',
  company: profile.company || '',
  location: profile.location || '',
  sourceUrl: profile.sourceUrl || '',
  description: profile.description || '',
  requirements: (profile.requirements || []).map((item) => ({
    label: item.label || '',
    aliases: (item.aliases || []).map((alias) => String(alias).trim()).filter(Boolean),
    category: item.category,
    essential: Boolean(item.essential),
    ...(item.state && item.state !== 'gap' ? { state: item.state, evidence: item.evidence || '' } : {}),
  })),
}, null, 2)

const parseJobJson = (text) => {
  let parsed
  try { parsed = JSON.parse(text) } catch (err) { throw new Error(`This is not valid JSON: ${err.message}`) }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The JSON must be a single object with title, description and requirements.')
  return validateJobProfile(parsed)
}

const buildAiPrompt = (profile) => `Extract the ATS keywords from the job advert below and return ONLY one JSON object (no commentary, no code fence) in exactly this shape:

{
  "title": "job title",
  "company": "employer",
  "location": "location and working pattern",
  "sourceUrl": "https://link-to-the-advert",
  "description": "the full advert text",
  "requirements": [
    { "label": "keyword exactly as the advert words it", "aliases": ["other common wording", "abbreviation"], "category": "Hard skills", "essential": true }
  ]
}

Rules:
- A keyword is a skill, tool, method, qualification or personal quality that an applicant tracking system would search a CV for. Keep each one short (1 to 4 words) and use the advert's own wording.
- "aliases" lists other wordings that mean the same thing (abbreviations, spelled-out forms, close synonyms). Use [] when there are none.
- "category" must be exactly one of: ${MATCH_CATEGORIES.join(' | ')}.
- Set "essential" to true for essential or required criteria and false for desirable ones.
- List at most 40 keywords, the most important first. Do not invent keywords the advert does not ask for.
- Keep "title", "company", "location" and "sourceUrl" as given below unless the advert shows they are wrong.

JOB ADVERT:
${profile.description?.trim() || '[paste the job advert text here]'}

CURRENT JOB JSON:
${toJobJson(profile)}
`

export const JobMatchModal = ({ save, onCancel, onSave }) => {
  const profile = save.jobProfile || {
    title: save.name, company: '', location: '',
    sourceUrl: save.deadline?.sourceUrl || '', description: '', requirements: [],
  }
  const [jsonText, setJsonText] = useState(() => toJobJson(profile))
  const [copied, setCopied] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    ref.current?.focus()
    return () => previous?.focus?.()
  }, [])

  const copy = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
    } catch { setError('Could not copy to the clipboard.') }
  }
  const saveJson = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const value = parseJobJson(jsonText)
      setSaving(true)
      await onSave(save.name, value)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }
  const close = () => {
    if (saving) return
    if (jsonText !== toJobJson(profile) && !window.confirm('Close the job JSON editor and discard unsaved changes?')) return
    onCancel()
  }
  const keyDown = (event) => {
    if (event.key === 'Escape') { event.stopPropagation(); close() }
    if (event.key !== 'Tab') return
    const controls = [...ref.current.querySelectorAll('textarea, button')].filter((el) => !el.disabled)
    const first = controls[0], last = controls[controls.length - 1]
    if (event.shiftKey && [first, ref.current].includes(document.activeElement)) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/50 p-4 flex items-center justify-center">
      <section ref={ref} tabIndex={-1} onKeyDown={keyDown} role="dialog" aria-modal="true" aria-labelledby="job-json-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto p-5 sm:p-6 text-text-dark">
        <div className="flex justify-between gap-4 mb-4">
          <div><h2 id="job-json-title" className="text-lg font-semibold">Edit job JSON</h2><p className="text-xs text-text-light mt-1">{profile.title || save.name}</p></div>
          <button type="button" onClick={close} disabled={saving} aria-label="Close job JSON" className="self-start text-sm border border-border-light rounded-lg px-3 py-2 disabled:opacity-40">Close</button>
        </div>
        <form onSubmit={saveJson} className="space-y-3">
          <p id="job-json-help" className="text-xs text-text-light leading-relaxed">Edit the job details below, or paste JSON from your AI assistant. Copy AI prompt includes the advert and the expected JSON format.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => {
              try { copy('prompt', buildAiPrompt(parseJobJson(jsonText))); setError('') }
              catch (err) { setError(err.message) }
            }} className="text-xs font-semibold border border-border-light rounded-lg px-3 py-1.5 text-teal-700">{copied === 'prompt' ? 'Prompt copied' : 'Copy AI prompt'}</button>
            <button type="button" onClick={() => copy('json', jsonText)} className="text-xs font-semibold border border-border-light rounded-lg px-3 py-1.5">{copied === 'json' ? 'JSON copied' : 'Copy JSON'}</button>
          </div>
          <textarea value={jsonText} onChange={(event) => { setJsonText(event.target.value); setCopied('') }} disabled={saving} spellCheck={false} aria-label="Job JSON" aria-describedby="job-json-help" rows={22} className="w-full block border border-border-light rounded-lg p-3 text-xs font-mono leading-relaxed resize-y" />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end"><button type="submit" disabled={saving} className="bg-deep-blue text-white rounded-lg px-4 py-2 text-sm disabled:opacity-40">{saving ? 'Saving…' : 'Save JSON'}</button></div>
        </form>
      </section>
    </div>
  )
}
