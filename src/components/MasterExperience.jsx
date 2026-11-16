import { memo, useEffect, useMemo, useState } from 'react'
import { FiBookOpen, FiCheck, FiCode, FiDownload, FiPlus, FiSave, FiSearch } from 'react-icons/fi'
import { loadMasterExperience, saveMasterExperience } from '../services/s3'
import { emptyMasterExperience, masterJobDatesNeedReview, validateMasterExperience } from '../utils/masterExperience'
import { formatDateRange } from '../utils/dateUtils'

const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-dark hover:bg-bg-light disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-deep-blue'
const asJson = (value) => JSON.stringify(value, null, 2)

export const MasterExperience = memo(function MasterExperience({ userId, userName, onDirtyChange, onBusyChange }) {
  const [master, setMaster] = useState(emptyMasterExperience)
  const [baseline, setBaseline] = useState(() => asJson(emptyMasterExperience()))
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [jsonText, setJsonText] = useState(null)
  const [search, setSearch] = useState('')
  const dirty = asJson(master) !== baseline || (jsonText !== null && jsonText !== asJson(master))

  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false) }, [busy, onBusyChange])
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    loadMasterExperience(userId).then((data) => {
      if (cancelled) return
      const loaded = data ? validateMasterExperience(data) : emptyMasterExperience()
      setMaster(loaded)
      setLoaded(true)
      setBaseline(asJson(loaded))
    }).catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, retry])

  const parseEditor = () => {
    let data
    try { data = JSON.parse(jsonText) } catch (err) { throw new Error(`Invalid JSON: ${err.message}`) }
    return validateMasterExperience(data)
  }
  const save = async () => {
    setError(''); setMessage(''); setBusy(true)
    try {
      const data = jsonText === null ? master : parseEditor()
      const saved = await saveMasterExperience(data, userId)
      setMaster(saved); setBaseline(asJson(saved)); setJsonText(null)
      setMessage('Master list saved.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  useEffect(() => {
    const shortcut = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 's') return
      // This component stays mounted to retain edits when its tab is hidden.
      if (window.location.pathname.replace(/\/$/, '') !== '/master') return
      event.preventDefault()
      if (!event.repeat && !busy && !loading && dirty) save()
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  })
  const download = () => {
    try {
      const data = jsonText === null ? master : parseEditor()
      const url = URL.createObjectURL(new Blob([asJson(data)], { type: 'application/json' }))
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `${userId}-master.json`; anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) { setError(err.message) }
  }
  const addJob = () => {
    const data = { ...master, jobs: [...master.jobs, {
      id: crypto.randomUUID(), company: '', titles: ['New job title'], companyAliases: [],
      startDate: '', endDate: '', isCurrent: false, dateDisplay: '', locations: [], focuses: [], sources: [], variants: [],
      items: [{ id: crypto.randomUUID(), text: 'Describe your experience here.', labels: [], titles: [], sources: [], sourceItemIds: [] }],
    }] }
    setMaster(data); setJsonText(asJson(data)); setError('')
  }

  const jobs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return master.jobs.filter((job) => !query || [job.company, ...job.companyAliases, ...job.titles, ...job.items.flatMap((item) => [item.text, ...item.labels])].some((value) => value.toLowerCase().includes(query)))
  }, [master, search])
  const counts = useMemo(() => ({
    titles: master.jobs.reduce((total, job) => total + job.titles.length, 0),
    items: master.jobs.reduce((total, job) => total + job.items.length, 0),
  }), [master])

  if (loading) return <div role="status" className="p-6 text-sm text-text-light">Loading master experience…</div>
  if (error && !loaded) return <div className="p-6"><p role="alert" className="text-sm text-red-700">{error}</p><button className={`${actionClass} mt-3`} onClick={() => setRetry((value) => value + 1)}>Retry</button></div>

  return <section aria-label="Master experience" className="h-full flex flex-col min-h-0">
    <header className="shrink-0 bg-white border-b border-border-light px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-deep-blue"><FiBookOpen size={20} />Master experience</h1>
          <p className="text-xs text-text-light mt-1 leading-relaxed">{userName}’s consolidated responsibilities and achievements, organised by employer.</p>
          <p className="text-xs text-text-light mt-2">{master.jobs.length} jobs · {counts.titles} titles · {counts.items} experience points</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={actionClass} onClick={() => {
            if (jsonText === null) setJsonText(asJson(master))
            else { try { setMaster(parseEditor()); setJsonText(null); setError('') } catch (err) { setError(err.message) } }
          }} disabled={busy}><FiCode size={15} />{jsonText === null ? 'Edit JSON' : 'Preview list'}</button>
          <button className={actionClass} onClick={download} disabled={busy} aria-label="Download master JSON" title="Download master JSON"><FiDownload size={16} /></button>
          <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-deep-blue px-4 py-2 text-xs font-semibold text-white hover:bg-light-blue disabled:opacity-40" onClick={save} disabled={busy || !dirty}><FiSave size={15} />{busy ? 'Working…' : 'Save master'}</button>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-3 mt-4 items-center">
        <label className="flex w-full sm:w-80 items-center gap-2 rounded-lg border border-border-light px-3 py-2 bg-bg-light text-text-light"><FiSearch size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employer, title or experience…" aria-label="Search master experience" className="min-w-0 w-full bg-transparent text-xs text-text-dark outline-none" /></label>
        <p role="status" className="flex items-center gap-1.5 text-xs text-text-light">{dirty ? 'Unsaved changes' : <><FiCheck size={14} />{master.updatedAt ? `Saved ${new Date(master.updatedAt).toLocaleString('en-GB')}` : 'Ready to build your master list'}</>}</p>
      </div>
    </header>
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {master.analysis?.method === 'llm' && <p className="rounded-lg border border-border-light bg-white px-4 py-3 text-xs text-text-light leading-relaxed">Analysed by LLM: repeated wording combined into distinct responsibilities and achievements. Source references and unresolved dates are retained.</p>}
        {message && <p role="status" className="rounded-lg border border-border-light bg-white p-3 text-xs text-text-dark">{message}</p>}
        {jsonText !== null ? <div className="space-y-3">
          <p className="text-xs text-text-light leading-relaxed">Edit the consolidated employers, titles and experience points here. Keep each point distinct; supporting sources are retained for reference. Use Preview list to validate your changes, or Save master to save them directly.</p>
          <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} disabled={busy} aria-label="Master experience JSON" spellCheck={false} className="block w-full min-h-[60dvh] resize-y rounded-xl border border-border-light bg-white p-4 text-xs font-mono leading-relaxed text-text-dark" />
        </div> : <>
          {!master.jobs.length ? <div className="rounded-xl border border-dashed border-border-light bg-white p-8 text-center space-y-3">
            <h2 className="text-base font-semibold">Build your master experience list</h2>
            <p className="text-sm text-text-light">Add your employment history or paste an analysed master JSON list. Each experience point should describe a distinct responsibility or achievement.</p>
          </div> : jobs.map((job) => <article key={job.id} className="rounded-xl border border-border-light bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-base font-semibold text-deep-blue">{job.company || 'Employer not specified'}</h2><p className="text-xs text-text-light mt-1">{job.locations.join(' · ')}</p></div>
              <div className="text-xs text-text-light text-right"><p>{job.startDate ? formatDateRange(job.startDate, job.endDate, job.isCurrent) : job.dateDisplay || 'Dates not recorded'}</p>{masterJobDatesNeedReview(job) && <p className="mt-1 text-amber-700">Review source dates</p>}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{job.titles.map((title) => <span key={title} className="rounded-lg border border-border-light bg-bg-light px-3 py-1.5 text-xs font-medium">{title}</span>)}</div>
            {job.focuses.length > 0 && <details className="mt-4 text-xs text-text-light"><summary className="cursor-pointer font-semibold">Focus areas ({job.focuses.length})</summary><ul className="mt-2 list-disc pl-5 space-y-2">{job.focuses.map((focus) => <li key={focus}>{focus}</li>)}</ul></details>}
            <div className="mt-5"><h3 className="text-xs font-semibold text-text-light">Experience ({job.items.length})</h3>
            <ul className="mt-4 space-y-3">{job.items.map((item) => <li key={item.id} className="border-l-2 border-border-light pl-4">
              {item.labels.length > 0 && <p className="text-xs font-semibold text-deep-blue mb-1">{item.labels.join(' · ')}</p>}
              <p className="text-sm leading-relaxed">{item.text}</p>
              <details className="mt-1 text-xs text-text-light"><summary className="cursor-pointer">{item.sources.length ? `${item.sources.length} source CV${item.sources.length === 1 ? '' : 's'}` : 'Manually added'}{item.titles.length ? ' · Job titles' : ''}</summary><p className="mt-2">{item.titles.join(' · ')}</p><ul className="mt-1 space-y-1">{item.sources.map((name) => <li key={name}>{name}</li>)}</ul></details>
            </li>)}</ul></div>
            <details className="mt-5 pt-4 border-t border-border-light text-xs text-text-light"><summary className="cursor-pointer font-semibold">Original job details and source CVs</summary>
              {job.companyAliases.length > 1 && <p className="mt-3">Employer names: {job.companyAliases.join(' · ')}</p>}
              <ul className="mt-3 space-y-3">{job.variants.map((variant, index) => <li key={index}><p className="font-semibold text-text-dark">{variant.title} · {variant.company}</p><p>{formatDateRange(variant.startDate, variant.endDate, variant.isCurrent)}{variant.dateDisplay && <span> · Written date label: {variant.dateDisplay}</span>}{variant.isCurrent && variant.endDate ? ` (source also records end date ${variant.endDate})` : ''}</p><p className="mt-1">{variant.sources.join(' · ')}</p></li>)}</ul>
            </details>
          </article>)}
          {master.jobs.length > 0 && !jobs.length && <p className="py-8 text-sm text-text-light text-center">No jobs match this search.</p>}
          <button className={actionClass} onClick={addJob} disabled={busy}><FiPlus size={15} />Add job in JSON</button>
        </>}
      </div>
    </div>
  </section>
})
