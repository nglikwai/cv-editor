import { useState } from 'react'
import { FiClipboard, FiClock, FiCloud, FiEdit, FiEye, FiMoreHorizontal, FiPrinter, FiSave, FiSettings } from 'react-icons/fi'
import { RiRobot2Line } from 'react-icons/ri'

const ToolbarButton = ({ onClick, disabled, label, pressed, tooltipSide = 'left', children }) => {
  const tooltipClass = tooltipSide === 'top'
    ? 'bottom-full left-1/2 -translate-x-1/2 mb-2 after:left-1/2 after:-translate-x-1/2 after:top-full after:border-l-transparent after:border-r-transparent after:border-t-gray-900 after:border-b-transparent'
    : 'right-full top-1/2 -translate-y-1/2 mr-2 after:left-full after:top-1/2 after:-translate-y-1/2 after:border-l-gray-900 after:border-y-transparent after:border-r-transparent'

  return (
    <div className="relative group">
      <button
        className={`relative p-2.5 border-none rounded-full cursor-pointer text-lg text-black/70 transition-all duration-200 hover:scale-125 hover:text-black active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 before:absolute before:inset-0 before:rounded-full before:opacity-0 before:bg-white/50 before:backdrop-blur-sm before:border before:border-white/60 before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] before:transition-opacity before:duration-200 hover:before:opacity-100 ${pressed ? '!text-green-600 before:!opacity-100 before:!bg-green-50/80' : ''}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={pressed}
      >
        <span className="relative z-10">{children}</span>
      </button>
      <div className={`absolute px-2.5 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 after:content-[''] after:absolute after:border-4 ${tooltipClass}`}>
        {label}
      </div>
    </div>
  )
}

const Divider = () => (
  <div className="h-px w-8 bg-white/20 self-center my-1 hidden md:block" />
)

const actionButtons = (props) => {
  const {
    onSave,
    onExportPDF,
    printPreview,
    onTogglePrintPreview,
    onEditJson,
    jsonEditorOpen,
    onAI,
    onSettings,
    settingsOpen,
    onVersions,
    versionsDisabled,
    saving,
    autoSave,
    autoSaving,
    autoSaveDisabled,
    onToggleAutoSave,
    onToggleNotes,
    notesOpen,
    tooltipSide,
  } = props

  return (
    <>
      <ToolbarButton onClick={onSave} disabled={saving} label="Save" tooltipSide={tooltipSide}>
        <FiSave />
      </ToolbarButton>
      <ToolbarButton
        onClick={onToggleAutoSave}
        disabled={autoSaveDisabled}
        pressed={autoSave}
        label={autoSaveDisabled ? 'Auto Save requires the latest saved CV' : autoSaving ? 'Auto-saving…' : `Auto Save: ${autoSave ? 'On' : 'Off'}`}
        tooltipSide={tooltipSide}
      >
        <FiCloud className={autoSaving ? 'animate-pulse' : ''} />
      </ToolbarButton>
      <ToolbarButton onClick={onVersions} disabled={versionsDisabled} label="Saved Versions" tooltipSide={tooltipSide}>
        <FiClock />
      </ToolbarButton>
      <ToolbarButton
        onClick={onEditJson}
        pressed={jsonEditorOpen}
        label={`${jsonEditorOpen ? 'Close' : 'Open'} JSON Editor`}
        tooltipSide={tooltipSide}
      >
        <FiEdit />
      </ToolbarButton>
      <Divider />
      <ToolbarButton onClick={onExportPDF} label="Export PDF" tooltipSide={tooltipSide}>
        <FiPrinter />
      </ToolbarButton>
      <ToolbarButton
        onClick={onTogglePrintPreview}
        pressed={printPreview}
        label={`A4 Page Preview: ${printPreview ? 'On' : 'Off'}`}
        tooltipSide={tooltipSide}
      >
        <FiEye />
      </ToolbarButton>
      <ToolbarButton onClick={onAI} label="AI Assistant" tooltipSide={tooltipSide}>
        <RiRobot2Line />
      </ToolbarButton>
      {onToggleNotes && (
        <ToolbarButton
          onClick={onToggleNotes}
          pressed={notesOpen}
          label={`${notesOpen ? 'Close' : 'Open'} scratch notes`}
          tooltipSide={tooltipSide}
        >
          <FiClipboard />
        </ToolbarButton>
      )}
      <Divider />
      <ToolbarButton
        onClick={onSettings}
        pressed={settingsOpen}
        label={`${settingsOpen ? 'Close' : 'Open'} Theme Settings`}
        tooltipSide={tooltipSide}
      >
        <FiSettings />
      </ToolbarButton>
    </>
  )
}

export const Toolbar = (props) => {
  const [moreOpen, setMoreOpen] = useState(false)
  const mobilePrimary = [
    { key: 'save', node: (
      <ToolbarButton onClick={props.onSave} disabled={props.saving} label="Save" tooltipSide="top">
        <FiSave />
      </ToolbarButton>
    ) },
    { key: 'preview', node: (
      <ToolbarButton
        onClick={props.onTogglePrintPreview}
        pressed={props.printPreview}
        label={`A4 Page Preview: ${props.printPreview ? 'On' : 'Off'}`}
        tooltipSide="top"
      >
        <FiEye />
      </ToolbarButton>
    ) },
    { key: 'notes', node: (
      <ToolbarButton
        onClick={props.onToggleNotes}
        pressed={props.notesOpen}
        label={`${props.notesOpen ? 'Close' : 'Open'} scratch notes`}
        tooltipSide="top"
      >
        <FiClipboard />
      </ToolbarButton>
    ) },
    { key: 'json', node: (
      <ToolbarButton
        onClick={props.onEditJson}
        pressed={props.jsonEditorOpen}
        label={`${props.jsonEditorOpen ? 'Close' : 'Open'} JSON Editor`}
        tooltipSide="top"
      >
        <FiEdit />
      </ToolbarButton>
    ) },
    { key: 'settings', node: (
      <ToolbarButton
        onClick={props.onSettings}
        pressed={props.settingsOpen}
        label={`${props.settingsOpen ? 'Close' : 'Open'} Theme Settings`}
        tooltipSide="top"
      >
        <FiSettings />
      </ToolbarButton>
    ) },
  ]

  return (
    <>
      <div className="toolbar hidden md:flex fixed top-1/2 right-4 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-3 flex-col items-center gap-2 z-[1000] shadow-[0_4px_24px_rgba(0,0,0,0.15)] rounded-full print:hidden">
        {actionButtons({ ...props, onToggleNotes: undefined, tooltipSide: 'left' })}
      </div>

      <div className="toolbar md:hidden fixed inset-x-0 bottom-0 z-[1100] print:hidden pb-[env(safe-area-inset-bottom,0px)] bg-white/85 backdrop-blur-md border-t border-white/20 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-around px-1 py-1.5">
          {mobilePrimary.map((item) => (
            <div key={item.key}>{item.node}</div>
          ))}
          <div className="relative">
            <ToolbarButton
              onClick={() => setMoreOpen((open) => !open)}
              pressed={moreOpen}
              label="More actions"
              tooltipSide="top"
            >
              <FiMoreHorizontal />
            </ToolbarButton>
            {moreOpen && (
              <div className="absolute bottom-full right-0 mb-2 flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/95 border border-border-light shadow-xl">
                <ToolbarButton
                  onClick={() => { props.onToggleAutoSave(); setMoreOpen(false) }}
                  disabled={props.autoSaveDisabled}
                  pressed={props.autoSave}
                  label={props.autoSaveDisabled ? 'Auto Save requires the latest saved CV' : `Auto Save: ${props.autoSave ? 'On' : 'Off'}`}
                  tooltipSide="top"
                >
                  <FiCloud className={props.autoSaving ? 'animate-pulse' : ''} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => { props.onVersions(); setMoreOpen(false) }}
                  disabled={props.versionsDisabled}
                  label="Saved Versions"
                  tooltipSide="top"
                >
                  <FiClock />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => { props.onExportPDF(); setMoreOpen(false) }}
                  label="Export PDF"
                  tooltipSide="top"
                >
                  <FiPrinter />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => { props.onAI(); setMoreOpen(false) }}
                  label="AI Assistant"
                  tooltipSide="top"
                >
                  <RiRobot2Line />
                </ToolbarButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
