import { FiColumns, FiEdit3, FiFileText, FiMoon, FiSun } from 'react-icons/fi'

const NavButton = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-deep-blue text-white shadow-sm'
        : 'text-text-light hover:text-deep-blue hover:bg-deep-blue/5'
    }`}
    aria-current={active ? 'page' : undefined}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
)

export const AppLayout = ({
  activePage,
  currentSaveName,
  onNavigateBoard,
  onNavigateEditor,
  darkMode,
  onToggleDarkMode,
  children,
}) => (
  <div className={`app-shell ${darkMode ? 'dark-ui' : ''} min-h-screen h-screen flex flex-col bg-[var(--app-canvas)] text-text-dark print:h-auto print:min-h-0 print:block print:bg-white`}>
    <header className="h-16 shrink-0 bg-white border-b border-border-light shadow-sm z-[1200] print:hidden">
      <div className="h-full px-3 sm:px-5 flex items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="w-9 h-9 rounded-xl bg-deep-blue text-white flex items-center justify-center shadow-sm">
            <FiFileText size={18} />
          </span>
          <div className="hidden md:block leading-tight">
            <p className="text-sm font-bold text-deep-blue">CV Workspace</p>
            <p className="text-[10px] uppercase tracking-wider text-text-light">Applications</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 p-1 bg-bg-light rounded-xl border border-border-light">
          <NavButton
            active={activePage === 'board'}
            icon={<FiColumns size={16} />}
            label="Dashboard"
            onClick={onNavigateBoard}
          />
          <NavButton
            active={activePage === 'editor'}
            icon={<FiEdit3 size={16} />}
            label="Editor"
            onClick={onNavigateEditor}
          />
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onToggleDarkMode}
          className="w-9 h-9 rounded-lg border border-border-light bg-bg-light text-text-light hover:text-deep-blue hover:border-deep-blue/30 flex items-center justify-center transition-colors shrink-0"
          aria-label={darkMode ? 'Use light mode' : 'Use dark mode'}
          aria-pressed={darkMode}
          title={darkMode ? 'Use light mode' : 'Use dark mode'}
        >
          {darkMode ? <FiSun size={17} /> : <FiMoon size={17} />}
        </button>

        <div className="min-w-0 text-right hidden sm:block">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-text-light">
            Current CV
          </p>
          <p className="max-w-48 lg:max-w-72 truncate text-sm font-medium text-text-dark">
            {currentSaveName || 'Unsaved CV'}
          </p>
        </div>

      </div>
    </header>

    <main className={`flex-1 min-h-0 print:overflow-visible ${activePage === 'board' ? 'overflow-hidden' : 'overflow-auto'}`}>
      {children}
    </main>
  </div>
)
