import { useState } from 'react'
import { FiCheck, FiChevronDown, FiColumns, FiEdit3, FiFileText, FiLayout, FiMoon, FiPlus, FiSun, FiUser } from 'react-icons/fi'

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
  templateId,
  templates = [],
  onTemplateChange,
  users = [],
  activeUser,
  onUserChange,
  onAddUser,
  children,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
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

        {activePage === 'editor' && templates.length > 0 && (
          <label className="h-9 flex items-center gap-2 px-2.5 rounded-lg border border-border-light bg-bg-light text-text-light shrink-0">
            <FiLayout size={15} />
            <span className="hidden lg:inline text-[10px] uppercase tracking-wider font-semibold">Template</span>
            <select
              value={templateId}
              onChange={(event) => onTemplateChange?.(event.target.value)}
              className="bg-transparent text-xs font-semibold text-text-dark focus:outline-none cursor-pointer"
              aria-label="CV template"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </label>
        )}

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

        {activeUser && (
          <div className="relative h-9 flex items-center gap-1 px-2 rounded-lg border border-border-light bg-bg-light text-text-light shrink-0">
            <FiUser size={15} />
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-1 text-xs font-semibold text-text-dark focus:outline-none max-w-32"
              aria-label="Workspace user"
              aria-expanded={userMenuOpen}
            >
              <span className="truncate">{activeUser.name}</span>
              <FiChevronDown size={13} className={`shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <button type="button" onClick={onAddUser} className="w-6 h-6 rounded-md flex items-center justify-center text-text-light hover:text-deep-blue hover:bg-white" aria-label="Add local workspace user" title="Add local workspace user">
              <FiPlus size={14} />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-11 z-[1500] min-w-48 rounded-xl border border-border-light bg-white p-1.5 shadow-xl">
                <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-light">Workspace user</p>
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => { onUserChange?.(user.id); setUserMenuOpen(false) }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-text-dark hover:bg-bg-light"
                  >
                    <span className="truncate">{user.name}</span>
                    {user.id === activeUser.id && <FiCheck size={14} className="shrink-0 text-deep-blue" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
}
