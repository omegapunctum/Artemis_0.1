import { showError } from './ux.js';

const SOURCE_ID = 'artemis-features';
const LAYER_ID = 'artemis-points';
const SELECTED_LAYER_ID = 'artemis-points-selected';
const HOVER_LAYER_ID = 'artemis-points-hover';
const CLUSTER_LAYER_ID = 'artemis-clusters';
const CLUSTER_COUNT_LAYER_ID = 'artemis-cluster-count';
const HEATMAP_LAYER_ID = 'artemis-heatmap';
const TOP_HEADER_SELECTOR = '#top-header';
const REQUIRED_BASE_LAYERS = [LAYER_ID, SELECTED_LAYER_ID, HOVER_LAYER_ID, HEATMAP_LAYER_ID];
const MAP_THEME_STORAGE_KEY = 'artemis:map-theme';
const MAP_THEME_PRESETS = {
  graphite: { id: 'graphite', label: 'Серая', className: 'map-theme-graphite' },
  dark: { id: 'dark', label: 'Тёмная', className: 'map-theme-dark' },
  soft: { id: 'soft', label: 'Мягкая', className: 'map-theme-soft' }
};
const DEFAULT_MAP_THEME = 'graphite';
const MAP_DATA_ERROR_MESSAGE = 'Ошибка загрузки данных карты';
const MARKER_THEME = {
  point: {
    color: '#22d3ee',
    strokeColor: '#0f172a',
    radius: 7,
    strokeWidth: 2.1,
    opacity: 0.94
  },
  hover: {
    color: 'rgba(56, 189, 248, 0.34)',
    strokeColor: '#7dd3fc',
    radius: 10.5,
    strokeWidth: 2.4,
    opacity: 1
  },
  selected: {
    color: 'rgba(125, 211, 252, 0.30)',
    strokeColor: '#bae6fd',
    radius: 12.8,
    strokeWidth: 3.2,
    opacity: 1
  },
  cluster: {
    color: '#0369a1',
    strokeColor: '#67e8f9',
    opacity: 0.92,
    strokeWidth: 1.6,
    textColor: '#e0f2fe'
  }
};

function syncTopHeaderLayoutMetrics() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const root = document.documentElement;
  const header = document.querySelector(TOP_HEADER_SELECTOR);
  if (!root || !header) return;
  const measuredHeight = Math.max(0, Math.ceil(header.getBoundingClientRect().height));
  if (measuredHeight > 0) {
    root.style.setProperty('--top-header-height', `${measuredHeight}px`);
  }
}

function reportMapDataLoadFailure(reason, details = null) {
  const errorDetails = details && typeof details === 'object' ? details : { details };
  console.error('[ARTEMIS:map] Не удалось подготовить данные карты:', { reason, ...errorDetails });
  showError(MAP_DATA_ERROR_MESSAGE);
}

function validateInitialFeaturePayload(features) {
  if (!features || typeof features !== 'object') {
    const error = new Error('data/features.geojson не загружен или имеет неверный формат payload.');
    error.code = 'MAP_INIT_INVALID_PAYLOAD';
    error.resource = 'features.geojson';
    throw error;
  }
  if (!Array.isArray(features.features)) {
    const error = new Error('data/features.geojson: поле features отсутствует или не является массивом.');
    error.code = 'MAP_INIT_INVALID_PAYLOAD';
    error.resource = 'features.geojson';
    throw error;
  }
  if (features.features.length === 0) {
    const error = new Error('data/features.geojson: features пустой (features.length = 0).');
    error.code = 'MAP_INIT_INVALID_PAYLOAD';
    error.resource = 'features.geojson';
    throw error;
  }
  return features;
}

