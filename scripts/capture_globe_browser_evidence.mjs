#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function parseArguments(argv) {
  const values = {};
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Expected --name value arguments; received ${key || '<empty>'}`);
    }
    values[key.slice(2)] = value;
  }
  const required = ['browser', 'url', 'width', 'height', 'dom', 'screenshot'];
  for (const key of required) {
    if (!values[key]) throw new Error(`Missing required --${key} argument`);
  }
  values.width = Number(values.width);
  values.height = Number(values.height);
  values.timeoutMs = Number(values['timeout-ms'] || 30000);
  values.reducedMotion = values['reduced-motion'] === 'true';
  values.verifyUrlState = values['verify-url-state'] === 'true';
  if (![values.width, values.height, values.timeoutMs].every(Number.isFinite)) {
    throw new Error('Width, height and timeout must be finite numbers');
  }
  return values;
}

async function waitForDevToolsPort(profileDirectory, browser, deadline) {
  const portFile = join(profileDirectory, 'DevToolsActivePort');
  while (Date.now() < deadline) {
    if (browser.exitCode !== null) {
      throw new Error(`Chrome exited before DevTools became available: ${browser.exitCode}`);
    }
    try {
      const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/);
      if (port) return Number(port);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    await delay(100);
  }
  throw new Error('Timed out waiting for Chrome DevToolsActivePort');
}

async function waitForPageEndpoint(port, deadline) {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((target) => target.type === 'page');
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch (_error) {
      // Chrome may publish the port before the target endpoint is ready.
    }
    await delay(100);
  }
  throw new Error('Timed out waiting for a Chrome page target');
}

async function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Chrome DevTools WebSocket failed')), { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result || {});
  });

  return {
    async send(method, params = {}) {
      const id = ++nextId;
      const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      socket.send(JSON.stringify({ id, method, params }));
      return response;
    },
    close() {
      socket.close();
    }
  };
}

async function evaluate(cdp, expression, awaitPromise = false) {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Runtime.evaluate failed');
  }
  return response.result?.value;
}

async function waitForVisualReadiness(cdp, deadline) {
  let lastState = null;
  while (Date.now() < deadline) {
    lastState = await evaluate(cdp, `(() => {
      const root = document.documentElement?.dataset || {};
      const fatal = document.getElementById('fatal-error');
      return {
        ready: root.artemisVisualReady === 'true',
        runtimeReady: root.artemisRuntimeReady === 'true',
        contextSourceFeatureCount: Number(root.artemisContextSourceFeatureCount || 0),
        contextRenderedFeatureCount: Number(root.artemisContextRenderedFeatureCount || 0),
        fatal: fatal && !fatal.hidden ? fatal.textContent : null
      };
    })()`);
    if (lastState?.fatal) throw new Error(lastState.fatal);
    if (
      lastState?.ready
      && lastState.contextSourceFeatureCount > 0
      && lastState.contextRenderedFeatureCount > 0
    ) {
      await evaluate(
        cdp,
        'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
        true
      );
      return lastState;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for visual readiness: ${JSON.stringify(lastState)}`);
}

