import { useState, useEffect } from 'react'

export const DEFAULT_SETTINGS = {
  themeColors: {
    'deep-blue': '#1a365d',
    'golden-yellow': '#d4a039',
    'light-blue': '#2c5282',
    'text-dark': '#334155',
    'text-light': '#64748b',
    'bg-light': '#f8fafc',
    'golden-hover': '#8a8260',
    'light-blue-hover': '#2b4a6f',
    'border-light': '#e2e8f0',
  },
  templateLayout: {
    textSize: 14,
    lineHeight: 1.5,
    sectionSpacing: 16,
    jobSpacing: 24,
    jobItemSpacing: 8,
  },
  aiPromptTemplate: `I want to ask you to help me improve my CV. Here is my current CV data:\n\n{cv_json}`,
}

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}

export const normalizeSettings = (settings = {}) => {
  const layout = settings.templateLayout || {}
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    themeColors: {
      ...DEFAULT_SETTINGS.themeColors,
      ...(settings.themeColors || {}),
    },
    templateLayout: {
      textSize: clampNumber(layout.textSize, 11, 18, DEFAULT_SETTINGS.templateLayout.textSize),
      lineHeight: clampNumber(layout.lineHeight, 1.2, 2, DEFAULT_SETTINGS.templateLayout.lineHeight),
      sectionSpacing: clampNumber(layout.sectionSpacing, 8, 32, DEFAULT_SETTINGS.templateLayout.sectionSpacing),
      jobSpacing: clampNumber(layout.jobSpacing, 8, 48, DEFAULT_SETTINGS.templateLayout.jobSpacing),
      jobItemSpacing: clampNumber(layout.jobItemSpacing, 0, 24, DEFAULT_SETTINGS.templateLayout.jobItemSpacing),
    },
  }
}

const COLOR_GROUPS = [
  {
    label: 'Primary',
    keys: ['deep-blue', 'light-blue', 'golden-yellow'],
  },
  {
    label: 'Text',
    keys: ['text-dark', 'text-light', 'bg-light', 'border-light'],
  },
  {
    label: 'Hover',
    keys: ['golden-hover', 'light-blue-hover'],
  },
]

const COLOR_LABELS = {
  'deep-blue': 'Deep Blue',
  'golden-yellow': 'Golden Yellow',
  'light-blue': 'Light Blue',
  'text-dark': 'Text Dark',
  'text-light': 'Text Light',
  'bg-light': 'Background',
  'golden-hover': 'Golden Hover',
  'light-blue-hover': 'Blue Hover',
  'border-light': 'Border',
}

export const applyThemeColors = (themeColors) => {
  const root = document.documentElement
  Object.entries(themeColors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value)
    root.style.setProperty(`--cv-color-${key}`, value)
  })
}

export const applyTemplateLayout = (templateLayout) => {
  const layout = { ...DEFAULT_SETTINGS.templateLayout, ...(templateLayout || {}) }
  const root = document.documentElement
  root.style.setProperty('--cv-text-size', `${layout.textSize}px`)
  root.style.setProperty('--cv-line-height', layout.lineHeight)
  root.style.setProperty('--cv-section-spacing', `${layout.sectionSpacing}px`)
  root.style.setProperty('--cv-job-spacing', `${layout.jobSpacing}px`)
  root.style.setProperty('--cv-job-item-spacing', `${layout.jobItemSpacing}px`)
}

const LayoutControl = ({ label, value, min, max, step, suffix = '', onChange }) => (
  <label className="block p-3 rounded-xl bg-gray-50 border border-gray-100">
    <span className="flex items-center justify-between gap-3 mb-2">
      <span className="text-xs font-medium text-text-dark">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 px-2 py-1 text-xs text-right border border-border-light rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-light-blue/30"
        />
        {suffix && <span className="w-5 text-[11px] text-text-light">{suffix}</span>}
      </span>
    </span>
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="block w-full accent-deep-blue cursor-pointer"
    />
  </label>
)