// Нормализует FeatureCollection и исключает битые объекты из карты.
function buildMapFeatureCollection(features) {
  const inputFeatures = Array.isArray(features?.features) ? features.features : [];
  const total = inputFeatures.length;
  let pointValid = 0;
  let dropped = 0;

  const safeFeatures = inputFeatures.filter((feature) => {
    const valid = hasPointGeometry(feature);
    if (valid) {
      pointValid += 1;
    } else {
      dropped += 1;
    }
    return valid;
  });

  console.info('[ARTEMIS:map] buildMapFeatureCollection', {
    inputTotal: total,
    validPoints: pointValid,
    dropped
  });
  if (total > 0 && safeFeatures.length === 0) {
    console.warn('[ARTEMIS:map] Все features были отброшены фильтром геометрии (hasPointGeometry).');
  }

  return {
    collection: {
      type: 'FeatureCollection',
      features: safeFeatures.map((feature) => ({
        ...feature,
        properties: feature?.properties && typeof feature.properties === 'object' ? feature.properties : {}
      }))
    },
    diagnostics: {
      inputTotal: total,
      validPoints: pointValid,
      dropped
    }
  };
}

// Проверяет, что feature можно безопасно показать на карте как точку.
function hasPointGeometry(feature) {
  const geometry = feature?.geometry;
  const coordinates = geometry?.coordinates;
  return geometry?.type === 'Point'
    && Array.isArray(coordinates)
    && coordinates.length >= 2
    && Number.isFinite(Number(coordinates[0]))
    && Number.isFinite(Number(coordinates[1]));
}

// Инициализация карты и подготовка единого источника данных.
export function initMap(containerId, features) {
  let validatedFeatures = features;
  try {
    validatedFeatures = validateInitialFeaturePayload(features);
  } catch (error) {
    reportMapDataLoadFailure('invalid_geojson_payload', { error: String(error?.message || error) });
    throw error;
  }
  syncTopHeaderLayoutMetrics();
  const map = new maplibregl.Map({
    container: containerId,
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [37.6176, 55.7558],
    zoom: 4
  });
  const container = map.getContainer?.();
  if (container) container._map = map;
  window.__ARTEMIS_MAP = map;

  map.addControl(new maplibregl.NavigationControl(), 'top-right');
  const initialBuild = buildMapFeatureCollection(validatedFeatures);
  map.__artemis = {
    layerLookup: new Map(),
    lastMapFeatureCount: 0,
    lastBuildDiagnostics: initialBuild.diagnostics,
    pendingFeatureCollection: initialBuild.collection,
    featureClickHandler: null,
    selectedFeatureId: null,
    hoveredFeatureId: null,
    currentYearFilter: null,
    displayMode: 'points',
    lastFeatureSetSignature: '',
    lastLayerFiltersSerialized: new Map(),
    bootstrap: {
      ready: false,
      failed: false,
      error: null
    },
    mapTheme: resolveInitialMapTheme()
  };
  setMapTheme(map, map.__artemis.mapTheme, { persist: false });

  map.on('load', () => {
    try {
      syncTopHeaderLayoutMetrics();
      const mapData = map.__artemis.pendingFeatureCollection;
      loadGeoJSON(map, mapData);
      ensureMapBindingsReady(map);
      bindPopupHandlers(map);
      map.__artemis.lastMapFeatureCount = mapData.features.length;
      fitToFeatures(map, mapData);
      markMapBootstrapReady(map);
    } catch (error) {
      markMapBootstrapFailed(map, error);
      reportMapDataLoadFailure('map_bootstrap_failed', { error: String(error?.message || error) });
      throw error;
    }
  });
  map.on('error', (event) => {
    if (map?.__artemis?.bootstrap?.ready || map?.__artemis?.bootstrap?.failed) return;
    if (!event?.error) return;
    markMapBootstrapFailed(map, event.error);
    reportMapDataLoadFailure('map_runtime_error', { error: String(event.error?.message || event.error) });
  });

  map.__artemis.syncTopHeaderLayoutMetricsHandler = syncTopHeaderLayoutMetrics;
  window.addEventListener('resize', map.__artemis.syncTopHeaderLayoutMetricsHandler, { passive: true });

  return map;
}