async function verifyUrlStateRestoration(cdp, deadline) {
  const interaction = await evaluate(cdp, `(async () => {
    const runtime = window.__ARTEMIS_GLOBE_SPIKE;
    const initialStatus = document.getElementById('temporal-map-status')?.textContent || '';
    const presences = runtime.data.lifePath.presences;
    const axisValues = runtime.data.lifePath.time_axis.values;
    if (presences.length !== 11) throw new Error('M5 whole-life path does not expose eleven presences');
    if ((runtime.data.lifePath.macro_periods || []).length !== 6) {
      throw new Error('M5 whole-life path does not expose six macro periods');
    }
    if (!runtime.map.getLayer('life-path-chronology-line')) {
      throw new Error('M5 chronological presentation links are missing');
    }
    if (runtime.data.lifePath.route_policy.historical_route_geometry_permitted !== false
        || runtime.data.lifePath.route_policy.chronological_connector_is_route !== false
        || runtime.data.lifePath.transitions.some((link) => link.route_geometry !== null || link.route_status !== 'unknown_route')) {
      throw new Error('Chronological presentation must not promote unknown historical routes');
    }
    const uniquePlaces = new Set(presences.map(p => p.place_ref));
    if (document.querySelectorAll('.life-path-marker').length !== uniquePlaces.size) throw new Error('Map must have one anchor per Place');
    for (const place of uniquePlaces) {
      const episodes = presences.filter(p => p.place_ref === place);
      const anchor = runtime.placeMarkers.get(place);
      if (episodes.some(p => runtime.lifePathMarkers.get(p.presence_id) !== anchor)) throw new Error('Presence aliases must share the Place anchor');
      const coordinate = anchor.getLngLat();
      if (coordinate.lng !== episodes[0].coordinates[0] || coordinate.lat !== episodes[0].coordinates[1]) throw new Error('Place anchor moved');
      if (episodes.length > 1) {
        for (const episode of episodes) {
          runtime.selectPresence(episode.presence_id);
          if (runtime.selectedPresenceId !== episode.presence_id || anchor.getElement().getAttribute('aria-pressed') !== 'true') throw new Error('Repeated Presence selection collapsed');
          if (new URLSearchParams(location.search).get('presence') !== episode.presence_id) throw new Error('Repeated Presence URL identity lost');
        }
      }
    }
    for (const cue of runtime.chronologyCues.values()) {
      const [a, b] = cue.coordinates, point = cue.marker.getLngLat();
      if (Math.abs(point.lng - (a[0]+b[0])/2) > 1e-9 || Math.abs(point.lat - (a[1]+b[1])/2) > 1e-9) throw new Error('Direction cue must stay at segment midpoint');
      if (cue.marker.getElement().getAttribute('aria-hidden') !== 'true') throw new Error('Direction cue is presentation only');
    }
    document.getElementById('close-details')?.click();
    document.getElementById('mode-scrub')?.click();
    const scrubStart = document.getElementById('scrub-start');
    const scrubCurrent = document.getElementById('scrub-current');
    if (scrubStart || !scrubCurrent) throw new Error('Scrub must have one current-time control and no Build from');
    if (runtime.lifePathStartIndex !== 0) throw new Error('Default Scrub origin is not the earliest axis extent');
    scrubCurrent.value = String(axisValues.indexOf('1502'));
    scrubCurrent.dispatchEvent(new Event('input', { bubbles: true }));
    const marker = [...document.querySelectorAll('.life-path-marker')].find(
      (button) => button.getAttribute('aria-label')?.startsWith('Show Cesena summary,')
    );
    if (!marker || marker.hidden) throw new Error('Visible Cesena map marker is unavailable');
    const cameraBefore = {
      center: runtime.map.getCenter().toArray(),
      zoom: runtime.map.getZoom()
    };
    marker.click();
    await new Promise((resolve) => setTimeout(resolve, 320));
    const popupText = document.querySelector('.presence-popup-card')?.textContent || '';
    const detailsAfterFirstClick = document.getElementById('inspector')?.hidden === false;
    marker.click();
    await new Promise((resolve) => setTimeout(resolve, 320));
    const cameraAfter = {
      center: runtime.map.getCenter().toArray(),
      zoom: runtime.map.getZoom()
    };

    const params = new URLSearchParams(window.location.search);
    return {
      initialStatus,
      updatedStatus: document.getElementById('temporal-map-status')?.textContent || '',
      cardText: document.getElementById('selection-card')?.textContent || '',
      popupText,
      detailsAfterFirstClick,
      detailsAfterSecondClick: document.getElementById('inspector')?.hidden === false,
      cameraBefore,
      cameraAfter,
      mode: runtime.lifePathMode,
      from: axisValues[runtime.lifePathStartIndex],
      at: axisValues[runtime.lifePathEndIndex],
      presence: runtime.selectedPresenceId,
      item: runtime.selectedItemId,
      visiblePresenceCount: Number(document.documentElement.dataset.artemisVisiblePresenceCount || 0),
      urlMode: params.get('mode'),
      urlFrom: params.get('from'),
      urlAt: params.get('at'),
      urlPresence: params.get('presence'),
      urlItem: params.get('item')
    };
  })()`, true);

  if (!interaction.mode || !interaction.presence || !interaction.item) {
    throw new Error(`Interaction did not select life-path state: ${JSON.stringify(interaction)}`);
  }
  for (const requiredText of [
    'Cesena',
    'Leonardo documented in the Cesena survey context',
    'Not established beyond the documented source anchor',
    'exact historical position unknown',
    'Sources and uncertainty'
  ]) {
    if (!interaction.cardText.includes(requiredText)) {
      throw new Error(`Life-path presence card did not expose ${requiredText}`);
    }
  }
  if (!interaction.popupText.includes('Cesena') || !interaction.popupText.includes('Open details')) {
    throw new Error(`First marker click did not open a compact popup: ${JSON.stringify(interaction)}`);
  }
  if (interaction.detailsAfterFirstClick || !interaction.detailsAfterSecondClick) {
    throw new Error(`Marker selection did not preserve the two-stage detail flow: ${JSON.stringify(interaction)}`);
  }
  if (JSON.stringify(interaction.cameraBefore) !== JSON.stringify(interaction.cameraAfter)) {
    throw new Error(`Single marker clicks changed the map camera: ${JSON.stringify(interaction)}`);
  }
  if (interaction.initialStatus === interaction.updatedStatus) {
    throw new Error('Timeline interaction did not update the visible globe status');
  }
  if (interaction.visiblePresenceCount !== 7) {
    throw new Error(`Scrub mode did not reveal seven accumulated anchors through 1502: ${JSON.stringify(interaction)}`);
  }
  if (
    interaction.urlMode !== interaction.mode
    || interaction.urlFrom !== interaction.from
    || interaction.urlAt !== interaction.at
    || interaction.urlPresence !== interaction.presence
    || interaction.urlItem !== interaction.item
  ) {
    throw new Error(`Life-path state was not written to the URL: ${JSON.stringify(interaction)}`);
  }

  await evaluate(cdp, "document.documentElement.dataset.artemisUrlTestReload = 'before'");
  await cdp.send('Page.reload', { ignoreCache: false });
  const reloadDeadline = Math.max(deadline, Date.now() + 30000);
  while (Date.now() < reloadDeadline) {
    const marker = await evaluate(
      cdp,
      "document.documentElement?.dataset?.artemisUrlTestReload || null"
    ).catch(() => 'before');
    if (marker !== 'before') break;
    await delay(100);
  }
  await waitForVisualReadiness(cdp, reloadDeadline);
  const restored = await evaluate(cdp, `(() => {
    const runtime = window.__ARTEMIS_GLOBE_SPIKE;
    const axisValues = runtime.data.lifePath.time_axis.values;
    return {
      mode: runtime.lifePathMode,
      from: axisValues[runtime.lifePathStartIndex],
      at: axisValues[runtime.lifePathEndIndex],
      presence: runtime.selectedPresenceId,
      item: runtime.selectedItemId,
      popupPresence: runtime.popupPresenceId,
      popupText: document.querySelector('.presence-popup-card')?.textContent || '',
      detailsOpen: document.getElementById('inspector')?.hidden === false
    };
  })()`);
  if (JSON.stringify(restored) !== JSON.stringify({
    mode: interaction.mode,
    from: interaction.from,
    at: interaction.at,
    presence: interaction.presence,
    item: interaction.item,
    popupPresence: interaction.presence,
    popupText: interaction.popupText,
    detailsOpen: false
  })) {
    throw new Error(`URL state did not survive reload: ${JSON.stringify({ interaction, restored })}`);
  }

  const invalidCanonical = await evaluate(cdp, `(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'invalid-mode');
    url.searchParams.set('start', 'invalid-start');
    url.searchParams.set('end', 'invalid-end');
    url.searchParams.set('from', 'invalid-from');
    url.searchParams.set('at', 'invalid-at');
    url.searchParams.set('presence', 'invalid-presence');
    url.searchParams.set('item', 'invalid-item');
    history.pushState({ invalid: true }, '', url);
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    const runtime = window.__ARTEMIS_GLOBE_SPIKE;
    const axisValues = runtime.data.lifePath.time_axis.values;
    const params = new URLSearchParams(window.location.search);
    return {
      mode: runtime.lifePathMode,
      start: axisValues[runtime.lifePathStartIndex],
      end: axisValues[runtime.lifePathEndIndex],
      presence: runtime.selectedPresenceId,
      item: runtime.selectedItemId,
      urlMode: params.get('mode'),
      urlStart: params.get('start'),
      urlEnd: params.get('end'),
      urlFrom: params.get('from'),
      urlAt: params.get('at'),
      urlPresence: params.get('presence'),
      urlItem: params.get('item')
    };
  })()`);
  if (
    invalidCanonical.urlMode !== invalidCanonical.mode
    || invalidCanonical.urlStart !== invalidCanonical.start
    || invalidCanonical.urlEnd !== invalidCanonical.end
    || invalidCanonical.urlFrom !== null
    || invalidCanonical.urlAt !== null
    || invalidCanonical.urlPresence !== invalidCanonical.presence
    || invalidCanonical.urlItem !== invalidCanonical.item
  ) {
    throw new Error(`Invalid popstate URL was not canonicalized: ${JSON.stringify(invalidCanonical)}`);
  }

  await evaluate(cdp, 'history.back()');
  let popstateRestored = null;
  while (Date.now() < reloadDeadline) {
    popstateRestored = await evaluate(cdp, `(() => {
      const runtime = window.__ARTEMIS_GLOBE_SPIKE;
      const axisValues = runtime.data.lifePath.time_axis.values;
      return {
        mode: runtime.lifePathMode,
        from: axisValues[runtime.lifePathStartIndex],
        at: axisValues[runtime.lifePathEndIndex],
        presence: runtime.selectedPresenceId,
        item: runtime.selectedItemId
      };
    })()`);
    if (
      popstateRestored.mode === interaction.mode
      && popstateRestored.from === interaction.from
      && popstateRestored.at === interaction.at
      && popstateRestored.presence === interaction.presence
      && popstateRestored.item === interaction.item
    ) break;
    await delay(100);
  }
  if (
    popstateRestored.mode !== interaction.mode
    || popstateRestored.from !== interaction.from
    || popstateRestored.at !== interaction.at
    || popstateRestored.presence !== interaction.presence
    || popstateRestored.item !== interaction.item
  ) {
    throw new Error(`Back navigation did not restore Explorer State: ${JSON.stringify(popstateRestored)}`);
  }
  return { interaction, restored, invalidCanonical, popstateRestored };
}

