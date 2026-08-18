/* Servo Sizing — UI, State, Rendering
 * Depends on: constants.js → calculations.js → this file (load in order)
 */

let state = {};
let selectedMotorIdx = -1;
let lastResult = null;
let inventoryItems = new Map(); // PN (uppercase) → device type (lowercase: 'motor'/'ballscrew'/'gearbox'/'drive', or '' meaning any type)
let lastExcelImportTrace = null;
let activeComponentTab = 'motor'; // which tab is open in the consolidated Component Selection card

// result.selectedMotor is captured by calculate() at the top of render(), before render()'s own
// motor auto-sync block runs — so on the render pass where a motor first gets auto-selected,
// result.selectedMotor is stale (null) even though selectedMotorIdx is already valid. Callers
// that run after the auto-sync block (i.e. everything except calculate() itself) should read the
// live selection through this helper instead of result.selectedMotor directly.
function getCurrentMotor(result) {
  return selectedMotorIdx >= 0 ? MOTOR_DB[selectedMotorIdx] : (result ? result.selectedMotor : null);
}

function saveState() {
  state.__stateVersion = STATE_VERSION;
  localStorage.setItem('servoState', JSON.stringify(state));
  localStorage.removeItem('titanServoState'); // remove legacy key
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function numberOrDefault(value, fallback) {
  const num = toFiniteNumber(value);
  return num === null ? fallback : num;
}

function loadState() {
  // try new key first, fall back to legacy key
  const raw = localStorage.getItem('servoState') || localStorage.getItem('titanServoState');
  if (!raw) {
    state = { ...DEFAULT_STATE };
    return;
  }
  try {
    const saved = JSON.parse(raw);
    state = { ...DEFAULT_STATE, ...saved };
    if ((saved.__stateVersion || 1) < STATE_VERSION) {
      if (state.gb_backlash === 7) state.gb_backlash = DEFAULT_STATE.gb_backlash;
      state.__stateVersion = STATE_VERSION;
    }
    if (!Array.isArray(state.steps) || state.steps.length === 0) {
      state.steps = [...DEFAULT_STATE.steps];
    }
  } catch {
    state = { ...DEFAULT_STATE };
  }
}

function loadInventoryFile(file) {
  if (!window.XLSX) { alert('SheetJS library not loaded.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      inventoryItems.clear();
      // skip header row if col A looks like a column label
      const firstCell = String(rows[0]?.[0] ?? '').trim();
      const startRow = /^(part.?num|pn|part|description|model|serial|item)/i.test(firstCell) ? 1 : 0;
      rows.slice(startRow).forEach(row => {
        const pn = String(row[0] ?? '').trim();
        if (!pn) return;
        const type = String(row[1] ?? '').trim().toLowerCase(); // blank = matches any device type (motor/ballscrew/gearbox/drive)
        inventoryItems.set(pn.toUpperCase(), type);
      });
      const el = document.getElementById('inventory-status');
      if (el) el.textContent = `${inventoryItems.size} item${inventoryItems.size !== 1 ? 's' : ''} loaded`;
      render();
    } catch (err) {
      const el = document.getElementById('inventory-status');
      if (el) el.textContent = 'Error reading file: ' + err.message;
    }
  };
  reader.readAsArrayBuffer(file);
}

function inInventory(pn, deviceType = 'motor') {
  if (!inventoryItems.size) return false;
  const key = String(pn || '').toUpperCase();
  if (!inventoryItems.has(key)) return false;
  const t = inventoryItems.get(key);
  return !t || t === deviceType.toLowerCase();
}


function getMotionProfileDisplayOptions() {
  const checked = id => document.getElementById(id)?.checked !== false;
  return {
    showAccel: checked('motion-phase-accel'),
    showConst: checked('motion-phase-const'),
    showDecel: checked('motion-phase-decel'),
    showDwell: checked('motion-phase-dwell'),
    showLabels: checked('motion-show-labels'),
  };
}

function downloadMotionStepsTemplate() {
  if (!window.XLSX) { alert('SheetJS library not loaded.'); return; }
  const headers = [
    'Motion step name', 'Stroke (mm)', 'Move time (s)', 'Acceleration time (s)',
    'Deceleration time (s)', 'Dwell time (s)', 'Additional force (N)',
    'Force direction', 'Movement direction', 'Payload mass (kg)'
  ];
  const exampleRows = (Array.isArray(state.steps) && state.steps.length)
    ? state.steps.map((s, i) => [
        s.label || `Step ${i + 1}`,
        s.stroke ?? 0, s.move_time ?? 1, s.acceleration_time ?? '',
        s.deceleration_time ?? '', s.dwell_time ?? 0.1,
        s.external_force ?? 0, s.external_force_dir || 'opposing',
        s.movement_dir || 'against gravity', s.load_mass ?? 0
      ])
    : [['Step 1', 15, 1.0, '', '', 0.1, 0, 'opposing', 'against gravity', 1.0]];

  const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: '2F75B5' } } };
  const inputStyle  = { fill: { patternType: 'solid', fgColor: { rgb: 'E2F0D9' } } };
  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  ws['!cols'] = headers.map(() => ({ wch: 22 }));
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
    if (cell) cell.s = headerStyle;
  });
  exampleRows.forEach((_, ri) => {
    headers.forEach((_, ci) => {
      const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
      if (cell) cell.s = inputStyle;
    });
  });
  const wb = { SheetNames: ['Motion Steps'], Sheets: { 'Motion Steps': ws } };
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'motion-steps-template.xlsx';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadExcelTemplate() {
  if (!window.XLSX) { alert('SheetJS library not loaded.'); return; }
  // ── SHEET 1: Parameters (all sections always included so every field is editable) ──
  const paramRows = [
    ['General',        'Station number',                              'Station identifier (e.g. OP10)',                  state.project_stn  || 'OP10'],
    ['General',        'Application name',                           'Application or process name',                     state.project_appl || 'App-1'],
    ['General',        'Payload inclination angle (deg)',             'θ_p — axis tilt from horizontal, 0–90°',          state.tilt_deg ?? 0],
    // LM Guide — always present
    ['LM Guide',       'LM Guide present',                           'Options: LM guide / Guide shaft with linear bushing', Number(state.has_lm_guide) === 2 ? 'Guide shaft with linear bushing' : 'LM guide'],
    ['LM Guide',       'Fixture mass (kg)',                          'Tooling plate + fixture mass (m_fix)',            state.guide_mass ?? 0],
    ['LM Guide',       'Mass per carriage block (kg)',               'Mass of each LM guide carriage block (m_gcb)',    state.guide_block_mass ?? 0.2],
    ['LM Guide',       'No. of carriage blocks',                     'Number of LM guide carriage blocks (n_gcb)',      state.guide_n_blocks ?? 1],
    ['LM Guide',       'Friction Force per block (N)',               'Friction force per carriage block',               state.guide_force ?? 0],
    // Counterbalance — always present; set "Counterbalance present" to enable
    ['Counterbalance', 'Counterbalance present',                     'Options: None / guide_shaft / pulley',            (state.has_counterbalance && state.has_counterbalance !== 0) ? String(state.has_counterbalance) : 'None'],
    ['Counterbalance', 'Counter balance Mass (kg)',                   'CB mass (m_cb)',                                  state.cb_mass ?? 0],
    ['Counterbalance', 'Counterbalance inclination angle (deg)',      'CB inclination angle (θ_cb), range 45–90°',       state.cb_angle_deg ?? 90],
    ['Counterbalance', 'Counterbalance guide friction coeff',         'CB guide friction coeff (μ_cbg), guide shaft only', state.cb_mu ?? 0],
    ['Counterbalance', 'Linear bush friction force (N)',             'Friction force per counterbalance bushing',       state.cb_bushing_friction_force ?? 0],
    ['Counterbalance', 'Number of linear bushings',                  'No. of counterbalance linear bushings',           state.cb_n_bushings ?? 0],
    // Ball Screw — always present
    ['Ball Screw',     'BS lead (mm/rev)',                           'Ball screw lead per revolution',                  state.bs_pitch ?? 2],
    ['Ball Screw',     'BS diameter (mm)',                           'Ball screw shaft diameter',                       state.bs_dia ?? 6],
    ['Ball Screw',     'BS length (mm)',                             'Ball screw shaft length',                         state.bs_length ?? 500],
    ['Ball Screw',     'BS material',                                'Options: steel / stainless / aluminum',           state.bs_material ?? 'steel'],
    ['Ball Screw',     'BS efficiency (0-1)',                        'Ball screw mechanical efficiency',                state.bs_efficiency ?? 0.98],
    ['Ball Screw',     'Ballscrew nut & housing mass (kg)',          'Ball screw nut and housing mass from catalog (m_bsn)', state.bs_nut_mass ?? 0.052],
    ['Ball Screw',     'BS preload torque (Nm)',                     'Preload torque from catalog',                     state.bs_preload_torque ?? 0],
    ['Ball Screw',     'No. of fixed side support blocks',          'Fixed-end bearing support blocks',                state.bs_n_fixed_blocks ?? 1],
    ['Ball Screw',     'Fixed side drag torque per block (Nm)',     'Drag torque per fixed-side block from catalog',   state.bs_fixed_drag_axial ?? 0],
    ['Ball Screw',     'No. of support side support blocks',        'Floating-end bearing support blocks',             state.bs_n_support_blocks ?? 1],
    ['Ball Screw',     'Support side drag torque per block (Nm)',   'Drag torque per support-side block from catalog', state.bs_support_drag_axial ?? 0],
    ['Ball Screw',     'Max permitted speed (rpm)',                  'Max allowable ball screw rotational speed',       state.bs_max_speed ?? 0],
    ['Ball Screw',     'Max permitted torque (Nm)',                  'Max allowable input torque at ball screw',        state.bs_max_torque ?? 0],
    ['Ball Screw',     'Position accuracy (+/- um)',                 'Ball screw positional accuracy',                  state.bs_repetition_accuracy ?? 0],
    // Parallel Kit — always present; set "Parallel Kit needed" to Yes to enable
    ['Parallel Kit',   'Parallel Kit needed',                        'Options: Yes / No',                               Number(state.has_parallel_kit) ? 'Yes' : 'No'],
    ['Parallel Kit',   'PK ratio',                                   'Parallel kit gear ratio',                         state.pk_ratio ?? 1],
    ['Parallel Kit',   'PK no-load torque (Nm)',                     'Parallel kit no-load running torque',             state.pk_no_load_torque ?? 0],
    ['Parallel Kit',   'PK inertia (kg.m2)',                         'Parallel kit moment of inertia',                  state.pk_inertia ?? 0],
    ['Parallel Kit',   'PK max torque (Nm)',                         'Parallel kit max transferable torque',             state.pk_max_torque ?? 0],
    ['Parallel Kit',   'PK max speed (rpm)',                         'Parallel kit max input speed',                    state.pk_max_speed ?? 0],
    // Gearbox — always present; set "Gearbox needed" to Yes to enable
    ['Gearbox',        'Gearbox needed',                             'Options: Yes / No',                               Number(state.has_gearbox) ? 'Yes' : 'No'],
    ['Gearbox',        'GB ratio',                                   'Gearbox ratio',                                   state.gb_ratio ?? 1],
    ['Gearbox',        'GB efficiency (0-1)',                        'Gearbox mechanical efficiency',                   state.gb_efficiency ?? 0.97],
    ['Gearbox',        'GB no-load torque (Nm)',                     'Gearbox no-load running torque',                  state.gb_no_load_torque ?? 0],
    ['Gearbox',        'GB inertia (kg.m2)',                         'Gearbox reflected inertia',                       state.gb_inertia ?? 0],
    ['Gearbox',        'GB backlash (arcmin)',                       'Gearbox backlash',                                state.gb_backlash ?? 0],
    // Operating Conditions — always present
    ['Operating Conditions', 'Safety factor (%)',                    'Design safety factor',                            state.safety_factor ?? 20],
    ['Operating Conditions', 'Cycle time (s)',                       'Total machine cycle time',                        state.project_total_cycle ?? 7],
    ['Operating Conditions', 'Axis on-time per cycle (s)',           'Servo operating time per cycle',                  state.project_operating_time ?? 2.6],
    ['Operating Conditions', 'Shifts per day',                       'Number of shifts per day',                        state.project_shifts ?? 3],
    ['Operating Conditions', 'Hours per shift',                      'Working hours per shift',                         state.project_hours_shift ?? 7],
    ['Operating Conditions', 'Days per week',                        'Working days per week',                           state.project_days_week ?? 6],
    ['Operating Conditions', 'Service life (yrs)',                   'Required machine service life',                   state.project_service_life ?? 10],
    ['Operating Conditions', 'Accuracy required (um)',               'Required positioning accuracy',                   state.project_accuracy ?? 20],
  ];

  const paramData = [
    ['Servo Sizing — Parameters', '', '', ''],
    ['', '', '', ''],
    ['Group', 'Parameter', 'Notes', 'Value'],
    ...paramRows,
  ];
  const wsP = XLSX.utils.aoa_to_sheet(paramData);
  wsP['!cols'] = [{ wch: 20 }, { wch: 44 }, { wch: 46 }, { wch: 18 }];

  const titleStyle  = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 }, fill: { patternType: 'solid', fgColor: { rgb: '1F3864' } }, alignment: { horizontal: 'center' } };
  const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: '2F75B5' } } };
  const paramStyle  = { font: { color: { rgb: '1a1a1a' } }, fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } } };
  const noteStyle   = { font: { italic: true, color: { rgb: '595959' } }, fill: { patternType: 'solid', fgColor: { rgb: 'F2F2F2' } } };
  const inputStyle  = { fill: { patternType: 'solid', fgColor: { rgb: 'E2F0D9' } } };

  const GROUP_COLOURS = {
    'General':              { bg: 'D6DCE4', fg: '1F3864' },
    'LM Guide':             { bg: 'E2EFDA', fg: '375623' },
    'Counterbalance':       { bg: 'FCE4D6', fg: '7B2C14' },
    'Ball Screw':           { bg: 'FFF2CC', fg: '7D5700' },
    'Parallel Kit':         { bg: 'EAD1DC', fg: '6B1F3E' },
    'Gearbox':              { bg: 'D9D9D9', fg: '333333' },
    'Operating Conditions': { bg: 'D6E4BC', fg: '375623' },
  };

  ['A1','B1','C1','D1'].forEach(c => { if (wsP[c]) wsP[c].s = titleStyle; });
  ['A3','B3','C3','D3'].forEach(c => { if (wsP[c]) wsP[c].s = headerStyle; });
  paramData.forEach((row, i) => {
    if (i < 3 || !row[1]) return;
    const r = i + 1;
    const pal = GROUP_COLOURS[row[0]] || { bg: 'D9E1F2', fg: '1F3864' };
    const grpStyle = { font: { bold: true, color: { rgb: pal.fg } }, fill: { patternType: 'solid', fgColor: { rgb: pal.bg } }, alignment: { horizontal: 'center', wrapText: true } };
    if (wsP[`A${r}`]) wsP[`A${r}`].s = grpStyle;
    if (wsP[`B${r}`]) wsP[`B${r}`].s = paramStyle;
    if (wsP[`C${r}`]) wsP[`C${r}`].s = noteStyle;
    if (wsP[`D${r}`]) wsP[`D${r}`].s = inputStyle;
  });

  // ── SHEET 2: Motion Steps (all steps, column format) ──
  const stepHeaders = [
    'Motion step name', 'Stroke (mm)', 'Move time (s)', 'Acceleration time (s)',
    'Deceleration time (s)', 'Dwell time (s)', 'Additional force (N)',
    'Force direction', 'Movement direction', 'Payload mass (kg)',
  ];
  const stepHdrStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: '2F75B5' } } };
  const stepInputStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'E2F0D9' } } };
  const steps = (Array.isArray(state.steps) && state.steps.length) ? state.steps : DEFAULT_STATE.steps;
  const stepDataRows = steps.map((s, i) => [
    s.label || `Step ${i + 1}`,
    s.stroke ?? 0, s.move_time ?? 1,
    s.acceleration_time ?? '', s.deceleration_time ?? '',
    s.dwell_time ?? 0, s.external_force ?? 0,
    s.external_force_dir || 'opposing',
    (s.movement_dir || 'against_gravity').replace('_', ' '),
    s.load_mass ?? 0,
  ]);
  const wsS = XLSX.utils.aoa_to_sheet([stepHeaders, ...stepDataRows]);
  wsS['!cols'] = stepHeaders.map(() => ({ wch: 22 }));
  stepHeaders.forEach((_, ci) => {
    const cell = wsS[XLSX.utils.encode_cell({ r: 0, c: ci })];
    if (cell) cell.s = stepHdrStyle;
  });
  stepDataRows.forEach((_, ri) => {
    stepHeaders.forEach((_, ci) => {
      const cell = wsS[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
      if (cell) cell.s = stepInputStyle;
    });
  });

  const wb = { SheetNames: ['Parameters', 'Motion Steps'], Sheets: { 'Parameters': wsP, 'Motion Steps': wsS } };
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'input-template.xlsx';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function formatNumber(value, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function formatInteger(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value).toLocaleString() : '—';
}

function toPercent(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—';
}





function renderMetric(id, value, digits = 2, unit = '') {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(digits)}${unit}` : '—';
}

/* Dependency cascade for manual component locks. The auto-sync pipeline in render() always runs
   Motor → Ball Screw → Gearbox → Drive in that order, because each stage's requirements depend
   on the ones before it. Locking a stage in manually (motor_user_selected / bs_user_selected /
   gb_ratio_user_selected / sd_user_selected) stops render()'s auto-sync from touching IT, but
   without this, everything AFTER it in the pipeline would also stay frozen at whatever it was
   last synced to — silently going stale (e.g. a ball screw locked in for one motor, unaware the
   designer later picked a different motor). Unlocking downstream stages when an upstream one is
   manually changed lets them immediately re-suggest the best fit again, matching the auto-sync
   pipeline's own one-directional dependency order (never unlocks upstream — picking a ball screw
   deliberately must not silently undo an already-chosen motor). */
function unlockDownstreamOfMotor() {
  state.bs_user_selected = false;
  state.gb_ratio_user_selected = false;
  state.sd_user_selected = false;
}
function unlockDownstreamOfBallScrew() {
  state.gb_ratio_user_selected = false;
  state.sd_user_selected = false;
}
function unlockDownstreamOfGearbox() {
  state.sd_user_selected = false;
}

/* Single entry point for "the designer manually picked this motor" — used by the Motor Catalog
   row click and the "Use Recommended" button, so the downstream-unlock cascade only needs to
   live in one place. */
function selectMotorManually(idx) {
  selectedMotorIdx = idx;
  state.motor_user_selected = true;
  unlockDownstreamOfMotor();
  saveState();
  saveMotorSelection();
  render();
}

function render() {
  let result = calculate();
  lastResult = result;
  updateMechanicalVisibility();

  // Auto-sync motor selection to recommendation on first entry.
  // Designers can later override manually (motor_user_selected = true).
  const _curMotor = selectedMotorIdx >= 0 ? MOTOR_DB[selectedMotorIdx] : null;
  const _needsBrakeCheck = Number(state.tilt_deg) !== 0;
  const _curViable = _curMotor && (() => {
    const Jr = _curMotor.Jmot * 1e-4;
    return result.Nmotor <= _curMotor.Nn
        && result.T_peak_motor <= _curMotor.Mn
        && (result.I_motor + Jr) / Jr <= state.sm_permitted_inertia_ratio
        && (!_needsBrakeCheck || _curMotor.brake);
  })();
  if (!state.motor_user_selected) {
    const best = suggestBestMotor(result);
    if (best && best.viable && selectedMotorIdx !== best.index) {
      selectedMotorIdx = best.index;
      saveMotorSelection();
    }
  } else if (!_curViable && selectedMotorIdx < 0) {
    const best = suggestBestMotor(result);
    if (best && best.viable) {
      selectedMotorIdx = best.index;
      saveMotorSelection();
    }
  }

  // calculate() computes motor-dependent fields (inertia_ratio) from whatever selectedMotorIdx
  // was at the top of this function — if auto-sync just changed it, result is stale for those
  // fields specifically (Nmotor/T_peak_motor/T_peak_bs etc. don't depend on the motor, so they're
  // fine either way). Recompute once so everything downstream sees the synced motor.
  if (result.selectedMotor !== (selectedMotorIdx >= 0 ? MOTOR_DB[selectedMotorIdx] : null)) {
    result = calculate();
    lastResult = result;
  }

  // Auto-sync ball screw / gearbox / servo drive to their top catalog recommendation, same
  // pattern as the motor auto-sync above: runs every render until the designer explicitly
  // overrides a pick (bs_user_selected / gb_ratio_user_selected / sd_user_selected), either via
  // "Use this X" or by editing the Ball Screw / Gearbox Inputs panels directly. Field updates are
  // targeted (not a full renderInputs() sweep) so they don't clobber an input the designer is
  // actively typing in. Persisted via saveState() so the picks survive a page reload or
  // navigating away and back (e.g. "Save & Return to Project" reads localStorage, not just the
  // live in-memory state).
  //
  // Uses applyBallScrewFields()/applyGearboxFields() (not a hand-copy of fields off the
  // evaluate()-returned candidate) because that candidate only carries pn/series/dia/lead —
  // fields like eff/preload_Nm and the gearbox's rated input speed/output torque live on the RAW
  // catalog entry, which those functions look up correctly. A prior version copied fields
  // directly off the candidate and silently wrote bs_efficiency/gb_rated_input_speed etc. as
  // undefined.
  function syncInputEl(key) {
    const el = document.querySelector(`[data-key="${key}"]`);
    if (el && document.activeElement !== el) el.value = state[key];
  }
  let autoSyncChanged = false;
  if (!state.bs_user_selected && typeof selectBallScrew === 'function' && typeof applyBallScrewFields === 'function') {
    const bsOut = selectBallScrew({ baseResult: result });
    const bsTop = bsOut.recommended && bsOut.recommended[0];
    if (bsTop) {
      const bsApplied = Math.abs(Number(state.bs_pitch) - bsTop.lead) < 1e-6 && Math.abs(Number(state.bs_dia) - bsTop.dia) < 1e-6;
      if (!bsApplied && applyBallScrewFields(bsTop.pn)) {
        ['bs_pitch', 'bs_dia', 'bs_efficiency', 'bs_preload_torque', 'bs_length'].forEach(syncInputEl);
        result = calculate();
        lastResult = result;
        autoSyncChanged = true;
      }
    }
  }
  if (Number(state.has_gearbox) !== 0 && !state.gb_ratio_user_selected && typeof selectGearbox === 'function' && typeof applyGearboxFields === 'function') {
    const gbOut = selectGearbox({ baseResult: result });
    const gbTop = gbOut.recommended && gbOut.recommended[0];
    if (gbTop) {
      const gbApplied = Math.abs(Number(state.gb_ratio) - gbTop.ratio) < 1e-6 && String(state.gb_backlash) === String(gbTop.backlash_arcmin);
      if (!gbApplied && applyGearboxFields(gbTop.pn)) {
        ['gb_ratio', 'gb_efficiency', 'gb_no_load_torque', 'gb_inertia', 'gb_backlash', 'gb_rated_input_speed', 'gb_rated_output_torque'].forEach(syncInputEl);
        result = calculate();
        lastResult = result;
        autoSyncChanged = true;
      }
    }
  }
  if (!state.sd_user_selected && typeof selectDrive === 'function') {
    const sdOut = selectDrive({ baseResult: result });
    const sdTop = sdOut.recommended && sdOut.recommended[0];
    if (sdTop && state.sd_applied_pn !== sdTop.pn) {
      state.sd_applied_pn = sdTop.pn;
      autoSyncChanged = true;
    }
  }
  if (autoSyncChanged && typeof saveState === 'function') saveState();

  // THK ball screw / Apex gearbox recommendations — after motor auto-sync so selectedMotorIdx is current.
  if (typeof renderBallScrewSelection === 'function') {
    try { renderBallScrewSelection('bs_selection_results'); }
    catch (e) { console.warn('Ball screw selection failed:', e); }
  }
  if (typeof renderGearboxSelection === 'function' && Number(state.has_gearbox) !== 0) {
    try { renderGearboxSelection('gb_selection_results'); }
    catch (e) { console.warn('Gearbox selection failed:', e); }
  } else {
    const gbEl = document.getElementById('gb_selection_results');
    if (gbEl) gbEl.innerHTML = '';
  }
  if (typeof renderDriveSelection === 'function') {
    try { renderDriveSelection('sd_selection_results'); }
    catch (e) { console.warn('Drive selection failed:', e); }
  }

  renderProjectSummary();

  // Calculated BS inertia (Jrm) display
  const jrmEl = document.getElementById('out_bs_jrm');
  if (jrmEl) {
    const rho = { steel: 7870, stainless: 7930, aluminum: 2700 }[state.bs_material] || 7870;
    const Jrm_disp = (Math.PI / 32) * rho * (state.bs_length / 1000) * Math.pow(state.bs_dia / 1000, 4);
    jrmEl.value = Jrm_disp.toExponential(4);
  }

  // Ball screw shaft
  renderMetric('out_tpeak_bs',       result.T_peak_bs,       3, '');
  renderMetric('out_nscrew',         Math.round(result.Nscrew), 0, '');
  renderMetric('out_vmax',           result.Vmax_mm_s,       1, '');
  renderMetric('out_t_accel',        result.T_accel,         3, ' Nm');
  renderMetric('out_t_decel',        result.T_decel,         3, ' Nm');
  renderMetric('out_t_total_accel',    result.T_total_accel,    3, ' Nm');
  renderMetric('out_t_total_topspeed', result.T_total_topspeed, 3, ' Nm');
  renderMetric('out_t_total_decel',    result.T_total_decel,    3, ' Nm');
  // Torque breakdown
  renderMetric('out_t_axial',        result.T_axial_force,   4, ' Nm');
  renderMetric('out_t_preload',      result.T_preload,       4, ' Nm');
  renderMetric('out_t_bearing_drag', result.T_bearing_drag,  4, ' Nm');

  // Motor shaft
  renderMetric('out_tpeak_motor', result.T_peak_motor,    3, '');
  renderMetric('out_nmotor',      Math.round(result.Nmotor), 0, '');
  renderMetric('out_trms',        result.T_rms_motor,     3, '');
  renderMetric('out_inertia',     result.I_motor * 1e6,   3, '');
  const irEl = document.getElementById('out_inertia_ratio');
  if (irEl) irEl.textContent = result.inertia_ratio !== null ? result.inertia_ratio.toFixed(2) : '—';

  renderMotorTable(result);
  renderBestMotorSuggestion(result);
  renderVerification(result);
  renderSelectedMotorDetails(result);
  renderSelectedComponentsSummary(result);
  renderComponentTabStatus(result);
  renderMotionProfileChart();
  if (document.getElementById('show-torque-chart')?.checked)       renderTorqueChart();
  if (document.getElementById('show-displacement-chart')?.checked) renderDisplacementChart();

  // Wire download button each render (result changes)
  const dlBtn = document.getElementById('download-report-btn');
  if (dlBtn) { dlBtn.onclick = () => downloadReport(result); }

  // Keep the Projects store in sync with the live motor/ball screw/gearbox/drive picks whenever
  // this session is editing a project application — don't rely solely on the "Save & Return to
  // Project" button, since navigating away any other way (browser back, closing the tab) would
  // otherwise leave the project card showing stale/missing data.
  const _projCtx = (typeof Projects !== 'undefined') ? Projects.getContext() : null;
  if (_projCtx) persistServoToProject(_projCtx);
}

function renderProjectSummary() {
  const summary = document.getElementById('project-summary');
  if (!summary) return;

  const cycleHours = state.project_total_cycle;
  const hoursPerWeek = state.project_shifts * state.project_hours_shift * state.project_days_week;
  const annualCycles = hoursPerWeek > 0 ? (hoursPerWeek * 52) / cycleHours : 0;
  const stnHtml  = state.project_stn  ? `<div class="summary-card"><span>Station number</span><strong>${state.project_stn}</strong></div>`  : '';
  const applHtml = state.project_appl ? `<div class="summary-card"><span>Application name</span><strong>${state.project_appl}</strong></div>` : '';
  summary.innerHTML = `
    <div class="summary-grid">
      ${stnHtml}${applHtml}
      <div class="summary-card"><span>Motion steps</span><strong>${state.steps.length}</strong></div>
      <div class="summary-card"><span>Operating hours/week</span><strong>${formatNumber(hoursPerWeek, 1)} h</strong></div>
      <div class="summary-card"><span>Cycle time</span><strong>${formatNumber(cycleHours, 1)} s</strong></div>
      <div class="summary-card"><span>Estimated cycles/year</span><strong>${formatInteger(annualCycles)}</strong></div>
      <div class="summary-card"><span>Movement accuracy</span><strong>${formatNumber(state.project_accuracy, 0)} µm</strong></div>
    </div>
  `;
}

function renderMotorTable(result) {
  const tbody = document.getElementById('motor-table-body');
  if (!tbody) return;

  const needsBrakeTable = Number(state.tilt_deg) !== 0;

  // Score all motors using same logic as suggestBestMotor: lowest kW first, then lowest utilization
  const scored = MOTOR_DB.map((motor, index) => {
    const J_rotor    = motor.Jmot * 1e-4;
    const speedUtil  = result.Nmotor / motor.Nn;
    const torqueUtil = result.T_peak_motor / motor.Mn;
    const inertiaUtil= (result.I_motor + J_rotor) / J_rotor / state.sm_permitted_inertia_ratio;
    const speedOk    = speedUtil <= 1;
    const torqueOk   = torqueUtil <= 1;
    const inertiaOk  = inertiaUtil <= 1;
    const brakeOk    = !needsBrakeTable || motor.brake;
    const viable     = speedOk && torqueOk && inertiaOk && brakeOk;
    const score      = motor.kW * 1000 + (torqueUtil + speedUtil + inertiaUtil);
    return { motor, index, viable, score, speedUtil, torqueUtil, inertiaUtil };
  });

  const passMotors = scored.filter(m => m.viable).sort((a, b) => a.score - b.score);

  if (passMotors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:16px;color:var(--muted)">No motor in catalog meets the current requirements.</td></tr>`;
    return;
  }

  const best = passMotors[0];
  const rows = passMotors.map(({ motor, index, speedUtil, torqueUtil, inertiaUtil }, rank) => {
    const isSelected = index === selectedMotorIdx;
    const isRecommended = best ? index === best.index : false;
    const rowClass = `${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`.trim();
    const inStock = inInventory(motor.pn);
    const statusBits = [
      isRecommended ? '<span class="badge badge-recommended">Recommended</span>' : '',
      isSelected    ? '<span class="badge badge-selected">Selected</span>'       : '',
      inStock       ? '<span class="badge badge-stock" title="In your inventory">✓ In Stock</span>' : '',
    ].filter(Boolean).join(' ');
    return `
      <tr class="${rowClass}" data-index="${index}" style="cursor:pointer">
        <td class="mono" style="font-weight:700">${rank + 1}</td>
        <td class="mono">${motor.pn}${statusBits ? ` ${statusBits}` : ''}</td>
        <td>${motor.series}</td>
        <td class="mono">${motor.kW.toFixed(3)}</td>
        <td class="mono">${motor.Mn.toFixed(2)}</td>
        <td class="mono">${motor.Mmax.toFixed(2)}</td>
        <td class="mono">${motor.Nn}</td>
        <td class="mono">${motor.Jmot.toFixed(3)}</td>
        <td>${motor.brake ? 'Yes' : 'No'}</td>
        <td style="font-size:11px;line-height:1.6">
          N:${(speedUtil*100).toFixed(0)}% T:${(torqueUtil*100).toFixed(0)}% J:${(inertiaUtil*100).toFixed(0)}%
        </td>
        <td style="white-space:nowrap" onclick="event.stopPropagation()">
          <a href="cad/SIEMENS_AG_${motor.pn.replace(/-/g, '')}.zip" download style="font-size:12px;text-decoration:none">&#8681; CAD</a>
        </td>
      </tr>`;
  }).join('');

  tbody.innerHTML = rows;
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      selectMotorManually(Number(row.dataset.index));
    });
  });
}

