/* Catalog Sync — pulls live component data from OUR OWN server (catalog_proxy.py, served by
 * serve.py at /api/components/) and overwrites the THK_BALLSCREW_DB / SIEMENS_DRIVE_DB /
 * APEX_GEARBOX_DB / MOTOR_DB arrays IN PLACE (same array objects the data/*.js files declared
 * with const — calculations.js and the *-selection.js modules hold no separate reference, they
 * read these globals at call time, so mutating contents here is enough).
 *
 * catalog_proxy.py is the thing that actually talks to admin.clustervise.com's Django admin —
 * the browser never sees those credentials or makes a cross-origin request. This file just hits
 * our own same-origin API, so no API key is needed here.
 *
 * CATALOG_API_BASE is a RELATIVE path (no leading slash) so it resolves under whatever prefix
 * the page is served from — 'api/components/' from https://app.clustervise.com/servo/calculator.html
 * resolves to https://app.clustervise.com/servo/api/components/, which nginx's /servo/ location
 * proxies to serve.py as /api/components/. Locally (no /servo/ prefix) it resolves the same way
 * relative to whatever path serve.py is running at.
 */
const CATALOG_API_BASE = 'api/components/';

const CATALOG_SYNC_TIMEOUT_MS = 8000;

const CATALOG_SYNC_TARGETS = [
  { subComponent: 'Ball Screw',  get db() { return THK_BALLSCREW_DB; } },
  { subComponent: 'Servo Drive', get db() { return SIEMENS_DRIVE_DB; } },
  { subComponent: 'Gearbox',     get db() { return APEX_GEARBOX_DB; } },
  { subComponent: 'Servo Motor', get db() { return MOTOR_DB; } },
];

// API item -> same row shape as the local data/*.js catalogs (pn/series + spread parameters).
function catalogItemToRow(item) {
  return Object.assign({ pn: item.model_number, series: item.series }, item.parameters);
}

async function syncOneCatalog(target) {
  const url = `${CATALOG_API_BASE}?sub_component=${encodeURIComponent(target.subComponent)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CATALOG_SYNC_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) throw new Error('empty response');

    const rows = items.map(catalogItemToRow);
    const db = target.db;
    db.length = 0;
    db.push(...rows);
    console.info(`[catalog-sync] ${target.subComponent}: loaded ${rows.length} rows from Django`);
  } catch (err) {
    console.warn(`[catalog-sync] ${target.subComponent}: using bundled local data (${err.message})`);
  } finally {
    clearTimeout(timer);
  }
}

// Always resolves (never rejects) — callers just wait for sync attempts to settle, success or not.
window.CATALOG_SYNC_READY = Promise.all(CATALOG_SYNC_TARGETS.map(syncOneCatalog));
