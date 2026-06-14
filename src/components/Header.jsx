import { EditableInput } from './EditableInput'

export const Header = ({ basics, updateField }) => {
  if (!basics) return null

  const { name, headline, contacts, location, workAuthorization, driving, travel } = basics

  return (
    <div className="cv-header bg-deep-blue text-white py-7 px-8">
      <div className="text-3xl font-black text-white mb-1 tracking-[0.12em] uppercase">
        <EditableInput
          value={name?.full}
          onChange={(v) => updateField('basics.name.full', v)}
          className="text-3xl font-black tracking-[0.12em] uppercase text-white"
        />
      </div>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-6 h-px bg-golden-yellow shrink-0" />
        <div className="text-sm text-golden-yellow font-medium tracking-wider">
          <EditableInput
            value={headline}
            onChange={(v) => updateField('basics.headline', v)}
            className="text-golden-yellow font-medium tracking-wider"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-y-1 gap-x-5 text-sm text-slate-200">
        <div className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-golden-yellow shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <EditableInput
            value={contacts?.phone}
            onChange={(v) => updateField('basics.contacts.phone', v)}
            className="w-auto min-w-20 text-sm text-slate-200"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-golden-yellow shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <EditableInput
            value={contacts?.email}
            onChange={(v) => updateField('basics.contacts.email', v)}
            className="w-auto min-w-20 text-sm text-slate-200"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-golden-yellow shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          <EditableInput
            value={contacts?.linkedin?.label}
            onChange={(v) => updateField('basics.contacts.linkedin.label', v)}
            className="w-auto min-w-20 text-sm text-slate-200"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-golden-yellow shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <EditableInput
            value={location?.country}
            onChange={(v) => updateField('basics.location.country', v)}
            className="w-auto min-w-16 text-sm text-slate-200"
          />
        </div>
      </div>
      {(workAuthorization?.length > 0 || driving?.notes || travel?.notes) && (
        <div className="flex flex-wrap gap-x-3 text-xs text-slate-300 mt-2 pt-2 border-t border-white/20">
          {workAuthorization?.map((auth, i) => (
            <span
              key={i}
              className="inline-flex items-center before:content-[''] before:w-1 before:h-1 before:bg-golden-yellow before:rounded-full before:mr-1.5"
            >
              {auth}
            </span>
          ))}
          {driving?.notes && (
            <span className="inline-flex items-center before:content-[''] before:w-1 before:h-1 before:bg-golden-yellow before:rounded-full before:mr-1.5">
              {driving.notes}
            </span>
          )}
          {travel?.notes && (
            <span className="inline-flex items-center before:content-[''] before:w-1 before:h-1 before:bg-golden-yellow before:rounded-full before:mr-1.5">
              {travel.notes}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
