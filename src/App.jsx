'use client'

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Toolbar } from './components/Toolbar'
import { ScratchNotes } from './components/ScratchNotes'
import { AppLayout } from './components/AppLayout'
import { CVPage, CV_TEMPLATES } from './components/CVPage'
import { BoardDashboard } from './components/BoardDashboard'
import { JsonEditorModal } from './components/JsonEditorModal'
import { SaveNameModal } from './components/SaveNameModal'
import { SavesModal } from './components/SavesModal'
import {
  SettingsModal,
  DEFAULT_SETTINGS,
  applyTemplateLayout,
  applyThemeColors,
  getTemplateLayoutDefaults,
  normalizeSettings,
} from './components/SettingsModal'
import { useCVData } from './hooks/useCVData'
import { useWorkspaceUser, workspaceStorageKey } from './hooks/useWorkspaceUser'
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

const loadDarkMode = (userId) => {
  try {
    const value = localStorage.getItem(workspaceStorageKey(COLOR_MODE_KEY, userId))
      ?? (userId === 'default' ? localStorage.getItem(COLOR_MODE_KEY) : null)
    return value === 'dark'
  } catch {
    return false
  }
}

const loadAutoSave = (userId) => {
  try {
    const value = localStorage.getItem(workspaceStorageKey(AUTO_SAVE_KEY, userId))
      ?? (userId === 'default' ? localStorage.getItem(AUTO_SAVE_KEY) : null)
    return value === 'true'
  } catch {
    return false
  }
}

const loadUnsavedDraft = (userId) => {
  try {
    const stored = localStorage.getItem(workspaceStorageKey(UNSAVED_DRAFT_KEY, userId))
      ?? (userId === 'default' ? localStorage.getItem(UNSAVED_DRAFT_KEY) : null)
    const draft = JSON.parse(stored || 'null')
    return draft?.data && typeof draft.data === 'object' ? draft : null
  } catch {
    return null
  }
}

