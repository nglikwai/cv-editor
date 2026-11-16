import { FiX } from 'react-icons/fi'

// Widths of the right-hand tool panels. The editor reserves this much room
// beside the CV on wide screens so a panel sits in the layout like the left
// job sidebar instead of covering the CV.
export const RIGHT_PANEL_WIDTHS = { versions: 360, settings: 400, json: 600 }

export const panelButton =
  'px-3 py-1.5 rounded-lg border border-border-light text-xs font-semibold text-text-dark hover:bg-bg-light transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-deep-blue'
export const panelButtonPrimary =
  'px-3 py-1.5 rounded-lg bg-deep-blue text-white text-xs font-semibold hover:bg-light-blue transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-blue'
// Small uppercase heading used for sections inside a panel (same as the left sidebar).
export const panelLabel = 'text-[10px] uppercase tracking-wider font-semibold text-text-light'

// Shell shared by the right-hand panels (versions, theme, CV data), styled to
// match the left job sidebar: flat white panel, hairline border, compact
// header, and the same padding and typography inside.
export const SidePanel = ({
  title,
  icon: Icon,
  description,
  onClose,
  closeLabel,
  width,
  visible = true,
  padded = true,
  bodyClassName = '',
  contentClassName = '',
  footer,
  children,
}) => (
  // z-[1150] keeps the panel above the toolbars (1000/1100) but below the app
  // header (1200), so the header and its menus are never covered.
  <div className={`fixed inset-0 z-[1150] pointer-events-none print:hidden ${visible ? '' : 'hidden'}`}>
    <aside
      aria-label={title}
      style={{ '--panel-width': `${width}px` }}
      className="right-tools-drawer pointer-events-auto absolute top-[var(--app-header-height,108px)] bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-0 right-0 bg-white border-l border-border-light shadow-2xl lg:shadow-none w-full md:w-[var(--panel-width)] max-w-full flex flex-col overflow-hidden"
    >
      <div className="shrink-0 flex items-center gap-2 pl-4 pr-2 lg:pl-5 py-3 min-h-14 border-b border-border-light">
        {Icon && <Icon size={15} className="shrink-0 text-deep-blue" aria-hidden="true" />}
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-deep-blue">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel || `Close ${title.toLowerCase()}`}
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-text-light hover:text-text-dark hover:bg-bg-light transition-colors focus-visible:outline-2 focus-visible:outline-deep-blue"
        >
          <FiX size={16} />
        </button>
      </div>

      <div className={`flex-1 min-h-0 ${bodyClassName || 'overflow-y-auto'}`}>
        {description && <p className="px-4 lg:px-5 pt-4 text-xs text-text-light break-words">{description}</p>}
        <div className={`${padded ? `px-4 pb-4 lg:px-5 ${description ? 'pt-3' : 'pt-4'}` : description ? 'pt-3' : ''} ${contentClassName}`}>
          {children}
        </div>
      </div>

      {footer && (
        <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-4 lg:px-5 py-3 border-t border-border-light bg-white">
          {footer}
        </div>
      )}
    </aside>
  </div>
)