function renderSelectedMotorDetails(result) {
  const details = document.getElementById('selected-motor-details');
  if (!details) return;
  const motor = getCurrentMotor(result);
  if (!motor) {
    details.innerHTML = '<p class="info-box">Select a motor from the catalog to verify speed, torque and inertia ratio.</p>';
    return;
  }

  const inertiaRatio = result.inertia_ratio !== null ? result.inertia_ratio.toFixed(2) : '—';
  const speedUtil = result.Nmotor / motor.Nn * 100;
  const torqueUtil = result.T_peak_motor / motor.Mn * 100;
  const inertiaUtil = result.inertia_ratio !== null ? result.inertia_ratio / state.sm_permitted_inertia_ratio * 100 : 0;

  const otherComponents = (typeof getSelectedComponentsSummary === 'function')
    ? getSelectedComponentsSummary(result).filter(r => r.component !== 'Servo Motor')
    : [];
  const componentCards = otherComponents.map(r => `
      <div class="metric-card small">
        <span>${r.component}${r.pn ? '' : ' — ' + r.status}</span>
        <strong>${r.pn || '—'}</strong>
        ${r.pn ? `<div style="font-size:12px;color:var(--muted);margin-top:6px;">${r.specs || ''}</div>` : ''}
      </div>`).join('');

  details.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card"><span>Selected Motor</span><strong>${motor.pn}</strong></div>
      <div class="metric-card"><span>Rated Torque Mn</span><strong>${motor.Mn.toFixed(2)} Nm</strong></div>
      <div class="metric-card"><span>Peak Torque Mmax</span><strong>${motor.Mmax.toFixed(2)} Nm</strong></div>
      <div class="metric-card"><span>Rated Speed Nn</span><strong>${motor.Nn} rpm</strong></div>
      <div class="metric-card"><span>Brake</span><strong>${motor.brake ? 'Yes' : 'No'}</strong></div>
    </div>
    <div class="section-block">
      <table class="checklist">
        <tr><th>Parameter</th><th>Actual</th><th>Capacity</th><th>Utilisation</th></tr>
        <tr><td>Motor speed</td><td class="mono">${Math.round(result.Nmotor)} rpm</td><td class="mono">${motor.Nn} rpm</td><td class="mono">${speedUtil.toFixed(0)}%</td></tr>
        <tr><td>Torque (Mn)</td><td class="mono">${result.T_peak_motor.toFixed(3)} Nm</td><td class="mono">${motor.Mn.toFixed(2)} Nm</td><td class="mono">${torqueUtil.toFixed(0)}%</td></tr>
        <tr><td>Inertia ratio</td><td class="mono">${inertiaRatio}</td><td class="mono">${state.sm_permitted_inertia_ratio}</td><td class="mono">${result.inertia_ratio !== null ? `${Math.round(inertiaUtil)}%` : '—'}</td></tr>
      </table>
    </div>
    <div class="section-block" style="margin-top:10px">
      <a href="cad/SIEMENS_AG_${motor.pn.replace(/-/g, '')}.zip"
         download
         class="btn btn-secondary"
         style="display:inline-block;text-decoration:none">
        &#8681; Download CAD Files (Inventor)
      </a>
    </div>
    ${componentCards ? `
    <div class="subsection-divider"><h4 class="subsection-heading">Rest of the Drivetrain</h4></div>
    <div class="metric-grid" style="grid-template-columns:repeat(3, minmax(0, 1fr));">
      ${componentCards}
    </div>` : ''}`;
}

/* Calculate total system accuracy — exact Excel formula (calc C208) */
function calculateSystemAccuracy() {
  const bs_acc   = numberOrDefault(state.bs_repetition_accuracy, 10); // micron (calc C198)
  const gb_deg   = numberOrDefault(state.gb_backlash, 0) / 60;         // arcmin → degrees
  const motor_mm = state.bs_pitch / (state.sm_encoder_ppr || 1048576); // mm/pulse (calc C205)
  const motor_acc = motor_mm / 2 * 1000; // micron (calc C206)
  const gb_acc   = (gb_deg / 360 * state.bs_pitch) / 2 * 1000; // micron (calc C203)
  return bs_acc + gb_acc + motor_acc; // calc C208 — linear sum
}

function renderVerification(result) {
  const tbody = document.getElementById('verification-body');
  if (!tbody) return;
  const motor = getCurrentMotor(result);

  function fmtUtil(util) {
    if (util === null || util === undefined || !isFinite(util)) return '#DIV/0!';
    return (util * 100).toFixed(0) + '%';
  }
  function fmtResult(util, resultText) {
    if (util === null || !isFinite(util)) return '#DIV/0!';
    return resultText;
  }
  function resultClass(res) {
    if (res === 'OK') return 'badge-ok';
    if (res === 'NOK') return 'badge-fail';
    if (res === '#DIV/0!') return 'badge-warn';
    return 'badge-warn'; // Check Duty cycle, Wish list etc.
  }

  const sysAccuracy = calculateSystemAccuracy();

  // Only rows marked BLUE in Excel Checklist sheet (fill FFC9DAF8)
  const rows = [
    // ── Motor Parameters ──
    {
      section: 'Motor Parameters',
      param: 'Motor Rated Speed Nn, rpm',
      capacity: motor ? String(motor.Nn) : '—',
      actual: String(Math.round(result.Nmotor)),
      util: motor ? result.Nmotor / motor.Nn : null,
      result: motor ? (result.Nmotor <= motor.Nn ? 'OK' : 'NOK') : '—',
      remark: '',
    },
    {
      section: '',
      param: 'Motor Rated Torque Mn, Nm',
      capacity: motor ? motor.Mn.toFixed(2) : '—',
      actual: result.T_peak_motor.toFixed(2),
      util: motor ? result.T_peak_motor / motor.Mn : null,
      result: motor ? (result.T_peak_motor <= motor.Mn ? 'OK' : 'Check Duty cycle') : '—',
      remark: '',
    },
    {
      section: '',
      param: 'Motor Inertia Ratio',
      capacity: String(state.sm_permitted_inertia_ratio),
      actual: result.inertia_ratio !== null ? result.inertia_ratio.toFixed(2) : '—',
      util: result.inertia_ratio !== null ? result.inertia_ratio / state.sm_permitted_inertia_ratio : null,
      result: result.inertia_ratio !== null ? (result.inertia_ratio <= state.sm_permitted_inertia_ratio ? 'OK' : 'NOK') : '—',
      remark: '',
    },
    // ── Ball screw ──
    {
      section: 'Ball screw',
      param: 'Ball screw max speed, rpm',
      capacity: String(Math.round(state.bs_max_speed)),
      actual: String(Math.round(result.Nscrew)),
      util: state.bs_max_speed > 0 ? result.Nscrew / state.bs_max_speed : null,
      result: result.Nscrew <= state.bs_max_speed ? 'OK' : 'NOK',
      remark: 'Wish list',
    },
    {
      section: '',
      param: 'Ball screw max torque',
      capacity: String(state.bs_max_torque.toFixed(2)),
      actual: result.T_peak_bs.toFixed(2),
      util: state.bs_max_torque > 0 ? result.T_peak_bs / state.bs_max_torque : null,
      result: result.T_peak_bs <= state.bs_max_torque ? 'OK' : 'NOK',
      remark: 'Wish list',
    },
    // ── Accuracy ──
    {
      section: '',
      param: 'Movement accuracy of the system, (+/-) micron',
      capacity: sysAccuracy.toFixed(2),
      actual: String(state.project_accuracy),
      util: state.project_accuracy > 0 ? sysAccuracy / state.project_accuracy : null,
      result: sysAccuracy <= state.project_accuracy ? 'OK' : 'NOK',
      remark: '',
    },
  ];

  if (Number(state.has_gearbox) !== 0) {
    rows.splice(3, 0,
      {
        section: 'Gearbox',
        param: 'GearBox Input speed, rpm',
        capacity: state.gb_rated_input_speed > 0 ? String(Math.round(state.gb_rated_input_speed)) : '—',
        actual: String(Math.round(result.Nmotor)),
        util: state.gb_rated_input_speed > 0 ? result.Nmotor / state.gb_rated_input_speed : null,
        result: state.gb_rated_input_speed > 0 ? (result.Nmotor <= state.gb_rated_input_speed ? 'OK' : 'NOK') : '#DIV/0!',
        remark: '',
      },
      {
        section: '',
        param: 'GearBox Output Torque, Nm',
        capacity: state.gb_rated_output_torque > 0 ? String(state.gb_rated_output_torque.toFixed(2)) : '—',
        actual: result.T_peak_bs.toFixed(2),
        util: state.gb_rated_output_torque > 0 ? result.T_peak_bs / state.gb_rated_output_torque : null,
        result: state.gb_rated_output_torque > 0 ? (result.T_peak_bs <= state.gb_rated_output_torque ? 'OK' : 'NOK') : '#DIV/0!',
        remark: '',
      }
    );
  }

  tbody.innerHTML = rows.map(row => {
    const utilStr    = fmtUtil(row.util);
    const resStr     = fmtResult(row.util, row.result);
    const cls        = resultClass(resStr);
    const sectionHdr = row.section
      ? `<span style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin-bottom:2px;">${row.section}</span>`
      : '';
    return `
      <tr>
        <td>${sectionHdr}${row.param}</td>
        <td class="mono">${row.capacity}</td>
        <td class="mono">${row.actual}</td>
        <td class="mono">${utilStr}</td>
        <td><span class="badge ${cls}">${resStr}</span></td>
      </tr>`;
  }).join('');
}