const readRoute = () => {
  if (typeof window === 'undefined') return { view: 'board', name: null }
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

const resolveTemplateId = (templateId) => {
  const normalized = templateId === 'simple' ? 'classic' : (templateId || 'modern')
  return CV_TEMPLATES.some((template) => template.id === normalized) ? normalized : 'classic'
}

const cloneCvPresentation = (sourceData, globalSettings = DEFAULT_SETTINGS) => {
  const presentation = sourceData.presentation || {}
  const requestedTemplateId = presentation.templateId || 'modern'
  const templateId = resolveTemplateId(requestedTemplateId)
  const templateSettings = presentation.templateSettings || {}
  const layout = {
    ...getTemplateLayoutDefaults(templateId),
    ...(Object.keys(templateSettings).length === 0 ? presentation.layout || {} : {}),
    ...(requestedTemplateId === 'simple' ? templateSettings.simple?.layout || {} : {}),
    ...(templateSettings[templateId]?.layout || {}),
  }
  const nextTemplateSettings = {
    ...templateSettings,
    [templateId]: {
      ...(templateSettings[templateId] || {}),
      layout,
    },
  }
  const nextPresentation = {
    ...presentation,
    templateId,
    themeColors: {
      ...DEFAULT_SETTINGS.themeColors,
      ...(globalSettings.themeColors || {}),
      ...(presentation.themeColors || {}),
    },
    templateSettings: nextTemplateSettings,
  }
  delete nextPresentation.layout
  return nextPresentation
}

function App() {
  const { users, activeUser, switchUser, addUser, hydrated: workspaceHydrated } = useWorkspaceUser()
  const { cvData, updateField, loadData } = useCVData(initialData)
  const [saving, setSaving] = useState(false)
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [saveNameOpen, setSaveNameOpen] = useState(false)
  const [savesOpen, setSavesOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState(true)
  const [routeLoading, setRouteLoading] = useState(false)
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
  const [darkMode, setDarkMode] = useState(false)
  const [autoSave, setAutoSave] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [printPreview, setPrintPreview] = useState(true)
  const [unsavedDraft, setUnsavedDraft] = useState(null)
  const autoSaveBaselineRef = useRef({ name: null, snapshot: JSON.stringify(initialData) })
  const autoSaveQueueRef = useRef(Promise.resolve())
  const autoSaveTimerRef = useRef(null)
  const previewPositionedRef = useRef(false)
  const requestedTemplateId = cvData.presentation?.templateId || 'modern'
  const normalizedTemplateId = requestedTemplateId === 'simple' ? 'classic' : requestedTemplateId
  const activeTemplateId = CV_TEMPLATES.some((template) => template.id === normalizedTemplateId)
    ? normalizedTemplateId
    : 'classic'
  const effectiveThemeColors = useMemo(() => ({
    ...settings.themeColors,
    ...(cvData.presentation?.themeColors || {}),
  }), [settings.themeColors, cvData.presentation?.themeColors])
  const effectiveTemplateLayout = useMemo(() => {
    const cvLayout = {
      ...(Object.keys(cvData.presentation?.templateSettings || {}).length === 0
        ? cvData.presentation?.layout || {}
        : {}),
      ...(requestedTemplateId === 'simple'
        ? cvData.presentation?.templateSettings?.simple?.layout || {}
        : {}),
      ...(cvData.presentation?.templateSettings?.[activeTemplateId]?.layout || {}),
    }
    return normalizeSettings({
      templateLayout: {
        ...getTemplateLayoutDefaults(activeTemplateId),
        ...cvLayout,
        sectionMargins: cvLayout.sectionMargins,
      },
    }, activeTemplateId).templateLayout
  }, [
    activeTemplateId,
    requestedTemplateId,
    cvData.presentation?.layout,
    cvData.presentation?.templateSettings,
  ])
  const effectiveEditorSettings = useMemo(() => ({
    ...settings,
    themeColors: effectiveThemeColors,
    templateLayout: effectiveTemplateLayout,
  }), [settings, effectiveThemeColors, effectiveTemplateLayout])

  useEffect(() => {
    if (requestedTemplateId !== 'simple') return

    const simpleLayout = cvData.presentation?.templateSettings?.simple?.layout
    const classicLayout = cvData.presentation?.templateSettings?.classic?.layout
    if (simpleLayout && !classicLayout) {
      updateField('presentation.templateSettings.classic.layout', simpleLayout)
    }
    updateField('presentation.templateId', 'classic')
  }, [requestedTemplateId, cvData.presentation?.templateSettings, updateField])

  useLayoutEffect(() => {
    if (!printPreview || boardOpen || routeLoading) return undefined

    const cvElement = document.getElementById('cv-content')
    if (!cvElement) return undefined
    const previewStage = cvElement.closest('.page-preview-stage')
    if (!previewStage) return undefined

    let frameId
    const sizePageBackground = () => {
      // Reset before measuring so an earlier, wider preview cannot keep the
      // scroll area open after content is removed.
      cvElement.style.setProperty('--preview-pages-width', '210mm')
      const containerRect = cvElement.getBoundingClientRect()
      const pageWidth = containerRect.width
      const columnGap = Number.parseFloat(getComputedStyle(cvElement).columnGap) || 0
      const columnStep = pageWidth + columnGap
      let contentRight = containerRect.left

      cvElement.querySelectorAll('*').forEach((element) => {
        Array.from(element.getClientRects()).forEach((rect) => {
          if (rect.width > 0 && rect.height > 0) {
            contentRight = Math.max(contentRight, rect.right)
          }
        })
      })

      // Subtracting one pixel keeps an element ending exactly at a page edge
      // from being rounded into an extra empty column.
      const occupiedWidth = Math.max(0, contentRight - containerRect.left - 1)
      const pageCount = Math.max(1, Math.floor(occupiedWidth / columnStep) + 1)
      const previewWidth = (pageCount * pageWidth) + ((pageCount - 1) * columnGap)
      const viewportWidth = previewStage.parentElement.clientWidth
      const pageHeight = pageWidth * (297 / 210)
      const stageWidth = previewWidth + viewportWidth

      cvElement.style.setProperty('--preview-pages-width', `${previewWidth}px`)
      previewStage.style.setProperty('--preview-stage-width', `${stageWidth}px`)
      previewStage.style.setProperty('--preview-stage-height', `${pageHeight}px`)
      // Keep the first page 30% from the editor viewport's left edge on
      // initial load. The viewport remains freely horizontally scrollable.
      const previewLeftGutter = viewportWidth < 768 ? 12 : viewportWidth * 0.3
      previewStage.style.setProperty('--preview-side-gutter', `${previewLeftGutter}px`)

      if (!previewPositionedRef.current) {
        previewStage.parentElement.scrollLeft = 0
        previewPositionedRef.current = true
      }
    }

    sizePageBackground()
    frameId = requestAnimationFrame(sizePageBackground)
    const resizeObserver = new ResizeObserver(sizePageBackground)
    resizeObserver.observe(previewStage.parentElement)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
    }
  }, [printPreview, boardOpen, routeLoading, cvData, effectiveEditorSettings])

  useEffect(() => {
    if (boardOpen) {
      document.title = 'CV Workspace'
      return
    }
    document.title = `${currentSaveName || 'Unsaved CV'} - CV`
  }, [boardOpen, currentSaveName])

  useEffect(() => {
    if (!printPreview) previewPositionedRef.current = false
  }, [printPreview])

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ message, type })
    setTimeout(() => setSnackbar(null), 3000)
  }

  useEffect(() => {
    if (!workspaceHydrated) return
    setDarkMode(loadDarkMode(activeUser.id))
    setAutoSave(loadAutoSave(activeUser.id))
    const draft = loadUnsavedDraft(activeUser.id)
    setUnsavedDraft(draft)
  }, [workspaceHydrated, activeUser.id])

  useEffect(() => {
    if (!workspaceHydrated) return undefined
    try {
      localStorage.setItem(workspaceStorageKey(COLOR_MODE_KEY, activeUser.id), darkMode ? 'dark' : 'light')
    } catch {
      // Theme persistence is optional when storage is unavailable.
    }

    document.documentElement.classList.toggle('dark-ui-body', darkMode)
    document.body.classList.toggle('dark-ui-body', darkMode)

    return () => {
      document.documentElement.classList.remove('dark-ui-body')
      document.body.classList.remove('dark-ui-body')
    }
  }, [darkMode, activeUser.id, workspaceHydrated])

  useEffect(() => {
    if (!workspaceHydrated) return
    try {
      localStorage.setItem(workspaceStorageKey(AUTO_SAVE_KEY, activeUser.id), String(autoSave))
    } catch {
      // Auto-save persistence is optional when storage is unavailable.
    }
  }, [autoSave, activeUser.id, workspaceHydrated])

  useEffect(() => {
    if (!autoSave || !currentSaveName || currentVersionId || routeLoading || saving) return undefined

    const snapshot = JSON.stringify(cvData)
    const baseline = autoSaveBaselineRef.current
    if (baseline.name === currentSaveName && baseline.snapshot === snapshot) return undefined

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null
      const saveName = currentSaveName
      const saveTags = currentSaveTags
      const saveData = cvData

      const persist = async () => {
        setAutoSaving(true)
        try {
          await saveToS3(saveData, saveName, saveTags, false, activeUser.id)
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

    return () => {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
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
        localStorage.setItem(workspaceStorageKey(UNSAVED_DRAFT_KEY, activeUser.id), JSON.stringify(draft))
        setUnsavedDraft(draft)
      } catch (err) {
        console.error('Error saving local draft:', err)
      }
    }, 800)

    return () => clearTimeout(timeout)
  }, [activeUser.id, boardOpen, currentSaveName, currentSaveTags, cvData, routeLoading])

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
    applyThemeColors(effectiveThemeColors)
    applyTemplateLayout(effectiveTemplateLayout)
  }, [effectiveThemeColors, effectiveTemplateLayout])

  useEffect(() => {
    if (!workspaceHydrated) return undefined
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
        const draft = loadUnsavedDraft(activeUser.id)
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
            ? loadVersionFromS3(route.name, route.version, activeUser.id)
            : loadFromS3(route.name, activeUser.id),
          listSaves(activeUser.id),
        ])
        if (request !== routeRequest) return

        let data = requestedData
        let loadedVersionId = route.version || null
        if (!data && route.version) {
          data = await loadFromS3(route.name, activeUser.id)
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
  }, [activeUser.id, loadData, workspaceHydrated])

  const navigateToBoard = () => {
    window.history.pushState(null, '', '/')
    setBoardOpen(true)
  }

  const navigateToEditor = (name = null, replace = false, version = null) => {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', editorPath(name, version))
    setBoardOpen(false)
  }

  const handleUserChange = (userId) => {
    if (userId === activeUser.id) return
    switchUser(userId)
    setDarkMode(loadDarkMode(userId))
    setAutoSave(loadAutoSave(userId))
    const draft = loadUnsavedDraft(userId)
    loadData(draft?.data || initialData)
    setUnsavedDraft(draft)
    setCurrentSaveName(null)
    setCurrentSaveTags(draft?.tags || [])
    setCurrentVersionId(null)
    navigateToBoard()
  }

  const handleAddUser = () => {
    const name = window.prompt('Name this local workspace user')
    if (!name?.trim()) return
    const user = addUser(name)
    handleUserChange(user.id)
  }

  const handleNewCV = async (boardTag = '', sourceSave = null) => {
    try {
      const sourceData = sourceSave ? await loadFromS3(sourceSave.name, activeUser.id) : initialData
      if (!sourceData) {
        showSnackbar('The CV selected for cloning could not be found', 'error')
        return false
      }

      const nextData = JSON.parse(JSON.stringify(sourceData))
      if (sourceSave?.name) {
        nextData.clonedFrom = sourceSave.name
        nextData.presentation = cloneCvPresentation(sourceData, settings)
      } else {
        delete nextData.clonedFrom
      }

      loadData(nextData)
      autoSaveBaselineRef.current = { name: null, snapshot: JSON.stringify(nextData) }
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
    const draft = unsavedDraft || loadUnsavedDraft(activeUser.id)
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
      const saves = await listSaves(activeUser.id)
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
      await saveToS3(cvData, name, tags, mode !== 'replace', activeUser.id)
      autoSaveBaselineRef.current = { name, snapshot: JSON.stringify(cvData) }
      if (isSavingUnsavedDraft) {
        try {
          localStorage.removeItem(workspaceStorageKey(UNSAVED_DRAFT_KEY, activeUser.id))
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
      const data = await loadFromS3(name, activeUser.id)
      if (data) {
        loadData(data)
        autoSaveBaselineRef.current = { name, snapshot: JSON.stringify(data) }
        setCurrentSaveName(name)
        setCurrentSaveTags(tags || [])
        setCurrentVersionId(null)
        navigateToEditor(name)
        showSnackbar(`Loaded "${name}"`)
      } else {
        showSnackbar(`CV "${name}" was not found`, 'error')
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
        ? await loadVersionFromS3(currentSaveName, versionId, activeUser.id)
        : await loadFromS3(currentSaveName, activeUser.id)
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
    if (printPreview) {
      flushSync(() => setPrintPreview(false))
    }
    window.print()
  }

  const handleSaveSettings = async (newSettings) => {
    const normalizedSettings = normalizeSettings(newSettings, activeTemplateId)
    const globalSettings = {
      ...settings,
      aiPromptTemplate: normalizedSettings.aiPromptTemplate,
    }
    const presentation = {
      ...(cvData.presentation || {}),
      templateId: activeTemplateId,
      themeColors: normalizedSettings.themeColors,
      templateSettings: {
        ...(cvData.presentation?.templateSettings || {}),
        [activeTemplateId]: {
          ...(cvData.presentation?.templateSettings?.[activeTemplateId] || {}),
          layout: normalizedSettings.templateLayout,
        },
      },
    }
    delete presentation.layout
    const updatedCvData = { ...cvData, presentation }

    setSettings(globalSettings)
    loadData(updatedCvData)
    applyThemeColors(normalizedSettings.themeColors)
    applyTemplateLayout(normalizedSettings.templateLayout)
    setSettingsOpen(false)
    setSaving(true)
    try {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null

      // A debounced auto-save may already be running with the previous CV
      // snapshot. Let it finish before writing settings so it cannot overwrite
      // the newly selected spacing values afterward.
      await autoSaveQueueRef.current.catch(() => undefined)

      if (currentSaveName && !currentVersionId) {
        await saveToS3(updatedCvData, currentSaveName, currentSaveTags, false, activeUser.id)
      }
      await saveSettings(globalSettings)

      if (currentSaveName && !currentVersionId) {
        autoSaveBaselineRef.current = {
          name: currentSaveName,
          snapshot: JSON.stringify(updatedCvData),
        }
        showSnackbar('Theme settings saved to this CV!')
      } else if (currentVersionId) {
        showSnackbar('Theme applied. Use Save to replace or create a version.')
      } else {
        showSnackbar('Theme applied to this draft!')
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      showSnackbar('Error saving settings: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePreviewSettings = (previewSettings) => {
    applyThemeColors(previewSettings.themeColors)
    applyTemplateLayout(previewSettings.templateLayout)
  }

  const handleCloseSettings = () => {
    applyThemeColors(effectiveThemeColors)
    applyTemplateLayout(effectiveTemplateLayout)
    setSettingsOpen(false)
  }

  const handleOpenJsonEditor = () => {
    if (jsonEditorOpen) {
      setJsonEditorOpen(false)
      return
    }
    if (settingsOpen) handleCloseSettings()
    setNotesOpen(false)
    setJsonEditorOpen(true)
  }

  const handleOpenSettings = () => {
    if (settingsOpen) {
      handleCloseSettings()
      return
    }
    setJsonEditorOpen(false)
    setNotesOpen(false)
    setSettingsOpen(true)
  }

  const handleAI = async () => {
    const prompt = settings.aiPromptTemplate.replace('{cv_json}', JSON.stringify(cvData, null, 2))
    await navigator.clipboard.writeText(prompt)
    showSnackbar('Prompt copied to clipboard!')
    window.open('https://chatgpt.com/', '_blank')
  }

  const handleTemplateChange = (nextTemplateId) => {
    if (nextTemplateId === activeTemplateId) return

    const legacyLayout = cvData.presentation?.layout
    const currentTemplateLayout = cvData.presentation?.templateSettings?.[activeTemplateId]?.layout
    if (legacyLayout && !currentTemplateLayout) {
      updateField(`presentation.templateSettings.${activeTemplateId}.layout`, legacyLayout)
      updateField('presentation.layout', null)
    }
    updateField('presentation.templateId', nextTemplateId)
  }

  return (
    <AppLayout
      activePage={boardOpen ? 'board' : 'editor'}
      currentSaveName={currentSaveName}
      onNavigateBoard={navigateToBoard}
      onNavigateEditor={() => navigateToEditor(currentSaveName)}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode((current) => !current)}
      templateId={activeTemplateId}
      templates={CV_TEMPLATES}
      onTemplateChange={handleTemplateChange}
      users={users}
      activeUser={activeUser}
      onUserChange={handleUserChange}
      onAddUser={handleAddUser}
    >
      {boardOpen ? (
        <BoardDashboard
          onCreateNew={handleNewCV}
          onLoad={handleOpenCV}
          recoverableDraft={unsavedDraft}
          onRecoverDraft={handleRecoverDraft}
          userId={activeUser.id}
        />
      ) : routeLoading ? (
        <div className="h-full flex items-center justify-center bg-bg-light text-sm text-text-light">
          Loading CV…
        </div>
      ) : (
        <>
          <ScratchNotes
            value={cvData.notes}
            onChange={(notes) => updateField('notes', notes)}
            cvName={currentSaveName}
            clonedFrom={typeof cvData.clonedFrom === 'string' ? cvData.clonedFrom : ''}
            userId={activeUser.id}
            refreshKey={`${saving ? 1 : 0}:${autoSaving ? 1 : 0}`}
            open={notesOpen}
            onOpenChange={setNotesOpen}
            onOpenCv={(name) => {
              if (name && name !== currentSaveName) handleOpenCV(name)
            }}
          />
          <Toolbar
            onSave={handleSave}
            onExportPDF={handleExportPDF}
            printPreview={printPreview}
            onTogglePrintPreview={() => setPrintPreview((current) => !current)}
            onEditJson={handleOpenJsonEditor}
            jsonEditorOpen={jsonEditorOpen}
            onAI={handleAI}
            onSettings={handleOpenSettings}
            settingsOpen={settingsOpen}
            onVersions={() => setSavesOpen(true)}
            versionsDisabled={!currentSaveName}
            saving={saving}
            autoSave={autoSave}
            autoSaving={autoSaving}
            autoSaveDisabled={!currentSaveName || !!currentVersionId}
            onToggleAutoSave={() => setAutoSave((current) => !current)}
            notesOpen={notesOpen}
            onToggleNotes={() => {
              setNotesOpen((open) => !open)
              setJsonEditorOpen(false)
              if (settingsOpen) handleCloseSettings()
            }}
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
            userId={activeUser.id}
          />
          <div className={`app-content print:pt-0 ${printPreview ? 'page-preview' : ''}`}>
            <div className="page-preview-stage">
              <CVPage cvData={cvData} updateField={updateField} />
            </div>
          </div>
        </>
      )}
      <JsonEditorModal
        isOpen={jsonEditorOpen}
        visible={!boardOpen && !routeLoading}
        onClose={() => setJsonEditorOpen(false)}
        cvData={cvData}
        onConfirm={loadData}
        showSnackbar={showSnackbar}
      />
      <SettingsModal
        isOpen={settingsOpen}
        visible={!boardOpen && !routeLoading}
        onClose={handleCloseSettings}
        settings={effectiveEditorSettings}
        templateId={activeTemplateId}
        onPreview={handlePreviewSettings}
        onSave={handleSaveSettings}
      />
      {snackbar && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white text-sm font-medium shadow-lg z-3000 backdrop-blur-sm print:hidden ${snackbar.type === 'error' ? 'bg-red-600/70' : 'bg-green-600/70'}`}
        >
          {snackbar.message}
        </div>
      )}
    </AppLayout>
  )
}

export default App
