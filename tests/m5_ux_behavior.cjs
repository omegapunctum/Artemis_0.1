// Execute shipped functions against a small DOM adapter. This checks behavior,
// not browser layout; responsive screenshots remain a separate acceptance gate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const runtimeSource = fs.readFileSync('scripts/globe_spike/runtime.js', 'utf8');
function fn(name) {
  const start = runtimeSource.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, name);
  const end = runtimeSource.indexOf('\n  function ', start + 1);
  return runtimeSource.slice(start, end < 0 ? undefined : end);
}
class Element {
  constructor() {
    this.nodeType = 1; this.dataset = {}; this.children = []; this.attrs = {};
    this.events = {}; this.hidden = false; this.focused = false;
    this.classes = new Set();
    this.classList = {toggle: (key, value) => value ? this.classes.add(key) : this.classes.delete(key)};
  }
  append(child) { this.children.push(child); child.parentElement = this; }
  replaceChildren() { this.children = []; }
  querySelector() { return null; }
  querySelectorAll() { return this.children; }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key]; }
  hasAttribute(key) { return key in this.attrs; }
  addEventListener(key, callback) { this.events[key] = callback; }
  scrollIntoView() {}
  focus() { this.focused = true; }
  closest() { return this.skip ? this : null; }
  contains(element) { return this.children.includes(element); }
}
const sequence = new Element();
const periods = new Element();
const inspector = new Element();
const range = new Element();
const periodButton = new Element(); periodButton.dataset.periodId = 'period-a'; periods.append(periodButton);
const presences = [
  {presence_id: 'b', index: 1, place_label: 'Milan', place_ref: 'milan', axis_start_index: 10},
  {presence_id: 'a', index: 0, place_label: 'Vinci', place_ref: 'vinci', axis_start_index: 0}
];
const markerA = new Element(), markerB = new Element();
let visible = [...presences];
let selected = null;
const runtime = {data: {lifePath: {presences, macro_periods: [{period_id: 'period-a', label: 'Milan I', presence_refs: ['b']}]}},
  lifePathMarkers: new Map([['a', {getElement: () => markerA}], ['b', {getElement: () => markerB}]]),
  placeMarkers: new Map([['vinci', {getElement: () => markerA}], ['milan', {getElement: () => markerB}]]),
  selectedPresenceId: 'b', lifePathMode: 'range'};
const document = {documentElement: {dataset: {}}, createElement: () => new Element(), activeElement: null};
const context = vm.createContext({runtime, document,
  byId: id => ({'presence-sequence': sequence, 'macro-periods': periods, inspector, 'mode-range': range}[id]),
  formatPresenceTime: () => '1502', visibleLifePathPresences: () => visible,
  layoutPlaceLabels: () => {},
  selectLifePathPresence: (id, options) => { selected = {id, options}; }
});
vm.runInContext(['presencePeriod', 'bindPresenceEmphasis', 'renderPresenceSequence',
  'syncLifePathSelectionControls', 'visiblePlaceGroups', 'placeClickPresence', 'chronologyEmphasis', 'updateLifePathMarkers', 'closeDetailsDrawer', 'lifePathConnectorGeoJson'].map(fn).join('\n'), context);
