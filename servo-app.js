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
  steps: [
    { label: 'Step 1', stroke: 15, move_time: 1.0, acc_pct: 25, external_force: 250, load_mass: 1.0, tilt_deg: 45 }
  ],
  mu: 0.03,
  guide_force: 15,
  guide_mass: 1.6,
  bs_pitch: 2,
  bs_efficiency: 0.98,
  bs_inertia: 1.0704e-5,
  bs_friction_torque: 0.05,
  // Parallel kit
  pk_ratio: 1,
  pk_no_load_torque: 0.07,
  pk_inertia: 2.67e-5,
  pk_max_torque: 3,
  pk_max_speed: 6000,
  // Gearbox
  gb_ratio: 1,
  gb_efficiency: 1.0,
  gb_no_load_torque: 0,
  gb_inertia: 0,
  gb_backlash: 0,
  safety_factor: 20,
};

const MOTOR_DB = [
  { pn:'1FK2102-1AG10-1MA0', series:'1FK2', kW:0.10, M0:0.32, Tmax:0.96, Nmax:6000, J:0.052, bits:20, desc:'0.32 Nm · 3000 rpm' },
  { pn:'1FK2104-4AF00-1MA0', series:'1FK2', kW:0.40, M0:1.27, Tmax:3.81, Nmax:7200, J:0.330, bits:20, desc:'1.27 Nm · 3000 rpm' },
  { pn:'1FK2105-6AF10-1MA0', series:'1FK2', kW:2.10, M0:6.70, Tmax:20.10, Nmax:6000, J:5.000, bits:20, desc:'6.70 Nm · 3000 rpm' },
  { pn:'1FK2204-5AF00-1MA0', series:'1FK2', kW:0.75, M0:2.40, Tmax:7.20, Nmax:6000, J:1.200, bits:20, desc:'2.40 Nm · 3000 rpm' },
  { pn:'1FK2206-4AF10-1MA0', series:'1FK2', kW:2.70, M0:8.60, Tmax:25.80, Nmax:6000, J:6.000, bits:20, desc:'8.60 Nm · 3000 rpm' },
  { pn:'1FK7032-2AK71-1CB0', series:'1FK7', kW:0.50, M0:1.15, Tmax:3.45, Nmax:9000, J:1.300, bits:24, desc:'1.15 Nm · 6000 rpm' },
  { pn:'1FK7042-2AF71-1RH0', series:'1FK7', kW:0.82, M0:3.00, Tmax:9.00, Nmax:6000, J:3.200, bits:24, desc:'3.00 Nm · 3000 rpm' },
  { pn:'1FT7034-5AK71-1CH0', series:'1FT7', kW:0.88, M0:1.40, Tmax:4.20, Nmax:9000, J:1.000, bits:22, desc:'1.40 Nm · 6000 rpm' },
  { pn:'1FT7044-5AF70-1CH0', series:'1FT7', kW:1.35, M0:5.00, Tmax:15.00, Nmax:6000, J:5.430, bits:22, desc:'5.00 Nm · 3000 rpm' },
  { pn:'1PH8133-1HG03-1QA2', series:'1PH8', kW:15.00, M0:47.75, Tmax:95.50, Nmax:6000, J:120.0, bits:11, desc:'47.75 Nm · 3000 rpm' },
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
  if (!Array.isArray(state.steps) || state.steps.length === 0) {
    state.steps = [{ label: 'Step 1', stroke: 15, move_time: 1.0, acc_pct: 25, external_force: 250, load_mass: 1.0, tilt_deg: 45 }];
  }
  state.steps = state.steps.slice(0, 8).map((step, index) => ({
    label: String(step.label || step.application || `Step ${index + 1}`),
    stroke: Math.max(0, Number(step.stroke) || 0),
    move_time: Math.max(0.05, Number(step.move_time) || 0.05),
    acc_pct: Math.min(80, Math.max(1, Number(step.acc_pct) || 25)),
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
    const t_acc   = Math.min(available_time / 2, available_time * (step.acc_pct / 100));
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
  const J_rotor = selectedMotor ? selectedMotor.J * 1e-4 : null;
  const inertia_ratio = selectedMotor ? (overallResult.I_motor + J_rotor) / J_rotor : null;

  const checks = {
    speed: overallResult.Nmotor <= (selectedMotor ? selectedMotor.Nmax : 10000),
    peak: overallResult.T_peak_motor <= (selectedMotor ? selectedMotor.Tmax : 9999),
    rms: overallResult.T_rms_motor <= (selectedMotor ? selectedMotor.M0 * 0.7 : 9999),
    inertia: selectedMotor ? inertia_ratio <= 10 : true,
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

  renderProjectSummary();
  renderMetric('out_vmax', result.Vmax_mm_s, 1, ' mm/s');
  renderMetric('out_amax', result.amax, 3, ' m/s²');
  renderMetric('out_nscrew', Math.round(result.Nscrew), 0, ' rpm');
  renderMetric('out_nmotor', Math.round(result.Nmotor), 0, ' rpm');
  renderMetric('out_faxial', result.axial_force, 1, ' N');
  renderMetric('out_tload', result.T_bs_load, 3, ' Nm');
  renderMetric('out_taccel', result.T_accel, 3, ' Nm');
  renderMetric('out_tpeak_bs', result.T_peak_bs, 3, ' Nm');
  renderMetric('out_tpeak_motor', result.T_peak_motor, 3, ' Nm');
  renderMetric('out_trms', result.T_rms_motor, 3, ' Nm');
  renderMetric('out_inertia', result.I_motor * 1e6, 3, ' kg·mm²');
  if (result.inertia_ratio !== null) {
    document.getElementById('out_inertia_ratio').textContent = result.inertia_ratio.toFixed(2);
  } else {
    document.getElementById('out_inertia_ratio').textContent = '—';
  }

  renderMotorTable(result);
  renderSelectedMotorDetails(result);
  renderBestMotorSuggestion(result);
  renderGearboxSuggestion(result);
  renderVerification(result);
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
      <div class="summary-card"><span>Axis duty rate</span><strong>${formatNumber((state.project_operating_time / cycleHours) * 100, 0)}%</strong></div>
    </div>
  `;
}

function renderMotorTable(result) {
  const tbody = document.getElementById('motor-table-body');
  if (!tbody) return;

  const rows = MOTOR_DB.map((motor, index) => {
    const J_rotor = motor.J * 1e-4;
    const speedOk = result.Nmotor <= motor.Nmax;
    const peakOk = result.T_peak_motor <= motor.Tmax;
    const rmsOk = result.T_rms_motor <= motor.M0 * 0.7;
    const inertiaOk = (result.I_motor + J_rotor) / J_rotor <= 10;
    const viable = speedOk && peakOk && rmsOk && inertiaOk;
    const status = viable ? 'PASS' : 'FAIL';
    const badgeClass = viable ? 'badge-ok' : 'badge-fail';
    const rowClass = index === selectedMotorIdx ? 'selected' : '';

    return `
      <tr class="${rowClass}" data-index="${index}">
        <td class="mono">${motor.pn}</td>
        <td>${motor.series}</td>
        <td class="mono">${motor.kW.toFixed(2)}</td>
        <td class="mono">${motor.M0.toFixed(2)}</td>
        <td class="mono">${motor.Tmax.toFixed(2)}</td>
        <td class="mono">${motor.Nmax}</td>
        <td class="mono">${motor.J.toFixed(3)}</td>
        <td><span class="badge ${badgeClass}">${status}</span></td>
      </tr>`;
  }).join('');

  tbody.innerHTML = rows;
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      selectedMotorIdx = Number(row.dataset.index);
      saveState();
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
  const speedUtil = result.Nmotor / motor.Nmax * 100;
  const peakUtil = result.T_peak_motor / motor.Tmax * 100;
  const rmsUtil = result.T_rms_motor / (motor.M0 * 0.7) * 100;

  details.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card"><span>Selected Motor</span><strong>${motor.pn}</strong></div>
      <div class="metric-card"><span>Rated Torque M₀</span><strong>${motor.M0.toFixed(2)} Nm</strong></div>
      <div class="metric-card"><span>Peak Torque Tmax</span><strong>${motor.Tmax.toFixed(2)} Nm</strong></div>
      <div class="metric-card"><span>Rated Speed</span><strong>${motor.Nmax} rpm</strong></div>
    </div>
    <div class="section-block">
      <table class="checklist">
        <tr><th>Parameter</th><th>Actual</th><th>Capacity</th><th>Utilisation</th></tr>
        <tr><td>Motor speed</td><td class="mono">${Math.round(result.Nmotor)} rpm</td><td class="mono">${motor.Nmax} rpm</td><td class="mono">${speedUtil.toFixed(0)}%</td></tr>
        <tr><td>Peak torque</td><td class="mono">${result.T_peak_motor.toFixed(3)} Nm</td><td class="mono">${motor.Tmax.toFixed(2)} Nm</td><td class="mono">${peakUtil.toFixed(0)}%</td></tr>
        <tr><td>RMS torque</td><td class="mono">${result.T_rms_motor.toFixed(3)} Nm</td><td class="mono">${(motor.M0 * 0.7).toFixed(3)} Nm</td><td class="mono">${rmsUtil.toFixed(0)}%</td></tr>
        <tr><td>Inertia ratio</td><td class="mono">${inertiaRatio}</td><td class="mono">10</td><td class="mono">${result.inertia_ratio !== null ? `${Math.round(result.inertia_ratio / 10 * 100)}%` : '—'}</td></tr>
      </table>
    </div>`;
}

function renderVerification(result) {
  const tbody = document.getElementById('verification-body');
  if (!tbody) return;
  const motor = result.selectedMotor;
  const rows = [
    {
      label: 'Ball screw speed limit',
      actual: `${Math.round(result.Nscrew)} rpm`,
      capacity: '6000 rpm',
      ok: result.checks.ball_screw_speed,
      remark: 'Typical spindle limit for ball screws',
    },
    {
      label: 'Ball screw acceleration',
      actual: `${result.amax.toFixed(2)} m/s²`,
      capacity: '5 m/s²',
      ok: result.checks.ball_screw_accel,
      remark: 'Conservative stage acceleration limit',
    },
    {
      label: 'Motor speed',
      actual: `${Math.round(result.Nmotor)} rpm`,
      capacity: motor ? `${motor.Nmax} rpm` : 'Select motor',
      ok: motor ? result.checks.speed : true,
      remark: motor ? '' : 'Choose a motor',
    },
    {
      label: 'Motor peak torque',
      actual: `${result.T_peak_motor.toFixed(3)} Nm`,
      capacity: motor ? `${motor.Tmax.toFixed(2)} Nm` : 'Select motor',
      ok: motor ? result.checks.peak : true,
      remark: motor ? '' : 'Choose a motor',
    },
    {
      label: 'Motor RMS torque',
      actual: `${result.T_rms_motor.toFixed(3)} Nm`,
      capacity: motor ? `${(motor.M0 * 0.7).toFixed(3)} Nm` : 'Select motor',
      ok: motor ? result.checks.rms : true,
      remark: motor ? '' : 'Choose a motor',
    },
    {
      label: 'Inertia ratio',
      actual: motor ? (result.inertia_ratio !== null ? result.inertia_ratio.toFixed(2) : '—') : 'Select motor',
      capacity: '10',
      ok: motor ? result.checks.inertia : true,
      remark: motor ? '' : 'Choose a motor',
    },
  ];

  tbody.innerHTML = rows.map(row => {
    const status = row.ok ? 'OK' : 'FAIL';
    const cls = row.ok ? 'badge-ok' : 'badge-fail';
    return `
      <tr>
        <td>${row.label}</td>
        <td class="mono">${row.actual}</td>
        <td class="mono">${row.capacity}</td>
        <td><span class="badge ${cls}">${status}</span></td>
        <td>${row.remark}</td>
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
    const speedOk = selectedMotor ? motorSpeed <= selectedMotor.Nmax : true;
    const torqueOk = selectedMotor ? motorTorque <= selectedMotor.Tmax : true;
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

  const viable = rows.filter(r => r.speedOk && r.torqueOk);
  const best = viable.length
    ? viable.reduce((b, c) => c.score < b.score ? c : b, viable[0])
    : rows.reduce((b, c) => c.score < b.score ? c : b, rows[0]);

  const direct = rows.find(r => r.ratio === 1);
  const directTorque = direct ? direct.motorTorque : best.motorTorque;
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

  tbody.innerHTML = rows.map(row => {
    const isActive = row.ratio === activeRatio;
    const isBest = row.ratio === best.ratio;
    const isViable = row.speedOk && row.torqueOk;
    const badge = isViable ? 'badge-ok' : 'badge-fail';
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
        <td><span class="badge ${badge}">${isViable ? 'Viable' : 'Not viable'}</span></td>
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
  const scored = MOTOR_DB.map((motor, index) => {
    const J_rotor = motor.J * 1e-4;
    const speedOk = result.Nmotor <= motor.Nmax;
    const peakOk = result.T_peak_motor <= motor.Tmax;
    const rmsOk = result.T_rms_motor <= motor.M0 * 0.7;
    const inertiaOk = (result.I_motor + J_rotor) / J_rotor <= 10;
    const speedRatio = result.Nmotor / motor.Nmax;
    const peakRatio = result.T_peak_motor / motor.Tmax;
    const rmsRatio = result.T_rms_motor / (motor.M0 * 0.7);
    const inertiaRatio = (result.I_motor + J_rotor) / J_rotor / 10;
    const penalty =
      (speedOk ? 0 : speedRatio - 1) * 1000 +
      (peakOk ? 0 : peakRatio - 1) * 1200 +
      (rmsOk ? 0 : rmsRatio - 1) * 1400 +
      (inertiaOk ? 0 : inertiaRatio - 1) * 1100;
    const score = penalty + motor.M0 * 10 + speedRatio * 50 + peakRatio * 70;
    return { motor, index, speedOk, peakOk, rmsOk, inertiaOk, penalty, score, viable: penalty === 0 };
  });

  scored.sort((a, b) => {
    if (a.viable !== b.viable) return a.viable ? -1 : 1;
    if (a.penalty !== b.penalty) return a.penalty - b.penalty;
    return a.score - b.score;
  });
  return scored[0] || null;
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
    container.innerHTML = `Recommended motor: <strong>${best.motor.pn}</strong> (${best.motor.series}) — ${best.motor.M0.toFixed(2)} Nm rated, ${best.motor.Tmax.toFixed(2)} Nm peak, ${best.motor.Nmax} rpm.`;
  } else {
    container.innerHTML = `Closest motor: <strong>${best.motor.pn}</strong> — ${best.motor.M0.toFixed(2)} Nm, ${best.motor.Tmax.toFixed(2)} Nm, ${best.motor.Nmax} rpm (may still exceed one or more limits).`;
  }
}

function renderMovementSteps() {
  const container = document.getElementById('movement-steps-container');
  if (!container) return;
  const steps = Array.isArray(state.steps) && state.steps.length ? state.steps : [{ label: 'Step 1', stroke: 15, move_time: 1.0, acc_pct: 25, external_force: 250, load_mass: 1.0, tilt_deg: 45 }];

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
          <label>Accel time (%)
            <input data-step="${index}" data-field="acc_pct" type="number" step="1" value="${step.acc_pct}" style="padding:8px 10px;font-size:13px;" />
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
    else if (label.includes('acc') && label.includes('pct')) columnMap.set(index, 'acc_pct');
    else if (label.includes('acceleration')) columnMap.set(index, 'acc_pct');
    else if (label.includes('external force')) columnMap.set(index, 'external_force');
    else if (label.includes('load mass') || label.includes('moving mass')) columnMap.set(index, 'load_mass');
    else if (label.includes('tilt')) columnMap.set(index, 'tilt_deg');
  });

  const steps = [];
  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row) || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;
    const step = { stroke: 0, move_time: 0.05, acc_pct: 25, external_force: 0, load_mass: 0, tilt_deg: 0 };
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
      acc_pct: step.acc_pct,
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
  const mapping = new Map([
    ['no of shifts per day', 'project_shifts'],
    ['working hours per shift', 'project_hours_shift'],
    ['working days per week', 'project_days_week'],
    ['total cycle time of machine', 'project_total_cycle'],
    ['total operating time per cycle', 'project_operating_time'],
    ['expected service life of machine', 'project_service_life'],
    ['movement accuracy required', 'project_accuracy'],
    ['movement stroke required', 'stroke'],
    ['cycle time available for single movement', 'move_time'],
    ['external force on the moving mass', 'external_force'],
    ['moving mass', 'load_mass'],
    ['guide moving mass', 'guide_mass'],
    ['tilt angle of the setup', 'tilt_deg'],
    ['acceleration time %', 'acc_pct'],
    ['ball screw pitch', 'bs_pitch'],
    ['ball screw efficiency', 'bs_efficiency'],
    ['ball screw friction torque', 'bs_friction_torque'],
    ['ball screw moment of inertia', 'bs_inertia'],
    ['parallel kit ratio', 'pk_ratio'],
    ['pk ratio', 'pk_ratio'],
    ['pk no load', 'pk_no_load_torque'],
    ['pk inertia', 'pk_inertia'],
    ['gear ratio', 'gb_ratio'],
    ['gb ratio', 'gb_ratio'],
    ['gearbox efficiency', 'gb_efficiency'],
    ['gb efficiency', 'gb_efficiency'],
    ['gear no load running torque', 'gb_no_load_torque'],
    ['gb no load', 'gb_no_load_torque'],
    ['gear inertia', 'gb_inertia'],
    ['gb inertia', 'gb_inertia'],
    ['application', 'label'],
    ['operation', 'label'],
    ['op', 'label'],
    ['displacement force required', 'guide_force'],
  ]);

  for (const row of rows) {
    if (!row || row.length < 2) continue;
    const label = normalizeLabel(row[0]);
    const value = row[1];
    const key = mapping.get(label);
    if (!key) continue;
    const parsed = Number(String(value).replace(/[^0-9.+-]/g, ''));
    if (!Number.isNaN(parsed)) {
      state[key] = parsed;
      updated += 1;
    }
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
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      const updated = parseExcelValues(rows);
      if (updated > 0) {
        saveState();
        renderInputs();
        render();
        setExcelStatus(`Imported ${updated} value(s) from Excel.`);
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
    acc_pct: 25,
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
      const J_rotor = motor.J * 1e-4;
      const speedOk  = lastResult.Nmotor <= motor.Nmax;
      const peakOk   = lastResult.T_peak_motor <= motor.Tmax;
      const rmsOk    = lastResult.T_rms_motor <= motor.M0 * 0.7;
      const inertiaOk = (lastResult.I_motor + J_rotor) / J_rotor <= 10;
      status = (speedOk && peakOk && rmsOk && inertiaOk) ? 'PASS' : 'FAIL';
    }

    // Persist back to project store
    const servoState = JSON.parse(localStorage.getItem('titanServoState') || 'null');
    if (window.Projects) {
      Projects.updateServo(ctx.projectId, ctx.servoId, {
        state: servoState,
        motorIdx: selectedMotorIdx,
        motor: motorPN,
        status,
      });
      Projects.clearContext();
    }

    window.location.href = 'project.html?id=' + ctx.projectId;
  });

  banner.appendChild(label);
  banner.appendChild(saveBtn);
  document.body.insertBefore(banner, document.body.firstChild);
}

window.addEventListener('DOMContentLoaded', init);
