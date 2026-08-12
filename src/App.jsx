import { useState, useEffect, useRef } from 'react'
import { Toolbar } from './components/Toolbar'
import { AppLayout } from './components/AppLayout'
import { CVPage } from './components/CVPage'
import { BoardDashboard } from './components/BoardDashboard'
import { JsonEditorModal } from './components/JsonEditorModal'
import { SaveNameModal } from './components/SaveNameModal'
import { SavesModal } from './components/SavesModal'
import {
  SettingsModal,
  DEFAULT_SETTINGS,
  applyTemplateLayout,
  applyThemeColors,
  normalizeSettings,
} from './components/SettingsModal'
import { useCVData } from './hooks/useCVData'
import {
  loadFromS3,
  loadVersionFromS3,
  listSaves,
  saveToS3,
  loadSettings,
  saveSettings,
} from './services/s3'
import initialData from '../cv.json'

const COLOR_MODE_KEY = 'cv-color-mode'
const AUTO_SAVE_KEY = 'cv-auto-save'
const UNSAVED_DRAFT_KEY = 'cv-unsaved-draft'

const loadDarkMode = () => {
  try {
    return localStorage.getItem(COLOR_MODE_KEY) === 'dark'
  } catch {
    return false
  }
}

const loadAutoSave = () => {
  try {
    return localStorage.getItem(AUTO_SAVE_KEY) === 'true'
  } catch {
    return false
  }
}

const loadUnsavedDraft = () => {
  try {
    const draft = JSON.parse(localStorage.getItem(UNSAVED_DRAFT_KEY) || 'null')
    return draft?.data && typeof draft.data === 'object' ? draft : null
  } catch {
    return null
  }
}

const readRoute = () => {
  const match = window.location.pathname.match(/^\/editor(?:\/([^/]+))?\/?$/)
  if (!match) return { view: 'board', name: null }

  try {
    const name = match[1] ? decodeURIComponent(match[1]) : null
    const version = name ? new URLSearchParams(window.location.search).get('version') : null
    return { view: 'editor', name, version }
  } catch {
    return { view: 'board', name: null }
  }
}

const editorPath = (name, version = null) => {
  if (!name) return '/editor'
  const path = `/editor/${encodeURIComponent(name)}`
  return version ? `${path}?version=${encodeURIComponent(version)}` : path
}

