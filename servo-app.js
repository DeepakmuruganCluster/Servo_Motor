const G = 9.81;

const DEFAULT_STATE = {
  project_shifts: 3,
  project_hours_shift: 7,
  project_days_week: 6,
  project_total_cycle: 7,
  project_operating_time: 2.6,
  project_service_life: 10,
  project_accuracy: 10,
  dwell_time: 0.1,
  acc_pct: 25,
  steps: [
    { label: 'Step 1', stroke: 15, move_time: 1.0,
      external_force: 250, external_force_dir: 'opposing',
      load_mass: 1.0, movement_dir: 'against_gravity', tilt_deg: 45,
      acceleration_time: null, deceleration_time: null }
  ],
  bs_model: '',
  mu: 0.03,
  guide_force: 15,
  guide_n_blocks: 1,
  guide_mass: 1.6,
  guide_model: '',
  guide_max_force: 1000,
  guide_service_life: 5000,
  bs_pitch: 2,
  bs_dia: 6,
  bs_length: 500,                // ball screw shaft length (mm)
  bs_material: 'steel',          // 'steel' | 'stainless' | 'aluminum'
  bs_efficiency: 0.98,
  bs_preload_torque: 0,          // T0 — preload torque (Nm, direct input)
  bs_nut_mass: 0.052,            // ball screw nut mass (kg)
  guide_block_mass: 0.2,         // mass per LM guide carriage block (kg)
  // Bearing drag: T = n_fixed×(axial_fixed+radial_fixed) + n_support×(axial_support+radial_support)
  bs_n_fixed_blocks: 1,          // no. of fixed-side support blocks
  bs_fixed_drag_axial: 0,        // drag per block — axial load (Nm)
  bs_fixed_drag_radial: 0,       // drag per block — radial load (Nm)
  bs_n_support_blocks: 1,        // no. of support-side support blocks
  bs_support_drag_axial: 0,      // drag per block — axial load (Nm)
  bs_support_drag_radial: 0,     // drag per block — radial load (Nm)
  has_counterbalance: 0,
  cb_mass: 0,                   // counterbalance mass (kg)
  cb_angle_deg: 90,             // counterbalance inclination (deg)
  cb_mu: 0.005,                 // counterbalance friction coefficient
  cb_bushing_friction_force: 0,  // counterbalance linear-bush friction force per bushing (N)
  cb_n_bushings: 0,             // number of counterbalance linear bushings
  bs_max_speed: 12000,       // calc C321 — Ball screw permitted velocity (rpm)
  bs_max_torque: 3,          // calc C334 — Ball screw permitted driving torque (Nm)
  bs_repetition_accuracy: 10,// calc C198 — Ball screw repetition accuracy (micron)
  // Parallel kit
  has_parallel_kit: 1,
  pk_model: '',
  pk_ratio: 1,
  gb_ratio_user_selected: false,
  pk_no_load_torque: 0.07,
  pk_inertia: 2.67e-5,
  pk_max_torque: 3,
  pk_max_speed: 6000,
  // Gearbox
  has_gearbox: 0,
  gb_ratio: 1,
  gb_efficiency: 0.97,
  gb_no_load_torque: 0.01,
  gb_inertia: 0,
  gb_backlash: 7,
  gb_rated_input_speed: 0,   // calc C298 — GB Rated Input Speed (rpm)
  gb_rated_output_torque: 0, // calc C304 — GB Rated Output Torque (Nm)
  // Servo motor specs
  sm_permitted_inertia_ratio: 7, // calc C57 — SM Permitted Inertia Ratio
  sm_encoder_ppr: 1048576,       // calc C59 — SM Encoder resolution (ppr)
  safety_factor: 20,
  motor_user_selected: false,
};

const MOTOR_DB = [
  { pn:'1FK2103-2AH00-0MA0', series:'1FK2', kW:0.28,  Mn:0.60, Mmax:1.95,  Nn:4500, Nmax:8000, Jmot:0.093, brake:false },
  { pn:'1FK2103-2AH10-0MA0', series:'1FK2', kW:0.28,  Mn:0.60, Mmax:1.95,  Nn:4500, Nmax:8000, Jmot:0.093, brake:true  },
  { pn:'1FK2103-4AH00-0MA0', series:'1FK2', kW:0.48,  Mn:1.27, Mmax:4.05,  Nn:4500, Nmax:8000, Jmot:0.14,  brake:false },
  { pn:'1FK2103-4AH10-0MA0', series:'1FK2', kW:0.48,  Mn:1.27, Mmax:4.05,  Nn:4500, Nmax:8000, Jmot:0.14,  brake:true  },
  { pn:'1FK2104-4AF00-0MA0', series:'1FK2', kW:0.40,  Mn:1.27, Mmax:3.75,  Nn:3000, Nmax:7200, Jmot:0.35,  brake:false },
  { pn:'1FK2104-4AF10-0MA0', series:'1FK2', kW:0.40,  Mn:1.27, Mmax:3.75,  Nn:3000, Nmax:7200, Jmot:0.35,  brake:true  },
  { pn:'1FK2104-4AK00-0MA0', series:'1FK2', kW:0.60,  Mn:0.90, Mmax:3.85,  Nn:6000, Nmax:8000, Jmot:0.35,  brake:false },
  { pn:'1FK2104-4AK10-0MA0', series:'1FK2', kW:0.60,  Mn:0.90, Mmax:3.85,  Nn:6000, Nmax:8000, Jmot:0.35,  brake:true  },
  { pn:'1FK2104-5AF00-0MA0', series:'1FK2', kW:0.75,  Mn:2.40, Mmax:7.50,  Nn:3000, Nmax:6700, Jmot:0.56,  brake:false },
  { pn:'1FK2104-5AF10-0MA0', series:'1FK2', kW:0.75,  Mn:2.40, Mmax:7.50,  Nn:3000, Nmax:6700, Jmot:0.56,  brake:true  },
  { pn:'1FK2104-5AK00-0MA0', series:'1FK2', kW:1.07, Mn:1.50, Mmax:7.60,  Nn:6000, Nmax:8000, Jmot:0.56,  brake:false },
  { pn:'1FK2104-5AK10-0MA0', series:'1FK2', kW:1.07, Mn:1.50, Mmax:7.60,  Nn:6000, Nmax:8000, Jmot:0.56,  brake:true  },
  { pn:'1FK2104-6AF00-0MA0', series:'1FK2', kW:1.00,  Mn:3.20, Mmax:10.0,  Nn:3000, Nmax:7200, Jmot:0.76,  brake:false },
  { pn:'1FK2104-6AF10-0MA0', series:'1FK2', kW:1.00,  Mn:3.20, Mmax:10.0,  Nn:3000, Nmax:7200, Jmot:0.76,  brake:true  },
];

let state = {};
let selectedMotorIdx = -1;
let lastResult = null;
let inventoryItems = new Map(); // PN (uppercase) → device type (lowercase), e.g. 'motor', 'drive', 'gearbox'

