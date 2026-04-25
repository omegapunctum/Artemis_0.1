import { loadLayers, getRecentFeatures } from './data.js';
import { updateMapData, setLayerLookup, focusFeatureOnMap, getMapFeatureCount, getMapBuildDiagnostics, setMapFeatureClickHandler, setMapFeatureHoverHandler, setMapLayerFilter, setSelectedFeatureId, setHoveredFeatureId, setMapDisplayMode, getMapThemeOptions, getMapTheme, setMapTheme } from './map.js';
import { debounce, createInlineStateBlock } from './ux.js';
import { normalizeSafeUrl, setSafeImageSource, setSafeLink, toSafeText } from './safe-dom.js';
import { DEFAULT_DISPLAY_MODE, aggregateFeaturesByDecade, createLiveState } from './state.js';
import { buildResearchSlicePayload, buildSliceAnnotationDisplayPlan, buildSliceListMetaSummary, normalizeSliceForRestore, listResearchSlices, getResearchSlice, createResearchSlice, deleteResearchSlice } from './research_slices.js';
import { buildStoryPayload, clampStoryStepIndex, resolveStoryStepSliceId, listStories, getStory, createStory, deleteStory } from './stories.js';
import { buildCoursePayload, clampCourseStepIndex, resolveCourseStepStoryId, listCourses, getCourse, createCourse, deleteCourse } from './courses_runtime.js';

let globalDataErrorRetryHandler = null;
let activeUiToastTimerId = null;
let activeUiToastEl = null;
const ONBOARDING_HINT_SESSION_KEY = 'artemis_onboarding_hint_dismissed';
const COURSE_PROGRESS_STORAGE_KEY = 'artemis_course_progress_v1';
const TIMELINE_SEMANTIC_ANCHORS = [
  { key: 'byzantium-founded', year: 330, label: '330', description: 'Byzantium founded' },
  { key: 'hagia-sophia', year: 532, label: '532', description: 'Hagia Sophia completed' },
  { key: 'iconoclasm', year: 784.5, label: '726–843', description: 'Iconoclasm' },
  { key: 'schism', year: 1054, label: '1054', description: 'East–West Schism' },
  { key: 'fourth-crusade', year: 1204, label: '1204', description: 'Fourth Crusade' },
  { key: 'fall-of-constantinople', year: 1453, label: '1453', description: 'Fall of Constantinople' }
];

function isDebugTelemetryMode() {
  if (typeof window === 'undefined') return false;
  const debugParam = new URLSearchParams(window.location.search).get('debug');
  if (typeof debugParam === 'string' && ['1', 'true', 'on'].includes(debugParam.trim().toLowerCase())) {
    return true;
  }
  const host = String(window.location.hostname || '').toLowerCase();
  return host === 'localhost'
    || host === '127.0.0.1'
    || host === '::1'
    || host.endsWith('.local')
    || host.endsWith('.test');
}

export function showGlobalDataLoading(message = 'Загрузка карты...') {
  const host = document.getElementById('global-data-loading');
  const text = document.getElementById('global-data-loading-text');
  if (!host || !text) return;
  text.textContent = message;
  host.hidden = false;
  host.setAttribute('aria-hidden', 'false');
  hideGlobalDataError();
  const onboarding = document.getElementById('onboarding-overlay');
  if (onboarding) {
    onboarding.hidden = true;
    onboarding.setAttribute('aria-hidden', 'true');
  }
  const noResults = document.getElementById('search-no-results-state');
  if (noResults) noResults.hidden = true;
}

export function hideGlobalDataLoading() {
  const host = document.getElementById('global-data-loading');
  if (!host) return;
  host.hidden = true;
  host.setAttribute('aria-hidden', 'true');
}

export function showGlobalDataError({ message, onRetry } = {}) {
  const host = document.getElementById('global-data-error');
  const text = document.getElementById('global-data-error-text');
  const retryBtn = document.getElementById('global-data-error-retry');
  if (!host || !text || !retryBtn) return;

  text.textContent = message || 'Не удалось загрузить данные карты.';
  host.hidden = false;
  host.setAttribute('aria-hidden', 'false');
  hideGlobalDataLoading();
  const onboarding = document.getElementById('onboarding-overlay');
  if (onboarding) {
    onboarding.hidden = true;
    onboarding.setAttribute('aria-hidden', 'true');
  }
  const noResults = document.getElementById('search-no-results-state');
  if (noResults) noResults.hidden = true;

  if (globalDataErrorRetryHandler) {
    retryBtn.removeEventListener('click', globalDataErrorRetryHandler);
    globalDataErrorRetryHandler = null;
  }
  if (typeof onRetry === 'function') {
    globalDataErrorRetryHandler = () => onRetry();
    retryBtn.addEventListener('click', globalDataErrorRetryHandler);
  }
}

export function hideGlobalDataError() {
  const host = document.getElementById('global-data-error');
  const retryBtn = document.getElementById('global-data-error-retry');
  if (!host || !retryBtn) return;
  host.hidden = true;
  host.setAttribute('aria-hidden', 'true');
  if (globalDataErrorRetryHandler) {
    retryBtn.removeEventListener('click', globalDataErrorRetryHandler);
    globalDataErrorRetryHandler = null;
  }
}

function showUiSystemMessage(message, { variant = 'success', timeout = 2600 } = {}) {
  const host = document.getElementById('app-status-host');
  if (!host || !message) return;

  if (activeUiToastTimerId !== null) {
    window.clearTimeout(activeUiToastTimerId);
    activeUiToastTimerId = null;
  }
  if (activeUiToastEl && activeUiToastEl.isConnected) {
    activeUiToastEl.remove();
  }
  host.querySelectorAll('[data-artemis-ui-toast="true"]').forEach((node) => node.remove());

  const item = document.createElement('div');
  item.className = `app-system-message app-system-${variant}`;
  item.setAttribute('role', 'status');
  item.setAttribute('aria-live', 'polite');
  item.dataset.artemisUiToast = 'true';
  item.textContent = message;
  host.appendChild(item);
  activeUiToastEl = item;

  activeUiToastTimerId = window.setTimeout(() => {
    if (activeUiToastEl && activeUiToastEl.isConnected) activeUiToastEl.remove();
    activeUiToastEl = null;
    activeUiToastTimerId = null;
  }, Math.max(800, Number(timeout) || 2600));
}

export async function initUI(map, features) {
  hideGlobalDataError();
  const allFeatures = Array.isArray(features?.features)
    ? features.features.filter(isFeatureLike).map(enrichFeatureForUiKey)
    : [];
  let layers;
  try {
    layers = await loadLayers();
  } catch (error) {
    showGlobalDataError({ message: 'Не удалось загрузить данные карты.' });
    throw error;
  }
  const layerLookup = buildLayerLookup(layers, allFeatures);
  setLayerLookup(map, layers);

  const elements = {
    searchInput: document.getElementById('global-search') || document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    searchShell: document.querySelector('.search-shell'),
    searchHelperState: document.getElementById('search-helper-state'),
    searchSuggestions: document.getElementById('search-suggestions'),
    searchNoResultsState: document.getElementById('search-no-results-state'),
    searchNoResultsText: document.getElementById('search-no-results-text'),
    searchNoResultsReset: document.getElementById('search-no-results-reset'),
    searchDropdown: document.getElementById('search-dropdown'),
    filtersBtn: document.getElementById('filters-btn'),
    layersBtn: document.getElementById('layers-btn'),
    quickLayerFilter: document.getElementById('quick-layer-filter'),
    layersEntryHelper: document.getElementById('layers-entry-helper'),
    bookmarksBtn: document.getElementById('bookmarks-btn'),
    slicesBtn: document.getElementById('slices-btn'),
    coursesBtn: document.getElementById('courses-btn'),
    liveBtn: document.getElementById('live-btn'),
    filtersPanel: document.getElementById('filters-panel'),
    layersPanel: document.getElementById('layers-panel'),
    bookmarksPanel: document.getElementById('bookmarks-panel'),
    slicesPanel: document.getElementById('slices-panel'),
    coursesPanel: document.getElementById('courses-panel'),
    livePanel: document.getElementById('live-panel'),
    appShell: document.getElementById('app-shell'),
    topHeader: document.getElementById('top-header'),
    researchContextBar: document.getElementById('research-context-bar'),
    researchSliceTrigger: document.getElementById('research-slice-trigger'),
    researchSliceState: document.getElementById('research-slice-state'),
    researchSliceSaveBtn: document.getElementById('research-slice-save-btn'),
    researchSliceOpenBtn: document.getElementById('research-slice-open-btn'),
    researchSliceCompareBtn: document.getElementById('research-slice-compare-btn'),
    researchPeriodMeta: document.getElementById('research-period-meta'),
    researchLayersMeta: document.getElementById('research-layers-meta'),
    researchObjectsMeta: document.getElementById('research-objects-meta'),
    exploreToolbarShell: document.getElementById('explore-toolbar-shell'),
    exploreWorkspaceTrigger: document.getElementById('explore-workspace-trigger'),
    exploreWorkspacePanel: document.getElementById('explore-workspace-panel'),
    topActions: document.querySelector('#top-header .top-actions'),
    topUtilityGroup: document.querySelector('#top-header .top-utility-group'),
    displayModeToggle: document.getElementById('display-mode-toggle'),
    overflowBtn: document.getElementById('overflow-btn'),
    mapThemeToggle: document.getElementById('map-theme-toggle'),
    profileMenuTrigger: document.getElementById('profile-menu-trigger'),
    profileMenu: document.getElementById('profile-menu'),
    timelineStart: document.getElementById('timeline-start'),
    timelineEnd: document.getElementById('timeline-end'),
    timelineRoot: document.getElementById('timeline'),
    timelineLabel: document.getElementById('timeline-range-label'),
    timelineCapsule: document.getElementById('timeline-range-capsule'),
    timelineModePointBtn: document.getElementById('timeline-mode-point'),
    timelineModeRangeBtn: document.getElementById('timeline-mode-range'),
    timelineActiveRange: document.getElementById('timeline-active-range'),
    timelineKnobStart: document.getElementById('timeline-knob-start'),
    timelineKnobEnd: document.getElementById('timeline-knob-end'),
    timelineAxis: document.getElementById('timeline-axis'),
    timelineTrackWrap: document.querySelector('#timeline .timeline-track-wrap'),
    cardsRibbon: document.getElementById('cards-ribbon') || document.getElementById('object-list'),
    cardsState: document.getElementById('cards-state'),
    detailPanel: document.getElementById('detail-panel'),
    detailPanelBody: document.getElementById('detail-panel-body'),
    detailPanelClose: document.getElementById('detail-panel-close'),
    dateFrom: document.getElementById('date-from'),
    dateTo: document.getElementById('date-to'),
    resultsSummary: document.getElementById('results-summary'),
    resultsCount: document.getElementById('results-count'),
    mapCount: document.getElementById('map-count'),
    sourceCount: document.getElementById('source-count'),
    pointValidCount: document.getElementById('point-valid-count'),
    activeFiltersCount: document.getElementById('active-filters-count'),
    statusMessage: document.getElementById('status-message'),
    onboardingOverlay: document.getElementById('onboarding-overlay'),
    onboardingDismissBtn: document.getElementById('onboarding-dismiss-btn')
  };

  const years = collectYearBounds(allFeatures);
  const confidenceValues = collectConfidenceValues(allFeatures);
  const telemetryMode = isDebugTelemetryMode();
  if (elements.resultsSummary) elements.resultsSummary.hidden = !telemetryMode;
  const state = {
    allFeatures,
    filteredFeatures: [],
    layerLookup,
    search: '',
    currentStartYear: years.min,
    currentEndYear: years.max,
    timelineMode: 'range',
    timelinePointYear: years.max,
    timelineRangeStart: years.min,
    timelineRangeEnd: years.max,
    loading: true,
    error: '',
    selectedFeatureId: null,
    hoveredFeatureId: null,
    enabledLayerIds: new Set(layers.filter((layer) => layer?.is_enabled !== false).map((layer) => String(layer.layer_id || layer.id || '').trim()).filter(Boolean)),
    defaultEnabledLayerIds: new Set(layers.filter((layer) => layer?.is_enabled !== false).map((layer) => String(layer.layer_id || layer.id || '').trim()).filter(Boolean)),
    quickLayerOptions: [],
    activeQuickLayerIds: new Set(),
    defaultQuickLayerIds: new Set(),
    confidenceFilter: 'all',
    overlay: { activePrimary: null, activeModal: null },
    viewport: { mode: 'desktop', isMobile: false, isTablet: false },
    detailSheetExpanded: false,
    detailViewMode: 'preview',
    detailOpenFeatureId: null,
    detailRenderFrameId: null,
    detailFocusReturnEl: null,
    searchResults: [],
    bookmarks: [],
    researchSlices: [],
    researchSlicesLoaded: false,
    researchSlicesLoading: false,
    researchSlicesError: '',
    applyState: null,
    warnings: [],
    lastVisibilityKey: '',
    lastRenderedCardsKey: '',
    lastRenderedTopPanelsKey: '',
    lastAppliedMapDataKey: '',
    lastRenderedSearchKey: '',
    filteredFeatureIds: [],
    displayMode: DEFAULT_DISPLAY_MODE,
    timeAggregation: {},
    courses: [],
    coursesLoaded: false,
    coursesLoading: false,
    coursesError: '',
    courseDraftStoryIds: [],
    currentCourse: null,
    currentCourseStepIndex: 0,
    courseProgress: loadCourseProgressState(),
    liveState: createLiveState(getRecentFeatures(18, { type: 'FeatureCollection', features: allFeatures })),
    liveError: '',
    sliceSelectionSet: new Set(),
    sliceCompareSelectionIds: [],
    sliceComparePanelOpen: false,
    sliceAnchorFeatureId: null,
    sliceOpenedId: '',
    sliceOpenedTitle: '',
    sliceOpenedAnnotationPlan: null,
    stories: [],
    storiesLoaded: false,
    storiesLoading: false,
    storiesError: '',
    storyDraftSliceIds: [],
    currentStory: null,
    currentStoryStepIndex: 0,
    storyModeEntrySnapshot: null,
    activeExploreSection: 'layers',
    researchContextBaselineKey: '',
    researchContextDirty: false,
    researchContextLastRenderedKey: ''
  };
  state.yearBounds = years;
  initializeAnimatedPanels(elements);
  const onboardingHint = setupOnboardingOverlay(elements);
  if (!state.enabledLayerIds.size) {
    allFeatures.forEach((feature) => {
      const layerId = String(normalizeProps(feature).layer_id || '').trim();
      if (layerId) state.enabledLayerIds.add(layerId);
    });
  }
  initializeQuickLayerState(state);

  hydrateTimeline(elements, years, state);
  setupOverlayManager(elements, state, map);
  setupLayerEntryHint(elements);
  setupResponsiveUi(elements, state, map);
  ensureDisplayModeToggle(elements);
  setupMapThemeToggle(elements, map);
  setupDisplayModeToggle(elements, state, map);
  setMapDisplayMode(map, state.displayMode);
  renderTopPanels(elements, state, layers, confidenceValues, map);
  renderQuickLayerFilter(elements, state);
  renderCardsState(elements, state);

  const applyState = () => {
    const visibilityKey = buildVisibilityKey(state);
    if (visibilityKey !== state.lastVisibilityKey) {
      const nextFilteredFeatures = [];
      const nextFilteredFeatureIds = [];
      for (const feature of state.allFeatures) {
        if (!isFeatureVisible(feature, state)) continue;
        nextFilteredFeatures.push(feature);
        nextFilteredFeatureIds.push(getFeatureUiId(feature));
      }
      state.filteredFeatures = nextFilteredFeatures;
      state.filteredFeatureIds = nextFilteredFeatureIds;
      state.timeAggregation = aggregateFeaturesByDecade(nextFilteredFeatures);
      state.lastVisibilityKey = visibilityKey;
    }

    const mapDataKey = buildMapDataKey(state);
    if (mapDataKey !== state.lastAppliedMapDataKey) {
      updateMapData(map, { type: 'FeatureCollection', features: state.filteredFeatures });
      state.lastAppliedMapDataKey = mapDataKey;
    }

    setMapLayerFilter(map, buildMapFilterExpression(state));
    const filteredIdsSet = new Set(state.filteredFeatureIds);
    const selectedFeature = getSelectedFeature(state);
    if (state.selectedFeatureId && (!filteredIdsSet.has(state.selectedFeatureId) || !isFeatureAllowedByQuickLayers(selectedFeature, state))) {
      clearSelection(state, elements, map);
    }
    const hoveredFeature = getFeatureById(state, state.hoveredFeatureId);
    if (state.hoveredFeatureId && (!filteredIdsSet.has(state.hoveredFeatureId) || !isFeatureAllowedByQuickLayers(hoveredFeature, state))) {
      clearHoveredFeature(state, map);
    }
    setSelectedFeatureId(map, state.selectedFeatureId);
    const searchResultsKey = `${state.search}::${visibilityKey}::${state.filteredFeatureIds.length}`;
    if (searchResultsKey !== state.lastRenderedSearchKey) {
      state.searchResults = buildSearchResults(state.filteredFeatures, state.search);
      state.lastRenderedSearchKey = searchResultsKey;
    }
    const emptyVisible = updateSearchNoResultsState(elements, state);
    onboardingHint?.syncVisibility?.({
      ready: !state.loading,
      loading: state.loading,
      hasError: Boolean(state.error),
      hasActiveSelection: Boolean(state.selectedFeatureId),
      emptyVisible
    });
    renderSearchDropdown(elements, state, map);
    renderTopPanels(elements, state, layers, confidenceValues, map, visibilityKey);
    updateFilterFeedback(elements, state);
    renderCards(elements, state, map);
    updateCounters(elements, state, map);
    updateResearchContextBar(elements, state);
    updateStatus(elements, state, map);
  };

  state.applyState = applyState;

  const debouncedSearch = debounce(() => {
    state.search = (elements.searchInput?.value || '').trim();
    toggleSearchClear(elements, state);
    applyState();
  }, 280);

  elements.searchInput?.addEventListener('input', debouncedSearch);
  elements.searchInput?.addEventListener('focus', () => {
    if (state.search) {
      openPrimaryPanel(elements, state, 'search', elements.searchInput);
      renderSearchDropdown(elements, state, map);
    }
  });
  elements.searchClearBtn?.addEventListener('click', () => {
    clearSearchState(elements, state, { closePanel: true, notify: true });
    applyState();
  });
  elements.searchNoResultsReset?.addEventListener('click', () => {
    clearSearchState(elements, state, { closePanel: false, notify: true });
    applyState();
  });
  setupSearchSuggestions(elements);
  toggleSearchClear(elements, state);

  elements.timelineStart?.addEventListener('input', () => {
    onboardingHint?.markInteracted?.();
    applyTimelineRange(elements, state, {
      start: Number(elements.timelineStart.value),
      end: state.timelineMode === 'point' ? Number(elements.timelineStart.value) : state.currentEndYear,
      snap: false,
      commit: true
    });
  });
  elements.timelineEnd?.addEventListener('input', () => {
    if (state.timelineMode === 'point') return;
    onboardingHint?.markInteracted?.();
    applyTimelineRange(elements, state, {
      start: state.currentStartYear,
      end: Number(elements.timelineEnd.value),
      snap: false,
      commit: true
    });
  });
  elements.timelineModePointBtn?.addEventListener('click', () => {
    onboardingHint?.markInteracted?.();
    setTimelineMode(elements, state, 'point', { commit: true });
  });
  elements.timelineModeRangeBtn?.addEventListener('click', () => {
    onboardingHint?.markInteracted?.();
    setTimelineMode(elements, state, 'range', { commit: true });
  });
  setupTimelinePointerInteractions(elements, state);

  elements.exploreWorkspaceTrigger?.addEventListener('click', () => {
    if (state.overlay.activePrimary === 'explore') {
      closePrimaryPanel(elements, state, 'explore');
      return;
    }
    openPrimaryPanel(elements, state, 'explore', elements.exploreWorkspaceTrigger);
    openExploreWorkspaceSection(elements, state, state.activeExploreSection || 'layers');
  });
  elements.layersBtn?.addEventListener('click', () => openExploreWorkspaceSection(elements, state, 'layers'));
  elements.filtersBtn?.addEventListener('click', () => openExploreWorkspaceSection(elements, state, 'filters'));
  elements.bookmarksBtn?.addEventListener('click', () => openExploreWorkspaceSection(elements, state, 'bookmarks'));
  elements.slicesBtn?.addEventListener('click', async () => {
    await openResearchSlicesWorkspace(elements, state, map);
  });
  elements.researchSliceOpenBtn?.addEventListener('click', async () => {
    await openResearchSlicesWorkspace(elements, state, map);
    showUiSystemMessage('Use the open slice context as a share baseline from the “Slices” panel.', { variant: 'info', timeout: 3000 });
  });
  elements.researchSliceSaveBtn?.addEventListener('click', async () => {
    await openResearchSlicesWorkspace(elements, state, map);
    showUiSystemMessage('Save the current slice from the “Slices” panel.', { variant: 'success', timeout: 3200 });
  });
  elements.researchSliceTrigger?.addEventListener('click', async () => {
    await openResearchSlicesWorkspace(elements, state, map);
  });
  elements.researchSliceCompareBtn?.addEventListener('click', async () => {
    const selectedCount = Array.isArray(state.sliceCompareSelectionIds) ? state.sliceCompareSelectionIds.length : 0;
    if (selectedCount < 2) {
      showUiSystemMessage('Выберите два среза в панели «Срезы», чтобы подготовить сравнение.', { variant: 'warning', timeout: 3200 });
      return;
    }
    state.sliceComparePanelOpen = true;
    await openResearchSlicesWorkspace(elements, state, map);
  });
  syncResearchSliceCompareCta(elements, state);
  elements.coursesBtn?.addEventListener('click', async () => {
    await ensureStoriesLoaded(state, { force: !state.storiesLoaded });
    await ensureCoursesLoaded(state, { force: !state.coursesLoaded });
    renderCoursesPanel(elements, state, map);
    togglePrimaryPanel(elements, state, 'courses', elements.coursesBtn);
  });
  elements.liveBtn?.addEventListener('click', () => {
    const nextOpen = state.overlay.activePrimary !== 'live';
    state.liveState.isLiveMode = nextOpen;
    togglePrimaryPanel(elements, state, 'live', elements.liveBtn);
  });
  elements.overflowBtn?.addEventListener('click', () => {
    if (!elements.topActions) return;
    if (state.overlay.activePrimary) closePrimaryPanel(elements, state, state.overlay.activePrimary);
    setProfileMenuOpen(elements, false);
    const expanded = elements.topActions.classList.toggle('is-expanded');
    elements.overflowBtn.setAttribute('aria-expanded', String(expanded));
  });
  elements.profileMenuTrigger?.addEventListener('click', () => {
    const nextOpen = elements.profileMenu?.hidden !== false;
    if (state.overlay.activePrimary) closePrimaryPanel(elements, state, state.overlay.activePrimary);
    setProfileMenuOpen(elements, nextOpen, {
      focusFirstItem: nextOpen && document.activeElement === elements.profileMenuTrigger
    });
  });
  elements.profileMenu?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    setProfileMenuOpen(elements, false, { returnFocus: true });
  });

  const featureClickHandler = (feature, coordinates) => {
    onboardingHint?.markInteracted?.();
    selectFeature(state, elements, map, feature, {
      coordinates,
      openDetail: true,
      scrollCard: true
    });
  };
  setMapFeatureClickHandler(map, featureClickHandler);
  setMapFeatureHoverHandler(map, (featureId) => {
    if (featureId) {
      setHoveredFeature(state, map, featureId);
    } else {
      clearHoveredFeature(state, map);
    }
    syncMapHoveredCardState(elements, state.hoveredFeatureId);
  });
  elements.detailPanelClose?.addEventListener('click', () => closeDetailView(state, elements));
  document.getElementById('detail-panel-expand')?.addEventListener('click', () => toggleDetailSheetState(state, elements));
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (elements.topActions?.classList.contains('is-expanded')) {
      const inTopActions = elements.topActions.contains(target) || elements.overflowBtn?.contains(target);
      if (!inTopActions) {
        elements.topActions.classList.remove('is-expanded');
        elements.overflowBtn?.setAttribute('aria-expanded', 'false');
      }
    }
    if (state.overlay.activePrimary) {
      const panel = getPanelByKey(elements, state.overlay.activePrimary);
      const button = getButtonByKey(elements, state.overlay.activePrimary);
      const inSearchShell = elements.searchDropdown?.contains(target) || elements.searchInput?.contains(target) || elements.searchClearBtn?.contains(target);
      const inPanel = panel?.contains(target) || button?.contains(target) || (state.overlay.activePrimary === 'search' && inSearchShell);
      if (!inPanel) closePrimaryPanel(elements, state, state.overlay.activePrimary);
    }
    if (elements.profileMenu && !elements.profileMenu.hidden) {
      const inProfileMenu = elements.profileMenu.contains(target) || elements.profileMenuTrigger?.contains(target);
      if (!inProfileMenu) setProfileMenuOpen(elements, false);
    }
    if (elements.detailPanel?.hidden) return;
    const mapContainer = typeof map?.getContainer === 'function' ? map.getContainer() : null;
    const withinMap = Boolean(mapContainer && target instanceof Node && mapContainer.contains(target));
    if (withinMap) return;
    const withinFloating = elements.detailPanel.contains(target);
    const withinCard = target.closest?.('.ribbon-card');
    if (!withinFloating && !withinCard) return;
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    if (event.key !== 'Escape') return;
    if (state.sliceComparePanelOpen) {
      state.sliceComparePanelOpen = false;
      if (state.activeExploreSection === 'slices') renderSlicesPanel(elements, state, map);
      event.preventDefault();
      return;
    }
    if (!elements.profileMenu?.hidden) {
      setProfileMenuOpen(elements, false, { returnFocus: true });
      event.preventDefault();
      return;
    }
    const hadOpenDetail = !elements.detailPanel?.hidden;
    const closed = closeTopOverlay(elements, state, map);
    if (closed) {
      event.preventDefault();
      if (!hadOpenDetail) restoreOverlayFocus(state.overlay.lastPrimaryTrigger, elements);
    }
  });

  state.loading = false;
  applyState();
  applyResponsiveLayout(elements, state, map);

  return {
    getVisibleCounts() {
      return { listCount: state.filteredFeatures.length, mapCount: getMapFeatureCount(map) };
    }
  };
}

