import { FiClock, FiEdit, FiPrinter, FiSave, FiSettings } from 'react-icons/fi'
import { RiRobot2Line } from 'react-icons/ri'

const ToolbarButton = ({ onClick, disabled, label, children }) => {
  return (
    <div className="relative group">
      <button
        className="relative p-2.5 border-none rounded-full cursor-pointer text-lg text-black/70 transition-all duration-200 hover:scale-125 hover:text-black active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 before:absolute before:inset-0 before:rounded-full before:opacity-0 before:bg-white/50 before:backdrop-blur-sm before:border before:border-white/60 before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] before:transition-opacity before:duration-200 hover:before:opacity-100"
        onClick={onClick}
        disabled={disabled}
      >
        <span className="relative z-10">{children}</span>
      </button>
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 after:content-[''] after:absolute after:left-full after:top-1/2 after:-translate-y-1/2 after:border-4 after:border-transparent after:border-l-gray-900">
        {label}
      </div>
    </div>
  )
}

const Divider = () => (
  <div className="h-px w-8 bg-white/20 self-center my-1" />
)

export const Toolbar = ({ onSave, onExportPDF, onEditJson, onAI, onSettings, onVersions, saving }) => {
  return (
    <div className="toolbar fixed top-1/2 right-4 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-3 flex flex-col items-center gap-2 z-[1000] shadow-[0_4px_24px_rgba(0,0,0,0.15)] rounded-full print:hidden">
      <ToolbarButton onClick={onSave} disabled={saving} label="Save">
        <FiSave />
      </ToolbarButton>
      <ToolbarButton onClick={onVersions} label="Saved Versions">
        <FiClock />
      </ToolbarButton>
      <ToolbarButton onClick={onEditJson} label="Edit JSON">
        <FiEdit />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={onExportPDF} label="Export PDF">
        <FiPrinter />
      </ToolbarButton>
      <ToolbarButton onClick={onAI} label="AI Assistant">
        <RiRobot2Line />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={onSettings} label="Settings">
        <FiSettings />
      </ToolbarButton>
    </div>
  )
}