function saveState() {
  localStorage.setItem('titanServoState', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('titanServoState');
  if (!raw) {
    state = { ...DEFAULT_STATE };
    return;
  }
  try {
    const saved = JSON.parse(raw);
    state = { ...DEFAULT_STATE, ...saved };
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
        const type = String(row[1] ?? '').trim().toLowerCase() || 'motor'; // default to motor if blank
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

function getStepTimings(step, st = state) {
  const avail = Math.max(Number(step?.move_time) || 0, 0.01);
  const accPct = Math.min(80, Math.max(1, Number(st.acc_pct) || 25)) / 100;
  const fallbackAcc = Math.min(avail / 2, avail * accPct);
  const rawAcc = Number(step?.acceleration_time);
  const rawDec = Number(step?.deceleration_time);
  const t_acc = Number.isFinite(rawAcc) && rawAcc > 0 ? Math.min(rawAcc, avail) : fallbackAcc;
  const t_dec = Number.isFinite(rawDec) && rawDec > 0 ? Math.min(rawDec, avail) : t_acc;
  const t_const = Math.max(0, avail - t_acc - t_dec);
  return { avail, t_acc, t_dec, t_const };
}

function getPeakLinearSpeed(step, st = state) {
  const { avail, t_acc, t_dec } = getStepTimings(step, st);
  const span = avail - 0.5 * (t_acc + t_dec);
  return span > 0 ? (Number(step?.stroke) || 0) / span : 0;
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

function downloadExcelTemplate() {
  const step = (Array.isArray(state.steps) && state.steps[0]) ? state.steps[0] : DEFAULT_STATE.steps[0];
  const bearingDrag = getBearingDragComponents();

  // Topology flags — use saved state first, fall back to project config
  const ctx = (typeof Projects !== 'undefined') ? Projects.getContext() : null;
  const projCfg = (ctx && typeof Projects !== 'undefined') ? (Projects.get(ctx.projectId)?.config || null) : null;
  const showLM = projCfg ? projCfg.has_lm_guide : true;
  const showCB = Number(state.has_counterbalance) !== 0 ||
                 (projCfg ? (projCfg.counterbalance && projCfg.counterbalance !== 'none') : true);
  const showPK = Number(state.has_parallel_kit) !== 0 ||
                 (projCfg ? projCfg.has_parallel_kit : true);
  const showGB = Number(state.has_gearbox) !== 0 ||
                 (projCfg ? projCfg.has_gearbox : true);

  // Layout: A=Parameter (with units), B=Notes, C=Station 1 values
  const rows_ = [
    ['Stn no',                                    'Station identifier',                              'OP10'],
    ['Appl',                                      'Application name',                                'App-1'],
    ['Stroke (mm)',                                'Linear travel distance',                          step.stroke ?? 0],
    ['Move time (s)',                              'Total move time (accel + const + decel)',          step.move_time ?? 0],
    ['Dwell time (s)',                             'Wait time at end of stroke',                      state.dwell_time ?? 0.1],
    ['Acceleration time (s)',                      'Accel phase duration (leave blank to use Acc%)',  step.acceleration_time ?? ''],
    ['Deceleration time (s)',                      'Decel phase duration (leave blank to use Dec%)',  step.deceleration_time ?? ''],
    ['External force (N)',                         'Process / payload force on the axis',             step.external_force ?? 0],
    ['Ext. force direction',                       'Options: opposing / aiding',                      step.external_force_dir || 'opposing'],
    ['Payload movement direction',                 'Options: against gravity / with gravity',         step.movement_dir || 'against gravity'],
    ['Payload mass (kg)',                          'Mass of payload being moved',                     step.load_mass ?? 0],
    ['Carriage mass (kg)',                         'LM guide carriage / saddle mass',                 state.guide_mass ?? 0],
    ['Guide block mass per block (kg)',            'Mass of each LM guide carriage block',            state.guide_block_mass ?? 0.2],
    ['No. carriage blocks',                        'Number of LM guide carriage blocks',              state.guide_n_blocks ?? 1],
    ['Inclination angle (°)',                      '0 = horizontal, 90 = vertical',                   step.tilt_deg ?? 0],
    // LM Guide rows (conditional)
    ...(showLM ? [
      ['Friction coeff LM guide (μ)',              'Friction coefficient of LM guide',                state.mu ?? 0],
      ['Friction Force (N)',                       'Friction force per carriage block (N)',            state.guide_force ?? 0],
    ] : []),
    // Counterbalance rows (conditional)
    ...(showCB ? [
      ['Linear bush friction force (counterbalance)', 'Friction force per counterbalance bushing (N)',  state.cb_bushing_friction_force ?? 0],
      ['number of linear bushings (counterbalance)', 'No. of counterbalance linear bushings',           state.cb_n_bushings ?? 0],
      ['Counterbalance exists',                    'Options: yes / no',                               Number(state.has_counterbalance) ? 'yes' : 'no'],
      ['CB mass (kg)',                             'Counterbalance mass',                             state.cb_mass ?? 0],
      ['CB inclination (°)',                       'Counterbalance inclination angle',                 state.cb_angle_deg ?? 90],
      ['CB friction coeff (μ)',                    'Counterbalance guide friction coefficient',        state.cb_mu ?? 0],
    ] : []),
    ['BS lead (mm)',                               'Ball screw lead / pitch',                          state.bs_pitch ?? 2],
    ['BS diameter (mm)',                           'Ball screw shaft diameter',                        state.bs_dia ?? 6],
    ['BS length (mm)',                             'Ball screw shaft length',                          state.bs_length ?? 500],
    ['BS material',                               'Options: steel / stainless / aluminum',            state.bs_material ?? 'steel'],
    ['BS efficiency',                              'Ball screw mechanical efficiency (0–1)',           state.bs_efficiency ?? 0.98],
    ['BS nut mass (kg)',                           'Ball screw nut mass (from catalog)',               state.bs_nut_mass ?? 0.052],
    ['BS preload torque (Nm)',                     'Preload torque (direct input, from catalog)',      state.bs_preload_torque ?? 0],
    ['No. of fixed side support blocks',           'No. of fixed-end bearing support blocks',         state.bs_n_fixed_blocks ?? 1],
    ['Fixed side drag torque per block (Nm)',      'Drag torque per fixed-side block (from catalog)', state.bs_fixed_drag_axial ?? 0],
    ['Fixed side support block drag torque (Nm)',  'Auto-calculated: No. blocks × drag/block',        bearingDrag.fixed],
    ['No. of support side support blocks',         'No. of floating-end bearing support blocks',      state.bs_n_support_blocks ?? 1],
    ['Support side drag torque per block (Nm)',    'Drag torque per support-side block (from catalog)', state.bs_support_drag_axial ?? 0],
    ['Support side support block drag torque (Nm)', 'Auto-calculated: No. blocks × drag/block',      bearingDrag.support],
    ['Bearing drag torque (Nm)',                   'Auto-calculated: fixed total + support total',    bearingDrag.total],
    // Parallel Kit rows (conditional)
    ...(showPK ? [
      ['Parallel Kit needed',                      'Options: Yes / No',                               Number(state.has_parallel_kit) ? 'Yes' : 'No'],
      ['PK ratio',                                 'Parallel kit gear ratio',                         state.pk_ratio ?? 1],
      ['PK no-load (Nm)',                          'Parallel kit no-load running torque',             state.pk_no_load_torque ?? 0],
      ['PK inertia (kg·m²)',                      'Parallel kit moment of inertia',                  state.pk_inertia ?? 0],
      ['PK max torque (Nm)',                       'Parallel kit max transferable torque',             state.pk_max_torque ?? 0],
      ['PK max speed (rpm)',                       'Parallel kit max input speed',                    state.pk_max_speed ?? 0],
    ] : []),
    // Gearbox rows (conditional)
    ...(showGB ? [
      ['Gearbox needed',                           'Options: Yes / No',                               Number(state.has_gearbox) ? 'Yes' : 'No'],
      ['GB ratio',                                 'Gearbox ratio',                                   state.gb_ratio ?? 1],
      ['GB efficiency',                            'Gearbox mechanical efficiency (0–1)',              state.gb_efficiency ?? 0],
      ['GB no-load (Nm)',                          'Gearbox no-load running torque',                  state.gb_no_load_torque ?? 0],
      ['GB inertia (kg·m²)',                      'Gearbox reflected inertia',                       state.gb_inertia ?? 0],
      ['Backlash (arcmin)',                        'Gearbox backlash',                                state.gb_backlash ?? 0],
    ] : []),
    ['Safety factor (%)',                          'Design safety factor (%)',                         state.safety_factor ?? 20],
    ['Cycle time (s)',                             'Total machine cycle time',                         state.project_total_cycle ?? 7],
    ['Op. time (s)',                               'Servo operating time per cycle',                   state.project_operating_time ?? 2.6],
    ['Shifts/day',                                 'Number of shifts per day',                         state.project_shifts ?? 3],
    ['Hours/shift',                                'Working hours per shift',                          state.project_hours_shift ?? 7],
    ['Days/week',                                  'Working days per week',                            state.project_days_week ?? 6],
    ['Service life (yrs)',                         'Required machine service life',                    state.project_service_life ?? 10],
    ['Accuracy (µm)',                              'Required positioning accuracy',                    state.project_accuracy ?? 20],
  ];
  const data = [
    ['Project Input Template', null, null],
    [],
    ['Parameter', 'Notes', 'OP10 / App-1'],
    ...rows_,
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 46 }, { wch: 48 }, { wch: 18 }];

  const titleStyle  = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 }, fill: { patternType: 'solid', fgColor: { rgb: '1F3864' } }, alignment: { horizontal: 'center' } };
  const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: '2F75B5' } } };
  const inputStyle  = { fill: { patternType: 'solid', fgColor: { rgb: 'E2F0D9' } }, border: { top: { style: 'thin', color: { rgb: 'A9D18E' } }, bottom: { style: 'thin', color: { rgb: 'A9D18E' } }, left: { style: 'thin', color: { rgb: 'A9D18E' } }, right: { style: 'thin', color: { rgb: 'A9D18E' } } } };
  const helperStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'FFF2CC' } }, font: { italic: true } };
  const noteStyle   = { font: { italic: true, color: { rgb: '595959' } }, fill: { patternType: 'solid', fgColor: { rgb: 'F2F2F2' } } };

  ['A1', 'B1', 'C1'].forEach(c => { if (ws[c]) ws[c].s = titleStyle; });
  ['A3', 'B3', 'C3'].forEach(c => { if (ws[c]) ws[c].s = headerStyle; });

  const HELPER_LABELS = new Set([
    'Fixed side support block drag torque (Nm)',
    'Support side support block drag torque (Nm)',
    'Bearing drag torque (Nm)',
  ]);
  data.forEach((row, i) => {
    if (i < 3 || !row[0]) return;
    const rowNum = i + 1;
    const isHelper = HELPER_LABELS.has(row[0]);
    if (ws[`B${rowNum}`]) ws[`B${rowNum}`].s = noteStyle;
    if (ws[`C${rowNum}`]) ws[`C${rowNum}`].s = isHelper ? helperStyle : inputStyle;
  });

  // Excel formulas for bearing drag totals (yellow helper cells) — values in col C
  const findRow = (label) => { const idx = data.findIndex(r => r[0] === label); return idx >= 0 ? idx + 1 : null; };
  const rFixedN   = findRow('No. of fixed side support blocks');
  const rFixedB   = findRow('Fixed side drag torque per block (Nm)');
  const rFixedT   = findRow('Fixed side support block drag torque (Nm)');
  const rSupportN = findRow('No. of support side support blocks');
  const rSupportB = findRow('Support side drag torque per block (Nm)');
  const rSupportT = findRow('Support side support block drag torque (Nm)');
  const rBearing  = findRow('Bearing drag torque (Nm)');

  if (rFixedT && rFixedN && rFixedB)   ws[`C${rFixedT}`]   = { t: 'n', f: `C${rFixedN}*C${rFixedB}`,   v: bearingDrag.fixed,   s: helperStyle };
  if (rSupportT && rSupportN && rSupportB) ws[`C${rSupportT}`] = { t: 'n', f: `C${rSupportN}*C${rSupportB}`, v: bearingDrag.support, s: helperStyle };
  if (rBearing && rFixedT && rSupportT) ws[`C${rBearing}`]  = { t: 'n', f: `C${rFixedT}+C${rSupportT}`, v: bearingDrag.total,   s: helperStyle };

  const workbook = { SheetNames: ['User input'], Sheets: { 'User input': ws } };
  const workbookArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
  const blob = new Blob([workbookArray], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'titan-project-template.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
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

function normalizeState() {
  state.project_shifts = Math.max(0, Number(state.project_shifts) || 0);
  state.project_hours_shift = Math.max(0, Number(state.project_hours_shift) || 0);
  state.project_days_week = Math.max(0, Number(state.project_days_week) || 0);
  state.project_total_cycle = Math.max(0.1, Number(state.project_total_cycle) || 0.1);
  state.project_operating_time = Math.max(0, Number(state.project_operating_time) || 0);
  state.project_service_life = Math.max(0, Number(state.project_service_life) || 0);
  state.project_accuracy = Math.max(0, Number(state.project_accuracy) || 0);
  state.dwell_time = Math.max(0, Number(state.dwell_time) || 0);
  state.acc_pct = Math.min(80, Math.max(1, Number(state.acc_pct) || 25));
  state.has_parallel_kit = Number(state.has_parallel_kit) === 0 ? 0 : 1;
  state.has_gearbox = Number(state.has_gearbox) === 0 ? 0 : 1;
  state.gb_ratio_user_selected = !!state.gb_ratio_user_selected;
  state.motor_user_selected = !!state.motor_user_selected;
  if (!Array.isArray(state.steps) || state.steps.length === 0) {
    state.steps = [{ label: 'Step 1', stroke: 15, move_time: 1.0, external_force: 250, load_mass: 1.0, tilt_deg: 45 }];
  }
  state.steps = state.steps.slice(0, 8).map((step, index) => ({
    label: String(step.label || step.application || `Step ${index + 1}`),
    stroke: Math.max(0, Number(step.stroke) || 0),
    move_time: Math.max(0.05, Number(step.move_time) || 0.05),
    acceleration_time: Number.isFinite(Number(step.acceleration_time)) && Number(step.acceleration_time) > 0 ? Number(step.acceleration_time) : null,
    deceleration_time: Number.isFinite(Number(step.deceleration_time)) && Number(step.deceleration_time) > 0 ? Number(step.deceleration_time) : null,
    external_force: Number(step.external_force) || 0,
    external_force_dir: ['opposing', 'aiding'].includes(step.external_force_dir) ? step.external_force_dir : 'opposing',
    load_mass: Math.max(0, Number(step.load_mass) || 0),
    movement_dir: ['against_gravity', 'with_gravity'].includes(step.movement_dir) ? step.movement_dir : 'against_gravity',
    tilt_deg: Number(step.tilt_deg) || 0,
  }));
  state.mu = Math.max(0, Number(state.mu) || 0);
  state.bs_model = String(state.bs_model || '').trim();
  state.guide_model = String(state.guide_model || '').trim();
  state.pk_model = String(state.pk_model || '').trim();
  state.guide_force = Math.max(0, Number(state.guide_force) || 0);
  state.guide_n_blocks = Math.max(1, Math.round(Number(state.guide_n_blocks) || 1));
  state.guide_mass = Math.max(0, Number(state.guide_mass) || 0);
  state.guide_max_force = Math.max(0, Number(state.guide_max_force) || 0);
  state.guide_service_life = Math.max(0, Number(state.guide_service_life) || 0);
  state.bs_pitch = Math.max(0.1, Number(state.bs_pitch) || 0.1);
  state.bs_dia = Math.max(0.1, Number(state.bs_dia) || 0.1);
  state.bs_length = Math.max(1, Number(state.bs_length) || 500);
  state.bs_material = ['steel', 'stainless', 'aluminum'].includes(state.bs_material) ? state.bs_material : 'steel';
  state.bs_efficiency = Math.min(1, Math.max(0.01, Number(state.bs_efficiency) || 0.98));
  state.bs_preload_torque = Math.max(0, Number(state.bs_preload_torque) || 0);
  state.bs_nut_mass = Math.max(0, Number(state.bs_nut_mass) || 0);
  state.guide_block_mass = Math.max(0, Number(state.guide_block_mass) || 0);
  // Migrate legacy single-value bearing drag into fixed-side axial
  const legacyDrag = Number(state.bs_bearing_drag_torque) || Number(state.bs_friction_torque)
                   || Number(state.bs_fixed_bearing_drag) || 0;
  if (legacyDrag > 0 && !state.bs_fixed_drag_axial) {
    state.bs_fixed_drag_axial = legacyDrag;
  }
  // Migrate 4-field model (bs_fixed_drag_per_block) into axial field
  if (!state.bs_fixed_drag_axial && state.bs_fixed_drag_per_block) {
    state.bs_fixed_drag_axial = Number(state.bs_fixed_drag_per_block) || 0;
  }
  if (!state.bs_support_drag_axial && state.bs_support_drag_per_block) {
    state.bs_support_drag_axial = Number(state.bs_support_drag_per_block) || 0;
  }
  delete state.bs_friction_torque;
  delete state.bs_bearing_drag_torque;
  delete state.bs_fixed_bearing_drag;
  delete state.bs_support_bearing_drag;
  delete state.bs_fixed_drag_per_block;
  delete state.bs_support_drag_per_block;
  // Migrate legacy preload force/mu fields if present
  if (('bs_preload_mu' in state || 'bs_preload_force' in state) && !state.bs_preload_torque) {
    const mu0 = Number(state.bs_preload_mu) || 0;
    const F0  = Number(state.bs_preload_force) || 0;
    const p   = state.bs_pitch / 1000;
    state.bs_preload_torque = (mu0 * F0 * p) / (2 * Math.PI);
  }
  delete state.bs_preload_mu;
  delete state.bs_preload_force;
  delete state.bs_inertia;
  state.bs_n_fixed_blocks      = Math.max(1, Math.round(Number(state.bs_n_fixed_blocks)   || 1));
  state.bs_fixed_drag_axial    = Math.max(0, Number(state.bs_fixed_drag_axial)    || 0);
  state.bs_fixed_drag_radial   = Math.max(0, Number(state.bs_fixed_drag_radial)   || 0);
  state.bs_n_support_blocks    = Math.max(1, Math.round(Number(state.bs_n_support_blocks) || 1));
  state.bs_support_drag_axial  = Math.max(0, Number(state.bs_support_drag_axial)  || 0);
  state.bs_support_drag_radial = Math.max(0, Number(state.bs_support_drag_radial) || 0);
  state.has_counterbalance     = Number(state.has_counterbalance) === 0 ? 0 : 1;
  state.cb_mass                = Math.max(0, Number(state.cb_mass) || 0);
  state.cb_angle_deg           = Number(state.cb_angle_deg) || 90;
  state.cb_mu                  = Math.max(0, Number(state.cb_mu) || 0);
  state.cb_bushing_friction_force = Math.max(0, Number(state.cb_bushing_friction_force) || 0);
  state.cb_n_bushings          = Math.max(0, Math.round(Number(state.cb_n_bushings) || 0));
  state.bs_max_speed = Math.max(0, Number(state.bs_max_speed) || 0);
  state.bs_max_torque = Math.max(0, Number(state.bs_max_torque) || 0);
  state.bs_repetition_accuracy = Math.max(0, Number(state.bs_repetition_accuracy) || 0);
  // Migrate old gear_* fields from saved state
  if ('gear_ratio' in state && !('pk_ratio' in state)) {
    state.pk_ratio          = Number(state.gear_ratio) || 1;
    state.pk_no_load_torque = Number(state.gear_no_load_torque) || 0;
    state.pk_inertia        = Number(state.gear_inertia) || 0;
    state.gb_ratio          = 1;
    state.gb_efficiency     = Number(state.gear_efficiency) || 1;
    state.gb_no_load_torque = 0;
    state.gb_inertia        = 0;
    state.gb_backlash       = 0;
  }
  // Parallel kit
  state.pk_ratio          = Math.max(0.1, Number(state.pk_ratio) || 1);
  state.pk_no_load_torque = Math.max(0, Number(state.pk_no_load_torque) || 0);
  state.pk_inertia        = Math.max(0, Number(state.pk_inertia) || 0);
  state.pk_max_torque     = Math.max(0, Number(state.pk_max_torque) || 0);
  state.pk_max_speed      = Math.max(0, Number(state.pk_max_speed) || 0);
  // Gearbox
  state.gb_ratio          = Math.max(0.1, Number(state.gb_ratio) || 1);
  state.gb_efficiency     = Math.min(1, Math.max(0.01, Number(state.gb_efficiency) || 1));
  state.gb_no_load_torque = Math.max(0, Number(state.gb_no_load_torque) || 0);
  state.gb_inertia        = Math.max(0, Number(state.gb_inertia) || 0);
  state.gb_backlash       = Math.max(0, Number(state.gb_backlash) || 0);
  state.safety_factor     = Math.max(0, Number(state.safety_factor) || 0);
}

function estimateTorqueRMS(T_load, T_peak, t_acc, t_const, t_dec) {
  if (!t_acc) return Math.sqrt((T_load * T_load * t_const + T_load * T_load * t_dec) / Math.max(1, t_const + t_dec));
  const Iacc = (t_acc / 3) * (T_load * T_load + T_load * T_peak + T_peak * T_peak);
  const Idec = (t_dec / 3) * (T_peak * T_peak + T_peak * T_load + T_load * T_load);
  const Iconst = T_load * T_load * t_const;
  const total = Iacc + Iconst + Idec;
  return Math.sqrt(total / Math.max(1, t_acc + t_const + t_dec));
}

function getBearingDragComponents() {
  const fixedCount = Number(state.bs_n_fixed_blocks) || 0;
  const fixedAxial = Number(state.bs_fixed_drag_axial) || 0;
  const supportCount = Number(state.bs_n_support_blocks) || 0;
  const supportAxial = Number(state.bs_support_drag_axial) || 0;
  const fixed = fixedCount * fixedAxial;
  const support = supportCount * supportAxial;
  return {
    fixed,
    support,
    total: fixed + support,
  };
}

function calculateStepGroup(steps) {
  // Effective drive ratio and efficiency (PK × GB)
  const pkEnabled = Number(state.has_parallel_kit) !== 0;
  const gbEnabled = Number(state.has_gearbox) !== 0;
  const pkRatio = pkEnabled ? state.pk_ratio : 1;
  const gbRatio = gbEnabled ? state.gb_ratio : 1;
  const eff_ratio = pkRatio * gbRatio;
  const eff_efficiency = gbEnabled ? state.gb_efficiency : 1;
  const pkNoLoadTorque = pkEnabled ? state.pk_no_load_torque : 0;
  const gbNoLoadTorque = gbEnabled ? state.gb_no_load_torque : 0;
  const pkInertia = pkEnabled ? state.pk_inertia : 0;
  const gbInertia = gbEnabled ? state.gb_inertia : 0;
  const pitch_m = state.bs_pitch / 1000;

  const results = {
    Vmax_mm_s: 0, amax: 0, Nscrew: 0, Nmotor: 0,
    axial_force: 0,
    F_external: 0, F_gravity: 0, F_friction: 0, F_counterbalance: 0,
    T_axial_force: 0, T_preload: 0,
    T_fixed_bearing_drag: 0, T_support_bearing_drag: 0, T_bearing_drag: 0,
    T_bs_load: 0, T_accel: 0, T_decel: 0,
    T_total_accel: 0, T_total_topspeed: 0, T_total_decel: 0,
    T_peak_bs: 0, T_peak_motor: 0, T_load_motor: 0,
    sumTorqueEnergy: 0, totalMotionTime: 0, maxJReflected: 0,
  };

  steps.forEach(step => {
    const { avail, t_acc, t_dec, t_const } = getStepTimings(step, state);

    const stroke_m   = step.stroke / 1000;
    const Vmax_m_s   = getPeakLinearSpeed(step, state) / 1000;
    const Vmax_mm_s  = Vmax_m_s * 1000;
    const amax       = t_acc > 0 ? Vmax_m_s / t_acc : 0;
    const Nscrew     = pitch_m > 0 ? Vmax_mm_s / state.bs_pitch * 60 : 0;
    const Nmotor     = Nscrew * eff_ratio;

    const theta      = step.tilt_deg * Math.PI / 180;
    const total_mass = step.load_mass + state.guide_mass
                     + state.bs_nut_mass
                     + state.guide_n_blocks * state.guide_block_mass;

    // --- Axial Force Components (signed) ---
    const gravity_sign     = step.movement_dir === 'with_gravity' ? -1 : 1;
    const F_gravity        = gravity_sign * total_mass * G * Math.sin(theta);

    const ext_sign         = step.external_force_dir === 'aiding' ? -1 : 1;
    const F_external       = ext_sign * step.external_force;

    // Friction: Fpl (normal-force preload) + Ffp (guide per-block) + Ffcb (CB bushings)
    const F_pl             = total_mass * G * state.mu * Math.cos(theta);
    const F_ffp            = state.guide_n_blocks * state.guide_force;
    const F_cb_friction    = (Number(state.cb_n_bushings) || 0) * (Number(state.cb_bushing_friction_force) || 0);
    const F_friction       = F_pl + F_ffp + F_cb_friction;

    let F_counterbalance   = 0;
    if (Number(state.has_counterbalance)) {
      const theta_cb     = state.cb_angle_deg * Math.PI / 180;
      const F_cb_raw     = state.cb_mass * G * (Math.sin(theta_cb) + state.cb_mu * Math.cos(theta_cb));
      F_counterbalance   = -gravity_sign * F_cb_raw; // always opposite to payload gravity sign
    }

    const axial_force      = F_external + F_gravity + F_friction + F_counterbalance;

    // --- Load Torque @ Ball Screw Input Shaft ---
    // T_axial_force is SIGNED per the sign matrix: positive = resists motion, negative = aids motion.
    // All force contributions (including preload, bearing drag, pk_noload) are positive for accel/top
    // and flip negative for decel — so T_bs_load is the signed steady-state load torque.
    const T_axial_force_signed = pitch_m > 0 ? (axial_force * pitch_m) / (2 * Math.PI * state.bs_efficiency) : 0;
    const T_preload      = state.bs_preload_torque;
    const bearingDrag    = getBearingDragComponents();
    // pk_no_load is at BS shaft — included in safety factor
    const T_bs_load      = T_axial_force_signed + T_preload + bearingDrag.total + pkNoLoadTorque;

    // Jrm from geometry: (π/32) × density × Lb × Db⁴  (lengths in metres)
    const BS_DENSITY = { steel: 7870, stainless: 7930, aluminum: 2700 };
    const rho_bs    = BS_DENSITY[state.bs_material] || 7870;
    const Lb        = state.bs_length / 1000;
    const Db        = state.bs_dia / 1000;
    const Jrm       = (Math.PI / 32) * rho_bs * Lb * Math.pow(Db, 4);
    const J_mass      = total_mass * Math.pow(pitch_m / (2 * Math.PI), 2);
    const J_reflected = J_mass + Jrm + pkInertia + gbInertia;
    // T = J × (N/9.55) / t  — angular deceleration formula (divide by time, not multiply)
    const T_accel      = t_acc > 0 ? J_reflected * Nscrew / (9.55 * t_acc) : 0;
    const T_decel      = t_dec > 0 ? J_reflected * Nscrew / (9.55 * t_dec) : 0;
    // Total torque per phase (per "Total Torque Calculation" sheet):
    //   Accel:    Tl + Ta  (inertia resists acceleration)
    //   Topspeed: Tl       (steady state)
    //   Decel:    Tl − Td  (inertia aids braking)
    const T_total_accel    = T_bs_load + T_accel;
    const T_total_topspeed = T_bs_load;
    const T_total_decel    = T_bs_load - T_decel;
    const SF = 1 + state.safety_factor / 100;
    const T_peak_bs_acc = Math.abs(T_total_accel) * SF;
    const T_peak_bs_dec = Math.abs(T_total_decel) * SF;
    const T_peak_bs    = Math.max(T_peak_bs_acc, T_peak_bs_dec);
    // gb_no_load is at motor shaft — added after ratio (Excel row 186→187)
    const T_peak_motor = eff_ratio > 0 ? T_peak_bs / (eff_ratio * eff_efficiency) + gbNoLoadTorque : 0;
    // T_load_motor uses abs for RMS energy calculations (both drive/brake contribute to heating)
    const T_load_motor = eff_ratio > 0 ? Math.abs(T_bs_load) / (eff_ratio * eff_efficiency) + gbNoLoadTorque : 0;

    const Iacc      = (t_acc / 3) * (T_load_motor ** 2 + T_load_motor * T_peak_motor + T_peak_motor ** 2);
    const Idec      = (t_dec / 3) * (T_peak_motor ** 2 + T_peak_motor * T_load_motor + T_load_motor ** 2);
    const Iconst    = T_load_motor ** 2 * t_const;
    const stepEnergy = Iacc + Iconst + Idec;

    results.Vmax_mm_s  = Math.max(results.Vmax_mm_s,  Vmax_mm_s);
    results.amax       = Math.max(results.amax,        amax);
    results.Nscrew     = Math.max(results.Nscrew,      Nscrew);
    results.Nmotor     = Math.max(results.Nmotor,      Nmotor);
    results.axial_force      = Math.max(results.axial_force,      Math.abs(axial_force));
    results.F_external       = Math.max(results.F_external,       Math.abs(F_external));
    results.F_gravity        = Math.max(results.F_gravity,        Math.abs(F_gravity));
    results.F_friction       = Math.max(results.F_friction,       F_friction);
    results.F_counterbalance = Math.max(results.F_counterbalance, Math.abs(F_counterbalance));
    results.T_axial_force    = Math.max(results.T_axial_force,    Math.abs(T_axial_force_signed));
    results.T_preload        = Math.max(results.T_preload,        T_preload);
    results.T_fixed_bearing_drag   = Math.max(results.T_fixed_bearing_drag,   bearingDrag.fixed);
    results.T_support_bearing_drag  = Math.max(results.T_support_bearing_drag,  bearingDrag.support);
    results.T_bearing_drag         = Math.max(results.T_bearing_drag,         bearingDrag.total);
    results.T_bs_load        = Math.max(results.T_bs_load,        Math.abs(T_bs_load));
    results.T_accel    = Math.max(results.T_accel,     T_accel);
    results.T_decel    = Math.max(results.T_decel,     T_decel);
    results.T_total_accel    = Math.max(results.T_total_accel,    Math.abs(T_total_accel));
    results.T_total_topspeed = Math.max(results.T_total_topspeed, Math.abs(T_total_topspeed));
    results.T_total_decel    = Math.max(results.T_total_decel,    Math.abs(T_total_decel));
    results.T_peak_bs  = Math.max(results.T_peak_bs,   T_peak_bs);
    results.T_peak_motor = Math.max(results.T_peak_motor, T_peak_motor);
    results.T_load_motor = Math.max(results.T_load_motor, T_load_motor);
    results.sumTorqueEnergy += stepEnergy;
    results.totalMotionTime += t_acc + t_const + t_dec;
    results.maxJReflected = Math.max(results.maxJReflected, J_reflected);
  });

  results.T_rms_motor = results.totalMotionTime > 0
    ? Math.sqrt(results.sumTorqueEnergy / results.totalMotionTime) : 0;
  results.I_motor = eff_ratio > 0 ? results.maxJReflected / Math.pow(eff_ratio, 2) : 0;
  return results;
}

function calculate() {
  normalizeState();

  const overallResult = calculateStepGroup(state.steps);

  const selectedMotor = MOTOR_DB[selectedMotorIdx] || null;
  const J_rotor = selectedMotor ? selectedMotor.Jmot * 1e-4 : null;
  const inertia_ratio = selectedMotor ? (overallResult.I_motor + J_rotor) / J_rotor : null;

  const needsBrake = state.steps.some(s => Number(s.tilt_deg) !== 0);

  const checks = {
    speed: overallResult.Nmotor <= (selectedMotor ? selectedMotor.Nn : 10000),
    torque: overallResult.T_peak_motor <= (selectedMotor ? selectedMotor.Mn : 9999),
    inertia: selectedMotor ? inertia_ratio <= state.sm_permitted_inertia_ratio : true,
    brake: !needsBrake || (selectedMotor ? selectedMotor.brake : false),
    ball_screw_speed: overallResult.Nscrew <= 6000,
    ball_screw_accel: overallResult.amax <= 5,
  };

  return {
    ...overallResult,
    selectedMotor,
    inertia_ratio,
    checks,
  };
}

function renderMetric(id, value, digits = 2, unit = '') {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(digits)}${unit}` : '—';
}

function render() {
  const result = calculate();
  lastResult = result;
  updateMechanicalVisibility();

  // Auto-sync motor selection to recommendation on first entry.
  // Designers can later override manually (motor_user_selected = true).
  const _curMotor = selectedMotorIdx >= 0 ? MOTOR_DB[selectedMotorIdx] : null;
  const _needsBrakeCheck = state.steps.some(s => Number(s.tilt_deg) !== 0);
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
  renderGearboxSuggestion(result);
  renderVerification(result);
  renderMotionProfileChart();
  if (document.getElementById('show-torque-chart')?.checked)       renderTorqueChart();
  if (document.getElementById('show-displacement-chart')?.checked) renderDisplacementChart();

  // Wire download button each render (result changes)
  const dlBtn = document.getElementById('download-report-btn');
  if (dlBtn) { dlBtn.onclick = () => downloadReport(result); }
}

function renderProjectSummary() {
  const summary = document.getElementById('project-summary');
  if (!summary) return;

  const cycleHours = state.project_total_cycle;
  const hoursPerWeek = state.project_shifts * state.project_hours_shift * state.project_days_week;
  const annualCycles = hoursPerWeek > 0 ? (hoursPerWeek * 52) / cycleHours : 0;
  summary.innerHTML = `
    <div class="summary-grid">
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

  const needsBrakeTable = state.steps.some(s => Number(s.tilt_deg) !== 0);

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
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:16px;color:var(--muted)">No motor in catalog meets the current requirements.</td></tr>`;
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
      </tr>`;
  }).join('');

  tbody.innerHTML = rows;
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      selectedMotorIdx = Number(row.dataset.index);
      state.motor_user_selected = true;
      saveState();
      saveMotorSelection();
      render();
    });
  });
}

function renderSelectedMotorDetails(result) {
  const details = document.getElementById('selected-motor-details');
  if (!details) return;
  const motor = result.selectedMotor;
  if (!motor) {
    details.innerHTML = '<p class="info-box">Select a motor from the catalog to verify speed, torque and inertia ratio.</p>';
    return;
  }

  const inertiaRatio = result.inertia_ratio !== null ? result.inertia_ratio.toFixed(2) : '—';
  const speedUtil = result.Nmotor / motor.Nn * 100;
  const torqueUtil = result.T_peak_motor / motor.Mn * 100;
  const inertiaUtil = result.inertia_ratio !== null ? result.inertia_ratio / state.sm_permitted_inertia_ratio * 100 : 0;

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
    </div>`;
}