export function getMapThemeOptions() {
  return Object.values(MAP_THEME_PRESETS).map(({ id, label }) => ({ id, label }));
}

export function getMapTheme(map) {
  const rawTheme = String(map?.__artemis?.mapTheme || '');
  return MAP_THEME_PRESETS[rawTheme] ? rawTheme : DEFAULT_MAP_THEME;
}

export function setMapTheme(map, themeId, { persist = true } = {}) {
  if (!map) return DEFAULT_MAP_THEME;
  const nextTheme = MAP_THEME_PRESETS[String(themeId || '').toLowerCase()]?.id || DEFAULT_MAP_THEME;
  map.__artemis = map.__artemis || {};
  map.__artemis.mapTheme = nextTheme;
  applyMapThemeClass(map, nextTheme);
  if (persist) persistMapTheme(nextTheme);
  return nextTheme;
}

export function waitForMapBootstrap(map, { timeoutMs = 12000 } = {}) {
  if (!map?.__artemis?.bootstrap) {
    return Promise.reject(new Error('Map bootstrap state missing.'));
  }
  if (map.__artemis.bootstrap.ready) {
    return Promise.resolve();
  }
  if (map.__artemis.bootstrap.failed) {
    return Promise.reject(map.__artemis.bootstrap.error || new Error('Map bootstrap failed.'));
  }

  return new Promise((resolve, reject) => {
    let timeoutId = null;
    const cleanup = () => {
      map.off('artemis:bootstrap-ready', onReady);
      map.off('artemis:bootstrap-failed', onFailed);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onFailed = (event) => {
      cleanup();
      reject(event?.error || map.__artemis.bootstrap.error || new Error('Map bootstrap failed.'));
    };

    map.on('artemis:bootstrap-ready', onReady);
    map.on('artemis:bootstrap-failed', onFailed);
    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Map bootstrap timed out.'));
    }, Math.max(1000, Number(timeoutMs) || 12000));
  });
}

function markMapBootstrapReady(map) {
  map.__artemis = map.__artemis || {};
  map.__artemis.bootstrap = map.__artemis.bootstrap || { ready: false, failed: false, error: null };
  if (map.__artemis.bootstrap.ready) return;
  map.__artemis.bootstrap.ready = true;
  map.__artemis.bootstrap.failed = false;
  map.__artemis.bootstrap.error = null;
  map.fire('artemis:bootstrap-ready');
}

function markMapBootstrapFailed(map, error) {
  map.__artemis = map.__artemis || {};
  map.__artemis.bootstrap = map.__artemis.bootstrap || { ready: false, failed: false, error: null };
  if (map.__artemis.bootstrap.ready || map.__artemis.bootstrap.failed) return;
  map.__artemis.bootstrap.failed = true;
  const normalizedError = error instanceof Error ? error : new Error(String(error || 'Map bootstrap failed.'));
  if (!normalizedError.code) normalizedError.code = 'MAP_BOOTSTRAP_FAILED';
  if (!normalizedError.resource) normalizedError.resource = 'map-bootstrap';
  map.__artemis.bootstrap.error = normalizedError;
  map.fire('artemis:bootstrap-failed', { error: map.__artemis.bootstrap.error });
  cleanupFailedBootstrapResidue(map);
}

function cleanupFailedBootstrapResidue(map) {
  const resizeHandler = map?.__artemis?.syncTopHeaderLayoutMetricsHandler;
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }
  if (window.__ARTEMIS_MAP === map) {
    window.__ARTEMIS_MAP = null;
  }
  try {
    map.remove();
  } catch (_error) {
    // noop: bootstrap already failed, cleanup is best-effort only.
  }
}

