# Courses MVP Scope

## 1. Current baseline fit
- Courses entrypoints and runtime primitives already exist in current UI: `Courses` top action button, dedicated `courses-panel`, in-memory courses state, step navigation, and map context binding by `feature_id` or `lat/lng`.
- Courses content is already loadable from static `data/courses.json` via `loadCourses()` with cache + graceful fallback.
- This allows a **content-driven, frontend-first MVP** without new backend APIs.
- Baseline constraints remain: preserve controlled-release discipline and avoid multi-instance/session assumptions.

## 2. MVP scope
### 2.1 User-facing flow (minimum)
1. User opens **Courses** panel from top navigation.
2. User sees list of available courses (title-level).
3. User selects one course.
4. User sees course detail card with:
   - title,
   - optional description,
   - current lesson (step title + step text),
   - `Prev/Next` navigation with boundary handling.
5. On step change, map context is applied:
   - focus by `feature_id` when linked feature exists, or
   - `flyTo` by `lat/lng` (+ optional zoom) when coordinate step is provided.

### 2.2 UI states (minimum)
- Loading/availability state handled by existing global loading + `coursesError` fallback message.
- Empty catalog state (`No courses yet`).
- No course selected state (`Select a course`).
- Course without steps state (`No steps`).
- Step boundary behavior (disable `Prev` at first step, `Next` at last step).

### 2.3 Data/content model (minimum)
- Source: `data/courses.json`.
- MVP course object:
  - `id` (string)
  - `title` (string)
  - `description` (string; required by current runtime guardrails)
  - `steps` (array)
- MVP step object:
  - `title` (string)
  - `text` (string; fallback is applied if omitted)
  - link target (at least one):
    - `feature_id` (preferred for canonical map-object linking), or
    - `lat`, `lng` (+ optional `zoom`) for coordinate-driven focus.

### 2.4 Backend/API needs (MVP)
- **Required:** none (no new backend endpoints needed).
- **Optional (later):** authoring/validation/admin APIs for courses lifecycle, but not required to ship MVP learner flow.

## 3. Out of scope for MVP
- Persistent per-user course progress/history across sessions/devices.
- Auth-bound personalization (bookmarks-in-course, recommendations, adaptive paths).
- Rich branching logic, quizzes, scoring/certification.
- Multi-language course management workflow.
- Dedicated backend courses service or DB model migration.
- Multi-instance runtime guarantees for course progress/session sync.

## 4. Dependencies and risks
- **Content availability risk (HIGH):** MVP value depends on having curated `courses.json` with quality steps and valid links.
- **Data-link integrity risk (MEDIUM):** stale `feature_id` references can degrade map jump behavior; content QA is required.
- **Navigation complexity risk (MEDIUM):** step UX can become noisy if lessons are too long/inconsistent; keep lessons concise in MVP.
- **Auth dependency risk (LOW):** baseline MVP can run unauthenticated (read-only courses); avoid coupling to auth/session for initial release.
- **Runtime/performance risk (LOW):** current map focus operations are lightweight; keep scope to single-course linear navigation.

## 5. Recommended first implementation slice
**Slice 1 (single practical target):**
Deliver one production-ready vertical path: **Courses panel + single curated course (5–8 steps) with validated `feature_id` linking and working Prev/Next map focus transitions**, using existing `data/courses.json` loading and current UI states only.