/* Shared by the on-page summary card and the PDF report — one place that answers
   "what's actually configured right now" across all four selectable components. */
function getSelectedComponentsSummary(result) {
  const motor = getCurrentMotor(result);
  const ballScrew = (typeof getAppliedBallScrew === 'function') ? getAppliedBallScrew() : null;
  const gearbox = (typeof getAppliedGearbox === 'function') ? getAppliedGearbox() : null;
  const drive = (typeof getRecommendedDrive === 'function') ? getRecommendedDrive() : null;
  const driveApplied = (typeof getAppliedDrive === 'function') ? !!getAppliedDrive() : false;
  const hasGearbox = Number(state.has_gearbox) !== 0;

  return [
    {
      component: 'Servo Motor',
      pn: motor ? motor.pn : null,
      specs: motor
        ? `${motor.kW.toFixed(2)} kW · Mn ${motor.Mn.toFixed(2)} Nm · Mmax ${motor.Mmax.toFixed(2)} Nm · Nn ${motor.Nn} rpm${motor.brake ? ' · Brake' : ''}`
        : null,
      status: motor ? 'Selected' : 'Not selected',
    },
    {
      component: 'Ball Screw',
      pn: ballScrew ? ballScrew.pn : null,
      specs: ballScrew
        ? `Ø${ballScrew.dia} / lead ${ballScrew.lead} mm · Ca ${ballScrew.Ca} N · C0a ${ballScrew.C0a} N`
        : `Ø${state.bs_dia} / lead ${state.bs_pitch} mm — manually configured, not matched to a catalog part`,
      status: ballScrew ? 'Applied from catalog' : 'Manual / custom',
    },
    {
      component: 'Gearbox',
      pn: gearbox ? gearbox.pn : null,
      specs: gearbox
        ? `${gearbox.series} · ${gearbox.ratio}:1 · ${gearbox.rated_torque_Nm} Nm rated`
        : (hasGearbox ? `${state.gb_ratio}:1 — manually configured, not matched to a catalog part` : 'Direct drive (no gearbox)'),
      status: gearbox ? 'Applied from catalog' : (hasGearbox ? 'Manual / custom' : 'Not used'),
    },
    {
      component: 'Servo Drive',
      pn: drive ? drive.pn : null,
      specs: drive
        ? `${drive.series} · ${drive.rated_power_kW.toFixed(2)} kW · ${drive.rated_current_A}A rated / ${drive.max_current_A}A peak`
        : null,
      status: drive ? (driveApplied ? 'Applied from catalog' : 'Recommended') : (motor ? 'No match found' : 'Select a motor first'),
    },
  ];
}