async function main() {
  const options = parseArguments(process.argv);
  const profileDirectory = await mkdtemp(join(tmpdir(), 'artemis-chrome-profile-'));
  const deadline = Date.now() + options.timeoutMs;
  const chromeArguments = [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--run-all-compositor-stages-before-draw',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDirectory}`,
    `--window-size=${options.width},${options.height}`,
    ...(options.reducedMotion ? ['--force-prefers-reduced-motion=reduce'] : []),
    'about:blank'
  ];
  const browser = spawn(options.browser, chromeArguments, { stdio: ['ignore', 'ignore', 'pipe'] });
  let browserLog = '';
  browser.stderr.on('data', (chunk) => {
    browserLog = `${browserLog}${chunk}`.slice(-20000);
  });
  let cdp = null;

  try {
    const port = await waitForDevToolsPort(profileDirectory, browser, deadline);
    const endpoint = await waitForPageEndpoint(port, deadline);
    cdp = await connectCdp(endpoint);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: options.url });
    const readiness = await waitForVisualReadiness(cdp, deadline);
    const dom = await evaluate(cdp, 'document.documentElement.outerHTML');
    const capture = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });
    await writeFile(options.dom, `${dom}\n`, 'utf8');
    await writeFile(options.screenshot, Buffer.from(capture.data, 'base64'));
    const urlStateRestoration = options.verifyUrlState
      ? await verifyUrlStateRestoration(cdp, deadline)
      : null;
    process.stdout.write(`${JSON.stringify({ ...readiness, urlStateRestoration })}\n`);
  } catch (error) {
    if (browserLog) process.stderr.write(browserLog);
    throw error;
  } finally {
    cdp?.close();
    if (browser.exitCode === null) {
      const browserExited = new Promise((resolve) => browser.once('exit', resolve));
      browser.kill('SIGTERM');
      await Promise.race([browserExited, delay(2000)]);
    }
    await rm(profileDirectory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100
    });
  }
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`);
  process.exitCode = 1;
});
