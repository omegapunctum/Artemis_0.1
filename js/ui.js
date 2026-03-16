  // Слои — цвет и подпись
  const LAYERS = [
    { id: 'romanesque',  ru: 'Романский',  hex: '#e8a838' },
    { id: 'gothic',      ru: 'Готика',     hex: '#7a5af0' },
    { id: 'renaissance', ru: 'Ренессанс',  hex: '#3ab87a' },
  ];


  // ── СМЕНА СТИЛЯ КАРТЫ ─────────────────────────────────────
  document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      map.setStyle(MAP_STYLES[btn.dataset.style]);
      // После загрузки нового стиля — перерисовать GeoJSON-слои
      map.once('style.load', () => renderCircles());
    });
  });

  // ── ПЕРЕКЛЮЧАТЕЛЬ ЗОН ВЛИЯНИЯ ─────────────────────────────
  document.getElementById('zones-toggle').addEventListener('click', function() {
    state.showZones = !state.showZones;
    this.classList.toggle('active', state.showZones);
    renderCircles();
  });

  // ── ВЫБОР КАТЕГОРИИ (layer_type) ──────────────────────────
  // Сейчас категория одна (architecture), но структура готова к расширению.
  // При клике на категорию фильтруем features по layer_type.
  const CATEGORIES = {
    architecture: { ru: 'Архитектура', icon: '🏛' },
    route_point:  { ru: 'Маршруты',    icon: '🗺' },
    biography:    { ru: 'Биографии',   icon: '👤' },
    biogeography: { ru: 'Биогеография',icon: '🌿' },
  };

  // Активные категории (по умолчанию — все)
  const state_cats = new Set(['architecture']);

  function renderCategories() {
    const list = document.getElementById('categories-list');
    // Собираем уникальные layer_type из загруженных данных
    const found = [...new Set(state.features.map(f => f.layer_type).filter(Boolean))];
    if (!found.length) return;
    list.innerHTML = '';
    found.forEach(cat => {
      const cfg = CATEGORIES[cat] || { ru: cat, icon: '📍' };
      const row = document.createElement('div');
      row.className = 'cat-row' + (state_cats.has(cat) ? ' active' : '');
      row.dataset.cat = cat;
      row.innerHTML = `<span class="cat-icon">${cfg.icon}</span><span class="cat-label">${cfg.ru}</span>`;
      row.addEventListener('click', () => {
        state_cats.has(cat) ? state_cats.delete(cat) : state_cats.add(cat);
        row.classList.toggle('active', state_cats.has(cat));
        renderAll();
      });
      list.appendChild(row);
    });
  }

  // ── ВИДИМОСТЬ ОБЪЕКТА ВО ВРЕМЕНИ ─────────────────────────
  // Здание показывается если: уже построено И ещё не разрушено.
  // Если date_end отсутствует — здание стоит до сих пор (всегда visible после постройки).
  function visible(f) {
    const s = parseInt(f.date_start);
    if (isNaN(s)) return false;
    // date_end: null, пустая строка или отсутствие = объект существует до сих пор
    const rawEnd = (f.date_end !== null && f.date_end !== '' && f.date_end !== undefined)
      ? parseInt(f.date_end) : null;
    const e = (rawEnd !== null && !isNaN(rawEnd)) ? rawEnd : null;

    if (state.range) {
      if (s > state.to)                  return false; // ещё не построено до конца диапазона
      if (e !== null && e < state.from)  return false; // уже разрушено до начала диапазона
      return true;
    } else {
      if (s > state.year)                return false; // ещё не построено
      if (e !== null && e < state.year)  return false; // уже разрушено
      return true;
    }
  }

  // ── ГЛАВНАЯ ОТРИСОВКА ─────────────────────────────────────
  function renderAll() { renderMarkers(); renderCircles(); updateStatus(); }

  // ── МАРКЕРЫ ───────────────────────────────────────────────
  function renderMarkers() {
    state.markers.forEach(m => m.remove());
    state.markers = [];

    state.features.forEach(f => {
      if (!state.active.has(f.layer_id)) return;
      if (!state_cats.has(f.layer_type || 'architecture')) return; // фильтр по категории
      if (!visible(f))                   return;
      if (f.lon == null || f.lat == null) return;

      const layer = LAYERS.find(l => l.id === f.layer_id);
      const color = layer ? layer.hex : '#fff';

      // DOM-элемент маркера
      const el = document.createElement('div');
      el.style.cssText = `
        width:11px;height:11px;border-radius:50%;
        background:${color};border:2px solid rgba(255,255,255,0.45);
        cursor:pointer;box-shadow:0 0 8px ${color}99;
        transition:width 0.12s, height 0.12s, box-shadow 0.12s, margin 0.12s;
      `;
      el.addEventListener('mouseenter', () => {
        el.style.width      = '17px';
        el.style.height     = '17px';
        el.style.margin     = '-3px 0 0 -3px';
        el.style.boxShadow  = `0 0 16px ${color}cc`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.width      = '11px';
        el.style.height     = '11px';
        el.style.margin     = '0';
        el.style.boxShadow  = `0 0 8px ${color}99`;
      });

      // Данные для попапа
      const styleName = layer ? layer.ru : f.layer_id;

      // Строка периода строительства: "1344" или "1344 — 1929"
      const builtStr = f.date_start
        ? (f.date_construction_end && f.date_construction_end !== f.date_start
            ? `${f.date_start} — ${f.date_construction_end}`
            : f.date_start)
        : '—';

      // date_end = дата разрушения; пусто = существует сегодня
      const destroyStr = f.date_end || null;
      const archStr    = f.architect || null;

      // Изображение: referrerpolicy="no-referrer" решает проблему с блокировкой Wikimedia
      const imgTag = f.img
        ? `<img class="popup-img" src="${f.img}" alt="${f.name_ru}" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none'">`
        : '';

      // Метаданные в попапе (только непустые строки)
      const existsToday = !destroyStr
        ? `<span class="pm-exists">существует сегодня</span>`
        : '';
      const metaRows = [
        ['Построен',    builtStr],
        destroyStr ? ['Разрушен', destroyStr] : null,
        archStr    ? ['Архитектор', archStr]  : null,
        ['Стиль',      styleName],
      ].filter(Boolean).map(([k,v]) =>
        `<span class="pm-k">${k}</span><span class="pm-v">${v}</span>`
      ).join('');

      const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: '295px' })
        .setHTML(`
          ${imgTag}
          <div class="popup-body">
            <span class="popup-badge" style="background:${color}22;color:${color}">${styleName}</span>
            ${existsToday}
            <div class="popup-title">${f.name_ru}</div>
            <div class="popup-meta">${metaRows}</div>
            ${f.desc ? `<div class="popup-desc">${f.desc}</div>` : ''}
            ${f.src  ? `<a class="popup-link" href="${f.src}" target="_blank" rel="noopener">→ источник</a>` : ''}
          </div>
        `);

      state.markers.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([f.lon, f.lat])
          .setPopup(popup)
          .addTo(map)
      );
    });
  }

  // ── КРУГИ ВЛИЯНИЯ ─────────────────────────────────────────
  // Используется для объектов с заполненным influence_radius_km.
  // Перекрывающиеся круги дают визуальный эффект "накопления" за счёт аддитивной непрозрачности.
  function renderCircles() {
    ['circles-fill','circles-stroke'].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
    if (map.getSource('circles')) map.removeSource('circles');

    // Если зоны отключены — не рисуем
    if (!state.showZones) return;

    const feats = state.features
      .filter(f =>
        state.active.has(f.layer_id) &&
        state_cats.has(f.layer_type || 'architecture') &&
        visible(f) && f.lon != null && f.radius != null
      )
      .map(f => {
        const color = (LAYERS.find(l => l.id === f.layer_id) || {}).hex || '#fff';
        return {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [circlePoly(f.lon, f.lat, f.radius)] },
          properties: { color },
        };
      });

    if (!feats.length) return;
    map.addSource('circles', { type: 'geojson', data: { type: 'FeatureCollection', features: feats } });
    map.addLayer({ id: 'circles-fill',   type: 'fill', source: 'circles', paint: { 'fill-color': ['get','color'], 'fill-opacity': 0.07 } });
    map.addLayer({ id: 'circles-stroke', type: 'line', source: 'circles', paint: { 'line-color': ['get','color'], 'line-width': 1, 'line-opacity': 0.28 } });
  }

  // Генерация GeoJSON-полигона окружности
  function circlePoly(lng, lat, km, n = 64) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * 2 * Math.PI;
      pts.push([
        lng + (km / 111.32 / Math.cos(lat * Math.PI / 180)) * Math.sin(a),
        lat + (km / 111.32) * Math.cos(a),
      ]);
    }
    return pts;
  }

  // ── СПИСОК СЛОЁВ В САЙДБАРЕ ──────────────────────────────
  function renderLayers() {
    const list = document.getElementById('layers-list');
    list.innerHTML = '';
    LAYERS.forEach(layer => {
      const cnt    = state.features.filter(f => f.layer_id === layer.id).length;
      const isOn   = state.active.has(layer.id);
      const row    = document.createElement('div');
      row.className = 'layer-row';
      row.innerHTML = `
        <div class="layer-dot" style="background:${layer.hex}"></div>
        <span class="layer-name">${layer.ru}</span>
        <span class="layer-cnt">${cnt}</span>
        <button class="layer-toggle ${isOn ? 'on' : ''}" data-id="${layer.id}"></button>`;
      row.querySelector('button').addEventListener('click', () => {
        state.active.has(layer.id) ? state.active.delete(layer.id) : state.active.add(layer.id);
        renderLayers();
        renderAll();
      });
      list.appendChild(row);
    });
  }

  // ── ПОИСК ─────────────────────────────────────────────────
  function initSearch() {
    const inp = document.getElementById('search-input');
    const clr = document.getElementById('search-clear');
    inp.addEventListener('input', () => {
      state.query = inp.value.trim();
      clr.classList.toggle('visible', state.query.length > 0);
      showSearchResults(state.query);
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Escape') clearSearch(); });
    clr.addEventListener('click', clearSearch);
  }

  function showSearchResults(q) {
    const box = document.getElementById('search-results');
    box.innerHTML = '';
    if (!q) { box.classList.remove('visible'); return; }
    const ql      = q.toLowerCase();
    const results = state.features.filter(f =>
      f.name_ru.toLowerCase().includes(ql) || f.tags.some(t => t.includes(ql))
    ).slice(0, 20);
    if (!results.length) {
      box.innerHTML = '<div class="sr-empty">Ничего не найдено</div>';
      box.classList.add('visible');
      return;
    }
    results.forEach(f => {
      const layer = LAYERS.find(l => l.id === f.layer_id);
      const item  = document.createElement('div');
      item.className = 'sr-item';
      item.innerHTML = `
        <div class="sr-name">${f.name_ru}</div>
        <div class="sr-meta">
          <span class="sr-dot" style="background:${layer?.hex||'#888'}"></span>
          ${layer?.ru || f.layer_id}${f.date_start ? ' · ' + f.date_start : ''}
        </div>`;
      item.addEventListener('click', () => {
        if (f.lon == null) return;
        map.flyTo({ center: [f.lon, f.lat], zoom: 7, duration: 800 });
        const marker = state.markers.find(m => {
          const ll = m.getLngLat();
          return Math.abs(ll.lng - f.lon) < 0.001 && Math.abs(ll.lat - f.lat) < 0.001;
        });
        if (marker) marker.togglePopup();
        clearSearch();
      });
      box.appendChild(item);
    });
    box.classList.add('visible');
  }

  function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').classList.remove('visible');
    const box = document.getElementById('search-results');
    box.classList.remove('visible');
    box.innerHTML = '';
    state.query = '';
  }

  // ── ШКАЛА — ОДИНОЧНЫЙ ГОД ────────────────────────────────
  const sliderEl   = document.getElementById('timeline-slider');
  const yearDispEl = document.getElementById('year-display');
  sliderEl.addEventListener('input', () => {
    state.year         = parseInt(sliderEl.value);
    yearDispEl.textContent = fy(state.year);
    renderAll();
  });

  // ── ШКАЛА — ДИАПАЗОН ─────────────────────────────────────
  const chk      = document.getElementById('range-checkbox');
  const rfEl     = document.getElementById('range-from');
  const rtEl     = document.getElementById('range-to');
  const rfValEl  = document.getElementById('rfrom-val');
  const rtValEl  = document.getElementById('rto-val');
  const rsEl     = document.getElementById('range-sliders');

  chk.addEventListener('change', () => {
    state.range = chk.checked;
    rsEl.classList.toggle('open', state.range);
    renderAll();
  });

  rfEl.addEventListener('input', () => {
    state.from = parseInt(rfEl.value);
    if (state.from > state.to) { state.to = state.from; rtEl.value = state.to; rtValEl.textContent = fy(state.to); }
    rfValEl.textContent = fy(state.from);
    renderAll();
  });

  rtEl.addEventListener('input', () => {
    state.to = parseInt(rtEl.value);
    if (state.to < state.from) { state.from = state.to; rfEl.value = state.from; rfValEl.textContent = fy(state.from); }
    rtValEl.textContent = fy(state.to);
    renderAll();
  });

  // ── УТИЛИТЫ ───────────────────────────────────────────────
  // Форматирование года: отрицательные — до н.э.
  function fy(y) { return y < 0 ? `${Math.abs(y)} до н.э.` : String(y); }

  function setStatus(msg) { document.getElementById('status-line').textContent = msg; }

  function updateStatus() {
    const vis   = state.markers.length;
    const total = state.features.filter(f => state.active.has(f.layer_id)).length;
    const time  = state.range ? `${fy(state.from)} — ${fy(state.to)}` : fy(state.year);
    setStatus(`Показано: ${vis} / ${total} · ${time}`);
  }