function setupOnboardingOverlay(elements) {
  const overlay = elements?.onboardingOverlay;
  const dismissBtn = elements?.onboardingDismissBtn;
  if (!overlay || !dismissBtn) return { markInteracted: () => {} };

  let dismissed = false;
  const persistDismissed = () => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      window.sessionStorage.setItem(ONBOARDING_HINT_SESSION_KEY, '1');
    } catch (_error) {
      // Ignore storage failures to avoid breaking onboarding.
    }
  };
  const closeOverlay = ({ persist = false } = {}) => {
    if (dismissed) return;
    dismissed = true;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    if (persist) persistDismissed();
  };
  const isDismissedInSession = (() => {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;
    try {
      return window.sessionStorage.getItem(ONBOARDING_HINT_SESSION_KEY) === '1';
    } catch (_error) {
      return false;
    }
  })();

  if (isDismissedInSession) closeOverlay();
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  dismissBtn.addEventListener('click', () => closeOverlay({ persist: true }));
  return {
    markInteracted: () => closeOverlay({ persist: true }),
    syncVisibility: ({
      ready = false,
      loading = false,
      hasError = false,
      hasActiveSelection = false,
      emptyVisible = false
    } = {}) => {
      if (dismissed || isDismissedInSession) return;
      const shouldShow = ready && !loading && !hasError && !hasActiveSelection && !emptyVisible;
      overlay.hidden = !shouldShow;
      overlay.setAttribute('aria-hidden', String(!shouldShow));
    }
  };
}

function setProfileMenuOpen(elements, nextOpen = false, { returnFocus = false, focusFirstItem = false } = {}) {
  if (!elements?.profileMenu || !elements?.profileMenuTrigger) return;
  elements.profileMenu.hidden = !nextOpen;
  elements.profileMenu.classList.toggle('is-open', nextOpen);
  elements.profileMenu.setAttribute('aria-hidden', String(!nextOpen));
  elements.profileMenuTrigger.setAttribute('aria-expanded', String(Boolean(nextOpen)));
  if (nextOpen && focusFirstItem) {
    const firstItem = elements.profileMenu.querySelector('.profile-menu-item');
    firstItem?.focus?.({ preventScroll: true });
  }
  if (!nextOpen && returnFocus) {
    elements.profileMenuTrigger.focus({ preventScroll: true });
  }
}

function ensureDisplayModeToggle(elements) {
  if (elements.displayModeToggle) return;
  const host = elements.topActions || document.getElementById('top-header');
  if (!host) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'display-mode-toggle';
  button.className = 'ghost-btn';
  button.setAttribute('aria-pressed', 'false');
  host.appendChild(button);
  elements.displayModeToggle = button;
}

function setupDisplayModeToggle(elements, state, map) {
  const button = elements.displayModeToggle;
  if (!button) return;
  const syncLabel = () => {
    const isHeatmap = state.displayMode === 'heatmap';
    button.textContent = isHeatmap ? 'Тепловая' : 'Точки';
    button.setAttribute('aria-pressed', String(isHeatmap));
    button.setAttribute('aria-label', isHeatmap ? 'Переключить на точки' : 'Переключить на тепловую карту');
  };
  syncLabel();
  button.addEventListener('click', () => {
    state.displayMode = state.displayMode === 'points' ? 'heatmap' : 'points';
    setMapDisplayMode(map, state.displayMode);
    syncLabel();
    showUiSystemMessage(state.displayMode === 'heatmap' ? 'Включён режим тепловой карты' : 'Включён режим точек', {
      variant: 'success',
      timeout: 1600
    });
  });
}

function setupMapThemeToggle(elements, map) {
  const button = elements.mapThemeToggle;
  if (!button) return;
  const themes = getMapThemeOptions();
  if (!themes.length) return;
  const syncLabel = () => {
    const activeTheme = getMapTheme(map);
    const activeMeta = themes.find((theme) => theme.id === activeTheme) || themes[0];
    button.textContent = activeMeta.label;
    button.setAttribute('aria-label', `Тема карты: ${activeMeta.label}. Нажмите для смены.`);
    button.dataset.theme = activeMeta.id;
  };
  syncLabel();

  button.addEventListener('click', () => {
    const activeTheme = getMapTheme(map);
    const currentIndex = themes.findIndex((theme) => theme.id === activeTheme);
    const nextTheme = themes[(currentIndex + 1 + themes.length) % themes.length];
    const appliedTheme = setMapTheme(map, nextTheme.id);
    syncLabel();
    const appliedMeta = themes.find((theme) => theme.id === appliedTheme) || nextTheme;
    showUiSystemMessage(`Тема карты: ${appliedMeta.label}`, { variant: 'success', timeout: 1700 });
  });
}

function isFeatureVisible(feature, state) {
  const props = normalizeProps(feature);
  const text = state.search.toLowerCase();
  const layerId = String(props.layer_id || '').trim();
  if (layerId && !state.enabledLayerIds.has(layerId)) return false;
  if (!isFeatureAllowedByQuickLayers(feature, state)) return false;
  if (state.confidenceFilter !== 'all') {
    const confidence = String(props.coordinates_confidence || 'unknown').toLowerCase();
    if (confidence !== state.confidenceFilter) return false;
  }
  const haystack = `${String(props.name_ru || '')} ${String(props.name_en || '')} ${normalizeTags(props.tags)} ${String(props.title_short || '')}`.toLowerCase();
  if (text && !haystack.includes(text)) return false;

  const start = parseYear(props.date_start ?? props.date_construction_end ?? props.date_end);
  const end = parseYear(props.date_end ?? props.date_construction_end ?? props.date_start);
  if (Number.isFinite(start) && start > state.currentEndYear) return false;
  if (Number.isFinite(end) && end < state.currentStartYear) return false;
  return true;
}

function renderTopPanels(elements, state, layers, confidenceValues, map, visibilityKey = '') {
  const panelKey = `${visibilityKey}::${state.confidenceFilter}::${state.enabledLayerIds.size}`;
  if (state.lastRenderedTopPanelsKey === panelKey) return;
  state.lastRenderedTopPanelsKey = panelKey;
  renderFiltersPanel(elements, state, layers, confidenceValues);
  renderLayersPanel(elements, state, layers);
  renderBookmarksPanel(elements, state, map);
  renderSlicesPanel(elements, state, map);
  renderCoursesPanel(elements, state, map);
  renderLivePanel(elements, state, map);
}

function renderFiltersPanel(elements, state, layers, confidenceValues) {
  if (!elements.filtersPanel) return;
  const activeCount = state.filteredFeatures.length;
  const totalCount = state.allFeatures.length;
  elements.filtersPanel.replaceChildren();

  const title = document.createElement('h3');
  title.className = 'panel-title';
  title.textContent = 'Фильтры';
  const summary = document.createElement('p');
  summary.className = 'status-summary';
  summary.textContent = `Активно: ${activeCount} из ${totalCount} объектов видно`;
  const filterSummary = document.createElement('div');
  filterSummary.className = 'panel-action-row';
  const activeFiltersBadge = document.createElement('span');
  activeFiltersBadge.className = 'ui-badge';
  const activeFiltersTotal = getActiveFiltersCount(state);
  activeFiltersBadge.textContent = activeFiltersTotal ? `Активно: ${activeFiltersTotal}` : 'Нет активных ограничений';
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'ui-button ui-button-secondary';
  resetBtn.textContent = 'Сбросить';
  resetBtn.disabled = activeFiltersTotal === 0;
  resetBtn.addEventListener('click', () => {
    resetExploreConstraints(elements, state);
    state.applyState?.();
    showUiSystemMessage('Фильтры сброшены', { variant: 'success', timeout: 2200 });
  });
  filterSummary.append(activeFiltersBadge, resetBtn);

  const layerWrap = document.createElement('div');
  layerWrap.className = 'chips';
  (layers || []).slice(0, 14).forEach((layer) => {
    const id = String(layer?.layer_id || layer?.id || '').trim();
    if (!id) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${state.enabledLayerIds.has(id) ? ' is-active' : ''}`;
    chip.textContent = String(layer?.name_ru || id);
    chip.addEventListener('click', () => {
      if (state.enabledLayerIds.has(id)) state.enabledLayerIds.delete(id);
      else state.enabledLayerIds.add(id);
      state.applyState?.();
    });
    layerWrap.appendChild(chip);
  });

  elements.filtersPanel.append(title, summary, filterSummary, layerWrap);
  if (confidenceValues.length) {
    const group = document.createElement('div');
    group.className = 'chips';
    ['all', ...confidenceValues].forEach((mode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chip${state.confidenceFilter === mode ? ' is-active' : ''}`;
      button.textContent = mode[0].toUpperCase() + mode.slice(1);
      button.addEventListener('click', () => {
        state.confidenceFilter = mode;
        state.applyState?.();
      });
      group.appendChild(button);
    });
    elements.filtersPanel.appendChild(group);
  }
}

function renderLayersPanel(elements, state, layers) {
  if (!elements.layersPanel) return;
  elements.layersPanel.replaceChildren();
  const title = document.createElement('h3');
  title.className = 'panel-title';
  title.textContent = 'Слои';
  const layersChanged = hasLayerCustomization(state);
  const info = document.createElement('p');
  info.className = 'status-summary';
  info.textContent = layersChanged
    ? 'Видимость слоёв изменена'
    : 'Видимость слоёв по умолчанию';
  const restoreBtn = document.createElement('button');
  restoreBtn.type = 'button';
  restoreBtn.className = 'ui-button ui-button-secondary';
  restoreBtn.textContent = 'По умолчанию';
  restoreBtn.disabled = !layersChanged;
  restoreBtn.addEventListener('click', () => {
    restoreDefaultLayers(state);
    state.applyState?.();
    showUiSystemMessage('Слои восстановлены по умолчанию', { variant: 'success', timeout: 2200 });
  });
  const actionRow = document.createElement('div');
  actionRow.className = 'layers-panel-toolbar';
  actionRow.append(info, restoreBtn);
  elements.layersPanel.append(title, actionRow);

  const architectureLayers = [];
  const otherLayers = [];
  (layers || []).forEach((layer) => {
    if (isArchitectureStyleLayer(layer)) architectureLayers.push(layer);
    else otherLayers.push(layer);
  });

  if (architectureLayers.length) {
    elements.layersPanel.appendChild(createLayerGroup('Архитектура', architectureLayers, state, {
      collapsible: true,
      open: true,
      description: 'Стилевые и исторические архитектурные слои'
    }));
  }
  if (otherLayers.length) {
    const fallbackTitle = architectureLayers.length ? 'Другие слои' : 'Слои';
    elements.layersPanel.appendChild(createLayerGroup(fallbackTitle, otherLayers, state));
  }
}

function createLayerGroup(title, layers, state, options = {}) {
  const {
    collapsible = false,
    open = true,
    description = ''
  } = options;
  const group = document.createElement('section');
  group.className = 'layer-group';
  const list = document.createElement('div');
  list.className = 'layer-group-list';

  const titleText = String(title || 'Слои');
  if (collapsible) {
    group.classList.add('layer-group-collapsible');
    const details = document.createElement('details');
    details.className = 'layer-group-disclosure';
    details.open = open;
    const summary = document.createElement('summary');
    summary.className = 'layer-group-summary';

    const heading = document.createElement('span');
    heading.className = 'layer-group-title';
    heading.textContent = titleText;
    const count = document.createElement('span');
    count.className = 'layer-group-count';
    count.textContent = String(layers?.length || 0);
    summary.append(heading, count);
    details.append(summary, list);
    if (description) {
      const subtitle = document.createElement('p');
      subtitle.className = 'layer-group-description';
      subtitle.textContent = description;
      details.insertBefore(subtitle, list);
    }
    group.appendChild(details);
  } else {
    const heading = document.createElement('h4');
    heading.className = 'layer-group-title';
    heading.textContent = titleText;
    group.appendChild(heading);
    if (description) {
      const subtitle = document.createElement('p');
      subtitle.className = 'layer-group-description';
      subtitle.textContent = description;
      group.appendChild(subtitle);
    }
    group.appendChild(list);
  }

  (layers || []).forEach((layer) => {
    const row = createLayerToggleRow(layer, state);
    if (row) list.appendChild(row);
  });
  return group;
}

function createLayerToggleRow(layer, state) {
  const id = String(layer?.layer_id || layer?.id || '').trim();
  if (!id) return null;
  const row = document.createElement('label');
  row.className = 'layer-item';

  const left = document.createElement('span');
  const dot = document.createElement('span');
  dot.className = 'layer-dot';
  dot.style.backgroundColor = String(layer?.color_hex || '#94a3b8');
  const label = document.createElement('span');
  label.textContent = String(layer?.name_ru || id);
  left.append(dot, document.createTextNode(' '), label);

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = state.enabledLayerIds.has(id);
  toggle.addEventListener('change', () => {
    if (toggle.checked) state.enabledLayerIds.add(id);
    else state.enabledLayerIds.delete(id);
    state.applyState?.();
  });

  row.append(left, toggle);
  return row;
}

function isArchitectureStyleLayer(layer) {
  const id = String(layer?.layer_id || layer?.id || '').trim().toLowerCase();
  const labelRu = String(layer?.name_ru || '').trim().toLowerCase();
  const labelEn = String(layer?.name_en || layer?.label || '').trim().toLowerCase();
  const source = `${id} ${labelRu} ${labelEn}`;
  return /(архит|architecture|baroque|gothic|rococo|renaissance|brutalism|modernism|neoclassicism|deconstructivism|romanesque|victorian|byzantine|islamic|etruscan|minoan|neolithic|mesopotam|egypt|greece|art[_\s-]?deco|art[_\s-]?nouveau|high[_\s-]?tech)/i.test(source);
}

function renderBookmarksPanel(elements, state, map) {
  if (!elements.bookmarksPanel) return;
  elements.bookmarksPanel.replaceChildren();

  const title = document.createElement('h3');
  title.className = 'panel-title';
  title.textContent = 'Закладки';
  elements.bookmarksPanel.appendChild(title);

  const selected = getSelectedFeature(state);
  if (selected) {
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Сохранить закладку';
    saveBtn.addEventListener('click', () => {
      const id = getFeatureUiId(selected);
      if (state.bookmarks.some((bookmark) => bookmark.id === id)) return;
      state.bookmarks.unshift({ id, feature: selected });
      renderBookmarksPanel(elements, state, map);
    });
    elements.bookmarksPanel.appendChild(saveBtn);
  }

  if (!state.bookmarks.length) {
    const empty = document.createElement('p');
    empty.className = 'bookmark-empty';
    empty.textContent = 'Закладки появятся здесь';
    elements.bookmarksPanel.appendChild(empty);
    return;
  }

  state.bookmarks.slice(0, 20).forEach((bookmark) => {
    const props = normalizeProps(bookmark.feature);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'bookmark-item';
    const title = document.createElement('span');
    title.textContent = String(props.name_ru || props.title_short || 'Без названия');
    const meta = document.createElement('span');
    meta.className = 'bookmark-meta';
    meta.textContent = formatRange(props.date_start, props.date_end);
    item.append(title, meta);
    item.addEventListener('click', () => {
      selectFeature(state, elements, map, bookmark.feature, { centerOnMap: true, openDetail: true, scrollCard: true });
      closePrimaryPanel(elements, state, 'bookmarks');
    });
    elements.bookmarksPanel.appendChild(item);
  });
}

async function ensureResearchSlicesLoaded(state, { force = false } = {}) {
  if (state.researchSlicesLoading) return;
  if (state.researchSlicesLoaded && !force) return;
  state.researchSlicesLoading = true;
  state.researchSlicesError = '';
  try {
    const items = await listResearchSlices();
    state.researchSlices = Array.isArray(items) ? items : [];
    state.researchSlicesLoaded = true;
  } catch (error) {
    state.researchSlicesError = normalizeAppError(error, 'Не удалось загрузить исследовательские срезы.').message;
  } finally {
    state.researchSlicesLoading = false;
  }
}

async function openResearchSlicesWorkspace(elements, state, map, options = {}) {
  await ensureResearchSlicesLoaded(state, options);
  await ensureStoriesLoaded(state, options);
  await ensureCoursesLoaded(state, options);
  renderSlicesPanel(elements, state, map);
  openExploreWorkspaceSection(elements, state, 'slices');
}

async function ensureStoriesLoaded(state, { force = false } = {}) {
  if (state.storiesLoading) return;
  if (state.storiesLoaded && !force) return;
  state.storiesLoading = true;
  state.storiesError = '';
  try {
    const items = await listStories();
    state.stories = Array.isArray(items) ? items : [];
    state.storiesLoaded = true;
  } catch (error) {
    state.storiesError = normalizeAppError(error, 'Не удалось загрузить stories.').message;
  } finally {
    state.storiesLoading = false;
  }
}

function syncResearchSliceCompareCta(elements, state) {
  if (!elements?.researchSliceCompareBtn) return;
  const selectedCount = Array.isArray(state?.sliceCompareSelectionIds) ? state.sliceCompareSelectionIds.length : 0;
  const isReady = selectedCount === 2;
  elements.researchSliceCompareBtn.disabled = !isReady;
  elements.researchSliceCompareBtn.setAttribute('aria-disabled', String(!isReady));
  elements.researchSliceCompareBtn.title = isReady
    ? 'Сравнить выбранные 2 среза'
    : 'Выберите 2 среза в панели «Срезы»';
}

function collectStorySliceIds(story) {
  const ids = [];
  const directIds = Array.isArray(story?.slice_ids) ? story.slice_ids : (Array.isArray(story?.sliceIds) ? story.sliceIds : []);
  directIds.forEach((sliceId) => {
    const normalized = String(sliceId || '').trim();
    if (normalized) ids.push(normalized);
  });
  return [...new Set(ids)];
}

function getStoryStepRecord(story, index) {
  if (!story || typeof story !== 'object') return null;
  const clampedIndex = clampStoryStepIndex(story, index);
  const currentSliceId = String(resolveStoryStepSliceId(story, clampedIndex) || '').trim();
  const candidateCollections = [
    story?.steps,
    story?.story_steps,
    story?.step_items,
    story?.step_contexts,
    story?.stepContexts
  ];
  for (const collection of candidateCollections) {
    if (!Array.isArray(collection) || !collection.length) continue;
    const indexed = collection[clampedIndex];
    if (indexed && typeof indexed === 'object' && !Array.isArray(indexed)) return indexed;
    if (!currentSliceId) continue;
    const matched = collection.find((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      const itemSliceId = String(item?.slice_id || item?.sliceId || item?.id || '').trim();
      return Boolean(itemSliceId) && itemSliceId === currentSliceId;
    });
    if (matched) return matched;
  }
  return null;
}

function resolveStoryStepNarrative(story, index) {
  const stepRecord = getStoryStepRecord(story, index);
  if (!stepRecord) return { stepTitle: '', stepNarrative: '' };

  const extractFirstText = (source, keys) => {
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const value = String(source[key] || '').trim();
      if (value) return value;
    }
    return '';
  };

  return {
    stepTitle: extractFirstText(stepRecord, ['title', 'label']),
    stepNarrative: extractFirstText(stepRecord, ['text', 'note', 'context', 'description', 'summary'])
  };
}

function resolveStoryStepStateLabel(step, total) {
  const current = Number(step);
  const stepsTotal = Number(total);
  if (!Number.isFinite(current) || !Number.isFinite(stepsTotal) || stepsTotal <= 1) return 'Единственный шаг';
  if (current <= 1) return 'Начало истории';
  if (current >= stepsTotal) return 'Финальный шаг';
  return 'Шаг в процессе';
}

function collectCourseStoryIds(course) {
  const ids = [];
  const directIds = Array.isArray(course?.story_ids) ? course.story_ids : (Array.isArray(course?.storyIds) ? course.storyIds : []);
  directIds.forEach((storyId) => {
    const normalized = String(storyId || '').trim();
    if (normalized) ids.push(normalized);
  });
  return [...new Set(ids)];
}

function buildSliceNarrativeUsageLookup(state) {
  const storyIdsBySliceId = new Map();
  const sliceIdsByStoryId = new Map();
  const stories = Array.isArray(state?.stories) ? state.stories : [];
  stories.forEach((story) => {
    const storyId = String(story?.id || '').trim();
    if (!storyId) return;
    const sliceIds = collectStorySliceIds(story);
    sliceIdsByStoryId.set(storyId, new Set(sliceIds));
    sliceIds.forEach((sliceId) => {
      const set = storyIdsBySliceId.get(sliceId) || new Set();
      set.add(storyId);
      storyIdsBySliceId.set(sliceId, set);
    });
  });

  const courseIdsBySliceId = new Map();
  const courses = Array.isArray(state?.courses) ? state.courses : [];
  courses.forEach((course) => {
    const courseId = String(course?.id || '').trim();
    if (!courseId) return;
    const storyIds = collectCourseStoryIds(course);
    const usedSliceIds = new Set();
    storyIds.forEach((storyId) => {
      const storySliceIds = sliceIdsByStoryId.get(storyId);
      if (!storySliceIds) return;
      storySliceIds.forEach((sliceId) => usedSliceIds.add(sliceId));
    });
    usedSliceIds.forEach((sliceId) => {
      const set = courseIdsBySliceId.get(sliceId) || new Set();
      set.add(courseId);
      courseIdsBySliceId.set(sliceId, set);
    });
  });

  return { storyIdsBySliceId, courseIdsBySliceId };
}

