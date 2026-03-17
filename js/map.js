const SOURCE_ID = 'artemis-features';
const LAYER_ID = 'artemis-points';
const CLUSTER_LAYER_ID = 'artemis-clusters';
const CLUSTER_COUNT_LAYER_ID = 'artemis-cluster-count';

// Инициализация карты и сразу загрузка GeoJSON в source.
export function initMap(containerId, features) {
  const shouldCluster = (features?.features?.length ?? 0) > 500;

  const map = new maplibregl.Map({
    container: containerId,
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [37.6176, 55.7558],
    zoom: 4
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  map.on('load', () => {
    loadGeoJSON(map, features, shouldCluster);
    bindPopupHandlers(map, shouldCluster);
    fitToFeatures(map, features);
  });

  return map;
}

export function updateMapData(map, features) {
  const source = map.getSource(SOURCE_ID);
  if (source) {
    source.setData(features);
  }
}

function loadGeoJSON(map, features, shouldCluster) {
  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: features,
    cluster: shouldCluster,
    clusterMaxZoom: 14,
    clusterRadius: 50
  });

  if (shouldCluster) {
    map.addLayer({
      id: CLUSTER_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#3b82f6',
        'circle-radius': ['step', ['get', 'point_count'], 14, 25, 20, 100, 26],
        'circle-opacity': 0.8
      }
    });

    map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    });
  }

  map.addLayer({
    id: LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    filter: shouldCluster ? ['!', ['has', 'point_count']] : undefined,
    paint: {
      'circle-radius': 6,
      'circle-color': '#2563eb',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1
    }
  });
}

function bindPopupHandlers(map, shouldCluster) {
  map.on('click', LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature) return;

    const props = feature.properties || {};
    const name = props.name_ru || 'Без названия';
    const description = props.description || 'Описание отсутствует';
    const imageUrl = props.image_url;

    const imageBlock = imageUrl
      ? `<img src="${imageUrl}" alt="${name}" style="width:100%;max-width:240px;border-radius:8px;margin-top:8px;"/>`
      : '';

    new maplibregl.Popup({ closeButton: true })
      .setLngLat(event.lngLat)
      .setHTML(`<strong>${name}</strong><br/>${description}${imageBlock}`)
      .addTo(map);
  });

  if (shouldCluster) {
    map.on('click', CLUSTER_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      if (!feature) return;

      const clusterId = feature.properties?.cluster_id;
      const source = map.getSource(SOURCE_ID);
      source.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (error) return;

        map.easeTo({
          center: feature.geometry.coordinates,
          zoom
        });
      });
    });
  }

  map.on('mouseenter', LAYER_ID, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
  });
}

function fitToFeatures(map, geojson) {
  const features = geojson?.features || [];
  if (!features.length) return;

  const bounds = new maplibregl.LngLatBounds();
  for (const feature of features) {
    const coords = feature?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      bounds.extend(coords);
    }
  }

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 40, maxZoom: 11 });
  }
}