function renderSelectedComponentsSummary(result) {
  const container = document.getElementById('selected-components-summary');
  if (!container) return;
  const rows = getSelectedComponentsSummary(result);
  function badgeClass(status) {
    return (status === 'Selected' || status === 'Applied from catalog' || status === 'Recommended') ? 'badge-ok' : 'badge-warn';
  }
  container.innerHTML = `
    <table class="checklist">
      <thead><tr><th>Component</th><th>Part No.</th><th>Specification</th><th>Status</th></tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.component}</td>
            <td class="mono">${r.pn || '—'}</td>
            <td class="mono">${r.specs || '—'}</td>
            <td><span class="badge ${badgeClass(r.status)}">${r.status}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderBestMotorSuggestion(result) {
  const container = document.getElementById('motor-best-suggestion');
  if (!container) return;

  const best = suggestBestMotor(result);
  const selected = selectedMotorIdx >= 0 ? MOTOR_DB[selectedMotorIdx] : null;
  if (!best) {
    container.textContent = 'No servo motor recommendation available.';
    return;
  }

  if (best.viable) {
    const differs = selected && selectedMotorIdx !== best.index;
    const selectedText = selected
      ? `Current selection: <strong>${selected.pn}</strong>.`
      : 'No motor selected yet.';
    container.innerHTML = `
      Recommended motor: <strong>${best.motor.pn}</strong> (${best.motor.series}) — ${best.motor.Mn.toFixed(2)} Nm rated (Mn), ${best.motor.Mmax.toFixed(2)} Nm peak (Mmax), ${best.motor.Nn} rpm (Nn)${best.motor.brake ? ', <strong>Brake</strong>' : ''}.
      ${differs ? `<br><span style="color:var(--warning);font-weight:600">${selectedText}</span> <button id="apply-recommended-btn" type="button" class="button secondary" style="margin-left:8px;padding:4px 10px;font-size:11px;">Use Recommended</button>` : ''}
      ${!selected ? `<br><span style="color:var(--muted)">${selectedText}</span>` : ''}
    `;
    const applyBtn = document.getElementById('apply-recommended-btn');
    if (applyBtn) {
      applyBtn.onclick = () => {
        selectMotorManually(best.index);
      };
    }
  } else {
    container.innerHTML = `Closest motor: <strong>${best.motor.pn}</strong> — ${best.motor.Mn.toFixed(2)} Nm rated, ${best.motor.Nn} rpm (may still exceed one or more limits).`;
  }
}

function renderMovementSteps() {
  const container = document.getElementById('movement-steps-container');
  if (!container) return;
  const steps = Array.isArray(state.steps) && state.steps.length ? state.steps : [{ label: 'Step 1', stroke: 15, move_time: 1.0, external_force: 250, load_mass: 1.0 }];

  container.innerHTML = steps.map((step, index) => {
    const tAcc = step.acceleration_time != null ? Number(step.acceleration_time) : 0;
    const tDec = step.deceleration_time != null ? Number(step.deceleration_time) : 0;
    const tMove = Number(step.move_time) || 0;
    const accDecInvalid = (tAcc + tDec) > tMove + 1e-9;
    const tConst = Math.max(0, tMove - tAcc - tDec);
    const invBorder = accDecInvalid ? 'border-color:#ef4444;' : '';
    const invBg     = accDecInvalid ? 'background:#fef2f2;'   : '';
    return `
    <div class="step-card" data-step="${index}">
      <div class="step-header">
        <div class="step-header-left">
          <span class="step-badge">${index + 1}</span>
          <input class="step-name-input" data-step="${index}" data-field="label" type="text"
            value="${(step.label || `Step ${index + 1}`).replace(/"/g, '&quot;')}"
            placeholder="Step ${index + 1}" />
        </div>
        ${state.steps.length > 1 ? `<button type="button" class="button secondary remove-step" data-step="${index}" style="font-size:11px;padding:4px 10px;margin-left:10px;">Remove</button>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
        <div class="field-row">
          <label data-tip="Linear travel distance for this step (mm)">
            <span class="field-label-row">Stroke (mm) <span class="sym">s_move_${index+1}</span></span>
            <input data-step="${index}" data-field="stroke" type="number" step="0.1" value="${step.stroke}" />
          </label>
        </div>
        <div class="field-row">
          <label data-tip="Total mass of payload being moved in this step (kg)">
            <span class="field-label-row">Payload mass (kg) <span class="sym">m_pay_${index+1}</span></span>
            <input data-step="${index}" data-field="load_mass" type="number" step="0.1" value="${step.load_mass}" />
          </label>
        </div>
        <div class="field-row">
          <label data-tip="t_acc + t_dec + t_cons. Does not include dwell time.">
            <span class="field-label-row">Move time (s) <span class="sym">t_move_${index+1}</span></span>
            <input data-step="${index}" data-field="move_time" type="number" step="0.01" value="${step.move_time}" />
          </label>
        </div>
        <div class="field-row">
          <label data-tip="Time gap after this movement ends, before the next movement starts (s)">
            <span class="field-label-row">Dwell time (s) <span class="sym">t_dwell_${index+1}</span></span>
            <input data-step="${index}" data-field="dwell_time" type="number" step="0.01" value="${step.dwell_time ?? 0}" />
          </label>
        </div>
        <div class="field-row">
          <label data-tip="Acceleration phase duration (s). t_acc + t_dec must be ≤ t_move.${accDecInvalid ? ' ⚠ Currently exceeds t_move.' : ''}">
            <span class="field-label-row">Acceleration time (s) <span class="sym">t_acc_${index+1}</span></span>
            <input data-step="${index}" data-field="acceleration_time" type="number" step="0.01" value="${step.acceleration_time ?? ''}" style="${invBorder}${invBg}" />
          </label>
        </div>
        <div class="field-row">
          <label data-tip="Deceleration phase duration (s). t_acc + t_dec must be ≤ t_move.${accDecInvalid ? ' ⚠ Currently exceeds t_move.' : ''}">
            <span class="field-label-row">Deceleration time (s) <span class="sym">t_dec_${index+1}</span></span>
            <input data-step="${index}" data-field="deceleration_time" type="number" step="0.01" value="${step.deceleration_time ?? ''}" style="${invBorder}${invBg}" />
          </label>
        </div>
        <div style="display:none">
          <input data-const-step="${index}" type="text" readonly value="${tConst.toFixed(3)}" />
        </div>
        <div class="field-row">
          <label data-tip="External force applied along the axis (N)">
            <span class="field-label-row">External force (N) <span class="sym">F_ext_${index+1}</span></span>
            <input data-step="${index}" data-field="external_force" type="number" step="1" value="${step.external_force}" />
          </label>
        </div>
        <div class="field-row">
          <label data-tip="Whether the external force opposes or aids payload motion">
            <span class="field-label-row">Ext. force direction <span class="sym">dir_F_ext_${index+1}</span></span>
            <select data-step="${index}" data-field="external_force_dir">
              <option value="opposing" ${step.external_force_dir === 'opposing' ? 'selected' : ''}>Opposing movement</option>
              <option value="aiding"   ${step.external_force_dir === 'aiding'   ? 'selected' : ''}>Aiding movement</option>
            </select>
          </label>
        </div>
        <div class="field-row">
          <label data-tip="Direction of payload travel relative to gravity">
            <span class="field-label-row">Movement direction <span class="sym">dir_p_move_${index+1}</span></span>
            <select data-step="${index}" data-field="movement_dir">
              <option value="against_gravity" ${step.movement_dir === 'against_gravity' ? 'selected' : ''}>Against gravity</option>
              <option value="with_gravity"    ${step.movement_dir === 'with_gravity'    ? 'selected' : ''}>With gravity</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function updateStepValidation() {
  state.steps.forEach((step, index) => {
    const tAcc  = Number(step.acceleration_time) || 0;
    const tDec  = Number(step.deceleration_time) || 0;
    const tMove = Number(step.move_time) || 0;
    const invalid = (tAcc + tDec) > tMove + 1e-9;
    const tConst  = Math.max(0, tMove - tAcc - tDec);

    ['acceleration_time', 'deceleration_time'].forEach(field => {
      const el = document.querySelector(`[data-step="${index}"][data-field="${field}"]`);
      if (!el) return;
      el.style.borderColor = invalid ? '#ef4444' : '';
      el.style.background  = invalid ? '#fef2f2' : '';
    });

    document.querySelectorAll(`.timing-warn[data-warn="${index}"]`).forEach(span => {
      span.style.display = invalid ? 'inline' : 'none';
    });

    const constEl = document.querySelector(`[data-const-step="${index}"]`);
    if (constEl) constEl.value = (tAcc > 0 || tDec > 0 || tMove > 0) ? tConst.toFixed(3) : '—';
  });
}

function renderInputs() {
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.dataset.key;
    if (key in state) {
      el.value = state[key];
    }
  });
  updateMechanicalVisibility();
  renderMovementSteps();
  // Item 8: warn if ball screw length < maximum motion step stroke
  const maxStroke = Math.max(0, ...state.steps.map(s => Number(s.stroke) || 0));
  const bsLenWarn = document.getElementById('bs-length-warn');
  const bsMaxStrokeVal = document.getElementById('bs-max-stroke-val');
  if (bsLenWarn && bsMaxStrokeVal) {
    bsMaxStrokeVal.textContent = maxStroke.toFixed(1);
    bsLenWarn.style.display = (maxStroke > 0 && (Number(state.bs_length) || 0) < maxStroke) ? 'block' : 'none';
  }
}

/* Switches which panel is visible in the consolidated Component Selection card (Motor / Ball
   Screw / Gearbox / Servo Drive) — replaces what used to be 4 separate scattered cards, so a
   designer sees one place for the whole selection story instead of hunting across the page. */
function switchComponentTab(tab) {
  activeComponentTab = tab;
  document.querySelectorAll('.component-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.component-tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.panel === tab);
  });
}

/* Small status dot on each tab (● green = applied/resolved from catalog, ● amber = manual/not
   yet resolved) so the designer can see at a glance which components still need attention
   without clicking into every tab. */
function renderComponentTabStatus(result) {
  const rows = (typeof getSelectedComponentsSummary === 'function') ? getSelectedComponentsSummary(result) : [];
  const byComponent = {};
  rows.forEach(r => { byComponent[r.component] = r.status; });
  const okStatuses = new Set(['Selected', 'Applied from catalog', 'Recommended']);
  const dotFor = status => (status && okStatuses.has(status)) ? 'ok' : 'warn';
  const tabs = [
    ['motor', byComponent['Servo Motor']],
    ['ballscrew', byComponent['Ball Screw']],
    ['drive', byComponent['Servo Drive']],
  ];
  tabs.forEach(([tab, status]) => {
    const btn = document.querySelector(`.component-tab[data-tab="${tab}"]`);
    if (!btn) return;
    let dot = btn.querySelector('.tab-status');
    if (!dot) { dot = document.createElement('span'); dot.className = 'tab-status'; btn.appendChild(dot); }
    dot.className = 'tab-status ' + dotFor(status);
  });
  // Gearbox only gets a dot when it's actually part of the configuration.
  const gbBtn = document.querySelector('.component-tab[data-tab="gearbox"]');
  if (gbBtn) {
    let dot = gbBtn.querySelector('.tab-status');
    if (Number(state.has_gearbox) !== 0) {
      if (!dot) { dot = document.createElement('span'); dot.className = 'tab-status'; gbBtn.appendChild(dot); }
      dot.className = 'tab-status ' + dotFor(byComponent['Gearbox']);
    } else if (dot) {
      dot.remove();
    }
  }
}

function updateMechanicalVisibility() {
  const ctx = (typeof Projects !== 'undefined') ? Projects.getContext() : null;
  const projCfg = (ctx && typeof Projects !== 'undefined') ? (Projects.get(ctx.projectId)?.config || null) : null;

  const guideBlock       = document.getElementById('guide-block');
  const lmGuideRow       = document.getElementById('lm-guide-row');
  const parallelBlock    = document.getElementById('parallel-kit-block');
  const gearboxBlock     = document.getElementById('gearbox-block');
  const gearboxTab       = document.getElementById('component-tab-gearbox');
  const cbPanel          = document.getElementById('cb-panel');
  const cbGuideFields    = document.getElementById('cb-guide-fields');

  const isPreassembled  = (state.bs_type === 'preassembled');
  const hasLM           = !isPreassembled && Number(state.has_lm_guide) !== 0;
  const hasParallel     = Number(state.has_parallel_kit) !== 0;
  const hasGearbox      = Number(state.has_gearbox) !== 0;
  const hasCB           = !!state.has_counterbalance && state.has_counterbalance !== 0;
  const cbType          = (hasCB && typeof state.has_counterbalance === 'string') ? state.has_counterbalance : (projCfg?.counterbalance || 'guide_shaft');

  if (lmGuideRow)        lmGuideRow.style.display        = isPreassembled ? 'none' : '';
  if (guideBlock)        guideBlock.style.display        = hasLM      ? '' : 'none';
  if (parallelBlock)     parallelBlock.style.display     = hasParallel ? '' : 'none';
  if (gearboxBlock)      gearboxBlock.style.display      = hasGearbox  ? '' : 'none';
  // Gearbox catalog recommendations are only relevant when a gearbox is actually part of this
  // mechanical configuration — the Gearbox tab is hidden (and not evaluated in render()) when
  // has_gearbox is No. If it was the active tab when it disappears, fall back to Motor.
  if (gearboxTab) {
    gearboxTab.style.display = hasGearbox ? '' : 'none';
    if (!hasGearbox && activeComponentTab === 'gearbox') switchComponentTab('motor');
  }
  if (cbPanel)           cbPanel.style.display           = hasCB       ? '' : 'none';
  if (cbGuideFields)     cbGuideFields.style.display     = (hasCB && cbType === 'guide_shaft') ? 'contents' : 'none';

  // CB mass warning: warn if m_cb is >20% above or below (m_pay_1 + m_fix)
  const cbMassWarning = document.getElementById('cb-mass-warning');
  if (cbMassWarning && hasCB) {
    const m_pay1 = Number(state.steps?.[0]?.load_mass) || 0;
    const m_fix  = Number(state.guide_mass) || 0;
    const ref    = m_pay1 + m_fix;
    const m_cb   = Number(state.cb_mass) || 0;
    if (ref > 0 && m_cb > 0 && Math.abs(m_cb - ref) / ref > 0.20) {
      cbMassWarning.style.display = '';
      cbMassWarning.textContent   = `Warning: CB mass (${m_cb} kg) differs from payload + fixture mass (${ref.toFixed(2)} kg) by more than 20%. This may increase motor gravity torque.`;
    } else {
      cbMassWarning.style.display = 'none';
    }
  } else if (cbMassWarning) {
    cbMassWarning.style.display = 'none';
  }
}

function handleInput(event) {
  const target = event.target;
  const key = target.dataset.key;
  const stepIndex = target.dataset.step;
  const field = target.dataset.field;
  const value = target.type === 'checkbox' ? target.checked : target.value;

  if (typeof stepIndex !== 'undefined' && typeof field !== 'undefined') {
    const index = Number(stepIndex);
    const STRING_STEP_FIELDS = new Set(['label', 'external_force_dir', 'movement_dir']);
    if (!Number.isNaN(index) && state.steps[index]) {
      state.steps[index][field] = STRING_STEP_FIELDS.has(field) ? String(value) : Number(value);
    }
  } else if (key) {
    if (target.type === 'number') {
      state[key] = Number(value);
    } else if (target.tagName === 'SELECT') {
      const maybeNum = Number(value);
      state[key] = Number.isFinite(maybeNum) ? maybeNum : String(value);
    } else {
      state[key] = String(value);
    }
    if (key === 'gb_ratio') {
      state.gb_ratio_user_selected = true;
      unlockDownstreamOfGearbox();
    }
    if (key === 'bs_pitch' || key === 'bs_dia' || key === 'bs_efficiency' || key === 'bs_preload_torque' || key === 'bs_length') {
      state.bs_user_selected = true;
      unlockDownstreamOfBallScrew();
    }
    if (key === 'tilt_deg' || key === 'cb_angle_deg') {
      state[key] = Math.min(90, Math.max(0, state[key] || 0));
    }
  } else {
    return;
  }

  saveState();
  render();
  if (typeof stepIndex !== 'undefined') updateStepValidation();
}

function setExcelStatus(message, isError = false) {
  const status = document.getElementById('excel-status');
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? '#b91c1c' : '#111827';
}

function setExcelTrace(trace) {
  const el = document.getElementById('excel-trace');
  if (!el) return;
  if (!trace) {
    el.textContent = '';
    return;
  }
  const parts = [];
  if (trace.sheetName) parts.push(trace.sheetName);
  if (trace.rowNumber != null) parts.push(`row ${trace.rowNumber}`);
  if (trace.label) parts.push(`"${trace.label}"`);
  if (trace.value != null) parts.push(`= ${trace.value}`);
  el.textContent = parts.length ? `Trace: ${parts.join(' · ')}` : '';
}

function normalizeLabel(label) {
  return String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseBearingDragTable(rows) {
  // Finds the transposed bearing drag table in the template:
  //   Header row: col0=section, col1='No. of Blocks', col2='Drag/Block — Axial', col3='Drag/Block — Radial'
  //   Data rows:  col0 contains 'fixed' or 'support', col1=count, col2=axial, col3=radial
  const headerIdx = rows.findIndex(row =>
    Array.isArray(row) &&
    normalizeLabel(row[1]).includes('block') &&
    normalizeLabel(row[2]).includes('axial') &&
    normalizeLabel(row[3]).includes('radial')
  );
  if (headerIdx < 0) return 0;

  let updated = 0;
  for (let i = headerIdx + 1; i < Math.min(rows.length, headerIdx + 5); i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const label = normalizeLabel(row[0]);
    const n     = typeof row[1] === 'number' ? row[1] : parseFloat(String(row[1] ?? ''));
    const axial = typeof row[2] === 'number' ? row[2] : parseFloat(String(row[2] ?? ''));
    const radial= typeof row[3] === 'number' ? row[3] : parseFloat(String(row[3] ?? ''));
    if (label.includes('fixed')) {
      if (Number.isFinite(n))      { state.bs_n_fixed_blocks    = Math.max(1, Math.round(n)); updated++; }
      if (Number.isFinite(axial))  { state.bs_fixed_drag_axial  = axial;  updated++; }
      if (Number.isFinite(radial)) { state.bs_fixed_drag_radial = radial; updated++; }
    } else if (label.includes('support')) {
      if (Number.isFinite(n))      { state.bs_n_support_blocks    = Math.max(1, Math.round(n)); updated++; }
      if (Number.isFinite(axial))  { state.bs_support_drag_axial  = axial;  updated++; }
      if (Number.isFinite(radial)) { state.bs_support_drag_radial = radial; updated++; }
    }
  }
  return updated;
}

function parseExcelStepRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return 0;

  const headerRowIndex = rows.findIndex(row => Array.isArray(row) && row.some(cell => normalizeLabel(cell).includes('stroke')) && row.some(cell => normalizeLabel(cell).includes('move time')));
  if (headerRowIndex < 0) return 0;

  const headers = rows[headerRowIndex].map(cell => normalizeLabel(cell));
  const columnMap = new Map();
  headers.forEach((label, index) => {
    // Order: most-specific first to avoid false substring matches
    if (label.includes('acceleration time')) columnMap.set(index, 'acceleration_time');
    else if (label.includes('deceleration time') || label.includes('decceleration time')) columnMap.set(index, 'deceleration_time');
    else if (label.includes('dwell')) columnMap.set(index, 'dwell_time');
    else if (label.includes('move time') || label.includes('total time')) columnMap.set(index, 'move_time');
    else if (label.includes('stroke')) columnMap.set(index, 'stroke');
    else if (label.includes('movement direction') || label.includes('movement dir') || label.includes('payload movement')) columnMap.set(index, 'movement_dir');
    else if (label.includes('force direction') || label.includes('ext force dir') || label.includes('force dir')) columnMap.set(index, 'external_force_dir');
    else if (label.includes('additional force') || label.includes('external force') || label.includes('f pick') || label.includes('f load') || label.includes('f return')) columnMap.set(index, 'external_force');
    else if (label.includes('payload mass') || label.includes('load mass') || label.includes('moving mass')) columnMap.set(index, 'load_mass');
    // inclination/tilt is now axis-level — not imported per step
    else if (label === 'step' || label.includes('label') || label.includes('axis name') || label.includes('appl') || label.includes('stn no') || label.includes('application') || label.includes('operation') || label.includes('motion step name')) columnMap.set(index, 'label');
    else if (label.includes('acc')) columnMap.set(index, '_ignore_acc');
  });

  // Text fields that need string values (not numeric conversion)
  const TEXT_COL_FIELDS = new Set(['label', 'external_force_dir', 'movement_dir']);

  const steps = [];
  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row) || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      if (steps.length > 0) break;
      continue;
    }
    const step = {
      stroke: 0, move_time: 0.05, dwell_time: 0,
      acceleration_time: null, deceleration_time: null,
      external_force: 0, external_force_dir: 'opposing',
      movement_dir: 'against_gravity', load_mass: 0,
    };
    let rowHasData = false;

    for (const [col, field] of columnMap.entries()) {
      if (col >= row.length) continue;
      const cell = row[col];
      const raw = cell === null || cell === undefined ? '' : String(cell).trim();
      if (!raw) continue;

      if (field === '_ignore_acc') continue;

      if (TEXT_COL_FIELDS.has(field)) {
        if (field === 'external_force_dir') {
          step.external_force_dir = raw.toLowerCase().includes('aid') ? 'aiding' : 'opposing';
          rowHasData = true;
        } else if (field === 'movement_dir') {
          step.movement_dir = (raw.toLowerCase().includes('with') || raw.toLowerCase().includes('aid')) ? 'with_gravity' : 'against_gravity';
          rowHasData = true;
        } else {
          step.label = raw; // label field — doesn't count as data by itself
        }
        continue;
      }

      const value = Number(raw.replace(/[^0-9.eE+-]/g, ''));
      if (!Number.isNaN(value)) {
        step[field] = value;
        rowHasData = true;
      }
    }

    if (rowHasData) {
      steps.push(step);
    }
  }

  if (steps.length > 0) {
    state.steps = steps.map((step, index) => ({
      label: String(step.label || `Step ${index + 1}`),
      stroke: Math.max(0, Number(step.stroke) || 0),
      move_time: Math.max(0, Number(step.move_time) || 0.05),
      dwell_time: Math.max(0, Number(step.dwell_time) || 0),
      acceleration_time: step.acceleration_time,
      deceleration_time: step.deceleration_time,
      external_force: Number(step.external_force) || 0,
      external_force_dir: step.external_force_dir || 'opposing',
      movement_dir: step.movement_dir || 'against_gravity',
      load_mass: Math.max(0, Number(step.load_mass) || 0),
    }));
    return steps.length;
  }

  return 0;
}

function parseExcelValues(rows, preloadedSteps = 0, sheetName = '') {
  const stepsFromTable = preloadedSteps > 0 ? preloadedSteps : parseExcelStepRows(rows);
  const bearingTableUpdated = parseBearingDragTable(rows);
  let updated = stepsFromTable + bearingTableUpdated;
  const assignedKeys = new Set();
  const assignOnce = key => {
    if (assignedKeys.has(key)) return false;
    assignedKeys.add(key);
    return true;
  };

  // calc sheet: col A=index0 (section heading), col B=index1 (label), col C=index2 (value)
  // Try col B as label, col C as value first; fall back to col A / col B for other sheets
  //
  // NOTE: More-specific keys must appear BEFORE less-specific ones so that
  // substring matching picks the right entry (Map iterates in insertion order).
  const rawMappings = [
    // General project info
    ['station number',                          'project_stn'],
    ['stn no',                                  'project_stn'],
    ['application name',                        'project_appl'],
    ['appl',                                    'project_appl'],
    // Application requirement
    ['dwell time',                              'dwell_time'],
    ['no of shifts per day',                    'project_shifts'],
    ['working hours per shift',                 'project_hours_shift'],
    ['working days per week',                   'project_days_week'],
    ['total cycle time of machine',             'project_total_cycle'],
    ['total operating time per cycle',          'project_operating_time'],
    ['axis on-time per cycle',                  'project_operating_time'],
    ['axis on time per cycle',                  'project_operating_time'],
    ['expected service life of machine',        'project_service_life'],
    ['movement accuracy required',              'project_accuracy'],
    ['project accuracy',                        'project_accuracy'],
    ['movement stroke required',                'stroke'],
    ['time available for displacement',         'move_time'],
    ['cycle time available for single movement','move_time'],
    ['time for acceleration',                   'acceleration_time'],
    ['time for decceleration',                  'deceleration_time'],
    ['acceleration time',                       'acceleration_time'],
    ['deceleration time',                       'deceleration_time'],
    ['decceleration time',                      'deceleration_time'],
    ['additional force acting on the axis',      'external_force'],
    ['additional force',                         'external_force'],
    ['external force on the moving mass',       'external_force'],
    ['external force direction',                '_text_external_force_dir'],
    // Specific inclination labels before generic 'inclination angle'
    ['inclination angle of counter balance',    'cb_angle_deg'],
    ['payload inclination angle',               'tilt_deg'],
    ['inclination angle',                       'tilt_deg'],
    ['tilt angle of the setup',                 'tilt_deg'],
    ['payload movement direction',              '_text_movement_dir'],
    ['movement direction',                      '_text_movement_dir'],
    // Specific friction coefficient before generic one to prevent false matches
    ['friction coefficient of counterbalance linear guide', 'cb_mu'],
    ['friction coefficient of linear guide',    'mu'],
    ['payload mass',                            'load_mass'],
    ['acceleration %',                          'acc_pct'],
    ['acceleration time %',                     'acc_pct'],
    ['accel decel time %',                      'acc_pct'],
    ['safety factor %',                         'safety_factor'],
    ['safety factor',                           'safety_factor'],
    // Ball screw — specific labels first to prevent false substring matches
    ['selected ball screw model',               'bs_model'],
    ['ball screw - moving mass',                '_ignore'],   // spindle mass, not payload
    ['ball screw - moment of inertia',          '_ignore'],
    ['ball screw moment of inertia',            '_ignore'],
    ['ball screw - repetition accuracy',        'bs_repetition_accuracy'],
    ['ball screw repetition accuracy',          'bs_repetition_accuracy'],
    ['ball screw - permitted driving torque max','bs_max_torque'],
    ['ball screw permitted driving torque max', 'bs_max_torque'],
    ['ball screw - permitted driving torque',   'bs_max_torque'],
    ['ball screw - permitted velocity',         'bs_max_speed_mms'], // mm/sec, convert later
    ['no of fixed side support block',           'bs_n_fixed_blocks'],
    ['no of fixed side support blocks',          'bs_n_fixed_blocks'],
    ['number of fixed side support blocks',      'bs_n_fixed_blocks'],
    ['fixed side drag per block axial',          'bs_fixed_drag_axial'],
    ['fixed drag axial',                         'bs_fixed_drag_axial'],
    ['fixed side drag per block radial',         'bs_fixed_drag_radial'],
    ['fixed drag radial',                        'bs_fixed_drag_radial'],
    ['no of support side support block',         'bs_n_support_blocks'],
    ['no of support side support blocks',        'bs_n_support_blocks'],
    ['number of support side support blocks',    'bs_n_support_blocks'],
    ['support side drag per block axial',        'bs_support_drag_axial'],
    ['support side drag torque per block axial', 'bs_support_drag_axial'],
    ['support drag axial',                       'bs_support_drag_axial'],
    ['support side drag per block radial',       'bs_support_drag_radial'],
    ['support side drag torque per block radial','bs_support_drag_radial'],
    ['support drag radial',                      'bs_support_drag_radial'],
    ['fixed side drag torque per block',         'bs_fixed_drag_axial'],
    ['fixed side drag torque per block axial',   'bs_fixed_drag_axial'],
    ['fixed side drag torque per block radial',   'bs_fixed_drag_radial'],
    ['fixed side support block drag torque','bs_fixed_drag_axial'],
    ['fixed side support block drag torque total','_ignore'],
    ['fixed side support block drag torque axial','bs_fixed_drag_axial'],
    ['fixed side support block drag torque radial','bs_fixed_drag_radial'],
    ['fixed side drag per block',                'bs_fixed_drag_axial'],
    ['fixed side bearing drag torque',           'bs_fixed_drag_axial'],
    ['support side drag torque per block',       'bs_support_drag_axial'],
    ['support side support block drag torque','bs_support_drag_axial'],
    ['support side support block drag torque total','_ignore'],
    ['support side support block drag torque axial','bs_support_drag_axial'],
    ['support side support block drag torque radial','bs_support_drag_radial'],
    ['support side drag per block',              'bs_support_drag_axial'],
    ['support side bearing drag torque',         'bs_support_drag_axial'],
    ['ball screw friction torque',               'bs_bearing_drag_torque'],
    ['no load driving torque of spindle',        'bs_bearing_drag_torque'],
    ['ballscrew bearing drag torque',            'bs_bearing_drag_torque'],
    ['ball screw bearing drag torque',           'bs_bearing_drag_torque'],
    ['ballscrew preload nut friction',          '_ignore'],
    ['ballscrew preload force',                 '_ignore'],
    ['ballscrew nut & housing mass',            'bs_nut_mass'],
    ['ballscrew nut and housing mass',          'bs_nut_mass'],
    ['ball screw nut mass',                     'bs_nut_mass'],
    ['bs nut mass',                             'bs_nut_mass'],
    ['ball screw length',                       'bs_length'],
    ['ball screw rod length',                   'bs_length'],
    ['bs length',                               'bs_length'],
    ['ball screw material',                     '_text_bs_material'],
    ['bs material',                             '_text_bs_material'],
    ['bs preload torque',                       'bs_preload_torque'],
    ['ball screw preload torque',               'bs_preload_torque'],
    ['mass per carriage block',                 'guide_block_mass'],
    ['guide block mass',                        'guide_block_mass'],
    ['guide block mass per block',              'guide_block_mass'],
    ['ball screw efficiency',                   'bs_efficiency_pct'],  // % → convert
    ['ball screw pitch',                        'bs_pitch'],
    ['ball screw dia',                          'bs_dia'],
    // LM Guide
    ['lm guide present',                        '_text_has_lm_guide'],
    ['lm guide needed',                         '_text_has_lm_guide'],
    ['parallel kit needed',                     '_text_has_parallel_kit'],
    ['parallel kit present',                    '_text_has_parallel_kit'],
    ['gearbox needed',                          '_text_has_gearbox'],
    ['gearbox present',                         '_text_has_gearbox'],
    ['fixture mass',                            'guide_mass'],
    ['fixture / carriage mass',                 'guide_mass'],
    ['fixture carriage mass',                   'guide_mass'],
    ['max withstand force',                     'guide_max_force'],
    ['service life @100% load',                 'guide_service_life'],
    ['service life at 100 load',                'guide_service_life'],
    // Ball Screw
    ['max permitted speed',                     'bs_max_speed'],
    ['max permitted torque',                    'bs_max_torque'],
    ['repetition accuracy',                     'bs_repetition_accuracy'],
    // Counterbalance
    ['counterbalance present',                  '_text_has_counterbalance'],
    ['counter balance mass',                    'cb_mass'],
    ['counterbalance mass',                     'cb_mass'],
    ['counterbalance inclination angle',        'cb_angle_deg'],
    ['counterbalance guide friction coeff',     'cb_mu'],
    ['counterbalance friction coefficient',     'cb_mu'],
    ['linear bush friction force (counterbalance)','cb_bushing_friction_force'],
    ['linear bush friction force counterbalance','cb_bushing_friction_force'],
    ['linear bush friction force',              'cb_bushing_friction_force'],
    ['number of linear bushings (counterbalance)','cb_n_bushings'],
    ['no of linear bushings counterbalance',    'cb_n_bushings'],
    // Parallel kit
    ['selected parallel kit model',             'pk_model'],
    ['gear ratio required',                     '_ignore'],
    ['gear ratio',                              'pk_ratio'],
    ['no load driving torque',                  'pk_no_load_torque'],
    ['no. load driving torque',                 'pk_no_load_torque'],
    ['mass momment of inertia',                 'pk_inertia_mm2'],  // kg·mm² → convert
    ['mass moment of inertia',                  'pk_inertia_mm2'],  // kg·mm² → convert
    ['max transfereable torque',                'pk_max_torque'],
    ['max. transferable torque',                'pk_max_torque'],
    ['max transferable torque',                 'pk_max_torque'],
    ['max rotational speed',                    'pk_max_speed'],
    ['max. rotational speed',                   'pk_max_speed'],
    // Gearbox
    ['selected gear ratio',                     'gb_ratio'],
    ['gearbox ratio',                           'gb_ratio'],
    ['gb- efficiency',                          'gb_efficiency_pct'],  // % → convert
    ['gb - efficiency',                         'gb_efficiency_pct'],
    ['gearbox efficiency',                      'gb_efficiency_pct'],
    ['gb-backlash',                             'gb_backlash'],
    ['gb - backlash',                           'gb_backlash'],
    ['gb backlash',                             'gb_backlash'],
    ['gearbox backlash',                        'gb_backlash'],
    ['gb- no load running torque',              'gb_no_load_torque'],
    ['gb - no load running torque',             'gb_no_load_torque'],
    ['gearbox  - inertia',                      'gb_inertia'],
    ['gearbox - inertia',                       'gb_inertia'],
    ['gb - inertia',                            'gb_inertia'],
    ['gb - rated input speed',                  'gb_rated_input_speed'],
    ['gb - rated output torque',                'gb_rated_output_torque'],
    // Servo motor
    ['sm - permitted inertia ratio',            'sm_permitted_inertia_ratio'],
    ['sm - encoder reolution',                  'sm_encoder_ppr'],
    ['sm - encoder resolution',                 'sm_encoder_ppr'],
    // Guide — "displacement force" is specific; "moving mass" is a fallback for the
    // guide carriage mass (must come after "ball screw - moving mass" above)
    ['selected guide model',                    'guide_model'],
    ['no of carriage blocks',                   'guide_n_blocks'],
    ['number of carriage blocks',               'guide_n_blocks'],
    ['displacement force required',             'guide_force'],
    ['friction force',                          'guide_force'],
    ['max withstand force',                     'guide_max_force'],
    ['service life for 100% loading',           'guide_service_life'],
    ['moving mass',                             'guide_mass'],
    ['carriage mass',                           'guide_mass'],
    ['guide mass',                              'guide_mass'],
    // Short-name aliases for the simple download template round-trip
    ['stroke',                                  'stroke'],
    ['move time',                               'move_time'],
    ['ext force direction',                     '_text_external_force_dir'],
    ['external force',                          'external_force'],
    ['no carriage blocks',                      'guide_n_blocks'],
    ['friction coeff lm guide',                 'mu'],
    ['friction coefficient lm guide',           'mu'],
    ['mass per carriage block',                 'guide_block_mass'],
    ['ball screw precision',                    'bs_repetition_accuracy'],
    ['position accuracy',                       'bs_repetition_accuracy'],
    ['cb mass',                                 'cb_mass'],
    ['cb inclination',                          'cb_angle_deg'],
    ['cb friction coeff',                       'cb_mu'],
    ['bs lead',                                 'bs_pitch'],
    ['bs lead (mm/rev)',                         'bs_pitch'],
    ['bs efficiency',                           'bs_efficiency_pct'],
    ['bs inertia',                              '_ignore'],
    ['bs diameter',                             'bs_dia'],
    ['gearbox accuracy',                        '_ignore'],
    ['motor accuracy',                          '_ignore'],
    ['total accuracy of the system',            '_ignore'],
    ['movement accuracy calc',                  '_ignore'],
    ['pk ratio',                                'pk_ratio'],
    ['pk no load',                              'pk_no_load_torque'],
    ['pk inertia',                              'pk_inertia'],
    ['pk max torque',                           'pk_max_torque'],
    ['pk max speed',                            'pk_max_speed'],
    ['gb ratio',                                'gb_ratio'],
    ['gb no load',                              'gb_no_load_torque'],
    ['gb inertia',                              'gb_inertia'],
    ['backlash',                                'gb_backlash'],
    ['cycle time',                              'project_total_cycle'],
    ['op time',                                 'project_operating_time'],
    ['shifts day',                              'project_shifts'],
    ['hours shift',                             'project_hours_shift'],
    ['days week',                               'project_days_week'],
    ['service life',                            'project_service_life'],
    ['accuracy',                                'project_accuracy'],
    ['counterbalance exists',                   '_text_has_counterbalance'],
    ['bearing drag torque',                     'bs_bearing_drag_torque'],
    // Guide friction force variants (per-block friction force)
    ['lm guide frcition force',                 'guide_force'],
    ['friction force per carriage block',        'guide_force'],
    ['friction force per block',                 'guide_force'],
    // LM guide max/rated force (guide_max_force — was "max withstand force")
    ['lm guide friction force',                  'guide_max_force'],
    // Counterbalance presence and mass (from working file)
    ['counter balance exists',                  '_text_has_counterbalance'],
    ['mass of the counterbalance',              'cb_mass'],
    // Ballscrew efficiency (no space variant)
    ['ballscrew efficiency',                    'bs_efficiency_pct'],
    // Preload nut friction (typo variant from user's working file)
    ['preload nut friction coeffcient',         '_ignore'],
    ['preload nut friction coefficient',        '_ignore'],
    ['preload force',                           '_ignore'],
    ['preload torque',                          'bs_preload_torque'],
    // drag torque per block rows are child rows already captured by n_blocks + per-block entries
    ['drag torque per block',                   '_ignore'],
  ];
  const mapping = new Map(rawMappings.map(([label, key]) => [normalizeLabel(label), key]));
  const TEXT_FIELDS = new Set(['bs_model', 'pk_model', 'guide_model']);

  // Step-level fields that come from single-operation rows in the DATA INPUTS section.
  // They are stored temporarily and promoted to steps[0] after parsing.
  // stroke, move_time, external_force, tilt_deg are unambiguous step fields.
  // load_mass ("moving mass") is ambiguous: first occurrence = payload (step), second = guide carriage.
  const STEP_FIELDS = new Set(['stroke', 'move_time', 'dwell_time', 'acceleration_time', 'deceleration_time', 'external_force', 'load_mass']);
  const STEP_TEXT_FIELDS = new Set(['_text_external_force_dir', '_text_movement_dir']);

  function resolveRow(row) {
    const tryMatch = (lbl) => {
      const label = normalizeLabel(lbl);
      // Require at least 5 characters to avoid false substring matches (e.g. "Appl", "Op")
      if (!label || label.length < 5) return null;
      let key = mapping.get(label);
      if (!key) {
        for (const [k, v] of mapping) {
          if (label.includes(k) || k.includes(label)) { key = v; break; }
        }
      }
      return key || null;
    };

    // Layout A: col1 = label, col2 = value (simple calc sheet)
    // Layout A2: col1 = label, col2 = symbol string, col3 = unit, col4 = value (detailed calc sheet)
    // Layout A3 (new template): col0=group, col1=label, col2=notes, col3+=value/station columns
    // If col2 is a non-numeric string (notes), scan col3 onward for the first non-empty value.
    const keyA = tryMatch(row[1]);
    if (keyA) {
      const v2 = row[2];
      const v2IsNumeric = typeof v2 === 'number' ||
        (v2 !== undefined && v2 !== null && v2 !== '' && !isNaN(Number(String(v2).trim())));
      let value = v2;
      if (!v2IsNumeric) {
        // Notes column detected — scan remaining columns for the first non-empty value
        for (let ci = 3; ci < row.length; ci++) {
          const v = row[ci];
          if (v !== undefined && v !== null && v !== '') { value = v; break; }
        }
      }
      if (keyA === 'gb_backlash') console.log('[CV] backlash row cols:', JSON.stringify(row), '→ value:', value);
      return { key: keyA, value, label: row[1] };
    }

    // Layout B: col0 = label, col1 = value (old template)
    // Layout B2: col0 = label, col1 = notes (descriptive string), col2+ = value (new template)
    const keyB = tryMatch(row[0]);
    if (keyB) {
      const col1 = row[1];
      const col1IsNotes = col1 !== undefined && col1 !== null && col1 !== '' &&
        typeof col1 === 'string' && isNaN(Number(String(col1).trim()));
      let value = col1;
      if (col1IsNotes) {
        for (let ci = 2; ci < row.length; ci++) {
          const v = row[ci];
          if (v !== undefined && v !== null && v !== '') { value = v; break; }
        }
      }
      if (keyB === 'gb_backlash') console.log('[CV] backlash row (B) cols:', JSON.stringify(row), '→ value:', value);
      return { key: keyB, value, label: row[0] };
    }

    return null;
  }

  function parseNumericCell(raw) {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
    const text = String(raw ?? '').trim().replace(/,/g, '');
    if (!text) return NaN;
    const direct = Number(text.replace(/%$/, ''));
    if (Number.isFinite(direct)) return direct;
    const match = text.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/);
    if (!match) return NaN;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  // Layout C: transposed parameters — one row of column headers, next row = values.
  // Detected when any cell in a row contains 'ball screw pitch' (specific enough to be unambiguous).
  // Each column becomes a synthetic [label, value] Layout-B row appended to allRows.
  const transposedHeaderIdx = rows.findIndex(row =>
    Array.isArray(row) &&
    row.length > 5 &&
    row.some(cell => normalizeLabel(cell).includes('ball screw pitch'))
  );
  const allRows = transposedHeaderIdx >= 0 && transposedHeaderIdx + 1 < rows.length
    ? [
        ...rows,
        ...rows[transposedHeaderIdx].map((h, i) =>
          (h !== null && h !== undefined && String(h).trim())
            ? [h, (rows[transposedHeaderIdx + 1] || [])[i]]
            : null
        ).filter(Boolean),
      ]
    : rows;

  // Temp holders for single-operation step fields
  const importedStep = {};
  // "moving mass" appears twice in the template: first = DATA INPUTS payload, second = guide carriage.
  // The Map maps it to 'guide_mass'; we intercept the first hit as load_mass for steps[0].
  let movingMassHits = 0;

  for (let rowIndex = 0; rowIndex < allRows.length; rowIndex++) {
    const row = allRows[rowIndex];
    if (!row || row.length < 2) continue;

    const match = resolveRow(row);
    if (!match || match.key === '_ignore') continue;

    let { key, value, label: sourceLabel } = match;

    if (TEXT_FIELDS.has(key)) {
      if (!assignOnce(key)) continue;
      const textValue = String(value || '').trim();
      if (textValue) {
        state[key] = textValue;
        updated++;
      }
      continue;
    }

    // Text direction fields — map human-readable strings to state enum values
    if (STEP_TEXT_FIELDS.has(key)) {
      if (!assignOnce(key)) continue;
      const raw = String(value || '').toLowerCase().trim();
      if (key === '_text_external_force_dir') {
        const dir = raw.includes('aid') ? 'aiding' : 'opposing';
        importedStep.external_force_dir = dir;
        updated++;
      } else if (key === '_text_movement_dir') {
        const dir = (raw.includes('aid') || raw.includes('with')) ? 'with_gravity' : 'against_gravity';
        importedStep.movement_dir = dir;
        updated++;
      }
      continue;
    }

    // LM Guide present: 'guide shaft with linear bushing' → 2, otherwise → 1 (LM guide)
    if (key === '_text_has_lm_guide') {
      if (!assignOnce(key)) continue;
      const raw = String(value || '').toLowerCase().trim();
      state.has_lm_guide = raw.includes('guide shaft') || raw.includes('bushing') ? 2 : 1;
      updated++;
      continue;
    }

    // Parallel Kit needed: yes → 1, no → 0
    if (key === '_text_has_parallel_kit') {
      if (!assignOnce(key)) continue;
      const raw = String(value || '').toLowerCase().trim();
      state.has_parallel_kit = raw.includes('yes') ? 1 : 0;
      updated++;
      continue;
    }

    // Gearbox needed: yes → 1, no → 0
    if (key === '_text_has_gearbox') {
      if (!assignOnce(key)) continue;
      const raw = String(value || '').toLowerCase().trim();
      state.has_gearbox = raw.includes('yes') ? 1 : 0;
      console.log('[CV] _text_has_gearbox: raw=', JSON.stringify(raw), '→ has_gearbox=', state.has_gearbox);
      updated++;
      continue;
    }

    // Counterbalance present: none/no → 0, guide_shaft → 'guide_shaft', pulley → 'pulley', yes → 'guide_shaft'
    if (key === '_text_has_counterbalance') {
      if (!assignOnce(key)) continue;
      const raw = String(value || '').toLowerCase().trim();
      if (raw === 'guide_shaft' || raw.includes('guide') || raw.includes('shaft')) state.has_counterbalance = 'guide_shaft';
      else if (raw === 'pulley' || raw.includes('pulley')) state.has_counterbalance = 'pulley';
      else if (raw.includes('yes')) state.has_counterbalance = 'guide_shaft'; // legacy yes → guide_shaft
      else state.has_counterbalance = 0;
      updated++;
      continue;
    }

    if (key === 'project_stn' || key === 'project_appl') {
      if (!assignOnce(key)) continue;
      state[key] = String(value || '').trim();
      updated++;
      continue;
    }

    if (key === '_text_bs_material') {
      if (!assignOnce(key)) continue;
      const raw = String(value || '').toLowerCase().trim();
      if (raw.includes('stainless') || raw.includes('ss')) state.bs_material = 'stainless';
      else if (raw.includes('alum') || raw.includes('al')) state.bs_material = 'aluminum';
      else state.bs_material = 'steel';
      updated++;
      continue;
    }


    const parsed = parseNumericCell(value);
    if (isNaN(parsed)) continue;

    // "moving mass": first hit → payload (steps[0].load_mass), second hit → guide_mass
    if (key === 'guide_mass') {
      if (!assignOnce(key)) continue;
      if (stepsFromTable === 0 && movingMassHits === 0) {
        importedStep.load_mass = parsed;
        updated++;
      } else {
        state.guide_mass = parsed;
        updated++;
      }
      movingMassHits++;
      continue;
    }

    // Unit conversions and special keys
    if (key === 'bs_max_speed_mms') {
      if (!assignOnce(key)) continue;
      if (state.bs_pitch > 0) { state.bs_max_speed = (parsed / state.bs_pitch) * 60; updated++; }
      continue;
    }
    if (key === 'bs_efficiency_pct') {
      if (!assignOnce(key)) continue;
      state.bs_efficiency = parsed > 1 ? parsed / 100 : parsed; updated++; continue;
    }
    if (key === 'gb_efficiency_pct') {
      if (!assignOnce(key)) continue;
      state.gb_efficiency = parsed > 1 ? parsed / 100 : parsed; updated++; continue;
    }
    if (key === 'gb_backlash') {
      if (!assignOnce(key)) continue;
      state.gb_backlash = parsed;
      console.log('[CV] gb_backlash set to', parsed, 'from label=', sourceLabel, 'value=', value);
      lastExcelImportTrace = {
        sheetName: sheetName || 'Excel',
        rowNumber: rowIndex + 1,
        label: String(sourceLabel ?? row[0] ?? row[1] ?? '').trim(),
        value: parsed,
        key,
      };
      updated++;
      continue;
    }
    if (key === 'pk_inertia_mm2') {
      if (!assignOnce(key)) continue;
      state.pk_inertia = parsed * 1e-6; updated++; continue;
    }
    if (key === 'acc_pct') {
      if (!assignOnce(key)) continue;
      state.acc_pct = parsed <= 1 ? parsed * 100 : parsed; updated++; continue;
    }
    if (key === 'safety_factor') {
      if (!assignOnce(key)) continue;
      state.safety_factor = parsed <= 1 ? parsed * 100 : parsed; updated++; continue;
    }

    // Collect step-level fields separately (only when no step table was parsed)
    if (STEP_FIELDS.has(key) && stepsFromTable === 0) {
      if (!assignOnce(key)) continue;
      importedStep[key] = parsed;
      updated++;
      continue;
    }

    if (key === 'gb_ratio') console.log('[CV] gb_ratio set to', parsed, 'from value=', value);
    if (!assignOnce(key)) continue;
    state[key] = parsed;
    updated++;
  }

  // Promote single-operation step fields into steps[0] when no step table was found.
  // This handles the "Servo Inputs" template sheet where stroke, move_time etc. appear
  // as individual key-value rows rather than as a tabular step list.
  if (stepsFromTable === 0 && Object.keys(importedStep).length > 0) {
    if (!Array.isArray(state.steps) || state.steps.length === 0) {
      state.steps = [{ label: 'Step 1', stroke: 15, move_time: 1.0, external_force: 250, load_mass: 1.0 }];
    }
    Object.assign(state.steps[0], importedStep);
  }

  return updated;
}

function loadExcelFile(file) {
  if (!window.XLSX) {
    setExcelStatus('SheetJS library is required for Excel import.', true);
    return;
  }

  const reader = new FileReader();
  reader.onload = event => {
    try {
      lastExcelImportTrace = null;
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetNames = workbook.SheetNames;

      // Calculator Excel import: motion steps only.
      // Find the first sheet that looks like motion steps (by name), else use the first sheet.
      const stepSheetName = sheetNames.find(n => {
        const nl = n.toLowerCase();
        return nl === 'motion steps' || nl === 'steps' || nl === 'motion step';
      }) || sheetNames[0];

      let stepsUpdated = 0;
      if (stepSheetName) {
        const stepSheet = workbook.Sheets[stepSheetName];
        const stepRows = XLSX.utils.sheet_to_json(stepSheet, { header: 1, blankrows: true });
        stepsUpdated = parseExcelStepRows(stepRows);
      }

      const totalUpdated = stepsUpdated;

      if (totalUpdated > 0) {
        saveState();
        renderInputs();
        render();
        setExcelStatus(`Imported ${stepsUpdated} motion step(s) from "${stepSheetName}".`);
      } else {
        setExcelStatus('No motion steps found in the uploaded file. Use the template.', true);
        setExcelTrace(null);
      }
    } catch (error) {
      console.error(error);
      setExcelStatus('File could not be parsed. Check it is an .xlsx file.', true);
      setExcelTrace(null);
    }
  };
  reader.readAsArrayBuffer(file);
}

function addMovementStep() {
  state.steps.push({
    label: `Step ${state.steps.length + 1}`,
    stroke: 15,
    move_time: 1.0,
    dwell_time: 0.1,
    external_force: 250,
    load_mass: 1.0,
  });
  saveState();
  renderInputs();
  render();
}

function removeMovementStep(index) {
  if (state.steps.length <= 1) return;
  state.steps.splice(index, 1);
  saveState();
  renderInputs();
  render();
}

function bindInputs() {
  document.querySelectorAll('[data-key]').forEach(el => {
    el.addEventListener('input', handleInput);
  });

  document.querySelectorAll('.component-tab').forEach(btn => {
    btn.addEventListener('click', () => switchComponentTab(btn.dataset.tab));
  });
  switchComponentTab(activeComponentTab);

  const movementContainer = document.getElementById('movement-steps-container');
  if (movementContainer) {
    movementContainer.addEventListener('input', handleInput);
    movementContainer.addEventListener('click', event => {
      const button = event.target.closest('.remove-step');
      if (!button) return;
      removeMovementStep(Number(button.dataset.step));
    });
  }

  const addStepButton = document.getElementById('add-step-button');
  if (addStepButton) {
    addStepButton.addEventListener('click', event => {
      event.preventDefault();
      addMovementStep();
    });
  }
}

function resetToDefaults() {
  state = { ...DEFAULT_STATE };
  selectedMotorIdx = -1;
  saveState();
  renderInputs();
  render();
}

function restoreState() {
  loadState();
  selectedMotorIdx = Number(localStorage.getItem('servoSelectedMotor') || localStorage.getItem('titanServoSelectedMotor') || -1);
  localStorage.removeItem('titanServoSelectedMotor'); // remove legacy key
  if (selectedMotorIdx < 0 || selectedMotorIdx >= MOTOR_DB.length) selectedMotorIdx = -1;

  // Sync component presence flags from the project configurator settings.
  // projCfg is authoritative for which hardware is on the axis.
  const _ctx = (typeof Projects !== 'undefined') ? Projects.getContext() : null;
  const _cfg = _ctx ? (Projects.get(_ctx.projectId)?.config || null) : null;
  if (_cfg) {
    if (_cfg.bs_type)          state.bs_type          = _cfg.bs_type;
    if (_cfg.has_gearbox)      state.has_gearbox      = 1;
    if (_cfg.has_parallel_kit) state.has_parallel_kit = 1;
    if (_cfg.has_lm_guide !== undefined) state.has_lm_guide = _cfg.has_lm_guide ? 1 : 1;
    // Always apply counterbalance type from configurator — ensures stale numeric
    // has_counterbalance = 1 (old format) doesn't leave the select blank.
    if (_cfg.counterbalance === 'none') {
      state.has_counterbalance = 0;
    } else if (_cfg.counterbalance === 'guide_shaft' || _cfg.counterbalance === 'pulley') {
      state.has_counterbalance = _cfg.counterbalance;
    }
  }

  // Normalise state before the first renderInputs() call so the selects always
  // receive a value that matches one of their options.
  normalizeState();
}

function saveMotorSelection() {
  localStorage.setItem('servoSelectedMotor', selectedMotorIdx.toString());
}

function init() {
  restoreState();
  renderInputs();
  bindInputs();
  render();

  const resetButton = document.getElementById('reset-button');
  if (resetButton) {
    resetButton.addEventListener('click', event => {
      event.preventDefault();
      resetToDefaults();
    });
  }

  const saveButton = document.getElementById('save-button');
  if (saveButton) {
    saveButton.addEventListener('click', event => {
      event.preventDefault();
      saveState();
      saveMotorSelection();
      const message = document.getElementById('save-message');
      if (message) {
        message.textContent = 'Settings saved locally.';
        setTimeout(() => { message.textContent = ''; }, 2500);
      }
    });
  }

  const excelInput = document.getElementById('excel-file-input');
  if (excelInput) {
    excelInput.addEventListener('change', event => {
      const file = event.target.files[0];
      if (file) {
        loadExcelFile(file);
        event.target.value = '';
      }
    });
  }

  const inventoryInput = document.getElementById('inventory-file-input');
  if (inventoryInput) {
    inventoryInput.addEventListener('change', event => {
      const file = event.target.files[0];
      if (file) { loadInventoryFile(file); inventoryInput.value = ''; }
    });
  }

  // Chart visibility checkboxes
  [
    ['show-motion-profile',    'motion-profile-section',    renderMotionProfileChart],
    ['show-torque-chart',      'torque-chart-section',      renderTorqueChart],
    ['show-displacement-chart','displacement-chart-section', renderDisplacementChart],
  ].forEach(([cbId, sectionId, fn]) => {
    const cb = document.getElementById(cbId);
    const section = document.getElementById(sectionId);
    if (!cb || !section) return;
    cb.addEventListener('change', () => {
      section.style.display = cb.checked ? '' : 'none';
      if (cb.checked) fn();
    });
  });

  ['motion-phase-accel', 'motion-phase-const', 'motion-phase-decel', 'motion-phase-dwell', 'motion-show-labels']
    .forEach(id => {
      const cb = document.getElementById(id);
      if (cb) cb.addEventListener('change', renderMotionProfileChart);
    });

  const downloadTemplateButton = document.getElementById('download-template-button');
  if (downloadTemplateButton) {
    downloadTemplateButton.addEventListener('click', event => {
      event.preventDefault();
      downloadMotionStepsTemplate();
    });
  }


  // Project context banner — injected when launched from project.html
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('ctx')) {
    injectProjectContextBanner();
  }
}

function injectProjectContextBanner() {
  let ctx = null;
  try { ctx = JSON.parse(localStorage.getItem('servoContext') || localStorage.getItem('titanServoContext') || 'null'); } catch { /* ignore */ }
  if (!ctx) return;

  const banner = document.createElement('div');
  banner.id = 'project-context-banner';
  banner.style.cssText = [
    'position:sticky','top:0','z-index:50',
    'background:#1e40af','color:#fff',
    'display:flex','align-items:center','justify-content:space-between',
    'padding:8px 24px','font-size:13px','font-weight:600',
    'box-shadow:0 2px 8px rgba(0,0,0,.2)',
  ].join(';');

  const label = document.createElement('span');
  label.textContent = `Editing application "${ctx.servoName}" — ${ctx.projectName}`;

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save & Return to Project';
  saveBtn.style.cssText = [
    'background:#fff','color:#1e40af',
    'border:none','border-radius:6px',
    'padding:5px 14px','font-size:12px','font-weight:700',
    'cursor:pointer','transition:background .15s',
  ].join(';');
  saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = '#dbeafe'; });
  saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = '#fff'; });

  saveBtn.addEventListener('click', () => {
    saveState();
    saveMotorSelection();
    persistServoToProject(ctx);
    Projects.clearContext();
    window.location.href = 'project.html?id=' + ctx.projectId;
  });

  banner.appendChild(label);
  banner.appendChild(saveBtn);
  document.body.insertBefore(banner, document.body.firstChild);
}

/* Writes the current motor / ball screw / gearbox / servo drive picks back into the Projects
   store for this application, so the project card and Excel export reflect them without the
   designer having to remember to click "Save & Return to Project" — render() calls this on every
   render while a project context is active (cheap: same cost class as the saveState() calls that
   already happen on every input edit), and the explicit button still calls it too before
   navigating back. */
function persistServoToProject(ctx) {
  if (!ctx || !window.Projects) return;

  let status = 'NO MOTOR';
  let motorPN = null;
  if (selectedMotorIdx >= 0 && selectedMotorIdx < MOTOR_DB.length && lastResult) {
    const motor = MOTOR_DB[selectedMotorIdx];
    motorPN = motor.pn;
    const J_rotor = motor.Jmot * 1e-4;
    const speedOk  = lastResult.Nmotor <= motor.Nn;
    const torqueOk = lastResult.T_peak_motor <= motor.Mn;
    const inertiaOk = (lastResult.I_motor + J_rotor) / J_rotor <= state.sm_permitted_inertia_ratio;
    const needsBrakeCtx = Number(state.tilt_deg) !== 0;
    const brakeOk = !needsBrakeCtx || motor.brake;
    status = (speedOk && torqueOk && inertiaOk && brakeOk) ? 'PASS' : 'FAIL';
  }

  // Save key result metrics so the project export can display them without re-running the calculator
  let metrics = null;
  if (selectedMotorIdx >= 0 && selectedMotorIdx < MOTOR_DB.length && lastResult) {
    const m = MOTOR_DB[selectedMotorIdx];
    const permRatioValue = toFiniteNumber(state.sm_permitted_inertia_ratio);
    const permRatio = permRatioValue && permRatioValue > 0 ? permRatioValue : 7;
    metrics = {
      Nmotor: Math.round(lastResult.Nmotor),
      T_peak_motor: +lastResult.T_peak_motor.toFixed(3),
      inertia_ratio: lastResult.inertia_ratio !== null ? +lastResult.inertia_ratio.toFixed(3) : null,
      speedUtil:    Math.round(lastResult.Nmotor / m.Nn * 100),
      torqueUtil:   Math.round(lastResult.T_peak_motor / m.Mn * 100),
      inertiaUtil:  lastResult.inertia_ratio !== null
        ? Math.round(lastResult.inertia_ratio / permRatio * 100)
        : null,
      motorKW: m.kW,
      motorMn: m.Mn,
      motorNn: m.Nn,
    };
  }
  // Save the pre-selected catalog picks (ball screw / gearbox / servo drive) alongside the
  // motor, so the project card and Excel export can show the full drivetrain without
  // re-running the calculator for this application.
  const ballScrew = (typeof getAppliedBallScrew === 'function') ? getAppliedBallScrew() : null;
  const gearbox = (typeof getAppliedGearbox === 'function') ? getAppliedGearbox() : null;
  const drive = (typeof getRecommendedDrive === 'function') ? getRecommendedDrive() : null;
  const components = {
    ballScrewPn: ballScrew ? ballScrew.pn : null,
    gearboxPn: gearbox ? gearbox.pn : null,
    drivePn: drive ? drive.pn : null,
  };
  Projects.updateServo(ctx.projectId, ctx.servoId, {
    state: JSON.parse(JSON.stringify(state)),
    motorIdx: selectedMotorIdx,
    motor: motorPN,
    status,
    metrics,
    components,
  });
}

/* ─────────────────────────────────────────────
   MOTION PROFILE CHART
   Trapezoidal velocity (mm/s) across all steps.
   acc_pct is now a shared project-level value.
───────────────────────────────────────────── */
function renderMotionProfileChart() {
  const canvas = document.getElementById('motion-profile-canvas');
  const legend = document.getElementById('motion-profile-legend');
  const summary = document.getElementById('motion-profile-summary');
  if (!canvas) return;
  const opts = getMotionProfileDisplayOptions();

  const dpr  = window.devicePixelRatio || 1;
  const W    = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 860;
  const H    = 260;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 28, right: 24, bottom: 52, left: 70 };
  const pw  = W - PAD.left - PAD.right;
  const ph  = H - PAD.top  - PAD.bottom;

  // Build segments ─────────────────────────────
  const COLORS = ['#1d4ed8','#16a34a','#b45309','#9333ea','#dc2626','#0891b2','#c2410c','#15803d'];
  const segs = [];
  let totalT = 0, maxV = 0;

  state.steps.forEach((step, i) => {
    const { avail, t_acc, t_dec, t_const } = getStepTimings(step, state);
    const Vmax    = getPeakLinearSpeed(step, state);   // mm/s
    maxV = Math.max(maxV, Vmax);
    segs.push({
      label:     step.label || `Step ${i + 1}`,
      t_acc, t_const, t_dec,
      dwell:     step.dwell_time ?? 0,
      Vmax,
      total:     t_acc + t_const + t_dec + (step.dwell_time ?? 0),
      color:     COLORS[i % COLORS.length],
      load_mass: step.load_mass,
      tilt_deg:  state.tilt_deg,
    });
    totalT += t_acc + t_const + t_dec + (step.dwell_time ?? 0);
  });

  if (summary) {
    summary.innerHTML = segs.map(seg => `
      <span style="display:inline-flex;flex-direction:column;gap:4px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--surface);font-size:12px;color:var(--sub);">
        <strong style="color:var(--text);font-size:12px;">${seg.label}</strong>
        <span class="mono">Vmax ${seg.Vmax.toFixed(1)} mm/s</span>
        <span class="mono">ta ${seg.t_acc.toFixed(2)}s · tc ${seg.t_const.toFixed(2)}s · td ${seg.t_dec.toFixed(2)}s · dw ${seg.dwell.toFixed(2)}s</span>
      </span>
    `).join('');
  }

  if (maxV === 0) maxV = 1;
  const tX = t => PAD.left + (t / totalT) * pw;
  const vY = v => PAD.top  + ph - (v / maxV) * ph;

  // Grid ────────────────────────────────────────
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth   = 1;
  ctx.fillStyle   = '#6b7280';
  ctx.font        = '11px Inter,system-ui,sans-serif';
  ctx.textAlign   = 'right';
  const vTicks = 5;
  for (let k = 0; k <= vTicks; k++) {
    const y = PAD.top + ph - (k / vTicks) * ph;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + pw, y); ctx.stroke();
    ctx.fillText(((k / vTicks) * maxV).toFixed(0), PAD.left - 8, y + 4);
  }

  // Y-axis label
  ctx.save();
  ctx.translate(14, PAD.top + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Velocity (mm/s)', 0, 0);
  ctx.restore();

  // Phase labels key
  const phaseY = PAD.top - 10;
  [
    ['#1d4ed8','Accel', opts.showAccel],
    ['#16a34a','Constant', opts.showConst],
    ['#b45309','Decel', opts.showDecel],
    ['#9ca3af','Dwell', opts.showDwell],
  ].forEach(([c, lbl, enabled], i) => {
    ctx.fillStyle = enabled ? c : '#d1d5db';
    ctx.fillRect(PAD.left + i * 100, phaseY, 12, 8);
    ctx.fillStyle = '#374151'; ctx.textAlign = 'left'; ctx.font = '10px Inter,system-ui,sans-serif';
    ctx.fillText(`${lbl}${enabled ? '' : ' (off)'}`, PAD.left + i * 100 + 15, phaseY + 7);
  });

  // Draw each step ──────────────────────────────
  let cursor = 0;
  segs.forEach(seg => {
    const phases = [
      { key: 'showAccel', label: 'A',  t: seg.t_acc,   v0: 0,        v1: seg.Vmax, shade: '#3b82f620', color: '#3b82f6' },
      { key: 'showConst', label: 'C',  t: seg.t_const, v0: seg.Vmax,  v1: seg.Vmax, shade: '#22c55e20', color: '#16a34a' },
      { key: 'showDecel', label: 'D',  t: seg.t_dec,   v0: seg.Vmax,  v1: 0,        shade: '#f9731620', color: '#b45309' },
      { key: 'showDwell', label: 'Dw', t: seg.dwell,   v0: 0,        v1: 0,        shade: '#e5e7eb40', color: '#9ca3af' },
    ];

    let t = cursor;
    phases.forEach(ph => {
      if (ph.t <= 0 || !opts[ph.key]) {
        t += ph.t;
        return;
      }
      ctx.beginPath();
      ctx.moveTo(tX(t),        vY(ph.v0));
      ctx.lineTo(tX(t + ph.t), vY(ph.v1));
      ctx.lineTo(tX(t + ph.t), vY(0));
      ctx.lineTo(tX(t),        vY(0));
      ctx.closePath();
      ctx.fillStyle = ph.shade;
      ctx.fill();
      if (opts.showLabels && ph.t > 0.04) {
        const midT = t + ph.t / 2;
        const midV = Math.max(ph.v0, ph.v1) * 0.55;
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 10px Inter,system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${ph.label} ${ph.t.toFixed(2)}s`, tX(midT), vY(midV));
      }
      t += ph.t;
    });

    // Outline
    ctx.beginPath();
    ctx.moveTo(tX(cursor), vY(0));
    ctx.lineTo(tX(cursor + seg.t_acc), vY(seg.Vmax));
    ctx.lineTo(tX(cursor + seg.t_acc + seg.t_const), vY(seg.Vmax));
    ctx.lineTo(tX(cursor + seg.t_acc + seg.t_const + seg.t_dec), vY(0));
    ctx.lineTo(tX(cursor + seg.t_acc + seg.t_const + seg.t_dec + seg.dwell), vY(0));
    ctx.strokeStyle = seg.color;
    ctx.lineWidth   = 2.5;
    ctx.stroke();

    // Step label at peak
    const midT = cursor + seg.t_acc + seg.t_const / 2;
    if (seg.Vmax > 0) {
      ctx.fillStyle = seg.color;
      ctx.font      = 'bold 11px Inter,system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${seg.label} · ${seg.Vmax.toFixed(1)} mm/s`, tX(midT), vY(seg.Vmax) - 8);
    }

    cursor += seg.t_acc + seg.t_const + seg.t_dec + seg.dwell;
  });

  // X-axis ticks ────────────────────────────────
  ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1;
  const xTicks = Math.min(12, Math.ceil(totalT / 0.25));
  ctx.fillStyle = '#6b7280'; ctx.font = '10px Inter,system-ui,sans-serif'; ctx.textAlign = 'center';
  for (let k = 0; k <= xTicks; k++) {
    const t = (k / xTicks) * totalT;
    const x = tX(t);
    ctx.beginPath(); ctx.moveTo(x, PAD.top + ph); ctx.lineTo(x, PAD.top + ph + 5); ctx.stroke();
    ctx.fillText(t.toFixed(2) + 's', x, PAD.top + ph + 18);
  }
  ctx.fillStyle = '#374151'; ctx.textAlign = 'center';
  ctx.fillText('Time (s)', PAD.left + pw / 2, H - 4);

  // Legend ──────────────────────────────────────
  if (legend) {
    const totalCycle = state.steps.reduce((s, st) => s + st.move_time, 0);
    legend.innerHTML =
      segs.map(seg => `
        <span style="display:flex;align-items:center;gap:5px;">
          <span style="width:12px;height:12px;border-radius:3px;background:${seg.color};display:inline-block;flex-shrink:0;"></span>
          <span>
            <strong>${seg.label}</strong> —
            Vmax ${seg.Vmax.toFixed(1)} mm/s ·
            acc ${seg.t_acc.toFixed(2)}s · const ${seg.t_const.toFixed(2)}s · dec ${seg.t_dec.toFixed(2)}s · dwell ${seg.dwell.toFixed(2)}s ·
            mass ${Number(seg.load_mass).toFixed(1)} kg · tilt ${Number(state.tilt_deg).toFixed(0)}°
          </span>
        </span>`).join('') +
      `<span style="margin-left:auto;font-weight:700;color:var(--text);white-space:nowrap;">Total cycle: ${totalCycle.toFixed(2)} s</span>`;
  }
}