function ensureMapBindingsReady(map) {
  const source = map.getSource(SOURCE_ID);
  if (!source) {
    throw new Error('Map source initialization failed.');
  }

  for (const layerId of REQUIRED_BASE_LAYERS) {
    if (!map.getLayer(layerId)) {
      throw new Error(`Map layer initialization failed: ${layerId}.`);
    }
  }
}

function applyMapThemeClass(map, themeId) {
  const container = map?.getContainer?.();
  if (!container) return;
  Object.values(MAP_THEME_PRESETS).forEach((preset) => {
    container.classList.remove(preset.className);
  });
  container.classList.add(MAP_THEME_PRESETS[themeId]?.className || MAP_THEME_PRESETS[DEFAULT_MAP_THEME].className);
}

function resolveInitialMapTheme() {
  try {
    const rawTheme = String(window.localStorage.getItem(MAP_THEME_STORAGE_KEY) || '').toLowerCase();
    return MAP_THEME_PRESETS[rawTheme]?.id || DEFAULT_MAP_THEME;
  } catch (_error) {
    return DEFAULT_MAP_THEME;
  }
}

function persistMapTheme(themeId) {
  try {
    window.localStorage.setItem(MAP_THEME_STORAGE_KEY, themeId);
  } catch (_error) {
    // ignore localStorage failures
  }
}

// Обновляет данные source без пересоздания карты.
export function updateMapData(map, featureCollection, options = {}) {
  map.__artemis = map.__artemis || {};
  const featureSetSignature = buildFeatureSetSignature(featureCollection);
  if (featureSetSignature && map.__artemis.lastFeatureSetSignature === featureSetSignature && !options.force) {
    return map.__artemis.pendingFeatureCollection || featureCollection;
  }
  const buildResult = buildMapFeatureCollection(featureCollection);
  const mapData = buildResult.collection;
  map.__artemis.lastBuildDiagnostics = buildResult.diagnostics;
  map.__artemis.pendingFeatureCollection = mapData;
  map.__artemis.lastFeatureSetSignature = featureSetSignature;
  const source = map.getSource(SOURCE_ID);
  if (source) {
    source.setData(mapData);
    map.__artemis.lastMapFeatureCount = mapData.features.length;
    if (options.fitBounds) {
      fitToFeatures(map, mapData);
    }
  } else {
    map.__artemis.lastMapFeatureCount = mapData.features.length;
  }
  return mapData;
}

// Сохраняет справочник слоёв для popup и списка.
export function setLayerLookup(map, layers = []) {
  const lookup = new Map();
  (Array.isArray(layers) ? layers : []).forEach((layer) => {
    const id = normalizeLayerValue(layer?.layer_id || layer?.id);
    if (!id) return;
    lookup.set(id, normalizeLayerLabel(layer?.name_ru || layer?.label, id));
  });
  map.__artemis = map.__artemis || {};
  map.__artemis.layerLookup = lookup;
}

// Возвращает количество объектов, реально попавших в map source.
export function getMapFeatureCount(map) {
  return Number(map?.__artemis?.lastMapFeatureCount || 0);
}

export function getMapBuildDiagnostics(map) {
  return map?.__artemis?.lastBuildDiagnostics || { inputTotal: 0, validPoints: 0, dropped: 0 };
}

export function setMapFeatureClickHandler(map, handler) {
  map.__artemis = map.__artemis || {};
  map.__artemis.featureClickHandler = typeof handler === 'function' ? handler : null;
}

export function setMapFeatureHoverHandler(map, handler) {
  map.__artemis = map.__artemis || {};
  map.__artemis.featureHoverHandler = typeof handler === 'function' ? handler : null;
}

export function setMapLayerFilter(map, filterExpression = null) {
  if (!map || !map.getLayer) return;
  map.__artemis = map.__artemis || {};
  const nextSerialized = serializeFilterExpression(filterExpression);
  if (map.__artemis.currentYearFilterSerialized === nextSerialized) return;
  map.__artemis.currentYearFilter = filterExpression;
  map.__artemis.currentYearFilterSerialized = nextSerialized;
  applyLayerFilters(map);
}

