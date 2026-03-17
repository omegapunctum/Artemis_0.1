// Кеш, чтобы не делать повторные запросы к локальным файлам.
let featuresCache = null;
let layersCache = null;

export async function loadFeatures() {
  if (featuresCache) return featuresCache;

  try {
    const response = await fetch('/data/features.geojson');
    if (!response.ok) {
      throw new Error(`Не удалось загрузить features.geojson: HTTP ${response.status}`);
    }

    featuresCache = await response.json();
    return featuresCache;
  } catch (error) {
    console.error('Ошибка при загрузке /data/features.geojson:', error);
    throw error;
  }
}

export async function loadLayers() {
  if (layersCache) return layersCache;

  try {
    const response = await fetch('/data/layers.json');
    if (!response.ok) {
      throw new Error(`Не удалось загрузить layers.json: HTTP ${response.status}`);
    }

    layersCache = await response.json();
    return layersCache;
  } catch (error) {
    console.error('Ошибка при загрузке /data/layers.json:', error);
    throw error;
  }
}