/* Calculate total system accuracy — exact Excel formula (calc C208) */
function calculateSystemAccuracy() {
  const bs_acc   = state.bs_repetition_accuracy || 10; // micron (calc C198)
  const gb_deg   = (state.gb_backlash || 0) / 60;      // arcmin → degrees
  const gb_acc   = (gb_deg / 360 * state.bs_pitch) / 2 * 1000; // micron (calc C203)
  const motor_mm = state.bs_pitch / (state.sm_encoder_ppr || 1048576); // mm/pulse (calc C205)
  const motor_acc = motor_mm / 2 * 1000; // micron (calc C206)
  return bs_acc + gb_acc + motor_acc; // calc C208 — linear sum
}

function renderVerification(result) {
  const tbody = document.getElementById('verification-body');
  if (!tbody) return;
  const motor = result.selectedMotor;

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

function renderGearboxSuggestion(result) {
  const tbody = document.getElementById('gearbox-suggestion-body');
  const suggestion = document.getElementById('gearbox-best-suggestion');
  if (!tbody || !suggestion) return;

  const selectedMotor = result.selectedMotor;
  const options = [1, 3, 4, 5, 7, 10];
  const rows = options.map(ratio => {
    const motorTorque = result.T_peak_bs / (ratio * state.gb_efficiency) + state.gb_no_load_torque;
    const motorSpeed = result.Nscrew * state.pk_ratio * ratio;
    const speedOk = selectedMotor ? motorSpeed <= selectedMotor.Nn : true;
    const torqueOk = selectedMotor ? motorTorque <= selectedMotor.Mn : true;
    const score = motorTorque * 0.6 + motorSpeed * 0.4 + ((selectedMotor && (!speedOk || !torqueOk)) ? 2000 : 0);
    return {
      ratio,
      motorTorque,
      motorSpeed,
      speedOk,
      torqueOk,
      score,
    };
  });

  // Only keep viable ratios, sorted by lowest ratio first
  const viableRows = rows.filter(r => r.speedOk && r.torqueOk)
    .sort((a, b) => a.ratio - b.ratio);

  if (viableRows.length === 0) {
    suggestion.innerHTML = 'No viable gearbox ratio found for the selected motor and load.';
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:12px;color:var(--muted)">No viable gearbox ratio — select a motor first or adjust parameters.</td></tr>`;
    return;
  }

  const best = viableRows[0];
  if (Number(state.has_gearbox) !== 0 && !state.gb_ratio_user_selected && state.gb_ratio !== best.ratio) {
    state.gb_ratio = best.ratio;
    const inp = document.querySelector('[data-key="gb_ratio"]');
    if (inp) inp.value = best.ratio;
    saveState();
    render();
    return;
  }

  const direct = viableRows.find(r => r.ratio === 1);
  const directTorque = direct ? direct.motorTorque : viableRows[viableRows.length - 1].motorTorque;
  const saving = best.ratio > 1
    ? Math.round((1 - best.motorTorque / directTorque) * 100)
    : 0;

  let note = `<strong>Recommended ratio: ${best.ratio}:1</strong> — motor torque ${best.motorTorque.toFixed(2)} Nm at ${Math.round(best.motorSpeed)} rpm`;
  if (selectedMotor) note += ` (${selectedMotor.pn})`;
  if (saving > 0) {
    note += `.<br><span style="color:var(--success)">&#10003; ${saving}% torque reduction vs direct drive — enables a smaller, lower-cost motor.</span>`;
  } else {
    note += '. Direct drive is optimal for this load.';
  }
  suggestion.innerHTML = note;

  const activeRatio = state.gb_ratio;

  tbody.innerHTML = viableRows.map((row, i) => {
    const isActive = row.ratio === activeRatio;
    const isBest   = i === 0;
    const rowSaving = row.ratio > 1 && directTorque > 0
      ? Math.round((1 - row.motorTorque / directTorque) * 100)
      : 0;
    const savingTxt = rowSaving > 0
      ? `<span style="color:var(--success);font-weight:600">&#8595; ${rowSaving}% smaller motor</span>`
      : `<span style="color:var(--muted)">baseline</span>`;
    const activeBadge = isActive ? ' <span style="font-size:10px;background:var(--accent);color:#fff;padding:1px 6px;border-radius:99px;vertical-align:middle">active</span>' : '';
    return `
      <tr class="${isActive ? 'selected' : ''}" data-ratio="${row.ratio}"
          style="cursor:pointer" title="Click to apply ${row.ratio}:1 and auto-suggest motor">
        <td>${isBest ? '&#9733; ' : ''}${row.ratio}:1${activeBadge}</td>
        <td class="mono">${row.motorTorque.toFixed(2)} Nm</td>
        <td class="mono">${Math.round(row.motorSpeed)} rpm</td>
        <td>${savingTxt}</td>
        <td><span class="badge badge-ok">Viable</span></td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      const ratio = Number(tr.dataset.ratio);
      state.gb_ratio = ratio;
      state.gb_ratio_user_selected = true;
      // Update the input field visually
      const inp = document.querySelector('[data-key="gb_ratio"]');
      if (inp) inp.value = ratio;
      saveState();
      const newResult = calculate();
      // Auto-suggest best motor for new ratio (soft — user can override)
      const best = suggestBestMotor(newResult);
      if (best) {
        selectedMotorIdx = best.index;
        saveState();
        render();
      } else {
        render();
      }
    });
  });
}

function suggestBestMotor(result) {
  const needsBrakeSuggest = state.steps.some(s => Number(s.tilt_deg) !== 0);
  const scored = MOTOR_DB.map((motor, index) => {
    const J_rotor      = motor.Jmot * 1e-4;
    const speedUtil    = result.Nmotor / motor.Nn;
    const torqueUtil   = result.T_peak_motor / motor.Mn;
    const inertiaUtil  = (result.I_motor + J_rotor) / J_rotor / state.sm_permitted_inertia_ratio;
    const speedOk    = speedUtil <= 1;
    const torqueOk   = torqueUtil <= 1;
    const inertiaOk  = inertiaUtil <= 1;
    const brakeOk    = !needsBrakeSuggest || motor.brake;
    const viable     = speedOk && torqueOk && inertiaOk && brakeOk;
    // Primary: lowest kW (smallest motor). Secondary: lowest total utilization.
    const score = motor.kW * 1000 + (torqueUtil + speedUtil + inertiaUtil);
    return { motor, index, speedOk, torqueOk, inertiaOk, brakeOk, viable, score };
  });

  // PASS motors sorted: smallest watt first, then best utilization
  const pass = scored.filter(m => m.viable).sort((a, b) => a.score - b.score);
  return pass[0] || scored.sort((a, b) => a.score - b.score)[0] || null;
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
        selectedMotorIdx = best.index;
        state.motor_user_selected = true;
        saveState();
        saveMotorSelection();
        render();
      };
    }
  } else {
    container.innerHTML = `Closest motor: <strong>${best.motor.pn}</strong> — ${best.motor.Mn.toFixed(2)} Nm rated, ${best.motor.Nn} rpm (may still exceed one or more limits).`;
  }
}

function renderMovementSteps() {
  const container = document.getElementById('movement-steps-container');
  if (!container) return;
  const steps = Array.isArray(state.steps) && state.steps.length ? state.steps : [{ label: 'Step 1', stroke: 15, move_time: 1.0, external_force: 250, load_mass: 1.0, tilt_deg: 45 }];

  container.innerHTML = steps.map((step, index) => `
    <div class="step-card" data-step="${index}" style="
      border:1px solid var(--border);border-radius:12px;padding:16px;
      margin-top:14px;background:var(--surface-strong);
    ">
      <div class="step-header">
        <strong>Step ${index + 1}</strong>
        ${state.steps.length > 1 ? `<button type="button" class="button secondary remove-step" data-step="${index}" style="font-size:11px;padding:4px 10px;">Remove</button>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
        <div class="field-row">
          <label>Label
            <input data-step="${index}" data-field="label" type="text" value="${step.label || ''}" style="padding:8px 10px;font-size:13px;" />
          </label>
        </div>
        <div class="field-row">
          <label>Ext. force (N)
            <input data-step="${index}" data-field="external_force" type="number" step="1" value="${step.external_force}" style="padding:8px 10px;font-size:13px;" />
          </label>
        </div>
        <div class="field-row">
          <label>Stroke (mm)
            <input data-step="${index}" data-field="stroke" type="number" step="0.1" value="${step.stroke}" style="padding:8px 10px;font-size:13px;" />
          </label>
        </div>
        <div class="field-row">
          <label>Move time (s)
            <input data-step="${index}" data-field="move_time" type="number" step="0.01" value="${step.move_time}" style="padding:8px 10px;font-size:13px;" />
          </label>
        </div>
        <div class="field-row">
          <label>Acceleration time (s)
            <input data-step="${index}" data-field="acceleration_time" type="number" step="0.01" value="${step.acceleration_time ?? ''}" style="padding:8px 10px;font-size:13px;" />
          </label>
        </div>
        <div class="field-row">
          <label>Deceleration time (s)
            <input data-step="${index}" data-field="deceleration_time" type="number" step="0.01" value="${step.deceleration_time ?? ''}" style="padding:8px 10px;font-size:13px;" />
          </label>
        </div>
        <div class="field-row">
          <label>Payload mass (kg)
            <input data-step="${index}" data-field="load_mass" type="number" step="0.1" value="${step.load_mass}" style="padding:8px 10px;font-size:13px;" />
          </label>
        </div>
        <div class="field-row">
          <label>Tilt angle (°)
            <input data-step="${index}" data-field="tilt_deg" type="number" step="1" value="${step.tilt_deg}" style="padding:8px 10px;font-size:13px;" />
          </label>
        </div>
        <div class="field-row" style="grid-column:1/-1;">
          <label>Ext. force direction
            <select data-step="${index}" data-field="external_force_dir" style="padding:8px 10px;font-size:13px;">
              <option value="opposing" ${step.external_force_dir === 'opposing' ? 'selected' : ''}>Opposing movement (+)</option>
              <option value="aiding"   ${step.external_force_dir === 'aiding'   ? 'selected' : ''}>Aiding movement (−)</option>
            </select>
          </label>
        </div>
        <div class="field-row" style="grid-column:1/-1;">
          <label>Payload movement direction
            <select data-step="${index}" data-field="movement_dir" style="padding:8px 10px;font-size:13px;">
              <option value="against_gravity" ${step.movement_dir === 'against_gravity' ? 'selected' : ''}>Against gravity (+)</option>
              <option value="with_gravity"    ${step.movement_dir === 'with_gravity'    ? 'selected' : ''}>With gravity (−)</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  `).join('');
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
}

function updateMechanicalVisibility() {
  const parallelBlock = document.getElementById('parallel-kit-block');
  const gearboxBlock = document.getElementById('gearbox-block');
  const gbSuggestionBlock = document.getElementById('gearbox-suggestion-block');
  const hasParallel = Number(state.has_parallel_kit) !== 0;
  const hasGearbox = Number(state.has_gearbox) !== 0;

  if (parallelBlock) parallelBlock.style.display = hasParallel ? '' : 'none';
  if (gearboxBlock) gearboxBlock.style.display = hasGearbox ? '' : 'none';
  if (gbSuggestionBlock) gbSuggestionBlock.style.display = hasGearbox ? '' : 'none';
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
    }
  } else {
    return;
  }

  saveState();
  render();
}

function setExcelStatus(message, isError = false) {
  const status = document.getElementById('excel-status');
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? '#b91c1c' : '#111827';
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
    if (label.includes('application') || label.includes('operation') || label.includes('axis name') || label.includes('appl') || label.includes('stn no')) columnMap.set(index, 'label');
    else if (label.includes('stroke')) columnMap.set(index, 'stroke');
    else if (label.includes('move time')) columnMap.set(index, 'move_time');
    else if (label.includes('acceleration time')) columnMap.set(index, 'acceleration_time');
    else if (label.includes('deceleration time') || label.includes('decceleration time')) columnMap.set(index, 'deceleration_time');
    else if (label.includes('acc') || label.includes('acceleration')) columnMap.set(index, '_ignore_acc');
    else if (label.includes('external force') || label.includes('f pick') || label.includes('f load') || label.includes('f return')) columnMap.set(index, 'external_force');
    else if (label.includes('load mass') || label.includes('moving mass') || label.includes('payload mass')) columnMap.set(index, 'load_mass');
    else if (label.includes('tilt') || label.includes('orientation') || label.includes('theta')) columnMap.set(index, 'tilt_deg');
  });

  const steps = [];
  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row) || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      // An empty row after at least one step means the step table has ended.
      if (steps.length > 0) break;
      continue;
    }
    const step = { stroke: 0, move_time: 0.05, acceleration_time: null, deceleration_time: null, external_force: 0, load_mass: 0, tilt_deg: 0 };
    let rowHasData = false;

    for (const [col, field] of columnMap.entries()) {
      if (col >= row.length) continue;
      const cell = row[col];
      if (field === 'label') {
        const text = String(cell || '').trim();
        if (text) step[field] = text;
        // label alone does NOT mark a row as having step data — numeric fields required
        continue;
      }
      if (field === '_ignore_acc') continue;
      const raw = cell === null || cell === undefined ? '' : String(cell);
      const value = raw.trim() === '' ? NaN : Number(raw.replace(/[^0-9.eE+-]/g, ''));
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
      stroke: step.stroke,
      move_time: step.move_time,
      acceleration_time: step.acceleration_time,
      deceleration_time: step.deceleration_time,
      external_force: step.external_force,
      load_mass: step.load_mass,
      tilt_deg: step.tilt_deg,
    }));
    return steps.length;
  }

  return 0;
}

