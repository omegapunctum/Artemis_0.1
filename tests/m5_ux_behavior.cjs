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
  querySelectorAll() { return this.children; }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key]; }
  hasAttribute(key) { return key in this.attrs; }
  addEventListener(key, callback) { this.events[key] = callback; }
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
  {presence_id: 'b', index: 1, place_label: 'Milan', axis_start_index: 10},
  {presence_id: 'a', index: 0, place_label: 'Vinci', axis_start_index: 0}
];
const markerA = new Element(), markerB = new Element();
let visible = [...presences];
let selected = null;
const runtime = {data: {lifePath: {presences, macro_periods: [{period_id: 'period-a', label: 'Milan I', presence_refs: ['b']}]}},
  lifePathMarkers: new Map([['a', {getElement: () => markerA}], ['b', {getElement: () => markerB}]]),
  selectedPresenceId: 'b', lifePathMode: 'range'};
const document = {documentElement: {dataset: {}}, createElement: () => new Element(), activeElement: null};
const context = vm.createContext({runtime, document,
  byId: id => ({'presence-sequence': sequence, 'macro-periods': periods, inspector, 'mode-range': range}[id]),
  formatPresenceTime: () => '1502', visibleLifePathPresences: () => visible,
  selectLifePathPresence: (id, options) => { selected = {id, options}; }
});
vm.runInContext(['presencePeriod', 'bindPresenceEmphasis', 'renderPresenceSequence',
  'syncLifePathSelectionControls', 'layoutLifePathMarkers', 'updateLifePathMarkers', 'closeDetailsDrawer', 'lifePathConnectorGeoJson'].map(fn).join('\n'), context);
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
assert.equal(window.ARTEMIS_I18N.t('Numbers show chronology; routes unknown.'), 'Номера показывают хронологию; маршруты неизвестны.');
assert.equal(window.ARTEMIS_I18N.t('Dashed links show order, not travel routes.'), 'Пунктир — порядок событий, не маршруты движения.');
assert.equal(window.ARTEMIS_I18N.t('1502 · Romagna source anchors'), '1502 · Опоры по источникам Романьи');
assert.ok(window.ARTEMIS_I18N.t('Vinci · click for summary; double-click to focus map').startsWith('Винчи ·'));
text.nodeValue = '1 · Vinci'; window.ARTEMIS_I18N.refresh(); assert.equal(text.nodeValue, '1 · Винчи');
window.ARTEMIS_I18N.setLanguage('en');
assert.equal(text.nodeValue, '1 · Vinci'); assert.equal(label.attrs.title, '1502 · Milan I');
assert.equal(window.location, location); assert.equal(JSON.stringify(runtime.data), state);
assert.equal(runtime.selectedPresenceId, 'b');
console.log('M5 chronology, filtering, emphasis, focus, presentation-only connectors, EN/RU round-trip: passed');

// Coincident visits remain individually reachable; filtering releases label space.
{
  const visits = Array.from({length: 3}, (_, i) => ({presence_id: `visit-${i}`, coordinates: [12, 44]}));
  const markers = new Map(visits.map(p => {
    const node = {hidden: false, style: {setProperty() {}}};
    return [p.presence_id, {getElement: () => node, setOffset(value) {this.offset = value;}}];
  }));
  const r = {data: {lifePath: {presences: visits}}, lifePathMarkers: markers,
    map: {getCanvas: () => ({clientWidth: 390, clientHeight: 600}), project: () => ({x: 195, y: 300})}};
  const ctx = vm.createContext({runtime: r});
  vm.runInContext(fn('layoutLifePathMarkers'), ctx);
  ctx.layoutLifePathMarkers();
  const offsets = [...markers.values()].map(m => m.offset);
  for (let i = 0; i < offsets.length; i++) for (let j = i + 1; j < offsets.length; j++) {
    assert.ok(Math.abs(offsets[i][0] - offsets[j][0]) >= 149 || Math.abs(offsets[i][1] - offsets[j][1]) >= 49);
  }
  assert.deepEqual(visits.map(p => p.coordinates), [[12, 44], [12, 44], [12, 44]]);
  markers.get('visit-0').getElement().hidden = true;
  ctx.layoutLifePathMarkers();
  assert.equal(markers.get('visit-1').offset[1], 0);
}
