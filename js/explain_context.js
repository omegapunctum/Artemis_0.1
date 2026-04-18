export function buildExplainContextFromRuntime(runtime = {}) {
  const scope = String(runtime?.scope || '').trim();
  const safeScope = ['slice', 'story', 'course'].includes(scope) ? scope : 'slice';

  const featureIds = Array.isArray(runtime?.featureIds)
    ? [...new Set(runtime.featureIds.map((id) => String(id || '').trim()).filter(Boolean))]
    : [];

  const payload = {
    scope: safeScope,
    slice_id: runtime?.sliceId ? String(runtime.sliceId).trim() : null,
    story_id: runtime?.storyId ? String(runtime.storyId).trim() : null,
    course_id: runtime?.courseId ? String(runtime.courseId).trim() : null,
    feature_ids: featureIds,
    time_range: runtime?.timeRange && typeof runtime.timeRange === 'object' ? runtime.timeRange : null,
    view_state: runtime?.viewState && typeof runtime.viewState === 'object' ? runtime.viewState : null,
    annotations: Array.isArray(runtime?.annotations) ? runtime.annotations : []
  };

  if (typeof window !== 'undefined' && window.__ARTEMIS_DEBUG_ECC === true) {
    // Debug-only minimal hook.
    console.log('[explain-context:runtime]', payload);
  }

  return payload;
}