/* ─────────────────────────────────────────────
   VELOCITY CHART — clean mm/s curve
───────────────────────────────────────────── */
function renderVelocityChart() {
  const canvas = document.getElementById('velocity-chart-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 860;
  const H = 220;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const PAD = { top: 24, right: 24, bottom: 44, left: 70 };
  const pw = W - PAD.left - PAD.right, ph = H - PAD.top - PAD.bottom;

  const COLORS = ['#1d4ed8','#16a34a','#b45309','#9333ea','#dc2626','#0891b2','#c2410c','#15803d'];
  let totalT = 0, maxV = 0;
  const segs = state.steps.map((step, i) => {
    const { avail, t_acc, t_dec, t_const } = getStepTimings(step, state);
    const Vmax = getPeakLinearSpeed(step, state);
    maxV = Math.max(maxV, Vmax);
    totalT += t_acc + t_const + t_dec + (step.dwell_time ?? 0);
    return { t_acc, t_const, t_dec, dwell: step.dwell_time ?? 0, Vmax, color: COLORS[i % COLORS.length], label: step.label || `Step ${i+1}` };
  });
  if (maxV === 0) maxV = 1;
  const tX = t => PAD.left + (t / totalT) * pw;
  const vY = v => PAD.top + ph - (v / maxV) * ph;

  // Grid
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  ctx.fillStyle = '#6b7280'; ctx.font = '11px Inter,system-ui,sans-serif'; ctx.textAlign = 'right';
  for (let k = 0; k <= 4; k++) {
    const y = PAD.top + ph - (k / 4) * ph;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + pw, y); ctx.stroke();
    ctx.fillText(((k / 4) * maxV).toFixed(0), PAD.left - 8, y + 4);
  }
  ctx.save(); ctx.translate(14, PAD.top + ph / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center'; ctx.fillText('Velocity (mm/s)', 0, 0); ctx.restore();

  // Draw curves
  let cursor = 0;
  segs.forEach(seg => {
    ctx.beginPath();
    ctx.moveTo(tX(cursor), vY(0));
    ctx.lineTo(tX(cursor + seg.t_acc), vY(seg.Vmax));
    ctx.lineTo(tX(cursor + seg.t_acc + seg.t_const), vY(seg.Vmax));
    ctx.lineTo(tX(cursor + seg.t_acc + seg.t_const + seg.t_dec), vY(0));
    if (seg.dwell > 0) ctx.lineTo(tX(cursor + seg.t_acc + seg.t_const + seg.t_dec + seg.dwell), vY(0));
    ctx.strokeStyle = seg.color; ctx.lineWidth = 2.5; ctx.stroke();
    // Fill
    ctx.lineTo(tX(cursor), vY(0)); ctx.closePath();
    ctx.fillStyle = seg.color + '18'; ctx.fill();
    // Peak label
    const midT = cursor + seg.t_acc + seg.t_const / 2;
    ctx.fillStyle = seg.color; ctx.font = 'bold 10px Inter,system-ui,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${seg.label} ${seg.Vmax.toFixed(0)} mm/s`, tX(midT), vY(seg.Vmax) - 8);
    cursor += seg.t_acc + seg.t_const + seg.t_dec + seg.dwell;
  });

  // X axis
  ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1;
  ctx.fillStyle = '#6b7280'; ctx.font = '10px Inter,system-ui,sans-serif';
  const xTicks = Math.min(12, Math.ceil(totalT / 0.25));
  for (let k = 0; k <= xTicks; k++) {
    const t = (k / xTicks) * totalT, x = tX(t);
    ctx.beginPath(); ctx.moveTo(x, PAD.top + ph); ctx.lineTo(x, PAD.top + ph + 5); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(t.toFixed(2) + 's', x, PAD.top + ph + 18);
  }
  ctx.fillStyle = '#374151'; ctx.textAlign = 'center';
  ctx.fillText('Time (s)', PAD.left + pw / 2, H - 4);
}

/* ─────────────────────────────────────────────
   TORQUE CHART — Nm at motor shaft over time
───────────────────────────────────────────── */
function renderTorqueChart() {
  const canvas = document.getElementById('torque-chart-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 860;
  const H = 320;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const PAD = { top: 36, right: 24, bottom: 68, left: 70 };
  const pw = W - PAD.left - PAD.right, ph = H - PAD.top - PAD.bottom;

  // Compute per-step torques
  const pitch_m = state.bs_pitch / 1000;
  const pkEnabled = Number(state.has_parallel_kit) !== 0;
  const gbEnabled = Number(state.has_gearbox) !== 0;
  const eff_ratio = (pkEnabled ? state.pk_ratio : 1) * (gbEnabled ? state.gb_ratio : 1);
  const eff_eff   = gbEnabled ? state.gb_efficiency : 1;
  const pkNL      = pkEnabled ? state.pk_no_load_torque : 0;
  const gbNL      = gbEnabled ? state.gb_no_load_torque : 0;

  const COLORS = ['#1d4ed8','#16a34a','#b45309','#9333ea','#dc2626','#0891b2','#c2410c','#15803d'];
  let totalT = 0, maxT = 0.001;
  const segs = state.steps.map((step, i) => {
    const { avail, t_acc, t_dec, t_const } = getStepTimings(step, state);
    const Vmax_m = getPeakLinearSpeed(step, state) / 1000;
    const total_mass = step.load_mass + state.guide_mass
                     + state.bs_nut_mass
                     + state.guide_n_blocks * state.guide_block_mass;

    // Axial force — three independent sign matrices
    const theta = state.tilt_deg * Math.PI / 180;
    // External force sign matrix
    const ext_sign_acc_c = step.external_force_dir === 'aiding' ? -1 : 1;
    const ext_sign_dec_c = step.external_force_dir === 'aiding' ? 1  : -1;
    // Gravitational force sign matrix
    const grav_sign_acc  = step.movement_dir === 'with_gravity' ? -1 : 1;
    const grav_sign_dec  = step.movement_dir === 'with_gravity' ? 1  : -1;
    const F_grav     = grav_sign_acc * total_mass * 9.81 * Math.sin(theta);
    const F_grav_dec = grav_sign_dec * total_mass * 9.81 * Math.sin(theta);
    const F_pl_c     = total_mass * 9.81 * state.mu * Math.cos(theta);
    const F_cb_fr    = (Number(state.cb_n_bushings) || 0) * (Number(state.cb_bushing_friction_force) || 0);
    const F_fric_c   = F_pl_c + state.guide_n_blocks * state.guide_force + F_cb_fr;
    // Counterbalance force sign matrix
    let F_cb = 0, F_cb_dec = 0;
    if (state.has_counterbalance && state.has_counterbalance !== 0) {
      const cb_sign_acc = step.movement_dir === 'with_gravity' ? 1  : -1;
      const cb_sign_dec = step.movement_dir === 'with_gravity' ? -1 : 1;
      const th_cb = state.cb_angle_deg * Math.PI / 180;
      const F_cb_raw = state.cb_mass * 9.81 * (Math.sin(th_cb) + state.cb_mu * Math.cos(th_cb));
      F_cb     = cb_sign_acc * F_cb_raw;
      F_cb_dec = cb_sign_dec * F_cb_raw;
    }
    const F_axial       = ext_sign_acc_c * step.external_force + F_grav     + F_fric_c + F_cb;
    const F_axial_decel = ext_sign_dec_c * step.external_force + F_grav_dec + F_fric_c + F_cb_dec;
    const T_axial       = pitch_m > 0 ? F_axial       * pitch_m / (2 * Math.PI * state.bs_efficiency) : 0;
    const T_axial_decel = pitch_m > 0 ? F_axial_decel * pitch_m / (2 * Math.PI * state.bs_efficiency) : 0;
    const T_preload = state.bs_preload_torque;
    const bearingDragPreview = getBearingDragComponents();
    const T_bs_load       = T_axial       + T_preload + bearingDragPreview.total + pkNL;
    const T_bs_load_decel = T_axial_decel + T_preload + bearingDragPreview.total + pkNL;

    const BS_DENSITY_C = { steel: 7870, stainless: 7930, aluminum: 2700 };
    const Jrm_c = (Math.PI / 32) * (BS_DENSITY_C[state.bs_material] || 7870) * (state.bs_length / 1000) * Math.pow(state.bs_dia / 1000, 4);
    const J_ref  = (total_mass * Math.pow(pitch_m / (2 * Math.PI), 2)) + Jrm_c + (pkEnabled ? state.pk_inertia : 0) + (gbEnabled ? state.gb_inertia : 0);
    const Nsc_c  = pitch_m > 0 ? Vmax_m * 1000 / state.bs_pitch * 60 : 0;
    const T_acc  = t_acc > 0 ? J_ref * Nsc_c / (9.55 * t_acc) : 0;
    const T_dec  = t_dec > 0 ? J_ref * Nsc_c / (9.55 * t_dec) : 0;

    const SF_c = 1 + state.safety_factor / 100;
    const T_load_m  = eff_ratio > 0 ? Math.abs(T_bs_load)       / (eff_ratio * eff_eff) + gbNL : 0;
    const T_peak_m  = eff_ratio > 0 ? Math.abs(T_bs_load + T_acc)       * SF_c / (eff_ratio * eff_eff) + gbNL : 0;
    const T_decel_m = eff_ratio > 0 ? Math.abs(T_bs_load_decel  - T_dec) * SF_c / (eff_ratio * eff_eff) + gbNL : 0;

    maxT = Math.max(maxT, T_peak_m, Math.abs(T_decel_m));
    totalT += t_acc + t_const + t_dec + (step.dwell_time ?? 0);
    return { t_acc, t_const, t_dec, dwell: step.dwell_time ?? 0, T_load_m, T_peak_m, T_decel_m, color: COLORS[i % COLORS.length], label: step.label || `Step ${i+1}` };
  });

  const tX = t => PAD.left + (t / totalT) * pw;
  const tY = t => PAD.top + ph - (Math.max(0, t) / maxT) * ph;

  // Grid
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  ctx.fillStyle = '#6b7280'; ctx.font = '11px Inter,system-ui,sans-serif'; ctx.textAlign = 'right';
  for (let k = 0; k <= 4; k++) {
    const y = PAD.top + ph - (k / 4) * ph;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + pw, y); ctx.stroke();
    ctx.fillText(((k / 4) * maxT).toFixed(3), PAD.left - 8, y + 4);
  }
  ctx.save(); ctx.translate(14, PAD.top + ph / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center'; ctx.fillText('Torque (Nm)', 0, 0); ctx.restore();

  // Phase legend
  const phaseY = PAD.top - 10;
  [['#3b82f6','Accel'], ['#22c55e','Constant'], ['#f97316','Decel']].forEach(([c, lbl], i) => {
    ctx.fillStyle = c; ctx.fillRect(PAD.left + i * 90, phaseY, 10, 8);
    ctx.fillStyle = '#374151'; ctx.textAlign = 'left'; ctx.font = '10px Inter,system-ui,sans-serif';
    ctx.fillText(lbl, PAD.left + i * 90 + 13, phaseY + 7);
  });

  // Smart torque formatter: trim trailing zeros while keeping enough precision
  const fmtT = v => {
    const a = Math.abs(v);
    return (a >= 10 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : v.toFixed(3)) + ' Nm';
  };

  // Draw a torque value label above a bar; skip if bar too narrow or y would overflow top
  const drawPhaseLabel = (text, xCenter, barTopY, color, barWidth) => {
    if (barWidth < 32) return;
    ctx.save();
    ctx.font = '9px Inter,system-ui,sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    const y = Math.max(PAD.top + 9, barTopY - 4);
    ctx.fillText(text, xCenter, y);
    ctx.restore();
  };

  const baseY = PAD.top + ph;
  let cursor = 0;
  segs.forEach((seg, si) => {
    const x0 = tX(cursor);
    const x1 = tX(cursor + seg.t_acc);
    const x2 = tX(cursor + seg.t_acc + seg.t_const);
    const x3 = tX(cursor + seg.t_acc + seg.t_const + seg.t_dec);
    const x4 = tX(cursor + seg.t_acc + seg.t_const + seg.t_dec + seg.dwell);

    const yAcc  = tY(seg.T_peak_m);
    const yConst = tY(seg.T_load_m);
    const yDec  = tY(Math.max(0, seg.T_decel_m));

    // Step background stripe (alternating subtle)
    if (si % 2 === 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.015)';
      ctx.fillRect(x0, PAD.top, x4 - x0, ph);
    }

    // Dwell shading
    if (seg.dwell > 0 && x4 > x3) {
      ctx.fillStyle = 'rgba(100,100,100,0.06)';
      ctx.fillRect(x3, PAD.top, x4 - x3, ph);
    }

    // Phase fills
    ctx.fillStyle = '#3b82f618';
    ctx.fillRect(x0, yAcc,  x1 - x0, baseY - yAcc);
    ctx.fillStyle = '#22c55e18';
    ctx.fillRect(x1, yConst, x2 - x1, baseY - yConst);
    ctx.fillStyle = '#f9731618';
    ctx.fillRect(x2, yDec, x3 - x2, baseY - yDec);

    // Outline staircase
    ctx.beginPath();
    ctx.moveTo(x0, baseY);
    ctx.lineTo(x0, yAcc);
    ctx.lineTo(x1, yAcc);
    ctx.lineTo(x1, yConst);
    ctx.lineTo(x2, yConst);
    ctx.lineTo(x2, yDec);
    ctx.lineTo(x3, yDec);
    ctx.lineTo(x3, baseY);
    ctx.strokeStyle = seg.color; ctx.lineWidth = 2; ctx.stroke();

    // Torque value labels on each phase bar
    drawPhaseLabel(fmtT(seg.T_peak_m),            (x0 + x1) / 2, yAcc,   '#3b82f6', x1 - x0);
    drawPhaseLabel(fmtT(seg.T_load_m),             (x1 + x2) / 2, yConst, '#16a34a', x2 - x1);
    drawPhaseLabel(fmtT(Math.max(0, seg.T_decel_m)),(x2 + x3) / 2, yDec,  '#ea580c', x3 - x2);

    // Step boundary divider
    if (si > 0) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, PAD.top); ctx.lineTo(x0, baseY); ctx.stroke();
      ctx.restore();
    }

    // Step name label in bottom band
    const stepCenterX = (x0 + x4) / 2;
    ctx.save();
    ctx.font = 'bold 10px Inter,system-ui,sans-serif';
    ctx.fillStyle = seg.color;
    ctx.textAlign = 'center';
    ctx.fillText(seg.label, stepCenterX, baseY + 34);
    ctx.restore();

    cursor += seg.t_acc + seg.t_const + seg.t_dec + seg.dwell;
  });

  // X axis line & ticks
  ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1;
  ctx.fillStyle = '#6b7280'; ctx.font = '10px Inter,system-ui,sans-serif';
  const xTicks = Math.min(12, Math.ceil(totalT / 0.25));
  for (let k = 0; k <= xTicks; k++) {
    const t = (k / xTicks) * totalT, x = tX(t);
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY + 5); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(t.toFixed(2) + 's', x, baseY + 16);
  }
  ctx.fillStyle = '#374151'; ctx.textAlign = 'center';
  ctx.fillText('Time (s)', PAD.left + pw / 2, H - 4);
}

