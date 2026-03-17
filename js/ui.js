import { loadLayers } from './data.js';
import { updateMapData } from './map.js';

// Инициализация UI: фильтры, поиск, список и синхронизация с картой.
export async function initUI(map, features) {
  const allFeatures = features?.features || [];

  const elements = {
    searchInput: document.getElementById('search-input'),
    layerFilter: document.getElementById('layer-filter'),
    dateFrom: document.getElementById('date-from'),
    dateTo: document.getElementById('date-to'),
    objectList: document.getElementById('object-list'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle')
  };

  const layers = await loadLayers().catch(() => []);
  hydrateLayerFilter(elements.layerFilter, layers, allFeatures);

  let filteredFeatures = allFeatures;
  renderList(elements.objectList, filteredFeatures, map);

  const applyFilters = () => {
    const searchValue = elements.searchInput.value.trim().toLowerCase();
    const layerValue = elements.layerFilter.value;
    const from = parseInt(elements.dateFrom.value, 10);
    const to = parseInt(elements.dateTo.value, 10);

    filteredFeatures = allFeatures.filter((feature) => {
      const properties = feature.properties || {};
      const name = String(properties.name_ru || '').toLowerCase();
      const layerId = String(properties.layer_id || '');
      const dateStart = parseInt(properties.date_start, 10);
      const dateEnd = parseInt(properties.date_end, 10);

      if (searchValue && !name.includes(searchValue)) return false;
      if (layerValue && layerId !== layerValue) return false;

      if (!Number.isNaN(from)) {
        const endValue = Number.isNaN(dateEnd) ? dateStart : dateEnd;
        if (Number.isNaN(endValue) || endValue < from) return false;
      }

      if (!Number.isNaN(to)) {
        const startValue = Number.isNaN(dateStart) ? dateEnd : dateStart;
        if (Number.isNaN(startValue) || startValue > to) return false;
      }

      return true;
    });

    updateMapData(map, {
      type: 'FeatureCollection',
      features: filteredFeatures
    });

    renderList(elements.objectList, filteredFeatures, map);
  };

  [elements.searchInput, elements.layerFilter, elements.dateFrom, elements.dateTo].forEach((node) => {
    node.addEventListener('input', applyFilters);
    node.addEventListener('change', applyFilters);
  });

  elements.sidebarToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('collapsed');
  });
}

function hydrateLayerFilter(select, layers, allFeatures) {
  const seen = new Set();

  layers.forEach((layer) => {
    const id = String(layer.id || '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    select.appendChild(new Option(layer.name_ru || id, id));
  });

  allFeatures.forEach((feature) => {
    const id = String(feature?.properties?.layer_id || '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    select.appendChild(new Option(id, id));
  });
}

function renderList(container, features, map) {
  container.innerHTML = '';

  if (!features.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Ничего не найдено';
    container.appendChild(empty);
    return;
  }

  features.slice(0, 50).forEach((feature) => {
    const properties = feature.properties || {};
    const coords = feature?.geometry?.coordinates || [];

    const item = document.createElement('li');
    item.textContent = properties.name_ru || 'Без названия';

    item.addEventListener('click', () => {
      if (coords.length < 2) return;

      map.flyTo({
        center: coords,
        zoom: 10,
        essential: true
      });
    });

    container.appendChild(item);
  });
}