function renderSlicesPanel(elements, state, map) {
  const panel = elements.slicesPanel;
  if (!panel) return;
  syncResearchSliceCompareCta(elements, state);
  panel.replaceChildren();

  const title = document.createElement('h3');
  title.className = 'panel-title';
  title.textContent = 'Срезы';
  panel.appendChild(title);

  const saveSection = document.createElement('section');
  saveSection.className = 'panel-stack slice-workzone';
  const saveSectionTitle = document.createElement('h4');
  saveSectionTitle.className = 'panel-title';
  saveSectionTitle.textContent = 'Сохранить текущий срез';
  const saveSectionHelper = document.createElement('p');
  saveSectionHelper.className = 'status-summary slice-zone-helper';
  saveSectionHelper.textContent = 'Будут сохранены период, активные слои, выбранные объекты и текущее состояние карты.';
  saveSection.append(saveSectionTitle, saveSectionHelper);

  const getCurrentSelectedContext = () => {
    const selected = getSelectedFeature(state);
    return {
      selected,
      selectedId: selected ? getFeatureUiId(selected) : null
    };
  };
  const getSelectionSetIds = () => [...new Set(Array.from(state.sliceSelectionSet || []).map((id) => String(id || '').trim()).filter(Boolean))];
  const addCurrentSelectionToSet = () => {
    const { selectedId } = getCurrentSelectedContext();
    if (!selectedId) return false;
    if (!(state.sliceSelectionSet instanceof Set)) state.sliceSelectionSet = new Set();
    const before = state.sliceSelectionSet.size;
    state.sliceSelectionSet.add(selectedId);
    return state.sliceSelectionSet.size > before;
  };
  const removeCurrentSelectionFromSet = () => {
    const { selectedId } = getCurrentSelectedContext();
    if (!selectedId || !(state.sliceSelectionSet instanceof Set)) return false;
    return state.sliceSelectionSet.delete(selectedId);
  };
  const getSaveFeatureIds = () => {
    const ids = getSelectionSetIds();
    if (ids.length) return ids;
    const { selectedId } = getCurrentSelectedContext();
    return selectedId ? [selectedId] : [];
  };

  const form = document.createElement('form');
  form.className = 'panel-stack';
  form.noValidate = true;

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.name = 'slice_title';
  titleInput.maxLength = 180;
  titleInput.placeholder = 'Название среза';
  titleInput.required = true;

  const descInput = document.createElement('textarea');
  descInput.name = 'slice_description';
  descInput.maxLength = 4000;
  descInput.rows = 3;
  descInput.placeholder = 'Краткое описание (опционально)';

  const annotationsSection = document.createElement('section');
  annotationsSection.className = 'panel-stack';
  const annotationsTitle = document.createElement('p');
  annotationsTitle.className = 'status-summary';
  annotationsTitle.textContent = 'Аннотации (опционально)';

  const factInput = document.createElement('textarea');
  factInput.name = 'slice_annotation_fact';
  factInput.maxLength = 4000;
  factInput.rows = 2;
  factInput.placeholder = 'Факт';

  const interpretationInput = document.createElement('textarea');
  interpretationInput.name = 'slice_annotation_interpretation';
  interpretationInput.maxLength = 4000;
  interpretationInput.rows = 2;
  interpretationInput.placeholder = 'Интерпретация';

  const hypothesisInput = document.createElement('textarea');
  hypothesisInput.name = 'slice_annotation_hypothesis';
  hypothesisInput.maxLength = 4000;
  hypothesisInput.rows = 2;
  hypothesisInput.placeholder = 'Гипотеза';

  annotationsSection.append(annotationsTitle, factInput, interpretationInput, hypothesisInput);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'ui-button ui-button-primary';
  saveBtn.textContent = 'Сохранить срез';
  saveBtn.disabled = !getSaveFeatureIds().length || state.researchSlicesLoading;

  const selectionActions = document.createElement('div');
  selectionActions.className = 'panel-action-row';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'ui-button ui-button-secondary';
  addBtn.textContent = 'Добавить в срез';
  const currentSelectedForAdd = getCurrentSelectedContext().selectedId;
  addBtn.disabled = !currentSelectedForAdd || getSelectionSetIds().includes(currentSelectedForAdd);
  addBtn.addEventListener('click', () => {
    if (addCurrentSelectionToSet()) {
      renderSlicesPanel(elements, state, map);
    }
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'ui-button ui-button-secondary';
  removeBtn.textContent = 'Убрать из среза';
  const currentSelectedForRemove = getCurrentSelectedContext().selectedId;
  removeBtn.disabled = !currentSelectedForRemove || !getSelectionSetIds().includes(currentSelectedForRemove);
  removeBtn.addEventListener('click', () => {
    if (removeCurrentSelectionFromSet()) {
      renderSlicesPanel(elements, state, map);
    }
  });

  const clearSelectionBtn = document.createElement('button');
  clearSelectionBtn.type = 'button';
  clearSelectionBtn.className = 'ui-button ui-button-secondary';
  clearSelectionBtn.textContent = 'Очистить выборку среза';
  clearSelectionBtn.disabled = !getSelectionSetIds().length;
  clearSelectionBtn.addEventListener('click', () => {
    if (!(state.sliceSelectionSet instanceof Set) || !state.sliceSelectionSet.size) return;
    state.sliceSelectionSet.clear();
    renderSlicesPanel(elements, state, map);
  });

  selectionActions.append(addBtn, removeBtn, clearSelectionBtn);

  const hint = document.createElement('p');
  hint.className = 'status-summary';
  const { selected, selectedId } = getCurrentSelectedContext();
  const selectionCount = getSaveFeatureIds().length;
  hint.textContent = selectedId
    ? `Выбрано для среза: ${selectionCount}. Текущий объект: ${String(normalizeProps(selected).name_ru || normalizeProps(selected).title_short || selectedId)}`
    : (selectionCount
      ? `Выбрано для среза: ${selectionCount}.`
      : 'Чтобы сохранить первый срез, выберите объект на карте или добавьте его в выборку.');

  form.append(titleInput, descInput, annotationsSection, selectionActions, saveBtn, hint);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveFeatureIds = getSaveFeatureIds();
    if (!saveFeatureIds.length) {
      showUiSystemMessage('Выберите объект на карте перед сохранением среза.', { variant: 'warning', timeout: 2500 });
      return;
    }
    const { selectedId: primarySelectedId } = getCurrentSelectedContext();

    try {
      const payload = buildResearchSlicePayload({
        title: titleInput.value,
        description: descInput.value,
        selectedFeatureId: primarySelectedId || saveFeatureIds[0],
        selectedFeatureIds: saveFeatureIds,
        annotationInputs: {
          fact: factInput.value,
          interpretation: interpretationInput.value,
          hypothesis: hypothesisInput.value
        },
        timeRange: {
          start: state.currentStartYear,
          end: state.currentEndYear,
          mode: state.timelineMode
        },
        map,
        enabledLayerIds: Array.from(state.enabledLayerIds || []),
        activeQuickLayerIds: Array.from(state.activeQuickLayerIds || [])
      });
      const createdSlice = await createResearchSlice(payload);
      const createdSliceId = String(createdSlice?.id || '').trim();
      titleInput.value = '';
      descInput.value = '';
      factInput.value = '';
      interpretationInput.value = '';
      hypothesisInput.value = '';
      if (state.sliceSelectionSet instanceof Set) state.sliceSelectionSet.clear();
      state.sliceOpenedId = createdSliceId || '';
      state.sliceOpenedTitle = String(payload?.title || '').trim();
      markResearchContextAsSaved(state);
      updateResearchContextBar(elements, state);
      showUiSystemMessage('Срез сохранён', { variant: 'success', timeout: 2200 });
      await ensureResearchSlicesLoaded(state, { force: true });
      renderSlicesPanel(elements, state, map);
    } catch (error) {
      showUiSystemMessage(normalizeAppError(error, 'Не удалось сохранить срез.').message, { variant: 'warning', timeout: 3200 });
    }
  });
  saveSection.appendChild(form);
  panel.appendChild(saveSection);

  if (state.sliceOpenedAnnotationPlan && Number(state.sliceOpenedAnnotationPlan.count) > 0) {
    const openedBlock = document.createElement('section');
    openedBlock.className = 'panel-stack slice-workzone';

    if (state.sliceOpenedTitle) {
      const openedTitle = document.createElement('p');
      openedTitle.className = 'status-summary';
      openedTitle.textContent = `Открытый срез: ${state.sliceOpenedTitle}`;
      openedBlock.appendChild(openedTitle);
    }

    const details = document.createElement('details');
    details.className = 'panel-stack';
    details.open = false;

    const summary = document.createElement('summary');
    summary.textContent = `Аннотации (${state.sliceOpenedAnnotationPlan.count})`;
    details.appendChild(summary);

    state.sliceOpenedAnnotationPlan.groups.forEach((group) => {
      const groupTitle = document.createElement('p');
      groupTitle.className = 'status-summary';
      groupTitle.textContent = group.label;
      details.appendChild(groupTitle);

      const groupList = document.createElement('ul');
      group.items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = truncateText(String(item?.text || ''), 220);
        groupList.appendChild(li);
      });
      details.appendChild(groupList);
    });

    openedBlock.appendChild(details);
    saveSection.appendChild(openedBlock);
  }

  const savedSection = document.createElement('section');
  savedSection.className = 'panel-stack slice-workzone';
  const savedSectionTitle = document.createElement('h4');
  savedSectionTitle.className = 'panel-title';
  savedSectionTitle.textContent = 'Сохранённые срезы';
  savedSection.appendChild(savedSectionTitle);

  if (state.researchSlicesLoading) {
    state.sliceComparePanelOpen = false;
    savedSection.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Загрузка срезов',
      message: 'Загрузка списка срезов…'
    }));
  } else if (state.researchSlicesError) {
    state.sliceComparePanelOpen = false;
    savedSection.appendChild(createInlineStateBlock({
      variant: 'warning',
      title: 'Срезы недоступны',
      message: state.researchSlicesError
    }));
  } else if (!Array.isArray(state.researchSlices) || !state.researchSlices.length) {
    state.sliceCompareSelectionIds = [];
    state.sliceComparePanelOpen = false;
    syncResearchSliceCompareCta(elements, state);
    savedSection.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Срезов пока нет',
      message: 'Настройте карту, выберите объекты и сохраните первый срез — он появится в этом списке.'
    }));
  } else {
    const openedSliceId = String(state.sliceOpenedId || '').trim();
    const narrativeUsage = buildSliceNarrativeUsageLookup(state);
    const availableSliceById = new Map(
      state.researchSlices
        .map((slice) => [String(slice?.id || '').trim(), slice])
        .filter(([id]) => id)
    );
    const restoreSliceFromEntry = async (slice) => {
      try {
        const rawSlice = await getResearchSlice(String(slice?.id || ''));
        applyResearchSliceContext(rawSlice, state, elements, map);
        state.sliceOpenedId = String(rawSlice?.id || slice?.id || '').trim();
        state.sliceOpenedTitle = String(rawSlice?.title || slice?.title || '').trim();
        state.sliceOpenedAnnotationPlan = buildSliceAnnotationDisplayPlan(rawSlice);
        markResearchContextAsSaved(state);
        updateResearchContextBar(elements, state);
        renderSlicesPanel(elements, state, map);
        showUiSystemMessage('Срез восстановлен', { variant: 'success', timeout: 2200 });
      } catch (error) {
        showUiSystemMessage(normalizeAppError(error, 'Не удалось открыть срез.').message, { variant: 'warning', timeout: 3200 });
      }
    };
    state.sliceCompareSelectionIds = (Array.isArray(state.sliceCompareSelectionIds) ? state.sliceCompareSelectionIds : [])
      .filter((id) => availableSliceById.has(String(id || '').trim()))
      .slice(0, 2);
    syncResearchSliceCompareCta(elements, state);

    if (state.sliceComparePanelOpen) {
      const comparePanel = document.createElement('section');
      comparePanel.className = 'slice-compare-panel';
      const comparePanelHeader = document.createElement('header');
      comparePanelHeader.className = 'panel-stack';
      const comparePanelTitle = document.createElement('h5');
      comparePanelTitle.className = 'panel-title';
      comparePanelTitle.textContent = 'Сравнение срезов';
      comparePanelHeader.appendChild(comparePanelTitle);

      const compareFallback = state.sliceCompareSelectionIds.length < 2;
      if (compareFallback) {
        comparePanel.appendChild(comparePanelHeader);
        const fallback = document.createElement('p');
        fallback.className = 'status-summary';
        fallback.textContent = 'Для сравнения нужно выбрать два среза';
        comparePanel.appendChild(fallback);
      } else {
        const selectedSlices = state.sliceCompareSelectionIds
          .map((sliceId) => availableSliceById.get(String(sliceId || '').trim()))
          .filter(Boolean);
        const selectedTitles = selectedSlices.map((slice) => String(slice?.title || '').trim()).filter(Boolean);
        const openedCompareSlice = selectedSlices.find((slice) => String(slice?.id || '').trim() === openedSliceId) || null;
        const openedCompareTitle = String(openedCompareSlice?.title || '').trim() || 'Без названия';
        const pairSummary = document.createElement('p');
        pairSummary.className = 'status-summary';
        const pairSummaryRaw = `${selectedTitles[0] || 'Срез A'} ↔ ${selectedTitles[1] || 'Срез B'}`;
        pairSummary.textContent = truncateText(pairSummaryRaw, 96);
        pairSummary.title = pairSummaryRaw;
        comparePanelHeader.appendChild(pairSummary);

        const openedSummary = document.createElement('p');
        openedSummary.className = 'status-summary';
        openedSummary.textContent = openedCompareSlice
          ? `Сейчас открыт: ${truncateText(openedCompareTitle, 64)}`
          : 'Ни один из выбранных срезов сейчас не открыт';
        if (openedCompareSlice) openedSummary.title = `Сейчас открыт: ${openedCompareTitle}`;
        comparePanelHeader.appendChild(openedSummary);
        comparePanel.appendChild(comparePanelHeader);

        const columns = document.createElement('div');
        columns.className = 'slice-compare-columns';
        const columnLabels = ['Срез A', 'Срез B'];
        selectedSlices.slice(0, 2).forEach((slice, index) => {
          const card = document.createElement('article');
          card.className = 'slice-compare-card';
          const sliceId = String(slice?.id || '').trim();
          const isOpenedSlice = Boolean(sliceId) && Boolean(openedSliceId) && sliceId === openedSliceId;
          if (isOpenedSlice) card.classList.add('is-current-slice');
          const cardTitle = document.createElement('h6');
          cardTitle.className = 'panel-title';
          cardTitle.textContent = columnLabels[index] || `Срез ${index + 1}`;
          card.appendChild(cardTitle);

          const cardHead = document.createElement('div');
          cardHead.className = 'course-item-head';
          const sliceTitle = document.createElement('p');
          sliceTitle.className = 'status-summary';
          sliceTitle.textContent = String(slice?.title || 'Без названия');
          cardHead.appendChild(sliceTitle);
          if (isOpenedSlice) {
            const openedBadge = document.createElement('span');
            openedBadge.className = 'ui-badge';
            openedBadge.textContent = 'Открыт';
            cardHead.appendChild(openedBadge);
          }
          card.appendChild(cardHead);

          const sliceMeta = buildSliceListMetaSummary(slice);
          if (sliceMeta) {
            const metaLine = document.createElement('p');
            metaLine.className = 'status-summary slice-compare-card-meta';
            metaLine.textContent = sliceMeta;
            card.appendChild(metaLine);
          }

          const descriptionPreview = String(slice?.description || '').trim();
          if (descriptionPreview) {
            const descriptionLine = document.createElement('p');
            descriptionLine.className = 'status-summary slice-compare-card-preview';
            descriptionLine.textContent = truncateText(descriptionPreview.replace(/\s+/g, ' '), 180);
            card.appendChild(descriptionLine);
          }

          const timeRange = slice?.time_range && typeof slice.time_range === 'object' ? slice.time_range : null;
          if (timeRange && Number.isFinite(Number(timeRange.start)) && Number.isFinite(Number(timeRange.end))) {
            const periodLine = document.createElement('p');
            periodLine.className = 'status-summary slice-compare-card-detail';
            const start = Math.trunc(Number(timeRange.start));
            const end = Math.trunc(Number(timeRange.end));
            periodLine.textContent = `Период: ${timeRange.mode === 'point' || start === end ? start : `${start}–${end}`}`;
            card.appendChild(periodLine);
          }

          const featureCount = Number(slice?.feature_count);
          if (Number.isFinite(featureCount) && featureCount >= 0) {
            const objectsLine = document.createElement('p');
            objectsLine.className = 'status-summary slice-compare-card-detail';
            objectsLine.textContent = `Выбранные объекты: ${Math.trunc(featureCount)}`;
            card.appendChild(objectsLine);
          }

          const viewState = slice?.view_state && typeof slice.view_state === 'object' ? slice.view_state : null;
          if (viewState) {
            const enabledLayerIds = Array.isArray(viewState.enabled_layer_ids) ? viewState.enabled_layer_ids.filter(Boolean) : [];
            const quickLayerIds = Array.isArray(viewState.active_quick_layer_ids) ? viewState.active_quick_layer_ids.filter(Boolean) : [];
            if (enabledLayerIds.length || quickLayerIds.length) {
              const layersLine = document.createElement('p');
              layersLine.className = 'status-summary slice-compare-card-detail';
              layersLine.textContent = `Слои: ${enabledLayerIds.length}${quickLayerIds.length ? ` · быстрые: ${quickLayerIds.length}` : ''}`;
              card.appendChild(layersLine);
            }
          }

          const cardActions = document.createElement('div');
          cardActions.className = 'panel-action-row';
          const openFromCompareBtn = document.createElement('button');
          openFromCompareBtn.type = 'button';
          openFromCompareBtn.className = 'ui-button ui-button-secondary';
          openFromCompareBtn.textContent = isOpenedSlice ? 'Открыт' : 'Открыть срез';
          openFromCompareBtn.disabled = isOpenedSlice;
          openFromCompareBtn.addEventListener('click', async () => {
            await restoreSliceFromEntry(slice);
          });
          cardActions.appendChild(openFromCompareBtn);
          card.appendChild(cardActions);

          columns.appendChild(card);
        });
        comparePanel.appendChild(columns);

        const compareDimensions = document.createElement('section');
        compareDimensions.className = 'slice-compare-dimensions';
        const dimensionsTitle = document.createElement('p');
        dimensionsTitle.className = 'status-summary';
        dimensionsTitle.textContent = 'Что будет сравниваться';
        const dimensionsList = document.createElement('ul');
        dimensionsList.className = 'slice-compare-selected-list';
        ['Период', 'Слои', 'Выбранные объекты', 'Исследовательский контекст'].forEach((label) => {
          const li = document.createElement('li');
          li.textContent = label;
          dimensionsList.appendChild(li);
        });
        compareDimensions.append(dimensionsTitle, dimensionsList);
        comparePanel.appendChild(compareDimensions);

        const [sliceA, sliceB] = selectedSlices;
        const compareDiffs = document.createElement('section');
        compareDiffs.className = 'slice-compare-dimensions';
        const diffsTitle = document.createElement('p');
        diffsTitle.className = 'status-summary';
        diffsTitle.textContent = 'Различия';
        compareDiffs.appendChild(diffsTitle);

        const buildPeriodLabel = (slice) => {
          const timeRange = slice?.time_range && typeof slice.time_range === 'object' ? slice.time_range : null;
          if (!timeRange) return '—';
          const startValue = Number(timeRange.start);
          const endValue = Number(timeRange.end);
          if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) return '—';
          const start = Math.trunc(startValue);
          const end = Math.trunc(endValue);
          return timeRange.mode === 'point' || start === end ? `${start}` : `${start}–${end}`;
        };

        const buildDiffLine = (text) => {
          const line = document.createElement('p');
          line.className = 'status-summary';
          line.textContent = text;
          compareDiffs.appendChild(line);
        };

        const periodA = buildPeriodLabel(sliceA);
        const periodB = buildPeriodLabel(sliceB);
        if (periodA === periodB) {
          buildDiffLine('Период совпадает');
        } else {
          buildDiffLine(`Период: ${periodA} ↔ ${periodB}`);
        }

        const featureA = Number.isFinite(Number(sliceA?.feature_count)) ? Math.trunc(Number(sliceA.feature_count)) : 0;
        const featureB = Number.isFinite(Number(sliceB?.feature_count)) ? Math.trunc(Number(sliceB.feature_count)) : 0;
        if (featureA === featureB) {
          buildDiffLine(`Объекты совпадают: ${featureA}`);
        } else {
          buildDiffLine(`Объекты: ${featureA} ↔ ${featureB}`);
        }

        const enabledLayersA = Array.isArray(sliceA?.view_state?.enabled_layer_ids) ? sliceA.view_state.enabled_layer_ids.filter(Boolean).length : 0;
        const enabledLayersB = Array.isArray(sliceB?.view_state?.enabled_layer_ids) ? sliceB.view_state.enabled_layer_ids.filter(Boolean).length : 0;
        if (enabledLayersA === enabledLayersB) {
          buildDiffLine(`Слои совпадают: ${enabledLayersA}`);
        } else {
          buildDiffLine(`Слои: ${enabledLayersA} ↔ ${enabledLayersB}`);
        }

        const quickLayersA = Array.isArray(sliceA?.view_state?.active_quick_layer_ids) ? sliceA.view_state.active_quick_layer_ids.filter(Boolean).length : 0;
        const quickLayersB = Array.isArray(sliceB?.view_state?.active_quick_layer_ids) ? sliceB.view_state.active_quick_layer_ids.filter(Boolean).length : 0;
        if (quickLayersA > 0 || quickLayersB > 0) {
          if (quickLayersA === quickLayersB) {
            buildDiffLine(`Быстрые категории совпадают: ${quickLayersA}`);
          } else {
            buildDiffLine(`Быстрые категории: ${quickLayersA} ↔ ${quickLayersB}`);
          }
        }

        comparePanel.appendChild(compareDiffs);

        const extractSliceFeatureIds = (slice) => {
          if (!slice || typeof slice !== 'object') return [];
          const featureRefs = Array.isArray(slice.feature_refs) ? slice.feature_refs : [];
          const fromRefs = featureRefs
            .map((entry) => String(entry?.feature_id || '').trim())
            .filter(Boolean);
          if (fromRefs.length) return [...new Set(fromRefs)];
          const legacyFeatureIds = Array.isArray(slice.feature_ids) ? slice.feature_ids : [];
          const legacyFrontendFeatureIds = Array.isArray(slice.featureIds) ? slice.featureIds : [];
          return [...new Set([...legacyFeatureIds, ...legacyFrontendFeatureIds]
            .map((id) => String(id || '').trim())
            .filter(Boolean))];
        };

        const featureSetA = new Set(extractSliceFeatureIds(sliceA));
        const featureSetB = new Set(extractSliceFeatureIds(sliceB));
        let sharedCount = 0;
        featureSetA.forEach((id) => {
          if (featureSetB.has(id)) sharedCount += 1;
        });
        const onlyACount = featureSetA.size - sharedCount;
        const onlyBCount = featureSetB.size - sharedCount;

        const compositionSection = document.createElement('section');
        compositionSection.className = 'slice-compare-dimensions';
        const compositionTitle = document.createElement('p');
        compositionTitle.className = 'status-summary';
        compositionTitle.textContent = 'Состав объектов';
        compositionSection.appendChild(compositionTitle);

        ['Общие', 'Только в A', 'Только в B'].forEach((label, index) => {
          const line = document.createElement('p');
          line.className = 'status-summary';
          const count = index === 0 ? sharedCount : index === 1 ? onlyACount : onlyBCount;
          line.textContent = `${label}: ${count}`;
          compositionSection.appendChild(line);
        });

        const compositionSummary = document.createElement('p');
        compositionSummary.className = 'status-summary';
        compositionSummary.textContent = sharedCount > 0
          ? 'Часть объектов повторяется в обоих срезах.'
          : 'Срезы не пересекаются по составу объектов.';
        compositionSection.appendChild(compositionSummary);
        comparePanel.appendChild(compositionSection);
      }

      const comparePanelActions = document.createElement('div');
      comparePanelActions.className = 'panel-action-row slice-compare-panel-actions';
      const closeComparePanelBtn = document.createElement('button');
      closeComparePanelBtn.type = 'button';
      closeComparePanelBtn.className = 'ui-button ui-button-secondary';
      closeComparePanelBtn.textContent = 'Закрыть';
      closeComparePanelBtn.addEventListener('click', () => {
        state.sliceComparePanelOpen = false;
        renderSlicesPanel(elements, state, map);
      });
      const resetComparePanelBtn = document.createElement('button');
      resetComparePanelBtn.type = 'button';
      resetComparePanelBtn.className = 'ui-button ui-button-secondary';
      resetComparePanelBtn.textContent = 'Сбросить выбор';
      resetComparePanelBtn.addEventListener('click', () => {
        state.sliceCompareSelectionIds = [];
        state.sliceComparePanelOpen = false;
        syncResearchSliceCompareCta(elements, state);
        renderSlicesPanel(elements, state, map);
      });
      comparePanelActions.append(closeComparePanelBtn, resetComparePanelBtn);
      comparePanel.appendChild(comparePanelActions);
      savedSection.appendChild(comparePanel);
    }

    const compareSummary = document.createElement('div');
    compareSummary.className = 'slice-compare-summary';
    const compareSummaryTitle = document.createElement('p');
    compareSummaryTitle.className = 'status-summary slice-compare-summary-title';
    compareSummaryTitle.textContent = state.sliceCompareSelectionIds.length >= 2
      ? `Compare ready: ${state.sliceCompareSelectionIds.length}/2`
      : `Compare readiness: ${state.sliceCompareSelectionIds.length}/2`;
    const compareSummaryActions = document.createElement('div');
    compareSummaryActions.className = 'panel-action-row slice-compare-summary-actions';
    const openCompareToolsBtn = document.createElement('button');
    openCompareToolsBtn.type = 'button';
    openCompareToolsBtn.className = 'ui-button ui-button-secondary';
    openCompareToolsBtn.textContent = 'Compare tools';
    openCompareToolsBtn.addEventListener('click', () => {
      state.sliceComparePanelOpen = true;
      renderSlicesPanel(elements, state, map);
    });
    const clearCompareBtn = document.createElement('button');
    clearCompareBtn.type = 'button';
    clearCompareBtn.className = 'ui-button ui-button-secondary';
    clearCompareBtn.textContent = 'Сбросить';
    clearCompareBtn.disabled = !state.sliceCompareSelectionIds.length;
    clearCompareBtn.addEventListener('click', () => {
      state.sliceCompareSelectionIds = [];
      state.sliceComparePanelOpen = false;
      syncResearchSliceCompareCta(elements, state);
      renderSlicesPanel(elements, state, map);
    });
    compareSummaryActions.append(openCompareToolsBtn, clearCompareBtn);
    compareSummary.append(compareSummaryTitle, compareSummaryActions);
    savedSection.appendChild(compareSummary);

    const list = document.createElement('div');
    list.className = 'courses-list';
    state.researchSlices.forEach((slice) => {
      const row = document.createElement('article');
      row.className = 'course-item';
      const sliceId = String(slice?.id || '').trim();
      const isCompareSelected = state.sliceCompareSelectionIds.includes(sliceId);

      const titleRow = document.createElement('div');
      titleRow.className = 'course-item-head';
      const rowTitle = document.createElement('strong');
      rowTitle.className = 'course-item-title';
      const rawTitle = String(slice?.title || 'Без названия');
      rowTitle.textContent = rawTitle;
      const isOpened = Boolean(sliceId) && Boolean(openedSliceId) && sliceId === openedSliceId;
      titleRow.appendChild(rowTitle);
      if (isOpened) {
        const openedBadge = document.createElement('span');
        openedBadge.className = 'ui-badge';
        openedBadge.textContent = 'Открыт';
        titleRow.appendChild(openedBadge);
        row.classList.add('is-opened');
        row.classList.add('is-current-slice');
      }
      row.appendChild(titleRow);

      const rowMeta = document.createElement('p');
      rowMeta.className = 'status-summary slice-item-meta';
      rowMeta.textContent = buildSliceListMetaSummary(slice);
      if (rowMeta.textContent) row.appendChild(rowMeta);

      const storyUsageCount = narrativeUsage.storyIdsBySliceId.get(sliceId)?.size || 0;
      const courseUsageCount = narrativeUsage.courseIdsBySliceId.get(sliceId)?.size || 0;
      if (storyUsageCount > 0 || courseUsageCount > 0) {
        const usageRow = document.createElement('div');
        usageRow.className = 'slice-item-usage';
        if (storyUsageCount > 0) {
          const storyBadge = document.createElement('span');
          storyBadge.className = 'ui-badge slice-usage-badge';
          storyBadge.textContent = `Story ${storyUsageCount}`;
          storyBadge.title = storyUsageCount > 1
            ? `Используется в ${storyUsageCount} stories`
            : 'Используется в 1 story';
          usageRow.appendChild(storyBadge);
        }
        if (courseUsageCount > 0) {
          const courseBadge = document.createElement('span');
          courseBadge.className = 'ui-badge slice-usage-badge';
          courseBadge.textContent = `Course ${courseUsageCount}`;
          courseBadge.title = courseUsageCount > 1
            ? `Косвенно используется в ${courseUsageCount} courses`
            : 'Косвенно используется в 1 course';
          usageRow.appendChild(courseBadge);
        }
        row.appendChild(usageRow);
      }

      const rowPreviewText = String(slice?.description || '').trim();
      if (rowPreviewText) {
        const preview = document.createElement('p');
        preview.className = 'status-summary slice-item-preview';
        preview.textContent = truncateText(rowPreviewText.replace(/\s+/g, ' '), 140);
        row.appendChild(preview);
      }

      const actions = document.createElement('div');
      actions.className = 'panel-action-row slice-item-actions';

      const compareToggleBtn = document.createElement('button');
      compareToggleBtn.type = 'button';
      compareToggleBtn.className = 'ui-button ui-button-secondary slice-compare-toggle';
      compareToggleBtn.textContent = isCompareSelected ? 'В сравнении' : 'В сравнение';
      compareToggleBtn.setAttribute('aria-pressed', String(isCompareSelected));
      const compareLimitReached = !isCompareSelected && state.sliceCompareSelectionIds.length >= 2;
      compareToggleBtn.disabled = compareLimitReached;
      compareToggleBtn.title = compareLimitReached ? 'Можно выбрать только 2 среза' : '';
      compareToggleBtn.addEventListener('click', () => {
        if (!sliceId) return;
        const next = new Set(state.sliceCompareSelectionIds || []);
        if (next.has(sliceId)) next.delete(sliceId);
        else if (next.size < 2) next.add(sliceId);
        state.sliceCompareSelectionIds = [...next].slice(0, 2);
        syncResearchSliceCompareCta(elements, state);
        renderSlicesPanel(elements, state, map);
      });

      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'ui-button ui-button-primary slice-open-btn';
      openBtn.textContent = isOpened ? 'Открыт' : 'Открыть срез';
      openBtn.disabled = isOpened;
      openBtn.addEventListener('click', async () => {
        await restoreSliceFromEntry(slice);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'ui-button ui-button-danger slice-delete-btn';
      deleteBtn.textContent = 'Удалить';
      deleteBtn.addEventListener('click', async () => {
        const sliceTitleForDelete = String(slice?.title || '').trim();
        const ok = window.confirm(sliceTitleForDelete ? `Удалить срез «${sliceTitleForDelete}»?` : 'Удалить исследовательский срез?');
        if (!ok) return;
        try {
          await deleteResearchSlice(String(slice?.id || ''));
          await ensureResearchSlicesLoaded(state, { force: true });
          renderSlicesPanel(elements, state, map);
          showUiSystemMessage('Срез удалён', { variant: 'success', timeout: 2200 });
        } catch (error) {
          showUiSystemMessage(normalizeAppError(error, 'Не удалось удалить срез.').message, { variant: 'warning', timeout: 3200 });
        }
      });

      actions.append(compareToggleBtn, openBtn, deleteBtn);
      row.appendChild(actions);
      list.appendChild(row);
    });
    savedSection.appendChild(list);
  }
  panel.appendChild(savedSection);

  const storiesSection = document.createElement('section');
  storiesSection.className = 'panel-stack slice-workzone slice-secondary-workzone';
  const storiesToggle = document.createElement('details');
  storiesToggle.className = 'slice-secondary-disclosure';
  const storiesSummary = document.createElement('summary');
  storiesSummary.className = 'status-summary';
  const storiesCount = Array.isArray(state.stories) ? state.stories.length : 0;
  const coursesCount = Array.isArray(state.courses) ? state.courses.length : 0;
  storiesSummary.textContent = `Secondary narrative tools · Stories: ${storiesCount} · Courses: ${coursesCount}`;
  storiesToggle.appendChild(storiesSummary);
  const storiesInner = document.createElement('div');
  storiesInner.className = 'panel-stack';

  const availableSliceRows = Array.isArray(state.researchSlices) ? state.researchSlices : [];
  const availableSliceMap = new Map(
    availableSliceRows
      .map((slice) => [String(slice?.id || '').trim(), slice])
      .filter(([id]) => id)
  );
  state.storyDraftSliceIds = (Array.isArray(state.storyDraftSliceIds) ? state.storyDraftSliceIds : []).filter((id) => availableSliceMap.has(id));

  const storyForm = document.createElement('form');
  storyForm.className = 'panel-stack';
  storyForm.noValidate = true;

  const storyTitleInput = document.createElement('input');
  storyTitleInput.type = 'text';
  storyTitleInput.name = 'story_title';
  storyTitleInput.maxLength = 180;
  storyTitleInput.placeholder = 'Название Story';
  storyTitleInput.required = true;

  const storyDescInput = document.createElement('textarea');
  storyDescInput.name = 'story_description';
  storyDescInput.maxLength = 4000;
  storyDescInput.rows = 2;
  storyDescInput.placeholder = 'Описание (опционально)';

  const pickerTitle = document.createElement('p');
  pickerTitle.className = 'status-summary';
  pickerTitle.textContent = 'Выберите минимум 2 slices:';
  storyForm.append(storyTitleInput, storyDescInput, pickerTitle);

  const pickerList = document.createElement('div');
  pickerList.className = 'panel-stack';
  availableSliceRows.forEach((slice) => {
    const sliceId = String(slice?.id || '').trim();
    if (!sliceId) return;
    const row = document.createElement('label');
    row.className = 'status-summary';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = state.storyDraftSliceIds.includes(sliceId);
    checkbox.addEventListener('change', () => {
      const next = new Set(state.storyDraftSliceIds || []);
      if (checkbox.checked) next.add(sliceId);
      else next.delete(sliceId);
      state.storyDraftSliceIds = [...next];
      renderSlicesPanel(elements, state, map);
    });
    const titleText = document.createElement('span');
    titleText.textContent = ` ${String(slice?.title || 'Без названия')}`;
    row.append(checkbox, titleText);
    pickerList.appendChild(row);
  });
  storyForm.appendChild(pickerList);

  if (state.storyDraftSliceIds.length) {
    const orderedTitle = document.createElement('p');
    orderedTitle.className = 'status-summary';
    orderedTitle.textContent = `Порядок шагов (${state.storyDraftSliceIds.length})`;
    storyForm.appendChild(orderedTitle);
    const orderedList = document.createElement('div');
    orderedList.className = 'panel-stack';
    state.storyDraftSliceIds.forEach((sliceId, index) => {
      const row = document.createElement('div');
      row.className = 'panel-action-row';
      const label = document.createElement('span');
      label.textContent = `${index + 1}. ${String(availableSliceMap.get(sliceId)?.title || sliceId)}`;
      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'ui-button ui-button-secondary';
      upBtn.textContent = '↑';
      upBtn.disabled = index === 0;
      upBtn.addEventListener('click', () => {
        if (index === 0) return;
        const next = [...state.storyDraftSliceIds];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        state.storyDraftSliceIds = next;
        renderSlicesPanel(elements, state, map);
      });
      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'ui-button ui-button-secondary';
      downBtn.textContent = '↓';
      downBtn.disabled = index === state.storyDraftSliceIds.length - 1;
      downBtn.addEventListener('click', () => {
        if (index >= state.storyDraftSliceIds.length - 1) return;
        const next = [...state.storyDraftSliceIds];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        state.storyDraftSliceIds = next;
        renderSlicesPanel(elements, state, map);
      });
      row.append(label, upBtn, downBtn);
      orderedList.appendChild(row);
    });
    storyForm.appendChild(orderedList);
  }

  const createStoryBtn = document.createElement('button');
  createStoryBtn.type = 'submit';
  createStoryBtn.className = 'ui-button ui-button-primary';
  createStoryBtn.textContent = 'Создать Story';
  createStoryBtn.disabled = state.storyDraftSliceIds.length < 2 || state.storiesLoading;
  storyForm.appendChild(createStoryBtn);

  storyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = buildStoryPayload({
        title: storyTitleInput.value,
        description: storyDescInput.value,
        sliceIds: state.storyDraftSliceIds
      });
      await createStory(payload);
      state.storyDraftSliceIds = [];
      showUiSystemMessage('Story сохранена', { variant: 'success', timeout: 2200 });
      await ensureStoriesLoaded(state, { force: true });
      renderSlicesPanel(elements, state, map);
    } catch (error) {
      showUiSystemMessage(normalizeAppError(error, 'Не удалось сохранить story.').message, { variant: 'warning', timeout: 3200 });
    }
  });
  storiesInner.appendChild(storyForm);

  if (state.currentStory && Array.isArray(state.currentStory.slice_ids) && state.currentStory.slice_ids.length) {
    const storyModeSurface = document.createElement('section');
    storyModeSurface.className = 'story-mode-surface';
    const storyModeHead = document.createElement('div');
    storyModeHead.className = 'story-mode-head';
    const storyModeBadge = document.createElement('span');
    storyModeBadge.className = 'ui-badge story-mode-badge';
    storyModeBadge.textContent = 'Story mode';
    const storyModeTitle = document.createElement('strong');
    storyModeTitle.className = 'story-mode-title';
    const storyTitleRaw = String(state.currentStory.title || 'Story');
    storyModeTitle.textContent = storyTitleRaw;
    storyModeHead.append(storyModeBadge, storyModeTitle);
    storyModeSurface.appendChild(storyModeHead);

    const playback = document.createElement('div');
    playback.className = 'panel-action-row story-playback-controls';
    const storySteps = state.currentStory.slice_ids.length;
    const storyStep = clampStoryStepIndex(state.currentStory, state.currentStoryStepIndex) + 1;
    const stepStateLabel = resolveStoryStepStateLabel(storyStep, storySteps);
    const { stepTitle: stepTitleRaw, stepNarrative: stepNarrativeRaw } = resolveStoryStepNarrative(state.currentStory, state.currentStoryStepIndex);
    const openedSliceTitle = String(state.sliceOpenedTitle || '').trim();
    const stepDisplayTitle = stepTitleRaw || openedSliceTitle || `Шаг ${storyStep}`;
    const storyStepStateLine = document.createElement('p');
    storyStepStateLine.className = 'status-summary story-mode-state';
    storyStepStateLine.textContent = stepStateLabel;
    storyModeSurface.appendChild(storyStepStateLine);
    const storyStepSummary = document.createElement('p');
    storyStepSummary.className = 'status-summary story-mode-step';
    storyStepSummary.textContent = `Шаг ${storyStep} из ${storySteps}`;
    storyModeSurface.appendChild(storyStepSummary);
    const storyStepTitleLine = document.createElement('p');
    storyStepTitleLine.className = 'story-mode-step-title';
    storyStepTitleLine.textContent = stepDisplayTitle;
    storyModeSurface.appendChild(storyStepTitleLine);
    const storyContextLine = document.createElement('p');
    storyContextLine.className = 'status-summary story-mode-context';
    const storyDescription = String(state.currentStory.description || '').trim();
    if (stepNarrativeRaw) {
      storyContextLine.textContent = truncateText(stepNarrativeRaw.replace(/\s+/g, ' '), 220);
    } else if (storyDescription) {
      storyContextLine.textContent = truncateText(storyDescription.replace(/\s+/g, ' '), 220);
    } else if (openedSliceTitle) {
      storyContextLine.textContent = `Текущий фокус: ${truncateText(openedSliceTitle, 120)}.`;
    } else {
      storyContextLine.textContent = 'Пошаговый story-режим активен: используйте «Назад/Далее» для навигации.';
    }
    storyModeSurface.appendChild(storyContextLine);

    const stepLabel = document.createElement('span');
    stepLabel.className = 'status-summary story-playback-hint';
    stepLabel.textContent = 'Навигация по шагам';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'ui-button ui-button-secondary';
    prevBtn.textContent = 'Назад';
    prevBtn.disabled = storyStep <= 1;
    prevBtn.addEventListener('click', async () => {
      state.currentStoryStepIndex = clampStoryStepIndex(state.currentStory, state.currentStoryStepIndex - 1);
      await applyCurrentStoryStep(state, elements, map);
      renderSlicesPanel(elements, state, map);
    });

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'ui-button ui-button-secondary';
    nextBtn.textContent = 'Далее';
    nextBtn.disabled = storyStep >= storySteps;
    nextBtn.addEventListener('click', async () => {
      state.currentStoryStepIndex = clampStoryStepIndex(state.currentStory, state.currentStoryStepIndex + 1);
      await applyCurrentStoryStep(state, elements, map);
      renderSlicesPanel(elements, state, map);
    });

    const exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'ui-button ui-button-secondary';
    exitBtn.textContent = 'Выйти из Story';
    exitBtn.addEventListener('click', () => {
      exitStoryMode(state, elements, map);
      renderSlicesPanel(elements, state, map);
    });

    playback.append(stepLabel, prevBtn, nextBtn, exitBtn);
    storyModeSurface.appendChild(playback);
    storiesInner.appendChild(storyModeSurface);
  }

  if (state.storiesLoading) {
    storiesInner.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Загрузка stories',
      message: 'Загрузка stories…'
    }));
  } else if (state.storiesError) {
    storiesInner.appendChild(createInlineStateBlock({
      variant: 'warning',
      title: 'Stories недоступны',
      message: state.storiesError
    }));
  } else if (Array.isArray(state.stories) && state.stories.length) {
    const storiesList = document.createElement('div');
    storiesList.className = 'courses-list';
    state.stories.forEach((story) => {
      const item = document.createElement('article');
      item.className = 'course-item';
      const itemTitle = document.createElement('strong');
      itemTitle.className = 'course-item-title';
      itemTitle.textContent = String(story?.title || 'Без названия');
      const meta = document.createElement('p');
      meta.className = 'status-summary';
      const stamp = String(story?.updated_at || '').trim();
      meta.textContent = `${Number(story?.step_count || 0)} шагов${stamp ? ` · ${stamp.slice(0, 10)}` : ''}`;
      const actions = document.createElement('div');
      actions.className = 'panel-action-row';

      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'ui-button ui-button-secondary';
      openBtn.textContent = 'Открыть Story';
      openBtn.addEventListener('click', async () => {
        try {
          if (!state.currentStory) {
            captureStoryModeEntrySnapshot(state, map);
          }
          const detail = await getStory(String(story?.id || ''));
          state.currentStory = detail;
          state.currentStoryStepIndex = 0;
          await applyCurrentStoryStep(state, elements, map);
          renderSlicesPanel(elements, state, map);
          showUiSystemMessage('Story открыта', { variant: 'success', timeout: 2200 });
        } catch (error) {
          if (!state.currentStory) {
            state.storyModeEntrySnapshot = null;
          }
          showUiSystemMessage(normalizeAppError(error, 'Не удалось открыть story.').message, { variant: 'warning', timeout: 3200 });
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'ui-button ui-button-danger';
      deleteBtn.textContent = 'Удалить';
      deleteBtn.addEventListener('click', async () => {
        const ok = window.confirm('Удалить story?');
        if (!ok) return;
        try {
          await deleteStory(String(story?.id || ''));
          if (state.currentStory && String(state.currentStory.id || '') === String(story?.id || '')) {
            exitStoryMode(state, elements, map);
          }
          await ensureStoriesLoaded(state, { force: true });
          renderSlicesPanel(elements, state, map);
          showUiSystemMessage('Story удалена', { variant: 'success', timeout: 2200 });
        } catch (error) {
          showUiSystemMessage(normalizeAppError(error, 'Не удалось удалить story.').message, { variant: 'warning', timeout: 3200 });
        }
      });

      actions.append(openBtn, deleteBtn);
      item.append(itemTitle, meta, actions);
      storiesList.appendChild(item);
    });
    storiesInner.appendChild(storiesList);
  }

  storiesToggle.appendChild(storiesInner);
  storiesSection.appendChild(storiesToggle);
  panel.appendChild(storiesSection);
}

function applyResearchSliceContext(rawSlice, state, elements, map) {
  const restored = normalizeSliceForRestore(rawSlice);
  state.sliceSelectionSet = new Set(Array.isArray(restored.featureIds) ? restored.featureIds : []);
  if (restored.mode === 'point') {
    setTimelineMode(elements, state, 'point', { commit: false });
    applyTimelineRange(elements, state, {
      start: restored.start ?? state.currentStartYear,
      end: restored.start ?? state.currentStartYear,
      snap: false,
      commit: false
    });
  } else {
    setTimelineMode(elements, state, 'range', { commit: false });
    applyTimelineRange(elements, state, {
      start: restored.start ?? state.currentStartYear,
      end: restored.end ?? state.currentEndYear,
      snap: false,
      commit: false
    });
  }

  if (Array.isArray(restored.enabledLayerIds) && restored.enabledLayerIds.length) {
    state.enabledLayerIds = new Set(restored.enabledLayerIds);
  }
  if (Array.isArray(restored.activeQuickLayerIds) && restored.activeQuickLayerIds.length) {
    state.activeQuickLayerIds = new Set(restored.activeQuickLayerIds);
  }

  state.applyState?.();

  if (restored.center && Number.isFinite(Number(restored.zoom))) {
    map.flyTo({ center: restored.center, zoom: Number(restored.zoom), essential: true });
  }

  const restoredPrimaryId = restored.selectedFeatureId
    || (Array.isArray(restored.featureIds) && restored.featureIds.length ? restored.featureIds[0] : null);
  if (restoredPrimaryId) {
    const feature = getFeatureById(state, restoredPrimaryId);
    if (feature) {
      selectFeature(state, elements, map, feature, { centerOnMap: false, openDetail: true, scrollCard: true });
    }
  }
}

async function applyCurrentStoryStep(state, elements, map) {
  if (!state.currentStory) return;
  const sliceId = resolveStoryStepSliceId(state.currentStory, state.currentStoryStepIndex);
  if (!sliceId) return;
  const rawSlice = await getResearchSlice(sliceId);
  applyResearchSliceContext(rawSlice, state, elements, map);
}

function captureStoryModeEntrySnapshot(state, map) {
  if (!state || state.storyModeEntrySnapshot) return;
  const center = map?.getCenter?.();
  const lng = Number(center?.lng);
  const lat = Number(center?.lat);
  const zoom = Number(map?.getZoom?.());
  const hasViewport = Number.isFinite(lng) && Number.isFinite(lat) && Number.isFinite(zoom);
  const detailFeatureId = String(state.detailOpenFeatureId || '').trim() || null;
  state.storyModeEntrySnapshot = {
    timelineMode: state.timelineMode === 'point' ? 'point' : 'range',
    start: Number.isFinite(Number(state.currentStartYear)) ? Number(state.currentStartYear) : null,
    end: Number.isFinite(Number(state.currentEndYear)) ? Number(state.currentEndYear) : null,
    enabledLayerIds: [...new Set(Array.from(state.enabledLayerIds || []).map((id) => String(id || '').trim()).filter(Boolean))],
    activeQuickLayerIds: [...new Set(Array.from(state.activeQuickLayerIds || []).map((id) => String(id || '').trim()).filter(Boolean))],
    selectedFeatureId: String(state.selectedFeatureId || '').trim() || null,
    detailFeatureId,
    sliceOpenedId: String(state.sliceOpenedId || '').trim(),
    sliceOpenedTitle: String(state.sliceOpenedTitle || '').trim(),
    sliceOpenedAnnotationPlan: state.sliceOpenedAnnotationPlan || null,
    viewport: hasViewport ? { center: [lng, lat], zoom } : null
  };
}

function restoreStoryModeEntrySnapshot(state, elements, map) {
  const snapshot = state?.storyModeEntrySnapshot;
  state.storyModeEntrySnapshot = null;
  if (!snapshot || typeof snapshot !== 'object') return false;

  const timelineMode = snapshot.timelineMode === 'point' ? 'point' : 'range';
  setTimelineMode(elements, state, timelineMode, { commit: false });
  const fallbackStart = Number.isFinite(Number(state.currentStartYear)) ? Number(state.currentStartYear) : null;
  const fallbackEnd = Number.isFinite(Number(state.currentEndYear)) ? Number(state.currentEndYear) : fallbackStart;
  const start = Number.isFinite(Number(snapshot.start)) ? Number(snapshot.start) : fallbackStart;
  const endSource = timelineMode === 'point' ? start : snapshot.end;
  const end = Number.isFinite(Number(endSource)) ? Number(endSource) : fallbackEnd;
  if (Number.isFinite(start) && Number.isFinite(end)) {
    applyTimelineRange(elements, state, {
      start,
      end,
      snap: false,
      commit: false
    });
  }

  if (Array.isArray(snapshot.enabledLayerIds)) {
    state.enabledLayerIds = new Set(snapshot.enabledLayerIds.map((id) => String(id || '').trim()).filter(Boolean));
  }
  if (Array.isArray(snapshot.activeQuickLayerIds)) {
    state.activeQuickLayerIds = new Set(snapshot.activeQuickLayerIds.map((id) => String(id || '').trim()).filter(Boolean));
  }

  state.sliceOpenedId = String(snapshot.sliceOpenedId || '').trim();
  state.sliceOpenedTitle = String(snapshot.sliceOpenedTitle || '').trim();
  state.sliceOpenedAnnotationPlan = snapshot.sliceOpenedAnnotationPlan || null;

  state.applyState?.();

  if (snapshot.viewport && Array.isArray(snapshot.viewport.center)) {
    const [lng, lat] = snapshot.viewport.center;
    const zoom = Number(snapshot.viewport.zoom);
    if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat)) && Number.isFinite(zoom)) {
      map.flyTo({ center: [Number(lng), Number(lat)], zoom, essential: true });
    }
  }

  const selectedFeatureId = String(snapshot.selectedFeatureId || '').trim();
  const detailFeatureId = String(snapshot.detailFeatureId || '').trim() || selectedFeatureId;
  const featureIdToRestore = detailFeatureId || selectedFeatureId;
  if (featureIdToRestore) {
    const feature = getFeatureById(state, featureIdToRestore);
    if (feature) {
      selectFeature(state, elements, map, feature, {
        centerOnMap: false,
        openDetail: Boolean(detailFeatureId),
        scrollCard: true
      });
    } else {
      clearSelection(state, elements, map);
    }
  } else {
    clearSelection(state, elements, map);
  }

  updateResearchContextBar(elements, state);
  return true;
}