/* ─────────────────────────────────────────────
   DISPLACEMENT CHART — mm over time
───────────────────────────────────────────── */
function renderDisplacementChart() {
  const canvas = document.getElementById('displacement-chart-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 860;
  const H = 220;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const PAD = { top: 24, right: 24, bottom: 44, left: 70 };
  const pw = W - PAD.left - PAD.right, ph = H - PAD.top - PAD.bottom;

  const COLORS = ['#1d4ed8','#16a34a','#b45309','#9333ea','#dc2626','#0891b2','#c2410c','#15803d'];
  // Build time-displacement points across all steps (cumulative)
  const points = [{ t: 0, d: 0 }];
  let cursor = 0, cumDist = 0;
  state.steps.forEach((step, i) => {
    const { avail, t_acc, t_dec, t_const } = getStepTimings(step, state);
    const Vmax = getPeakLinearSpeed(step, state);
    const s_acc   = 0.5 * Vmax * t_acc;
    const s_const = Vmax * t_const;
    const s_dec   = 0.5 * Vmax * t_dec;
    // Sample accel phase (parabola)
    const N = 20;
    for (let k = 1; k <= N; k++) {
      const frac = k / N, t = cursor + frac * t_acc;
      const d = cumDist + 0.5 * Vmax * frac * t_acc;
      points.push({ t, d, ci: i });
    }
    // Constant
    points.push({ t: cursor + t_acc + t_const, d: cumDist + s_acc + s_const, ci: i });
    // Decel (parabola)
    for (let k = 1; k <= N; k++) {
      const frac = k / N, t = cursor + t_acc + t_const + frac * t_dec;
      const d = cumDist + s_acc + s_const + Vmax * frac * t_dec - 0.5 * Vmax * frac * frac * t_dec;
      points.push({ t, d, ci: i });
    }
    cumDist += step.stroke;
    cursor  += t_acc + t_const + t_dec;
    // Dwell
    if ((step.dwell_time ?? 0) > 0) {
      points.push({ t: cursor + step.dwell_time, d: cumDist, ci: i });
      cursor += step.dwell_time;
    }
  });

  const totalT   = cursor;
  const maxD     = cumDist || 1;
  const tX = t => PAD.left + (t / totalT) * pw;
  const dY = d => PAD.top + ph - (d / maxD) * ph;

  // Grid
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  ctx.fillStyle = '#6b7280'; ctx.font = '11px Inter,system-ui,sans-serif'; ctx.textAlign = 'right';
  for (let k = 0; k <= 4; k++) {
    const y = PAD.top + ph - (k / 4) * ph;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + pw, y); ctx.stroke();
    ctx.fillText(((k / 4) * maxD).toFixed(0), PAD.left - 8, y + 4);
  }
  ctx.save(); ctx.translate(14, PAD.top + ph / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center'; ctx.fillText('Displacement (mm)', 0, 0); ctx.restore();

  // Draw curve
  ctx.beginPath();
  points.forEach((p, i) => { i === 0 ? ctx.moveTo(tX(p.t), dY(p.d)) : ctx.lineTo(tX(p.t), dY(p.d)); });
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2.5; ctx.stroke();
  // Fill under
  ctx.lineTo(tX(totalT), dY(0)); ctx.lineTo(tX(0), dY(0)); ctx.closePath();
  ctx.fillStyle = '#6366f115'; ctx.fill();

  // Step boundary markers
  cursor = 0;
  state.steps.forEach((step, i) => {
    const { avail, t_acc, t_dec } = getStepTimings(step, state);
    cursor += t_acc + Math.max(0, avail - t_acc - t_dec) + t_dec + (step.dwell_time ?? 0);
    ctx.strokeStyle = '#d1d5db66'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tX(cursor), PAD.top); ctx.lineTo(tX(cursor), PAD.top + ph); ctx.stroke();
  });

  // X axis
  ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1; ctx.fillStyle = '#6b7280'; ctx.font = '10px Inter,system-ui,sans-serif';
  const xTicks = Math.min(12, Math.ceil(totalT / 0.25));
  for (let k = 0; k <= xTicks; k++) {
    const t = (k / xTicks) * totalT, x = tX(t);
    ctx.beginPath(); ctx.moveTo(x, PAD.top + ph); ctx.lineTo(x, PAD.top + ph + 5); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(t.toFixed(2) + 's', x, PAD.top + ph + 18);
  }
  ctx.fillStyle = '#374151'; ctx.textAlign = 'center';
  ctx.fillText('Time (s)', PAD.left + pw / 2, H - 4);
}

