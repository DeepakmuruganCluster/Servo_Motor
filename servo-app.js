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
    { label: 'Step 1', stroke: 15, move_time: 1.0, external_force: 250, load_mass: 1.0, tilt_deg: 45 }
  ],
  mu: 0.03,
  guide_force: 15,
  guide_mass: 1.6,
  bs_pitch: 2,
  bs_efficiency: 0.98,
  bs_inertia: 1.0704e-5,
  bs_friction_torque: 0.05,
  bs_max_speed: 12000,       // calc C321 — Ball screw permitted velocity (rpm)
  bs_max_torque: 3,          // calc C334 — Ball screw permitted driving torque (Nm)
  bs_repetition_accuracy: 10,// calc C198 — Ball screw repetition accuracy (micron)
  // Parallel kit
  has_parallel_kit: true,
  pk_ratio: 1,
  pk_no_load_torque: 0.07,
  pk_inertia: 2.67e-5,
  pk_max_torque: 3,
  pk_max_speed: 6000,
  // Gearbox
  has_gearbox: false,
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

function downloadExcelTemplate() {
  const headers = ['Application', 'Stroke', 'Move time', 'Acceleration %', 'External force', 'Moving mass', 'Tilt angle'];
  const sampleRow = ['Op10', 15, 1.0, 25, 250, 1.0, 45];
  const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const workbook = { SheetNames: ['ProjectSteps'], Sheets: { ProjectSteps: worksheet } };
  const workbookArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([workbookArray], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'titan-servo-project-template.xlsx';
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
  if (!Array.isArray(state.steps) || state.steps.length === 0) {
    state.steps = [{ label: 'Step 1', stroke: 15, move_time: 1.0, external_force: 250, load_mass: 1.0, tilt_deg: 45 }];
  }
  state.steps = state.steps.slice(0, 8).map((step, index) => ({
    label: String(step.label || step.application || `Step ${index + 1}`),
    stroke: Math.max(0, Number(step.stroke) || 0),
    move_time: Math.max(0.05, Number(step.move_time) || 0.05),
    external_force: Number(step.external_force) || 0,
    load_mass: Math.max(0, Number(step.load_mass) || 0),
    tilt_deg: Number(step.tilt_deg) || 0,
  }));
  state.mu = Math.max(0, Number(state.mu) || 0);
  state.guide_force = Math.max(0, Number(state.guide_force) || 0);
  state.guide_mass = Math.max(0, Number(state.guide_mass) || 0);
  state.bs_pitch = Math.max(0.1, Number(state.bs_pitch) || 0.1);
  state.bs_efficiency = Math.min(1, Math.max(0.01, Number(state.bs_efficiency) || 0.98));
  state.bs_inertia = Math.max(0, Number(state.bs_inertia) || 0);
  state.bs_friction_torque = Math.max(0, Number(state.bs_friction_torque) || 0);
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

function calculateStepGroup(steps) {
  // Effective drive ratio and efficiency (PK × GB)
  const eff_ratio = state.pk_ratio * state.gb_ratio;
  const eff_efficiency = state.gb_efficiency;
  const pitch_m = state.bs_pitch / 1000;

  const results = {
    Vmax_mm_s: 0, amax: 0, Nscrew: 0, Nmotor: 0,
    axial_force: 0, T_bs_load: 0, T_accel: 0,
    T_peak_bs: 0, T_peak_motor: 0, T_load_motor: 0,
    sumTorqueEnergy: 0, totalMotionTime: 0, maxJReflected: 0,
  };

  steps.forEach(step => {
    const available_time = Math.max(step.move_time - state.dwell_time, 0.01);
    const t_acc   = Math.min(available_time / 2, available_time * (state.acc_pct / 100));
    const t_dec   = t_acc;
    const t_const = Math.max(0, available_time - t_acc - t_dec);

    const stroke_m   = step.stroke / 1000;
    const Vmax_m_s   = available_time > t_acc ? stroke_m / (available_time - t_acc) : 0;
    const Vmax_mm_s  = Vmax_m_s * 1000;
    const amax       = t_acc > 0 ? Vmax_m_s / t_acc : 0;
    const Nscrew     = pitch_m > 0 ? Vmax_mm_s / state.bs_pitch * 60 : 0;
    const Nmotor     = Nscrew * eff_ratio;

    const theta      = step.tilt_deg * Math.PI / 180;
    const total_mass = step.load_mass + state.guide_mass;
    const F_friction = total_mass * G * Math.cos(theta) * state.mu;
    const F_gravity  = total_mass * G * Math.sin(theta);
    const axial_force = Math.abs(step.external_force + F_friction + F_gravity) + state.guide_force;

    const T_mass = pitch_m > 0 ? (axial_force * pitch_m) / (2 * Math.PI * state.bs_efficiency) : 0;
    // pk_no_load is at BS shaft — included in safety factor (matches Excel row 143→183)
    const T_bs_load = T_mass + state.bs_friction_torque + state.pk_no_load_torque;

    const J_mass      = total_mass * Math.pow(pitch_m / (2 * Math.PI), 2);
    const J_reflected = J_mass + state.bs_inertia + state.pk_inertia + state.gb_inertia;
    const alpha       = pitch_m > 0 ? amax * (2 * Math.PI) / pitch_m : 0;
    const T_accel     = J_reflected * alpha;

    const T_peak_bs    = (T_bs_load + T_accel) * (1 + state.safety_factor / 100);
    // gb_no_load is at motor shaft — added after ratio (Excel row 186→187)
    const T_peak_motor = eff_ratio > 0 ? T_peak_bs / (eff_ratio * eff_efficiency) + state.gb_no_load_torque : 0;
    const T_load_motor = eff_ratio > 0 ? T_bs_load / (eff_ratio * eff_efficiency) + state.gb_no_load_torque : 0;

    const Iacc      = (t_acc / 3) * (T_load_motor ** 2 + T_load_motor * T_peak_motor + T_peak_motor ** 2);
    const Idec      = (t_dec / 3) * (T_peak_motor ** 2 + T_peak_motor * T_load_motor + T_load_motor ** 2);
    const Iconst    = T_load_motor ** 2 * t_const;
    const stepEnergy = Iacc + Iconst + Idec;

    results.Vmax_mm_s  = Math.max(results.Vmax_mm_s,  Vmax_mm_s);
    results.amax       = Math.max(results.amax,        amax);
    results.Nscrew     = Math.max(results.Nscrew,      Nscrew);
    results.Nmotor     = Math.max(results.Nmotor,      Nmotor);
    results.axial_force = Math.max(results.axial_force, axial_force);
    results.T_bs_load  = Math.max(results.T_bs_load,   T_bs_load);
    results.T_accel    = Math.max(results.T_accel,     T_accel);
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

  // Auto-select best motor if:
  //   a) none selected, OR
  //   b) currently selected motor is no longer viable (user changed parameters)
  const _curMotor = selectedMotorIdx >= 0 ? MOTOR_DB[selectedMotorIdx] : null;
  const _needsBrakeCheck = state.steps.some(s => Number(s.tilt_deg) !== 0);
  const _curViable = _curMotor && (() => {
    const Jr = _curMotor.Jmot * 1e-4;
    return result.Nmotor <= _curMotor.Nn
        && result.T_peak_motor <= _curMotor.Mn
        && (result.I_motor + Jr) / Jr <= state.sm_permitted_inertia_ratio
        && (!_needsBrakeCheck || _curMotor.brake);
  })();
  if (!_curViable) {
    const best = suggestBestMotor(result);
    if (best && best.viable) {
      selectedMotorIdx = best.index;
      saveMotorSelection();
    }
  }

  renderProjectSummary();

  // Ball screw shaft
  renderMetric('out_tpeak_bs',    result.T_peak_bs,       3, '');
  renderMetric('out_nscrew',      Math.round(result.Nscrew), 0, '');
  renderMetric('out_vmax',        result.Vmax_mm_s,       1, '');

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

  const rows = passMotors.map(({ motor, index, speedUtil, torqueUtil, inertiaUtil }, rank) => {
    const rowClass = index === selectedMotorIdx ? 'selected' : '';
    return `
      <tr class="${rowClass}" data-index="${index}" style="cursor:pointer">
        <td class="mono" style="font-weight:700;color:var(--accent)">${rank + 1}</td>
        <td class="mono">${rank === 0 ? '★ ' : ''}${motor.pn}</td>
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
    // ── Gearbox ──
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
  if (!best) {
    container.textContent = 'No servo motor recommendation available.';
    return;
  }

  if (best.viable) {
    container.innerHTML = `Recommended motor: <strong>${best.motor.pn}</strong> (${best.motor.series}) — ${best.motor.Mn.toFixed(2)} Nm rated (Mn), ${best.motor.Mmax.toFixed(2)} Nm peak (Mmax), ${best.motor.Nn} rpm (Nn)${best.motor.brake ? ', <strong>Brake</strong>' : ''}.`;
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
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-top:12px;">
        <div class="field-row">
          <label>Label
            <input data-step="${index}" data-field="label" type="text" value="${step.label || ''}" style="padding:8px 10px;font-size:13px;" />
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
          <label>Ext. force (N)
            <input data-step="${index}" data-field="external_force" type="number" step="1" value="${step.external_force}" style="padding:8px 10px;font-size:13px;" />
          </label>
        </div>
        <div class="field-row">
          <label>Moving mass (kg)
            <input data-step="${index}" data-field="load_mass" type="number" step="0.1" value="${step.load_mass}" style="padding:8px 10px;font-size:13px;" />
          </label>
        </div>
        <div class="field-row">
          <label>Tilt angle (°)
            <input data-step="${index}" data-field="tilt_deg" type="number" step="1" value="${step.tilt_deg}" style="padding:8px 10px;font-size:13px;" />
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
  renderMovementSteps();
}

function handleInput(event) {
  const target = event.target;
  const key = target.dataset.key;
  const stepIndex = target.dataset.step;
  const field = target.dataset.field;
  const value = target.type === 'checkbox' ? target.checked : target.value;

  if (typeof stepIndex !== 'undefined' && typeof field !== 'undefined') {
    const index = Number(stepIndex);
    if (!Number.isNaN(index) && state.steps[index]) {
      state.steps[index][field] = field === 'label' ? String(value) : Number(value);
    }
  } else if (key) {
    state[key] = Number(value);
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

function parseExcelStepRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return 0;

  const headerRowIndex = rows.findIndex(row => Array.isArray(row) && row.some(cell => normalizeLabel(cell).includes('stroke')) && row.some(cell => normalizeLabel(cell).includes('move time')));
  if (headerRowIndex < 0) return 0;

  const headers = rows[headerRowIndex].map(cell => normalizeLabel(cell));
  const columnMap = new Map();
  headers.forEach((label, index) => {
    if (label.includes('application') || label.includes('op') || label.includes('operation')) columnMap.set(index, 'label');
    else if (label.includes('stroke')) columnMap.set(index, 'stroke');
    else if (label.includes('move time')) columnMap.set(index, 'move_time');
    else if (label.includes('acc') || label.includes('acceleration')) columnMap.set(index, '_ignore_acc');
    else if (label.includes('external force')) columnMap.set(index, 'external_force');
    else if (label.includes('load mass') || label.includes('moving mass')) columnMap.set(index, 'load_mass');
    else if (label.includes('tilt')) columnMap.set(index, 'tilt_deg');
  });

  const steps = [];
  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row) || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;
    const step = { stroke: 0, move_time: 0.05, external_force: 0, load_mass: 0, tilt_deg: 0 };
    let rowHasData = false;

    for (const [col, field] of columnMap.entries()) {
      if (col >= row.length) continue;
      const cell = row[col];
      if (field === 'application') {
        const text = String(cell || '').trim();
        if (text) {
          step[field] = text;
          rowHasData = true;
        }
        continue;
      }
      const value = Number(String(cell).replace(/[^0-9.+-]/g, ''));
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
      external_force: step.external_force,
      load_mass: step.load_mass,
      tilt_deg: step.tilt_deg,
    }));
    return steps.length;
  }

  return 0;
}

function parseExcelValues(rows) {
  let updated = parseExcelStepRows(rows);

  // calc sheet: col A=index0 (section heading), col B=index1 (label), col C=index2 (value)
  // Try col B as label, col C as value first; fall back to col A / col B for other sheets
  const mapping = new Map([
    // Application requirement (calc B4-B18)
    ['no of shifts per day',                    'project_shifts'],
    ['working hours per shift',                 'project_hours_shift'],
    ['working days per week',                   'project_days_week'],
    ['total cycle time of machine',             'project_total_cycle'],
    ['total operating time per cycle',          'project_operating_time'],
    ['expected service life of machine',        'project_service_life'],
    ['movement accuracy required',              'project_accuracy'],
    ['movement stroke required',                'stroke'],
    ['cycle time available for single movement','move_time'],
    ['external force on the moving mass',       'external_force'],
    ['moving mass',                             'load_mass'],
    ['tilt angle of the setup',                 'tilt_deg'],
    ['acceleration %',                          'acc_pct'],
    ['acceleration time %',                     'acc_pct'],
    ['accel decel time %',                      'acc_pct'],
    ['safety factor %',                         'safety_factor'],
    ['safety factor',                           'safety_factor'],
    // Ball screw (calc B22-B23, B69-B73)
    ['ball screw pitch',                        'bs_pitch'],
    ['ball screw efficiency',                   'bs_efficiency_pct'],  // % → convert
    ['ball screw friction torque',              'bs_friction_torque'],
    ['ball screw friction torque @ application','bs_friction_torque'],
    ['ball screw moment of inertia',            'bs_inertia'],
    ['ball screw - moment of inertia',          'bs_inertia'],
    ['ball screw - repetition accuracy',        'bs_repetition_accuracy'],
    ['ball screw repetition accuracy',          'bs_repetition_accuracy'],
    ['ball screw permitted driving torque max', 'bs_max_torque'],
    ['ball screw - permitted driving torque max','bs_max_torque'],
    ['ball screw - permitted velocity',         'bs_max_speed_mms'], // mm/sec, convert later
    ['ball screw - permitted driving torque',   'bs_max_torque'],
    // Parallel kit (calc B26-B30)
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
    // Gearbox (calc B42-B47, B76-B82)
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
    // Servo motor (calc B57-B59)
    ['sm - permitted inertia ratio',            'sm_permitted_inertia_ratio'],
    ['sm - encoder reolution',                  'sm_encoder_ppr'],
    ['sm - encoder resolution',                 'sm_encoder_ppr'],
    // Guide (calc B33-B34)
    ['displacement force required',             'guide_force'],
    ['moving mass',                             'guide_mass'],
  ]);

  function resolveRow(row) {
    // Try layout A: col B = label, col C = value (calc sheet)
    // Try layout B: col A = label, col B = value (Servo Inputs sheet)
    // Pick whichever yields a mapping match
    const tryMatch = (lbl) => {
      const label = normalizeLabel(lbl);
      if (!label) return null;
      let key = mapping.get(label);
      if (!key) {
        for (const [k, v] of mapping) {
          if (label.includes(k) || k.includes(label)) { key = v; break; }
        }
      }
      return key || null;
    };

    // Layout A: col1 = label, col2 = value
    const keyA = tryMatch(row[1]);
    if (keyA) return { key: keyA, value: row[2] };

    // Layout B: col0 = label, col1 = value
    const keyB = tryMatch(row[0]);
    if (keyB) return { key: keyB, value: row[1] };

    return null;
  }

  for (const row of rows) {
    if (!row || row.length < 2) continue;

    const match = resolveRow(row);
    if (!match || match.key === '_ignore') continue;

    let { key, value } = match;

    const parsed = Number(String(value).replace(/[^0-9.eE+-]/g, ''));
    if (isNaN(parsed)) continue;

    // Unit conversions and special keys
    if (key === 'bs_max_speed_mms') {
      if (state.bs_pitch > 0) { state.bs_max_speed = (parsed / state.bs_pitch) * 60; updated++; }
      continue;
    }
    if (key === 'bs_efficiency_pct') {
      // Template stores as % (e.g. 98), state needs decimal (0.98)
      state.bs_efficiency = parsed > 1 ? parsed / 100 : parsed; updated++; continue;
    }
    if (key === 'gb_efficiency_pct') {
      state.gb_efficiency = parsed > 1 ? parsed / 100 : parsed; updated++; continue;
    }
    if (key === 'pk_inertia_mm2') {
      // Template stores in kg·mm², state needs kg·m²
      state.pk_inertia = parsed * 1e-6; updated++; continue;
    }
    if (key === 'acc_pct') {
      // Calc sheet stores as decimal fraction (0.25), state needs percentage (25)
      state.acc_pct = parsed <= 1 ? parsed * 100 : parsed; updated++; continue;
    }
    if (key === 'safety_factor') {
      // Calc sheet stores as decimal fraction (0.20), state needs percentage (20)
      state.safety_factor = parsed <= 1 ? parsed * 100 : parsed; updated++; continue;
    }

    state[key] = parsed;
    updated++;
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
        render();
        setExcelStatus(`Imported ${updated} value(s) from Excel (sheet: ${sheetName}).`);
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
  if (!canvas) return;

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
    const avail   = Math.max(step.move_time - state.dwell_time, 0.01);
    const t_acc   = Math.min(avail / 2, avail * (state.acc_pct / 100));
    const t_dec   = t_acc;
    const t_const = Math.max(0, avail - t_acc - t_dec);
    const Vmax    = avail > t_acc ? (step.stroke / avail) : 0;   // mm/s simplified
    maxV = Math.max(maxV, Vmax);
    segs.push({
      label: step.label || `Step ${i + 1}`,
      t_acc, t_const, t_dec,
      dwell: state.dwell_time,
      Vmax,
      color: COLORS[i % COLORS.length],
    });
    totalT += t_acc + t_const + t_dec + state.dwell_time;
  });

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
  [['#1d4ed8','Accel'], ['#16a34a','Constant'], ['#b45309','Decel'], ['#9ca3af','Dwell']].forEach(([c, lbl], i) => {
    ctx.fillStyle = c; ctx.fillRect(PAD.left + i * 100, phaseY, 12, 8);
    ctx.fillStyle = '#374151'; ctx.textAlign = 'left'; ctx.font = '10px Inter,system-ui,sans-serif';
    ctx.fillText(lbl, PAD.left + i * 100 + 15, phaseY + 7);
  });

  // Draw each step ──────────────────────────────
  let cursor = 0;
  segs.forEach(seg => {
    const phases = [
      { t: seg.t_acc,   v0: 0,        v1: seg.Vmax,  shade: '#3b82f620' },
      { t: seg.t_const, v0: seg.Vmax, v1: seg.Vmax,  shade: '#22c55e20' },
      { t: seg.t_dec,   v0: seg.Vmax, v1: 0,         shade: '#f9731620' },
      { t: seg.dwell,   v0: 0,        v1: 0,         shade: '#e5e7eb40' },
    ];

    let t = cursor;
    phases.forEach(ph => {
      if (ph.t <= 0) return;
      ctx.beginPath();
      ctx.moveTo(tX(t),        vY(ph.v0));
      ctx.lineTo(tX(t + ph.t), vY(ph.v1));
      ctx.lineTo(tX(t + ph.t), vY(0));
      ctx.lineTo(tX(t),        vY(0));
      ctx.closePath();
      ctx.fillStyle = ph.shade;
      ctx.fill();
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
      ctx.fillText(seg.label, tX(midT), vY(seg.Vmax) - 8);
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
          <span><strong>${seg.label}</strong> — acc ${seg.t_acc.toFixed(2)}s · const ${seg.t_const.toFixed(2)}s · dec ${seg.t_dec.toFixed(2)}s · dwell ${seg.dwell.toFixed(2)}s</span>
        </span>`).join('') +
      `<span style="margin-left:auto;font-weight:700;color:var(--text);white-space:nowrap;">Total cycle: ${totalCycle.toFixed(2)} s</span>`;
  }
}

/* ─────────────────────────────────────────────
   REPORT — Download only (no UI display)
───────────────────────────────────────────── */
function downloadReport(result) {
  if (!window.XLSX) { alert('XLSX library not loaded.'); return; }

  const motor    = result.selectedMotor;
  const sysAcc   = calculateSystemAccuracy();
  const dateStr  = new Date().toLocaleDateString(undefined, { day:'numeric', month:'long', year:'numeric' });

  const aoa = [];

  // Header
  aoa.push(['ClusterVise — Servo Sizing Report']);
  aoa.push([dateStr]);
  aoa.push([]);

  // At Ball screw shaft
  aoa.push(['At Ball screw shaft']);
  aoa.push(['Torque Required at ball screw shaft', result.T_peak_bs.toFixed(2), 'Nm']);
  aoa.push(['Speed Required at ball screw shaft',  Math.round(result.Nscrew),    'rpm']);
  aoa.push(['Linear Speed of the ball screw shaft', result.Vmax_mm_s.toFixed(1), 'mm/sec']);
  aoa.push([]);

  // At Motor shaft
  aoa.push(['At Motor shaft']);
  aoa.push(['Torque Required at Motor shaft', result.T_peak_motor.toFixed(2), 'Nm']);
  aoa.push(['Speed Required at Motor shaft',  Math.round(result.Nmotor),       'rpm']);
  aoa.push([]);

  // Selected Motor
  aoa.push(['Selected Motor']);
  if (motor) {
    aoa.push(['Part number',           motor.pn]);
    aoa.push(['Series',                motor.series]);
    aoa.push(['Rated torque Mn',       motor.Mn,   'Nm']);
    aoa.push(['Peak torque Mmax',      motor.Mmax, 'Nm']);
    aoa.push(['Rated speed Nn',        motor.Nn,   'rpm']);
    aoa.push(['Rotor inertia Jmot',    motor.Jmot, 'kg·cm²']);
    aoa.push(['Holding brake',         motor.brake ? 'Yes' : 'No']);
  } else {
    aoa.push(['No motor selected']);
  }
  aoa.push([]);

  // Verification Checklist (blue rows only — exact Excel names)
  aoa.push(['Verification Checklist']);
  aoa.push(['Parameters', 'Capacity / Selected', 'Actual / Required', 'Utilization', 'Result', 'Remarks']);

  const chkRows = [
    ['Motor Rated Speed Nn, rpm',
      motor ? motor.Nn : '',
      Math.round(result.Nmotor),
      motor ? (result.Nmotor / motor.Nn * 100).toFixed(0) + '%' : '',
      motor ? (result.Nmotor <= motor.Nn ? 'OK' : 'NOK') : ''],
    ['Motor Rated Torque Mn, Nm',
      motor ? motor.Mn : '',
      result.T_peak_motor.toFixed(2),
      motor ? (result.T_peak_motor / motor.Mn * 100).toFixed(0) + '%' : '',
      motor ? (result.T_peak_motor <= motor.Mn ? 'OK' : 'Check Duty cycle') : ''],
    ['Motor Inertia Ratio',
      state.sm_permitted_inertia_ratio,
      result.inertia_ratio !== null ? result.inertia_ratio.toFixed(2) : '',
      result.inertia_ratio !== null ? (result.inertia_ratio / state.sm_permitted_inertia_ratio * 100).toFixed(0) + '%' : '',
      result.inertia_ratio !== null ? (result.inertia_ratio <= state.sm_permitted_inertia_ratio ? 'OK' : 'NOK') : ''],
    ['GearBox Input speed, rpm',
      state.gb_rated_input_speed || '',
      Math.round(result.Nmotor),
      state.gb_rated_input_speed > 0 ? (result.Nmotor / state.gb_rated_input_speed * 100).toFixed(0) + '%' : '#DIV/0!',
      state.gb_rated_input_speed > 0 ? (result.Nmotor <= state.gb_rated_input_speed ? 'OK' : 'NOK') : '#DIV/0!'],
    ['GearBox Output Torque, Nm',
      state.gb_rated_output_torque || '',
      result.T_peak_bs.toFixed(2),
      state.gb_rated_output_torque > 0 ? (result.T_peak_bs / state.gb_rated_output_torque * 100).toFixed(0) + '%' : '#DIV/0!',
      state.gb_rated_output_torque > 0 ? (result.T_peak_bs <= state.gb_rated_output_torque ? 'OK' : 'NOK') : '#DIV/0!'],
    ['Ball screw max speed, rpm',
      state.bs_max_speed,
      Math.round(result.Nscrew),
      (result.Nscrew / state.bs_max_speed * 100).toFixed(0) + '%',
      result.Nscrew <= state.bs_max_speed ? 'OK' : 'NOK',
      'Wish list'],
    ['Ball screw max torque',
      state.bs_max_torque,
      result.T_peak_bs.toFixed(2),
      (result.T_peak_bs / state.bs_max_torque * 100).toFixed(0) + '%',
      result.T_peak_bs <= state.bs_max_torque ? 'OK' : 'NOK',
      'Wish list'],
    ['Movement accuracy of the system, (+/-) micron',
      sysAcc.toFixed(2),
      state.project_accuracy,
      (sysAcc / state.project_accuracy * 100).toFixed(0) + '%',
      sysAcc <= state.project_accuracy ? 'OK' : 'NOK'],
  ];
  chkRows.forEach(r => aoa.push(r));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = { SheetNames: ['Report'], Sheets: { Report: ws } };
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ClusterVise_Servo_Report.xlsx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', init);