export function setSelectedFeatureId(map, featureId = null) {
  if (!map || !map.getLayer) return;
  map.__artemis = map.__artemis || {};
  const nextValue = featureId ? String(featureId) : null;
  if (map.__artemis.selectedFeatureId === nextValue) return;
  map.__artemis.selectedFeatureId = nextValue;
  applyLayerFilters(map);
}

export function setHoveredFeatureId(map, featureId = null) {
  if (!map || !map.getLayer) return;
  map.__artemis = map.__artemis || {};
  const nextValue = featureId ? String(featureId) : null;
  if (map.__artemis.hoveredFeatureId === nextValue) return;
  map.__artemis.hoveredFeatureId = nextValue;
  applyLayerFilters(map);
}

export function setMapDisplayMode(map, mode = 'points') {
  if (!map || !map.getLayer) return;
  map.__artemis = map.__artemis || {};
  const nextMode = mode === 'heatmap' ? 'heatmap' : 'points';
  if (map.__artemis.displayMode === nextMode) return;
  map.__artemis.displayMode = nextMode;
  applyDisplayMode(map);
}

// Открывает popup и переводит карту к объекту, если геометрия существует.
export function focusFeatureOnMap(map, feature) {
  if (!hasPointGeometry(feature)) return false;
  const coordinates = feature.geometry.coordinates;
  map.flyTo({
    center: coordinates,
    zoom: 10,
    essential: true
  });
  return true;
}

function loadGeoJSON(map, featureCollection) {
  const shouldCluster = featureCollection.features.length > 500;

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: featureCollection,
    cluster: shouldCluster,
    clusterMaxZoom: 14,
    clusterRadius: 50
  });

  if (shouldCluster) {
    map.addLayer({
      id: CLUSTER_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': MARKER_THEME.cluster.color,
        'circle-radius': ['step', ['get', 'point_count'], 14, 25, 20, 100, 26],
        'circle-opacity': MARKER_THEME.cluster.opacity,
        'circle-stroke-color': MARKER_THEME.cluster.strokeColor,
        'circle-stroke-width': MARKER_THEME.cluster.strokeWidth
      }
    });

    map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 12
      },
      paint: {
        'text-color': MARKER_THEME.cluster.textColor
      }
    });
  }

  map.addLayer({
    id: HEATMAP_LAYER_ID,
    type: 'heatmap',
    source: SOURCE_ID,
    layout: {
      visibility: 'none'
    },
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['coalesce', ['get', 'influence_radius_km'], 1], 1, 0.2, 60, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 8, 1.2],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 12, 8, 32],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.85, 10, 0.45],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(15, 23, 42, 0)',
        0.2,
        '#1d4ed8',
        0.4,
        '#0ea5e9',
        0.6,
        '#22c55e',
        0.8,
        '#f59e0b',
        1,
        '#ef4444'
      ]
    }
  });

  // === ИСПРАВЛЕННЫЙ ОСНОВНОЙ СЛОЙ ТОЧЕК ===
  const pointLayer = {
    id: LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    paint: {
      'circle-radius': MARKER_THEME.point.radius,
      'circle-color': MARKER_THEME.point.color,
      'circle-stroke-color': MARKER_THEME.point.strokeColor,
      'circle-stroke-width': MARKER_THEME.point.strokeWidth,
      'circle-opacity': MARKER_THEME.point.opacity
    }
  };

  // Добавляем filter ТОЛЬКО если нужен (MapLibre не принимает undefined)
  if (shouldCluster) {
    pointLayer.filter = ['!', ['has', 'point_count']];
  }

  map.addLayer(pointLayer);
  map.addLayer({
    id: SELECTED_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    paint: {
      'circle-radius': MARKER_THEME.selected.radius,
      'circle-color': MARKER_THEME.selected.color,
      'circle-stroke-color': MARKER_THEME.selected.strokeColor,
      'circle-stroke-width': MARKER_THEME.selected.strokeWidth,
      'circle-opacity': MARKER_THEME.selected.opacity
    },
    filter: ['==', ['get', '_ui_id'], '__none__']
  });
  map.addLayer({
    id: HOVER_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    paint: {
      'circle-radius': MARKER_THEME.hover.radius,
      'circle-color': MARKER_THEME.hover.color,
      'circle-stroke-color': MARKER_THEME.hover.strokeColor,
      'circle-stroke-width': MARKER_THEME.hover.strokeWidth,
      'circle-opacity': MARKER_THEME.hover.opacity
    },
    filter: ['==', ['get', '_ui_id'], '__none__']
  });
  applyLayerFilters(map);
  applyDisplayMode(map);
  // =========================================
}

