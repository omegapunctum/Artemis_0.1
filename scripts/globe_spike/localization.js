/* Current M5 presentation only. Canonical data, source evidence and URL state stay untouched. */
(function () {
  'use strict';
  const dictionary = Object.freeze({
    'ARTEMIS · Leonardo Life Path': 'ARTEMIS · Жизненный путь Леонардо',
    'ARTEMIS Leonardo life path globe': 'ARTEMIS — глобус жизненного пути Леонардо',
    'Public research prototype · not a validated product': 'Исследовательский прототип · продукт ещё не валидирован',
    'Generated review artifact — not a public capability': 'Материал для проверки — не публичная функция',
    'Architecture Atlas · compatibility': 'Атлас архитектуры · совместимость',
    'Selected place details': 'Подробности выбранного места',
    'Selected presence': 'Выбранное присутствие',
    'Place details': 'Подробности места',
    'Close place details': 'Закрыть подробности места',
    'Choose a numbered place on the globe.': 'Выберите пронумерованное место на глобусе.',
    'Choose a visible numbered place on the globe.': 'Выберите видимое пронумерованное место на глобусе.',
    'No documented presence overlaps this calendar window.': 'Для этого интервала документированное присутствие не найдено.',
    'Sources, limits and prototype status': 'Источники, ограничения и статус прототипа',
    'Frozen repository review package. Claims remain draft/rejected; this preview does not query Airtable.': 'Зафиксированный пакет проверки из репозитория. Утверждения остаются черновыми или отклонёнными; прототип не обращается к Airtable.',
    'Selected time': 'Выбранное время',
    'World Slice': 'Срез мира',
    'Corpus status': 'Статус корпуса',
    'Engine': 'Движок',
    'Terrain': 'Рельеф',
    'Startup': 'Запуск',
    'Frame sample': 'Замер кадров',
    'loading': 'загрузка',
    'pending': 'ожидание',
    'Selected object': 'Выбранный объект',
    'Leonardo da Vinci': 'Леонардо да Винчи',
    'Whole-life proof': 'Проверка на всём жизненном пути',
    'Whole-life proof · 1452–1519': 'Весь жизненный путь · 1452–1519',
    'Whole-life proof · 1452–1519 · 11 reviewed Presence anchors': 'Весь жизненный путь · 1452–1519 · 11 проверенных опор присутствия',
    'Timeline': 'Шкала времени',
    'Timeline mode': 'Режим шкалы времени',
    'Range': 'Интервал',
    'Scrub': 'Накопление',
    'Major life periods': 'Основные периоды жизни',
    'From': 'От',
    'To': 'До',
    'Selected calendar interval': 'Выбранный календарный интервал',
    'Build from': 'Начать с',
    'Path build start': 'Начало накопления пути',
    'Current time': 'Текущее время',
    'Loading documented presences…': 'Загрузка документированных присутствий…',
    'No path line is drawn: exact routes between Presence anchors remain unknown.': 'Линия пути не проводится: точные маршруты между опорами присутствия неизвестны.',
    'Open details': 'Подробнее',
    'Duration': 'Длительность',
    'Position': 'Положение',
    'Route': 'Маршрут',
    'Source-bounded residence period; not a continuous daily position': 'Период проживания по источнику; не непрерывное ежедневное положение',
    'Not established beyond the documented source anchor': 'Не установлена за пределами опоры, указанной в источнике',
    'Exact route unknown; no transition line is rendered': 'Точный маршрут неизвестен; линия перехода не показана',
    'First documented presence': 'Первое документированное присутствие',
    'Sources and uncertainty': 'Источники и неопределённость',
    'Place-anchor evidence': 'Свидетельства для опоры места',
    'Reviewed package sources': 'Источники проверенного пакета',
    'Material uncertainty': 'Существенная неопределённость',
    'Claims & evidence': 'Утверждения и свидетельства',
    'Coverage & missingness': 'Охват и пробелы',
    'No projected claims for this semantic item.': 'Для этого элемента нет утверждений в проекции.',
    'No material uncertainty is referenced by this projection item.': 'Для этого элемента проекции не указана существенная неопределённость.',
    'Vinci': 'Винчи',
    'Florence': 'Флоренция',
    'Milan': 'Милан',
    'Rome / Vatican Belvedere': 'Рим / Ватиканский Бельведер',
    'Clos Lucé, Amboise': 'Кло-Люсе, Амбуаз',
    'Rimini': 'Римини',
    'Cesena': 'Чезена',
    'Cesenatico': 'Чезенатико',
    'Imola': 'Имола',
    'Vinci / Florence formation': 'Винчи / Флоренция: становление',
    'Milan I': 'Милан I',
    'Florence II': 'Флоренция II',
    'Milan II': 'Милан II',
    'Rome': 'Рим',
    'Amboise / Clos Lucé': 'Амбуаз / Кло-Люсе',
    'Birth and childhood origin': 'Рождение и место детства',
    "Registered with the painters' Confraternity of Saint Luke": 'Зарегистрирован в братстве художников Святого Луки',
    'San Francesco Grande altarpiece contract': 'Договор на алтарный образ для Сан-Франческо-Гранде',
    'Returned Florentine work period': 'Возвращение к работе во Флоренции',
    'Manuscript F begun in Milan': 'В Милане начата рукопись F',
    'Roman residence and work context': 'Проживание и работа в Риме',
    'Final residence and work period': 'Последний период проживания и работы',
    'Leonardo records the dated Rimini observation': 'Леонардо записывает датированное наблюдение в Римини',
    'Leonardo documented in the Cesena survey context': 'Леонардо документирован в контексте обследования Чезены',
    'Leonardo records the Cesenatico port': 'Леонардо записывает сведения о порте Чезенатико',
    "Leonardo's documented Imola map-work context": 'Документированный контекст работы Леонардо над картой Имолы',
    'Visits at this place': 'Пребывания в этом месте',
    'Dashed links and chevrons show time order, not travel routes.': 'Пунктир и указатели показывают порядок во времени, не маршруты движения.',
    'Choose a visible place on the globe.': 'Выберите видимое место на глобусе.',
    'Language': 'Язык',
    'Interface language': 'Язык интерфейса',
    'English': 'Английский',
    'Russian': 'Русский',
    'Chronological presences': 'Присутствия по хронологии',
    'Numbers show chronology; routes unknown.': 'Номера показывают хронологию; маршруты неизвестны.',
    'Dashed links show order, not travel routes.': 'Пунктир — порядок событий, не маршруты движения.',
    'Dashed links show chronological order; exact routes between Presence anchors remain unknown.': 'Пунктир показывает хронологию; точные маршруты между местами неизвестны.',
    'Exact route unknown; dashed links show order only': 'Точный маршрут неизвестен; пунктир показывает только порядок',
    'Romagna source anchors': 'Опоры по источникам Романьи',
    'Presence chronology': 'Хронология присутствий',
    'Chronological order': 'Хронологический порядок',
    'Zoom in': 'Приблизить',
    'Zoom out': 'Отдалить',
    'Reset bearing to north': 'Ориентировать на север',
    'Close popup': 'Закрыть карточку',
    'Toggle attribution': 'Показать атрибуцию'
  });
  let language = 'en';
  let root = null;
  let observer = null;
  const originals = new WeakMap();
  const attributes = ['aria-label', 'title', 'placeholder'];
  // Evidence text is deliberately source-native. Never translate identifiers,
  // source titles, locators, attribution/legal text or canonical Claim prose.
  const excluded = 'script, style, code, .record-id, .record-meta, .claim-statement, .evidence-row, .evidence-group a, .evidence-group > strong, .evidence-locator, #attribution-status, .maplibregl-ctrl-attrib-inner, [translate="no"], [data-i18n-skip]';

  function russian(text) {
    if (Object.prototype.hasOwnProperty.call(dictionary, text)) return dictionary[text];
    let match = text.match(/^Selected interval: (.+) to (.+) · (\d+) presences?\.$/);
    if (match) return `Интервал: ${match[1]} — ${match[2]} · присутствий: ${match[3]}.`;
    match = text.match(/^(\d+) · (.+)$/);
    if (match && Object.prototype.hasOwnProperty.call(dictionary, match[2])) return `${match[1]} · ${russian(match[2])}`;
    match = text.match(/^(.+) · click for summary; double-click to focus map$/);
    if (match) return `${russian(match[1])} · щелчок — кратко; двойной щелчок — фокус карты`;
    match = text.match(/^(.+) · (.+)$/);
    if (match && Object.prototype.hasOwnProperty.call(dictionary, match[2])) return `${match[1]} · ${russian(match[2])}`;
    match = text.match(/^Current time: (.+) · path built from (.+) · (\d+) presences?\.$/);
    if (match) return `Текущее время: ${match[1]} · накопление с ${match[2]} · присутствий: ${match[3]}.`;
    match = text.match(/^Show (.+) summary, (.+); double-click to focus map$/);
    if (match) return `Показать: ${russian(match[1])}, ${match[2]}; двойной щелчок — фокус карты`;
    match = text.match(/^Show (.+), (.+)$/);
    if (match && Object.prototype.hasOwnProperty.call(dictionary, match[1])) return `Показать: ${russian(match[1])}, ${match[2]}`;
    match = text.match(/^(named place|named settlement|named institution|named site); exact historical position unknown$/);
    if (match) return 'Именованное место; точное историческое положение неизвестно';
    match = text.match(/^(.+) · (\d+)$/);
    if (match && Object.prototype.hasOwnProperty.call(dictionary, match[1])) return `${russian(match[1])} · ${match[2]}`;
    return text;
  }

  function t(value) {
    const text = String(value ?? '');
    if (language === 'en') return text;
    const trimmed = text.trim();
    if (!trimmed) return text;
    return text.replace(trimmed, () => russian(trimmed));
  }

  function translateValue(node, key, current, write) {
    const saved = originals.get(node) || new Map();
    let record = saved.get(key);
    // Runtime may reuse an existing Text/attribute node. A changed value is a
    // fresh English input, not the earlier saved string for another Presence.
    if (!record || (current !== record.rendered && current !== record.original)) {
      record = { original: current, rendered: current };
    }
    record.rendered = t(record.original);
    saved.set(key, record);
    originals.set(node, saved);
    if (current !== record.rendered) write(record.rendered);
  }

  function translateNode(node) {
    const element = node.nodeType === 1 ? node : node.parentElement;
    if (!element || element.closest(excluded)) return;
    if (node.nodeType === 3) {
      translateValue(node, 'text', node.nodeValue, (value) => { node.nodeValue = value; });
    } else if (node.nodeType === 1) {
      for (const name of attributes) {
        if (node.hasAttribute(name)) {
          translateValue(node, name, node.getAttribute(name), (value) => node.setAttribute(name, value));
        }
      }
    }
  }

  function refresh() {
    root = document.getElementById('app');
    if (!root) return;
    observer?.disconnect();
    translateNode(root);
    const walker = document.createTreeWalker(root, 1 | 4);
    while (walker.nextNode()) translateNode(walker.currentNode);
    observer?.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  }

  function setLanguage(next) {
    language = next === 'ru' ? 'ru' : 'en';
    document.documentElement.lang = language;
    document.documentElement.dataset.artemisLanguage = language;
    refresh();
    return language;
  }

  window.ARTEMIS_I18N = Object.freeze({ t, setLanguage, refresh, get language() { return language; } });
  function initialize() {
    observer = new MutationObserver(refresh);
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
}());
