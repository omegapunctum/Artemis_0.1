let accessToken = null;
let refreshPromise = null;
let initPromise = null;
let resolvedApiBase = null;
let sessionRestoreAttempted = false;
const routeFallbackLogCache = new Set();
const sessionRestoreLogCache = new Set();
const SESSION_RESTORE_TIMEOUT_MS = 4500;
const REFRESH_TIMEOUT_MS = 8000;

const API_BASE_CANDIDATES = [
  (window.ARTEMIS_API_BASE || '').trim(),
  document.querySelector('meta[name="artemis-api-base"]')?.getAttribute('content')?.trim() || '',
  '/api',
  ''
].filter((value, index, array) => value !== null && value !== undefined && array.indexOf(value) === index);

function notifyAuthChanged() {
  window.dispatchEvent(new CustomEvent('artemis:auth-changed', { detail: getCurrentUser() }));
}

function authRequired() {
  window.dispatchEvent(new CustomEvent('artemis:auth-required'));
}

function handleAuthFailure() {
  clearAuth();
  authRequired();
}

function normalizePath(path) {
  const cleanedPath = String(path || '').trim();
  if (!cleanedPath) return '/';
  return cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`;
}

function buildApiUrl(base, path) {
  const normalizedPath = normalizePath(path);
  if (!base) return normalizedPath;
  const normalizedBase = String(base).replace(/\/+$/, '');
  return `${normalizedBase}${normalizedPath}`;
}

function logRouteFallback({ method, path, tried, status, level = 'info' }) {
  const key = `${method}:${path}:${status}`;
  if (routeFallbackLogCache.has(key)) return;
  routeFallbackLogCache.add(key);
  const payload = { method, path, tried, status };
  if (level === 'warn') console.warn('ARTEMIS API route fallback', payload);
  else if (level === 'debug' && typeof console.debug === 'function') console.debug('ARTEMIS API route fallback', payload);
  else console.info('ARTEMIS API route fallback', payload);
}

function isExpectedSessionRestoreFailure(error) {
  const status = Number(error?.status || error?.responseStatus || 0);
  const code = String(error?.code || '').toUpperCase();
  return status === 0 || status === 401 || status === 404 || status === 405 || code === 'AUTH_REFRESH_TIMEOUT' || code === 'AUTH_REFRESH_NETWORK';
}

function logSessionRestoreFailureOnce(error) {
  const status = Number(error?.status || error?.responseStatus || 0) || 'unknown';
  const code = String(error?.code || '').toUpperCase() || 'none';
  const key = `session-restore:${status}:${code}`;
  if (sessionRestoreLogCache.has(key)) return;
  sessionRestoreLogCache.add(key);
  const message = code === 'AUTH_REFRESH_TIMEOUT'
    ? 'ARTEMIS session restore skipped: refresh timeout.'
    : status === 401
      ? 'ARTEMIS session restore skipped: no valid session.'
      : 'ARTEMIS session restore unavailable on current API route.';
  console.info(message, { status, code });
}

async function requestApi(path, options = {}, fallbackMessage = 'API request failed', requestBehavior = {}) {
  const method = String(options?.method || 'GET').toUpperCase();
  const candidates = resolvedApiBase !== null ? [resolvedApiBase] : API_BASE_CANDIDATES;
  const fallbackLogLevel = requestBehavior?.fallbackLogLevel || 'info';
  const expectedErrorStatuses = Array.isArray(requestBehavior?.expectedErrorStatuses)
    ? requestBehavior.expectedErrorStatuses
    : [];
  const expectedErrorLogLevel = requestBehavior?.expectedErrorLogLevel || 'info';
  const defaultErrorLogLevel = requestBehavior?.defaultErrorLogLevel || 'error';
  let lastResponse = null;

  for (const base of candidates) {
    const url = buildApiUrl(base, path);
    const response = await fetch(url, options);
    lastResponse = response;

    if (response.ok) {
      resolvedApiBase = base;
      return response;
    }

    const canTryFallback = (response.status === 404 || response.status === 405) && resolvedApiBase === null;
    if (!canTryFallback) {
      const isExpected = expectedErrorStatuses.includes(response.status);
      throw await buildApiError(response, fallbackMessage, {
        logLevel: isExpected ? expectedErrorLogLevel : defaultErrorLogLevel
      });
    }

    logRouteFallback({ method, path, tried: url, status: response.status, level: fallbackLogLevel });
  }

  const status = Number(lastResponse?.status || 0);
  const isExpected = expectedErrorStatuses.includes(status);
  throw await buildApiError(lastResponse, fallbackMessage, {
    logLevel: isExpected ? expectedErrorLogLevel : defaultErrorLogLevel
  });
}

function parseTokenClaims(token) {
  try {
    const [, payload] = String(token || '').split('.');
    if (!payload) return {};
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch (_error) {
    return {};
  }
}

function normalizeRoles(claims) {
  if (Array.isArray(claims?.roles)) return claims.roles.map((role) => String(role));
  if (typeof claims?.role === 'string' && claims.role) return [claims.role];
  return [];
}

function withAuthHeaders(headers = {}) {
  const result = new Headers(headers);
  if (accessToken) {
    result.set('Authorization', `Bearer ${accessToken}`);
  }
  return result;
}

function buildAuthRequest(input, options = {}) {
  const request = input instanceof Request ? input : new Request(input, options);
  const headers = withAuthHeaders(request.headers);

  return new Request(request, {
    headers,
    credentials: 'include'
  });
}

export function formatRequestIdMessage(message, requestId) {
  return requestId ? `${message} (Request ID: ${requestId})` : message;
}

export async function buildApiError(response, fallbackMessage, options = {}) {
  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  const requestId = response.headers.get('X-Request-ID') || data?.request_id || data?.error?.request_id || null;
  const apiError = typeof data?.error === 'string' ? data.error : data?.error?.message;
  const message = formatRequestIdMessage(apiError || data?.message || fallbackMessage, requestId);
  const error = new Error(message);
  error.status = response.status;
  error.responseStatus = response.status;
  error.requestId = requestId;
  error.payload = data;
  const logLevel = options?.logLevel || 'error';
  const payload = {
    message: error.message,
    status: response.status,
    requestId,
    url: response.url
  };
  if (logLevel === 'error') console.error('ARTEMIS API error', payload);
  else if (logLevel === 'warn') console.warn('ARTEMIS API issue', payload);
  else if (logLevel === 'info') console.info('ARTEMIS API issue', payload);
  else if (logLevel === 'debug' && typeof console.debug === 'function') console.debug('ARTEMIS API issue', payload);
  return error;
}

async function parseAccessToken(response, fallbackMessage = 'Access token missing') {
  const data = await response.json();
  const token = data?.access_token ?? data?.accessToken ?? null;
  if (!token) throw new Error(fallbackMessage);
  accessToken = token;
  notifyAuthChanged();
  return data;
}

export function setAccessToken(token) {
  accessToken = token || null;
  notifyAuthChanged();
}

export function getAccessToken() {
  return accessToken;
}

export function clearAuth() {
  accessToken = null;
  refreshPromise = null;
  initPromise = null;
  notifyAuthChanged();
}

export function getCurrentUser() {
  if (!accessToken) return null;

  const claims = parseTokenClaims(accessToken);
  const roles = normalizeRoles(claims);
  const role = typeof claims?.role === 'string' ? claims.role : (roles[0] || null);

  return {
    accessToken,
    ...claims,
    role,
    roles,
    isAdmin: role === 'admin' || roles.includes('admin')
  };
}

export function canModerate(user = getCurrentUser()) {
  if (!user) return false;
  const role = String(user?.role || '').toLowerCase();
  const roles = Array.isArray(user?.roles) ? user.roles.map((value) => String(value).toLowerCase()) : [];
  return Boolean(user?.isAdmin || role === 'admin' || role === 'moderator' || roles.includes('admin') || roles.includes('moderator'));
}

export async function login(email, password) {
  const response = await requestApi('/auth/login', {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ email, password })
  }, 'Login failed');

  return parseAccessToken(response);
}

export async function register(email, password) {
  const response = await requestApi('/auth/register', {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ email, password })
  }, 'Регистрация не выполнена. Проверьте URL API и доступность /auth/register.');

  return parseAccessToken(response);
}

export async function logout() {
  try {
    const response = await requestApi('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    }, 'Logout failed');
  } finally {
    clearAuth();
  }
}

export async function refreshToken(options = {}) {
  if (refreshPromise) return refreshPromise;
  const isSessionRestore = options?.reason === 'session-restore';
  const timeoutMs = Math.max(1000, Number(options?.timeoutMs) || (isSessionRestore ? SESSION_RESTORE_TIMEOUT_MS : REFRESH_TIMEOUT_MS));
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort('auth-refresh-timeout'), timeoutMs);

  refreshPromise = (async () => {
    try {
      const response = await requestApi('/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal
      }, 'Refresh failed', {
        fallbackLogLevel: isSessionRestore ? 'debug' : 'info',
        expectedErrorStatuses: [401, 404, 405],
        expectedErrorLogLevel: isSessionRestore ? 'debug' : 'info',
        defaultErrorLogLevel: 'warn'
      });

      return parseAccessToken(response);
    } catch (error) {
      throw normalizeRefreshError(error);
    } finally {
      window.clearTimeout(timeoutId);
    }
  })();

  try {
    return await refreshPromise;
  } catch (error) {
    clearAuth();
    if (isSessionRestore && isExpectedSessionRestoreFailure(error)) {
      logSessionRestoreFailureOnce(error);
    }
    throw error;
  } finally {
    refreshPromise = null;
  }
}

function shouldAttemptRefresh(request) {
  try {
    const url = new URL(request.url, window.location.origin);
    return !url.pathname.endsWith('/auth/login')
      && !url.pathname.endsWith('/auth/register')
      && !url.pathname.endsWith('/auth/refresh')
      && !url.pathname.endsWith('/auth/logout');
  } catch (_error) {
    return true;
  }
}

export async function initAuth() {
  if (accessToken) return getCurrentUser();
  if (initPromise) return initPromise;
  if (sessionRestoreAttempted) return null;

  initPromise = (async () => {
    sessionRestoreAttempted = true;
    try {
      await refreshToken({ reason: 'session-restore', timeoutMs: SESSION_RESTORE_TIMEOUT_MS });
      return getCurrentUser();
    } catch (_error) {
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

function normalizeRefreshError(error) {
  if (error?.name === 'AbortError') {
    const timeoutError = new Error('Refresh timed out.');
    timeoutError.code = 'AUTH_REFRESH_TIMEOUT';
    timeoutError.status = 0;
    timeoutError.responseStatus = 0;
    return timeoutError;
  }
  if (error instanceof TypeError) {
    const networkError = new Error(error.message || 'Refresh network failure.');
    networkError.code = 'AUTH_REFRESH_NETWORK';
    networkError.status = 0;
    networkError.responseStatus = 0;
    return networkError;
  }
  return error;
}

export async function fetchWithAuth(input, options = {}) {
  const originalRequest = input instanceof Request ? input : new Request(input, options);
  const firstAttempt = buildAuthRequest(originalRequest);
  const response = await fetch(firstAttempt);

  if (response.status !== 401) {
    return response;
  }

  if (!shouldAttemptRefresh(originalRequest)) {
    handleAuthFailure();
    throw await buildApiError(response, 'Session expired. Please sign in again.');
  }

  try {
    await refreshToken();
  } catch (error) {
    handleAuthFailure();
    throw error;
  }

  const retryRequest = buildAuthRequest(originalRequest.clone());
  const retryResponse = await fetch(retryRequest);
  if (retryResponse.status === 401) {
    handleAuthFailure();
    throw await buildApiError(retryResponse, 'Session expired. Please sign in again.');
  }
  return retryResponse;
}

export const apiFetch = fetchWithAuth;