function exitStoryMode(state, elements, map) {
  state.currentStory = null;
  state.currentStoryStepIndex = 0;
  restoreStoryModeEntrySnapshot(state, elements, map);
}


async function ensureCoursesLoaded(state, { force = false } = {}) {
  if (state.coursesLoading) return;
  if (state.coursesLoaded && !force) return;
  state.coursesLoading = true;
  state.coursesError = '';
  try {
    const items = await listCourses();
    state.courses = Array.isArray(items) ? items : [];
    state.coursesLoaded = true;
  } catch (error) {
    state.coursesError = normalizeAppError(error, 'Не удалось загрузить courses.').message;
  } finally {
    state.coursesLoading = false;
  }
}

async function applyCurrentCourseStory(state, elements, map) {
  const storyId = resolveCourseStepStoryId(state.currentCourse, state.currentCourseStepIndex);
  if (!storyId) return;
  captureStoryModeEntrySnapshot(state, map);
  const detail = await getStory(storyId);
  state.currentStory = detail;
  state.currentStoryStepIndex = 0;
  await applyCurrentStoryStep(state, elements, map);
}

function exitCourseMode(state, elements, map) {
  if (state.currentStory || state.storyModeEntrySnapshot) {
    exitStoryMode(state, elements, map);
  }
  state.currentCourse = null;
  state.currentCourseStepIndex = 0;
}