context.renderPresenceSequence();
assert.deepEqual(sequence.children.map(b => b.textContent), ['1 · Vinci', '2 · Milan']);
assert.equal(sequence.children[1].title, '1502 · Milan I');
sequence.children[1].events.click();
assert.equal(selected.id, 'b'); assert.equal(selected.options.fly, false);
context.updateLifePathMarkers();
assert.equal(sequence.children[1].attrs['aria-pressed'], 'true');
assert.equal(markerB.attrs['aria-pressed'], 'true');
assert.equal(periodButton.attrs['aria-current'], 'true');
sequence.children[1].events.focus();
assert.ok(markerB.classes.has('is-emphasized'));
sequence.children[1].events.blur();
assert.ok(!markerB.classes.has('is-emphasized'));
context.bindPresenceEmphasis(markerA, 'a');
markerA.events.mouseenter(); assert.ok(sequence.children[0].classes.has('is-emphasized'));
markerA.events.mouseleave(); assert.ok(!sequence.children[0].classes.has('is-emphasized'));
visible = [presences[0]]; runtime.lifePathMode = 'scrub'; context.updateLifePathMarkers();
assert.equal(sequence.children[0].hidden, true); assert.equal(markerA.hidden, true);
assert.ok(sequence.children[1].classes.has('is-current')); assert.ok(markerB.classes.has('is-current'));
const focused = new Element(); inspector.append(focused); document.activeElement = focused;
context.closeDetailsDrawer(); assert.equal(inspector.hidden, true); assert.equal(sequence.children[1].focused, true);
sequence.children[1].focused = false; sequence.children[1].hidden = true;
context.closeDetailsDrawer(); assert.equal(range.focused, true);
// Missing/false policy is fail closed even when no map/geometry helpers exist.
assert.equal(context.lifePathConnectorGeoJson().features.length, 0);
runtime.data.lifePath.route_policy = {chronological_connector_permitted: false};
assert.equal(context.lifePathConnectorGeoJson().features.length, 0);
// Owner-authorized chronology is renderer-only and follows visible endpoints.
runtime.data.lifePath.route_policy.chronological_connector_permitted = true;
presences[0].coordinates = [9, 45]; presences[1].coordinates = [11, 44];
runtime.data.lifePath.transitions = [{transition_id: 'a-b', from_presence_ref: 'a',
  to_presence_ref: 'b', route_status: 'unknown_route', route_geometry: null}];
visible = [...presences];
const links = context.lifePathConnectorGeoJson().features;
assert.equal(links.length, 1);
assert.equal(links[0].properties.is_historical_route_geometry, false);
assert.equal(links[0].properties.route_status, 'unknown_route');
assert.equal(links[0].geometry.type, 'LineString');
assert.equal(runtime.data.lifePath.transitions[0].route_geometry, null);
visible = [presences[0]];
assert.equal(context.lifePathConnectorGeoJson().features.length, 0);
visible = [];
assert.equal(context.lifePathConnectorGeoJson().features.length, 0);

// Run the complete localization module, including refresh and reused nodes.
const root = new Element();
const label = new Element(); label.setAttribute('title', '1502 · Milan I'); root.append(label);
const text = {nodeType: 3, nodeValue: '2 · Milan', parentElement: label};
const source = new Element(); source.skip = true;
const sourceText = {nodeType: 3, nodeValue: 'Milan', parentElement: source};
const nodes = [label, text, sourceText];
const location = Object.freeze({href: 'https://example.test/?presence=b&start=1452&end=1519'});
const state = JSON.stringify(runtime.data);
const i18nDocument = {readyState: 'complete', documentElement: {dataset: {}},
  getElementById: () => root,
  createTreeWalker: () => { let index = -1; return {nextNode() { return ++index < nodes.length; }, get currentNode() { return nodes[index]; }}; }
};
const window = {location};
const i18nContext = vm.createContext({window, document: i18nDocument,
  MutationObserver: class {observe() {} disconnect() {}}});
vm.runInContext(fs.readFileSync('scripts/globe_spike/localization.js', 'utf8'), i18nContext);
window.ARTEMIS_I18N.setLanguage('ru');
assert.equal(text.nodeValue, '2 · Милан');
assert.equal(label.attrs.title, '1502 · Милан I');
assert.equal(sourceText.nodeValue, 'Milan');
assert.equal(window.ARTEMIS_I18N.t('Dashed links show order, not travel routes.'), 'Пунктир — порядок событий, не маршруты движения.');
assert.equal(window.ARTEMIS_I18N.t('1502 · Romagna source anchors'), '1502 · Опоры по источникам Романьи');
assert.ok(window.ARTEMIS_I18N.t('Vinci · click for summary; double-click to focus map').startsWith('Винчи ·'));
text.nodeValue = '1 · Vinci'; window.ARTEMIS_I18N.refresh(); assert.equal(text.nodeValue, '1 · Винчи');
window.ARTEMIS_I18N.setLanguage('en');
assert.equal(text.nodeValue, '1 · Vinci'); assert.equal(label.attrs.title, '1502 · Milan I');
assert.equal(window.location, location); assert.equal(JSON.stringify(runtime.data), state);
assert.equal(runtime.selectedPresenceId, 'b');
console.log('M5 chronology, filtering, emphasis, focus, presentation-only connectors, EN/RU round-trip: passed');