function parseExcelValues(rows) {
  const stepsFromTable = parseExcelStepRows(rows);
  const bearingTableUpdated = parseBearingDragTable(rows);
  let updated = stepsFromTable + bearingTableUpdated;

  // calc sheet: col A=index0 (section heading), col B=index1 (label), col C=index2 (value)
  // Try col B as label, col C as value first; fall back to col A / col B for other sheets
  //
  // NOTE: More-specific keys must appear BEFORE less-specific ones so that
  // substring matching picks the right entry (Map iterates in insertion order).
  const rawMappings = [
    // Application requirement
    ['dwell time',                              'dwell_time'],
    ['no of shifts per day',                    'project_shifts'],
    ['working hours per shift',                 'project_hours_shift'],
    ['working days per week',                   'project_days_week'],
    ['total cycle time of machine',             'project_total_cycle'],
    ['total operating time per cycle',          'project_operating_time'],
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
    ['external force on the moving mass',       'external_force'],
    ['external force direction',                '_text_external_force_dir'],
    // Specific inclination labels before generic 'inclination angle'
    ['inclination angle of counter balance',    'cb_angle_deg'],
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
    ['ball screw nut mass',                     'bs_nut_mass'],
    ['bs nut mass',                             'bs_nut_mass'],
    ['ball screw length',                       'bs_length'],
    ['bs length',                               'bs_length'],
    ['ball screw material',                     '_text_bs_material'],
    ['bs material',                             '_text_bs_material'],
    ['bs preload torque',                       'bs_preload_torque'],
    ['ball screw preload torque',               'bs_preload_torque'],
    ['guide block mass',                        'guide_block_mass'],
    ['guide block mass per block',              'guide_block_mass'],
    ['ball screw efficiency',                   'bs_efficiency_pct'],  // % → convert
    ['ball screw pitch',                        'bs_pitch'],
    ['ball screw dia',                          'bs_dia'],
    // Counterbalance
    ['counterbalance present',                  '_text_has_counterbalance'],
    ['counterbalance mass',                     'cb_mass'],
    ['counterbalance inclination angle',        'cb_angle_deg'],
    ['counterbalance friction coefficient',     'cb_mu'],
    ['linear bush friction force (counterbalance)','cb_bushing_friction_force'],
    ['linear bush friction force counterbalance','cb_bushing_friction_force'],
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
    ['gb- efficiency',                          'gb_efficiency_pct'],  // % → convert
    ['gb - efficiency',                         'gb_efficiency_pct'],
    ['gearbox efficiency',                      'gb_efficiency_pct'],
    ['gb-backlash',                             'gb_backlash'],
    ['gb - backlash',                           'gb_backlash'],
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
    ['cb mass',                                 'cb_mass'],
    ['cb inclination',                          'cb_angle_deg'],
    ['cb friction coeff',                       'cb_mu'],
    ['bs lead',                                 'bs_pitch'],
    ['bs efficiency',                           'bs_efficiency_pct'],
    ['bs inertia',                              '_ignore'],
    ['bs diameter',                             'bs_dia'],
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
    // Guide friction force (typo variants from user's working file)
    ['lm guide frcition force',                 'guide_force'],
    ['lm guide friction force',                 'guide_force'],
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
  const STEP_FIELDS = new Set(['stroke', 'move_time', 'acceleration_time', 'deceleration_time', 'external_force', 'tilt_deg', 'load_mass']);
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
    // If col2 is a non-numeric string (a symbol like "F", "Pb", "mp"), fall back to col4.
    const keyA = tryMatch(row[1]);
    if (keyA) {
      const v2 = row[2];
      const v2IsNumeric = typeof v2 === 'number' ||
        (v2 !== undefined && v2 !== null && v2 !== '' && !isNaN(Number(String(v2).trim())));
      const v4 = row[4];
      const value = (!v2IsNumeric && v4 !== undefined && v4 !== null && v4 !== '') ? v4 : v2;
      return { key: keyA, value };
    }

    // Layout B: col0 = label, col1 = value (old template)
    // Layout B2: col0 = label, col1 = notes (descriptive string), col2 = value (new template)
    const keyB = tryMatch(row[0]);
    if (keyB) {
      // If col1 looks like a notes string (non-numeric, non-empty, col2 has a real value) → new format
      const col1 = row[1];
      const col2 = row[2];
      const col1IsNotes = col1 !== undefined && col1 !== null && col1 !== '' &&
        typeof col1 === 'string' && isNaN(Number(String(col1).trim()));
      const col2HasValue = col2 !== undefined && col2 !== null && col2 !== '';
      const value = (col1IsNotes && col2HasValue) ? col2 : col1;
      return { key: keyB, value };
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

  for (const row of allRows) {
    if (!row || row.length < 2) continue;

    const match = resolveRow(row);
    if (!match || match.key === '_ignore') continue;

    let { key, value } = match;

    if (TEXT_FIELDS.has(key)) {
      const textValue = String(value || '').trim();
      if (textValue) {
        state[key] = textValue;
        updated++;
      }
      continue;
    }

    // Text direction fields — map human-readable strings to state enum values
    if (STEP_TEXT_FIELDS.has(key)) {
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

    // Counterbalance present: yes → 1, no → 0
    if (key === '_text_has_counterbalance') {
      const raw = String(value || '').toLowerCase().trim();
      state.has_counterbalance = raw.includes('yes') ? 1 : 0;
      updated++;
      continue;
    }

    if (key === '_text_bs_material') {
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
      if (state.bs_pitch > 0) { state.bs_max_speed = (parsed / state.bs_pitch) * 60; updated++; }
      continue;
    }
    if (key === 'bs_efficiency_pct') {
      state.bs_efficiency = parsed > 1 ? parsed / 100 : parsed; updated++; continue;
    }
    if (key === 'gb_efficiency_pct') {
      state.gb_efficiency = parsed > 1 ? parsed / 100 : parsed; updated++; continue;
    }
    if (key === 'pk_inertia_mm2') {
      state.pk_inertia = parsed * 1e-6; updated++; continue;
    }
    if (key === 'acc_pct') {
      state.acc_pct = parsed <= 1 ? parsed * 100 : parsed; updated++; continue;
    }
    if (key === 'safety_factor') {
      state.safety_factor = parsed <= 1 ? parsed * 100 : parsed; updated++; continue;
    }

    // Collect step-level fields separately (only when no step table was parsed)
    if (STEP_FIELDS.has(key) && stepsFromTable === 0) {
      importedStep[key] = parsed;
      updated++;
      continue;
    }

    state[key] = parsed;
    updated++;
  }

  // Promote single-operation step fields into steps[0] when no step table was found.
  // This handles the "Servo Inputs" template sheet where stroke, move_time etc. appear
  // as individual key-value rows rather than as a tabular step list.
  if (stepsFromTable === 0 && Object.keys(importedStep).length > 0) {
    if (!Array.isArray(state.steps) || state.steps.length === 0) {
      state.steps = [{ label: 'Step 1', stroke: 15, move_time: 1.0, external_force: 250, load_mass: 1.0, tilt_deg: 45 }];
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
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      // Read 'calc' sheet by name (labels in col B = index 1, values in col C = index 2)
      const sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'calc') || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      const updated = parseExcelValues(rows);
      if (updated > 0) {
        saveState();
        renderInputs();
        render();  // triggers suggestBestMotor() → auto-selects servo drive
        const motorMsg = selectedMotorIdx >= 0 && MOTOR_DB[selectedMotorIdx]
          ? ` Servo drive auto-selected: ${MOTOR_DB[selectedMotorIdx].pn}.`
          : '';
        setExcelStatus(`Imported ${updated} value(s) from Excel (sheet: ${sheetName}).${motorMsg}`);
      } else {
        setExcelStatus('No matching labels were found in the Excel file.', true);
      }
    } catch (error) {
      console.error(error);
      setExcelStatus('Excel file could not be parsed.', true);
    }
  };
  reader.readAsArrayBuffer(file);
}

function addMovementStep() {
  state.steps.push({
    label: `Step ${state.steps.length + 1}`,
    stroke: 15,
    move_time: 1.0,
    external_force: 250,
    load_mass: 1.0,
    tilt_deg: 45,
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
  selectedMotorIdx = Number(localStorage.getItem('titanServoSelectedMotor') || -1);
  if (selectedMotorIdx < 0 || selectedMotorIdx >= MOTOR_DB.length) selectedMotorIdx = -1;
}

function saveMotorSelection() {
  localStorage.setItem('titanServoSelectedMotor', selectedMotorIdx.toString());
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
      downloadExcelTemplate();
    });
  }

  document.getElementById('motor-table-body').addEventListener('click', event => {
    const row = event.target.closest('tr[data-index]');
    if (!row) return;
    selectedMotorIdx = Number(row.dataset.index);
    state.motor_user_selected = true;
    saveState();
    saveMotorSelection();
    render();
  });

  // Project context banner — injected when launched from project.html
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('ctx')) {
    injectProjectContextBanner();
  }
}

