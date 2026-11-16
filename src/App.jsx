'use client'

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { FiAlertCircle, FiCheckCircle, FiClock } from 'react-icons/fi'
import { Toolbar } from './components/Toolbar'
import { AppLayout } from './components/AppLayout'
import { CVPage, CV_TEMPLATES } from './components/CVPage'
import { BoardDashboard } from './components/BoardDashboard'
import { MasterExperience } from './components/MasterExperience'
import { JobSidebar } from './components/JobSidebar'
import { JsonEditorModal } from './components/JsonEditorModal'
import { SaveNameModal } from './components/SaveNameModal'
import { RIGHT_PANEL_WIDTHS } from './components/SidePanel'
import { VersionsDrawer } from './components/VersionsDrawer'
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
const SIDEBAR_COLLAPSED_KEY = 'cv-job-sidebar-collapsed'

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
  if (/^\/master\/?$/.test(window.location.pathname)) return { view: 'master', name: null }
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
  // Left job sidebar: which tab is showing, and whether it is unfolded on
  // small screens (it is always visible on wide ones).
  const [sidebarTab, setSidebarTab] = useState('match')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  // Wide screens: the job sidebar can shrink to a slim icon rail.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [saveNameOpen, setSaveNameOpen] = useState(false)
  const [savesOpen, setSavesOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState(true)
  const [masterOpen, setMasterOpen] = useState(false)
  const [masterDirty, setMasterDirty] = useState(false)
  const [masterBusy, setMasterBusy] = useState(false)
  const [editorTabs, setEditorTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const tabSessions = useRef(new Map())
  const tabActions = useRef({})
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
  // Mirrors the baseline snapshot in state so the UI can show whether the CV
  // on screen differs from what was last loaded or saved.
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialData))
  const setBaseline = useCallback((name, snapshot) => {
    autoSaveBaselineRef.current = { name, snapshot }
    setSavedSnapshot(snapshot)
  }, [])
  const snackbarTimerRef = useRef(null)
  const handleSaveRef = useRef(null)
  const autoSaveQueueRef = useRef(Promise.resolve())
  const autoSaveTimerRef = useRef(null)
  const previewPositionedRef = useRef(false)
  const recentreSmoothRef = useRef(false)
  const recentreTimerRef = useRef(null)
  const [recentreKey, setRecentreKey] = useState(0)
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

  // Keep each document's working copy separate from its saved baseline.
  // Switching tabs restores both, so edited CVs never overwrite one another.
  useLayoutEffect(() => {
    if (!activeTabId || routeLoading) return
    tabSessions.current.set(activeTabId, {
      id: activeTabId, data: cvData, name: currentSaveName, tags: currentSaveTags,
      version: currentVersionId, baseline: savedSnapshot,
      sidebarTab, sidebarExpanded, jsonEditorOpen, settingsOpen, savesOpen, printPreview,
    })
  }, [activeTabId, routeLoading, cvData, currentSaveName, currentSaveTags,
    currentVersionId, savedSnapshot, sidebarTab, sidebarExpanded,
    jsonEditorOpen, settingsOpen, savesOpen, printPreview])

  const createEditorTab = () => {
    setMasterOpen(false)
    const id = crypto.randomUUID()
    setEditorTabs((tabs) => [...tabs, id])
    setActiveTabId(id)
    setJsonEditorOpen(false)
    setSettingsOpen(false)
    setSavesOpen(false)
    previewPositionedRef.current = false
    return id
  }

  const restoreEditorTab = (tab, updateHistory = true) => {
    setMasterOpen(false)
    loadData(tab.data)
    setBaseline(tab.name, tab.baseline)
    setCurrentSaveName(tab.name)
    setCurrentSaveTags(tab.tags)
    setCurrentVersionId(tab.version)
    setSidebarTab(tab.sidebarTab || 'match')
    setSidebarExpanded(tab.sidebarExpanded || false)
    setJsonEditorOpen(tab.jsonEditorOpen || false)
    setSettingsOpen(tab.settingsOpen || false)
    setSavesOpen(tab.savesOpen || false)
    setPrintPreview(tab.printPreview ?? true)
    setActiveTabId(tab.id)
    setBoardOpen(false)
    setRouteLoading(false)
    previewPositionedRef.current = false
    if (updateHistory) window.history.pushState(null, '', editorPath(tab.name, tab.version))
  }
  const tabsBusy = saving || autoSaving || routeLoading || saveNameOpen || masterBusy
  tabActions.current = { createEditorTab, restoreEditorTab, busy: tabsBusy, activeTabId, boardOpen, masterOpen }

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
      // Extra room on both sides lets the pages be panned freely in either
      // direction, whichever editor layout is showing.
      const stageWidth = previewWidth + viewportWidth
      const isNarrow = viewportWidth < 768
      // Page one opens with its centre 35% of the way across the whole app
      // window (left of centre, so more of page two shows), unless the job
      // sidebar would overlap it.
      const areaLeft = previewStage.parentElement.getBoundingClientRect().left
      const centredOffset = isNarrow ? 12 : Math.max(24, (window.innerWidth * 0.35) - (pageWidth / 2) - areaLeft)
      const freeGutter = isNarrow ? 12 : Math.max(viewportWidth * 0.3, centredOffset)
      const initialScrollLeft = freeGutter - centredOffset

      cvElement.style.setProperty('--preview-pages-width', `${previewWidth}px`)
      previewStage.style.setProperty('--preview-stage-width', `${stageWidth}px`)
      previewStage.style.setProperty('--preview-stage-height', `${pageHeight}px`)
      previewStage.style.setProperty('--preview-side-gutter', `${freeGutter}px`)

      if (!previewPositionedRef.current) {
        const scroller = previewStage.parentElement
        if (recentreSmoothRef.current) {
          scroller.scrollTo({ left: initialScrollLeft, behavior: 'smooth' })
          recentreSmoothRef.current = false
        } else {
          scroller.scrollLeft = initialScrollLeft
        }
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
  }, [printPreview, boardOpen, routeLoading, cvData, effectiveEditorSettings, recentreKey])

  useEffect(() => {
    if (boardOpen) {
      document.title = masterOpen ? 'Master experience - CV Workspace' : 'CV Workspace'
      return
    }
    document.title = `${currentSaveName || 'Unsaved CV'} - CV`
  }, [boardOpen, masterOpen, currentSaveName])

  useEffect(() => {
    if (!printPreview) previewPositionedRef.current = false
  }, [printPreview])

  useEffect(() => {
    if (!workspaceHydrated) return
    try {
      setSidebarCollapsed(localStorage.getItem(workspaceStorageKey(SIDEBAR_COLLAPSED_KEY, activeUser.id)) === 'true')
    } catch {
      // The sidebar simply starts open when storage is unavailable.
    }
  }, [workspaceHydrated, activeUser.id])

  const handleSidebarCollapsedChange = (collapsed) => {
    setSidebarCollapsed(collapsed)
    // Once the sidebar has finished resizing (200ms), glide the first page
    // back to its usual spot for the new amount of room.
    clearTimeout(recentreTimerRef.current)
    recentreTimerRef.current = setTimeout(() => {
      previewPositionedRef.current = false
      recentreSmoothRef.current = true
      setRecentreKey((key) => key + 1)
    }, 230)
    try {
      localStorage.setItem(workspaceStorageKey(SIDEBAR_COLLAPSED_KEY, activeUser.id), String(collapsed))
    } catch {
      // Remembering the choice is optional.
    }
  }

  const showSnackbar = (message, type = 'success') => {
    // Restart the timer so an earlier message cannot dismiss a newer one early.
    clearTimeout(snackbarTimerRef.current)
    setSnackbar({ message, type })
    snackbarTimerRef.current = setTimeout(() => setSnackbar(null), type === 'error' ? 6000 : 3000)
  }

  // Width of whichever right-hand panel is open (0 when none).
  const rightPanelWidth = jsonEditorOpen
    ? RIGHT_PANEL_WIDTHS.json
    : settingsOpen
      ? RIGHT_PANEL_WIDTHS.settings
      : savesOpen
        ? RIGHT_PANEL_WIDTHS.versions
        : 0

  const currentSnapshot = useMemo(() => JSON.stringify(cvData), [cvData])
  const hasUnsavedChanges = currentSnapshot !== savedSnapshot
  const saveStatus = !currentSaveName
    ? { tone: 'draft', label: 'Local draft · not saved yet' }
    : saving || autoSaving
      ? { tone: 'saving', label: 'Saving…' }
      : currentVersionId
        ? { tone: 'version', label: hasUnsavedChanges ? 'Older version · edited' : 'Older version' }
        : hasUnsavedChanges
          ? { tone: 'dirty', label: 'Unsaved changes' }
          : { tone: 'saved', label: 'Saved' }
  // Warn before leaving while any open tab contains an unsaved working copy.
  const hasUnsavedTabs = masterDirty || (!!activeTabId && (!currentSaveName || hasUnsavedChanges)) || editorTabs.some((id) => {
    if (id === activeTabId) return false
    const tab = tabSessions.current.get(id)
    return tab && (!tab.name || JSON.stringify(tab.data) !== tab.baseline)
  })

  useEffect(() => {
    if (!hasUnsavedTabs) return undefined
    const warnBeforeLeaving = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [hasUnsavedTabs])

  useEffect(() => {
    if (boardOpen || routeLoading) return undefined
    const handleSaveShortcut = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      if (!event.repeat) handleSaveRef.current?.()
    }
    window.addEventListener('keydown', handleSaveShortcut)
    return () => window.removeEventListener('keydown', handleSaveShortcut)
  }, [boardOpen, routeLoading])

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
    if (boardOpen || !autoSave || !currentSaveName || currentVersionId || routeLoading || saving) return undefined

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
          setBaseline(saveName, snapshot)
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
  }, [boardOpen, autoSave, currentSaveName, currentSaveTags, currentVersionId, cvData, routeLoading, saving, activeTabId])

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
      const route = readRoute()
      if (tabActions.current.busy) {
        const current = tabSessions.current.get(tabActions.current.activeTabId)
        window.history.replaceState(null, '', tabActions.current.masterOpen ? '/master' : tabActions.current.boardOpen ? '/' : editorPath(current?.name, current?.version))
        return
      }

      const request = ++routeRequest
      if (route.view === 'master' || route.view === 'board') {
        setMasterOpen(route.view === 'master')
        setBoardOpen(true)
        setRouteLoading(false)
        return
      }

      const existingTab = [...tabSessions.current.values()].find((tab) => tab.name === route.name && tab.version === (route.version || null))
      if (existingTab) {
        tabActions.current.restoreEditorTab(existingTab, false)
        return
      }
      setMasterOpen(false)
      setBoardOpen(false)
      if (!route.name) {
        const draft = loadUnsavedDraft(activeUser.id)
        const draftData = draft?.data || initialData
        tabActions.current.createEditorTab()
        loadData(draftData)
        setBaseline(null, JSON.stringify(draftData))
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
        tabActions.current.createEditorTab()
        loadData(data)
        setBaseline(route.name, JSON.stringify(data))
        setCurrentSaveName(route.name)
        setCurrentSaveTags(save?.tags || [])
        setCurrentVersionId(loadedVersionId)
      } catch (err) {
        if (request !== routeRequest) return
        console.error('Error loading editor route:', err)
        window.history.replaceState(null, '', '/')
        setBoardOpen(true)
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
    if (tabsBusy) return
    window.history.pushState(null, '', '/')
    setMasterOpen(false)
    setBoardOpen(true)
  }

  const navigateToMaster = () => {
    if (tabsBusy) return
    window.history.pushState(null, '', '/master')
    setBoardOpen(true)
    setMasterOpen(true)
  }

  const navigateToEditor = (name = null, replace = false, version = null) => {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', editorPath(name, version))
    setMasterOpen(false)
    setBoardOpen(false)
  }

  const handleUserChange = (userId, confirmed = false) => {
    if (userId === activeUser.id) return
    if (tabsBusy) return
    const dirty = masterDirty || hasUnsavedChanges || [...tabSessions.current.values()].some((tab) => !tab.name || JSON.stringify(tab.data) !== tab.baseline)
    if (!confirmed && (editorTabs.length || masterDirty) && dirty && !window.confirm('Switch workspace user and close all open CV tabs? Unsaved edits will be discarded.')) return
    setMasterDirty(false)
    tabSessions.current.clear()
    setEditorTabs([])
    setActiveTabId(null)
    switchUser(userId)
    setDarkMode(loadDarkMode(userId))
    setAutoSave(loadAutoSave(userId))
    const draft = loadUnsavedDraft(userId)
    loadData(draft?.data || initialData)
    setBaseline(null, JSON.stringify(draft?.data || initialData))
    setUnsavedDraft(draft)
    setCurrentSaveName(null)
    setCurrentSaveTags(draft?.tags || [])
    setCurrentVersionId(null)
    navigateToBoard()
  }

  const handleAddUser = (name) => {
    if (!name?.trim() || tabsBusy) return
    const dirty = masterDirty || [...tabSessions.current.values()].some((tab) => !tab.name || JSON.stringify(tab.data) !== tab.baseline)
    if (dirty && !window.confirm('Create a workspace user and close all open CV tabs? Unsaved edits will be discarded.')) return
    const user = addUser(name)
    handleUserChange(user.id, true)
  }

  const handleNewCV = async (boardTag = '', sourceSave = null) => {
    if (tabsBusy) return false
    setRouteLoading(true)
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

      createEditorTab()
      loadData(nextData)
      setBaseline(null, JSON.stringify(nextData))
      setCurrentSaveName(null)
      setCurrentSaveTags(sourceSave?.tags || (boardTag ? [boardTag] : []))
      setCurrentVersionId(null)
      navigateToEditor()
      return true
    } catch (err) {
      console.error('Error cloning CV:', err)
      showSnackbar('Error cloning CV: ' + err.message, 'error')
      return false
    } finally {
      setRouteLoading(false)
    }
  }

  const handleRecoverDraft = () => {
    if (tabsBusy) return
    const draft = unsavedDraft || loadUnsavedDraft(activeUser.id)
    if (!draft?.data) {
      showSnackbar('No recoverable draft was found', 'error')
      return
    }

    createEditorTab()
    loadData(draft.data)
    setBaseline(null, JSON.stringify(draft.data))
    setCurrentSaveName(null)
    setCurrentSaveTags(draft.tags || [])
    setCurrentVersionId(null)
    navigateToEditor()
    showSnackbar('Recovered your unsaved local draft')
  }

  const handleSave = async () => {
    if (tabsBusy) return
    setSaveNameOpen(true)
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
  handleSaveRef.current = handleSave

  const handleConfirmSave = async (name, tags, mode) => {
    setSaveNameOpen(false)
    const isSavingUnsavedDraft = !currentSaveName
    try {
      setSaving(true)
      await saveToS3(cvData, name, tags, mode !== 'replace', activeUser.id)
      setBaseline(name, JSON.stringify(cvData))
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
    if (tabsBusy) return
    const existing = [...tabSessions.current.values()].find((tab) => tab.name === name)
    if (existing) {
      restoreEditorTab(existing)
      return
    }
    setRouteLoading(true)
    try {
      const data = await loadFromS3(name, activeUser.id)
      if (data) {
        createEditorTab()
        loadData(data)
        setBaseline(name, JSON.stringify(data))
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
    } finally {
      setRouteLoading(false)
    }
  }

  const handleSelectVersion = async (versionId) => {
    if (tabsBusy || !currentSaveName || versionId === currentVersionId) return
    if (hasUnsavedChanges && !window.confirm('Load this version and discard the unsaved edits in this tab?')) return
    setRouteLoading(true)

    try {
      const data = versionId
        ? await loadVersionFromS3(currentSaveName, versionId, activeUser.id)
        : await loadFromS3(currentSaveName, activeUser.id)
      if (!data) {
        showSnackbar('That version could not be found', 'error')
        return
      }

      loadData(data)
      setBaseline(currentSaveName, JSON.stringify(data))
      setCurrentVersionId(versionId || null)
      navigateToEditor(currentSaveName, false, versionId || null)
      showSnackbar(versionId ? 'Loaded saved version' : 'Loaded latest version')
    } catch (err) {
      console.error('Error loading CV version:', err)
      showSnackbar('Error loading version: ' + err.message, 'error')
    } finally {
      setRouteLoading(false)
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
        setBaseline(currentSaveName, JSON.stringify(updatedCvData))
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
    setSavesOpen(false)
    setJsonEditorOpen(true)
  }

  const handleOpenSettings = () => {
    if (settingsOpen) {
      handleCloseSettings()
      return
    }
    setJsonEditorOpen(false)
    setSavesOpen(false)
    setSettingsOpen(true)
  }

  // Only one panel at a time opens beside the right-hand toolbar.
  const handleToggleVersions = () => {
    if (savesOpen) {
      setSavesOpen(false)
      return
    }
    if (settingsOpen) handleCloseSettings()
    setJsonEditorOpen(false)
    setSavesOpen(true)
  }

  // Versions belong to a saved CV, so close the panel when there isn't one.
  useEffect(() => {
    if (!currentSaveName) setSavesOpen(false)
  }, [currentSaveName])

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

  const handleCloseTab = (id) => {
    if (tabsBusy) return
    const tab = tabSessions.current.get(id)
    if (tab && (!tab.name || JSON.stringify(tab.data) !== tab.baseline)
      && !window.confirm(`Close “${tab.name || 'Untitled CV'}” and discard its unsaved edits?`)) return
    const remaining = editorTabs.filter((tabId) => tabId !== id)
    tabSessions.current.delete(id)
    setEditorTabs(remaining)
    if (id === activeTabId) {
      const next = remaining[Math.min(editorTabs.indexOf(id), remaining.length - 1)]
      if (!boardOpen && next) restoreEditorTab(tabSessions.current.get(next))
      else {
        setActiveTabId(null)
        setCurrentSaveName(null)
        setBaseline(null, JSON.stringify(cvData))
        navigateToBoard()
      }
    }
  }

  useEffect(() => {
    const closeShortcut = (event) => {
      const primary = event.metaKey || event.ctrlKey
      const closeKey = primary && !event.altKey && (
        (!event.shiftKey && event.key.toLowerCase() === 'w') ||
        (event.shiftKey && event.key.toLowerCase() === 'k')
      )
      if (!closeKey || boardOpen || !activeTabId) return
      event.preventDefault()
      if (event.repeat || document.querySelector('[role="dialog"]')) return
      handleCloseTab(activeTabId)
    }
    window.addEventListener('keydown', closeShortcut)
    return () => window.removeEventListener('keydown', closeShortcut)
  })

  return (
    <AppLayout
      activePage={masterOpen ? 'master' : boardOpen ? 'board' : 'editor'}
      currentSaveName={currentSaveName}
      onNavigateBoard={navigateToBoard}
      onNavigateMaster={navigateToMaster}
      editorTabs={editorTabs.map((id, index) => {
        const tab = id === activeTabId
          ? { name: currentSaveName, data: cvData, baseline: savedSnapshot }
          : tabSessions.current.get(id)
        return { id, label: tab?.name || `Untitled CV ${index + 1}`, dirty: tab && (!tab.name || JSON.stringify(tab.data) !== tab.baseline) }
      })}
      activeTabId={boardOpen ? null : activeTabId}
      tabsBusy={tabsBusy}
      onSelectTab={(id) => {
        if (tabsBusy) return
        const tab = tabSessions.current.get(id)
        if (tab) restoreEditorTab(tab)
      }}
      onCloseTab={handleCloseTab}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode((current) => !current)}
      templateId={activeTemplateId}
      templates={CV_TEMPLATES}
      onTemplateChange={handleTemplateChange}
      users={users}
      activeUser={activeUser}
      onUserChange={handleUserChange}
      onAddUser={handleAddUser}
      saveStatus={saveStatus}
    >
      {workspaceHydrated && <div hidden={!masterOpen} className="h-full min-h-0">
        <MasterExperience key={activeUser.id} userId={activeUser.id} userName={activeUser.name} onDirtyChange={setMasterDirty} onBusyChange={setMasterBusy} />
      </div>}
      {masterOpen ? null : boardOpen ? (
        <div className="h-full min-h-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <BoardDashboard
              onCreateNew={handleNewCV}
              onLoad={handleOpenCV}
              recoverableDraft={unsavedDraft}
              onRecoverDraft={handleRecoverDraft}
              userId={activeUser.id}
            />
          </div>
        </div>
      ) : routeLoading ? (
        <div role="status" className="h-full flex flex-col items-center justify-center gap-3 text-sm text-text-light">
          <span className="w-6 h-6 rounded-full border-2 border-border-light border-t-deep-blue animate-spin" aria-hidden="true" />
          Loading CV…
        </div>
      ) : (
        <>
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
            onVersions={handleToggleVersions}
            versionsOpen={savesOpen}
            versionsDisabled={!currentSaveName}
            saving={saving}
            autoSave={autoSave}
            autoSaving={autoSaving}
            autoSaveDisabled={!currentSaveName || !!currentVersionId}
            onToggleAutoSave={() => setAutoSave((current) => !current)}
            notesOpen={sidebarExpanded && sidebarTab === 'notes'}
            onToggleNotes={() => {
              // Small screens only: unfold the job sidebar on its Notes tab,
              // which sits above the CV at the top of the page.
              const showing = sidebarExpanded && sidebarTab === 'notes'
              setSidebarTab('notes')
              setSidebarExpanded(!showing)
              if (!showing) document.querySelector('.app-shell main')?.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            drawerWidth={rightPanelWidth}
            hasUnsavedChanges={hasUnsavedChanges}
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
          <VersionsDrawer
            isOpen={savesOpen}
            onClose={() => setSavesOpen(false)}
            cvName={currentSaveName}
            currentVersionId={currentVersionId}
            onLoadVersion={handleSelectVersion}
            hasUnsavedChanges={hasUnsavedChanges}
            refreshKey={`${saving ? 1 : 0}:${autoSaving ? 1 : 0}`}
            userId={activeUser.id}
          />
          <div
            style={{ '--right-panel-width': `${rightPanelWidth}px` }}
            className="cv-editor-workspace flex flex-col lg:flex-row lg:h-full min-h-0 lg:pr-[var(--right-panel-width)] lg:transition-[padding] lg:duration-200 print:block print:h-auto print:pr-0"
          >
            <JobSidebar
              cvName={currentSaveName}
              userId={activeUser.id}
              cvData={cvData}
              tab={sidebarTab}
              onTabChange={setSidebarTab}
              expanded={sidebarExpanded}
              onExpandedChange={setSidebarExpanded}
              collapsed={sidebarCollapsed}
              onCollapsedChange={handleSidebarCollapsedChange}
              notes={cvData.notes}
              onNotesChange={(notes) => updateField('notes', notes)}
              clonedFrom={typeof cvData.clonedFrom === 'string' ? cvData.clonedFrom : ''}
              timelineRefreshKey={`${saving ? 1 : 0}:${autoSaving ? 1 : 0}`}
              onOpenCv={(name) => {
                if (name && name !== currentSaveName) handleOpenCV(name)
              }}
            />
            <div className="min-w-0 flex-1 flex flex-col lg:min-h-0 print:block">
              {currentVersionId && (
                <div role="status" className="version-notice shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 sm:px-5 py-2 border-b border-violet-200 bg-violet-50 text-violet-900 text-xs print:hidden">
                  <FiClock size={14} className="shrink-0" />
                  <span className="min-w-0 flex-1 basis-48">
                    You are viewing an older saved version. Edits here are not auto-saved — use Save to replace the latest or keep them as a new version.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectVersion(null)}
                    className="font-semibold underline underline-offset-2 hover:no-underline"
                  >
                    Back to latest
                  </button>
                </div>
              )}
              <div className={`app-content cv-editor-preview min-w-0 flex-1 lg:min-h-0 lg:overflow-auto print:overflow-visible print:pt-0 ${printPreview ? 'page-preview' : ''}`}>
                <div className="page-preview-stage">
                  <CVPage cvData={cvData} updateField={updateField} />
                </div>
              </div>
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
      <div
        role={snackbar?.type === 'error' ? 'alert' : 'status'}
        aria-live={snackbar?.type === 'error' ? 'assertive' : 'polite'}
        className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-3000 flex justify-center pointer-events-none print:hidden"
      >
        {snackbar && (
          <div
            className={`snackbar pointer-events-auto flex items-start gap-2.5 max-w-md pl-3.5 pr-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-xl ${snackbar.type === 'error' ? 'bg-red-700' : 'bg-slate-900'}`}
          >
            {snackbar.type === 'error'
              ? <FiAlertCircle size={17} className="shrink-0 mt-px" />
              : <FiCheckCircle size={17} className="shrink-0 mt-px text-emerald-400" />}
            <span className="min-w-0 break-words">{snackbar.message}</span>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default App
