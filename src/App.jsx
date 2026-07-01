import { useState, useEffect } from 'react'
import { Toolbar } from './components/Toolbar'
import { CVPage } from './components/CVPage'
import { JsonEditorModal } from './components/JsonEditorModal'
import { SaveNameModal } from './components/SaveNameModal'
import { SavesModal } from './components/SavesModal'
import { SettingsModal, DEFAULT_SETTINGS, applyThemeColors } from './components/SettingsModal'
import { useCVData } from './hooks/useCVData'
import { loadFromS3, loadLatestFromS3, listSaves, saveToS3, loadSettings, saveSettings } from './services/s3'
import initialData from '../cv.json'

function App() {
  const { cvData, updateField, loadData } = useCVData(initialData)
  const [saving, setSaving] = useState(false)
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saveNameOpen, setSaveNameOpen] = useState(false)
  const [savesOpen, setSavesOpen] = useState(false)
  const [currentSaveName, setCurrentSaveName] = useState(null)
  const [currentSaveTags, setCurrentSaveTags] = useState([])
  const [saveModalTags, setSaveModalTags] = useState({ allTags: [], defaultTags: [] })
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [snackbar, setSnackbar] = useState(null)

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ message, type })
    setTimeout(() => setSnackbar(null), 3000)
  }

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [{ data, name, tags }, savedSettings] = await Promise.all([
          loadLatestFromS3(),
          loadSettings(),
        ])
        if (data) {
          loadData(data)
          setCurrentSaveName(name)
          setCurrentSaveTags(tags || [])
        }
        if (savedSettings) {
          setSettings(savedSettings)
          applyThemeColors(savedSettings.themeColors)
        }
      } catch (err) {
        console.error('Error loading from S3:', err)
      }
    }
    loadInitialData()
  }, [])

  const handleSave = async () => {
    try {
      const saves = await listSaves()
      const allTags = [...new Set(saves.flatMap((s) => s.tags || []))].sort()
      const existing = saves.find((s) => s.name === currentSaveName)
      setSaveModalTags({ allTags, defaultTags: existing?.tags || currentSaveTags })
    } catch (err) {
      console.error('Error listing saves:', err)
      setSaveModalTags({ allTags: [], defaultTags: currentSaveTags })
    }
    setSaveNameOpen(true)
  }

  const handleConfirmSave = async (name, tags) => {
    setSaveNameOpen(false)
    try {
      setSaving(true)
      await saveToS3(cvData, name, tags)
      setCurrentSaveName(name)
      setCurrentSaveTags(tags)
      showSnackbar(`Saved as "${name}"`)
    } catch (err) {
      console.error('Error saving to S3:', err)
      showSnackbar('Error saving: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLoadVersion = async (name, tags) => {
    try {
      const data = await loadFromS3(name)
      if (data) {
        loadData(data)
        setCurrentSaveName(name)
        setCurrentSaveTags(tags || [])
        showSnackbar(`Loaded "${name}"`)
      }
    } catch (err) {
      console.error('Error loading version:', err)
      showSnackbar('Error loading: ' + err.message, 'error')
    }
  }

  const handleExportPDF = () => {
    window.print()
  }

  const handleSaveSettings = async (newSettings) => {
    setSettings(newSettings)
    applyThemeColors(newSettings.themeColors)
    setSettingsOpen(false)
    try {
      await saveSettings(newSettings)
      showSnackbar('Settings saved!')
    } catch (err) {
      console.error('Error saving settings:', err)
      showSnackbar('Error saving settings: ' + err.message, 'error')
    }
  }

  const handleAI = async () => {
    const prompt = settings.aiPromptTemplate.replace('{cv_json}', JSON.stringify(cvData, null, 2))
    await navigator.clipboard.writeText(prompt)
    showSnackbar('Prompt copied to clipboard!')
    window.open('https://chatgpt.com/', '_blank')
  }

  return (
    <div>
      <Toolbar
        onSave={handleSave}
        onExportPDF={handleExportPDF}
        onEditJson={() => setJsonEditorOpen(true)}
        onAI={handleAI}
        onSettings={() => setSettingsOpen(true)}
        onVersions={() => setSavesOpen(true)}
        saving={saving}
      />
      <JsonEditorModal
        isOpen={jsonEditorOpen}
        onClose={() => setJsonEditorOpen(false)}
        cvData={cvData}
        onConfirm={loadData}
        showSnackbar={showSnackbar}
      />
      <SaveNameModal
        isOpen={saveNameOpen}
        onConfirm={handleConfirmSave}
        onCancel={() => setSaveNameOpen(false)}
        defaultName={currentSaveName}
        defaultTags={saveModalTags.defaultTags}
        allTags={saveModalTags.allTags}
      />
      <SavesModal
        isOpen={savesOpen}
        onClose={() => setSavesOpen(false)}
        onLoad={handleLoadVersion}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
      <div className="app-content print:pt-0">
        <CVPage
          cvData={cvData}
          updateField={updateField}
        />
      </div>
      {snackbar && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white text-sm font-medium shadow-lg z-3000 backdrop-blur-sm ${snackbar.type === 'error' ? 'bg-red-600/70' : 'bg-green-600/70'}`}
        >
          {snackbar.message}
        </div>
      )}
    </div>
  )
}

export default App
