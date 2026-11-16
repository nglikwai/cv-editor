import { useEffect, useId, useMemo, useState } from 'react'
import { FiCode, FiExternalLink, FiInfo } from 'react-icons/fi'
import { loadBoard, loadJobDetail, updateSaveJobProfile } from '../services/s3'
import { assessJobMatch, ATS_STATES, MATCH_CATEGORIES } from '../utils/jobMatch'
import { MatchOverview, JobMatchModal, atsChipColors } from './JobMatch'
import { JobDescription } from './JobDescription'

export const EditorJobMatch = ({ name, userId, cvData }) => {
  const [profile, setProfile] = useState(null)
  const [showInfo, setShowInfo] = useState(false)
  const infoId = useId()
  const [deadlineUrl, setDeadlineUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    // Job detail comes from the job's own file; the board only supplies the
    // deadline's advert link as a fallback.
    Promise.all([loadJobDetail(name, userId), loadBoard(userId).catch(() => null)]).then(([detail, board]) => {
      if (cancelled) return
      setProfile(detail || null)
      const url = board?.deadlines?.[name]?.sourceUrl
      setDeadlineUrl(typeof url === 'string' && /^https?:\/\//i.test(url) ? url : '')
    }).catch(() => {
      if (!cancelled) setError('Could not load job details.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [name, userId, retry])

  // Score the CV currently on screen, including unsaved edits and older versions.
  const match = useMemo(() => assessJobMatch(profile, cvData), [profile, cvData])
  const save = { name, jobProfile: profile, match }
  const advertUrl = profile?.sourceUrl || deadlineUrl
  const saveProfile = async (saveName, value) => {
    const result = await updateSaveJobProfile(saveName, value, userId)
    setProfile(result.jobProfile)
    setEditing(false)
  }

  return (
    <div className="p-4 lg:p-5">
      {editing && <JobMatchModal save={save} onCancel={() => setEditing(false)} onSave={saveProfile} />}
      {loading ? <p className="text-sm text-text-light">Loading job details…</p> : error ? (
        <div role="alert" className="text-sm text-red-700">{error} <button type="button" className="underline" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>
      ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="min-w-0 text-sm font-semibold text-deep-blue break-words">{profile?.title || 'No job details yet'}</h2>
                {match && <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-sm font-semibold text-teal-700" title="ATS keyword match">ATS {match.score}/100</span>
                  <button type="button" onClick={() => setShowInfo((visible) => !visible)} aria-label="About the ATS score" aria-expanded={showInfo} aria-controls={infoId} title="About the ATS score" className="p-1.5 rounded-full text-text-light hover:text-deep-blue hover:bg-bg-light focus-visible:outline-2 focus-visible:outline-deep-blue"><FiInfo size={16} /></button>
                </div>}
              </div>
              {profile?.company && <p className="text-xs text-text-light mb-4 leading-relaxed">{profile.company}{profile.location ? ` · ${profile.location}` : ''}</p>}
              {match && <div id={infoId} hidden={!showInfo} className="mb-4 rounded-xl border border-border-light bg-bg-light p-3 space-y-2 text-xs text-text-light leading-relaxed">
                <p>Green: found in the CV · Amber: its words appear, but not as the phrase · Grey: missing.</p>
                <p>The ATS score estimates how many of this job’s keywords a screening system would find in your CV text. It updates as you edit and is not a hiring prediction.</p>
              </div>}
              <div className="flex flex-wrap items-center gap-2">
              {advertUrl ? (
                <a
                  href={advertUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={advertUrl}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-2 text-xs font-semibold text-deep-blue hover:bg-deep-blue/5 focus-visible:outline-2 focus-visible:outline-deep-blue"
                >
                  <FiExternalLink size={13} />
                  Open job advert
                </a>
              ) : (
                <p className="text-[11px] text-text-light">No advert link yet. Add one with “Edit job JSON”.</p>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-2 text-xs font-semibold text-text-dark hover:bg-bg-light focus-visible:outline-2 focus-visible:outline-deep-blue"
              >
                <FiCode size={13} />
                Edit job JSON
              </button>
              </div>
              {profile?.description && (
                <details className="mt-4 rounded-xl border border-border-light">
                  <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-text-dark">Job description</summary>
                  <div className="max-h-[55dvh] overflow-y-auto px-4 pb-4"><JobDescription text={profile.description} /></div>
                </details>
              )}
              <div className="mt-4 grid gap-4">
                <div><MatchOverview match={match} showKeywords={false} /></div>
                <div className="space-y-4">
                  {match ? MATCH_CATEGORIES.map((category) => {
                    const items = match.requirements.filter((item) => item.category === category)
                    return items.length ? <div key={category}>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-light mb-2">{category}</h3>
                      <div className="flex flex-wrap gap-2">{items.map((item, index) => (
                        <span key={index} title={`${item.label}: ${ATS_STATES[item.ats].label}`} className={`border rounded-lg px-2 py-1 text-xs ${atsChipColors[item.ats]}`}>
                          {item.label}
                        </span>
                      ))}</div>
                    </div> : null
                  }) : <p className="text-sm text-text-light pt-3">Add this job’s keywords to see its ATS score.</p>}

                </div>
              </div>

            </>
      )}
    </div>
  )
}