const ColorSwatch = ({ colorKey, value, onChange }) => (
  <label className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
    <div className="relative shrink-0">
      <div
        className="w-9 h-9 rounded-lg shadow-sm border border-gray-200 group-hover:shadow-md transition-shadow"
        style={{ backgroundColor: value }}
      />
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(colorKey, e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-xs font-medium text-text-dark leading-tight">{COLOR_LABELS[colorKey]}</span>
      <span className="text-[11px] text-text-light font-mono leading-tight">{value}</span>
    </div>
  </label>
)

export const SettingsModal = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings)

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(normalizeSettings(settings))
    }
  }, [isOpen, settings])

  if (!isOpen) return null

  const handleColorChange = (key, value) => {
    setLocalSettings((prev) => ({
      ...prev,
      themeColors: { ...prev.themeColors, [key]: value },
    }))
  }

  const handleResetColors = () => {
    setLocalSettings((prev) => ({
      ...prev,
      themeColors: { ...DEFAULT_SETTINGS.themeColors },
    }))
  }

  const handleLayoutChange = (key, value) => {
    setLocalSettings((prev) => ({
      ...prev,
      templateLayout: { ...prev.templateLayout, [key]: value },
    }))
  }

  const handleResetLayout = () => {
    setLocalSettings((prev) => ({
      ...prev,
      templateLayout: { ...DEFAULT_SETTINGS.templateLayout },
    }))
  }

  const handlePromptChange = (value) => {
    setLocalSettings((prev) => ({
      ...prev,
      aiPromptTemplate: value,
    }))
  }

  const colors = localSettings.themeColors
  const layout = localSettings.templateLayout || DEFAULT_SETTINGS.templateLayout

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
          <div>
            <h2 className="text-lg font-semibold text-deep-blue">Settings</h2>
            <p className="text-xs text-text-light mt-0.5">Customize template, theme and AI behavior</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-8">
          {/* Theme Colors */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-deep-blue">Theme Colors</h3>
              <button
                onClick={handleResetColors}
                className="text-xs text-text-light hover:text-deep-blue transition-colors cursor-pointer px-2 py-1 rounded hover:bg-gray-100"
              >
                Reset to defaults
              </button>
            </div>

            {/* Preview strip */}
            <div className="flex rounded-lg overflow-hidden h-3 mb-5 shadow-sm">
              {Object.values(colors).map((color, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>

            {/* Color groups */}
            <div className="space-y-4">
              {COLOR_GROUPS.map((group) => (
                <div key={group.label}>
                  <span className="text-[11px] font-medium text-text-light uppercase tracking-wider mb-2 block">{group.label}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {group.keys.map((key) => (
                      <ColorSwatch
                        key={key}
                        colorKey={key}
                        value={colors[key]}
                        onChange={handleColorChange}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Template Layout */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-deep-blue">Template Layout</h3>
                <p className="text-xs text-text-light mt-0.5">Applied to the editor and PDF output.</p>
              </div>
              <button
                onClick={handleResetLayout}
                className="text-xs text-text-light hover:text-deep-blue transition-colors cursor-pointer px-2 py-1 rounded hover:bg-gray-100"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LayoutControl
                label="Text size"
                value={layout.textSize}
                min={11}
                max={18}
                step={0.5}
                suffix="px"
                onChange={(value) => handleLayoutChange('textSize', value)}
              />
              <LayoutControl
                label="Body line height"
                value={layout.lineHeight}
                min={1.2}
                max={2}
                step={0.05}
                onChange={(value) => handleLayoutChange('lineHeight', value)}
              />
              <LayoutControl
                label="Section spacing"
                value={layout.sectionSpacing}
                min={8}
                max={32}
                step={1}
                suffix="px"
                onChange={(value) => handleLayoutChange('sectionSpacing', value)}
              />
              <LayoutControl
                label="Spacing between jobs"
                value={layout.jobSpacing}
                min={8}
                max={48}
                step={1}
                suffix="px"
                onChange={(value) => handleLayoutChange('jobSpacing', value)}
              />
              <LayoutControl
                label="Spacing between job items"
                value={layout.jobItemSpacing}
                min={0}
                max={24}
                step={1}
                suffix="px"
                onChange={(value) => handleLayoutChange('jobItemSpacing', value)}
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* AI Prompt */}
          <div>
            <h3 className="text-sm font-semibold text-deep-blue mb-1">AI Prompt Template</h3>
            <p className="text-xs text-text-light mb-3">
              Use <code className="bg-gray-100 px-1.5 py-0.5 rounded text-deep-blue font-semibold">{'{cv_json}'}</code> where your CV data should be inserted.
            </p>
            <textarea
              value={localSettings.aiPromptTemplate}
              onChange={(e) => handlePromptChange(e.target.value)}
              className="w-full h-28 p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-light-blue/40 focus:border-light-blue transition-shadow bg-gray-50 font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/80">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-200 rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(normalizeSettings(localSettings))}
            className="px-5 py-2 border-none rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 bg-deep-blue text-white hover:bg-light-blue shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
