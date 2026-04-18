import { fetchWithAuth, buildApiError } from './auth.js';

const BASE_PATH = '/api/courses';

function normalizeStoryIds(storyIds = []) {
  return [...new Set((Array.isArray(storyIds) ? storyIds : []).map((id) => String(id || '').trim()).filter(Boolean))];
}

export function buildCoursePayload({ title, description = '', storyIds = [] } = {}) {
  const normalizedTitle = String(title || '').trim();
  if (!normalizedTitle) {
    throw new Error('Title is required to save a course.');
  }
  const normalizedStoryIds = normalizeStoryIds(storyIds);
  if (!normalizedStoryIds.length) {
    throw new Error('Select at least 1 story to create a course.');
  }
  return {
    title: normalizedTitle,
    description: String(description || '').trim(),
    story_ids: normalizedStoryIds,
  };
}

export function clampCourseStepIndex(course, index) {
  const storyIds = normalizeStoryIds(course?.story_ids || []);
  if (!storyIds.length) return 0;
  const numeric = Number(index);
  if (!Number.isInteger(numeric)) return 0;
  return Math.max(0, Math.min(storyIds.length - 1, numeric));
}

export function resolveCourseStepStoryId(course, index) {
  const storyIds = normalizeStoryIds(course?.story_ids || []);
  if (!storyIds.length) return null;
  const clamped = clampCourseStepIndex({ story_ids: storyIds }, index);
  return storyIds[clamped] || null;
}

export async function listCourses() {
  const response = await fetchWithAuth(BASE_PATH, { method: 'GET' });
  if (!response.ok) throw await buildApiError(response, 'Failed to load courses.');
  return await response.json();
}

export async function getCourse(courseId) {
  const response = await fetchWithAuth(`${BASE_PATH}/${encodeURIComponent(courseId)}`, { method: 'GET' });
  if (!response.ok) throw await buildApiError(response, 'Failed to open course.');
  return await response.json();
}

export async function createCourse(payload) {
  const response = await fetchWithAuth(BASE_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw await buildApiError(response, 'Failed to save course.');
  return await response.json();
}

export async function deleteCourse(courseId) {
  const response = await fetchWithAuth(`${BASE_PATH}/${encodeURIComponent(courseId)}`, { method: 'DELETE' });
  if (!response.ok) throw await buildApiError(response, 'Failed to delete course.');
}
