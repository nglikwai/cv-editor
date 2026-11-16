import { FiChevronDown, FiChevronsLeft, FiChevronsRight, FiClipboard, FiTarget } from 'react-icons/fi'

import { EditorJobMatch } from './EditorJobMatch'
import { ScratchNotes } from './ScratchNotes'

const TABS = [
  { id: 'match', label: 'Job match', icon: FiTarget },
  { id: 'notes', label: 'Notes', icon: FiClipboard },
]

// Everything about the job this CV targets lives here, on the left: the job
// details and keyword match, plus notes and the application timeline. Tools
// that act on the CV document itself stay in the toolbar on the right.
export const JobSidebar = ({
  cvName,
  userId,
  cvData,
  tab,
  onTabChange,
  expanded,
  onExpandedChange,
  collapsed,
  onCollapsedChange,
  notes,
  onNotesChange,
  clonedFrom,
  timelineRefreshKey,
  onOpenCv,
}) => (
  <aside
    aria-label="Job"
    data-collapsed={collapsed ? 'true' : 'false'}
    className={`job-sidebar relative print:hidden bg-white border-b border-border-light lg:shrink-0 lg:min-h-0 lg:overflow-hidden lg:border-b-0 lg:border-r lg:transition-[width] lg:duration-200 lg:ease-out motion-reduce:transition-none ${collapsed ? 'lg:w-12' : 'lg:w-[384px]'}`}
  >
    {/* Minimized: a slim rail of icons (wide screens only). */}
    <div
      aria-hidden={!collapsed}
      className={`hidden lg:flex absolute inset-y-0 left-0 w-12 flex-col items-center gap-1 py-2 transition-[opacity,visibility] duration-200 ${collapsed ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
    >
      <button
        type="button"
        onClick={() => onCollapsedChange(false)}
        aria-label="Show job sidebar"
        title="Show job sidebar"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-light hover:text-text-dark hover:bg-bg-light transition-colors focus-visible:outline-2 focus-visible:outline-deep-blue"
      >
        <FiChevronsRight size={16} />
      </button>
      <div className="w-6 border-t border-border-light my-1" />
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            onTabChange(id)
            onCollapsedChange(false)
          }}
          aria-label={`Show ${label}`}
          title={label}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-light hover:text-deep-blue hover:bg-bg-light transition-colors focus-visible:outline-2 focus-visible:outline-deep-blue"
        >
          <Icon size={16} />
        </button>
      ))}
    </div>

    {/* The full panel keeps its width while the sidebar animates, then fades. */}
    <div
      className={`lg:w-[384px] lg:h-full lg:flex lg:flex-col lg:min-h-0 lg:transition-[opacity,visibility] lg:duration-200 ${collapsed ? 'lg:opacity-0 lg:invisible' : ''}`}
    >
      <div className={`flex items-center gap-1 px-2 pt-2 border-b border-border-light shrink-0`}>
        <div role="tablist" aria-label="Job panels" className="flex flex-1 gap-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const selected = tab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`job-tab-${id}`}
                aria-selected={selected}
                aria-controls={`job-panel-${id}`}
                onClick={() => {
                  onTabChange(id)
                  onExpandedChange(true)
                }}
                className={`flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-deep-blue ${
                  selected
                    ? 'border-deep-blue text-deep-blue'
                    : 'border-transparent text-text-light hover:text-text-dark'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => onCollapsedChange(true)}
          aria-label="Minimize job sidebar"
          title="Minimize job sidebar"
          className="hidden lg:flex w-7 h-7 mb-1 items-center justify-center rounded-lg text-text-light hover:text-text-dark hover:bg-bg-light transition-colors focus-visible:outline-2 focus-visible:outline-deep-blue"
        >
          <FiChevronsLeft size={16} />
        </button>
        {/* On small screens the sidebar sits above the CV, so it can be folded away. */}
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide job panel' : 'Show job panel'}
          className="lg:hidden p-2 rounded-lg text-text-light hover:text-text-dark hover:bg-bg-light"
        >
          <FiChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className={`${expanded ? '' : 'hidden'} lg:block lg:flex-1 lg:min-h-0 lg:overflow-y-auto`}>
        <div role="tabpanel" id="job-panel-match" aria-labelledby="job-tab-match" hidden={tab !== 'match'}>
          {cvName ? (
            <EditorJobMatch key={`${userId}:${cvName}`} name={cvName} userId={userId} cvData={cvData} />
          ) : (
            <div className="px-4 py-4 lg:px-5">
              <h2 className="text-sm font-semibold text-deep-blue">No job details yet</h2>
              <p className="text-xs text-text-light mt-1 leading-relaxed">
                Save this CV first. You can then add the job’s description and keywords and compare them with the CV.
              </p>
            </div>
          )}
        </div>
        <div role="tabpanel" id="job-panel-notes" aria-labelledby="job-tab-notes" hidden={tab !== 'notes'}>
          <ScratchNotes
            value={notes}
            onChange={onNotesChange}
            cvName={cvName}
            clonedFrom={clonedFrom}
            userId={userId}
            refreshKey={timelineRefreshKey}
            onOpenCv={onOpenCv}
            active={tab === 'notes'}
          />
        </div>
      </div>
    </div>
  </aside>
)
