import { FiSave, FiEdit, FiPrinter, FiSettings } from 'react-icons/fi'
import { RiRobot2Line } from 'react-icons/ri'

const ToolbarButton = ({ onClick, disabled, label, children, className }) => {
  return (
    <div className="relative group">
      <button
        className={`p-3 border-none rounded-xl cursor-pointer text-lg transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
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

export const Toolbar = ({ onSave, onExportPDF, onEditJson, onAI, onSettings, saving }) => {
  return (
    <div className="toolbar fixed top-1/2 right-4 -translate-y-1/2 bg-deep-blue/85 backdrop-blur-sm px-2.5 py-3 flex flex-col items-center gap-2 z-[1000] shadow-[0_2px_8px_rgba(0,0,0,0.3)] rounded-full print:hidden">
      <ToolbarButton onClick={onSave} disabled={saving} label="Save JSON" className="bg-light-blue/90 text-white hover:bg-light-blue">
        <FiSave />
      </ToolbarButton>
      <ToolbarButton onClick={onEditJson} label="Edit JSON" className="bg-light-blue/90 text-white hover:bg-light-blue">
        <FiEdit />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={onExportPDF} label="Export PDF" className="bg-golden-yellow/90 text-deep-blue hover:bg-golden-yellow">
        <FiPrinter />
      </ToolbarButton>
      <ToolbarButton onClick={onAI} label="AI Assistant" className="bg-green-600/90 text-white hover:bg-green-600">
        <RiRobot2Line />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={onSettings} label="Settings" className="bg-white/10 text-white/70 hover:bg-white/20 hover:text-white">
        <FiSettings />
      </ToolbarButton>
    </div>
  )
}