function loadCourseProgressState() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(COURSE_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function saveCourseProgressState(progress) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(COURSE_PROGRESS_STORAGE_KEY, JSON.stringify(progress && typeof progress === 'object' ? progress : {}));
  } catch (_error) {
    // ignore storage write issues
  }
}

function getCourseProgressRecord(state, courseId) {
  const key = String(courseId || '').trim();
  if (!key) return null;
  const source = state?.courseProgress && typeof state.courseProgress === 'object' ? state.courseProgress : {};
  const record = source[key];
  if (!record || typeof record !== 'object') return null;
  const storyIndex = Number(record.storyIndex);
  return {
    storyIndex: Number.isInteger(storyIndex) ? storyIndex : 0,
    storyId: String(record.storyId || '').trim(),
    completed: Boolean(record.completed),
    updatedAt: String(record.updatedAt || '').trim()
  };
}

function resolveCourseResumeIndex(course, progressRecord) {
  const storyIds = Array.isArray(course?.story_ids)
    ? course.story_ids.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  if (!storyIds.length || !progressRecord) return 0;
  const index = clampCourseStepIndex(course, progressRecord.storyIndex);
  const storyIdAtIndex = storyIds[index] || '';
  if (progressRecord.storyId && progressRecord.storyId === storyIdAtIndex) return index;
  if (index >= 0 && index < storyIds.length) return index;
  return 0;
}

function resolveCourseProgressStatus(course, progressRecord) {
  const total = Array.isArray(course?.story_ids) ? course.story_ids.filter(Boolean).length : 0;
  if (!total || !progressRecord) return 'not_started';
  if (progressRecord.completed || progressRecord.storyIndex >= total - 1) return 'completed';
  if (progressRecord.storyIndex > 0) return 'resume_available';
  return 'in_progress';
}

function saveCourseProgress(state, course, index, { completed = false } = {}) {
  const courseId = String(course?.id || '').trim();
  if (!courseId) return;
  const storyIds = Array.isArray(course?.story_ids)
    ? course.story_ids.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  if (!storyIds.length) return;
  const safeIndex = clampCourseStepIndex(course, index);
  const nextRecord = {
    storyIndex: safeIndex,
    storyId: storyIds[safeIndex] || '',
    completed: Boolean(completed) || safeIndex >= storyIds.length - 1,
    updatedAt: new Date().toISOString()
  };
  if (!state.courseProgress || typeof state.courseProgress !== 'object') {
    state.courseProgress = {};
  }
  state.courseProgress[courseId] = nextRecord;
  saveCourseProgressState(state.courseProgress);
}

function renderCoursesPanel(elements, state, map) {
  const panel = elements.coursesPanel;
  if (!panel) return;
  panel.replaceChildren();

  const title = document.createElement('h3');
  title.className = 'panel-title';
  title.textContent = 'Courses';
  panel.appendChild(title);

  const storiesMap = new Map(
    (Array.isArray(state.stories) ? state.stories : [])
      .map((story) => [String(story?.id || '').trim(), story])
      .filter(([id]) => id)
  );
  state.courseDraftStoryIds = (Array.isArray(state.courseDraftStoryIds) ? state.courseDraftStoryIds : []).filter((id) => storiesMap.has(id));

  const createForm = document.createElement('form');
  createForm.className = 'panel-stack';
  createForm.noValidate = true;

  const courseTitleInput = document.createElement('input');
  courseTitleInput.type = 'text';
  courseTitleInput.name = 'course_title';
  courseTitleInput.maxLength = 180;
  courseTitleInput.placeholder = 'Название Course';
  courseTitleInput.required = true;

  const courseDescInput = document.createElement('textarea');
  courseDescInput.name = 'course_description';
  courseDescInput.maxLength = 4000;
  courseDescInput.rows = 2;
  courseDescInput.placeholder = 'Описание (опционально)';

  const pickerTitle = document.createElement('p');
  pickerTitle.className = 'status-summary';
  pickerTitle.textContent = 'Выберите минимум 1 story:';
  createForm.append(courseTitleInput, courseDescInput, pickerTitle);

  if (state.storiesLoading) {
    createForm.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Загрузка stories',
      message: 'Загрузка stories…'
    }));
  } else if (state.storiesError) {
    createForm.appendChild(createInlineStateBlock({
      variant: 'warning',
      title: 'Stories недоступны',
      message: state.storiesError
    }));
  } else if (!storiesMap.size) {
    createForm.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Stories пока нет',
      message: 'Сначала создайте хотя бы одну story во вкладке Slices.'
    }));
  } else {
    const pickerList = document.createElement('div');
    pickerList.className = 'panel-stack';
    storiesMap.forEach((story, storyId) => {
      const row = document.createElement('label');
      row.className = 'status-summary';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.courseDraftStoryIds.includes(storyId);
      checkbox.addEventListener('change', () => {
        const next = new Set(state.courseDraftStoryIds || []);
        if (checkbox.checked) next.add(storyId);
        else next.delete(storyId);
        state.courseDraftStoryIds = [...next];
        renderCoursesPanel(elements, state, map);
      });
      const titleText = document.createElement('span');
      titleText.textContent = ` ${String(story?.title || 'Без названия')}`;
      row.append(checkbox, titleText);
      pickerList.appendChild(row);
    });
    createForm.appendChild(pickerList);

    if (state.courseDraftStoryIds.length) {
      const orderedTitle = document.createElement('p');
      orderedTitle.className = 'status-summary';
      orderedTitle.textContent = `Порядок stories (${state.courseDraftStoryIds.length})`;
      createForm.appendChild(orderedTitle);

      const orderedList = document.createElement('div');
      orderedList.className = 'panel-stack';
      state.courseDraftStoryIds.forEach((storyId, index) => {
        const row = document.createElement('div');
        row.className = 'panel-action-row';
        const label = document.createElement('span');
        label.textContent = `${index + 1}. ${String(storiesMap.get(storyId)?.title || storyId)}`;

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'ui-button ui-button-secondary';
        upBtn.textContent = '↑';
        upBtn.disabled = index === 0;
        upBtn.addEventListener('click', () => {
          if (index === 0) return;
          const next = [...state.courseDraftStoryIds];
          [next[index - 1], next[index]] = [next[index], next[index - 1]];
          state.courseDraftStoryIds = next;
          renderCoursesPanel(elements, state, map);
        });

        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'ui-button ui-button-secondary';
        downBtn.textContent = '↓';
        downBtn.disabled = index === state.courseDraftStoryIds.length - 1;
        downBtn.addEventListener('click', () => {
          if (index >= state.courseDraftStoryIds.length - 1) return;
          const next = [...state.courseDraftStoryIds];
          [next[index], next[index + 1]] = [next[index + 1], next[index]];
          state.courseDraftStoryIds = next;
          renderCoursesPanel(elements, state, map);
        });

        row.append(label, upBtn, downBtn);
        orderedList.appendChild(row);
      });
      createForm.appendChild(orderedList);
    }
  }

  const createCourseBtn = document.createElement('button');
  createCourseBtn.type = 'submit';
  createCourseBtn.className = 'ui-button ui-button-primary';
  createCourseBtn.textContent = 'Создать Course';
  createCourseBtn.disabled = state.courseDraftStoryIds.length < 1 || state.coursesLoading || !storiesMap.size;
  createForm.appendChild(createCourseBtn);

  createForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = buildCoursePayload({
        title: courseTitleInput.value,
        description: courseDescInput.value,
        storyIds: state.courseDraftStoryIds
      });
      await createCourse(payload);
      state.courseDraftStoryIds = [];
      showUiSystemMessage('Course сохранён', { variant: 'success', timeout: 2200 });
      await ensureCoursesLoaded(state, { force: true });
      renderCoursesPanel(elements, state, map);
    } catch (error) {
      showUiSystemMessage(normalizeAppError(error, 'Не удалось сохранить course.').message, { variant: 'warning', timeout: 3200 });
    }
  });
  panel.appendChild(createForm);

  if (state.coursesLoading) {
    panel.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Загрузка courses',
      message: 'Загрузка courses…'
    }));
    return;
  }

  if (state.coursesError) {
    panel.appendChild(createInlineStateBlock({
      variant: 'warning',
      title: 'Courses недоступны',
      message: state.coursesError
    }));
    return;
  }

  if (!Array.isArray(state.courses) || !state.courses.length) {
    panel.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Courses пока нет',
      message: 'Создайте свой первый маршрут из stories.'
    }));
    return;
  }

  const list = document.createElement('div');
  list.className = 'courses-list';
  state.courses.forEach((course) => {
    const courseId = String(course?.id || '').trim();
    if (!courseId) return;
    const progressRecord = getCourseProgressRecord(state, courseId);
    const progressStatus = resolveCourseProgressStatus(course, progressRecord);

    const item = document.createElement('article');
    item.className = 'course-item';
    const itemTitle = document.createElement('strong');
    itemTitle.className = 'course-item-title';
    itemTitle.textContent = String(course?.title || 'Без названия');

    const meta = document.createElement('p');
    meta.className = 'status-summary';
    const stamp = String(course?.updated_at || '').trim();
    const progressLabel = progressStatus === 'completed'
      ? 'Завершено'
      : progressStatus === 'resume_available'
        ? 'Продолжить'
        : progressStatus === 'in_progress'
          ? 'В процессе'
          : 'Не начато';
    meta.textContent = `${Number(course?.step_count || 0)} stories · ${progressLabel}${stamp ? ` · ${stamp.slice(0, 10)}` : ''}`;

    const actions = document.createElement('div');
    actions.className = 'panel-action-row';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'ui-button ui-button-secondary';
    openBtn.textContent = progressStatus === 'completed'
      ? 'Пройти заново'
      : progressStatus === 'resume_available'
        ? 'Продолжить'
        : 'Начать';
    openBtn.addEventListener('click', async () => {
      try {
        const detail = await getCourse(courseId);
        state.currentCourse = detail;
        const resumeRecord = getCourseProgressRecord(state, courseId);
        const shouldResume = progressStatus === 'resume_available';
        state.currentCourseStepIndex = shouldResume
          ? resolveCourseResumeIndex(detail, resumeRecord)
          : 0;
        await applyCurrentCourseStory(state, elements, map);
        saveCourseProgress(state, detail, state.currentCourseStepIndex);
        renderCoursesPanel(elements, state, map);
        const message = progressStatus === 'completed'
          ? 'Course начат заново'
          : shouldResume
            ? 'Course продолжен'
            : 'Course открыт';
        showUiSystemMessage(message, { variant: 'success', timeout: 2200 });
      } catch (error) {
        showUiSystemMessage(normalizeAppError(error, 'Не удалось открыть course.').message, { variant: 'warning', timeout: 3200 });
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'ui-button ui-button-danger';
    deleteBtn.textContent = 'Удалить';
    deleteBtn.addEventListener('click', async () => {
      const ok = window.confirm('Удалить course?');
      if (!ok) return;
      try {
        await deleteCourse(courseId);
        if (state.courseProgress && typeof state.courseProgress === 'object' && state.courseProgress[courseId]) {
          delete state.courseProgress[courseId];
          saveCourseProgressState(state.courseProgress);
        }
        if (String(state.currentCourse?.id || '') === courseId) {
          exitCourseMode(state, elements, map);
        }
        await ensureCoursesLoaded(state, { force: true });
        renderCoursesPanel(elements, state, map);
        showUiSystemMessage('Course удалён', { variant: 'success', timeout: 2200 });
      } catch (error) {
        showUiSystemMessage(normalizeAppError(error, 'Не удалось удалить course.').message, { variant: 'warning', timeout: 3200 });
      }
    });

    actions.append(openBtn, deleteBtn);
    item.append(itemTitle, meta, actions);
    list.appendChild(item);
  });
  panel.appendChild(list);

  if (!state.currentCourse || !Array.isArray(state.currentCourse.story_ids) || !state.currentCourse.story_ids.length) {
    return;
  }

  const totalStories = state.currentCourse.story_ids.length;
  const currentIndex = clampCourseStepIndex(state.currentCourse, state.currentCourseStepIndex);
  const currentStoryTitle = String(state.currentStory?.title || '').trim();
  const progressRecord = getCourseProgressRecord(state, state.currentCourse?.id);
  const progressStatus = resolveCourseProgressStatus(state.currentCourse, progressRecord);
  const progressStatusLabel = progressStatus === 'completed'
    ? 'Завершено'
    : progressStatus === 'resume_available'
      ? 'Продолжение доступно'
      : progressStatus === 'in_progress'
        ? 'В процессе'
        : 'Не начато';

  const courseModeSurface = document.createElement('section');
  courseModeSurface.className = 'course-mode-surface';
  const courseModeHead = document.createElement('div');
  courseModeHead.className = 'course-mode-head';
  const courseModeBadge = document.createElement('span');
  courseModeBadge.className = 'ui-badge course-mode-badge';
  courseModeBadge.textContent = 'Course mode';
  const courseModeTitle = document.createElement('strong');
  courseModeTitle.className = 'course-mode-title';
  courseModeTitle.textContent = String(state.currentCourse.title || 'Course');
  courseModeHead.append(courseModeBadge, courseModeTitle);
  courseModeSurface.appendChild(courseModeHead);

  const courseProgressLine = document.createElement('p');
  courseProgressLine.className = 'status-summary course-mode-progress';
  courseProgressLine.textContent = `Прогресс: Story ${currentIndex + 1}/${totalStories} · ${progressStatusLabel}`;
  courseModeSurface.appendChild(courseProgressLine);

  const courseContextLine = document.createElement('p');
  courseContextLine.className = 'status-summary course-mode-context';
  courseContextLine.textContent = currentStoryTitle
    ? `Текущий учебный фокус: ${truncateText(currentStoryTitle, 120)}.`
    : 'Последовательный учебный режим активен.';
  courseModeSurface.appendChild(courseContextLine);

  const playback = document.createElement('div');
  playback.className = 'panel-action-row course-playback-controls';
  const stepLabel = document.createElement('span');
  stepLabel.className = 'status-summary course-playback-hint';
  stepLabel.textContent = 'Навигация курса';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'ui-button ui-button-secondary';
  prevBtn.textContent = 'Предыдущая Story';
  prevBtn.disabled = currentIndex <= 0;
  prevBtn.addEventListener('click', async () => {
    state.currentCourseStepIndex = clampCourseStepIndex(state.currentCourse, state.currentCourseStepIndex - 1);
    await applyCurrentCourseStory(state, elements, map);
    saveCourseProgress(state, state.currentCourse, state.currentCourseStepIndex);
    renderCoursesPanel(elements, state, map);
  });

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'ui-button ui-button-secondary';
  nextBtn.textContent = 'Следующая Story';
  nextBtn.disabled = currentIndex >= totalStories - 1;
  nextBtn.addEventListener('click', async () => {
    state.currentCourseStepIndex = clampCourseStepIndex(state.currentCourse, state.currentCourseStepIndex + 1);
    await applyCurrentCourseStory(state, elements, map);
    saveCourseProgress(state, state.currentCourse, state.currentCourseStepIndex, { completed: state.currentCourseStepIndex >= totalStories - 1 });
    renderCoursesPanel(elements, state, map);
  });

  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.className = 'ui-button ui-button-secondary';
  exitBtn.textContent = 'Выйти из Course';
  exitBtn.addEventListener('click', () => {
    saveCourseProgress(state, state.currentCourse, state.currentCourseStepIndex, { completed: state.currentCourseStepIndex >= totalStories - 1 });
    exitCourseMode(state, elements, map);
    renderCoursesPanel(elements, state, map);
  });

  playback.append(stepLabel, prevBtn, nextBtn, exitBtn);
  courseModeSurface.appendChild(playback);
  panel.appendChild(courseModeSurface);
}

function renderLivePanel(elements, state, map) {
  const panel = elements.livePanel;
  if (!panel) return;
  panel.replaceChildren();
  const title = document.createElement('h3');
  title.className = 'panel-title';
  title.textContent = 'Лента / Недавнее';
  panel.appendChild(title);

  if (state.liveError) {
    panel.appendChild(createInlineStateBlock({
      variant: 'warning',
      title: 'Лента недоступна',
      message: state.liveError
    }));
    return;
  }

  const recent = state.liveState?.liveFeatures || [];
  if (!recent.length) {
    panel.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Нет последних событий',
      message: 'Попробуйте обновить данные позже.'
    }));
    return;
  }

  const list = document.createElement('div');
  list.className = 'live-list';
  recent.forEach((feature) => {
    const props = normalizeProps(feature);
    const featureId = getFeatureUiId(feature);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `live-item${state.selectedFeatureId === featureId ? ' is-active' : ''}`;
    const titleNode = document.createElement('strong');
    titleNode.textContent = String(props.name_ru || props.title_short || 'Без названия');
    const metaNode = document.createElement('span');
    metaNode.className = 'live-item-meta';
    const dateValue = String(props.created_at || props.updated_at || props.date_start || 'Дата не указана');
    const layerValue = String(props.layer_id || 'Layer');
    metaNode.textContent = `${dateValue} · ${layerValue}`;
    item.append(titleNode, metaNode);
    item.addEventListener('click', () => {
      selectFeature(state, elements, map, feature, { centerOnMap: true, openDetail: true, scrollCard: true });
      closePrimaryPanel(elements, state, 'live');
      state.liveState.isLiveMode = false;
    });
    list.appendChild(item);
  });
  panel.appendChild(list);
}

function buildSearchResults(filteredFeatures, searchText) {
  if (!searchText) return [];
  return filteredFeatures.slice(0, 12);
}

function renderSearchDropdown(elements, state, map) {
  if (!elements.searchDropdown) return;
  elements.searchDropdown.replaceChildren();
  const shouldShow = Boolean(state.search);
  if (!shouldShow) {
    closePrimaryPanel(elements, state, 'search');
    return;
  }
  openPrimaryPanel(elements, state, 'search', elements.searchInput);

  if (!state.searchResults.length) {
    const noResults = document.createElement('div');
    noResults.className = 'search-no-results';
    noResults.textContent = `По запросу «${state.search}» ничего не найдено.`;
    const noResultsHint = document.createElement('div');
    noResultsHint.className = 'search-no-results-hint';
    noResultsHint.textContent = 'Попробуйте изменить период, слои или формулировку запроса.';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'ui-button ui-button-secondary';
    clearBtn.textContent = 'Очистить поиск';
    clearBtn.addEventListener('click', () => {
      clearSearchState(elements, state, { closePanel: true, notify: true });
      state.applyState?.();
    });
    elements.searchDropdown.appendChild(noResults);
    elements.searchDropdown.appendChild(noResultsHint);
    elements.searchDropdown.appendChild(clearBtn);
    return;
  }

  state.searchResults.forEach((feature) => {
    const props = normalizeProps(feature);
    const featureId = getFeatureUiId(feature);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `search-result-item${state.selectedFeatureId === featureId ? ' is-selected' : ''}`;
    const title = String(props.name_ru || props.name_en || props.title_short || 'Без названия');
    const dateMeta = props.date_start || props.date_end ? formatRange(props.date_start, props.date_end) : '';
    const rawLayerMeta = state.layerLookup.get(String(props.layer_id || '').trim()) || String(props.layer_id || '').trim();
    const layerMeta = rawLayerMeta === 'Layer' ? 'Слой не указан' : rawLayerMeta;
    const meta = [dateMeta, layerMeta].filter(Boolean).join(' · ') || 'Без дополнительной информации';
    item.textContent = title;
    const metaNode = document.createElement('span');
    metaNode.className = 'search-result-meta';
    metaNode.textContent = meta;
    item.appendChild(metaNode);
    item.addEventListener('click', () => {
      selectFeature(state, elements, map, feature, { centerOnMap: true, openDetail: true, scrollCard: true });
      closePrimaryPanel(elements, state, 'search');
    });
    elements.searchDropdown.appendChild(item);
  });

  const isTruncated = state.filteredFeatures.length > state.searchResults.length;
  if (isTruncated) {
    const truncationNote = document.createElement('div');
    truncationNote.className = 'search-truncation-note';
    truncationNote.setAttribute('role', 'note');
    truncationNote.textContent = `Показаны первые ${state.searchResults.length} результатов. Уточните запрос для более точного поиска.`;
    elements.searchDropdown.appendChild(truncationNote);
  }
}

function setupOverlayManager(elements, state, map) {
  const closeAll = () => {
    ['search', 'explore', 'filters', 'layers', 'bookmarks', 'slices', 'courses', 'live'].forEach((key) => closePrimaryPanel(elements, state, key));
  };
  const collapseTopActions = () => {
    if (!elements.topActions?.classList.contains('is-expanded')) return;
    elements.topActions.classList.remove('is-expanded');
    elements.overflowBtn?.setAttribute('aria-expanded', 'false');
  };
  state.overlay.closeAll = closeAll;

  document.addEventListener('artemis:overlay-open', (event) => {
    const source = event?.detail?.source || '';
    if (!state.viewport.isMobile) return;
    if (source === 'detail') {
      closeAll();
      collapseTopActions();
      return;
    }
    if (source === 'primary') {
      hideDetailPanel(elements, state);
      return;
    }
    if (source === 'ugc' || source === 'moderation') {
      closeAll();
      collapseTopActions();
      clearSelection(state, elements, map);
    }
  });
}

function setupLayerEntryHint(elements) {
  const helper = elements?.layersEntryHelper;
  const layersBtn = elements?.layersBtn;
  if (!helper || !layersBtn) return;

  const markVisited = () => {
    helper.classList.add('is-visited');
    layersBtn.classList.add('is-layer-engaged');
  };

  layersBtn.addEventListener('click', markVisited, { once: true });
  elements.layersPanel?.addEventListener('change', markVisited, { once: true });
}

function openExploreWorkspaceSection(elements, state, sectionKey = 'layers') {
  const allowed = new Set(['layers', 'filters', 'slices', 'bookmarks']);
  const nextSection = allowed.has(sectionKey) ? sectionKey : 'layers';
  const sections = {
    layers: elements.layersPanel,
    filters: elements.filtersPanel,
    slices: elements.slicesPanel,
    bookmarks: elements.bookmarksPanel
  };
  const tabs = {
    layers: elements.layersBtn,
    filters: elements.filtersBtn,
    slices: elements.slicesBtn,
    bookmarks: elements.bookmarksBtn
  };
  if (state.overlay.activePrimary !== 'explore') {
    openPrimaryPanel(elements, state, 'explore', elements.exploreWorkspaceTrigger);
  }
  state.activeExploreSection = nextSection;
  Object.entries(sections).forEach(([key, panel]) => {
    setPanelOpenState(panel, key === nextSection);
  });
  Object.entries(tabs).forEach(([key, tab]) => {
    if (!tab) return;
    tab.setAttribute('aria-selected', String(key === nextSection));
    tab.setAttribute('aria-expanded', String(key === nextSection));
  });
  if (elements.exploreWorkspacePanel) {
    elements.exploreWorkspacePanel.dataset.activeSection = nextSection;
  }
}

function togglePrimaryPanel(elements, state, key, trigger = null) {
  if (state.overlay.activePrimary === key) closePrimaryPanel(elements, state, key);
  else openPrimaryPanel(elements, state, key, trigger);
}

function openPrimaryPanel(elements, state, key, trigger = null) {
  if (elements.topActions?.classList.contains('is-expanded')) {
    elements.topActions.classList.remove('is-expanded');
    elements.overflowBtn?.setAttribute('aria-expanded', 'false');
  }
  ['search', 'explore', 'filters', 'layers', 'bookmarks', 'slices', 'courses', 'live'].forEach((name) => {
    const panel = getPanelByKey(elements, name);
    const button = getButtonByKey(elements, name);
    const isActive = name === key;
    if (panel) setPanelOpenState(panel, isActive);
    if (button) button.setAttribute('aria-expanded', String(isActive));
  });
  state.overlay.activePrimary = key;
  state.overlay.lastPrimaryTrigger = trigger || getButtonByKey(elements, key) || elements.searchInput || null;
  if (state.viewport.isMobile) {
    document.dispatchEvent(new CustomEvent('artemis:overlay-open', { detail: { source: 'primary', key } }));
  }
}

