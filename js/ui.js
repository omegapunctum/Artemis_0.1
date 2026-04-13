import { loadLayers, loadCourses, getRecentFeatures } from './data.js';
import { updateMapData, setLayerLookup, focusFeatureOnMap, getMapFeatureCount, getMapBuildDiagnostics, setMapFeatureClickHandler, setMapFeatureHoverHandler, setMapLayerFilter, setSelectedFeatureId, setHoveredFeatureId, setMapDisplayMode, getMapThemeOptions, getMapTheme, setMapTheme } from './map.js';
import { debounce, createInlineStateBlock } from './ux.js';
import { normalizeSafeUrl, setSafeImageSource, setSafeLink, toSafeText } from './safe-dom.js';
import { DEFAULT_DISPLAY_MODE, aggregateFeaturesByDecade, createCoursesState, createLiveState, getSelectedCourse, moveCourseStep, selectCourse } from './state.js';

let globalDataErrorRetryHandler = null;
let activeUiToastTimerId = null;
let activeUiToastEl = null;

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

export function showGlobalDataLoading(message = 'Загрузка карты…') {
  const host = document.getElementById('global-data-loading');
  const text = document.getElementById('global-data-loading-text');
  if (!host || !text) return;
  text.textContent = message;
  host.hidden = false;
  host.setAttribute('aria-hidden', 'false');
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
  let coursesPayload = { courses: [] };
  let coursesError = '';
  let coursesContractWarnings = [];
  try {
    coursesPayload = await loadCourses();
  } catch (error) {
    coursesError = 'Courses временно недоступны. Попробуйте позже.';
  }
  const normalizedCoursesResult = normalizeCoursesForRuntime(coursesPayload?.courses || []);
  coursesContractWarnings = normalizedCoursesResult.warnings;
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
    coursesBtn: document.getElementById('courses-btn'),
    liveBtn: document.getElementById('live-btn'),
    filtersPanel: document.getElementById('filters-panel'),
    layersPanel: document.getElementById('layers-panel'),
    bookmarksPanel: document.getElementById('bookmarks-panel'),
    coursesPanel: document.getElementById('courses-panel'),
    livePanel: document.getElementById('live-panel'),
    appShell: document.getElementById('app-shell'),
    topHeader: document.getElementById('top-header'),
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
    coursesState: createCoursesState(normalizedCoursesResult.courses),
    coursesError,
    coursesContractWarnings,
    liveState: createLiveState(getRecentFeatures(18, { type: 'FeatureCollection', features: allFeatures })),
    liveError: ''
  };
  state.yearBounds = years;
  initializeAnimatedPanels(elements);
  setupOnboardingOverlay(elements);
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
    updateSearchNoResultsState(elements, state);
    renderSearchDropdown(elements, state, map);
    renderTopPanels(elements, state, layers, confidenceValues, map, visibilityKey);
    updateFilterFeedback(elements, state);
    renderCards(elements, state, map);
    updateCounters(elements, state, map);
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
    applyTimelineRange(elements, state, {
      start: Number(elements.timelineStart.value),
      end: state.timelineMode === 'point' ? Number(elements.timelineStart.value) : state.currentEndYear,
      snap: false,
      commit: true
    });
  });
  elements.timelineEnd?.addEventListener('input', () => {
    if (state.timelineMode === 'point') return;
    applyTimelineRange(elements, state, {
      start: state.currentStartYear,
      end: Number(elements.timelineEnd.value),
      snap: false,
      commit: true
    });
  });
  elements.timelineModePointBtn?.addEventListener('click', () => setTimelineMode(elements, state, 'point', { commit: true }));
  elements.timelineModeRangeBtn?.addEventListener('click', () => setTimelineMode(elements, state, 'range', { commit: true }));
  setupTimelinePointerInteractions(elements, state);

  elements.filtersBtn?.addEventListener('click', () => togglePrimaryPanel(elements, state, 'filters', elements.filtersBtn));
  elements.layersBtn?.addEventListener('click', () => togglePrimaryPanel(elements, state, 'layers', elements.layersBtn));
  elements.bookmarksBtn?.addEventListener('click', () => togglePrimaryPanel(elements, state, 'bookmarks', elements.bookmarksBtn));
  elements.coursesBtn?.addEventListener('click', () => togglePrimaryPanel(elements, state, 'courses', elements.coursesBtn));
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
    if (!withinFloating && !withinCard) closeDetailView(state, elements);
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    if (event.key !== 'Escape') return;
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
  if (!overlay || !dismissBtn) return;

  let dismissedInPageSession = false;
  const closeOverlay = () => {
    if (dismissedInPageSession) return;
    dismissedInPageSession = true;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  };

  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  dismissBtn.addEventListener('click', closeOverlay);
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
    button.textContent = isHeatmap ? 'Heatmap' : 'Points';
    button.setAttribute('aria-pressed', String(isHeatmap));
    button.setAttribute('aria-label', isHeatmap ? 'Switch to points mode' : 'Switch to heatmap mode');
  };
  syncLabel();
  button.addEventListener('click', () => {
    state.displayMode = state.displayMode === 'points' ? 'heatmap' : 'points';
    setMapDisplayMode(map, state.displayMode);
    syncLabel();
    showUiSystemMessage(state.displayMode === 'heatmap' ? 'Heatmap mode enabled' : 'Points mode enabled', {
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
  title.textContent = 'Filters';
  const summary = document.createElement('p');
  summary.className = 'status-summary';
  summary.textContent = `${activeCount} of ${totalCount} objects visible`;
  const filterSummary = document.createElement('div');
  filterSummary.className = 'panel-action-row';
  const activeFiltersBadge = document.createElement('span');
  activeFiltersBadge.className = 'ui-badge';
  const activeFiltersTotal = getActiveFiltersCount(state);
  activeFiltersBadge.textContent = activeFiltersTotal ? `${activeFiltersTotal} active` : 'No active filters';
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'ui-button ui-button-secondary';
  resetBtn.textContent = 'Reset';
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
  title.textContent = 'Layers';
  const layersChanged = hasLayerCustomization(state);
  const info = document.createElement('p');
  info.className = 'status-summary';
  info.textContent = layersChanged
    ? 'Layer visibility customized'
    : 'Default layer visibility';
  const restoreBtn = document.createElement('button');
  restoreBtn.type = 'button';
  restoreBtn.className = 'ui-button ui-button-secondary';
  restoreBtn.textContent = 'Restore defaults';
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
  title.textContent = 'Bookmarks';
  elements.bookmarksPanel.appendChild(title);

  const selected = getSelectedFeature(state);
  if (selected) {
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save bookmark';
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
    empty.textContent = 'Bookmarks will be available later';
    elements.bookmarksPanel.appendChild(empty);
    return;
  }

  state.bookmarks.slice(0, 20).forEach((bookmark) => {
    const props = normalizeProps(bookmark.feature);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'bookmark-item';
    const title = document.createElement('span');
    title.textContent = String(props.name_ru || props.title_short || 'Untitled');
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

function renderCoursesPanel(elements, state, map) {
  const panel = elements.coursesPanel;
  if (!panel) return;
  panel.replaceChildren();
  const title = document.createElement('h3');
  title.className = 'panel-title';
  title.textContent = 'Courses';
  panel.appendChild(title);

  if (state.coursesError) {
    panel.appendChild(createInlineStateBlock({
      variant: 'warning',
      title: 'Courses unavailable',
      message: state.coursesError
    }));
    return;
  }
  if (Array.isArray(state.coursesContractWarnings) && state.coursesContractWarnings.length) {
    panel.appendChild(renderCoursesWarnings(state.coursesContractWarnings));
  }

  const courses = state.coursesState?.courses || [];
  if (!courses.length) {
    panel.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'No courses yet',
      message: 'Educational modules will appear here soon.'
    }));
    return;
  }

  const selectedCourse = getSelectedCourse(state.coursesState);
  const selectedStepIndex = Number(state.coursesState?.selectedCourseStepIndex || 0);

  const list = document.createElement('div');
  list.className = 'courses-list';
  courses.forEach((course) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `course-item${selectedCourse?.id === course.id ? ' is-selected' : ''}`;
    item.textContent = String(course?.title || 'Untitled course');
    item.addEventListener('click', () => {
      selectCourse(state.coursesState, course?.id);
      renderCoursesPanel(elements, state, map);
      applyCourseStepMapContext(state, map);
    });
    list.appendChild(item);
  });
  panel.appendChild(list);

  if (!selectedCourse) {
    panel.appendChild(createInlineStateBlock({
      variant: 'info',
      title: 'Select a course',
      message: 'Choose a course to start step-by-step navigation.'
    }));
    return;
  }

  const courseCard = document.createElement('article');
  courseCard.className = 'course-card';
  const heading = document.createElement('h4');
  heading.textContent = String(selectedCourse?.title || 'Untitled course');
  const description = document.createElement('p');
  description.className = 'course-description';
  description.textContent = String(selectedCourse?.description || 'Описание отсутствует.');
  courseCard.append(heading, description);

  const steps = Array.isArray(selectedCourse?.steps) ? selectedCourse.steps : [];
  if (!steps.length) {
    courseCard.appendChild(createInlineStateBlock({
      variant: 'warning',
      title: 'No steps',
      message: 'This course does not have steps yet.'
    }));
    panel.appendChild(courseCard);
    return;
  }

  const safeStepIndex = Math.max(0, Math.min(steps.length - 1, selectedStepIndex));
  state.coursesState.selectedCourseStepIndex = safeStepIndex;
  const currentStep = steps[safeStepIndex];

  const stepInfo = document.createElement('div');
  stepInfo.className = 'course-step';
  const stepBadge = document.createElement('p');
  stepBadge.className = 'course-step-badge';
  stepBadge.textContent = `Step ${safeStepIndex + 1} / ${steps.length}`;
  const stepTitle = document.createElement('h5');
  stepTitle.textContent = String(currentStep?.title || 'Untitled step');
  const stepText = document.createElement('p');
  stepText.textContent = String(currentStep?.text || 'Описание шага отсутствует.');
  stepInfo.append(stepBadge, stepTitle, stepText);
  courseCard.appendChild(stepInfo);

  const nav = document.createElement('div');
  nav.className = 'course-nav';
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'ui-button ui-button-secondary';
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = safeStepIndex <= 0;
  prevBtn.addEventListener('click', () => {
    moveCourseStep(state.coursesState, -1);
    renderCoursesPanel(elements, state, map);
    applyCourseStepMapContext(state, map);
  });
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'ui-button ui-button-secondary';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = safeStepIndex >= steps.length - 1;
  nextBtn.addEventListener('click', () => {
    moveCourseStep(state.coursesState, 1);
    renderCoursesPanel(elements, state, map);
    applyCourseStepMapContext(state, map);
  });
  nav.append(prevBtn, nextBtn);
  courseCard.appendChild(nav);

  if (safeStepIndex >= steps.length - 1) {
    courseCard.appendChild(createInlineStateBlock({
      variant: 'success',
      title: 'Course complete',
      message: 'Вы прошли все шаги этого курса.'
    }));
  }
  panel.appendChild(courseCard);
}

function normalizeCoursesForRuntime(rawCourses) {
  const warnings = [];
  const courses = [];
  const source = Array.isArray(rawCourses) ? rawCourses : [];

  source.forEach((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') {
      warnings.push(`Course #${index + 1} skipped: invalid object.`);
      return;
    }

    const id = String(candidate.id || '').trim();
    const title = String(candidate.title || '').trim();
    const description = String(candidate.description || '').trim();
    const rawSteps = Array.isArray(candidate.steps) ? candidate.steps : [];
    const steps = normalizeCourseSteps(rawSteps);

    if (!id || !title || !description || !steps.length) {
      warnings.push(`Course "${title || id || `#${index + 1}`}" skipped: missing required fields or valid steps.`);
      return;
    }

    courses.push({ id, title, description, steps });
  });

  return { courses, warnings };
}

function renderCoursesWarnings(warnings) {
  const deduped = [...new Set((Array.isArray(warnings) ? warnings : []).map((item) => String(item || '').trim()).filter(Boolean))];
  const MAX_VISIBLE_WARNINGS = 5;
  const visible = deduped.slice(0, MAX_VISIBLE_WARNINGS);
  const hiddenCount = Math.max(0, deduped.length - visible.length);

  const host = document.createElement('section');
  host.className = 'inline-state inline-state-warning';

  const title = document.createElement('h4');
  title.className = 'inline-state-title';
  title.textContent = 'Courses partially loaded';
  host.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'inline-state-list';
  visible.forEach((warning) => {
    const item = document.createElement('li');
    item.textContent = warning;
    list.appendChild(item);
  });
  host.appendChild(list);

  if (hiddenCount > 0) {
    const more = document.createElement('p');
    more.className = 'inline-state-message';
    more.textContent = `…and ${hiddenCount} more issue(s).`;
    host.appendChild(more);
  }

  return host;
}

function normalizeCourseSteps(rawSteps) {
  const steps = [];
  const source = Array.isArray(rawSteps) ? rawSteps : [];
  source.forEach((step, index) => {
    if (!step || typeof step !== 'object') return;
    const title = String(step.title || '').trim() || `Step ${index + 1}`;
    const text = String(step.text || step.content || '').trim() || 'Описание шага отсутствует.';
    const featureId = String(step.feature_id || '').trim();
    const lng = Number(step.lng);
    const lat = Number(step.lat);
    const hasCoords = Number.isFinite(lng) && Number.isFinite(lat);
    if (!featureId && !hasCoords) return;

    steps.push({
      id: String(step.id || `step-${index + 1}`),
      title,
      text,
      ...(featureId ? { feature_id: featureId } : {}),
      ...(hasCoords ? { lng, lat, zoom: Number(step.zoom) } : {})
    });
  });
  return steps;
}

function applyCourseStepMapContext(state, map) {
  const selectedCourse = getSelectedCourse(state.coursesState);
  const steps = Array.isArray(selectedCourse?.steps) ? selectedCourse.steps : [];
  const step = steps[state.coursesState?.selectedCourseStepIndex || 0];
  if (!step) return;
  if (Number.isFinite(Number(step.lng)) && Number.isFinite(Number(step.lat))) {
    map.flyTo({
      center: [Number(step.lng), Number(step.lat)],
      zoom: Number.isFinite(Number(step.zoom)) ? Number(step.zoom) : 8,
      essential: true
    });
    return;
  }
  if (step.feature_id) {
    const feature = state.allFeatures.find((item) => getFeatureUiId(item) === String(step.feature_id));
    if (feature) {
      focusFeatureOnMap(map, feature);
    } else {
      showUiSystemMessage('Связанный объект шага не найден на карте', { variant: 'warning', timeout: 2600 });
    }
  }
}

function renderLivePanel(elements, state, map) {
  const panel = elements.livePanel;
  if (!panel) return;
  panel.replaceChildren();
  const title = document.createElement('h3');
  title.className = 'panel-title';
  title.textContent = 'LIVE / Recent';
  panel.appendChild(title);

  if (state.liveError) {
    panel.appendChild(createInlineStateBlock({
      variant: 'warning',
      title: 'Live feed unavailable',
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
    noResults.textContent = `No matches for “${state.search}”.`;
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'ui-button ui-button-secondary';
    clearBtn.textContent = 'Clear search';
    clearBtn.addEventListener('click', () => {
      clearSearchState(elements, state, { closePanel: true, notify: true });
      state.applyState?.();
    });
    elements.searchDropdown.appendChild(noResults);
    elements.searchDropdown.appendChild(clearBtn);
    return;
  }

  state.searchResults.forEach((feature) => {
    const props = normalizeProps(feature);
    const featureId = getFeatureUiId(feature);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `search-result-item${state.selectedFeatureId === featureId ? ' is-selected' : ''}`;
    const title = String(props.name_ru || props.name_en || props.title_short || 'Untitled');
    const meta = `${formatRange(props.date_start, props.date_end)} • ${state.layerLookup.get(String(props.layer_id || '').trim()) || props.layer_id || 'Layer'}`;
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
    truncationNote.textContent = `Показаны первые ${state.searchResults.length} результатов`;
    elements.searchDropdown.appendChild(truncationNote);
  }
}

function setupOverlayManager(elements, state, map) {
  const closeAll = () => {
    ['search', 'filters', 'layers', 'bookmarks', 'courses', 'live'].forEach((key) => closePrimaryPanel(elements, state, key));
  };
  state.overlay.closeAll = closeAll;

  document.addEventListener('artemis:overlay-open', (event) => {
    const source = event?.detail?.source || '';
    if (!state.viewport.isMobile) return;
    if (source === 'detail') {
      closeAll();
      return;
    }
    if (source === 'primary') {
      hideDetailPanel(elements, state);
      return;
    }
    if (source === 'ugc' || source === 'moderation') {
      closeAll();
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

function togglePrimaryPanel(elements, state, key, trigger = null) {
  if (state.overlay.activePrimary === key) closePrimaryPanel(elements, state, key);
  else openPrimaryPanel(elements, state, key, trigger);
}

function openPrimaryPanel(elements, state, key, trigger = null) {
  if (elements.topActions?.classList.contains('is-expanded')) {
    elements.topActions.classList.remove('is-expanded');
    elements.overflowBtn?.setAttribute('aria-expanded', 'false');
  }
  ['search', 'filters', 'layers', 'bookmarks', 'courses', 'live'].forEach((name) => {
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
  if (state.overlay.activePrimary === key) state.overlay.activePrimary = null;
  if (key === 'live' && state?.liveState) state.liveState.isLiveMode = false;
}

function getPanelByKey(elements, key) {
  return {
    search: elements.searchDropdown,
    filters: elements.filtersPanel,
    layers: elements.layersPanel,
    bookmarks: elements.bookmarksPanel,
    courses: elements.coursesPanel,
    live: elements.livePanel
  }[key] || null;
}

function getButtonByKey(elements, key) {
  return {
    filters: elements.filtersBtn,
    layers: elements.layersBtn,
    bookmarks: elements.bookmarksBtn,
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
    ? `Поиск активен: «${query || 'запрос'}».`
    : 'Ищите места, события и объекты.';
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
  if (!noResults) return;
  const noResultsText = elements?.searchNoResultsText;
  const noResultsReset = elements?.searchNoResultsReset;

  const hasSearch = Boolean(state?.search);
  const canMeasureResults = Array.isArray(state?.searchResults);
  const isEmpty = canMeasureResults && state.searchResults.length === 0;
  const shouldShow = hasSearch && canMeasureResults && isEmpty;
  noResults.hidden = !shouldShow;
  if (shouldShow) {
    if (noResultsText) noResultsText.textContent = `Ничего не найдено для «${state.search}».`;
    if (noResultsReset) noResultsReset.hidden = false;
  } else if (noResultsReset) {
    noResultsReset.hidden = true;
  }
}

function renderCards(elements, state, map) {
  const list = elements.cardsRibbon;
  if (!list) {
    renderCardsState(elements, { ...state, loading: false, empty: !state.filteredFeatures.length });
    return;
  }
  const cardsKey = state.filteredFeatureIds.slice(0, 80).join('|');
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
  state.filteredFeatures.slice(0, 80).forEach((feature) => {
    const props = normalizeProps(feature);
    const featureId = getFeatureUiId(feature);
    const item = document.createElement('li');
    item.className = `ribbon-card${state.selectedFeatureId === featureId ? ' is-selected' : ''}`;
    item.dataset.featureId = featureId;
    item.setAttribute('aria-selected', String(state.selectedFeatureId === featureId));
    item.tabIndex = 0;

    const image = buildImageNode(props, 'Object image');

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
    ? buildFullDetailContent(state, props, feature)
    : buildPreviewDetailContent(state, elements, map, feature, props);

  elements.detailPanelBody.replaceChildren();
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
  syncDetailDockLayout(elements, state);
  document.dispatchEvent(new CustomEvent('artemis:overlay-open', { detail: { source: 'detail' } }));
  if (Number.isInteger(state.detailRenderFrameId)) {
    window.cancelAnimationFrame(state.detailRenderFrameId);
  }
  state.detailOpenFeatureId = featureId;
  state.detailRenderFrameId = window.requestAnimationFrame(() => {
    elements.detailPanelBody.replaceChildren(detail);
    focusDetailPanelEntry(elements, viewMode);
    state.detailRenderFrameId = null;
  });
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
      title: 'Loading',
      message: 'Loading events…'
    }));
    renderCardsSkeleton(elements, 4);
    return;
  }

  if (state.error) {
    elements.cardsState.appendChild(createInlineStateBlock({
      variant: 'error',
      title: 'Data unavailable',
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
    elements.timelineLabel.textContent = state.timelineMode === 'point' ? 'Выбранная точка' : 'Выбранный диапазон';
  }
  if (elements.timelineCapsule) {
    elements.timelineCapsule.textContent = state.timelineMode === 'point'
      ? String(state.currentStartYear)
      : `${state.currentStartYear} — ${state.currentEndYear}`;
    elements.timelineCapsule.dataset.range = `${state.currentStartYear}:${state.currentEndYear}`;
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

  const startDrag = (handle, event) => {
    activeHandle = handle;
    activePointerId = event.pointerId;
    track.setPointerCapture?.(event.pointerId);
    setDraggingState(true);
    queueByPointer(event.clientX);
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
    startDrag('start', event);
  });
  elements.timelineKnobEnd?.addEventListener('pointerdown', (event) => {
    if (state.timelineMode === 'point') return;
    event.preventDefault();
    startDrag('end', event);
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
  const diagnostics = getMapBuildDiagnostics(map);
  if (elements.resultsCount) elements.resultsCount.textContent = String(state.filteredFeatures.length);
  if (elements.mapCount) elements.mapCount.textContent = String(getMapFeatureCount(map));
  if (elements.sourceCount) elements.sourceCount.textContent = String(diagnostics.inputTotal);
  if (elements.pointValidCount) elements.pointValidCount.textContent = String(diagnostics.validPoints);
  const activeFilters = getActiveFiltersCount(state);
  if (elements.activeFiltersCount) elements.activeFiltersCount.textContent = String(activeFilters);
}

function updateStatus(elements, state, map) {
  if (!elements.statusMessage) return;
  if (!isDebugTelemetryMode()) {
    elements.statusMessage.textContent = 'Карта готова.';
    return;
  }
  const diagnostics = getMapBuildDiagnostics(map);
  const bucketCount = Object.keys(state.timeAggregation || {}).length;
  elements.statusMessage.textContent = `Карта готова. Загружено ${diagnostics.inputTotal}, отображается ${getMapFeatureCount(map)}, в выборке ${state.filteredFeatures.length}, временных бакетов: ${bucketCount}.`;
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
  [elements.searchDropdown, elements.filtersPanel, elements.layersPanel, elements.bookmarksPanel, elements.detailPanel]
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
  const points = [years.min, Math.round((years.min + years.max) / 2), years.max];
  elements.timelineAxis.replaceChildren(...points.map((year) => {
    const node = document.createElement('span');
    node.textContent = String(year);
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
  if (!Number.isFinite(value)) return 'Unknown';
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
  if (normalized === 'exact') return 'Exact coordinates';
  if (normalized === 'approximate') return 'Approximate coordinates';
  if (normalized === 'conditional') return 'Conditional coordinates';
  return normalized;
}
function buildBadge(label, tone = '') {
  const badge = document.createElement('span');
  badge.className = `detail-badge${tone ? ` is-${tone}` : ''}`;
  badge.textContent = String(label || 'Unknown');
  return badge;
}
function createSectionTitle(value) {
  const title = document.createElement('h4');
  title.className = 'detail-section-title';
  title.textContent = String(value || '');
  return title;
}
function appendMetaRow(parent, label, value) {
  if (!parent || value === null || value === undefined || value === '') return;
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
    expandBtn.setAttribute('aria-label', state.detailSheetExpanded ? 'Collapse detail panel' : 'Expand detail panel');
  }
}

function updateDetailPanelHeading(elements, mode = 'preview') {
  const heading = elements?.detailPanel?.querySelector('.detail-panel-heading');
  if (!heading) return;
  heading.textContent = mode === 'full' ? 'Детали объекта' : 'Быстрый просмотр';
}

function buildPreviewDetailContent(state, elements, map, feature, props) {
  const featureId = getFeatureUiId(feature);
  const layerLabel = state.layerLookup.get(String(props.layer_id || '').trim()) || String(props.layer_id || '').trim();
  const dateLabel = formatRangeLabel(props.date_start, props.date_end);
  const title = getPrimaryTitle(props);
  const secondaryTitle = String(props.name_en || '').trim();
  const description = getPreviewDescription(props);

  const detail = document.createElement('article');
  detail.className = 'detail-content detail-content-preview detail-panel-body-inner';
  detail.dataset.mode = 'preview';

  const titleSection = document.createElement('section');
  titleSection.className = 'detail-section detail-title-block';
  const titleNode = document.createElement('h3');
  titleNode.className = 'detail-title';
  titleNode.textContent = title;
  titleSection.appendChild(titleNode);
  if (secondaryTitle && secondaryTitle !== title) {
    const subtitleNode = document.createElement('p');
    subtitleNode.className = 'detail-subtitle';
    subtitleNode.textContent = secondaryTitle;
    titleSection.appendChild(subtitleNode);
  }
  detail.appendChild(titleSection);

  const metaSection = document.createElement('section');
  metaSection.className = 'detail-section detail-meta-block';
  metaSection.appendChild(createSectionTitle('Краткая сводка'));
  appendMetaRow(metaSection, 'Период', dateLabel);
  if (layerLabel) appendMetaRow(metaSection, 'Слой / тип', layerLabel);
  detail.appendChild(metaSection);

  const descriptionSection = document.createElement('section');
  descriptionSection.className = 'detail-section';
  descriptionSection.appendChild(createSectionTitle('Описание'));
  const descriptionNode = document.createElement('p');
  descriptionNode.className = 'detail-description detail-description-preview';
  descriptionNode.textContent = description || 'Описание пока отсутствует.';
  if (!description) descriptionNode.classList.add('is-empty');
  descriptionSection.appendChild(descriptionNode);
  detail.appendChild(descriptionSection);

  const actionsSection = document.createElement('section');
  actionsSection.className = 'detail-section detail-preview-actions';
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'detail-actions';
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'ui-button ui-button-primary';
  moreBtn.textContent = 'Подробнее';
  moreBtn.dataset.action = 'open-full-detail';
  moreBtn.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('artemis:detail-expand-request', {
      detail: { featureId, feature }
    }));
    showDetailPanel(state, elements, map, feature, { mode: 'full', force: true });
  });
  actionsWrap.append(moreBtn);
  actionsSection.appendChild(actionsWrap);
  detail.appendChild(actionsSection);

  return detail;
}

function buildFullDetailContent(state, props, feature) {
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

  const mediaSection = document.createElement('section');
  mediaSection.className = 'detail-media-block';
  const mediaNode = buildImageNode(props, title, true);
  mediaNode.classList.add('detail-hero-media');
  mediaSection.appendChild(mediaNode);
  const mediaCaption = document.createElement('p');
  mediaCaption.className = 'detail-media-caption';
  mediaCaption.textContent = mediaNode.classList.contains('img-placeholder')
    ? 'Изображение пока недоступно'
    : 'Изображение объекта';
  mediaSection.appendChild(mediaCaption);
  detail.appendChild(mediaSection);

  const titleSection = document.createElement('section');
  titleSection.className = 'detail-section detail-title-block';
  const titleNode = document.createElement('h3');
  titleNode.className = 'detail-title';
  titleNode.textContent = title;
  titleSection.appendChild(titleNode);
  if (secondaryTitle && secondaryTitle !== title) {
    const subtitleNode = document.createElement('p');
    subtitleNode.className = 'detail-subtitle';
    subtitleNode.textContent = secondaryTitle;
    titleSection.appendChild(subtitleNode);
  }
  const metaChips = document.createElement('div');
  metaChips.className = 'detail-badges';
  if (layerLabel) metaChips.appendChild(buildBadge(layerLabel));
  if (dateLabel && dateLabel !== 'Дата не указана') metaChips.appendChild(buildBadge(dateLabel, 'accent'));
  if (confidenceLabel) metaChips.appendChild(buildBadge(confidenceLabel));
  if (metaChips.childElementCount) titleSection.appendChild(metaChips);
  detail.appendChild(titleSection);

  const metaSection = document.createElement('section');
  metaSection.className = 'detail-section detail-meta-block';
  metaSection.appendChild(createSectionTitle('Сводка'));
  appendMetaRow(metaSection, 'Период', dateLabel);
  if (layerLabel) appendMetaRow(metaSection, 'Слой / тип', layerLabel);
  if (coordinatesLabel) appendMetaRow(metaSection, 'Координаты', coordinatesLabel);
  if (metaSection.querySelector('.detail-meta-row')) detail.appendChild(metaSection);

  const descriptionSection = document.createElement('section');
  descriptionSection.className = 'detail-section';
  descriptionSection.appendChild(createSectionTitle('Описание'));
  const descriptionNode = document.createElement('p');
  descriptionNode.className = 'detail-description';
  descriptionNode.textContent = description || 'Подробное описание для этого объекта пока не добавлено.';
  if (!description) descriptionNode.classList.add('is-empty');
  descriptionSection.appendChild(descriptionNode);
  if (hasBriefDescription) {
    const descriptionHint = document.createElement('p');
    descriptionHint.className = 'detail-description-note';
    descriptionHint.textContent = 'Сейчас доступно краткое описание. Карточка будет дополняться по мере обновления данных.';
    descriptionSection.appendChild(descriptionHint);
  }
  detail.appendChild(descriptionSection);

  if (sourceUrl || sourceDomain || licenseLabel) {
    const sourceSection = document.createElement('section');
    sourceSection.className = 'detail-section detail-source-block';
    sourceSection.appendChild(createSectionTitle('Источник и лицензия'));
    if (sourceDomain) appendMetaRow(sourceSection, 'Платформа', sourceDomain);
    if (licenseLabel) appendMetaRow(sourceSection, 'Лицензия', licenseLabel);
    if (sourceUrl) {
      const sourceRow = document.createElement('div');
      sourceRow.className = 'detail-meta-row detail-source-link-row';
      const sourceLabel = document.createElement('span');
      sourceLabel.className = 'detail-meta-label';
      sourceLabel.textContent = 'External link';
      const sourceValue = document.createElement('span');
      sourceValue.className = 'detail-meta-value';
      const link = document.createElement('a');
      link.className = 'detail-action-link';
      link.textContent = 'Открыть источник';
      setSafeLink(link, sourceUrl);
      sourceValue.appendChild(link);
      sourceRow.append(sourceLabel, sourceValue);
      sourceSection.appendChild(sourceRow);
    }
    detail.appendChild(sourceSection);
  }

  const technicalSection = document.createElement('section');
  technicalSection.className = 'detail-section detail-technical-block';
  technicalSection.appendChild(createSectionTitle('Техническая информация'));
  if (props.name_ru && props.name_en && props.name_ru !== props.name_en) {
    appendMetaRow(technicalSection, 'Название (EN)', props.name_en);
  }
  if (props.layer_id) appendMetaRow(technicalSection, 'Layer ID', props.layer_id);
  if (props.coordinates_confidence) appendMetaRow(technicalSection, 'Coordinates confidence', props.coordinates_confidence);
  if (technicalSection.querySelector('.detail-meta-row')) detail.appendChild(technicalSection);

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
  if (state.confidenceFilter !== 'all') constraints.push(`confidence: ${state.confidenceFilter}`);
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
  return `${state.filteredFeatures.length} objects в ленте и на карте${suffix}`;
}

function buildEmptyStateContext(state, elements) {
  if (!state?.applyState) {
    return { title: 'No results', message: 'Подходящие объекты не найдены.', actionLabel: '', onAction: null };
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
      message: `Запрос «${state.search}» не дал результатов в текущих ограничениях.`,
      actionLabel: 'Очистить поиск',
      onAction: () => {
        clearSearchState(elements, state, { closePanel: false, notify: false });
        state.applyState?.();
        showUiSystemMessage('Поиск очищен', { variant: 'success', timeout: 2000 });
      }
    };
  }
  return {
    title: 'Нет объектов в выборке',
    message: 'Сужение фильтрами/таймлайном исключило все объекты.',
    actionLabel: 'Сбросить ограничения',
    onAction: () => {
      resetExploreConstraints(elements, state);
      state.applyState?.();
      showUiSystemMessage('Ограничения сброшены', { variant: 'success', timeout: 2200 });
    }
  };
}