/* ─────────────────────────────────────────────
   REPORT — Download only (no UI display)
───────────────────────────────────────────── */
function downloadReport(result) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF library not loaded.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  if (typeof doc.autoTable !== 'function') {
    alert('PDF table plugin not loaded.');
    return;
  }
  const motor = getCurrentMotor(result);
  const sysAcc = calculateSystemAccuracy();
  const dateStr = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 44;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ClusterVise - Servo Sizing Report', marginX, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date: ${dateStr}`, marginX, y);
  y += 18;

  const primaryRows = [
    ['Torque Required at ball screw shaft', `${result.T_peak_bs.toFixed(2)} Nm`],
    ['Total Torque during Acceleration (Tl + Ta)', `${result.T_total_accel.toFixed(3)} Nm`],
    ['Total Torque during Top Speed (Tl)', `${result.T_total_topspeed.toFixed(3)} Nm`],
    ['Total Torque during Deceleration (Tl − Td)', `${result.T_total_decel.toFixed(3)} Nm`],
    ['Acceleration torque at ball screw shaft (Ta)', `${result.T_accel.toFixed(3)} Nm`],
    ['Deceleration torque at ball screw shaft (Td)', `${result.T_decel.toFixed(3)} Nm`],
    ['Fixed side bearing drag torque', `${result.T_fixed_bearing_drag.toFixed(3)} Nm`],
    ['Support side bearing drag torque', `${result.T_support_bearing_drag.toFixed(3)} Nm`],
    ['Speed Required at ball screw shaft', `${Math.round(result.Nscrew)} rpm`],
    ['Linear Speed of ball screw shaft', `${result.Vmax_mm_s.toFixed(1)} mm/s`],
    ['Torque Required at motor shaft', `${result.T_peak_motor.toFixed(2)} Nm`],
    ['Speed Required at motor shaft', `${Math.round(result.Nmotor)} rpm`],
    ['RMS Torque', `${result.T_rms_motor.toFixed(3)} Nm`],
    ['Inertia Ratio', result.inertia_ratio !== null ? result.inertia_ratio.toFixed(2) : '—'],
  ];

  doc.autoTable({
    startY: y,
    head: [['Primary Results', 'Value']],
    body: primaryRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [31, 56, 100] },
    margin: { left: marginX, right: marginX },
  });
  y = doc.lastAutoTable.finalY + 14;

  const componentRows = getSelectedComponentsSummary(result).map(r => [r.component, r.pn || '—', r.specs || '—', r.status]);

  doc.autoTable({
    startY: y,
    head: [['Component', 'Part No.', 'Specification', 'Status']],
    body: componentRows,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [31, 56, 100] },
    margin: { left: marginX, right: marginX },
    columnStyles: {
      0: { cellWidth: pageWidth * 0.16 },
      1: { cellWidth: pageWidth * 0.20 },
      2: { cellWidth: pageWidth * 0.42 },
      3: { cellWidth: pageWidth * 0.14 },
    },
  });
  y = doc.lastAutoTable.finalY + 14;

  const checklistRows = [
    [
      'Motor Rated Speed Nn, rpm',
      motor ? String(motor.Nn) : '—',
      String(Math.round(result.Nmotor)),
      motor ? `${(result.Nmotor / motor.Nn * 100).toFixed(0)}%` : '—',
      motor ? (result.Nmotor <= motor.Nn ? 'OK' : 'NOK') : '—',
      '',
    ],
    [
      'Motor Rated Torque Mn, Nm',
      motor ? motor.Mn.toFixed(2) : '—',
      result.T_peak_motor.toFixed(2),
      motor ? `${(result.T_peak_motor / motor.Mn * 100).toFixed(0)}%` : '—',
      motor ? (result.T_peak_motor <= motor.Mn ? 'OK' : 'Check Duty cycle') : '—',
      '',
    ],
    [
      'Motor Inertia Ratio',
      String(state.sm_permitted_inertia_ratio),
      result.inertia_ratio !== null ? result.inertia_ratio.toFixed(2) : '—',
      result.inertia_ratio !== null ? `${(result.inertia_ratio / state.sm_permitted_inertia_ratio * 100).toFixed(0)}%` : '—',
      result.inertia_ratio !== null ? (result.inertia_ratio <= state.sm_permitted_inertia_ratio ? 'OK' : 'NOK') : '—',
      '',
    ],
  ];

  if (Number(state.has_gearbox) !== 0) {
    checklistRows.push(
      [
        'GearBox Input speed, rpm',
        state.gb_rated_input_speed > 0 ? String(Math.round(state.gb_rated_input_speed)) : '—',
        String(Math.round(result.Nmotor)),
        state.gb_rated_input_speed > 0 ? `${(result.Nmotor / state.gb_rated_input_speed * 100).toFixed(0)}%` : '#DIV/0!',
        state.gb_rated_input_speed > 0 ? (result.Nmotor <= state.gb_rated_input_speed ? 'OK' : 'NOK') : '#DIV/0!',
        '',
      ],
      [
        'GearBox Output Torque, Nm',
        state.gb_rated_output_torque > 0 ? state.gb_rated_output_torque.toFixed(2) : '—',
        result.T_peak_bs.toFixed(2),
        state.gb_rated_output_torque > 0 ? `${(result.T_peak_bs / state.gb_rated_output_torque * 100).toFixed(0)}%` : '#DIV/0!',
        state.gb_rated_output_torque > 0 ? (result.T_peak_bs <= state.gb_rated_output_torque ? 'OK' : 'NOK') : '#DIV/0!',
        '',
      ],
    );
  }

  checklistRows.push(
    [
      'Ball screw max speed, rpm',
      String(Math.round(state.bs_max_speed)),
      String(Math.round(result.Nscrew)),
      state.bs_max_speed > 0 ? `${(result.Nscrew / state.bs_max_speed * 100).toFixed(0)}%` : '#DIV/0!',
      result.Nscrew <= state.bs_max_speed ? 'OK' : 'NOK',
      'Wish list',
    ],
    [
      'Ball screw max torque',
      state.bs_max_torque.toFixed(2),
      result.T_peak_bs.toFixed(2),
      state.bs_max_torque > 0 ? `${(result.T_peak_bs / state.bs_max_torque * 100).toFixed(0)}%` : '#DIV/0!',
      result.T_peak_bs <= state.bs_max_torque ? 'OK' : 'NOK',
      'Wish list',
    ],
    [
      'Movement accuracy of system (+/- micron)',
      sysAcc.toFixed(2),
      String(state.project_accuracy),
      state.project_accuracy > 0 ? `${(sysAcc / state.project_accuracy * 100).toFixed(0)}%` : '#DIV/0!',
      sysAcc <= state.project_accuracy ? 'OK' : 'NOK',
      '',
    ],
  );

  if (y > 700) {
    doc.addPage();
    y = 44;
  }

  doc.autoTable({
    startY: y,
    head: [['Verification Checklist', 'Capacity / Selected', 'Actual / Required', 'Utilization', 'Result', 'Remarks']],
    body: checklistRows,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [31, 56, 100] },
    margin: { left: marginX, right: marginX },
    columnStyles: {
      0: { cellWidth: pageWidth * 0.34 },
      1: { cellWidth: pageWidth * 0.13 },
      2: { cellWidth: pageWidth * 0.13 },
      3: { cellWidth: pageWidth * 0.13 },
      4: { cellWidth: pageWidth * 0.11 },
      5: { cellWidth: pageWidth * 0.10 },
    },
  });

  doc.save('ClusterVise_Servo_Report.pdf');
}

// window.CATALOG_SYNC_READY (js/catalog-sync.js) resolves once the live-data fetch attempt has
// settled, success or fallback — awaiting it here avoids populating dropdowns from local data and
// then silently swapping them under the user. Resolves immediately on pages without that script.
window.addEventListener('DOMContentLoaded', () => {
  Promise.resolve(window.CATALOG_SYNC_READY).finally(init);
});