function injectProjectContextBanner() {
  let ctx = null;
  try { ctx = JSON.parse(localStorage.getItem('titanServoContext') || 'null'); } catch { /* ignore */ }
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

    // Determine status from last computed result and selected motor
    let status = 'NO MOTOR';
    let motorPN = null;
    if (selectedMotorIdx >= 0 && selectedMotorIdx < MOTOR_DB.length && lastResult) {
      const motor = MOTOR_DB[selectedMotorIdx];
      motorPN = motor.pn;
      const J_rotor = motor.Jmot * 1e-4;
      const speedOk  = lastResult.Nmotor <= motor.Nn;
      const torqueOk = lastResult.T_peak_motor <= motor.Mn;
      const inertiaOk = (lastResult.I_motor + J_rotor) / J_rotor <= state.sm_permitted_inertia_ratio;
      const needsBrakeCtx = state.steps.some(s => Number(s.tilt_deg) !== 0);
      const brakeOk = !needsBrakeCtx || motor.brake;
      status = (speedOk && torqueOk && inertiaOk && brakeOk) ? 'PASS' : 'FAIL';
    }

    // Persist back to project store
    const servoState = JSON.parse(localStorage.getItem('titanServoState') || 'null');
    if (window.Projects) {
      // Save key result metrics so the project export can display them without re-running the calculator
      let metrics = null;
      if (selectedMotorIdx >= 0 && selectedMotorIdx < MOTOR_DB.length && lastResult) {
        const m = MOTOR_DB[selectedMotorIdx];
        const permRatio = (servoState && servoState.sm_permitted_inertia_ratio) || 7;
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
      Projects.updateServo(ctx.projectId, ctx.servoId, {
        state: servoState,
        motorIdx: selectedMotorIdx,
        motor: motorPN,
        status,
        metrics,
      });
      Projects.clearContext();
    }

    window.location.href = 'project.html?id=' + ctx.projectId;
  });

  banner.appendChild(label);
  banner.appendChild(saveBtn);
  document.body.insertBefore(banner, document.body.firstChild);
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
      dwell:     state.dwell_time,
      Vmax,
      total:     t_acc + t_const + t_dec + state.dwell_time,
      color:     COLORS[i % COLORS.length],
      load_mass: step.load_mass,
      tilt_deg:  step.tilt_deg,
    });
    totalT += t_acc + t_const + t_dec + state.dwell_time;
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
            mass ${Number(seg.load_mass).toFixed(1)} kg · tilt ${Number(seg.tilt_deg).toFixed(0)}°
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
    totalT += t_acc + t_const + t_dec + state.dwell_time;
    return { t_acc, t_const, t_dec, dwell: state.dwell_time, Vmax, color: COLORS[i % COLORS.length], label: step.label || `Step ${i+1}` };
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

    // Axial force
    const theta = step.tilt_deg * Math.PI / 180;
    const grav_sign  = step.movement_dir === 'with_gravity' ? -1 : 1;
    const ext_sign   = step.external_force_dir === 'aiding' ? -1 : 1;
    const F_grav     = grav_sign * total_mass * 9.81 * Math.sin(theta);
    const F_pl_c     = total_mass * 9.81 * state.mu * Math.cos(theta);
    const F_cb_fr    = (Number(state.cb_n_bushings) || 0) * (Number(state.cb_bushing_friction_force) || 0);
    const F_fric_c   = F_pl_c + state.guide_n_blocks * state.guide_force + F_cb_fr;
    let F_cb = 0;
    if (Number(state.has_counterbalance)) {
      const th_cb = state.cb_angle_deg * Math.PI / 180;
      F_cb = -grav_sign * state.cb_mass * 9.81 * (Math.sin(th_cb) + state.cb_mu * Math.cos(th_cb));
    }
    const F_axial = ext_sign * step.external_force + F_grav + F_fric_c + F_cb;
    // Signed axial torque per sign matrix (no abs — gravity-aided cases can be negative)
    const T_axial = pitch_m > 0 ? F_axial * pitch_m / (2 * Math.PI * state.bs_efficiency) : 0;
    const T_preload = state.bs_preload_torque;
    const bearingDragPreview = getBearingDragComponents();
    const T_bs_load = T_axial + T_preload + bearingDragPreview.total + pkNL;

    const BS_DENSITY_C = { steel: 7870, stainless: 7930, aluminum: 2700 };
    const Jrm_c = (Math.PI / 32) * (BS_DENSITY_C[state.bs_material] || 7870) * (state.bs_length / 1000) * Math.pow(state.bs_dia / 1000, 4);
    const J_ref  = (total_mass * Math.pow(pitch_m / (2 * Math.PI), 2)) + Jrm_c + (pkEnabled ? state.pk_inertia : 0) + (gbEnabled ? state.gb_inertia : 0);
    const Nsc_c  = pitch_m > 0 ? Vmax_m * 1000 / state.bs_pitch * 60 : 0;
    const T_acc  = t_acc > 0 ? J_ref * Nsc_c / (9.55 * t_acc) : 0;
    const T_dec  = t_dec > 0 ? J_ref * Nsc_c / (9.55 * t_dec) : 0;

    const SF_c = 1 + state.safety_factor / 100;
    const T_load_m  = eff_ratio > 0 ? Math.abs(T_bs_load) / (eff_ratio * eff_eff) + gbNL : 0;
    const T_peak_m  = eff_ratio > 0 ? Math.abs(T_bs_load + T_acc) * SF_c / (eff_ratio * eff_eff) + gbNL : 0;
    const T_decel_m = eff_ratio > 0 ? Math.abs(T_bs_load - T_dec) * SF_c / (eff_ratio * eff_eff) + gbNL : 0;

    maxT = Math.max(maxT, T_peak_m, Math.abs(T_decel_m));
    totalT += t_acc + t_const + t_dec + state.dwell_time;
    return { t_acc, t_const, t_dec, dwell: state.dwell_time, T_load_m, T_peak_m, T_decel_m, color: COLORS[i % COLORS.length], label: step.label || `Step ${i+1}` };
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
    if (state.dwell_time > 0) {
      points.push({ t: cursor + state.dwell_time, d: cumDist, ci: i });
      cursor += state.dwell_time;
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
    cursor += t_acc + Math.max(0, avail - t_acc - t_dec) + t_dec + state.dwell_time;
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
  const motor = result.selectedMotor;
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

  const motorRows = motor ? [
    ['Part number', motor.pn],
    ['Series', motor.series],
    ['Rated torque Mn', `${motor.Mn.toFixed(2)} Nm`],
    ['Peak torque Mmax', `${motor.Mmax.toFixed(2)} Nm`],
    ['Rated speed Nn', `${motor.Nn} rpm`],
    ['Rotor inertia Jmot', `${motor.Jmot.toFixed(3)} kg·cm²`],
    ['Holding brake', motor.brake ? 'Yes' : 'No'],
  ] : [['Selected Motor', 'No motor selected']];

  doc.autoTable({
    startY: y,
    head: [['Selected Motor', 'Details']],
    body: motorRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [31, 56, 100] },
    margin: { left: marginX, right: marginX },
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

window.addEventListener('DOMContentLoaded', init);
