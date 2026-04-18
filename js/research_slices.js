import { fetchWithAuth, buildApiError } from './auth.js';

const BASE_PATH = '/api/research-slices';
const ANNOTATION_TYPES = ['fact', 'interpretation', 'hypothesis'];
const ANNOTATION_TYPE_LABELS = {
  fact: 'Fact',
  interpretation: 'Interpretation',
  hypothesis: 'Hypothesis'
};

function normalizeCount(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.trunc(num);
}

function buildCompactTimeRangeSummary(timeRange) {
  if (!timeRange || typeof timeRange !== 'object') return '';
  const start = Number(timeRange.start);
  const end = Number(timeRange.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '';
  if (timeRange.mode === 'point' || start === end) return `${Math.trunc(start)}`;
  return `${Math.trunc(start)}–${Math.trunc(end)}`;
}

function buildSliceAnnotations(annotationInputs) {
  const source = annotationInputs && typeof annotationInputs === 'object' ? annotationInputs : {};
  const baseId = Date.now().toString(36);
  const annotations = [];
  ANNOTATION_TYPES.forEach((type, index) => {
    const text = String(source[type] || '').trim();
    if (!text) return;
    annotations.push({
      id: `ann-${baseId}-${type}-${index + 1}`,
      type,
      text
    });
  });
  return annotations;
}

export function buildSliceAnnotationDisplayPlan(slice) {
  const annotations = Array.isArray(slice?.annotations) ? slice.annotations : [];
  const groupsMap = new Map();

  ANNOTATION_TYPES.forEach((type) => {
    groupsMap.set(type, { type, label: ANNOTATION_TYPE_LABELS[type], items: [] });
  });

  annotations.forEach((annotation) => {
    const type = String(annotation?.type || '').trim();
    const text = String(annotation?.text || '').trim();
    if (!ANNOTATION_TYPES.includes(type) || !text) return;
    groupsMap.get(type)?.items.push({
      text
    });
  });

  const groups = ANNOTATION_TYPES
    .map((type) => groupsMap.get(type))
    .filter((group) => Array.isArray(group?.items) && group.items.length > 0);

  const count = groups.reduce((sum, group) => sum + group.items.length, 0);
  return { count, groups };
}

export function buildSliceListMetaSummary(slice) {
  const payload = slice && typeof slice === 'object' ? slice : {};
  const parts = [];

  const featureCount = normalizeCount(payload.feature_count);
  if (featureCount !== null) parts.push(`${featureCount} объектов`);

  const annotationCount = normalizeCount(payload.annotation_count);
  if (annotationCount !== null) parts.push(`ann: ${annotationCount}`);

  const compactRange = buildCompactTimeRangeSummary(payload.time_range);
  if (compactRange) parts.push(compactRange);

  const stamp = String(payload.updated_at || payload.created_at || '').trim();
  if (stamp) parts.push(stamp.slice(0, 10));

  return parts.join(' · ');
}

export function buildResearchSlicePayload({
  title,
  description = '',
  selectedFeatureId,
  selectedFeatureIds = [],
  annotationInputs = {},
  timeRange,
  map,
  enabledLayerIds = [],
  activeQuickLayerIds = []
} = {}) {
  const normalizedTitle = String(title || '').trim();
  if (!normalizedTitle) {
    throw new Error('Title is required to save a research slice.');
  }

  const featureIds = [...new Set((Array.isArray(selectedFeatureIds) ? selectedFeatureIds : []).map((id) => String(id || '').trim()).filter(Boolean))];
  const featureId = String(selectedFeatureId || '').trim();
  if (!featureIds.length && featureId) {
    featureIds.push(featureId);
  }
  if (!featureIds.length) {
    throw new Error('Select a map object before saving a research slice.');
  }
  const primaryFeatureId = featureId || featureIds[0];

  const start = Number(timeRange?.start);
  const end = Number(timeRange?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('Invalid time range for research slice.');
  }

  const center = map?.getCenter?.();
  const lng = Number(center?.lng);
  const lat = Number(center?.lat);
  const zoom = Number(map?.getZoom?.());

  if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(zoom)) {
    throw new Error('Map view is not ready for research slice save.');
  }

  return {
    title: normalizedTitle,
    description: String(description || '').trim(),
    feature_refs: featureIds.map((id) => ({ feature_id: id })),
    time_range: {
      start: Math.trunc(start),
      end: Math.trunc(end),
      mode: timeRange?.mode === 'point' ? 'point' : 'range'
    },
    view_state: {
      center: [lng, lat],
      zoom,
      enabled_layer_ids: [...new Set((Array.isArray(enabledLayerIds) ? enabledLayerIds : []).map((id) => String(id || '').trim()).filter(Boolean))],
      active_quick_layer_ids: [...new Set((Array.isArray(activeQuickLayerIds) ? activeQuickLayerIds : []).map((id) => String(id || '').trim()).filter(Boolean))],
      selected_feature_id: primaryFeatureId
    },
    annotations: buildSliceAnnotations(annotationInputs)
  };
}