function closePrimaryPanel(elements, state, key) {
  const panel = getPanelByKey(elements, key);
  const button = getButtonByKey(elements, key);
  if (panel) setPanelOpenState(panel, false);
  if (button) button.setAttribute('aria-expanded', 'false');
  if (key === 'explore') {
    ['layers', 'filters', 'slices', 'bookmarks'].forEach((sectionKey) => {
      const sectionPanel = getPanelByKey(elements, sectionKey);
      if (sectionPanel) setPanelOpenState(sectionPanel, false);
      const sectionButton = getButtonByKey(elements, sectionKey);
      sectionButton?.setAttribute('aria-selected', 'false');
      sectionButton?.setAttribute('aria-expanded', 'false');
    });
  }
  if (state.overlay.activePrimary === key) state.overlay.activePrimary = null;
  if (key === 'live' && state?.liveState) state.liveState.isLiveMode = false;
}

function getPanelByKey(elements, key) {
  return {
    search: elements.searchDropdown,
    explore: elements.exploreWorkspacePanel,
    filters: elements.filtersPanel,
    layers: elements.layersPanel,
    bookmarks: elements.bookmarksPanel,
    slices: elements.slicesPanel,
    courses: elements.coursesPanel,
    live: elements.livePanel
  }[key] || null;
}

function getButtonByKey(elements, key) {
  return {
    filters: elements.filtersBtn,
    layers: elements.layersBtn,
    bookmarks: elements.bookmarksBtn,
    slices: elements.slicesBtn,
    explore: elements.exploreWorkspaceTrigger,
    courses: elements.coursesBtn,
    live: elements.liveBtn
  }[key] || null;
}

function toggleSearchClear(elements, state) {
  if (!elements.searchClearBtn) return;
  const hasSearch = Boolean(state.search);
  elements.searchClearBtn.hidden = !hasSearch;
  updateSearchEntryState(elements, hasSearch);
}

function clearSearchState(elements, state, { closePanel = false, notify = false } = {}) {
  if (elements.searchInput) elements.searchInput.value = '';
  state.search = '';
  toggleSearchClear(elements, state);
  if (closePanel) closePrimaryPanel(elements, state, 'search');
  if (notify) showUiSystemMessage('Поиск очищен', { variant: 'success', timeout: 2000 });
}

function restoreDefaultLayers(state) {
  state.enabledLayerIds = new Set(state.defaultEnabledLayerIds);
}

function restoreDefaultQuickLayers(state) {
  state.activeQuickLayerIds = new Set(state.defaultQuickLayerIds);
}

function resetExploreConstraints(elements, state, { keepSearch = false } = {}) {
  if (!keepSearch) clearSearchState(elements, state, { closePanel: true, notify: false });
  state.confidenceFilter = 'all';
  restoreDefaultLayers(state);
  restoreDefaultQuickLayers(state);
  const minYear = Number(elements.timelineStart?.min ?? state.currentStartYear);
  const maxYear = Number(elements.timelineEnd?.max ?? state.currentEndYear);
  state.timelineMode = 'range';
  state.timelineRangeStart = minYear;
  state.timelineRangeEnd = maxYear;
  state.timelinePointYear = maxYear;
  state.currentStartYear = minYear;
  state.currentEndYear = maxYear;
  if (elements.timelineStart) elements.timelineStart.value = String(state.currentStartYear);
  if (elements.timelineEnd) elements.timelineEnd.value = String(state.currentEndYear);
  syncLegacyDateInputs(elements, state);
  updateTimelineLabel(elements, state);
  updateTimelineViz(elements, state);
}

function updateSearchEntryState(elements, hasSearch) {
  const shell = elements?.searchShell;
  const helper = elements?.searchHelperState;
  const suggestions = elements?.searchSuggestions;
  const query = String(elements?.searchInput?.value || '').trim();
  if (shell?.classList) {
    shell.classList.toggle('is-search-active', hasSearch);
  }
  if (suggestions) {
    suggestions.hidden = hasSearch;
  }
  if (!helper) return;
  helper.textContent = hasSearch
    ? `Поиск активен: «${query || 'запрос'}». Выберите объект из результатов.`
    : 'Ищите объекты, места и исторические сюжеты.';
}

function setupSearchSuggestions(elements) {
  const container = elements?.searchSuggestions;
  if (!container) return;
  container.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-query]');
    if (!button) return;
    const input = elements?.searchInput;
    if (!input) return;
    input.value = String(button.dataset.query || '').trim();
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function updateSearchNoResultsState(elements, state) {
  const noResults = elements?.searchNoResultsState;
  if (!noResults) return false;
  const noResultsText = elements?.searchNoResultsText;
  const noResultsReset = elements?.searchNoResultsReset;

  const hasSearch = Boolean(state?.search);
  const canMeasureResults = Array.isArray(state?.searchResults);
  const isSearchEmpty = canMeasureResults && state.searchResults.length === 0;
  const isPrimaryEmpty = !state?.loading
    && !state?.error
    && Array.isArray(state?.filteredFeatures)
    && state.filteredFeatures.length === 0;
  const shouldShow = isPrimaryEmpty && hasSearch && canMeasureResults && isSearchEmpty;
  noResults.hidden = !shouldShow;
  if (shouldShow) {
    if (noResultsText) noResultsText.textContent = `По запросу «${state.search}» ничего не найдено. Измените поиск, фильтры или период.`;
    if (noResultsReset) noResultsReset.hidden = false;
  } else if (noResultsReset) {
    noResultsReset.hidden = true;
  }
  return shouldShow;
}

function renderCards(elements, state, map) {
  const list = elements.cardsRibbon;
  if (!list) {
    renderCardsState(elements, { ...state, loading: false, empty: !state.filteredFeatures.length });
    return;
  }
  const renderedRibbonFeatures = getRibbonRenderFeatures(state.filteredFeatures, getSelectedFeature(state), 80);
  const cardsKey = renderedRibbonFeatures.map((feature) => getFeatureUiId(feature)).join('|');
  if (!state.error && state.filteredFeatures.length && cardsKey === state.lastRenderedCardsKey) {
    syncSelectedCardState(elements, state.selectedFeatureId);
    syncMapHoveredCardState(elements, state.hoveredFeatureId);
    return;
  }
  state.lastRenderedCardsKey = cardsKey;
  list.replaceChildren();

  if (state.error) {
    renderCardsState(elements, { ...state, loading: false });
    return;
  }
  if (!state.filteredFeatures.length) {
    renderCardsState(elements, { ...state, loading: false, empty: true });
    return;
  }

  renderCardsState(elements, { ...state, loading: false, empty: false });
  renderedRibbonFeatures.forEach((feature) => {
    const props = normalizeProps(feature);
    const featureId = getFeatureUiId(feature);
    const item = document.createElement('li');
    item.className = `ribbon-card${state.selectedFeatureId === featureId ? ' is-selected' : ''}`;
    item.dataset.featureId = featureId;
    item.setAttribute('aria-selected', String(state.selectedFeatureId === featureId));
    item.tabIndex = 0;

    const image = buildImageNode(props, 'Изображение объекта');

    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('h4');
    title.textContent = String(props.name_ru || 'Без названия');
    const date = document.createElement('p');
    date.textContent = formatRange(props.date_start, props.date_end);
    const tag = document.createElement('p');
    tag.className = 'tag';
    tag.textContent = String(props.title_short || state.layerLookup.get(String(props.layer_id || '').trim()) || '').slice(0, 56);
    meta.append(title, date, tag);

    item.append(image, meta);
    item.addEventListener('click', () => {
      selectFeature(state, elements, map, feature, { centerOnMap: true, openDetail: true, scrollCard: false });
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectFeature(state, elements, map, feature, { centerOnMap: true, openDetail: true, scrollCard: false });
    });
    item.addEventListener('mouseenter', () => {
      setHoveredFeature(state, map, featureId);
      item.classList.add('is-hovered');
    });
    item.addEventListener('mouseleave', () => {
      clearHoveredFeature(state, map);
      item.classList.remove('is-hovered');
    });
    item.addEventListener('focus', () => {
      setHoveredFeature(state, map, featureId);
      item.classList.add('is-hovered');
    });
    item.addEventListener('blur', () => {
      clearHoveredFeature(state, map);
      item.classList.remove('is-hovered');
    });

    list.appendChild(item);
  });
  syncMapHoveredCardState(elements, state.hoveredFeatureId);
}

function getRibbonRenderFeatures(filteredFeatures, selectedFeature, limit = 80) {
  const safeLimit = Math.max(1, Number(limit) || 80);
  const visible = (Array.isArray(filteredFeatures) ? filteredFeatures : []).slice(0, safeLimit);
  if (!selectedFeature) return visible;
  const selectedId = getFeatureUiId(selectedFeature);
  if (!selectedId) return visible;
  if (visible.some((feature) => getFeatureUiId(feature) === selectedId)) return visible;
  const selectedInFiltered = (Array.isArray(filteredFeatures) ? filteredFeatures : [])
    .find((feature) => getFeatureUiId(feature) === selectedId);
  if (!selectedInFiltered) return visible;
  if (!visible.length) return [selectedInFiltered];
  return [...visible.slice(0, safeLimit - 1), selectedInFiltered];
}

function buildVisibilityKey(state) {
  const enabledLayerIds = [...state.enabledLayerIds].sort().join(',');
  const activeQuickLayerIds = [...state.activeQuickLayerIds].sort().join(',');
  return [
    state.search,
    state.currentStartYear,
    state.currentEndYear,
    state.confidenceFilter,
    enabledLayerIds,
    activeQuickLayerIds
  ].join('|');
}

function buildMapDataKey(state) {
  if (!state.filteredFeatureIds.length) return 'count:0';
  const head = state.filteredFeatureIds.slice(0, 5).join(',');
  const tail = state.filteredFeatureIds.slice(-5).join(',');
  return `count:${state.filteredFeatureIds.length};head:${head};tail:${tail}`;
}

function syncSelectedCardState(elements, selectedFeatureId) {
  if (!elements.cardsRibbon) return;
  const cards = elements.cardsRibbon.querySelectorAll('.ribbon-card[data-feature-id]');
  cards.forEach((card) => {
    const isSelected = Boolean(selectedFeatureId) && card.dataset.featureId === selectedFeatureId;
    card.classList.toggle('is-selected', isSelected);
    card.setAttribute('aria-selected', String(isSelected));
  });
}

function syncMapHoveredCardState(elements, hoveredFeatureId) {
  if (!elements.cardsRibbon) return;
  const cards = elements.cardsRibbon.querySelectorAll('.ribbon-card[data-feature-id]');
  cards.forEach((card) => {
    card.classList.toggle('is-map-hovered', Boolean(hoveredFeatureId) && card.dataset.featureId === hoveredFeatureId);
  });
}

function showDetailPanel(state, elements, map, feature, options = {}) {
  if (!elements.detailPanel || !elements.detailPanelBody) return;
  if (!feature) {
    hideDetailPanel(elements, state);
    return;
  }
  const featureId = getFeatureUiId(feature);
  if (!featureId) {
    hideDetailPanel(elements, state);
    return;
  }
  const viewMode = options.mode === 'full' ? 'full' : 'preview';
  const shouldSkipRerender = !options.force
    && !elements.detailPanel.hidden
    && state.detailOpenFeatureId === featureId
    && state.detailViewMode === viewMode;
  if (shouldSkipRerender) return;
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && !elements.detailPanel.contains(activeElement)) {
    state.detailFocusReturnEl = activeElement;
  }
  state.detailViewMode = viewMode;

  const props = normalizeProps(feature);
  const detail = viewMode === 'full'
    ? buildFullDetailContent(state, elements, map, props, feature)
    : buildPreviewDetailContent(state, elements, map, feature, props);

  elements.detailPanel.dataset.mode = viewMode;
  elements.detailPanelBody.dataset.mode = viewMode;
  elements.detailPanel.classList.toggle('is-preview-mode', viewMode === 'preview');
  elements.detailPanel.classList.toggle('is-full-mode', viewMode === 'full');
  updateDetailPanelHeading(elements, viewMode);
  setPanelOpenState(elements.detailPanel, true);
  elements.detailPanel.classList.add('is-selected');
  if (state.viewport.isMobile) {
    elements.detailPanel.classList.add('is-mobile-sheet');
    state.detailSheetExpanded = false;
    syncDetailSheetState(state, elements);
  } else {
    elements.detailPanel.classList.remove('is-mobile-sheet', 'is-expanded');
  }
  syncDetailPanelExpandControl(elements, state);
  syncTimelineInteractionLock(elements, state);
  syncDetailDockLayout(elements, state);
  document.dispatchEvent(new CustomEvent('artemis:overlay-open', { detail: { source: 'detail' } }));
  if (Number.isInteger(state.detailRenderFrameId)) {
    window.cancelAnimationFrame(state.detailRenderFrameId);
    state.detailRenderFrameId = null;
  }
  state.detailOpenFeatureId = featureId;
  elements.detailPanelBody.replaceChildren(detail);
  focusDetailPanelEntry(elements, viewMode);
}

function hideDetailPanel(elements, state = null) {
  if (!elements.detailPanel) return;
  if (state && Number.isInteger(state.detailRenderFrameId)) {
    window.cancelAnimationFrame(state.detailRenderFrameId);
    state.detailRenderFrameId = null;
  }
  if (state) state.detailOpenFeatureId = null;
  if (state) state.detailViewMode = 'preview';
  if (elements.detailPanel) {
    elements.detailPanel.dataset.mode = 'preview';
    if (elements.detailPanelBody) elements.detailPanelBody.dataset.mode = 'preview';
    elements.detailPanel.classList.add('is-preview-mode');
    elements.detailPanel.classList.remove('is-full-mode');
  }
  updateDetailPanelHeading(elements, 'preview');
  elements.detailPanel.classList.remove('is-selected');
  setPanelOpenState(elements.detailPanel, false);
  syncDetailPanelExpandControl(elements, state);
  syncTimelineInteractionLock(elements, state);
  syncDetailDockLayout(elements, state);
  if (state) restoreDetailFocus(elements, state);
}

function renderCardsState(elements, state) {
  if (!elements.cardsState) return;
  elements.cardsState.className = 'cards-state';
  elements.cardsState.replaceChildren();

  if (state.loading) {
    elements.cardsState.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Загрузка',
      message: 'Загрузка событий…'
    }));
    renderCardsSkeleton(elements, 4);
    return;
  }

  if (state.error) {
    elements.cardsState.appendChild(createInlineStateBlock({
      variant: 'error',
      title: 'Данные недоступны',
      message: state.error
    }));
    if (elements.cardsRibbon) elements.cardsRibbon.replaceChildren();
    return;
  }

  if (state.empty) {
    const emptyContext = buildEmptyStateContext(state, elements);
    elements.cardsState.appendChild(createInlineStateBlock({
      variant: 'warning',
      title: emptyContext.title,
      message: emptyContext.message,
      actionLabel: emptyContext.actionLabel,
      onAction: emptyContext.onAction
    }));
    if (elements.cardsRibbon) elements.cardsRibbon.replaceChildren();
    return;
  }

  if (state.warnings?.length) {
    elements.cardsState.appendChild(createInlineStateBlock({
      variant: 'warning',
      title: 'Limited data',
      message: state.warnings[0]
    }));
    return;
  }

  const ribbonLimit = 80;
  const isRibbonTruncated = state.filteredFeatures.length > ribbonLimit;
  if (isRibbonTruncated) {
    elements.cardsState.classList.add('cards-inline-note');
    elements.cardsState.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Лента ограничена',
      message: `Показаны первые ${ribbonLimit} из ${state.filteredFeatures.length} объектов.`
    }));
    return;
  }

  elements.cardsState.textContent = buildResultFeedbackLabel(state);
}

function hydrateTimeline(elements, years, state) {
  if (!elements.timelineStart || !elements.timelineEnd) return;
  elements.timelineStart.min = String(years.min);
  elements.timelineStart.max = String(years.max);
  elements.timelineEnd.min = String(years.min);
  elements.timelineEnd.max = String(years.max);
  state.timelineRangeStart = years.min;
  state.timelineRangeEnd = years.max;
  state.timelinePointYear = years.max;
  state.currentStartYear = state.timelineRangeStart;
  state.currentEndYear = state.timelineRangeEnd;
  elements.timelineStart.value = String(state.currentStartYear);
  elements.timelineEnd.value = String(state.currentEndYear);
  renderTimelineAxis(elements, years);
  syncLegacyDateInputs(elements, state);
  applyTimelineModeUi(elements, state);
  updateTimelineLabel(elements, state);
  updateTimelineViz(elements, state);
}

function updateTimelineLabel(elements, state) {
  if (elements.timelineLabel) {
    elements.timelineLabel.textContent = state.timelineMode === 'point' ? 'Selected point' : 'Selected range';
  }
  if (elements.timelineCapsule) {
    const selectedRangeText = state.timelineMode === 'point'
      ? `${state.currentStartYear} CE`
      : `${state.currentStartYear} — ${state.currentEndYear} CE`;
    elements.timelineCapsule.textContent = `Selected: ${selectedRangeText}`;
    elements.timelineCapsule.dataset.range = `${state.currentStartYear}:${state.currentEndYear}`;
    elements.timelineCapsule.dataset.mode = state.timelineMode;
  }
}

function updateTimelineViz(elements, state) {
  if (!elements.timelineActiveRange) return;
  const min = Number(elements.timelineStart?.min ?? state.currentStartYear);
  const max = Number(elements.timelineStart?.max ?? state.currentEndYear);
  const span = Math.max(1, max - min);
  const left = ((state.currentStartYear - min) / span) * 100;
  const right = ((state.currentEndYear - min) / span) * 100;
  elements.timelineActiveRange.style.left = `${left}%`;
  elements.timelineActiveRange.style.right = `${100 - right}%`;
  elements.timelineTrackWrap?.style.setProperty('--timeline-left', `${left}%`);
  elements.timelineTrackWrap?.style.setProperty('--timeline-right', `${right}%`);
  if (elements.timelineKnobStart) elements.timelineKnobStart.style.left = `${left}%`;
  if (elements.timelineKnobEnd) elements.timelineKnobEnd.style.left = `${right}%`;
}


function applyTimelineRange(elements, state, {
  start = state.currentStartYear,
  end = state.currentEndYear,
  snap = false,
  commit = false
} = {}) {
  const min = Number(elements.timelineStart?.min ?? state.yearBounds?.min ?? start);
  const max = Number(elements.timelineStart?.max ?? state.yearBounds?.max ?? end);
  const step = Number(elements.timelineStart?.step || 1);
  const snapStep = snap ? getTimelineSnapStep(min, max) : step;
  const normalize = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    const rounded = Math.round(num / snapStep) * snapStep;
    return Math.min(max, Math.max(min, rounded));
  };

  const normalizedStart = normalize(start);
  const normalizedEnd = normalize(end);
  if (state.timelineMode === 'point') {
    state.timelinePointYear = normalizedStart;
    state.currentStartYear = normalizedStart;
    state.currentEndYear = normalizedStart;
  } else {
    state.currentStartYear = Math.min(normalizedStart, normalizedEnd);
    state.currentEndYear = Math.max(normalizedStart, normalizedEnd);
    state.timelineRangeStart = state.currentStartYear;
    state.timelineRangeEnd = state.currentEndYear;
  }

  if (elements.timelineStart) elements.timelineStart.value = String(state.currentStartYear);
  if (elements.timelineEnd) elements.timelineEnd.value = String(state.currentEndYear);
  syncLegacyDateInputs(elements, state);
  updateTimelineLabel(elements, state);
  updateTimelineViz(elements, state);
  if (commit) state.applyState?.();
}

function setTimelineMode(elements, state, mode, { commit = false } = {}) {
  if (!mode || state.timelineMode === mode) return;
  state.timelineMode = mode === 'range' ? 'range' : 'point';
  if (state.timelineMode === 'point') {
    state.timelineRangeStart = state.currentStartYear;
    state.timelineRangeEnd = state.currentEndYear;
    const pointYear = Number.isFinite(state.timelinePointYear) ? state.timelinePointYear : state.currentEndYear;
    applyTimelineRange(elements, state, {
      start: pointYear,
      end: pointYear,
      snap: false,
      commit
    });
    return;
  }

  const rangeStart = Number.isFinite(state.timelineRangeStart) ? state.timelineRangeStart : state.currentStartYear;
  const rangeEnd = Number.isFinite(state.timelineRangeEnd) ? state.timelineRangeEnd : state.currentEndYear;
  applyTimelineRange(elements, state, {
    start: rangeStart,
    end: rangeEnd,
    snap: false,
    commit
  });
}

function applyTimelineModeUi(elements, state) {
  const isPointMode = state.timelineMode === 'point';
  elements.timelineRoot?.classList.toggle('is-point-mode', isPointMode);
  elements.timelineRoot?.classList.toggle('is-range-mode', !isPointMode);
  elements.timelineModePointBtn?.classList.toggle('is-active', isPointMode);
  elements.timelineModeRangeBtn?.classList.toggle('is-active', !isPointMode);
  elements.timelineModePointBtn?.setAttribute('aria-pressed', String(isPointMode));
  elements.timelineModeRangeBtn?.setAttribute('aria-pressed', String(!isPointMode));
  elements.timelineKnobEnd?.setAttribute('aria-hidden', String(isPointMode));
  if (elements.timelineEnd) elements.timelineEnd.disabled = isPointMode;
}

function setupTimelinePointerInteractions(elements, state) {
  const track = elements.timelineTrackWrap;
  if (!track || !elements.timelineStart || !elements.timelineEnd) return;

  let activeHandle = null;
  let activePointerId = null;
  let queuedStart = null;
  let queuedEnd = null;
  let frameId = null;

  const scheduleApply = () => {
    if (frameId !== null) return;
    frameId = window.requestAnimationFrame(() => {
      frameId = null;
      if (queuedStart === null || queuedEnd === null) return;
      applyTimelineRange(elements, state, {
        start: queuedStart,
        end: queuedEnd,
        snap: true,
        commit: true
      });
    });
  };

  const getYearByPointer = (clientX) => {
    const rect = track.getBoundingClientRect();
    const min = Number(elements.timelineStart.min);
    const max = Number(elements.timelineStart.max);
    const span = Math.max(1, max - min);
    const clampedX = Math.min(rect.right, Math.max(rect.left, clientX));
    const ratio = rect.width > 0 ? (clampedX - rect.left) / rect.width : 0;
    return min + (ratio * span);
  };

  const queueByPointer = (clientX) => {
    const year = getYearByPointer(clientX);
    if (state.timelineMode === 'point') {
      queuedStart = year;
      queuedEnd = year;
    } else if (activeHandle === 'start') {
      queuedStart = year;
      queuedEnd = state.currentEndYear;
    } else {
      queuedStart = state.currentStartYear;
      queuedEnd = year;
    }
    scheduleApply();
  };

  const setDraggingState = (isDragging) => {
    track.classList.toggle('is-dragging', isDragging);
    elements.timelineKnobStart?.classList.toggle('is-active', isDragging && activeHandle === 'start');
    elements.timelineKnobEnd?.classList.toggle('is-active', state.timelineMode !== 'point' && isDragging && activeHandle === 'end');
  };

  const startDrag = (handle, event, { queue = true } = {}) => {
    activeHandle = handle;
    activePointerId = event.pointerId;
    track.setPointerCapture?.(event.pointerId);
    setDraggingState(true);
    if (queue) queueByPointer(event.clientX);
  };

  const stopDrag = () => {
    if (activePointerId !== null) {
      track.releasePointerCapture?.(activePointerId);
    }
    activePointerId = null;
    activeHandle = null;
    queuedStart = null;
    queuedEnd = null;
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
    setDraggingState(false);
  };

  const pickClosestHandle = (clientX) => {
    const rect = track.getBoundingClientRect();
    const left = Number(elements.timelineActiveRange?.style.left?.replace('%', '') || 0);
    const right = 100 - Number(elements.timelineActiveRange?.style.right?.replace('%', '') || 100);
    const startX = rect.left + ((left / 100) * rect.width);
    const endX = rect.left + ((right / 100) * rect.width);
    return Math.abs(clientX - startX) <= Math.abs(clientX - endX) ? 'start' : 'end';
  };

  [elements.timelineStart, elements.timelineEnd].forEach((input) => {
    input.style.pointerEvents = 'none';
  });

  elements.timelineKnobStart?.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    startDrag('start', event, { queue: false });
  });
  elements.timelineKnobEnd?.addEventListener('pointerdown', (event) => {
    if (state.timelineMode === 'point') return;
    event.preventDefault();
    startDrag('end', event, { queue: false });
  });

  track.addEventListener('pointerdown', (event) => {
    if (event.target === elements.timelineKnobStart || event.target === elements.timelineKnobEnd) return;
    event.preventDefault();
    const nextHandle = state.timelineMode === 'point' ? 'start' : pickClosestHandle(event.clientX);
    startDrag(nextHandle, event);
  });
  track.addEventListener('pointermove', (event) => {
    if (activePointerId !== event.pointerId || !activeHandle) return;
    queueByPointer(event.clientX);
  });
  track.addEventListener('pointerup', stopDrag);
  track.addEventListener('pointercancel', stopDrag);
  track.addEventListener('lostpointercapture', stopDrag);
}