function applyLayerFilters(map) {
  const timelineFilter = map?.__artemis?.currentYearFilter;
  const selectedFeatureId = map?.__artemis?.selectedFeatureId;
  const hoveredFeatureId = map?.__artemis?.hoveredFeatureId;
  if (map.getLayer(CLUSTER_LAYER_ID)) {
    setLayerFilterIfChanged(map, CLUSTER_LAYER_ID, combineFilters([timelineFilter, ['has', 'point_count']]));
  }
  if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) {
    setLayerFilterIfChanged(map, CLUSTER_COUNT_LAYER_ID, combineFilters([timelineFilter, ['has', 'point_count']]));
  }
  if (map.getLayer(LAYER_ID)) {
    setLayerFilterIfChanged(map, LAYER_ID, combineFilters([timelineFilter, ['!', ['has', 'point_count']]]));
  }
  if (map.getLayer(HEATMAP_LAYER_ID)) {
    setLayerFilterIfChanged(map, HEATMAP_LAYER_ID, combineFilters([timelineFilter, ['!', ['has', 'point_count']]]));
  }
  if (map.getLayer(SELECTED_LAYER_ID)) {
    const selectedFilter = selectedFeatureId
      ? ['==', ['get', '_ui_id'], selectedFeatureId]
      : ['==', ['get', '_ui_id'], '__none__'];
    setLayerFilterIfChanged(map, SELECTED_LAYER_ID, combineFilters([timelineFilter, ['!', ['has', 'point_count']], selectedFilter]));
  }
  if (map.getLayer(HOVER_LAYER_ID)) {
    const hoverFilter = hoveredFeatureId
      ? ['==', ['get', '_ui_id'], hoveredFeatureId]
      : ['==', ['get', '_ui_id'], '__none__'];
    setLayerFilterIfChanged(map, HOVER_LAYER_ID, combineFilters([timelineFilter, ['!', ['has', 'point_count']], hoverFilter]));
  }
}

function applyDisplayMode(map) {
  const mode = map?.__artemis?.displayMode === 'heatmap' ? 'heatmap' : 'points';
  const showHeatmap = mode === 'heatmap';
  setLayerVisibility(map, HEATMAP_LAYER_ID, showHeatmap);
  setLayerVisibility(map, LAYER_ID, !showHeatmap);
  setLayerVisibility(map, SELECTED_LAYER_ID, !showHeatmap);
  setLayerVisibility(map, HOVER_LAYER_ID, !showHeatmap);
  setLayerVisibility(map, CLUSTER_LAYER_ID, !showHeatmap);
  setLayerVisibility(map, CLUSTER_COUNT_LAYER_ID, !showHeatmap);
}

function setLayerVisibility(map, layerId, isVisible) {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
}

function setLayerFilterIfChanged(map, layerId, filterExpression) {
  map.__artemis = map.__artemis || {};
  if (!(map.__artemis.lastLayerFiltersSerialized instanceof Map)) {
    map.__artemis.lastLayerFiltersSerialized = new Map();
  }
  const serialized = serializeFilterExpression(filterExpression);
  if (map.__artemis.lastLayerFiltersSerialized.get(layerId) === serialized) return;
  map.__artemis.lastLayerFiltersSerialized.set(layerId, serialized);
  map.setFilter(layerId, filterExpression);
}

