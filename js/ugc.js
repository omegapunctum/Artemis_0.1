// Файл: js/ugc.js
// Назначение: CRUD для UGC-черновиков и отправка на модерацию через /api/drafts.
// Интеграция: использовать в UI (список «Мои черновики», редактор), все запросы идут через apiFetch.

import { apiFetch, getCurrentUser } from './auth.js';

const dryRunStore = {
  drafts: [],
  lastId: 0
};

function isDryRun() {
  return Boolean(window.ARTEMIS_DRY_RUN);
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  if (!/^[-]?\d{1,4}$/.test(str)) return NaN;
  return Number.parseInt(str, 10);
}

function parseTags(tagsInput) {
  if (Array.isArray(tagsInput)) return tagsInput.filter(Boolean).map((x) => String(x).trim()).filter(Boolean);
  return String(tagsInput || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCoordinate(value, min, max) {
  if (value === null || value === undefined || value === '') return NaN;
  const num = Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(num)) return NaN;
  if (num < min || num > max) return NaN;
  return num;
}

export function validateDraftPayload(payload = {}) {
  const errors = {};

  if (!String(payload.name_ru || '').trim()) {
    errors.name_ru = 'Укажите название (name_ru).';
  }

  if (!String(payload.layer_id || '').trim()) {
    errors.layer_id = 'Выберите слой (layer_id).';
  }

  const dateStart = normalizeDate(payload.date_start);
  const dateConstructionEnd = normalizeDate(payload.date_construction_end);
  const tags = parseTags(payload.tags);

  const hasDateOrTags = Number.isInteger(dateStart) || Number.isInteger(dateConstructionEnd) || tags.length > 0;
  if (!hasDateOrTags) {
    errors.date_start = 'Укажите date_start или date_construction_end, либо добавьте хотя бы один tag.';
  }

  if (!Number.isNaN(dateStart) && dateStart !== null && !Number.isInteger(dateStart)) {
    errors.date_start = 'date_start должен быть целым годом.';
  }
  if (!Number.isNaN(dateConstructionEnd) && dateConstructionEnd !== null && !Number.isInteger(dateConstructionEnd)) {
    errors.date_construction_end = 'date_construction_end должен быть целым годом.';
  }

  const longitude = parseCoordinate(payload.longitude, -180, 180);
  const latitude = parseCoordinate(payload.latitude, -90, 90);

  if (Number.isNaN(longitude)) {
    errors.longitude = 'Долгота должна быть числом от -180 до 180.';
  }
  if (Number.isNaN(latitude)) {
    errors.latitude = 'Широта должна быть числом от -90 до 90.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      ...payload,
      date_start: Number.isInteger(dateStart) ? dateStart : null,
      date_construction_end: Number.isInteger(dateConstructionEnd) ? dateConstructionEnd : null,
      tags,
      coords: [longitude, latitude]
    }
  };
}

function extract422(responseData) {
  if (Array.isArray(responseData?.detail)) {
    return responseData.detail.reduce((acc, item) => {
      const key = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : 'form';
      acc[key] = item.msg || 'Некорректное значение';
      return acc;
    }, {});
  }
  return { form: 'Ошибка валидации данных (422).' };
}

function buildValidationError(fields) {
  const error = new Error('Ошибка валидации.');
  error.type = 'validation';
  error.fields = fields;
  return error;
}

function assertAuth() {
  if (!getCurrentUser()) {
    const error = new Error('Требуется авторизация.');
    error.type = 'auth';
    throw error;
  }
}

export async function createDraft(payload) {
  const result = validateDraftPayload(payload);
  if (!result.valid) throw buildValidationError(result.errors);

  if (isDryRun()) {
    assertAuth();
    dryRunStore.lastId += 1;
    const draft = { id: dryRunStore.lastId, status: 'draft', ...result.data };
    dryRunStore.drafts.push(draft);
    return draft;
  }

  const response = await apiFetch('/api/drafts', {
    method: 'POST',
    body: JSON.stringify(result.data)
  });

  if (response.status === 422) {
    throw buildValidationError(extract422(await response.json()));
  }
  if (!response.ok) throw new Error('Не удалось создать черновик.');
  return response.json();
}

export async function updateDraft(id, payload) {
  const result = validateDraftPayload(payload);
  if (!result.valid) throw buildValidationError(result.errors);

  if (isDryRun()) {
    assertAuth();
    const index = dryRunStore.drafts.findIndex((draft) => draft.id === Number(id));
    if (index < 0) throw new Error('Черновик не найден.');
    dryRunStore.drafts[index] = { ...dryRunStore.drafts[index], ...result.data };
    return dryRunStore.drafts[index];
  }

  const response = await apiFetch(`/api/drafts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(result.data)
  });

  if (response.status === 422) {
    throw buildValidationError(extract422(await response.json()));
  }
  if (!response.ok) throw new Error('Не удалось обновить черновик.');
  return response.json();
}

export async function deleteDraft(id) {
  if (isDryRun()) {
    assertAuth();
    dryRunStore.drafts = dryRunStore.drafts.filter((draft) => draft.id !== Number(id));
    return { ok: true };
  }

  const response = await apiFetch(`/api/drafts/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Не удалось удалить черновик.');
  return { ok: true };
}

export async function getDraftsForUser() {
  if (isDryRun()) {
    assertAuth();
    return dryRunStore.drafts;
  }

  const response = await apiFetch('/api/drafts/my', { method: 'GET' });
  if (!response.ok) throw new Error('Не удалось загрузить список черновиков.');
  return response.json();
}

export async function submitForModeration(id) {
  if (isDryRun()) {
    assertAuth();
    const draft = dryRunStore.drafts.find((item) => item.id === Number(id));
    if (!draft) throw new Error('Черновик не найден.');
    draft.status = 'pending';
    return draft;
  }

  const response = await apiFetch(`/api/drafts/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ status: 'pending' })
  });

  if (!response.ok) throw new Error('Не удалось отправить черновик на модерацию.');
  return response.json();
}

// Чеклист:
// - [ ] create/update валидируют schema-поля до запроса
// - [ ] 422 ошибки возвращаются как structured fields
// - [ ] submitForModeration меняет status -> pending
// - [ ] dry-run работает только в памяти страницы
