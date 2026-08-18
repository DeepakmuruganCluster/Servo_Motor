/* Catalog Sync — pulls live component data from admin.clustervise.com and overwrites the
 * THK_BALLSCREW_DB / SIEMENS_DRIVE_DB / APEX_GEARBOX_DB / MOTOR_DB arrays IN PLACE (same array
 * objects the data/*.js files declared with const — calculations.js and the *-selection.js
 * modules hold no separate reference, they read these globals at call time, so mutating contents
 * here is enough; no reassignment needed, and none would be legal against a const binding anyway).
 *
 * Requires a read-only DRF endpoint at CATALOG_API_BASE (see project notes for the spec handed
 * off to admin.clustervise.com) returning:
 *   [{ model_number, series, manufacturer, sub_component, parameters: {...} }, ...]
 * filterable via ?sub_component=<name>, and CORS-enabled for this app's origin.
 *
 * CATALOG_API_KEY is intentionally blank until admin.clustervise.com issues a scoped, read-only
 * key — never put the Django admin login here, it's shipped to every visitor's browser. With no
 * key set, every sync attempt no-ops immediately and the app runs entirely on the data/*.js files
 * loaded before this script, exactly as it did before this file existed.
 */
const CATALOG_API_BASE = 'https://admin.clustervise.com/api/components/';
const CATALOG_API_KEY = '';

const CATALOG_SYNC_TIMEOUT_MS = 5000;

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
    const res = await fetch(url, {
      headers: { 'X-API-Key': CATALOG_API_KEY },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) throw new Error('empty response');

    const rows = items.map(catalogItemToRow);
    const db = target.db;
    db.length = 0;
    db.push(...rows);
    console.info(`[catalog-sync] ${target.subComponent}: loaded ${rows.length} rows from admin.clustervise.com`);
  } catch (err) {
    console.warn(`[catalog-sync] ${target.subComponent}: using bundled local data (${err.message})`);
  } finally {
    clearTimeout(timer);
  }
}

// Always resolves (never rejects) — callers just wait for sync attempts to settle, success or not.
window.CATALOG_SYNC_READY = CATALOG_API_KEY
  ? Promise.all(CATALOG_SYNC_TARGETS.map(syncOneCatalog))
  : Promise.resolve();
