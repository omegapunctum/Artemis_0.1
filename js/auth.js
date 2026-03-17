// Файл: js/auth.js
// Назначение: клиентская авторизация ARTEMIS (login/register/logout/refresh/me) и единый apiFetch.
// Интеграция: импортировать refreshToken() при старте приложения и apiFetch() во всех API-модулях.
// ВАЖНО: только HTTPS в деплое, access token хранится ТОЛЬКО в памяти; refresh token — только в httpOnly Secure cookie.

let accessToken = null;
let currentUser = null;
let refreshPromise = null;

const dryRunState = {
  users: [{ id: 1, email: 'demo@artemis.local', password: 'demo12345', role: 'author' }],
  lastUserId: 1
};

function isDryRun() {
  return Boolean(window.ARTEMIS_DRY_RUN);
}

function notifyAuthRequired() {
  window.dispatchEvent(new CustomEvent('artemis:auth-required'));
}

function buildHeaders(headers = {}, withJson = true) {
  const result = new Headers(headers);
  if (withJson && !result.has('Content-Type')) {
    result.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    result.set('Authorization', `Bearer ${accessToken}`);
  }
  return result;
}

export function getCurrentUser() {
  return currentUser;
}

export async function register(email, password) {
  if (isDryRun()) {
    const exists = dryRunState.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase());
    if (exists) throw new Error('Пользователь с таким email уже существует.');

    dryRunState.lastUserId += 1;
    const user = { id: dryRunState.lastUserId, email, password, role: 'author' };
    dryRunState.users.push(user);
    accessToken = `dry-run-token-${user.id}-${Date.now()}`;
    currentUser = { id: user.id, email: user.email, role: user.role };
    return currentUser;
  }

  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error('Не удалось зарегистрироваться. Проверьте данные и попробуйте снова.');
  }

  return login(email, password);
}

export async function login(email, password) {
  if (isDryRun()) {
    const user = dryRunState.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password);
    if (!user) throw new Error('Неверный email или пароль.');
    accessToken = `dry-run-token-${user.id}-${Date.now()}`;
    currentUser = { id: user.id, email: user.email, role: user.role };
    return currentUser;
  }

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error('Неверный email или пароль.');
  }

  const data = await response.json();
  accessToken = data.access_token || data.accessToken || null;
  currentUser = data.user || null;
  if (!accessToken) {
    await refreshToken();
  }

  return currentUser || (await fetchMe());
}

async function fetchMe() {
  if (!accessToken) return null;

  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: buildHeaders({}, false),
    credentials: 'include'
  });

  if (!response.ok) return null;

  currentUser = await response.json();
  return currentUser;
}

export async function logout() {
  if (isDryRun()) {
    accessToken = null;
    currentUser = null;
    return;
  }

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: buildHeaders({}, false),
      credentials: 'include'
    });
  } catch (error) {
    console.error('Ошибка logout:', error);
  } finally {
    accessToken = null;
    currentUser = null;
  }
}

export async function refreshToken() {
  if (isDryRun()) {
    return currentUser;
  }

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: buildHeaders({}, false),
      credentials: 'include'
    });

    if (!response.ok) {
      accessToken = null;
      currentUser = null;
      throw new Error('Сессия не восстановлена.');
    }

    const data = await response.json();
    accessToken = data.access_token || data.accessToken || null;
    currentUser = data.user || null;

    if (!currentUser) {
      await fetchMe();
    }

    return currentUser;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function apiFetch(path, opts = {}, retried = false) {
  if (!path.startsWith('/api/')) {
    throw new Error('Все API-запросы должны быть относительными и начинаться с /api/.');
  }

  if (isDryRun()) {
    return { dryRun: true, path, ok: true, status: 200, json: async () => ({}) };
  }

  const method = opts.method || 'GET';
  const isFormData = opts.body instanceof FormData;
  const headers = buildHeaders(opts.headers || {}, !isFormData);

  const response = await fetch(path, {
    ...opts,
    method,
    headers,
    credentials: 'include'
  });

  if (response.status === 401 && !retried) {
    try {
      await refreshToken();
      return apiFetch(path, opts, true);
    } catch (error) {
      console.error('Ошибка refresh после 401:', error);
      notifyAuthRequired();
      throw new Error('Требуется повторный вход в аккаунт.');
    }
  }

  return response;
}

// Чеклист:
// - [ ] login/register/logout работают без localStorage/sessionStorage
// - [ ] refreshToken восстанавливает сессию через httpOnly cookie
// - [ ] apiFetch добавляет Bearer token и повторяет запрос после 401
// - [ ] при провале refresh UI получает событие artemis:auth-required