function getTimelineSnapStep(minYear, maxYear) {
  const span = Math.max(1, Number(maxYear) - Number(minYear));
  if (span > 4000) return 100;
  if (span > 1000) return 50;
  if (span > 400) return 10;
  return 1;
}

function syncLegacyDateInputs(elements, state) {
  if (elements.dateFrom) elements.dateFrom.value = String(state.currentStartYear);
  if (elements.dateTo) elements.dateTo.value = String(state.currentEndYear);
  applyTimelineModeUi(elements, state);
}

function collectYearBounds(features) {
  const years = features.flatMap((feature) => {
    const p = normalizeProps(feature);
    return [parseYear(p.date_start), parseYear(p.date_construction_end), parseYear(p.date_end)].filter(Number.isFinite);
  });
  if (!years.length) return { min: 0, max: 2026 };
  return { min: Math.min(...years), max: Math.max(...years) };
}

function collectConfidenceValues(features) {
  return [...new Set(features.map((f) => String(normalizeProps(f).coordinates_confidence || '').trim().toLowerCase()).filter(Boolean))].slice(0, 3);
}

function buildMapYearFilter(start, end) {
  return ['all',
    ['<=', ['coalesce', ['to-number', ['get', 'date_start']], ['to-number', ['get', 'date_end']], end], end],
    ['>=', ['coalesce', ['to-number', ['get', 'date_end']], ['to-number', ['get', 'date_start']], start], start]
  ];
}

function buildMapFilterExpression(state) {
  const timeline = buildMapYearFilter(state.currentStartYear, state.currentEndYear);
  const quickLayer = buildQuickLayerFilter(state);
  if (!quickLayer) return timeline;
  return ['all', timeline, quickLayer];
}

function buildQuickLayerFilter(state) {
  if (!Array.isArray(state.quickLayerOptions) || !state.quickLayerOptions.length) return null;
  const allIds = state.quickLayerOptions.map((item) => item.id);
  const activeIds = allIds.filter((id) => state.activeQuickLayerIds.has(id));
  if (activeIds.length === allIds.length) return null;
  return ['any',
    ['!', ['in', ['get', 'layer_id'], ['literal', allIds]]],
    ['in', ['get', 'layer_id'], ['literal', activeIds]]
  ];
}

function isFeatureAllowedByQuickLayers(feature, state) {
  if (!feature || !Array.isArray(state.quickLayerOptions) || !state.quickLayerOptions.length) return true;
  const layerId = String(normalizeProps(feature).layer_id || '').trim();
  if (!layerId) return true;
  const isQuickOption = state.quickLayerOptions.some((item) => item.id === layerId);
  if (!isQuickOption) return true;
  return state.activeQuickLayerIds.has(layerId);
}

function initializeQuickLayerState(state) {
  const counts = new Map();
  state.allFeatures.forEach((feature) => {
    const layerId = String(normalizeProps(feature).layer_id || '').trim();
    if (!layerId) return;
    counts.set(layerId, Number(counts.get(layerId) || 0) + 1);
  });
  const quickLayerOptions = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([id, count]) => ({ id, count, label: state.layerLookup.get(id) || id }));
  state.quickLayerOptions = quickLayerOptions;
  state.defaultQuickLayerIds = new Set(quickLayerOptions.map((item) => item.id));
  state.activeQuickLayerIds = new Set(state.defaultQuickLayerIds);
}

function renderQuickLayerFilter(elements, state) {
  const container = elements.quickLayerFilter;
  if (!container) return;
  container.replaceChildren();
  if (!Array.isArray(state.quickLayerOptions) || !state.quickLayerOptions.length) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  state.quickLayerOptions.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = state.activeQuickLayerIds.has(item.id);
    btn.className = `quick-layer-filter-btn${isActive ? ' is-active' : ''}`;
    btn.textContent = item.label;
    btn.setAttribute('aria-pressed', String(isActive));
    btn.addEventListener('click', () => {
      if (state.activeQuickLayerIds.has(item.id)) state.activeQuickLayerIds.delete(item.id);
      else state.activeQuickLayerIds.add(item.id);
      renderQuickLayerFilter(elements, state);
      state.applyState?.();
    });
    container.appendChild(btn);
  });
}

function updateCounters(elements, state, map) {
  if (!isDebugTelemetryMode()) return;
  const diagnostics = getMapBuildDiagnostics(map);
  if (elements.resultsCount) elements.resultsCount.textContent = String(state.filteredFeatures.length);
  if (elements.mapCount) elements.mapCount.textContent = String(getMapFeatureCount(map));
  if (elements.sourceCount) elements.sourceCount.textContent = String(diagnostics.inputTotal);
  if (elements.pointValidCount) elements.pointValidCount.textContent = String(diagnostics.validPoints);
  const activeFilters = getActiveFiltersCount(state);
  if (elements.activeFiltersCount) elements.activeFiltersCount.textContent = String(activeFilters);
}

function getResearchContextPeriodLabel(state) {
  if (!state) return 'Period: —';
  if (state.timelineMode === 'point') return `Period: ${state.currentStartYear} CE`;
  return `Period: ${state.currentStartYear}–${state.currentEndYear} CE`;
}

function buildResearchContextSnapshotKey(state) {
  const enabledLayerIds = [...(state?.enabledLayerIds || [])].sort().join(',');
  const quickLayerIds = [...(state?.activeQuickLayerIds || [])].sort().join(',');
  return [
    state?.timelineMode,
    state?.currentStartYear,
    state?.currentEndYear,
    state?.search || '',
    state?.confidenceFilter || '',
    enabledLayerIds,
    quickLayerIds,
    state?.selectedFeatureId || ''
  ].join('|');
}

function markResearchContextAsSaved(state) {
  state.researchContextBaselineKey = buildResearchContextSnapshotKey(state);
  state.researchContextDirty = false;
  state.researchContextLastRenderedKey = '';
}

function updateResearchContextBar(elements, state) {
  if (!elements?.researchContextBar) return;
  const snapshotKey = buildResearchContextSnapshotKey(state);
  if (!state.researchContextBaselineKey && !state.loading) {
    markResearchContextAsSaved(state);
  } else if (state.researchContextBaselineKey && snapshotKey !== state.researchContextBaselineKey) {
    state.researchContextDirty = true;
  }

  const periodLabel = getResearchContextPeriodLabel(state);
  const layersLabel = `Layers: ${Math.max(0, state?.enabledLayerIds?.size || 0)}`;
  const draftSliceCount = state?.sliceSelectionSet instanceof Set ? Math.max(0, state.sliceSelectionSet.size) : 0;
  const visibleObjectsCount = Math.max(0, state?.filteredFeatures?.length || 0);
  const hasAnchor = Boolean(state?.sliceAnchorFeatureId);
  const objectsLabel = draftSliceCount > 0
    ? `In slice: ${draftSliceCount}`
    : `Objects: ${visibleObjectsCount}${hasAnchor ? ' · anchor' : ''}`;
  const hasOpenedSliceTitle = Boolean(String(state?.sliceOpenedTitle || '').trim());
  const sliceStateLabel = state.researchContextDirty ? 'Modified' : 'Saved';
  const rawSliceTitle = hasOpenedSliceTitle ? String(state.sliceOpenedTitle).trim() : 'New Slice';
  const rawTriggerLabel = `Slice: ${rawSliceTitle}`;
  const triggerLabel = truncateText(rawTriggerLabel, 40);
  const triggerTitle = hasOpenedSliceTitle
    ? `Slice: ${rawSliceTitle}`
    : 'Slice: New Slice';
  const renderKey = [periodLabel, layersLabel, objectsLabel, sliceStateLabel, triggerLabel, triggerTitle, draftSliceCount, hasAnchor].join('||');
  if (renderKey === state.researchContextLastRenderedKey) return;
  state.researchContextLastRenderedKey = renderKey;

  if (elements.researchPeriodMeta) elements.researchPeriodMeta.textContent = periodLabel;
  if (elements.researchLayersMeta) elements.researchLayersMeta.textContent = layersLabel;
  if (elements.researchObjectsMeta) elements.researchObjectsMeta.textContent = objectsLabel;
  if (elements.researchSliceState) {
    elements.researchSliceState.textContent = sliceStateLabel;
    elements.researchSliceState.classList.toggle('is-dirty', state.researchContextDirty);
    elements.researchSliceState.classList.toggle('is-saved', !state.researchContextDirty);
  }
  if (elements.researchSliceTrigger) {
    elements.researchSliceTrigger.textContent = triggerLabel;
    elements.researchSliceTrigger.title = triggerTitle;
  }
}

function updateStatus(elements, state, map) {
  if (!elements.statusMessage) return;
  if (!isDebugTelemetryMode()) {
    elements.statusMessage.textContent = 'Карта готова';
    return;
  }
  const diagnostics = getMapBuildDiagnostics(map);
  const bucketCount = Object.keys(state.timeAggregation || {}).length;
  elements.statusMessage.textContent = `Карта готова (${diagnostics.inputTotal}/${getMapFeatureCount(map)}; выборка ${state.filteredFeatures.length}; бакеты ${bucketCount}).`;
}

