import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FiBookOpen, FiCheck, FiChevronDown, FiColumns, FiEdit3, FiLayout, FiMoon, FiPlus, FiSun, FiUser, FiX } from 'react-icons/fi'
import { PwaRegister } from './PwaRegister'

const STATUS_DOT = {
  saved: 'bg-emerald-500',
  dirty: 'bg-amber-500',
  saving: 'bg-sky-500 animate-pulse',
  draft: 'bg-slate-400',
  version: 'bg-violet-500',
}

export const AppLayout = ({
  activePage,
  currentSaveName,
  onNavigateBoard,
  onNavigateMaster,
  editorTabs = [],
  activeTabId,
  tabsBusy,
  onSelectTab,
  onCloseTab,
  darkMode,
  onToggleDarkMode,
  templateId,
  templates = [],
  onTemplateChange,
  users = [],
  activeUser,
  onUserChange,
  onAddUser,
  saveStatus,
  children,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const userMenuRef = useRef(null)
  const shellRef = useRef(null)
  const headerRef = useRef(null)

  useLayoutEffect(() => {
    const updateHeaderHeight = () => {
      shellRef.current?.style.setProperty('--app-header-height', `${headerRef.current?.getBoundingClientRect().height || 108}px`)
    }
    updateHeaderHeight()
    const observer = new ResizeObserver(updateHeaderHeight)
    if (headerRef.current) observer.observe(headerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!userMenuOpen) {
      setAddingUser(false)
      setNewUserName('')
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [userMenuOpen])

  const submitNewUser = (event) => {
    event.preventDefault()
    if (!newUserName.trim()) return
    onAddUser?.(newUserName)
    setUserMenuOpen(false)
  }

  const showStatus = activePage === 'editor' && saveStatus

  return (
  <div ref={shellRef} className={`app-shell ${darkMode ? 'dark-ui' : ''} min-h-[100dvh] h-[100dvh] flex flex-col bg-[var(--app-canvas)] text-text-dark print:h-auto print:min-h-0 print:block print:bg-white`}>
    <PwaRegister />
    <header ref={headerRef} className="shrink-0 bg-white border-b border-border-light shadow-sm z-[1200] print:hidden pt-[env(safe-area-inset-top,0px)]">
      <div className="h-14 md:h-16 px-2 sm:px-5 flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-deep-blue text-white flex items-center justify-center shadow-sm overflow-hidden">
            <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#1a365d" />
              <path
                d="M9 8.5h9.2c2.9 0 5.3 2.3 5.3 5.2v0.2c0 2.9-2.4 5.2-5.3 5.2H12.5V23.5H9V8.5zm3.5 3.2v4.2h5.5c1.1 0 2-0.9 2-2.1v-0.1c0-1.1-0.9-2-2-2H12.5z"
                fill="#ffffff"
              />
              <rect x="20.5" y="20.2" width="5" height="3.2" rx="1" fill="#d4a039" />
            </svg>
          </span>
          <div className="hidden md:block leading-tight">
            <p className="text-sm font-bold text-deep-blue">CV Workspace</p>
            <p className="text-[10px] uppercase tracking-wider text-text-light">CV &amp; applications</p>
          </div>
        </div>


        <div className="flex-1" />

        {activePage === 'editor' && templates.length > 0 && (
          <label className="h-10 hidden sm:flex items-center gap-2 px-2.5 rounded-lg border border-border-light bg-bg-light text-text-light shrink-0">
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
          className="w-10 h-10 rounded-lg border border-border-light bg-bg-light text-text-light hover:text-deep-blue hover:border-deep-blue/30 flex items-center justify-center transition-colors shrink-0"
          aria-label={darkMode ? 'Use light mode' : 'Use dark mode'}
          aria-pressed={darkMode}
          title={darkMode ? 'Use light mode' : 'Use dark mode'}
        >
          {darkMode ? <FiSun size={17} /> : <FiMoon size={17} />}
        </button>

        {activeUser && (
          <div ref={userMenuRef} className="relative h-10 flex items-center gap-1.5 px-2 sm:px-2.5 rounded-lg border border-border-light bg-bg-light text-text-light shrink-0">
            <FiUser size={15} />
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-1 text-xs font-semibold text-text-dark focus:outline-none max-w-32"
              aria-label="Workspace user"
              aria-expanded={userMenuOpen}
            >
              <span className="truncate hidden sm:inline">{activeUser.name}</span>
              <FiChevronDown size={13} className={`shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
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
                <div className="my-1 border-t border-border-light" />
                {addingUser ? (
                  <form onSubmit={submitNewUser} className="flex items-center gap-1.5 p-1">
                    <input
                      autoFocus
                      value={newUserName}
                      onChange={(event) => setNewUserName(event.target.value)}
                      placeholder="User name"
                      aria-label="New workspace user name"
                      maxLength={40}
                      className="min-w-0 flex-1 rounded-lg border border-border-light px-2 py-1.5 text-xs text-text-dark focus:outline-none focus:ring-2 focus:ring-deep-blue/20"
                    />
                    <button
                      type="submit"
                      disabled={!newUserName.trim()}
                      className="shrink-0 rounded-lg bg-deep-blue px-2.5 py-1.5 text-xs font-medium text-white hover:bg-light-blue disabled:opacity-40"
                    >
                      Add
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingUser(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-text-dark hover:bg-bg-light"
                    aria-label="Add local workspace user"
                  >
                    <FiPlus size={14} className="shrink-0 text-text-light" />
                    Add user
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activePage === 'editor' && (showStatus || currentSaveName) && (
          <div className={`min-w-0 text-right ${showStatus ? '' : 'hidden sm:block'}`}>
            {showStatus ? (
              <p
                role="status"
                title={saveStatus.label}
                className="flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-light"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[saveStatus.tone] || STATUS_DOT.draft}`} aria-hidden="true" />
                <span className="truncate max-sm:sr-only">{saveStatus.label}</span>
              </p>
            ) : (
              <p className="text-[10px] uppercase tracking-wider font-semibold text-text-light">
                Current CV
              </p>
            )}
            <p className="max-w-24 sm:max-w-48 lg:max-w-72 truncate text-xs sm:text-sm font-medium text-text-dark" title={currentSaveName || 'Unsaved CV'}>
              {currentSaveName || 'Unsaved CV'}
            </p>
          </div>
        )}

        <button type="button" disabled={tabsBusy} onClick={onNavigateMaster} aria-current={activePage === 'master' ? 'page' : undefined} aria-label="Master list" title="Master list"
          className={`ml-1 flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-deep-blue ${activePage === 'master' ? 'border-deep-blue/30 bg-deep-blue/10 text-deep-blue' : 'border-border-light bg-bg-light text-text-dark hover:bg-deep-blue/10 hover:text-deep-blue'}`}>
          <FiBookOpen size={17} /><span className="hidden sm:inline">Master list</span>
        </button>

      </div>
      <nav aria-label="Workspace tabs" className="workspace-tabs flex items-end gap-1 overflow-x-auto px-2 sm:px-5 pt-1.5 bg-bg-light">
        <button type="button" disabled={tabsBusy} onClick={onNavigateBoard} aria-current={activePage === 'board' ? 'page' : undefined} data-active={activePage === 'board'}
          className="workspace-tab flex h-11 shrink-0 items-center gap-2 px-4 text-xs font-semibold rounded-t-lg border border-b-0 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-deep-blue">
          <FiColumns size={16} />Dashboard
        </button>
        {editorTabs.map((tab) => {
          const selected = tab.id === activeTabId
          return <div key={tab.id} data-active={selected} className="workspace-tab flex h-11 shrink-0 items-center rounded-t-lg border border-b-0">
            <button type="button" disabled={tabsBusy} onClick={() => onSelectTab(tab.id)} aria-current={selected ? 'page' : undefined} title={tab.label}
              className="flex h-full min-w-0 items-center gap-2 pl-3.5 pr-2 text-xs font-medium disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-deep-blue">
              <FiEdit3 size={16} className="shrink-0" /><span className="max-w-40 sm:max-w-52 truncate">{tab.label}</span>
              {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" role="img" aria-label="Unsaved changes" />}
            </button>
            <button type="button" disabled={tabsBusy} onClick={() => onCloseTab(tab.id)} aria-label={`Close ${tab.label}`} title={`Close ${tab.label} (⌘W / Ctrl+W; alternative: ⌘⇧K / Ctrl+Shift+K)`}
              className="workspace-tab-close mr-1.5 flex w-7 h-7 items-center justify-center rounded-md disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-deep-blue"><FiX size={15} /></button>
          </div>
        })}
      </nav>
    </header>

    <main className={`flex-1 min-h-0 print:overflow-visible ${activePage !== 'editor' ? 'overflow-hidden' : 'overflow-auto'} ${activePage === 'editor' ? 'max-md:pb-[4.75rem]' : ''}`}>
      {children}
    </main>
  </div>
  )
}
