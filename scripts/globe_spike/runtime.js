(() => {
  'use strict';

  const FILES = {
    projection: './projection.json',
    globe: './globe-projection.json',
    state: './explorer-state.json',
    views: './explorer-views.json',
    assets: './geospatial-assets.json',
    context: './earth-context.geojson',
    capabilityPath: './capability-path.geojson',
    engineEvaluation: './engine-evaluation.json',
    acceptanceProfiles: './acceptance-profiles.json',
    knowledge: './knowledge-index.json',
    lifePath: './life-path.json',
    meta: './build-meta.json'
  };

  const SEMANTIC_LAYER_IDS = [
    'artemis-points',
    'artemis-semantic-lines',
    'artemis-region-primary-fill',
    'artemis-region-alt-fill'
  ];
  const ALTERNATIVE_LAYER_IDS = [
    'artemis-region-alt-fill',
    'artemis-region-alt-outline'
  ];

  const startedAt = performance.now();
  const runtime = {
    map: null,
    data: null,
    viewIndex: null,
    viewByKey: new Map(),
    knowledgeByItem: new Map(),
    selectedItemId: null,
    selectedPresenceId: null,
    activeTemporalPresetId: null,
    activeLifePathViewId: null,
    activeLayerRefs: [],
    lifePathMode: 'range',
    lifePathStartIndex: 0,
    lifePathEndIndex: 0,
    lifePathRangeStartIndex: 0,
    lifePathRangeEndIndex: 0,
    lifePathScrubStartIndex: 0,
    lifePathScrubCurrentIndex: 0,
    lifePathMarkers: new Map(), // Presence ID -> shared Place marker (selection aliases only)
    placeMarkers: new Map(), // Place ID -> one fixed spatial anchor
    chronologyCues: new Map(),
    lifePathPopup: null,
    popupPresenceId: null,
    markerClickTimer: null,
    alternativesVisible: true,
    performance: {
      startupToIdleMs: null,
      averageFrameMs: null,
      estimatedFps: null
    },
    acceptanceEvidence: null,
    visualReadiness: {
      ready: false,
      contextSourceFeatureCount: 0,
      contextRenderedFeatureCount: 0
    }
  };
  window.__ARTEMIS_GLOBE_SPIKE = runtime;

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = String(value ?? '—');
  }

  function appendText(host, tagName, text, className = '') {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    node.textContent = String(text ?? '—');
    host.append(node);
    return node;
  }

  function fatal(error) {
    const node = byId('fatal-error');
    if (node) {
      node.hidden = false;
      node.textContent = `ARTEMIS Globe spike failed:\n${String(error?.stack || error?.message || error)}`;
    }
    console.error('[ARTEMIS:globe-spike]', error);
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
    return response.json();
  }

  function parseList(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch (_error) {
      return [value];
    }
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function viewKey(temporalPresetId, layerRefs) {
    return `${temporalPresetId}|${[...(layerRefs || [])].sort().join(',')}`;
  }

  function geometrySignature(globe) {
    return JSON.stringify((globe?.primitives || []).map((primitive) => [
      primitive.primitive_id,
      primitive.primitive_kind,
      primitive.coordinates
    ]));
  }

  function alternativeGeometryCount(globe) {
    return (globe?.primitives || []).filter((primitive) => (
      primitive.render_role === 'region_geometry'
      && primitive.geometry_is_primary === false
    )).length;
  }

  function syncUrlState() {
    const url = new URL(window.location.href);
    if (runtime.data?.lifePath?.available) {
      const axisValues = runtime.data.lifePath.time_axis?.values || [];
      const start = axisValues[runtime.lifePathStartIndex];
      const end = axisValues[runtime.lifePathEndIndex];
      if (start == null || end == null) return;
      url.searchParams.set('mode', runtime.lifePathMode);
      if (runtime.lifePathMode === 'scrub') {
        url.searchParams.set('from', start);
        url.searchParams.set('at', end);
        url.searchParams.delete('start');
        url.searchParams.delete('end');
      } else {
        url.searchParams.set('start', start);
        url.searchParams.set('end', end);
        url.searchParams.delete('from');
        url.searchParams.delete('at');
      }
      url.searchParams.delete('time');
      url.searchParams.delete('layers');
      url.searchParams.delete('stop');
      if (runtime.selectedPresenceId) url.searchParams.set('presence', runtime.selectedPresenceId);
      else url.searchParams.delete('presence');
      if (runtime.selectedItemId) url.searchParams.set('item', runtime.selectedItemId);
      else url.searchParams.delete('item');
      window.history.replaceState({ artemisLifePathState: true }, '', url);
      return;
    }
    if (!runtime.activeTemporalPresetId) return;
    url.searchParams.set('time', runtime.activeTemporalPresetId);
    url.searchParams.set('layers', [...runtime.activeLayerRefs].sort().join(','));
    if (runtime.selectedItemId) url.searchParams.set('item', runtime.selectedItemId);
    else url.searchParams.delete('item');
    window.history.replaceState({ artemisExplorerState: true }, '', url);
  }

  function currentProjectionItem(itemId) {
    return (runtime.data?.projection?.items || []).find((item) => item.item_id === itemId) || null;
  }

  function cameraDuration() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
  }

  function accessibleName(node) {
    const ariaLabel = node.getAttribute('aria-label')?.trim();
    if (ariaLabel) return ariaLabel;
    const labelledBy = node.getAttribute('aria-labelledby');
    if (labelledBy) {
      const value = labelledBy
        .split(/\s+/)
        .map((id) => byId(id)?.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ');
      if (value) return value;
    }
    const labelText = [...(node.labels || [])]
      .map((label) => label.textContent?.trim() || '')
      .filter(Boolean)
      .join(' ');
    return labelText || node.textContent?.trim() || node.getAttribute('title')?.trim() || '';
  }

  function layoutMode(contract) {
    const breakpoints = contract.layout_breakpoints_css_px || {};
    if (window.innerWidth <= breakpoints.mobile_max_width) return 'mobile';
    if (window.innerWidth <= breakpoints.tablet_max_width) return 'tablet';
    return 'desktop';
  }

  function collectAcceptanceEvidence(contract) {
    const root = document.documentElement;
    const thresholds = contract.thresholds || {};
    const mode = layoutMode(contract);
    const requestedProfileId = new URLSearchParams(window.location.search).get('profile');
    const profile = (contract.profiles || []).find((candidate) => (
      candidate.profile_id === requestedProfileId
    )) || (contract.profiles || []).find((candidate) => (
      candidate.browser_window_css_px?.width === window.innerWidth
      && candidate.expected_layout_mode === mode
    ));
    const interactive = [...document.querySelectorAll('button, input, select, a[href], summary')]
      .filter((node) => !node.hidden && node.getClientRects().length > 0);
    const unnamed = interactive.filter((node) => !accessibleName(node));
    const measuredTargets = [...document.querySelectorAll('button, input[type="range"], select, summary')]
      .filter((node) => !node.hidden && node.getClientRects().length > 0);
    const minTarget = Number(thresholds.min_interactive_target_css_px || 24);
    const undersized = measuredTargets.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width < minTarget || rect.height < minTarget;
    });
    const globeRect = byId('globe-shell')?.getBoundingClientRect();
    const overlayRects = ['spike-banner', 'inspector', 'timeline-dock', 'attribution-status']
      .map((id) => byId(id)?.getBoundingClientRect())
      .concat([...document.querySelectorAll('.maplibregl-ctrl-group')].map((node) => node.getBoundingClientRect()))
      .filter((rect) => rect && rect.width > 0 && rect.height > 0);
    let overlayCollisions = 0;
    for (let left = 0; left < overlayRects.length; left += 1) {
      for (let right = left + 1; right < overlayRects.length; right += 1) {
        const a = overlayRects[left];
        const b = overlayRects[right];
        const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapWidth > 1 && overlapHeight > 1) overlayCollisions += 1;
      }
    }
    const horizontalOverflow = Math.max(0, root.scrollWidth - root.clientWidth);
    const reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    runtime.acceptanceEvidence = {
      evidence_scope: contract.evidence_scope,
      profile_id: profile?.profile_id || 'unmatched',
      layout_mode: mode,
      expected_layout_mode: profile?.expected_layout_mode || null,
      viewport_css_px: { width: window.innerWidth, height: window.innerHeight },
      reduced_motion: reducedMotion,
      horizontal_overflow_css_px: horizontalOverflow,
      unnamed_interactive_control_count: unnamed.length,
      undersized_target_count: undersized.length,
      overlay_collision_count: overlayCollisions,
      globe_css_px: {
        width: Math.round(globeRect?.width || 0),
        height: Math.round(globeRect?.height || 0)
      },
      startup_to_idle_ms: runtime.performance.startupToIdleMs,
      average_frame_ms: runtime.performance.averageFrameMs,
      visual_render_ready: runtime.visualReadiness.ready,
      context_source_feature_count: runtime.visualReadiness.contextSourceFeatureCount,
      context_rendered_feature_count: runtime.visualReadiness.contextRenderedFeatureCount,
      limitations: contract.limitations || []
    };

    root.dataset.artemisRuntimeReady = 'true';
    root.dataset.artemisViewportProfile = runtime.acceptanceEvidence.profile_id;
    root.dataset.artemisLayoutMode = mode;
    root.dataset.artemisViewportWidth = String(window.innerWidth);
    root.dataset.artemisViewportHeight = String(window.innerHeight);
    root.dataset.artemisReducedMotion = String(reducedMotion);
    root.dataset.artemisHorizontalOverflow = String(horizontalOverflow);
    root.dataset.artemisUnnamedControlCount = String(unnamed.length);
    root.dataset.artemisUndersizedTargetCount = String(undersized.length);
    root.dataset.artemisOverlayCollisionCount = String(overlayCollisions);
    root.dataset.artemisTimelineHeight = String(Math.ceil(byId('timeline-dock')?.getBoundingClientRect().height || 0));
    root.dataset.artemisChronologyLinkCount = String(runtime.map?.getLayer('life-path-chronology-line')
      ? lifePathConnectorGeoJson().features.length : 0);
    root.dataset.artemisGlobeWidth = String(runtime.acceptanceEvidence.globe_css_px.width);
    root.dataset.artemisGlobeHeight = String(runtime.acceptanceEvidence.globe_css_px.height);
    root.dataset.artemisStartupRecorded = String(runtime.performance.startupToIdleMs !== null);
    root.dataset.artemisStartupToIdleMs = runtime.performance.startupToIdleMs === null
      ? 'diagnostic-only-pending'
      : runtime.performance.startupToIdleMs.toFixed(1);
    root.dataset.artemisAverageFrameMs = runtime.performance.averageFrameMs === null
      ? 'diagnostic-only-pending'
      : runtime.performance.averageFrameMs.toFixed(1);
    root.dataset.artemisVisualReady = String(runtime.visualReadiness.ready);
    root.dataset.artemisContextSourceFeatureCount = String(runtime.visualReadiness.contextSourceFeatureCount);
    root.dataset.artemisContextRenderedFeatureCount = String(runtime.visualReadiness.contextRenderedFeatureCount);
  }

  function verifyEarthContextRender(map, contract) {
    const root = document.documentElement;
    let renderProbePending = false;

    const probe = () => {
      if (runtime.visualReadiness.ready || renderProbePending) return;
      if (!map.getSource('artemis-earth-context') || !map.isSourceLoaded('artemis-earth-context')) return;

      const sourceFeatures = map.querySourceFeatures('artemis-earth-context');
      runtime.visualReadiness.contextSourceFeatureCount = sourceFeatures.length;
      if (!sourceFeatures.length) {
        collectAcceptanceEvidence(contract);
        return;
      }

      renderProbePending = true;
      map.once('render', () => {
        renderProbePending = false;
        const renderedFeatures = map.queryRenderedFeatures({
          layers: ['artemis-present-day-land', 'artemis-present-day-coastline']
        });
        runtime.visualReadiness.contextRenderedFeatureCount = renderedFeatures.length;
        runtime.visualReadiness.ready = renderedFeatures.length > 0;
        collectAcceptanceEvidence(contract);
        if (!runtime.visualReadiness.ready) {
          map.triggerRepaint();
          window.requestAnimationFrame(probe);
        }
      });
      map.triggerRepaint();
    };

    root.dataset.artemisVisualReady = 'false';
    map.on('sourcedata', (event) => {
      if (event.sourceId === 'artemis-earth-context') probe();
    });
    window.requestAnimationFrame(probe);
  }

  function safeSourceHref(value) {
    try {
      const url = new URL(String(value || ''), window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch (_error) {
      return null;
    }
  }

  function semanticProperties(primitive) {
    return {
      item_id: primitive.item_id,
      object_ref: primitive.object_ref,
      object_type: primitive.object_type,
      subobject_ref: primitive.subobject_ref,
      render_role: primitive.render_role,
      temporal_membership: primitive.temporal_membership,
      geometry_ref: primitive.geometry_ref,
      geometry_reconstruction_mode: primitive.geometry_reconstruction_mode,
      geometry_is_primary: primitive.geometry_is_primary,
      layer_refs: JSON.stringify(primitive.layer_refs || []),
      claim_refs: JSON.stringify(primitive.claim_refs || []),
      uncertainty_refs: JSON.stringify(primitive.uncertainty_refs || []),
      evidence_link_refs: JSON.stringify(primitive.evidence_link_refs || []),
      source_refs: JSON.stringify(primitive.source_refs || []),
      semantic_flags: JSON.stringify(primitive.semantic_flags || {})
    };
  }

  function globePrimitivesToGeoJson(globe) {
    const typeMap = {
      cartographic_point: 'Point',
      cartographic_polyline: 'LineString',
      cartographic_polygon: 'Polygon',
      cartographic_multipolygon: 'MultiPolygon'
    };
    return {
      type: 'FeatureCollection',
      features: (globe.primitives || []).map((primitive) => {
        const geometryType = typeMap[primitive.primitive_kind];
        if (!geometryType) throw new Error(`Unsupported Globe primitive: ${primitive.primitive_kind}`);
        return {
          type: 'Feature',
          id: primitive.primitive_id,
          properties: semanticProperties(primitive),
          geometry: {
            type: geometryType,
            coordinates: primitive.coordinates
          }
        };
      })
    };
  }

  function createStyle() {
    return {
      version: 8,
      projection: { type: 'globe' },
      sources: {},
      layers: [
        {
          id: 'space-background',
          type: 'background',
          paint: { 'background-color': '#02050b' }
        }
      ],
      sky: {
        'atmosphere-blend': [
          'interpolate', ['linear'], ['zoom'],
          0, 1,
          4, 0.8,
          7, 0
        ]
      }
    };
  }

  function addContextLayers(map, context) {
    map.addSource('artemis-earth-context', { type: 'geojson', data: context });
    map.addLayer({
      id: 'artemis-present-day-land',
      type: 'fill',
      source: 'artemis-earth-context',
      filter: ['==', ['get', 'semantic_role'], 'present_day_context'],
      paint: {
        'fill-color': '#17334a',
        'fill-opacity': 0.92
      }
    });
    map.addLayer({
      id: 'artemis-present-day-coastline',
      type: 'line',
      source: 'artemis-earth-context',
      filter: ['==', ['get', 'semantic_role'], 'present_day_context'],
      paint: {
        'line-color': '#4f7591',
        'line-width': 0.7,
        'line-opacity': 0.8
      }
    });
  }

  function addSemanticLayers(map, globe) {
    const data = globePrimitivesToGeoJson(globe);
    map.addSource('artemis-semantic', { type: 'geojson', data });

    map.addLayer({
      id: 'artemis-region-primary-fill',
      type: 'fill',
      source: 'artemis-semantic',
      filter: [
        'all',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['get', 'render_role'], 'region_geometry'],
        ['==', ['get', 'geometry_is_primary'], true]
      ],
      paint: {
        'fill-color': '#3a8d8b',
        'fill-opacity': 0.32
      }
    });
    map.addLayer({
      id: 'artemis-region-primary-outline',
      type: 'line',
      source: 'artemis-semantic',
      filter: [
        'all',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['get', 'render_role'], 'region_geometry'],
        ['==', ['get', 'geometry_is_primary'], true]
      ],
      paint: {
        'line-color': '#82d8d3',
        'line-width': 2.2,
        'line-opacity': 0.95
      }
    });

    map.addLayer({
      id: 'artemis-region-alt-fill',
      type: 'fill',
      source: 'artemis-semantic',
      filter: [
        'all',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['get', 'render_role'], 'region_geometry'],
        ['==', ['get', 'geometry_is_primary'], false]
      ],
      paint: {
        'fill-color': '#c79a58',
        'fill-opacity': 0.2
      }
    });
    map.addLayer({
      id: 'artemis-region-alt-outline',
      type: 'line',
      source: 'artemis-semantic',
      filter: [
        'all',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['get', 'render_role'], 'region_geometry'],
        ['==', ['get', 'geometry_is_primary'], false]
      ],
      paint: {
        'line-color': '#f0c47a',
        'line-width': 2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.95
      }
    });

    map.addLayer({
      id: 'artemis-semantic-lines',
      type: 'line',
      source: 'artemis-semantic',
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: {
        'line-color': '#8bc3ff',
        'line-width': 3,
        'line-opacity': 0.9
      }
    });

    if (!runtime.data?.lifePath?.available) {
      map.addLayer({
        id: 'artemis-points',
        type: 'circle',
        source: 'artemis-semantic',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#72c7ff',
          'circle-stroke-color': '#e4f5ff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.95
        }
      });
    }
  }

  function addCapabilityPath(map, capabilityPath) {
    map.addSource('renderer-capability-path', { type: 'geojson', data: capabilityPath });
    map.addLayer({
      id: 'renderer-capability-path-line',
      type: 'line',
      source: 'renderer-capability-path',
      paint: {
        'line-color': '#d79ae8',
        'line-width': 2.5,
        'line-dasharray': [1.5, 1.5],
        'line-opacity': 0.9
      }
    });
  }

  function configureTerrainPath(map, manifest) {
    const terrain = (manifest.assets || []).find((asset) => asset.asset_kind === 'terrain_elevation');
    const node = byId('terrain-status');
    if (!terrain) {
      if (node) node.textContent = 'Terrain: no terrain asset in manifest';
      return;
    }

    const provider = terrain.provider || {};
    const endpoint = provider.endpoint_template || '';
    const liveRasterDem = provider.adapter_kind === 'raster_url_template'
      && /^https?:\/\//i.test(endpoint);

    if (!liveRasterDem) {
      if (node) {
        node.textContent = `Terrain: adapter ready · ${terrain.asset_id} is synthetic/no live DEM`;
      }
      return;
    }

    map.addSource('artemis-terrain', {
      type: 'raster-dem',
      tiles: [endpoint],
      tileSize: 256
    });
    map.setTerrain({ source: 'artemis-terrain', exaggeration: 1 });
    if (node) node.textContent = `Terrain: enabled from manifest asset ${terrain.asset_id}`;
  }

  function renderAttribution(manifest) {
    const rows = (manifest.assets || []).map((asset) => asset.licensing?.attribution_text).filter(Boolean);
    setText('attribution-status', rows.join(' · '));
  }

  function renderSharedState(data) {
    const temporal = data.state.temporal_selection || {};
    const contextAsset = (data.assets.assets || []).find((asset) => asset.asset_kind === 'vector_basemap');
    setText('world-slice', data.state.world_slice_ref);
    setText('explorer-state', data.state.state_id);
    setText('selected-time', temporal.start === temporal.end ? temporal.start : `${temporal.start} → ${temporal.end}`);
    setText('projection-id', data.projection.projection_id);
    setText('primitive-count', (data.globe.primitives || []).length);
    setText(
      'corpus-status',
      data.knowledge.corpus_status_label
        || (data.knowledge.historical_corpus_ready
          ? 'reviewed historical corpus'
          : 'candidate package · historical readiness not established')
    );
    setText(
      'boundary-status',
      `Earth context: ${contextAsset?.label || 'bundled reference layer'} · real generalized physical geography · present_day_context only. Semantic input: ${data.knowledge.corpus_status_label || 'status unavailable'}. No historical coastline validity, historical geometry, real terrain, satellite imagery, provider token, or public promotion is implied.`
    );
    setText('deferred-types', (data.knowledge.deferred_object_types || []).join(', ') || 'none');

    const cards = [
      ['active', (data.projection.active_object_refs || []).length],
      ['possible', (data.projection.possible_active_object_refs || []).length],
      ['context', (data.projection.context_object_refs || []).length],
      ['losses', (data.projection.losses || []).length]
    ];
    const summary = byId('semantic-summary');
    if (summary) {
      summary.innerHTML = '';
      for (const [label, value] of cards) {
        const card = document.createElement('div');
        card.className = 'summary-card';
        const strong = document.createElement('strong');
        strong.textContent = String(value);
        const span = document.createElement('span');
        span.textContent = label;
        card.append(strong, span);
        summary.append(card);
      }
    }
  }

  function renderTemporalStatus(view) {
    const preset = (runtime.viewIndex?.temporal_presets || []).find(
      (candidate) => candidate.preset_id === view.temporal_preset_id
    );
    const comparableViews = (runtime.viewIndex?.views || []).filter(
      (candidate) => viewKey('', candidate.active_layer_refs) === viewKey('', view.active_layer_refs)
    );
    const signatures = new Set(comparableViews.map((candidate) => geometrySignature(candidate.globe)));
    const geometryIsTimeInvariant = comparableViews.length > 1 && signatures.size === 1;
    const recordCount = (view.projection.items || []).length;
    const primitiveCount = (view.globe.primitives || []).length;
    const base = `${preset?.label || view.temporal_preset_id}. ${recordCount} records in the semantic projection.`;
    const explanation = geometryIsTimeInvariant
      ? ' The globe geometry is unchanged across these source-bound dates: only present-day named-settlement reference points are authorized; exact historical positions, routes and Region boundaries remain unknown.'
      : ` ${primitiveCount} authorized spatial primitives are visible for this time/layer view.`;
    setText('temporal-map-status', `${base}${explanation}`);
    document.documentElement.dataset.artemisTemporalGeometryChanged = String(!geometryIsTimeInvariant);
  }

  function updateAlternativeGeometryControl(globe) {
    const control = byId('toggle-alternatives');
    if (!control) return;
    const count = alternativeGeometryCount(globe);
    control.hidden = count === 0;
    control.disabled = count === 0;
    control.setAttribute('aria-pressed', String(runtime.alternativesVisible));
    control.textContent = `Map display: alternative geometry ${runtime.alternativesVisible ? 'shown' : 'hidden'} (${count})`;
    document.documentElement.dataset.artemisAlternativeGeometryCount = String(count);
  }

  function applyAlternativeLayerVisibility(map) {
    if (!map) return;
    for (const layerId of ALTERNATIVE_LAYER_IDS) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          'visibility',
          runtime.alternativesVisible ? 'visible' : 'none'
        );
      }
    }
  }

  function renderUnresolved(projection) {
    const host = byId('unresolved-list');
    if (!host) return;
    host.innerHTML = '';

    const lossByItem = new Map((projection.losses || []).map((loss) => [loss.item_id, loss]));
    const unresolved = (projection.items || []).filter((item) => item.spatial_status === 'unresolved');
    setText('unresolved-count', unresolved.length);

    for (const item of unresolved) {
      const loss = lossByItem.get(item.item_id);
      const segmentKind = item.semantic_flags?.segment_kind || null;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'unresolved-item';
      if (segmentKind === 'inferred_gap') row.dataset.kind = 'trajectory-gap';
      row.dataset.itemId = item.item_id;
      row.setAttribute('aria-pressed', String(item.item_id === runtime.selectedItemId));
      row.setAttribute('aria-label', `Inspect unresolved ${item.object_type} ${item.object_ref}`);

      appendText(row, 'strong', `${item.object_type} · ${item.object_ref}`);

      const uncertainty = (item.uncertainty_refs || []).join(', ') || 'none';
      appendText(
        row,
        'span',
        `subobject=${item.subobject_ref || '—'} · reason=${loss?.reason || 'unresolved'} · uncertainty=${uncertainty}`
      );
      row.addEventListener('click', () => selectKnowledgeItem(item.item_id, { focus: true }));
      host.append(row);
    }

    if (!unresolved.length) {
      host.textContent = 'No unresolved semantic items in this projection.';
    }
  }

  function addIdentityRows(host, record) {
    const geometry = (record.geometries || [])[0] || null;
    const rows = [
      ['object_ref', record.object_ref],
      ['subobject_ref', record.subobject_ref || '—'],
      ['type', record.object_type],
      ['role', record.render_role],
      ['temporal', record.temporal_membership],
      ['spatial', record.spatial_status],
      ['geometry role', geometry?.origin_kind || '—'],
      ['spatial precision', geometry?.spatial_precision || '—']
    ];
    if (record.semantic_flags?.reconstruction_mode) {
      rows.push(['reconstruction', record.semantic_flags.reconstruction_mode]);
      rows.push(['primary geometry', String(record.semantic_flags.is_primary === true)]);
    }
    const dl = document.createElement('dl');
    dl.className = 'identity-list';
    for (const [key, value] of rows) {
      appendText(dl, 'dt', key);
      appendText(dl, 'dd', value);
    }
    host.append(dl);
  }

  function knowledgeDisclosure(host, label, count) {
    const section = document.createElement('details');
    section.className = 'knowledge-section knowledge-disclosure';
    const summary = document.createElement('summary');
    summary.textContent = `${label} · ${count}`;
    section.append(summary);
    host.append(section);
    return section;
  }

  function addEvidence(host, record) {
    const section = knowledgeDisclosure(host, 'Claims & evidence', (record.claims || []).length);
    const evidenceByClaim = new Map();
    for (const evidence of record.evidence_links || []) {
      const rows = evidenceByClaim.get(evidence.claim_id) || [];
      rows.push(evidence);
      evidenceByClaim.set(evidence.claim_id, rows);
    }
    const sourceById = new Map((record.sources || []).map((source) => [source.id, source]));

    if (!(record.claims || []).length) {
      appendText(section, 'p', 'No projected claims for this semantic item.', 'empty-note');
    }
    for (const claim of record.claims || []) {
      const group = document.createElement('article');
      group.className = 'evidence-group';
      appendText(group, 'div', claim.id, 'record-id');
      appendText(group, 'p', claim.statement, 'claim-statement');
      appendText(
        group,
        'div',
        `${claim.review_state} · confidence ${claim.confidence} · evidence ${claim.evidence_state}`,
        'record-meta'
      );

      for (const evidence of evidenceByClaim.get(claim.id) || []) {
        const source = sourceById.get(evidence.source_id);
        const row = document.createElement('div');
        row.className = 'evidence-row';
        const sourceHref = source ? safeSourceHref(source.artifact_uri || source.uri) : null;
        if (source && sourceHref) {
          const link = document.createElement('a');
          link.href = sourceHref;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = source.title || source.id;
          row.append(link);
        } else {
          appendText(row, 'span', evidence.source_id);
        }
        if (source) {
          appendText(
            row,
            'span',
            `${source.source_type} · ${source.review_state} · ${source.uri}`,
            'record-meta'
          );
        }
        appendText(row, 'code', evidence.locator, 'evidence-locator');
        appendText(
          row,
          'span',
          `${evidence.relation_to_claim} · ${evidence.evidence_strength} · ${evidence.review_state}`,
          'record-meta'
        );
        group.append(row);
      }
      section.append(group);
    }
  }

  function addUncertainties(host, record) {
    const section = knowledgeDisclosure(host, 'Material uncertainty', (record.uncertainties || []).length);
    if (!(record.uncertainties || []).length) {
      appendText(section, 'p', 'No material uncertainty is referenced by this projection item.', 'empty-note');
    }
    for (const uncertainty of record.uncertainties || []) {
      const card = document.createElement('article');
      card.className = 'uncertainty-card';
      appendText(card, 'div', uncertainty.id, 'record-id');
      appendText(card, 'strong', uncertainty.dimension);
      appendText(card, 'p', uncertainty.description);
      appendText(card, 'p', `Effect: ${uncertainty.effect}`, 'uncertainty-effect');
      if ((uncertainty.alternatives || []).length) {
        appendText(card, 'p', `Alternatives: ${uncertainty.alternatives.join(' · ')}`, 'record-meta');
      }
      section.append(card);
    }
  }

  function addReconstructionAlternatives(host, record) {
    if (record.object_type !== 'Region') return;
    const alternatives = (runtime.data?.projection?.items || []).filter((item) => (
      item.object_type === 'Region'
      && item.object_ref === record.object_ref
      && item.semantic_flags?.reconstruction_mode
    ));
    if (!alternatives.length) return;

    const section = knowledgeDisclosure(host, 'Reconstruction alternatives', alternatives.length);
    const allGeometryWithheld = alternatives.every((alternative) => (
      !(alternative.geometry_refs || []).length || alternative.spatial_status === 'unresolved'
    ));
    appendText(
      section,
      'p',
      allGeometryWithheld
        ? 'These are separate source-bound interpretations. No variant has authorized geometry, so none is drawn as a Region boundary.'
        : 'These are separate source-bound interpretations. Geometry availability is reported per variant; the map control appears when toggleable alternative geometry is present.',
      'empty-note'
    );
    for (const alternative of alternatives) {
      const geometryAvailable = (alternative.geometry_refs || []).length > 0
        && alternative.spatial_status !== 'unresolved';
      const card = document.createElement('article');
      card.className = 'alternative-card';
      appendText(
        card,
        'strong',
        `${alternative.subobject_ref}${alternative.item_id === record.item_id ? ' · selected' : ''}`
      );
      appendText(
        card,
        'p',
        `${alternative.semantic_flags.reconstruction_mode} · primary=${alternative.semantic_flags.is_primary === true} · spatial=${alternative.spatial_status}`,
        'record-meta'
      );
      appendText(
        card,
        'p',
        geometryAvailable
          ? `Geometry available (${alternative.geometry_refs.length} reference${alternative.geometry_refs.length === 1 ? '' : 's'}); rendered by its semantic layer.`
          : 'Geometry withheld; not rendered.',
        geometryAvailable ? 'record-meta' : 'warning'
      );
      section.append(card);
    }
  }

  function addCoverage(host) {
    const coverage = runtime.data?.projection?.coverage || {};
    const policy = coverage.coverage_policy || {};
    const exclusions = policy.known_exclusion_ids || [];
    const section = knowledgeDisclosure(host, 'Coverage / corpus limits', exclusions.length);
    appendText(
      section,
      'p',
      'The corpus is explicitly incomplete. Missing records or geometry must not be interpreted as historical absence.',
      'warning'
    );
    const dl = document.createElement('dl');
    dl.className = 'identity-list';
    for (const [key, value] of [
      ['corpus completeness', policy.corpus_completeness || 'unavailable'],
      ['absence semantics', policy.absence_semantics || 'unavailable'],
      ['source scope', policy.source_scope || 'unavailable'],
      ['coverage manifest', coverage.coverage_manifest_ref || 'unavailable']
    ]) {
      appendText(dl, 'dt', key);
      appendText(dl, 'dd', value);
    }
    section.append(dl);
    if (exclusions.length) {
      const list = document.createElement('ul');
      list.className = 'coverage-list';
      for (const exclusion of exclusions) appendText(list, 'li', exclusion);
      section.append(list);
    }
  }

  function addProjectionLosses(host, record) {
    const section = knowledgeDisclosure(host, 'Projection loss', (record.projection_losses || []).length);
    if (!(record.projection_losses || []).length) {
      appendText(section, 'p', 'No projection loss is recorded for this item.', 'empty-note');
    }
    for (const loss of record.projection_losses || []) {
      appendText(
        section,
        'p',
        `${loss.loss_kind} · ${loss.reason} · ${loss.severity}`,
        'loss-card'
      );
    }
  }

  function renderKnowledgeRecord(record) {
    const card = byId('selection-card');
    if (!card) return;
    card.classList.remove('empty');
    card.innerHTML = '';
    card.dataset.itemId = record.item_id;
    appendText(card, 'div', record.label, 'selection-title');
    appendText(card, 'div', record.item_id, 'record-id');
    addIdentityRows(card, record);
    addEvidence(card, record);
    addUncertainties(card, record);
    addReconstructionAlternatives(card, record);
    addCoverage(card);
    addProjectionLosses(card, record);
  }

  function formatPresenceTime(presence) {
    const temporal = presence?.temporal || {};
    if (!temporal.start) return 'Date unavailable';
    if (temporal.start === temporal.end) return temporal.start;
    return `${temporal.start} → ${temporal.end}`;
  }

  function lifePathAxisValues() {
    return runtime.data?.lifePath?.time_axis?.values || [];
  }

  function formatAxisValue(index) {
    return lifePathAxisValues()[index] || '—';
  }

  function selectedLifePathTemporalExtent() {
    const start = formatAxisValue(runtime.lifePathStartIndex);
    const end = formatAxisValue(runtime.lifePathEndIndex);
    if (runtime.lifePathMode === 'scrub') {
      return {
        mode: 'instant',
        start: end,
        end,
        precision: runtime.data?.lifePath?.time_axis?.axis_kind || 'unknown',
        calendar: runtime.data?.lifePath?.time_axis?.calendar || 'proleptic_gregorian'
      };
    }
    return {
      mode: start === end ? 'instant' : 'interval',
      start,
      end,
      precision: runtime.data?.lifePath?.time_axis?.axis_kind || 'unknown',
      calendar: runtime.data?.lifePath?.time_axis?.calendar || 'proleptic_gregorian'
    };
  }

  function visibleLifePathPresences() {
    const start = runtime.lifePathStartIndex;
    const end = runtime.lifePathEndIndex;
    return (runtime.data?.lifePath?.presences || []).filter((presence) => (
      presence.axis_start_index <= end && presence.axis_end_index >= start
    ));
  }

  function canonicalLifePathView(presences = visibleLifePathPresences()) {
    if (!presences.length) return null;
    const first = Math.min(...presences.map((presence) => presence.index));
    const last = Math.max(...presences.map((presence) => presence.index));
    return (runtime.data?.lifePath?.views || []).find((view) => (
      view.start_index === first && view.end_index === last
    )) || null;
  }

  function transitionToPresence(presenceId) {
    return (runtime.data?.lifePath?.transitions || []).find(
      (transition) => transition.to_presence_ref === presenceId
    ) || null;
  }

  function renderLifePathPresence(presence) {
    const card = byId('selection-card');
    if (!card || !presence) return;
    const eventRecord = runtime.knowledgeByItem.get(presence.event_item_id);
    const presenceRecord = runtime.knowledgeByItem.get(presence.presence_item_id);
    const transition = transitionToPresence(presence.presence_id);
    card.classList.remove('empty');
    card.innerHTML = '';
    card.dataset.itemId = presence.event_item_id;
    card.dataset.presenceId = presence.presence_id;
    appendText(card, 'div', presence.place_label, 'stop-card-title');
    appendText(card, 'div', formatPresenceTime(presence), 'stop-card-date');
    appendText(card, 'p', presence.short_description, 'stop-card-activity');

    const facts = document.createElement('dl');
    facts.className = 'stop-fact-list';
    for (const [label, value] of [
      ['Duration', presence.duration_status === 'range_not_continuous_position'
        ? 'Source-bounded residence period; not a continuous daily position'
        : 'Not established beyond the documented source anchor'],
      ['Position', `${String(presence.spatial_precision || 'named place').replaceAll('_', ' ')}; exact historical position unknown`],
      ['Route', transition ? 'Exact route unknown; dashed links show order only' : 'First documented presence']
    ]) {
      const row = document.createElement('div');
      appendText(row, 'dt', label);
      appendText(row, 'dd', value);
      facts.append(row);
    }
    card.append(facts);

    const details = document.createElement('details');
    details.className = 'knowledge-details';
    const summary = document.createElement('summary');
    summary.textContent = 'Sources and uncertainty';
    const body = document.createElement('div');
    body.className = 'knowledge-details-body';
    if (eventRecord) {
      appendText(body, 'div', eventRecord.item_id, 'record-id');
      addEvidence(body, eventRecord);
      addUncertainties(body, eventRecord);
    }
    if (presenceRecord) {
      const presence = knowledgeDisclosure(body, 'Place-anchor evidence', (presenceRecord.claims || []).length);
      addEvidence(presence, presenceRecord);
      addUncertainties(presence, presenceRecord);
    }
    if (!eventRecord && (presence.sources || []).length) {
      const sourceSection = knowledgeDisclosure(body, 'Reviewed package sources', presence.sources.length);
      const evidenceBySource = new Map();
      for (const evidence of presence.evidence_links || []) {
        const rows = evidenceBySource.get(evidence.source_id) || [];
        rows.push(evidence);
        evidenceBySource.set(evidence.source_id, rows);
      }
      for (const source of presence.sources) {
        const row = document.createElement('article');
        row.className = 'evidence-group';
        const sourceHref = safeSourceHref(source.url);
        if (sourceHref) {
          const link = document.createElement('a');
          link.href = sourceHref;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = source.title || source.source_id;
          row.append(link);
        } else {
          appendText(row, 'strong', source.title || source.source_id);
        }
        appendText(row, 'div', source.organization, 'record-meta');
        for (const evidence of evidenceBySource.get(source.source_id) || []) {
          appendText(row, 'code', evidence.locator, 'evidence-locator');
        }
        sourceSection.append(row);
      }
      const uncertaintySection = knowledgeDisclosure(
        body, 'Material uncertainty', (presence.uncertainties || []).length
      );
      for (const uncertainty of presence.uncertainties || []) {
        const card = document.createElement('article');
        card.className = 'uncertainty-card';
        appendText(card, 'strong', uncertainty.dimension);
        appendText(card, 'p', uncertainty.description);
        appendText(card, 'p', `Effect: ${uncertainty.effect}`, 'uncertainty-effect');
        uncertaintySection.append(card);
      }
    }
    appendPlaceEpisodes(body, presence);
    addCoverage(body);
    details.append(summary, body);
    card.append(details);
  }

  function syncLifePathSelectionControls() {
    const selectedPlace = (runtime.data?.lifePath?.presences || []).find(p => p.presence_id === runtime.selectedPresenceId)?.place_ref;
    for (const [placeId, marker] of runtime.placeMarkers) {
      marker.getElement().setAttribute('aria-pressed', String(placeId === selectedPlace));
    }
    for (const button of byId('presence-sequence')?.querySelectorAll('button') || []) {
      button.setAttribute('aria-pressed', String(button.dataset.presenceId === runtime.selectedPresenceId));
    }
    const selected = (runtime.data?.lifePath?.presences || []).find((p) => p.presence_id === runtime.selectedPresenceId);
    const periodId = selected && presencePeriod(selected)?.period_id;
    for (const button of byId('macro-periods')?.querySelectorAll('button') || []) {
      button.setAttribute('aria-current', String(button.dataset.periodId === periodId));
    }
  }

  function bindPresenceEmphasis(element, presenceId) {
    const emphasize = (active) => {
      runtime.lifePathMarkers.get(presenceId)?.getElement().classList.toggle('is-emphasized', active);
      for (const button of byId('presence-sequence')?.querySelectorAll('button') || []) {
        if (button.dataset.presenceId === presenceId) button.classList.toggle('is-emphasized', active);
      }
    };
    element.addEventListener('mouseenter', () => emphasize(true));
    element.addEventListener('mouseleave', () => emphasize(false));
    element.addEventListener('focus', () => emphasize(true));
    element.addEventListener('blur', () => emphasize(false));
  }

  function closeDetailsDrawer() {
    const inspector = byId('inspector');
    const restoreFocus = inspector?.contains(document.activeElement);
    if (inspector) inspector.hidden = true;
    document.documentElement.dataset.artemisDetailsOpen = 'false';
    if (restoreFocus) {
      const target = [...(byId('presence-sequence')?.querySelectorAll('button') || [])]
        .find((button) => button.dataset.presenceId === runtime.selectedPresenceId && !button.hidden);
      (target || byId('mode-range'))?.focus({ preventScroll: true });
    }
  }

  function openDetailsDrawer(presenceId, options = {}) {
    const presence = (runtime.data?.lifePath?.presences || []).find(
      (candidate) => candidate.presence_id === presenceId
    );
    if (!presence) return;
    runtime.lifePathPopup?.remove();
    runtime.lifePathPopup = null;
    runtime.popupPresenceId = null;
    renderLifePathPresence(presence);
    const inspector = byId('inspector');
    if (inspector) inspector.hidden = false;
    document.documentElement.dataset.artemisDetailsOpen = 'true';
    if (options.focus !== false) byId('selection-card')?.focus({ preventScroll: false });
  }

  function showPresencePopup(presence) {
    if (!runtime.map || !presence) return;
    closeDetailsDrawer();
    runtime.lifePathPopup?.remove();
    const content = document.createElement('article');
    content.className = 'presence-popup-card';
    appendText(content, 'div', presence.place_label, 'popup-place');
    appendText(content, 'div', formatPresenceTime(presence), 'popup-date');
    appendText(content, 'p', presence.short_description, 'popup-summary');
    const detailsButton = document.createElement('button');
    detailsButton.type = 'button';
    detailsButton.className = 'popup-details';
    detailsButton.textContent = 'Open details';
    detailsButton.addEventListener('click', () => openDetailsDrawer(presence.presence_id));
    content.append(detailsButton);
    appendPlaceEpisodes(content, presence);
    runtime.lifePathPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 26,
      className: 'life-path-popup'
    })
      .setLngLat(presence.coordinates)
      .setDOMContent(content)
      .addTo(runtime.map);
    runtime.popupPresenceId = presence.presence_id;
    runtime.lifePathPopup.on('close', () => {
      runtime.popupPresenceId = null;
      runtime.lifePathPopup = null;
    });
  }

  function selectLifePathPresence(presenceId, options = {}) {
    const presence = (runtime.data?.lifePath?.presences || []).find(
      (candidate) => candidate.presence_id === presenceId
    );
    if (!presence || !visibleLifePathPresences().some(
      (candidate) => candidate.presence_id === presenceId
    )) return;
    runtime.selectedPresenceId = presence.presence_id;
    runtime.selectedItemId = presence.event_item_id;
    document.documentElement.dataset.artemisSelectedPresence = presence.presence_id;
    document.documentElement.dataset.artemisSelectedItem = presence.event_item_id;
    const projectionItem = currentProjectionItem(presence.event_item_id);
    if (projectionItem) updateCanonicalSelection(projectionItem);
    syncLifePathSelectionControls();
    updateLifePathConnectors();
    [...(byId('presence-sequence')?.querySelectorAll('button') || [])]
      .find((button) => button.dataset.presenceId === presence.presence_id)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    if (options.popup !== false) showPresencePopup(presence);
    if (options.openDetails === true) openDetailsDrawer(presence.presence_id, options);
    if (options.fly === true && runtime.map) {
      runtime.map.flyTo({
        center: presence.coordinates,
        zoom: Math.max(runtime.map.getZoom(), 6.7),
        pitch: 25,
        duration: cameraDuration()
      });
    }
    if (options.syncUrl !== false) syncUrlState();
  }

  function updateLifePathMarkers() {
    const visibleIds = new Set(visibleLifePathPresences().map((presence) => presence.presence_id));
    const currentPresence = runtime.lifePathMode === 'scrub'
      ? [...visibleLifePathPresences()].sort((a, b) => a.axis_start_index - b.axis_start_index).at(-1)
      : null;
    const groups = visiblePlaceGroups();
    for (const [placeId, marker] of runtime.placeMarkers) {
      const episodes = groups.get(placeId) || [];
      const node = marker.getElement();
      node.hidden = episodes.length === 0;
      node.classList.toggle('is-current', episodes.some(p => p.presence_id === currentPresence?.presence_id));
      const count = node.querySelector('.place-count');
      if (count) count.textContent = episodes.length > 1 ? ` ×${episodes.length}` : '';
      const chosen = placeClickPresence(placeId);
      if (chosen) {
        node.title = episodes.map(p => `${p.place_label}: ${formatPresenceTime(p)}`).join('; ');
        node.setAttribute('aria-label', `Show ${chosen.place_label} summary, ${formatPresenceTime(chosen)}; double-click to focus map`);
      }
    }
    for (const button of byId('presence-sequence')?.querySelectorAll('button') || []) {
      button.hidden = !visibleIds.has(button.dataset.presenceId);
      button.classList.toggle('is-current', button.dataset.presenceId === currentPresence?.presence_id);
    }
    syncLifePathSelectionControls();
    layoutPlaceLabels();
  }

  function presencePeriod(presence) {
    return (runtime.data?.lifePath?.macro_periods || []).find(
      (period) => period.presence_refs.includes(presence.presence_id)
    );
  }

  function renderPresenceSequence() {
    const host = byId('presence-sequence');
    if (!host) return;
    host.replaceChildren();
    for (const presence of [...(runtime.data?.lifePath?.presences || [])].sort((a, b) => a.index - b.index)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.presenceId = presence.presence_id;
      button.className = 'presence-sequence-item';
      button.textContent = `${presence.index + 1} · ${presence.place_label}`;
      const period = presencePeriod(presence);
      button.title = `${formatPresenceTime(presence)} · ${period?.label || 'Romagna source anchors'}`;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => selectLifePathPresence(presence.presence_id, { fly: false }));
      bindPresenceEmphasis(button, presence.presence_id);
      host.append(button);
    }
  }

  function syncOverlayLayout() {
    const root = document.documentElement;
    const dock = byId('timeline-dock')?.getBoundingClientRect();
    const banner = byId('spike-banner')?.getBoundingClientRect();
    const attribution = byId('attribution-status')?.getBoundingClientRect();
    root.style.setProperty('--dock-height', `${Math.ceil(dock?.height || 180)}px`);
    root.style.setProperty('--banner-bottom', `${Math.ceil(banner?.bottom || 72)}px`);
    root.style.setProperty('--attribution-height', `${Math.ceil(attribution?.height || 30)}px`);
  }

  function lifePathConnectorGeoJson() {
    if (runtime.data?.lifePath?.route_policy?.chronological_connector_permitted !== true) {
      return { type: 'FeatureCollection', features: [] };
    }
    const visible = new Map(visibleLifePathPresences().map(
      (presence) => [presence.presence_id, presence]
    ));
    const features = [];
    for (const transition of runtime.data?.lifePath?.transitions || []) {
      const from = visible.get(transition.from_presence_ref);
      const to = visible.get(transition.to_presence_ref);
      if (!from || !to) continue;
      features.push({
        type: 'Feature',
        properties: {
          transition_id: transition.transition_id,
          semantic_role: 'chronological_connection',
          route_status: transition.route_status,
          route_geometry: null,
          emphasis: chronologyEmphasis(transition),
          is_historical_route_geometry: false
        },
        geometry: { type: 'LineString', coordinates: [from.coordinates, to.coordinates] }
      });
    }
    return { type: 'FeatureCollection', features };
  }

  function chronologyEmphasis(transition) {
    const current = runtime.lifePathMode === 'scrub'
      ? [...visibleLifePathPresences()].sort((a, b) => a.index - b.index).at(-1)?.presence_id : null;
    if (current && transition.to_presence_ref === current) return 2;
    return [transition.from_presence_ref, transition.to_presence_ref].includes(runtime.selectedPresenceId) ? 1 : 0;
  }

  function updateLifePathConnectors() {
    const data = lifePathConnectorGeoJson();
    runtime.map?.getSource?.('life-path-chronology')?.setData(data);
    if (!runtime.map || !runtime.chronologyCues) return;
    const visible = new Set();
    for (const feature of data.features) {
      const coordinates = feature.geometry.coordinates;
      const [a, b] = coordinates;
      if (a[0] === b[0] && a[1] === b[1]) continue; // No fake separation for same-place transitions.
      const id = feature.properties.transition_id;
      visible.add(id);
      let cue = runtime.chronologyCues.get(id);
      if (!cue) {
        const node = document.createElement('span');
        node.className = 'chronology-cue';
        node.setAttribute('aria-hidden', 'true');
        appendText(node, 'span', '›');
        // Midpoint of the renderer-only segment, not a new historical geometry.
        const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        cue = {coordinates, marker: new maplibregl.Marker({element: node, anchor: 'center'})
          .setLngLat(midpoint).addTo(runtime.map)};
        runtime.chronologyCues.set(id, cue);
      }
      // MapLibre owns outer marker opacity; emphasis belongs to the cue glyph.
      cue.marker.getElement().firstChild.style.opacity = [0.25, 0.7, 0.95][feature.properties.emphasis];
    }
    for (const [id, cue] of runtime.chronologyCues) {
      if (!visible.has(id)) {cue.marker.remove(); runtime.chronologyCues.delete(id);}
    }
    positionChronologyCues();
  }

  function focusVisibleLifePathPresences() {
    if (!runtime.map) return;
    const visible = visibleLifePathPresences();
    if (!visible.length) return;
    if (visible.length === 1) {
      runtime.map.flyTo({
        center: visible[0].coordinates,
        zoom: 7,
        pitch: 20,
        duration: cameraDuration()
      });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    for (const presence of visible) bounds.extend(presence.coordinates);
    const timelinePadding = Math.ceil(byId('timeline-dock')?.getBoundingClientRect().height || 120) + 40;
    runtime.map.fitBounds(bounds, {
      padding: { top: 110, right: 70, bottom: timelinePadding, left: 70 },
      maxZoom: 7.4,
      pitch: 20,
      duration: cameraDuration()
    });
  }

  function lifePathStatus() {
    const visible = visibleLifePathPresences();
    const start = formatAxisValue(runtime.lifePathStartIndex);
    const end = formatAxisValue(runtime.lifePathEndIndex);
    if (runtime.lifePathMode === 'scrub') {
      return `Current time: ${end} · path built from ${start} · ${visible.length} presence${visible.length === 1 ? '' : 's'}.`;
    }
    return `Selected interval: ${start} to ${end} · ${visible.length} presence${visible.length === 1 ? '' : 's'}.`;
  }

  function renderMacroPeriodControls() {
    const host = byId('macro-periods');
    if (!host) return;
    host.innerHTML = '';
    for (const period of runtime.data?.lifePath?.macro_periods || []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'macro-period';
      button.dataset.periodId = period.period_id;
      button.setAttribute('aria-label', `Show ${period.label}, ${period.display_range}`);
      appendText(button, 'strong', period.label);
      appendText(button, 'span', period.display_range);
      button.addEventListener('click', () => {
        runtime.lifePathMode = 'range';
        runtime.lifePathStartIndex = Math.max(0, period.axis_start_index);
        runtime.lifePathEndIndex = Math.min(
          lifePathAxisValues().length - 1,
          period.axis_end_index
        );
        runtime.lifePathRangeStartIndex = runtime.lifePathStartIndex;
        runtime.lifePathRangeEndIndex = runtime.lifePathEndIndex;
        syncLifePathControls();
        applyLifePathView();
      });
      host.append(button);
    }
  }

  function applyLifePathView(options = {}) {
    const visible = visibleLifePathPresences();
    const next = canonicalLifePathView(visible);
    if (next) {
      runtime.activeLifePathViewId = next.view_id;
      runtime.activeTemporalPresetId = next.view_id;
      runtime.activeLayerRefs = [...(next.active_layer_refs || next.state.active_layer_refs || [])];
      runtime.data.state = cloneJson(next.state);
      runtime.data.projection = next.projection;
      runtime.data.globe = next.globe;
      const semanticSource = runtime.map?.getSource?.('artemis-semantic');
      if (semanticSource?.setData) semanticSource.setData(globePrimitivesToGeoJson(next.globe));
    } else {
      runtime.activeLifePathViewId = 'life-path-empty-calendar-window';
      runtime.activeTemporalPresetId = runtime.activeLifePathViewId;
    }
    runtime.data.state.temporal_selection = selectedLifePathTemporalExtent();
    renderSharedState(runtime.data);
    setText('temporal-map-status', lifePathStatus());
    if (!visible.some((presence) => presence.presence_id === runtime.selectedPresenceId)) {
      runtime.selectedPresenceId = null;
      runtime.lifePathPopup?.remove();
      closeDetailsDrawer();
      clearCanonicalSelection(
        visible.length
          ? 'Choose a visible place on the globe.'
          : 'No documented presence overlaps this calendar window.',
        { syncUrl: false }
      );
    }

    const retained = visible.find(p => p.presence_id === runtime.selectedPresenceId);
    if (retained) {
      const item = currentProjectionItem(retained.event_item_id);
      if (item) updateCanonicalSelection(item);
      if (runtime.lifePathPopup) showPresencePopup(retained);
      else if (byId('inspector') && !byId('inspector').hidden) renderLifePathPresence(retained);
    }
    updateLifePathMarkers();
    updateLifePathConnectors();

    document.documentElement.dataset.artemisPathMode = runtime.lifePathMode;
    document.documentElement.dataset.artemisPathStart = formatAxisValue(runtime.lifePathStartIndex);
    document.documentElement.dataset.artemisPathEnd = formatAxisValue(runtime.lifePathEndIndex);
    document.documentElement.dataset.artemisPathCurrent = runtime.lifePathMode === 'scrub'
      ? formatAxisValue(runtime.lifePathEndIndex)
      : '';
    document.documentElement.dataset.artemisVisiblePresenceCount = String(visible.length);
    if (options.focus === true) focusVisibleLifePathPresences();
    if (options.syncUrl !== false) syncUrlState();
    return next;
  }

  function syncLifePathControls() {
    const axisValues = lifePathAxisValues();
    const last = Math.max(0, axisValues.length - 1);
    for (const id of ['range-start', 'range-end', 'scrub-current']) {
      const input = byId(id);
      if (input) input.max = String(last);
    }
    if (byId('range-start')) byId('range-start').value = String(runtime.lifePathStartIndex);
    if (byId('range-end')) byId('range-end').value = String(runtime.lifePathEndIndex);
    if (byId('scrub-current')) {
      byId('scrub-current').min = String(runtime.lifePathMode === 'scrub' ? runtime.lifePathStartIndex : 0);
      byId('scrub-current').value = String(runtime.lifePathEndIndex);
    }
    const startLabel = formatAxisValue(runtime.lifePathStartIndex);
    const endLabel = formatAxisValue(runtime.lifePathEndIndex);
    setText('range-start-value', startLabel);
    setText('range-end-value', endLabel);
    setText('scrub-current-value', endLabel);
    byId('range-start')?.setAttribute('aria-valuetext', startLabel);
    byId('range-end')?.setAttribute('aria-valuetext', endLabel);
    byId('scrub-current')?.setAttribute('aria-valuetext', endLabel);
    byId('mode-range')?.setAttribute('aria-pressed', String(runtime.lifePathMode === 'range'));
    byId('mode-scrub')?.setAttribute('aria-pressed', String(runtime.lifePathMode === 'scrub'));
    if (byId('range-controls')) byId('range-controls').hidden = runtime.lifePathMode !== 'range';
    if (byId('scrub-controls')) byId('scrub-controls').hidden = runtime.lifePathMode !== 'scrub';
  }

  function setLifePathMode(mode) {
    const nextMode = mode === 'scrub' ? 'scrub' : 'range';
    if (runtime.lifePathMode === 'range') {
      runtime.lifePathRangeStartIndex = runtime.lifePathStartIndex;
      runtime.lifePathRangeEndIndex = runtime.lifePathEndIndex;
    } else {
      runtime.lifePathScrubStartIndex = runtime.lifePathStartIndex;
      runtime.lifePathScrubCurrentIndex = runtime.lifePathEndIndex;
    }
    runtime.lifePathMode = nextMode;
    if (nextMode === 'scrub') {
      runtime.lifePathStartIndex = runtime.lifePathScrubStartIndex;
      runtime.lifePathEndIndex = Math.max(
        runtime.lifePathStartIndex,
        runtime.lifePathScrubCurrentIndex
      );
    } else {
      runtime.lifePathStartIndex = runtime.lifePathRangeStartIndex;
      runtime.lifePathEndIndex = Math.max(
        runtime.lifePathStartIndex,
        runtime.lifePathRangeEndIndex
      );
    }
    syncLifePathControls();
    applyLifePathView();
  }

  function bindLifePathControls() {
    for (const lang of ['en', 'ru']) {
      byId(`language-${lang}`)?.addEventListener('click', () => {
        window.ARTEMIS_I18N?.setLanguage(lang);
        for (const value of ['en', 'ru']) byId(`language-${value}`)?.setAttribute('aria-pressed', String(value === lang));
        requestAnimationFrame(() => { syncOverlayLayout(); layoutPlaceLabels(); });
      });
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !byId('inspector')?.hidden) closeDetailsDrawer();
    });
    const layoutObserver = new ResizeObserver(syncOverlayLayout);
    for (const id of ['timeline-dock', 'spike-banner', 'attribution-status']) {
      if (byId(id)) layoutObserver.observe(byId(id));
    }
    syncOverlayLayout();
    const update = (startIndex, endIndex) => {
      runtime.lifePathStartIndex = startIndex;
      runtime.lifePathEndIndex = endIndex;
      if (runtime.lifePathMode === 'scrub') {
        runtime.lifePathScrubStartIndex = startIndex;
        runtime.lifePathScrubCurrentIndex = endIndex;
      } else {
        runtime.lifePathRangeStartIndex = startIndex;
        runtime.lifePathRangeEndIndex = endIndex;
      }
      syncLifePathControls();
      applyLifePathView();
    };
    byId('mode-range')?.addEventListener('click', () => setLifePathMode('range'));
    byId('mode-scrub')?.addEventListener('click', () => setLifePathMode('scrub'));
    byId('close-details')?.addEventListener('click', closeDetailsDrawer);
    byId('range-start')?.addEventListener('input', (event) => {
      const start = Number(event.currentTarget.value);
      update(start, Math.max(start, runtime.lifePathEndIndex));
    });
    byId('range-end')?.addEventListener('input', (event) => {
      const end = Number(event.currentTarget.value);
      update(Math.min(runtime.lifePathStartIndex, end), end);
    });
    byId('scrub-current')?.addEventListener('input', (event) => {
      const current = Number(event.currentTarget.value);
      update(runtime.lifePathStartIndex, Math.max(runtime.lifePathStartIndex, current));
    });
  }

  function handlePresenceMarkerClick(presence) {
    if (!presence) return;
    window.clearTimeout(runtime.markerClickTimer);
    runtime.markerClickTimer = window.setTimeout(() => {
      if (runtime.popupPresenceId === presence.presence_id) {
        openDetailsDrawer(presence.presence_id);
      } else {
        selectLifePathPresence(presence.presence_id, {
          fly: false,
          popup: true,
          openDetails: false
        });
      }
    }, 240);
  }

  function handlePresenceMarkerDoubleClick(event, presence) {
    event.preventDefault();
    event.stopPropagation();
    if (!presence) return;
    window.clearTimeout(runtime.markerClickTimer);
    selectLifePathPresence(presence.presence_id, {
      fly: true,
      popup: true,
      openDetails: false
    });
  }

  function visiblePlaceGroups() {
    const groups = new Map();
    for (const presence of visibleLifePathPresences()) {
      if (!groups.has(presence.place_ref)) groups.set(presence.place_ref, []);
      groups.get(presence.place_ref).push(presence);
    }
    for (const episodes of groups.values()) episodes.sort((a, b) => a.index - b.index);
    return groups;
  }

  function placeClickPresence(placeId) {
    const episodes = visiblePlaceGroups().get(placeId) || [];
    return episodes.find(p => p.presence_id === runtime.selectedPresenceId)
      || (runtime.lifePathMode === 'scrub' ? episodes.at(-1) : episodes[0]);
  }

  function appendPlaceEpisodes(host, presence) {
    const episodes = visiblePlaceGroups().get(presence.place_ref) || [];
    if (episodes.length < 2) return;
    const group = document.createElement('div');
    group.className = 'place-episodes';
    appendText(group, 'span', 'Visits at this place');
    for (const episode of episodes) {
      const button = appendText(group, 'button', formatPresenceTime(episode));
      button.type = 'button';
      button.setAttribute('aria-pressed', String(episode.presence_id === runtime.selectedPresenceId));
      button.addEventListener('click', () => selectLifePathPresence(episode.presence_id, {popup: true}));
    }
    host.append(group);
  }

  function addLifePathMarkers(map) {
    map.addSource('life-path-chronology', { type: 'geojson', data: lifePathConnectorGeoJson() });
    if (runtime.data?.lifePath?.route_policy?.chronological_connector_permitted === true) {
      map.addLayer({
        id: 'life-path-chronology-line', type: 'line', source: 'life-path-chronology',
        paint: {
          'line-color': '#a8bed0',
          'line-width': ['case', ['==', ['get', 'emphasis'], 2], 2.2, 1.4],
          'line-dasharray': [1.5, 2.2],
          'line-opacity': ['match', ['get', 'emphasis'], 2, 0.9, 1, 0.65, 0.22]
        }
      });
    }
    for (const presence of runtime.data?.lifePath?.presences || []) {
      let marker = runtime.placeMarkers.get(presence.place_ref);
      if (!marker) {
        const markerButton = document.createElement('button');
        markerButton.type = 'button';
        markerButton.className = 'life-path-marker';
        markerButton.dataset.placeId = presence.place_ref;
        appendText(markerButton, 'span', '', 'place-dot').setAttribute('aria-hidden', 'true');
        const label = appendText(markerButton, 'span', '', 'place-label');
        appendText(label, 'span', presence.place_label, 'place-name');
        appendText(label, 'span', '', 'place-count');
        markerButton.setAttribute('aria-pressed', 'false');
        markerButton.addEventListener('click', () => handlePresenceMarkerClick(placeClickPresence(presence.place_ref)));
        markerButton.addEventListener('dblclick', event => handlePresenceMarkerDoubleClick(event, placeClickPresence(presence.place_ref)));
        marker = new maplibregl.Marker({element: markerButton, anchor: 'center'})
          .setLngLat(presence.coordinates).addTo(map);
        runtime.placeMarkers.set(presence.place_ref, marker);
      }
      runtime.lifePathMarkers.set(presence.presence_id, marker);
    }
    map.on('move', () => { positionChronologyCues(); layoutPlaceLabels(); });
    map.on('resize', layoutPlaceLabels);
    updateLifePathMarkers();
    updateLifePathConnectors();
    const requestedPresence = (runtime.data?.lifePath?.presences || []).find(p => p.presence_id === runtime.selectedPresenceId);
    if (requestedPresence) showPresencePopup(requestedPresence);
  }

  function layoutPlaceLabels() {
    if (!runtime.map) return;
    const occupied = [];
    const canvas = runtime.map.getCanvas();
    for (const marker of runtime.placeMarkers.values()) {
      const node = marker.getElement();
      if (node.hidden) continue;
      const label = node.querySelector('.place-label');
      const point = runtime.map.project(marker.getLngLat());
      const width = label.offsetWidth, height = label.offsetHeight;
      const candidates = [[9, -10], [-width - 9, -10], [9, -height - 12], [-width - 9, 12], [9, 12]];
      const fits = ([dx, dy]) => {
        const rect = {left: point.x + dx, top: point.y + dy, right: point.x + dx + width, bottom: point.y + dy + height};
        return rect.left >= 0 && rect.right <= canvas.clientWidth && rect.top >= 0 && rect.bottom <= canvas.clientHeight
          && !occupied.some(r => rect.left < r.right + 3 && rect.right > r.left - 3 && rect.top < r.bottom + 3 && rect.bottom > r.top - 3);
      };
      const [dx, dy] = candidates.find(fits) || candidates[0];
      label.style.left = `${16 + dx}px`;
      label.style.top = `${16 + dy}px`;
      occupied.push({left: point.x + dx, right: point.x + dx + width, top: point.y + dy, bottom: point.y + dy + height});
    }
  }

  function positionChronologyCues() {
    for (const {marker, coordinates} of runtime.chronologyCues.values()) {
      const a = runtime.map.project(coordinates[0]), b = runtime.map.project(coordinates[1]);
      marker.getElement().firstChild.style.transform = `rotate(${Math.atan2(b.y - a.y, b.x - a.x)}rad)`;
    }
  }

  function restoreLifePathStateFromUrl(options = {}) {
    const axisValues = lifePathAxisValues();
    if (!axisValues.length) return;
    const params = new URLSearchParams(window.location.search);
    const indexFor = (value, fallback) => {
      const index = axisValues.indexOf(value);
      return index >= 0 ? index : fallback;
    };
    const last = axisValues.length - 1;
    runtime.lifePathRangeStartIndex = indexFor(params.get('start'), 0);
    runtime.lifePathRangeEndIndex = indexFor(params.get('end'), last);
    runtime.lifePathScrubStartIndex = indexFor(params.get('from'), 0);
    runtime.lifePathScrubCurrentIndex = indexFor(params.get('at'), 0);
    runtime.lifePathMode = params.get('mode') === 'scrub' ? 'scrub' : 'range';
    if (runtime.lifePathMode === 'scrub') {
      runtime.lifePathStartIndex = runtime.lifePathScrubStartIndex;
      runtime.lifePathEndIndex = runtime.lifePathScrubCurrentIndex;
    } else {
      runtime.lifePathStartIndex = runtime.lifePathRangeStartIndex;
      runtime.lifePathEndIndex = runtime.lifePathRangeEndIndex;
    }
    if (runtime.lifePathStartIndex > runtime.lifePathEndIndex) {
      runtime.lifePathEndIndex = runtime.lifePathStartIndex;
    }
    syncLifePathControls();
    applyLifePathView({ focus: options.focus === true, syncUrl: false });
    const requestedPresence = params.get('presence');
    if (requestedPresence) selectLifePathPresence(
      requestedPresence, { fly: false, popup: false, syncUrl: false }
    );
    syncUrlState();
  }

  function updateCanonicalSelection(item) {
    const state = runtime.data?.state;
    if (!state || !item) return;
    state.selection.primary_object_ref = item.object_ref;
    state.selection.selected_object_refs = [item.object_ref];
    if (item.object_type === 'Trajectory') {
      state.active_focus.trajectory_ref = item.object_ref;
      state.active_focus.trajectory_segment_ref = item.subobject_ref;
    }
    if (item.object_type === 'Region') {
      state.active_focus.region_ref = item.object_ref;
      state.active_focus.region_geometry_ref = item.subobject_ref;
    }
  }

  function clearCanonicalSelection(message = 'No semantic object selected.', options = {}) {
    runtime.selectedItemId = null;
    document.documentElement.dataset.artemisSelectedPresence = '';
    document.documentElement.dataset.artemisSelectedItem = '';
    if (runtime.data?.state?.selection) {
      runtime.data.state.selection.primary_object_ref = null;
      runtime.data.state.selection.selected_object_refs = [];
    }
    const card = byId('selection-card');
    if (card) {
      card.classList.add('empty');
      card.removeAttribute('data-item-id');
      card.removeAttribute('data-presence-id');
      card.textContent = message;
    }
    for (const row of document.querySelectorAll('.unresolved-item[aria-pressed="true"]')) {
      row.setAttribute('aria-pressed', 'false');
    }
    if (runtime.data?.lifePath?.available) syncLifePathSelectionControls();
    if (options.syncUrl !== false) syncUrlState();
  }

  function selectKnowledgeItem(itemId, options = {}) {
    const record = runtime.knowledgeByItem.get(itemId);
    const projectionItem = currentProjectionItem(itemId);
    if (!record || !projectionItem) {
      clearCanonicalSelection(`No active projection record exists for ${itemId}.`, options);
      return;
    }
    const losses = (runtime.data.projection.losses || []).filter((loss) => loss.item_id === itemId);
    runtime.selectedItemId = itemId;
    updateCanonicalSelection(projectionItem);
    renderKnowledgeRecord({
      ...record,
      temporal_membership: projectionItem.temporal_membership,
      spatial_status: projectionItem.spatial_status,
      semantic_flags: projectionItem.semantic_flags,
      projection_losses: losses
    });
    renderUnresolved(runtime.data.projection);
    if (options.focus) byId('selection-card')?.focus({ preventScroll: false });
    if (options.syncUrl !== false) syncUrlState();
  }

  function renderSelection(properties) {
    const itemId = properties.item_id;
    if (itemId) {
      selectKnowledgeItem(itemId, { focus: true });
      return;
    }
    clearCanonicalSelection('Rendered feature has no semantic item_id and cannot be resolved.');
  }

  function renderCapabilitySelection() {
    clearCanonicalSelection(
      'Renderer capability path selected. This geometry has no World Model object_ref and cannot be resolved as historical knowledge.'
    );
  }

  function syncExplorerControls() {
    const presets = runtime.viewIndex?.temporal_presets || [];
    const presetIndex = Math.max(0, presets.findIndex(
      (preset) => preset.preset_id === runtime.activeTemporalPresetId
    ));
    const range = byId('temporal-preset');
    const presetLabel = presets[presetIndex]?.label || runtime.activeTemporalPresetId;
    if (range) {
      range.value = String(presetIndex);
      range.setAttribute('aria-valuetext', presetLabel);
    }
    setText('temporal-preset-value', presetLabel);
    for (const input of document.querySelectorAll('#layer-controls input[type="checkbox"]')) {
      input.checked = runtime.activeLayerRefs.includes(input.value);
    }
  }

  function applySemanticView(temporalPresetId, layerRefs, options = {}) {
    const next = runtime.viewByKey.get(viewKey(temporalPresetId, layerRefs));
    if (!next) throw new Error(`No deterministic Explorer view for ${temporalPresetId}`);

    const priorSelection = runtime.selectedItemId;
    runtime.activeTemporalPresetId = next.temporal_preset_id;
    runtime.activeLayerRefs = [...next.active_layer_refs];
    runtime.data.state = cloneJson(next.state);
    runtime.data.projection = next.projection;
    runtime.data.globe = next.globe;

    const semanticSource = runtime.map?.getSource?.('artemis-semantic');
    if (semanticSource?.setData) semanticSource.setData(globePrimitivesToGeoJson(next.globe));

    renderSharedState(runtime.data);
    renderTemporalStatus(next);
    renderUnresolved(next.projection);
    syncExplorerControls();
    updateAlternativeGeometryControl(next.globe);
    applyAlternativeLayerVisibility(runtime.map);

    const itemIds = new Set((next.projection.items || []).map((item) => item.item_id));
    if (priorSelection && itemIds.has(priorSelection)) {
      selectKnowledgeItem(priorSelection, { syncUrl: false });
    } else if (options.initial) {
      const primaryObjectRef = next.state.selection?.primary_object_ref;
      const primaryItem = (next.projection.items || []).find(
        (item) => item.object_ref === primaryObjectRef
      );
      if (primaryItem) selectKnowledgeItem(primaryItem.item_id, { syncUrl: false });
      else clearCanonicalSelection('No semantic object selected.', { syncUrl: false });
    } else if (priorSelection) {
      clearCanonicalSelection(
        'Selection cleared: the object is outside the active time/layer projection.',
        { syncUrl: false }
      );
    } else {
      clearCanonicalSelection('No semantic object selected.', { syncUrl: false });
    }

    const status = byId('interaction-status');
    if (status) {
      status.textContent = `${next.projection.items.length} projected records · ${runtime.activeLayerRefs.length} active layers · selection and picking synchronized.`;
    }
    document.documentElement.dataset.artemisTemporalPreset = temporalPresetId;
    document.documentElement.dataset.artemisLayerCount = String(runtime.activeLayerRefs.length);
    if (options.syncUrl !== false) syncUrlState();
    return next;
  }

  function restoreExplorerStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const defaultView = (runtime.viewIndex?.views || []).find(
      (view) => view.view_id === runtime.viewIndex.default_view_id
    );
    if (!defaultView) return;
    const requestedPreset = params.get('time') || defaultView.temporal_preset_id;
    const requestedLayers = params.has('layers')
      ? params.get('layers').split(',').filter(Boolean)
      : defaultView.active_layer_refs;
    const view = runtime.viewByKey.get(viewKey(requestedPreset, requestedLayers)) || defaultView;
    applySemanticView(view.temporal_preset_id, view.active_layer_refs, { syncUrl: false });
    const requestedItem = params.get('item');
    if (requestedItem) selectKnowledgeItem(requestedItem, { syncUrl: false });
    else clearCanonicalSelection('No semantic object selected.', { syncUrl: false });
    syncUrlState();
  }

  function renderExplorerControls() {
    const presets = runtime.viewIndex?.temporal_presets || [];
    const range = byId('temporal-preset');
    if (range) {
      range.max = String(Math.max(0, presets.length - 1));
      range.disabled = presets.length < 2;
      range.addEventListener('input', (event) => {
        const preset = presets[Number(event.currentTarget.value)];
        if (preset) applySemanticView(preset.preset_id, runtime.activeLayerRefs);
      });
    }

    const layers = byId('layer-controls');
    if (layers) {
      for (const option of runtime.viewIndex.layer_options || []) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = option.layer_ref;
        input.addEventListener('change', () => {
          const active = [...layers.querySelectorAll('input:checked')].map((node) => node.value);
          applySemanticView(runtime.activeTemporalPresetId, active);
        });
        const span = document.createElement('span');
        span.textContent = option.label;
        label.append(input, span);
        layers.append(label);
      }
    }
  }

  function bindPicking(map) {
    map.on('click', (event) => {
      const semanticLayers = SEMANTIC_LAYER_IDS.filter((layerId) => map.getLayer(layerId));
      const semantic = semanticLayers.length
        ? map.queryRenderedFeatures(event.point, { layers: semanticLayers })
        : [];
      if (semantic.length) {
        renderSelection(semantic[0].properties || {});
        return;
      }
      const capability = map.getLayer('renderer-capability-path-line')
        ? map.queryRenderedFeatures(event.point, { layers: ['renderer-capability-path-line'] })
        : [];
      if (capability.length) renderCapabilitySelection();
    });

    map.on('mousemove', (event) => {
      const layers = [...SEMANTIC_LAYER_IDS, 'renderer-capability-path-line']
        .filter((layerId) => map.getLayer(layerId));
      const hits = layers.length ? map.queryRenderedFeatures(event.point, { layers }) : [];
      map.getCanvas().style.cursor = hits.length ? 'pointer' : '';
    });
  }

  function bindControls(map) {
    byId('view-global')?.addEventListener('click', () => {
      map.flyTo({ center: [10, 15], zoom: 0.8, pitch: 0, bearing: 0, duration: cameraDuration() });
    });
    const focusSlice = () => {
      const intent = runtime.data?.state?.view_intent || {};
      if (intent.kind === 'bounds' && Array.isArray(intent.bbox) && intent.bbox.length === 4) {
        map.fitBounds(
          [[intent.bbox[0], intent.bbox[1]], [intent.bbox[2], intent.bbox[3]]],
          { padding: 40, duration: cameraDuration() }
        );
        return;
      }
      map.flyTo({ center: [10, 15], zoom: 0.8, pitch: 0, bearing: 0, duration: cameraDuration() });
    };
    runtime.focusSlice = focusSlice;
    byId('view-slice')?.addEventListener('click', focusSlice);
    byId('toggle-alternatives')?.addEventListener('click', (event) => {
      runtime.alternativesVisible = !runtime.alternativesVisible;
      applyAlternativeLayerVisibility(map);
      event.currentTarget.setAttribute('aria-pressed', String(runtime.alternativesVisible));
      updateAlternativeGeometryControl(runtime.data?.globe);
    });
  }

  function sampleFrames(frameCount = 60) {
    const samples = [];
    let previous = performance.now();
    function tick(now) {
      samples.push(now - previous);
      previous = now;
      if (samples.length < frameCount) {
        requestAnimationFrame(tick);
        return;
      }
      const stable = samples.slice(5);
      const average = stable.reduce((sum, value) => sum + value, 0) / Math.max(1, stable.length);
      runtime.performance.averageFrameMs = average;
      runtime.performance.estimatedFps = average > 0 ? 1000 / average : null;
      setText('frame-sample', `${average.toFixed(1)} ms/frame · ~${runtime.performance.estimatedFps.toFixed(0)} FPS`);
      collectAcceptanceEvidence(runtime.data.acceptanceProfiles);
    }
    requestAnimationFrame(tick);
  }

  async function main() {
    if (!window.maplibregl) throw new Error('MapLibre GL JS 5.24.0 failed to load. Network access to the pinned engine CDN is required for this R&D artifact.');

    const [projection, globe, state, views, assets, context, capabilityPath, engineEvaluation, acceptanceProfiles, knowledge, lifePath, meta] = await Promise.all([
      loadJson(FILES.projection),
      loadJson(FILES.globe),
      loadJson(FILES.state),
      loadJson(FILES.views),
      loadJson(FILES.assets),
      loadJson(FILES.context),
      loadJson(FILES.capabilityPath),
      loadJson(FILES.engineEvaluation),
      loadJson(FILES.acceptanceProfiles),
      loadJson(FILES.knowledge),
      loadJson(FILES.lifePath),
      loadJson(FILES.meta)
    ]);

    runtime.data = { projection, globe, state, assets, context, capabilityPath, engineEvaluation, acceptanceProfiles, knowledge, lifePath, meta };
    runtime.viewIndex = views;
    runtime.viewByKey = new Map((views.views || []).map((view) => [
      viewKey(view.temporal_preset_id, view.active_layer_refs),
      view
    ]));
    runtime.knowledgeByItem = new Map((knowledge.records || []).map((record) => [record.item_id, record]));
    runtime.selectItem = (itemId) => selectKnowledgeItem(itemId, { focus: true });
    runtime.selectView = (presetId, layerRefs) => applySemanticView(presetId, layerRefs || runtime.activeLayerRefs);
    runtime.selectPresence = (presenceId) => selectLifePathPresence(
      presenceId, { popup: true, openDetails: true }
    );
    runtime.selectLifePathRange = (startIndex, endIndex, mode = runtime.lifePathMode) => {
      runtime.lifePathMode = mode === 'scrub' ? 'scrub' : 'range';
      runtime.lifePathStartIndex = Math.min(startIndex, endIndex);
      runtime.lifePathEndIndex = Math.max(startIndex, endIndex);
      if (runtime.lifePathMode === 'scrub') {
        runtime.lifePathScrubStartIndex = runtime.lifePathStartIndex;
        runtime.lifePathScrubCurrentIndex = runtime.lifePathEndIndex;
      } else {
        runtime.lifePathRangeStartIndex = runtime.lifePathStartIndex;
        runtime.lifePathRangeEndIndex = runtime.lifePathEndIndex;
      }
      syncLifePathControls();
      return applyLifePathView();
    };
    if (lifePath.available) {
      setText('path-coverage', lifePath.coverage?.scope_label || 'Whole-life proof');
      renderMacroPeriodControls();
      renderPresenceSequence();
      bindLifePathControls();
    }
    else renderExplorerControls();
    renderAttribution(assets);

    const defaultView = (views.views || []).find((view) => view.view_id === views.default_view_id);
    if (!defaultView) throw new Error(`Default Explorer view does not resolve: ${views.default_view_id}`);
    if (lifePath.available) {
      restoreLifePathStateFromUrl({ focus: false });
      window.addEventListener('popstate', () => restoreLifePathStateFromUrl());
    } else {
      const params = new URLSearchParams(window.location.search);
      const requestedPreset = params.get('time') || defaultView.temporal_preset_id;
      const requestedLayers = params.has('layers')
        ? params.get('layers').split(',').filter(Boolean)
        : defaultView.active_layer_refs;
      const initialView = runtime.viewByKey.get(viewKey(requestedPreset, requestedLayers)) || defaultView;
      applySemanticView(initialView.temporal_preset_id, initialView.active_layer_refs, { initial: true, syncUrl: false });
      const requestedItem = params.get('item');
      if (requestedItem) selectKnowledgeItem(requestedItem, { syncUrl: false });
      syncUrlState();
      window.addEventListener('popstate', restoreExplorerStateFromUrl);
    }
    setText('engine-status', `engine: MapLibre GL JS ${window.maplibregl.version || '5.24.0'} · R&D`);

    const map = new maplibregl.Map({
      container: 'globe',
      style: createStyle(),
      center: [10, 15],
      zoom: 0.8,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      canvasContextAttributes: { antialias: true }
    });
    runtime.map = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');

    map.on('error', (event) => {
      console.warn('[ARTEMIS:globe-spike] MapLibre runtime warning', event?.error || event);
    });

    map.on('load', () => {
      if (typeof map.setProjection === 'function') map.setProjection({ type: 'globe' });
      verifyEarthContextRender(map, acceptanceProfiles);
      addContextLayers(map, context);
      addSemanticLayers(map, runtime.data.globe);
      applyAlternativeLayerVisibility(map);
      if (lifePath.available) addLifePathMarkers(map);
      else addCapabilityPath(map, capabilityPath);
      configureTerrainPath(map, assets);
      bindPicking(map);
      bindControls(map);
      if (lifePath.available) focusVisibleLifePathPresences();
      collectAcceptanceEvidence(acceptanceProfiles);
      window.addEventListener('resize', () => collectAcceptanceEvidence(acceptanceProfiles));

      map.once('idle', () => {
        runtime.performance.startupToIdleMs = performance.now() - startedAt;
        setText('startup-ms', `${runtime.performance.startupToIdleMs.toFixed(0)} ms`);
        collectAcceptanceEvidence(acceptanceProfiles);
        sampleFrames();
      });
    });
  }

  main().catch(fatal);
})();