// Execute Place construction and selection against the actual shipped functions.
{
  class Node extends Element {
    constructor() { super(); this.style = {}; }
    querySelector(selector) {
      const name = selector.slice(1);
      for (const c of this.children) { if (c.className === name) return c; const found = c.querySelector?.(selector); if (found) return found; }
      return null;
    }
  }
  let spatialCount = 0;
  class Marker {
    constructor({element}) {this.node = element; spatialCount++;}
    setLngLat(coordinates) {this.coordinates = coordinates; return this;}
    addTo() {return this;}
    getElement() {return this.node;}
  }
  const visits = [
    {presence_id: 'm1', place_ref: 'milan', place_label: 'Milan', index: 0, coordinates: [9,45], axis_start_index: 0, axis_end_index: 0, event_item_id: 'e1'},
    {presence_id: 'f', place_ref: 'florence', place_label: 'Florence', index: 1, coordinates: [11,44], axis_start_index: 1, axis_end_index: 1, event_item_id: 'ef'},
    {presence_id: 'm2', place_ref: 'milan', place_label: 'Milan', index: 2, coordinates: [9,45], axis_start_index: 2, axis_end_index: 2, event_item_id: 'e2'}
  ];
  const controls = new Node();
  const r = {data: {lifePath: {presences: visits, route_policy: {chronological_connector_permitted: false}}},
    map: {addSource() {}, on() {}}, placeMarkers: new Map(), lifePathMarkers: new Map(), lifePathMode: 'range', lifePathStartIndex: 0, lifePathEndIndex: 2};
  let urlPresence, selection;
  const ctx = vm.createContext({runtime: r, document: {createElement: () => new Node(), documentElement: {dataset: {}}},
    maplibregl: {Marker}, byId: id => id === 'presence-sequence' ? controls : null,
    formatPresenceTime: p => `period-${p.index}`, presencePeriod: () => null,
    updateLifePathConnectors() {}, layoutPlaceLabels() {}, positionChronologyCues() {},
    currentProjectionItem: id => ({item_id: id}), updateCanonicalSelection: item => {selection = item.item_id;},
    syncUrlState: () => {urlPresence = r.selectedPresenceId;}, showPresencePopup() {}});
  vm.runInContext(['appendText','visibleLifePathPresences','visiblePlaceGroups','placeClickPresence','syncLifePathSelectionControls','updateLifePathMarkers','lifePathConnectorGeoJson','addLifePathMarkers','bindPresenceEmphasis','renderPresenceSequence','selectLifePathPresence'].map(fn).join('\n'), ctx);
  ctx.addLifePathMarkers(r.map); ctx.renderPresenceSequence();
  assert.equal(spatialCount, 2);
  assert.equal(r.lifePathMarkers.get('m1'), r.lifePathMarkers.get('m2'));
  assert.deepEqual(r.placeMarkers.get('milan').coordinates, [9,45]);
  assert.equal(r.placeMarkers.get('milan').node.querySelector('.place-count').textContent, ' ×2');
  for (const id of ['m1','m2']) {
    controls.children.find(b => b.dataset.presenceId === id).events.click();
    assert.equal(r.selectedPresenceId, id); assert.equal(urlPresence, id);
    assert.equal(selection, id === 'm1' ? 'e1' : 'e2');
    assert.equal(r.placeMarkers.get('milan').node.attrs['aria-pressed'], 'true');
  }
  r.lifePathMode = 'scrub'; r.lifePathEndIndex = 1; ctx.updateLifePathMarkers();
  assert.equal(r.placeMarkers.get('milan').node.querySelector('.place-count').textContent, '');
  assert.equal(controls.children[2].hidden, true);
  r.lifePathMode = 'range'; r.lifePathStartIndex = 2; r.lifePathEndIndex = 2; ctx.updateLifePathMarkers();
  assert.equal(ctx.placeClickPresence('milan').presence_id, 'm2');
  assert.equal(r.placeMarkers.get('florence').node.hidden, true);
}