function App() {
  const { cvData, updateField, loadData } = useCVData(initialData)
  const [saving, setSaving] = useState(false)
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saveNameOpen, setSaveNameOpen] = useState(false)
  const [savesOpen, setSavesOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState(() => readRoute().view === 'board')
  const [routeLoading, setRouteLoading] = useState(() => {
    const route = readRoute()
    return route.view === 'editor' && !!route.name
  })
  const [currentSaveName, setCurrentSaveName] = useState(null)
  const [currentSaveTags, setCurrentSaveTags] = useState([])
  const [currentVersionId, setCurrentVersionId] = useState(null)
  const [saveModalData, setSaveModalData] = useState({
    allTags: [],
    defaultTags: [],
    existingNames: [],
  })
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [snackbar, setSnackbar] = useState(null)
  const [darkMode, setDarkMode] = useState(loadDarkMode)
  const [autoSave, setAutoSave] = useState(loadAutoSave)
  const [autoSaving, setAutoSaving] = useState(false)
  const [unsavedDraft, setUnsavedDraft] = useState(loadUnsavedDraft)
  const autoSaveBaselineRef = useRef({ name: null, snapshot: JSON.stringify(initialData) })
  const autoSaveQueueRef = useRef(Promise.resolve())

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ message, type })
    setTimeout(() => setSnackbar(null), 3000)
  }

  useEffect(() => {
    try {
      localStorage.setItem(COLOR_MODE_KEY, darkMode ? 'dark' : 'light')
    } catch {
      // Theme persistence is optional when storage is unavailable.
    }
  }, [darkMode])

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_SAVE_KEY, String(autoSave))
    } catch {
      // Auto-save persistence is optional when storage is unavailable.
    }
  }, [autoSave])

  useEffect(() => {
    if (!autoSave || !currentSaveName || currentVersionId || routeLoading || saving) return undefined

    const snapshot = JSON.stringify(cvData)
    const baseline = autoSaveBaselineRef.current
    if (baseline.name === currentSaveName && baseline.snapshot === snapshot) return undefined

    const timeout = setTimeout(() => {
      const saveName = currentSaveName
      const saveTags = currentSaveTags
      const saveData = cvData

      const persist = async () => {
        setAutoSaving(true)
        try {
          await saveToS3(saveData, saveName, saveTags, false)
          autoSaveBaselineRef.current = { name: saveName, snapshot }
        } catch (err) {
          console.error('Error auto-saving to S3:', err)
          showSnackbar('Auto-save failed: ' + err.message, 'error')
        } finally {
          setAutoSaving(false)
        }
      }

      autoSaveQueueRef.current = autoSaveQueueRef.current.then(persist, persist)
    }, 1200)

    return () => clearTimeout(timeout)
  }, [autoSave, currentSaveName, currentSaveTags, currentVersionId, cvData, routeLoading, saving])

  useEffect(() => {
    if (boardOpen || routeLoading || currentSaveName) return undefined

    const timeout = setTimeout(() => {
      const draft = {
        data: cvData,
        tags: currentSaveTags,
        savedAt: new Date().toISOString(),
      }
      try {
        localStorage.setItem(UNSAVED_DRAFT_KEY, JSON.stringify(draft))
        setUnsavedDraft(draft)
      } catch (err) {
        console.error('Error saving local draft:', err)
      }
    }, 800)

    return () => clearTimeout(timeout)
  }, [boardOpen, currentSaveName, currentSaveTags, cvData, routeLoading])

  useEffect(() => {
    const loadInitialSettings = async () => {
      try {
        const savedSettings = await loadSettings()
        if (savedSettings) {
          const normalizedSettings = normalizeSettings(savedSettings)
          setSettings(normalizedSettings)
          applyThemeColors(normalizedSettings.themeColors)
          applyTemplateLayout(normalizedSettings.templateLayout)
        } else {
          applyTemplateLayout(DEFAULT_SETTINGS.templateLayout)
        }
      } catch (err) {
        console.error('Error loading from S3:', err)
      }
    }
    loadInitialSettings()
  }, [])

  useEffect(() => {
    let routeRequest = 0

    const syncRoute = async () => {
      const request = ++routeRequest
      const route = readRoute()

      if (route.view === 'board') {
        setBoardOpen(true)
        setRouteLoading(false)
        return
      }

      setBoardOpen(false)
      if (!route.name) {
        const draft = loadUnsavedDraft()
        const draftData = draft?.data || initialData
        loadData(draftData)
        autoSaveBaselineRef.current = { name: null, snapshot: JSON.stringify(draftData) }
        setCurrentSaveName(null)
        setCurrentSaveTags(draft?.tags || [])
        setCurrentVersionId(null)
        setRouteLoading(false)
        if (draft) showSnackbar('Recovered your unsaved local draft')
        return
      }

      setRouteLoading(true)
      try {
        const [requestedData, saves] = await Promise.all([
          route.version
            ? loadVersionFromS3(route.name, route.version)
            : loadFromS3(route.name),
          listSaves(),
        ])
        if (request !== routeRequest) return

        let data = requestedData
        let loadedVersionId = route.version || null
        if (!data && route.version) {
          data = await loadFromS3(route.name)
          if (request !== routeRequest) return
          if (data) {
            loadedVersionId = null
            window.history.replaceState(null, '', editorPath(route.name))
            showSnackbar('That saved version was not found; loaded Latest instead', 'error')
          }
        }

        if (!data) {
          window.history.replaceState(null, '', '/')
          setBoardOpen(true)
          showSnackbar(`CV "${route.name}" was not found`, 'error')
          return
        }

        const save = saves.find((item) => item.name === route.name)
        loadData(data)
        autoSaveBaselineRef.current = { name: route.name, snapshot: JSON.stringify(data) }
        setCurrentSaveName(route.name)
        setCurrentSaveTags(save?.tags || [])
        setCurrentVersionId(loadedVersionId)
      } catch (err) {
        if (request !== routeRequest) return
        console.error('Error loading editor route:', err)
        showSnackbar('Error loading: ' + err.message, 'error')
      } finally {
        if (request === routeRequest) setRouteLoading(false)
      }
    }

    syncRoute()
    window.addEventListener('popstate', syncRoute)
    return () => {
      routeRequest += 1
      window.removeEventListener('popstate', syncRoute)
    }
  }, [loadData])

  const navigateToBoard = () => {
    window.history.pushState(null, '', '/')
    setBoardOpen(true)
  }

  const navigateToEditor = (name = null, replace = false, version = null) => {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', editorPath(name, version))
    setBoardOpen(false)
  }

  const handleNewCV = async (boardTag = '', sourceSave = null) => {
    try {
      const sourceData = sourceSave ? await loadFromS3(sourceSave.name) : initialData
      if (!sourceData) {
        showSnackbar('The CV selected for cloning could not be found', 'error')
        return false
      }

      loadData(sourceData)
      autoSaveBaselineRef.current = { name: null, snapshot: JSON.stringify(sourceData) }
      setCurrentSaveName(null)
      setCurrentSaveTags(sourceSave?.tags || (boardTag ? [boardTag] : []))
      setCurrentVersionId(null)
      navigateToEditor()
      return true
    } catch (err) {
      console.error('Error cloning CV:', err)
      showSnackbar('Error cloning CV: ' + err.message, 'error')
      return false
    }
  }

  const handleRecoverDraft = () => {
    const draft = unsavedDraft || loadUnsavedDraft()
    if (!draft?.data) {
      showSnackbar('No recoverable draft was found', 'error')
      return
    }

    loadData(draft.data)
    autoSaveBaselineRef.current = { name: null, snapshot: JSON.stringify(draft.data) }
    setCurrentSaveName(null)
    setCurrentSaveTags(draft.tags || [])
    setCurrentVersionId(null)
    navigateToEditor()
    showSnackbar('Recovered your unsaved local draft')
  }

  const handleSave = async () => {
    try {
      const saves = await listSaves()
      const allTags = [...new Set(saves.flatMap((s) => s.tags || []))].sort()
      const existing = saves.find((s) => s.name === currentSaveName)
      setSaveModalData({
        allTags,
        defaultTags: existing?.tags || currentSaveTags,
        existingNames: saves.map((save) => save.name),
      })
    } catch (err) {
      console.error('Error listing saves:', err)
      setSaveModalData({ allTags: [], defaultTags: currentSaveTags, existingNames: [] })
    }
    setSaveNameOpen(true)
  }

  const handleConfirmSave = async (name, tags, mode) => {
    setSaveNameOpen(false)
    const isSavingUnsavedDraft = !currentSaveName
    try {
      setSaving(true)
      await saveToS3(cvData, name, tags, mode !== 'replace')
      autoSaveBaselineRef.current = { name, snapshot: JSON.stringify(cvData) }
      if (isSavingUnsavedDraft) {
        try {
          localStorage.removeItem(UNSAVED_DRAFT_KEY)
        } catch {
          // Local draft cleanup is optional when storage is unavailable.
        }
        setUnsavedDraft(null)
      }
      setCurrentSaveName(name)
      setCurrentSaveTags(tags)
      setCurrentVersionId(null)
      navigateToEditor(name, true)
      showSnackbar(
        mode === 'replace'
          ? `Replaced the original version of "${name}"`
          : mode === 'version'
            ? `Saved a new version of "${name}"`
            : `Created "${name}"`,
      )
    } catch (err) {
      console.error('Error saving to S3:', err)
      showSnackbar('Error saving: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenCV = async (name, tags) => {
    try {
      const data = await loadFromS3(name)
      if (data) {
        loadData(data)
        autoSaveBaselineRef.current = { name, snapshot: JSON.stringify(data) }
        setCurrentSaveName(name)
        setCurrentSaveTags(tags || [])
        setCurrentVersionId(null)
        navigateToEditor(name)
        showSnackbar(`Loaded "${name}"`)
      }
    } catch (err) {
      console.error('Error loading version:', err)
      showSnackbar('Error loading: ' + err.message, 'error')
    }
  }

  const handleSelectVersion = async (versionId) => {
    if (!currentSaveName || versionId === currentVersionId) return

    try {
      const data = versionId
        ? await loadVersionFromS3(currentSaveName, versionId)
        : await loadFromS3(currentSaveName)
      if (!data) {
        showSnackbar('That version could not be found', 'error')
        return
      }

      loadData(data)
      autoSaveBaselineRef.current = { name: currentSaveName, snapshot: JSON.stringify(data) }
      setCurrentVersionId(versionId || null)
      navigateToEditor(currentSaveName, false, versionId || null)
      showSnackbar(versionId ? 'Loaded saved version' : 'Loaded latest version')
    } catch (err) {
      console.error('Error loading CV version:', err)
      showSnackbar('Error loading version: ' + err.message, 'error')
    }
  }

  const handleExportPDF = () => {
    window.print()
  }

  const handleSaveSettings = async (newSettings) => {
    const normalizedSettings = normalizeSettings(newSettings)
    setSettings(normalizedSettings)
    applyThemeColors(normalizedSettings.themeColors)
    applyTemplateLayout(normalizedSettings.templateLayout)
    setSettingsOpen(false)
    try {
      await saveSettings(normalizedSettings)
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
    <AppLayout
      activePage={boardOpen ? 'board' : 'editor'}
      currentSaveName={currentSaveName}
      onNavigateBoard={navigateToBoard}
      onNavigateEditor={() => navigateToEditor(currentSaveName)}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode((current) => !current)}
    >
      {boardOpen ? (
        <BoardDashboard
          onCreateNew={handleNewCV}
          onLoad={handleOpenCV}
          recoverableDraft={unsavedDraft}
          onRecoverDraft={handleRecoverDraft}
        />
      ) : routeLoading ? (
        <div className="h-full flex items-center justify-center bg-bg-light text-sm text-text-light">
          Loading CV…
        </div>
      ) : (
        <>
          <Toolbar
            onSave={handleSave}
            onExportPDF={handleExportPDF}
            onEditJson={() => setJsonEditorOpen(true)}
            onAI={handleAI}
            onSettings={() => setSettingsOpen(true)}
            onVersions={() => setSavesOpen(true)}
            versionsDisabled={!currentSaveName}
            saving={saving}
            autoSave={autoSave}
            autoSaving={autoSaving}
            autoSaveDisabled={!currentSaveName || !!currentVersionId}
            onToggleAutoSave={() => setAutoSave((current) => !current)}
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
            defaultTags={saveModalData.defaultTags}
            allTags={saveModalData.allTags}
            existingNames={saveModalData.existingNames}
          />
          <SavesModal
            isOpen={savesOpen}
            onClose={() => setSavesOpen(false)}
            cvName={currentSaveName}
            currentVersionId={currentVersionId}
            onLoadVersion={handleSelectVersion}
          />
          <SettingsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={settings}
            onSave={handleSaveSettings}
          />
          <div className="app-content print:pt-0">
            <CVPage cvData={cvData} updateField={updateField} />
          </div>
        </>
      )}
      {snackbar && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white text-sm font-medium shadow-lg z-3000 backdrop-blur-sm ${snackbar.type === 'error' ? 'bg-red-600/70' : 'bg-green-600/70'}`}
        >
          {snackbar.message}
        </div>
      )}
    </AppLayout>
  )
}

export default App