function selectFeature(state, elements, map, feature, options = {}) {
  const selectedFeature = state.allFeatures.find((candidate) => getFeatureUiId(candidate) === getFeatureUiId(feature));
  if (!selectedFeature) return;
  state.selectedFeatureId = getFeatureUiId(selectedFeature);
  setSelectedFeatureId(map, state.selectedFeatureId);
  renderBookmarksPanel(elements, state, map);
  if (options.centerOnMap) focusFeatureOnMap(map, selectedFeature);
  if (options.openDetail !== false) {
    showDetailPanel(state, elements, map, selectedFeature);
  }
  if (!elements.cardsRibbon && !elements.cardsState) return;
  renderCards(elements, state, map);
  syncSelectedCardState(elements, state.selectedFeatureId);
  if (options.scrollCard) {
    const escapedId = typeof CSS?.escape === 'function' ? CSS.escape(state.selectedFeatureId) : state.selectedFeatureId;
    const selectedNode = elements.cardsRibbon?.querySelector(`.ribbon-card[data-feature-id="${escapedId}"]`);
    selectedNode?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function clearSelection(state, elements, map) {
  state.selectedFeatureId = null;
  setSelectedFeatureId(map, null);
  hideDetailPanel(elements, state);
  syncSelectedCardState(elements, null);
  renderCards(elements, state, map);
}

function setHoveredFeature(state, map, featureId) {
  const normalizedId = featureId ? String(featureId) : null;
  if (state.hoveredFeatureId === normalizedId) return;
  state.hoveredFeatureId = normalizedId;
  setHoveredFeatureId(map, normalizedId);
}

function clearHoveredFeature(state, map) {
  if (!state.hoveredFeatureId) return;
  state.hoveredFeatureId = null;
  setHoveredFeatureId(map, null);
}

function closeDetailView(state, elements) {
  hideDetailPanel(elements, state);
}

function focusDetailPanelEntry(elements, mode = 'preview') {
  if (!elements?.detailPanel || elements.detailPanel.hidden) return;
  const preferredTarget = mode === 'preview'
    ? elements.detailPanel.querySelector('[data-action="open-full-detail"]')
    : null;
  const fallbackTarget = preferredTarget
    || elements.detailPanel.querySelector('#detail-panel-close')
    || elements.detailPanel.querySelector('button, [href], [tabindex]:not([tabindex="-1"])');
  if (fallbackTarget instanceof HTMLElement) {
    fallbackTarget.focus({ preventScroll: true });
    return;
  }
  elements.detailPanel.focus?.({ preventScroll: true });
}

function restoreDetailFocus(elements, state) {
  const returnTarget = state?.detailFocusReturnEl;
  if (returnTarget instanceof HTMLElement && returnTarget.isConnected && !returnTarget.hasAttribute('disabled')) {
    returnTarget.focus({ preventScroll: true });
  } else {
    const fallback = elements?.searchInput || elements?.filtersBtn || elements?.layersBtn || elements?.bookmarksBtn;
    fallback?.focus?.({ preventScroll: true });
  }
  if (state) state.detailFocusReturnEl = null;
}

function getSelectedFeature(state) {
  return state.allFeatures.find((feature) => getFeatureUiId(feature) === state.selectedFeatureId) || null;
}

function getFeatureById(state, featureId) {
  const normalizedId = featureId ? String(featureId) : '';
  if (!normalizedId) return null;
  return state.allFeatures.find((feature) => getFeatureUiId(feature) === normalizedId) || null;
}

function renderCardsSkeleton(elements, count = 4) {
  if (!elements.cardsRibbon) return;
  const skeletons = Array.from({ length: count }, () => {
    const item = document.createElement('li');
    item.className = 'skeleton-card';
    return item;
  });
  elements.cardsRibbon.replaceChildren(...skeletons);
}

function initializeAnimatedPanels(elements) {
  [elements.searchDropdown, elements.exploreWorkspacePanel, elements.filtersPanel, elements.layersPanel, elements.bookmarksPanel, elements.slicesPanel, elements.detailPanel]
    .filter(Boolean)
    .forEach((panel) => {
      panel.classList.remove('is-open', 'is-closing');
      panel.setAttribute('aria-hidden', 'true');
    });
}

function setPanelOpenState(panel, open) {
  if (!panel) return;
  if (open) {
    panel.hidden = false;
    panel.classList.remove('is-closing');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    panel.dataset.state = 'open';
    return;
  }
  panel.classList.remove('is-open');
  panel.classList.add('is-closing');
  panel.setAttribute('aria-hidden', 'true');
  panel.dataset.state = 'closed';
  window.setTimeout(() => {
    if (panel.classList.contains('is-open')) return;
    panel.hidden = true;
    panel.classList.remove('is-closing');
  }, 260);
}

function closeTopOverlay(elements, state, map) {
  const rejectModal = document.getElementById('moderation-reject-modal');
  if (rejectModal && !rejectModal.hidden) {
    document.querySelector('[data-moderation-action="close-reject-modal"]')?.click();
    return true;
  }
  const loginModal = document.getElementById('login-modal');
  if (loginModal && !loginModal.hidden) {
    loginModal.querySelector('[data-close-modal]')?.click();
    return true;
  }
  const moderationWorkspace = document.getElementById('moderation-workspace');
  if (moderationWorkspace && !moderationWorkspace.hidden && moderationWorkspace.classList.contains('is-open')) {
    moderationWorkspace.querySelector('[data-moderation-action="close-workspace"]')?.click();
    return true;
  }
  const ugcPanel = document.getElementById('ugc-panel');
  if (ugcPanel && !ugcPanel.hidden) {
    document.getElementById('ugc-close-btn')?.click();
    return true;
  }
  if (state.overlay.activePrimary) {
    closePrimaryPanel(elements, state, state.overlay.activePrimary);
    return true;
  }
  if (!elements.detailPanel?.hidden) {
    clearSelection(state, elements, map);
    return true;
  }
  return false;
}

function restoreOverlayFocus(lastTrigger, elements) {
  const fallback = elements.filtersBtn || elements.layersBtn || elements.bookmarksBtn || elements.searchInput;
  const target = lastTrigger && typeof lastTrigger.focus === 'function' ? lastTrigger : fallback;
  target?.focus?.({ preventScroll: true });
}

function renderTimelineAxis(elements, years) {
  if (!elements.timelineAxis) return;
  const min = Number(years?.min);
  const max = Number(years?.max);
  const span = Math.max(1, max - min);
  const anchors = TIMELINE_SEMANTIC_ANCHORS.map((anchor) => {
    const position = ((anchor.year - min) / span) * 100;
    return { ...anchor, position: Math.max(0, Math.min(100, position)) };
  });
  elements.timelineAxis.replaceChildren(...anchors.map((anchor) => {
    const node = document.createElement('span');
    node.className = 'timeline-anchor';
    node.style.left = `${anchor.position}%`;
    node.title = `${anchor.label} — ${anchor.description}`;
    const tick = document.createElement('span');
    tick.className = 'timeline-anchor-year';
    tick.textContent = anchor.label;
    const label = document.createElement('span');
    label.className = 'timeline-anchor-label';
    label.textContent = anchor.description;
    node.append(tick, label);
    return node;
  }));
}

function isFeatureLike(feature) {
  return feature && typeof feature === 'object' && (feature.type === 'Feature' || feature.properties || feature.geometry);
}
function enrichFeatureForUiKey(feature, index) {
  const properties = normalizeProps(feature);
  const sourceId = String(properties.id || properties.object_id || properties.slug || '').trim();
  const coords = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates.join(':') : String(index);
  const uiKey = sourceId || `${String(properties.name_ru || 'feature').trim()}::${coords}::${index}`;
  return {
    ...feature,
    properties: {
      ...properties,
      _ui_id: uiKey
    }
  };
}
function getFeatureUiId(feature) {
  return String(normalizeProps(feature)._ui_id || '');
}
function normalizeProps(feature) {
  return feature?.properties && typeof feature.properties === 'object' ? feature.properties : {};
}
function buildLayerLookup(layers, allFeatures) {
  const lookup = new Map();
  (Array.isArray(layers) ? layers : []).forEach((layer) => {
    const id = String(layer?.layer_id || layer?.id || '').trim();
    if (id) lookup.set(id, String(layer?.name_ru || layer?.label || id));
  });
  allFeatures.forEach((f) => {
    const id = String(normalizeProps(f).layer_id || '').trim();
    if (id && !lookup.has(id)) lookup.set(id, id);
  });
  return lookup;
}
function parseYear(value) {
  const n = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : NaN;
}
function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.join(' ');
  return String(tags || '');
}
function formatRange(start, end) {
  return formatRangeLabel(start, end);
}
function formatRangeLabel(start, end) {
  const s = parseYear(start);
  const e = parseYear(end);
  if (Number.isFinite(s) && Number.isFinite(e)) return `${formatYearLabel(s)}—${formatYearLabel(e)}`;
  if (Number.isFinite(s)) return formatYearLabel(s);
  if (Number.isFinite(e)) return formatYearLabel(e);
  return 'Дата не указана';
}
function formatYearLabel(year) {
  const value = Number(year);
  if (!Number.isFinite(value)) return 'Неизвестно';
  if (value < 0) return `${Math.abs(value)} BCE`;
  if (value === 0) return '1 BCE/1 CE';
  return `${value} CE`;
}
function getPreviewDescription(props) {
  const shortDescription = String(props.short_description || props.description_short || '').trim();
  if (shortDescription) return truncateText(shortDescription, 240);
  const fallbackDescription = String(props.description || props.title_short || '').trim();
  if (!fallbackDescription) return '';
  return truncateText(fallbackDescription.replace(/\s+/g, ' '), 280);
}
function truncateText(value, limit) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1).trimEnd()}…`;
}
function buildImageNode(props, fallbackAlt, large = false) {
  const safeImage = normalizeSafeUrl(String(props.image_url || '').trim(), { allowRelative: true });
  if (safeImage) {
    const image = document.createElement('img');
    setSafeImageSource(image, safeImage, { allowRelative: true });
    image.alt = toSafeText(props.name_ru || fallbackAlt, 'Изображение объекта');
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => {
      image.replaceWith(createPlaceholderImage({
        large,
        title: 'Изображение пока недоступно',
        note: large ? 'Мы добавим визуальные материалы, когда они появятся в источниках.' : ''
      }));
    }, { once: true });
    return image;
  }
  return createPlaceholderImage({
    large,
    title: 'Изображение пока недоступно',
    note: large ? 'Мы добавим визуальные материалы, когда они появятся в источниках.' : ''
  });
}
function createPlaceholderImage({ large = false, title = 'Изображение пока недоступно', note = '' } = {}) {
  const placeholder = document.createElement('div');
  placeholder.className = `img-placeholder${large ? ' is-large' : ''}`;
  const content = document.createElement('div');
  content.className = 'img-placeholder-content';
  const icon = document.createElement('span');
  icon.className = 'img-placeholder-icon';
  icon.textContent = '🖼';
  const titleNode = document.createElement('p');
  titleNode.className = 'img-placeholder-title';
  titleNode.textContent = title;
  content.append(icon, titleNode);
  if (note) {
    const noteNode = document.createElement('p');
    noteNode.className = 'img-placeholder-note';
    noteNode.textContent = note;
    content.appendChild(noteNode);
  }
  placeholder.appendChild(content);
  return placeholder;
}
function getPrimaryTitle(props) {
  return String(props.name_ru || props.name_en || props.title_short || 'Без названия');
}
function getConfidenceLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'exact') return 'Точные координаты';
  if (normalized === 'approximate') return 'Примерные координаты';
  if (normalized === 'conditional') return 'Условные координаты';
  return normalized;
}
function buildBadge(label, tone = '') {
  const badge = document.createElement('span');
  badge.className = `detail-badge${tone ? ` is-${tone}` : ''}`;
  badge.textContent = String(label || 'Неизвестно');
  return badge;
}
function createSectionTitle(value) {
  const title = document.createElement('h4');
  title.className = 'detail-section-title';
  title.textContent = String(value || '');
  return title;
}
function appendMetaRow(parent, label, value) {
  if (!parent || value === null || value === undefined || value === '') return null;
  const row = document.createElement('div');
  row.className = 'detail-meta-row';
  const key = document.createElement('span');
  key.className = 'detail-meta-label';
  key.textContent = String(label || '');
  const val = document.createElement('span');
  val.className = 'detail-meta-value';
  val.textContent = String(value);
  row.append(key, val);
  parent.appendChild(row);
  return row;
}
function createDetailRow(label, value = '') {
  const row = document.createElement('section');
  row.className = 'detail-section detail-min-row';
  const labelNode = document.createElement('h3');
  labelNode.className = 'detail-section-title';
  labelNode.textContent = String(label || '');
  const valueNode = document.createElement('div');
  valueNode.className = 'detail-meta-value';
  if (value) valueNode.textContent = String(value);
  row.append(labelNode, valueNode);
  return row;
}
function formatCoordinates(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return '';
  const [lng, lat] = coords;
  if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) return '';
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}
function extractDomain(value) {
  const safeUrl = normalizeSafeUrl(String(value || '').trim());
  if (!safeUrl) return '';
  try {
    return new URL(safeUrl).hostname.replace(/^www\./, '');
  } catch (_error) {
    return '';
  }
}
function getRelatedFeatures(state, feature, limit = 3) {
  const currentProps = normalizeProps(feature);
  const currentId = getFeatureUiId(feature);
  const currentLayer = String(currentProps.layer_id || '').trim();
  const currentStart = parseYear(currentProps.date_start ?? currentProps.date_end);
  const currentEnd = parseYear(currentProps.date_end ?? currentProps.date_start);
  return state.allFeatures
    .filter((candidate) => getFeatureUiId(candidate) !== currentId)
    .map((candidate) => {
      const props = normalizeProps(candidate);
      const layerScore = String(props.layer_id || '').trim() === currentLayer ? 2 : 0;
      const candidateStart = parseYear(props.date_start ?? props.date_end);
      const candidateEnd = parseYear(props.date_end ?? props.date_start);
      const hasDates = Number.isFinite(currentStart) && Number.isFinite(currentEnd) && Number.isFinite(candidateStart) && Number.isFinite(candidateEnd);
      const overlap = hasDates && candidateStart <= currentEnd && candidateEnd >= currentStart;
      const rangeDistance = hasDates ? Math.abs(((candidateStart + candidateEnd) / 2) - ((currentStart + currentEnd) / 2)) : Number.MAX_SAFE_INTEGER;
      const timeScore = overlap ? 1 : 0;
      return { candidate, score: layerScore + timeScore, rangeDistance };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.rangeDistance - b.rangeDistance)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}
function createDetailSkeleton() {
  const skeleton = document.createElement('div');
  skeleton.className = 'detail-skeleton';
  for (let index = 0; index < 5; index += 1) {
    const line = document.createElement('div');
    line.className = 'detail-skeleton-line';
    skeleton.appendChild(line);
  }
  return skeleton;
}


function setupResponsiveUi(elements, state, map) {
  const apply = debounce(() => applyResponsiveLayout(elements, state, map), 80);
  window.addEventListener('resize', apply, { passive: true });
  window.addEventListener('orientationchange', apply, { passive: true });
}

function applyResponsiveLayout(elements, state, map) {
  const width = window.innerWidth || document.documentElement.clientWidth || 1280;
  const mode = width <= 720 ? 'mobile' : (width <= 1080 ? 'tablet' : 'desktop');
  state.viewport = { mode, isMobile: mode === 'mobile', isTablet: mode === 'tablet' };
  document.body.dataset.viewport = mode;
  const rootStyle = document.documentElement?.style;
  if (rootStyle && elements.topHeader) {
    const headerHeight = Math.max(44, Math.round(elements.topHeader.getBoundingClientRect().height));
    rootStyle.setProperty('--top-header-height', `${headerHeight}px`);
    if (elements.researchContextBar) {
      const stripHeight = Math.max(56, Math.round(elements.researchContextBar.getBoundingClientRect().height));
      rootStyle.setProperty('--workspace-strip-height', `${stripHeight}px`);
    }
  }
  if (rootStyle) {
    const bottomPanel = document.getElementById('bottom-panel');
    if (bottomPanel) {
      const panelHeight = Math.max(72, Math.round(bottomPanel.getBoundingClientRect().height));
      rootStyle.setProperty('--bottom-panel-height', `${panelHeight}px`);
    }
  }
  if (elements.topActions) {
    elements.topActions.classList.toggle('is-collapsed', mode !== 'desktop');
    if (mode === 'desktop') elements.topActions.classList.remove('is-expanded');
  }
  if (elements.overflowBtn) {
    elements.overflowBtn.hidden = mode === 'desktop';
    elements.overflowBtn.setAttribute('aria-expanded', elements.topActions?.classList.contains('is-expanded') ? 'true' : 'false');
  }
  if (!state.viewport.isMobile) {
    state.detailSheetExpanded = false;
    elements.detailPanel?.classList.remove('is-mobile-sheet', 'is-expanded');
  } else if (elements.detailPanel && !elements.detailPanel.hidden) {
    elements.detailPanel.classList.add('is-mobile-sheet');
    syncDetailSheetState(state, elements);
  }
  syncDetailPanelExpandControl(elements, state);
  syncTimelineInteractionLock(elements, state);
  syncDetailDockLayout(elements, state);
  map?.resize?.();
}

function syncDetailDockLayout(elements, state) {
  const shell = elements?.appShell;
  const panel = elements?.detailPanel;
  if (!shell || !panel) return;
  const isDesktopDock = !state?.viewport?.isMobile
    && !panel.hidden
    && panel.classList.contains('is-open')
    && (panel.dataset.mode || state?.detailViewMode) === 'full';
  shell.classList.toggle('has-right-detail', isDesktopDock);
}

function toggleDetailSheetState(state, elements) {
  if (!state.viewport.isMobile || elements.detailPanel?.hidden) return;
  state.detailSheetExpanded = !state.detailSheetExpanded;
  syncDetailSheetState(state, elements);
}

function syncDetailSheetState(state, elements) {
  const panel = elements.detailPanel;
  const expandBtn = document.getElementById('detail-panel-expand');
  if (!panel) return;
  panel.classList.toggle('is-expanded', Boolean(state.detailSheetExpanded));
  if (expandBtn) {
    expandBtn.setAttribute('aria-expanded', String(Boolean(state.detailSheetExpanded)));
    expandBtn.textContent = state.detailSheetExpanded ? '⇩' : '⇧';
    expandBtn.setAttribute('aria-label', state.detailSheetExpanded ? 'Свернуть панель деталей' : 'Развернуть панель деталей');
  }
}

function syncDetailPanelExpandControl(elements, state) {
  const expandBtn = document.getElementById('detail-panel-expand');
  const panel = elements?.detailPanel;
  if (!expandBtn || !panel) return;
  const shouldShow = Boolean(state?.viewport?.isMobile) && !panel.hidden;
  expandBtn.hidden = !shouldShow;
  if (!shouldShow) {
    expandBtn.setAttribute('aria-expanded', 'false');
    expandBtn.textContent = '⇧';
    expandBtn.setAttribute('aria-label', 'Развернуть панель деталей');
  }
}

function syncTimelineInteractionLock(elements, state) {
  const bottomPanel = document.getElementById('bottom-panel');
  const detailPanel = elements?.detailPanel;
  if (!bottomPanel || !detailPanel) return;
  const shouldLock = Boolean(state?.viewport?.isMobile) && !detailPanel.hidden;
  bottomPanel.classList.toggle('is-interaction-blocked', shouldLock);
  bottomPanel.inert = shouldLock;
}

function updateDetailPanelHeading(elements, mode = 'preview') {
  const heading = elements?.detailPanel?.querySelector('.detail-panel-heading');
  if (!heading) return;
  heading.textContent = mode === 'full' ? 'Детали объекта' : 'Объект · Быстрый просмотр';
}

function addFeatureToDraftSliceFromDetail(state, elements, map, featureId) {
  if (!(state.sliceSelectionSet instanceof Set)) state.sliceSelectionSet = new Set();
  if (!featureId || state.sliceSelectionSet.has(featureId)) return;
  state.sliceSelectionSet.add(featureId);
  updateResearchContextBar(elements, state);
  if (elements.slicesPanel && !elements.slicesPanel.hidden) {
    renderSlicesPanel(elements, state, map);
  }
  showUiSystemMessage('Объект добавлен в срез', {
    variant: 'success',
    timeout: 1600
  });
}

function getCurrentSliceTitle(state) {
  const raw = String(state?.sliceOpenedTitle || '').trim();
  return raw || 'New Slice';
}

function getCurrentSliceStatus(state) {
  return state?.researchContextDirty ? 'Modified' : 'Saved';
}

function getVisibleLayersCue(state) {
  const total = state?.defaultEnabledLayerIds instanceof Set ? state.defaultEnabledLayerIds.size : 0;
  const visible = state?.enabledLayerIds instanceof Set ? state.enabledLayerIds.size : 0;
  if (!visible) return 'Layers: 0 visible';
  if (!total || visible >= total) return `Layers: ${visible} visible`;
  return `Layers: ${visible}/${total} visible`;
}

function getSelectionSummary(state) {
  const selectedInSlice = state?.sliceSelectionSet instanceof Set ? state.sliceSelectionSet.size : 0;
  if (selectedInSlice > 0) return `Entities in research: ${selectedInSlice}`;
  const searchCount = Array.isArray(state?.searchResults) ? state.searchResults.length : 0;
  if (searchCount > 0) return `Selection context: ${searchCount} in active search`;
  return 'Selection context: focus on current object';
}

function buildPreviewHeaderSection(props, title, layerLabel, dateLabel) {
  const headerSection = document.createElement('section');
  headerSection.className = 'detail-section detail-preview-header';
  headerSection.dataset.level = '1';
  headerSection.appendChild(createSectionTitle('Preview header'));

  const mediaNode = buildImageNode(props, title, false);
  mediaNode.classList.add('detail-header-media');
  headerSection.appendChild(mediaNode);

  const titleNode = document.createElement('h3');
  titleNode.className = 'detail-title';
  titleNode.textContent = title;
  headerSection.appendChild(titleNode);

  const metaRow = document.createElement('div');
  metaRow.className = 'detail-preview-meta-row';
  const typeNode = document.createElement('span');
  typeNode.className = 'detail-preview-meta-chip';
  typeNode.textContent = layerLabel || 'Type: not specified';
  const periodNode = document.createElement('span');
  periodNode.className = 'detail-preview-meta-chip is-period';
  periodNode.textContent = dateLabel || 'Period: not specified';
  metaRow.append(typeNode, periodNode);
  headerSection.appendChild(metaRow);

  return headerSection;
}

function buildSliceContextSection(state) {
  const contextSection = document.createElement('section');
  contextSection.className = 'detail-section detail-slice-context-block';
  contextSection.dataset.level = '2';
  contextSection.appendChild(createSectionTitle('Research slice context'));
  appendMetaRow(contextSection, 'Slice', getCurrentSliceTitle(state));
  appendMetaRow(contextSection, 'Status', getCurrentSliceStatus(state));
  appendMetaRow(contextSection, 'Layers', getVisibleLayersCue(state).replace(/^Layers:\s*/i, ''));
  appendMetaRow(contextSection, 'Entities', getSelectionSummary(state).replace(/^Entities in research:\s*/i, '').replace(/^Selection context:\s*/i, ''));
  return contextSection;
}

function buildEpistemicBlock(type, bodyBuilder) {
  const block = document.createElement('section');
  block.className = `detail-section detail-epistemic-block detail-epistemic-${type}`;
  block.dataset.level = '3';
  block.dataset.epistemicType = type;
  const labels = {
    fact: 'Fact',
    relation: 'Relation',
    interpretation: 'Interpretation',
    ai: 'AI Suggestion'
  };
  block.appendChild(createSectionTitle(labels[type] || 'Knowledge'));
  if (typeof bodyBuilder === 'function') bodyBuilder(block);
  return block;
}

function buildActionZonesSection({ onSaveSlice, onAddToResearch, onCompare, onExplain }) {
  const section = document.createElement('section');
  section.className = 'detail-section detail-action-zones';
  section.dataset.level = '4';
  section.appendChild(createSectionTitle('Action zones'));

  const upperGroup = document.createElement('div');
  upperGroup.className = 'detail-action-zone-group detail-action-zone-group-upper';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'ui-button ui-button-primary';
  saveBtn.textContent = 'Save Slice';
  saveBtn.addEventListener('click', onSaveSlice);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'ui-button ui-button-secondary';
  addBtn.textContent = 'Add to Research';
  addBtn.addEventListener('click', onAddToResearch);
  upperGroup.append(saveBtn, addBtn);

  const lowerGroup = document.createElement('div');
  lowerGroup.className = 'detail-action-zone-group detail-action-zone-group-lower';

  const compareBtn = document.createElement('button');
  compareBtn.type = 'button';
  compareBtn.className = 'ui-button ui-button-secondary';
  compareBtn.textContent = 'Compare';
  compareBtn.addEventListener('click', onCompare);

  const explainBtn = document.createElement('button');
  explainBtn.type = 'button';
  explainBtn.className = 'ui-button ui-button-secondary';
  explainBtn.textContent = 'Explain';
  explainBtn.addEventListener('click', onExplain);
  lowerGroup.append(compareBtn, explainBtn);

  section.append(upperGroup, lowerGroup);
  return section;
}

function buildPreviewDetailContent(state, elements, map, feature, props) {
  const featureId = getFeatureUiId(feature);
  const layerLabel = state.layerLookup.get(String(props.layer_id || '').trim()) || String(props.layer_id || '').trim();
  const dateLabel = formatRangeLabel(props.date_start, props.date_end);
  const title = getPrimaryTitle(props);
  const description = getPreviewDescription(props);
  const sourceUrl = normalizeSafeUrl(String(props.source_url || '').trim());
  const sourceDomain = extractDomain(sourceUrl);
  const relatedFeatures = getRelatedFeatures(state, feature, 2);

  const detail = document.createElement('article');
  detail.className = 'detail-content detail-content-preview detail-panel-body-inner';
  detail.dataset.mode = 'preview';

  detail.appendChild(buildPreviewHeaderSection(props, title, layerLabel, dateLabel));
  detail.appendChild(buildSliceContextSection(state));

  const factBlock = buildEpistemicBlock('fact', (block) => {
    appendMetaRow(block, 'Type', layerLabel || 'Not specified');
    appendMetaRow(block, 'Period', dateLabel || 'Not specified');
    if (sourceDomain || sourceUrl) {
      const provenanceRow = document.createElement('div');
      provenanceRow.className = 'detail-meta-row detail-source-link-row';
      const labelNode = document.createElement('span');
      labelNode.className = 'detail-meta-label';
      labelNode.textContent = 'Provenance';
      const valueNode = document.createElement('span');
      valueNode.className = 'detail-meta-value';
      if (sourceUrl) {
        const link = document.createElement('a');
        link.className = 'detail-action-link';
        link.textContent = sourceDomain || 'Source';
        setSafeLink(link, sourceUrl);
        valueNode.appendChild(link);
      } else {
        valueNode.textContent = sourceDomain;
      }
      provenanceRow.append(labelNode, valueNode);
      block.appendChild(provenanceRow);
    }
  });
  detail.appendChild(factBlock);

  const relationBlock = buildEpistemicBlock('relation', (block) => {
    if (!relatedFeatures.length) {
      appendMetaRow(block, 'Network', 'No related entities in current slice view');
      return;
    }
    relatedFeatures.forEach((relatedFeature) => {
      const relatedProps = normalizeProps(relatedFeature);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'related-item';
      const titleNode = document.createElement('span');
      titleNode.className = 'related-title';
      titleNode.textContent = getPrimaryTitle(relatedProps);
      const metaNode = document.createElement('span');
      metaNode.className = 'related-meta';
      metaNode.textContent = formatRangeLabel(relatedProps.date_start, relatedProps.date_end);
      item.append(titleNode, metaNode);
      item.addEventListener('click', () => {
        selectFeature(state, elements, map, relatedFeature, { centerOnMap: true, openDetail: true, scrollCard: true });
      });
      block.appendChild(item);
    });
  });
  detail.appendChild(relationBlock);

  const interpretationBlock = buildEpistemicBlock('interpretation', (block) => {
    const text = document.createElement('p');
    text.className = 'detail-description detail-description-preview';
    text.textContent = description || 'Interpretive note is not available yet.';
    if (!description) text.classList.add('is-empty');
    block.appendChild(text);
  });
  detail.appendChild(interpretationBlock);

  const aiBlock = buildEpistemicBlock('ai', (block) => {
    const hint = document.createElement('p');
    hint.className = 'detail-empty';
    hint.textContent = 'AI Suggestion: review full detail to expand context before comparing this object with the current slice.';
    block.appendChild(hint);
  });
  detail.appendChild(aiBlock);

  detail.appendChild(buildActionZonesSection({
    onSaveSlice: () => elements.researchSliceSaveBtn?.click(),
    onAddToResearch: () => addFeatureToDraftSliceFromDetail(state, elements, map, featureId),
    onCompare: () => elements.researchSliceCompareBtn?.click(),
    onExplain: () => {
      document.dispatchEvent(new CustomEvent('artemis:detail-expand-request', { detail: { featureId, feature } }));
      showDetailPanel(state, elements, map, feature, { mode: 'full', force: true });
    }
  }));

  return detail;
}

function buildFullDetailContent(state, elements, map, props, feature) {
  const featureId = getFeatureUiId(feature);
  const relatedFeatures = getRelatedFeatures(state, feature, 3);
  const layerLabel = state.layerLookup.get(String(props.layer_id || '').trim()) || String(props.layer_id || '').trim();
  const dateLabel = formatRangeLabel(props.date_start, props.date_end);
  const title = getPrimaryTitle(props);
  const secondaryTitle = String(props.name_en || '').trim();
  const description = String(props.description || props.title_short || '').trim();
  const hasBriefDescription = description && description.length < 96;
  const sourceUrl = normalizeSafeUrl(String(props.source_url || '').trim());
  const sourceDomain = extractDomain(sourceUrl);
  const confidenceLabel = getConfidenceLabel(props.coordinates_confidence);
  const coordinatesLabel = formatCoordinates(feature?.geometry?.coordinates);
  const licenseLabel = String(props.license || props.licence || props.rights || '').trim();

  const detail = document.createElement('article');
  detail.className = 'detail-content detail-content-full detail-panel-body-inner';
  detail.dataset.mode = 'full';

  detail.appendChild(buildPreviewHeaderSection(props, title, layerLabel, dateLabel));
  if (secondaryTitle && secondaryTitle !== title) {
    const secondary = document.createElement('p');
    secondary.className = 'detail-subtitle';
    secondary.textContent = secondaryTitle;
    detail.lastElementChild?.appendChild(secondary);
  }
  detail.appendChild(buildSliceContextSection(state));

  const factBlock = buildEpistemicBlock('fact', (block) => {
    appendMetaRow(block, 'Period', dateLabel || 'Not specified');
    if (layerLabel) appendMetaRow(block, 'Category', layerLabel);
    if (coordinatesLabel) appendMetaRow(block, 'Coordinates', coordinatesLabel);
    if (confidenceLabel) appendMetaRow(block, 'Verified', confidenceLabel);
    if (sourceDomain) appendMetaRow(block, 'Source', sourceDomain);
    if (licenseLabel) appendMetaRow(block, 'License', licenseLabel);
    if (sourceUrl) {
      const sourceRow = document.createElement('div');
      sourceRow.className = 'detail-meta-row detail-source-link-row';
      const sourceLabel = document.createElement('span');
      sourceLabel.className = 'detail-meta-label';
      sourceLabel.textContent = 'Provenance';
      const sourceValue = document.createElement('span');
      sourceValue.className = 'detail-meta-value';
      const link = document.createElement('a');
      link.className = 'detail-action-link';
      link.textContent = 'Open source';
      setSafeLink(link, sourceUrl);
      sourceValue.appendChild(link);
      sourceRow.append(sourceLabel, sourceValue);
      block.appendChild(sourceRow);
    }
  });
  detail.appendChild(factBlock);

  const relationBlock = buildEpistemicBlock('relation', (block) => {
    if (!Array.isArray(relatedFeatures) || !relatedFeatures.length) {
      appendMetaRow(block, 'Related', 'No related entities found');
      return;
    }
    relatedFeatures.forEach((relatedFeature) => {
      const relatedProps = normalizeProps(relatedFeature);
      const relatedTitle = getPrimaryTitle(relatedProps);
      const relatedLayerLabel = state.layerLookup.get(String(relatedProps.layer_id || '').trim()) || String(relatedProps.layer_id || '').trim();
      const relatedDateLabel = formatRangeLabel(relatedProps.date_start, relatedProps.date_end);
      const relatedMeta = [relatedDateLabel, relatedLayerLabel].filter(Boolean).join(' · ');
      const relatedItem = document.createElement('button');
      relatedItem.type = 'button';
      relatedItem.className = 'related-item';
      const relatedTitleNode = document.createElement('span');
      relatedTitleNode.className = 'related-title';
      relatedTitleNode.textContent = relatedTitle;
      const relatedMetaNode = document.createElement('span');
      relatedMetaNode.className = 'related-meta';
      relatedMetaNode.textContent = relatedMeta;
      relatedItem.append(relatedTitleNode, relatedMetaNode);
      relatedItem.addEventListener('click', () => {
        selectFeature(state, elements, map, relatedFeature, { centerOnMap: true, openDetail: true, scrollCard: true });
      });
      block.appendChild(relatedItem);
    });
  });
  detail.appendChild(relationBlock);

  const interpretationBlock = buildEpistemicBlock('interpretation', (block) => {
    const descriptionNode = document.createElement('p');
    descriptionNode.className = 'detail-description';
    descriptionNode.textContent = description || 'Interpretation is not available for this object yet.';
    if (!description) descriptionNode.classList.add('is-empty');
    block.appendChild(descriptionNode);
    if (hasBriefDescription) {
      const descriptionHint = document.createElement('p');
      descriptionHint.className = 'detail-description-note';
      descriptionHint.textContent = 'Available interpretation is concise and should be read as editorial context.';
      block.appendChild(descriptionHint);
    }
    if (props.layer_id) appendMetaRow(block, 'Layer ID', props.layer_id);
  });
  detail.appendChild(interpretationBlock);

  const aiBlock = buildEpistemicBlock('ai', (block) => {
    const aiHint = document.createElement('p');
    aiHint.className = 'detail-empty';
    aiHint.textContent = 'AI Suggestion: compare this object with the current slice anchor and review timeframe overlap first.';
    block.appendChild(aiHint);
  });
  detail.appendChild(aiBlock);

  detail.appendChild(buildActionZonesSection({
    onSaveSlice: () => elements.researchSliceSaveBtn?.click(),
    onAddToResearch: () => addFeatureToDraftSliceFromDetail(state, elements, map, featureId),
    onCompare: () => elements.researchSliceCompareBtn?.click(),
    onExplain: () => {
      const interpretation = detail.querySelector('.detail-epistemic-interpretation');
      interpretation?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      interpretation?.classList.add('is-highlighted');
      window.setTimeout(() => interpretation?.classList.remove('is-highlighted'), 1300);
    }
  }));

  return detail;
}

function updateFilterFeedback(elements, state) {
  const total = getActiveFiltersCount(state);
  [elements.filtersBtn, elements.layersBtn].forEach((button) => {
    if (!button) return;
    button.dataset.activeCount = total > 0 ? String(total) : '';
    button.classList.toggle('has-active-filters', total > 0);
  });
  if (elements.layersBtn) {
    elements.layersBtn.classList.toggle('is-layer-engaged', hasLayerCustomization(state));
  }
  if (elements.layersEntryHelper) {
    if (hasLayerCustomization(state)) {
      elements.layersEntryHelper.textContent = 'Слои изменены';
      elements.layersEntryHelper.classList.add('is-visited');
    } else {
      elements.layersEntryHelper.textContent = total > 0 ? 'Есть активные ограничения' : 'Выберите, что показывать на карте.';
      elements.layersEntryHelper.classList.remove('is-visited');
    }
  }
}

function getActiveFiltersCount(state) {
  const yearMin = Number(state.yearBounds?.min ?? state.currentStartYear);
  const yearMax = Number(state.yearBounds?.max ?? state.currentEndYear);
  const hasTimelineFilter = state.currentStartYear !== yearMin || state.currentEndYear !== yearMax;
  return Number(Boolean(state.search))
    + Number(state.confidenceFilter !== 'all')
    + Number(hasLayerCustomization(state))
    + Number(hasQuickLayerCustomization(state))
    + Number(hasTimelineFilter);
}

function hasQuickLayerCustomization(state) {
  if (!(state?.defaultQuickLayerIds instanceof Set) || !(state?.activeQuickLayerIds instanceof Set)) return false;
  if (state.defaultQuickLayerIds.size !== state.activeQuickLayerIds.size) return true;
  for (const id of state.defaultQuickLayerIds) {
    if (!state.activeQuickLayerIds.has(id)) return true;
  }
  return false;
}

function hasLayerCustomization(state) {
  if (!(state?.defaultEnabledLayerIds instanceof Set) || !(state?.enabledLayerIds instanceof Set)) return false;
  if (state.defaultEnabledLayerIds.size !== state.enabledLayerIds.size) return true;
  for (const id of state.defaultEnabledLayerIds) {
    if (!state.enabledLayerIds.has(id)) return true;
  }
  return false;
}

function buildResultFeedbackLabel(state) {
  const constraints = [];
  if (state.search) constraints.push(`поиск: «${state.search}»`);
  if (hasLayerCustomization(state)) constraints.push('слои');
  if (hasQuickLayerCustomization(state)) constraints.push('категории');
  if (state.confidenceFilter !== 'all') constraints.push(`точность координат: ${state.confidenceFilter}`);
  const yearMin = Number(state.yearBounds?.min ?? state.currentStartYear);
  const yearMax = Number(state.yearBounds?.max ?? state.currentEndYear);
  if (state.currentStartYear !== yearMin || state.currentEndYear !== yearMax) {
    if (state.timelineMode === 'point' || state.currentStartYear === state.currentEndYear) {
      constraints.push(`точка ${state.currentStartYear}`);
    } else {
      constraints.push(`период ${state.currentStartYear}—${state.currentEndYear}`);
    }
  }
  const suffix = constraints.length ? ` · Ограничения: ${constraints.join(', ')}` : '';
  return `${state.filteredFeatures.length} объектов в ленте и на карте${suffix}`;
}

function buildEmptyStateContext(state, elements) {
  if (!state?.applyState) {
    return { title: 'Ничего не найдено', message: 'Измените фильтры, поиск или период на таймлайне.', actionLabel: '', onAction: null };
  }
  if (!state.enabledLayerIds.size) {
    return {
      title: 'Все слои выключены',
      message: 'Включите хотя бы один слой, чтобы увидеть объекты.',
      actionLabel: 'Восстановить слои',
      onAction: () => {
        restoreDefaultLayers(state);
        state.applyState?.();
        showUiSystemMessage('Слои восстановлены по умолчанию', { variant: 'success', timeout: 2200 });
      }
    };
  }
  if (state.search) {
    return {
      title: 'Ничего не найдено',
      message: `По запросу «${state.search}» ничего не найдено. Измените поиск, фильтры или период.`,
      actionLabel: 'Очистить поиск',
      onAction: () => {
        clearSearchState(elements, state, { closePanel: false, notify: false });
        state.applyState?.();
        showUiSystemMessage('Поиск очищен', { variant: 'success', timeout: 2000 });
      }
    };
  }
  return {
    title: 'Ничего не найдено',
    message: 'Текущий период или фильтры не показывают объекты. Измените период на таймлайне или сбросьте ограничения.',
    actionLabel: 'Сбросить ограничения',
    onAction: () => {
      resetExploreConstraints(elements, state);
      state.applyState?.();
      showUiSystemMessage('Ограничения сброшены', { variant: 'success', timeout: 2200 });
    }
  };
}
