import { fetchWithAuth, buildApiError } from './auth.js';

const BASE_PATH = '/api/stories';

function normalizeSliceIds(sliceIds = []) {
  return [...new Set((Array.isArray(sliceIds) ? sliceIds : []).map((id) => String(id || '').trim()).filter(Boolean))];
}

export function buildStoryPayload({ title, description = '', sliceIds = [] } = {}) {
  const normalizedTitle = String(title || '').trim();
  if (!normalizedTitle) {
    throw new Error('Title is required to save a story.');
  }
  const normalizedSliceIds = normalizeSliceIds(sliceIds);
  if (normalizedSliceIds.length < 2) {
    throw new Error('Select at least 2 slices to create a story.');
  }
  return {
    title: normalizedTitle,
    description: String(description || '').trim(),
    slice_ids: normalizedSliceIds,
  };
}

export function clampStoryStepIndex(story, index) {
  const sliceIds = normalizeSliceIds(story?.slice_ids || []);
  if (!sliceIds.length) return 0;
  const numeric = Number(index);
  if (!Number.isInteger(numeric)) return 0;
  return Math.max(0, Math.min(sliceIds.length - 1, numeric));
}

export function resolveStoryStepSliceId(story, index) {
  const sliceIds = normalizeSliceIds(story?.slice_ids || []);
  if (!sliceIds.length) return null;
  const clamped = clampStoryStepIndex({ slice_ids: sliceIds }, index);
  return sliceIds[clamped] || null;
}

export async function listStories() {
  const response = await fetchWithAuth(BASE_PATH, { method: 'GET' });
  if (!response.ok) throw await buildApiError(response, 'Failed to load stories.');
  return await response.json();
}

export async function getStory(storyId) {
  const response = await fetchWithAuth(`${BASE_PATH}/${encodeURIComponent(storyId)}`, { method: 'GET' });
  if (!response.ok) throw await buildApiError(response, 'Failed to open story.');
  return await response.json();
}

export async function createStory(payload) {
  const response = await fetchWithAuth(BASE_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw await buildApiError(response, 'Failed to save story.');
  return await response.json();
}

export async function deleteStory(storyId) {
  const response = await fetchWithAuth(`${BASE_PATH}/${encodeURIComponent(storyId)}`, { method: 'DELETE' });
  if (!response.ok) throw await buildApiError(response, 'Failed to delete story.');
}