// Saved Scrub origins restore deterministically, including invalid/reversed input.
{
  const r = {};
  const window = {location: {search: ''}};
  let saved;
  const ctx = vm.createContext({runtime: r, window, URLSearchParams,
    lifePathAxisValues: () => ['1452','1502','1519'], syncLifePathControls() {}, applyLifePathView() {},
    selectLifePathPresence() {}, syncUrlState: () => {saved = [r.lifePathStartIndex,r.lifePathEndIndex];}});
  vm.runInContext(fn('restoreLifePathStateFromUrl'), ctx);
  for (const [query, expected] of [
    ['?mode=scrub&at=1519', [0,2]], ['?mode=scrub&from=1502&at=1519',[1,2]],
    ['?mode=scrub&from=bad&at=1519',[0,2]], ['?mode=scrub&from=1519&at=1452',[2,2]],
    ['?mode=range&start=1502&end=1519',[1,2]]]) {
    window.location.search = query; ctx.restoreLifePathStateFromUrl(); assert.deepEqual(saved, expected);
  }
}

// Emphasis is display metadata; endpoint geometry and unknown-route data stay intact.
visible = [...presences]; runtime.lifePathMode = 'range'; runtime.selectedPresenceId = 'a';
assert.equal(context.lifePathConnectorGeoJson().features[0].properties.emphasis, 1);
runtime.lifePathMode = 'scrub';
assert.equal(context.lifePathConnectorGeoJson().features[0].properties.emphasis, 2);
assert.equal(runtime.data.lifePath.transitions[0].route_geometry, null);
assert.equal(context.lifePathConnectorGeoJson().features[0].properties.route_geometry, null);
window.ARTEMIS_I18N.setLanguage('ru');
assert.equal(window.ARTEMIS_I18N.t('Dashed links and chevrons show time order, not travel routes.'), 'Пунктир и указатели показывают порядок во времени, не маршруты движения.');
console.log('Place anchors, repeated episode selection/counts, saved Scrub URLs and chronology emphasis: passed');

// Dense labels: priority wins, text suppression never modifies anchor identity.
{
  const visits = Array.from({length: 12}, (_, index) => ({index, presence_id: `p${index}`, place_ref: `place${index}`}));
  const nodes = visits.map(() => {
    const label = {offsetWidth: 65, offsetHeight: 16, style: {}, classList: {toggle(_, value) {label.suppressed = value;}}};
    return {hidden: false, label, querySelector: () => label};
  });
  const anchors = visits.map((p, i) => [p.place_ref, {getElement: () => nodes[i], getLngLat: () => [150,150]}]);
  const r = {placeMarkers: new Map(anchors), lifePathMode: 'range', selectedPresenceId: 'p8',
    map: {getCanvas: () => ({clientWidth: 300, clientHeight: 300}), project: () => ({x:150,y:150})}};
  const ctx = vm.createContext({runtime:r, visibleLifePathPresences: () => visits,
    visiblePlaceGroups: () => new Map(visits.map(p => [p.place_ref,[p]]))});
  vm.runInContext(fn('layoutPlaceLabels'), ctx);
  ctx.layoutPlaceLabels();
  assert.equal(nodes[8].label.suppressed, false);
  assert.ok(nodes.some(n => n.label.suppressed));
  assert.ok(nodes.every(n => !n.hidden));
  r.selectedPresenceId = 'p7'; ctx.layoutPlaceLabels();
  assert.equal(nodes[7].label.suppressed, false);
  r.selectedPresenceId = null; r.lifePathMode = 'scrub'; ctx.layoutPlaceLabels();
  assert.equal(nodes[11].label.suppressed, false);
  assert.ok(anchors.every(([,a]) => JSON.stringify(a.getLngLat()) === '[150,150]'));
}
