import { fetchWithAuth, buildApiError } from './auth.js';

const BASE_PATH = '/api/research-slices';

export function buildResearchSlicePayload({
  title,
  description = '',
  selectedFeatureId,
  timeRange,
  map,
  enabledLayerIds = [],
  activeQuickLayerIds = []
} = {}) {
  const normalizedTitle = String(title || '').trim();
  if (!normalizedTitle) {
    throw new Error('Title is required to save a research slice.');
  }

  const featureId = String(selectedFeatureId || '').trim();
  if (!featureId) {
    throw new Error('Select a map object before saving a research slice.');
  }

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
    feature_refs: [{ feature_id: featureId }],
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
      selected_feature_id: featureId
    },
    annotations: []
  };
}

export function normalizeSliceForRestore(slice) {
  const payload = slice && typeof slice === 'object' ? slice : {};
  const timeRange = payload.time_range && typeof payload.time_range === 'object' ? payload.time_range : {};
  const viewState = payload.view_state && typeof payload.view_state === 'object' ? payload.view_state : {};

  const start = Number(timeRange.start);
  const end = Number(timeRange.end);
  const mode = timeRange.mode === 'point' ? 'point' : 'range';
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
    center: Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null,
    zoom: Number.isFinite(zoom) ? zoom : null,
    enabledLayerIds: (Array.isArray(viewState.enabled_layer_ids) ? viewState.enabled_layer_ids : []).map((id) => String(id || '').trim()).filter(Boolean),
    activeQuickLayerIds: (Array.isArray(viewState.active_quick_layer_ids) ? viewState.active_quick_layer_ids : []).map((id) => String(id || '').trim()).filter(Boolean),
    selectedFeatureId: String(viewState.selected_feature_id || '').trim() || null,
    featureCount: Array.isArray(payload.feature_refs) ? payload.feature_refs.length : 0
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