export function normalizeSliceForRestore(slice) {
  const payload = slice && typeof slice === 'object' ? slice : {};
  const timeRange = payload.time_range && typeof payload.time_range === 'object' ? payload.time_range : {};
  const viewState = payload.view_state && typeof payload.view_state === 'object' ? payload.view_state : {};

  const start = Number(timeRange.start);
  const end = Number(timeRange.end);
  const mode = timeRange.mode === 'point' ? 'point' : 'range';
  const featureIds = (Array.isArray(payload.feature_refs) ? payload.feature_refs : [])
    .map((entry) => String(entry?.feature_id || '').trim())
    .filter(Boolean);
  const uniqueFeatureIds = [...new Set(featureIds)];
  const selectedFeatureId = String(viewState.selected_feature_id || '').trim() || uniqueFeatureIds[0] || null;
  const center = Array.isArray(viewState.center) ? viewState.center : [];
  const lng = Number(center[0]);
  const lat = Number(center[1]);
  const zoom = Number(viewState.zoom);

  return {
    id: String(payload.id || '').trim(),
    title: String(payload.title || '').trim(),
    start: Number.isFinite(start) ? start : null,
    end: Number.isFinite(end) ? end : null,
    mode,
    featureIds: uniqueFeatureIds,
    center: Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null,
    zoom: Number.isFinite(zoom) ? zoom : null,
    enabledLayerIds: (Array.isArray(viewState.enabled_layer_ids) ? viewState.enabled_layer_ids : []).map((id) => String(id || '').trim()).filter(Boolean),
    activeQuickLayerIds: (Array.isArray(viewState.active_quick_layer_ids) ? viewState.active_quick_layer_ids : []).map((id) => String(id || '').trim()).filter(Boolean),
    selectedFeatureId,
    featureCount: uniqueFeatureIds.length
  };
}

export async function listResearchSlices() {
  const response = await fetchWithAuth(BASE_PATH, { method: 'GET' });
  if (!response.ok) throw await buildApiError(response, 'Failed to load research slices.');
  return await response.json();
}

export async function getResearchSlice(sliceId) {
  const response = await fetchWithAuth(`${BASE_PATH}/${encodeURIComponent(sliceId)}`, { method: 'GET' });
  if (!response.ok) throw await buildApiError(response, 'Failed to open research slice.');
  return await response.json();
}

export async function createResearchSlice(payload) {
  const response = await fetchWithAuth(BASE_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw await buildApiError(response, 'Failed to save research slice.');
  return await response.json();
}

export async function deleteResearchSlice(sliceId) {
  const response = await fetchWithAuth(`${BASE_PATH}/${encodeURIComponent(sliceId)}`, { method: 'DELETE' });
  if (!response.ok) throw await buildApiError(response, 'Failed to delete research slice.');
}