function serializeFilterExpression(expression) {
  return expression ? JSON.stringify(expression) : '__none__';
}

function buildFeatureSetSignature(featureCollection) {
  const features = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
  if (!features.length) return 'count:0';
  const head = features.slice(0, 5).map((feature) => String(feature?.properties?._ui_id || '')).join('|');
  const tail = features.slice(-5).map((feature) => String(feature?.properties?._ui_id || '')).join('|');
  return `count:${features.length};head:${head};tail:${tail}`;
}

function combineFilters(filters) {
  const clean = filters.filter(Boolean);
  if (!clean.length) return null;
  if (clean.length === 1) return clean[0];
  return ['all', ...clean];
}

function bindPopupHandlers(map) {
  dismissLegacyFeaturePopup(map);
  map.on('click', LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature) return;
    dismissLegacyFeaturePopup(map);
    const coordinates = feature?.geometry?.coordinates;
    const onFeatureClick = map?.__artemis?.featureClickHandler;
    if (typeof onFeatureClick === 'function') {
      onFeatureClick(
        feature,
        Array.isArray(coordinates) ? coordinates : [event.lngLat.lng, event.lngLat.lat],
        event
      );
    } else {
      console.warn('[ARTEMIS:map] Feature click captured, but UI featureClickHandler is not set. Detail panel flow was not triggered.');
    }
  });

  map.on('click', CLUSTER_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature) return;

    const clusterId = feature.properties?.cluster_id;
    const source = map.getSource(SOURCE_ID);
    if (!source || typeof source.getClusterExpansionZoom !== 'function') return;

    source.getClusterExpansionZoom(clusterId, (error, zoom) => {
      if (error) {
        console.debug('Не удалось раскрыть кластер:', error);
        return;
      }

      map.easeTo({
        center: feature.geometry.coordinates,
        zoom
      });
    });
  });

  map.on('mouseenter', LAYER_ID, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mousemove', LAYER_ID, (event) => {
    const feature = event.features?.[0];
    const featureId = feature?.properties?._ui_id;
    const onFeatureHover = map?.__artemis?.featureHoverHandler;
    if (typeof onFeatureHover === 'function') {
      onFeatureHover(featureId ? String(featureId) : null, feature, event);
    }
  });
  map.on('mouseleave', LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
    dismissLegacyFeaturePopup(map);
    const onFeatureHover = map?.__artemis?.featureHoverHandler;
    if (typeof onFeatureHover === 'function') {
      onFeatureHover(null, null, null);
    }
  });

  map.on('mouseenter', CLUSTER_LAYER_ID, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', CLUSTER_LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
  });
}

function dismissLegacyFeaturePopup(map) {
  if (map?.__artemis?.popup && typeof map.__artemis.popup.remove === 'function') {
    map.__artemis.popup.remove();
    map.__artemis.popup = null;
  }
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.maplibregl-popup.artemis-popup').forEach((node) => node.remove());
  }
}

function normalizeLayerValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const arrayMatch = raw.match(/^\[\s*['"]([^'"]+)['"]\s*\]$/);
  return arrayMatch ? arrayMatch[1].trim() : raw;
}

function normalizeLayerLabel(value, fallback) {
  const cleaned = normalizeLayerValue(value);
  if (!cleaned) return fallback;
  return /^rec[A-Za-z0-9]{10,}$/.test(cleaned) ? fallback : cleaned;
}

function fitToFeatures(map, geojson) {
  const features = geojson?.features || [];
  if (!features.length) return;

  const bounds = new maplibregl.LngLatBounds();
  for (const feature of features) {
    const coords = feature?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      bounds.extend(coords);
    }
  }

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 40, maxZoom: 11 });
  }
}
