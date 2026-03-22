import { showError, clearError, showLoading, hideLoading } from './ux.js';

// Кеш, чтобы не делать повторные запросы к локальным файлам.
let featuresCache = null;
let layersCache = null;

export async function loadFeatures() {
  if (featuresCache) return featuresCache;

  showLoading();

  try {
    const response = await fetchWithRetry('/data/features.geojson');
    if (!response.ok) {
      throw new Error(`Не удалось загрузить features.geojson: HTTP ${response.status}`);
    }

    featuresCache = await response.json();
    clearError();
    return featuresCache;
  } catch (error) {
    console.error('Ошибка при загрузке /data/features.geojson:', error);
    showError('Ошибка загрузки данных');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function loadLayers() {
  if (layersCache) return layersCache;

  showLoading();

  try {
    const response = await fetch('/data/layers.json');
    if (!response.ok) {
      throw new Error(`Не удалось загрузить layers.json: HTTP ${response.status}`);
    }

    layersCache = await response.json();
    clearError();
    return layersCache;
  } catch (error) {
    console.error('Ошибка при загрузке /data/layers.json:', error);
    throw error;
  } finally {
    hideLoading();
  }
}

async function fetchWithRetry(url, retryDelay = 1000) {
  try {
    const firstResponse = await fetch(url);
    if (firstResponse.ok) return firstResponse;
  } catch (_error) {
    // Повторим запрос ниже после короткой паузы.
  }

  await new Promise((resolve) => window.setTimeout(resolve, retryDelay));

  const secondResponse = await fetch(url);
  if (secondResponse.ok) return secondResponse;

  throw new Error(`Не удалось загрузить ${url}: HTTP ${secondResponse.status}`);
}
