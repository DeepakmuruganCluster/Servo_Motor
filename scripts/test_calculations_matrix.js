/* Regression matrix for the physics engine — loads the REAL js/calculations.js (ground truth)
 * and cross-checks it against an independently hand-coded reference implementation (ported from
 * the verified formulas in scripts/verify_calculations.py) across a matrix of scenarios chosen to
 * exercise sign-flip logic: tilt angle, gravity direction, external-force direction, and every
 * combination of gearbox/parallel-kit/counterbalance enabled.
 *
 * This exists because a single hand-checked scenario (verify_calculations.py) missed a
 * discrepancy that only showed up once the deceleration-phase sign flip was exercised with a
 * non-trivial tilt angle — a broader matrix is what actually catches that class of bug.
 *
 * Run:  node scripts/test_calculations_matrix.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// ── Independent reference implementation (hand-ported from verify_calculations.py) ──────────
const G = 9.81;
const BS_DENSITY = { steel: 7870, stainless: 7930, aluminum: 2700 };

function referenceCalculate(p) {
  const effRatio = (p.has_parallel_kit ? p.pk_ratio : 1) * (p.has_gearbox ? p.gb_ratio : 1);
  const effEfficiency = p.has_gearbox ? p.gb_efficiency : 1.0;
  const pkNoLoad = p.has_parallel_kit ? p.pk_no_load_Nm : 0;
  const gbNoLoad = p.has_gearbox ? p.gb_no_load_Nm : 0;
  const pkInertia = p.has_parallel_kit ? p.pk_inertia_kgm2 : 0;
  const gbInertia = p.has_gearbox ? p.gb_inertia_kgm2 : 0;
  const pitchM = p.bs_pitch_mm / 1000;

  const tConst = p.move_time_s - p.accel_time_s - p.decel_time_s;
  const VmaxMs = (p.stroke_mm / 1000) / (p.move_time_s - 0.5 * (p.accel_time_s + p.decel_time_s));
  const VmaxMmS = VmaxMs * 1000;
  const NscrewRpm = VmaxMmS / p.bs_pitch_mm * 60;
  const NmotorRpm = NscrewRpm * effRatio;

  const theta = p.tilt_deg * Math.PI / 180;
  const totalMass = p.payload_mass_kg + p.carriage_mass_kg + p.bs_nut_mass_kg + p.n_guide_blocks * p.guide_block_mass_kg;

  const gravitySignAccel = p.movement_dir === 'with_gravity' ? -1 : 1;
  const gravitySignDecel = p.movement_dir === 'with_gravity' ? 1 : -1;
  const extSignAccel = p.ext_force_dir === 'aiding' ? -1 : 1;
  const extSignDecel = p.ext_force_dir === 'aiding' ? 1 : -1;

  const Fgravity = gravitySignAccel * totalMass * G * Math.sin(theta);
  const FgravityDecel = gravitySignDecel * totalMass * G * Math.sin(theta);
  const Fexternal = extSignAccel * p.ext_force_N;
  const FexternalDecel = extSignDecel * p.ext_force_N;

  const Fpl = totalMass * G * p.mu * Math.cos(theta);
  const Fffp = p.n_guide_blocks * p.guide_friction_N;
  const FcbBushing = p.cb_n_bushings * p.cb_bushing_friction_N;
  const Ffriction = Fpl + Fffp + FcbBushing;

  let Fcb = 0, FcbDecel = 0;
  if (p.has_counterbalance) {
    const thetaCb = p.cb_angle_deg * Math.PI / 180;
    const FcbRaw = p.cb_mass_kg * G * (Math.sin(thetaCb) + p.cb_mu * Math.cos(thetaCb));
    const cbSignAccel = p.movement_dir === 'with_gravity' ? 1 : -1;
    const cbSignDecel = p.movement_dir === 'with_gravity' ? -1 : 1;
    Fcb = cbSignAccel * FcbRaw;
    FcbDecel = cbSignDecel * FcbRaw;
  }

  const axialForce = Fexternal + Fgravity + Ffriction + Fcb;
  const axialForceDecel = FexternalDecel + FgravityDecel + Ffriction + FcbDecel;

  const bsBearingDrag = p.bs_n_fixed_blocks * p.bs_fixed_drag_axial_Nm + p.bs_n_support_blocks * p.bs_support_drag_axial_Nm + p.bs_bearing_drag_Nm;
  const Taxial = pitchM > 0 ? (axialForce * pitchM) / (2 * Math.PI * p.bs_efficiency) : 0;
  const TaxialDecel = pitchM > 0 ? (axialForceDecel * pitchM) / (2 * Math.PI * p.bs_efficiency) : 0;
  const TbsLoad = Taxial + p.bs_preload_torque_Nm + bsBearingDrag + pkNoLoad;
  const TbsLoadDecel = TaxialDecel + p.bs_preload_torque_Nm + bsBearingDrag + pkNoLoad;

  const rho = BS_DENSITY[p.bs_material] || 7870;
  const Lb = p.bs_length_mm / 1000;
  const Db = p.bs_dia_mm / 1000;
  const Jrm = (Math.PI / 32) * rho * Lb * Math.pow(Db, 4);
  const Jmass = totalMass * Math.pow(pitchM / (2 * Math.PI), 2);
  const Jreflected = Jmass + Jrm + pkInertia + gbInertia;
  const Imotor = effRatio > 0 ? Jreflected / Math.pow(effRatio, 2) : 0;

  const Taccel = p.accel_time_s > 0 ? Jreflected * NscrewRpm / (9.55 * p.accel_time_s) : 0;
  const Tdecel = p.decel_time_s > 0 ? Jreflected * NscrewRpm / (9.55 * p.decel_time_s) : 0;

  const TtotalAccel = TbsLoad + Taccel;
  const TtotalDecel = TbsLoadDecel - Tdecel;

  const SF = 1 + p.safety_factor_pct / 100;
  const TpeakBsAcc = Math.abs(TtotalAccel) * SF;
  const TpeakBsDec = Math.abs(TtotalDecel) * SF;
  const TpeakBs = Math.max(TpeakBsAcc, TpeakBsDec);
  const TpeakAccelMotor = effRatio > 0 ? TpeakBsAcc / (effRatio * effEfficiency) + gbNoLoad : 0;
  const TpeakDecelMotor = effRatio > 0 ? TpeakBsDec / (effRatio * effEfficiency) + gbNoLoad : 0;
  const TpeakMotor = Math.max(TpeakAccelMotor, TpeakDecelMotor);
  const TloadMotor = effRatio > 0 ? Math.abs(TbsLoad) / (effRatio * effEfficiency) + gbNoLoad : 0;
  const TloadMotorDecel = effRatio > 0 ? Math.abs(TbsLoadDecel) / (effRatio * effEfficiency) + gbNoLoad : 0;

  const Iacc = (p.accel_time_s / 3) * (TloadMotor ** 2 + TloadMotor * TpeakAccelMotor + TpeakAccelMotor ** 2);
  const Idec = (p.decel_time_s / 3) * (TpeakDecelMotor ** 2 + TpeakDecelMotor * TloadMotorDecel + TloadMotorDecel ** 2);
  const Iconst = TloadMotor ** 2 * tConst;
  const totalMotionTime = p.accel_time_s + tConst + p.decel_time_s;
  const TrmsMotor = totalMotionTime > 0 ? Math.sqrt((Iacc + Iconst + Idec) / totalMotionTime) : 0;

  return {
    axial_force: Math.max(Math.abs(axialForce), Math.abs(axialForceDecel)),
    T_bs_load: Math.max(Math.abs(TbsLoad), Math.abs(TbsLoadDecel)),
    I_motor: Imotor,
    T_accel: Taccel, T_decel: Tdecel,
    T_total_accel: Math.abs(TtotalAccel), T_total_topspeed: Math.abs(TbsLoad), T_total_decel: Math.abs(TtotalDecel),
    T_peak_bs: TpeakBs, T_peak_motor: TpeakMotor, T_load_motor: TloadMotor, T_rms_motor: TrmsMotor,
    Nscrew: NscrewRpm, Nmotor: NmotorRpm,
  };
}

// ── Load the REAL app physics engine ──────────────────────────────────────────────────────
const bundle = [
  read('js/constants.js'),
  read('js/calculations.js'),
].join('\n;\n');
const context = { console, JSON, Math, Number, Object, Array, Infinity, isFinite, parseInt, parseFloat, Date };
vm.createContext(context);
context.selectedMotorIdx = -1;
vm.runInContext(bundle, context, { filename: 'calc_matrix_bundle.js' });

// ── Scenario matrix — sign-flip-sensitive dimensions ──────────────────────────────────────
const base = {
  stroke_mm: 15.0, move_time_s: 0.9, accel_time_s: 0.2, decel_time_s: 0.2, dwell_time_s: 0.1,
  ext_force_N: 5.0,
  payload_mass_kg: 5.0, carriage_mass_kg: 0.5, bs_nut_mass_kg: 0.052, guide_block_mass_kg: 0.2, n_guide_blocks: 2,
  guide_friction_N: 15.0, mu: 0.03,
  bs_pitch_mm: 5.0, bs_dia_mm: 10.0, bs_length_mm: 171.0, bs_material: 'steel', bs_efficiency: 0.98,
  bs_preload_torque_Nm: 0.0, bs_bearing_drag_Nm: 0.0,
  bs_n_fixed_blocks: 1, bs_fixed_drag_axial_Nm: 0.0, bs_n_support_blocks: 1, bs_support_drag_axial_Nm: 0.0,
  cb_mass_kg: 0.0, cb_angle_deg: 90.0, cb_mu: 0.005, cb_n_bushings: 0, cb_bushing_friction_N: 0.0,
  pk_ratio: 1.0, pk_no_load_Nm: 0.07, pk_inertia_kgm2: 2.67e-5,
  gb_ratio: 3.0, gb_efficiency: 0.97, gb_no_load_Nm: 0.01, gb_inertia_kgm2: 0.0,
  safety_factor_pct: 20.0,
};

const scenarios = [];
[0, 45, 90].forEach(tilt_deg => {
  ['against_gravity', 'with_gravity'].forEach(movement_dir => {
    ['opposing', 'aiding'].forEach(ext_force_dir => {
      scenarios.push({ name: `tilt=${tilt_deg} ${movement_dir} ext=${ext_force_dir}`,
        params: { ...base, tilt_deg, movement_dir, ext_force_dir, has_counterbalance: false, has_parallel_kit: true, has_gearbox: true } });
    });
  });
});
// Module toggles at a fixed representative tilt/direction
[
  { has_counterbalance: true, cb_mass_kg: 5.5, has_parallel_kit: true, has_gearbox: true },
  { has_counterbalance: false, has_parallel_kit: false, has_gearbox: true },
  { has_counterbalance: false, has_parallel_kit: true, has_gearbox: false },
  { has_counterbalance: false, has_parallel_kit: false, has_gearbox: false },
].forEach((toggles, i) => {
  scenarios.push({ name: `toggles#${i + 1} ${JSON.stringify(toggles)}`,
    params: { ...base, tilt_deg: 30, movement_dir: 'against_gravity', ext_force_dir: 'opposing', ...toggles } });
});

// ── Run both implementations per scenario and compare ──────────────────────────────────────
const FIELDS = ['axial_force', 'T_bs_load', 'I_motor', 'T_accel', 'T_decel', 'T_total_accel',
  'T_total_topspeed', 'T_total_decel', 'T_peak_bs', 'T_peak_motor', 'T_load_motor', 'T_rms_motor', 'Nscrew', 'Nmotor'];
const TOL = 1e-6; // relative tolerance

let totalChecks = 0, totalPass = 0;
const failures = [];

scenarios.forEach(({ name, params }) => {
  context.state = {
    steps: [{ stroke: params.stroke_mm, move_time: params.move_time_s, acceleration_time: params.accel_time_s,
      deceleration_time: params.decel_time_s, dwell_time: params.dwell_time_s, load_mass: params.payload_mass_kg,
      external_force: params.ext_force_N, external_force_dir: params.ext_force_dir, movement_dir: params.movement_dir }],
    tilt_deg: params.tilt_deg,
    guide_mass: params.carriage_mass_kg, bs_nut_mass: params.bs_nut_mass_kg,
    guide_block_mass: params.guide_block_mass_kg, guide_n_blocks: params.n_guide_blocks,
    guide_force: params.guide_friction_N, mu: params.mu,
    bs_pitch: params.bs_pitch_mm, bs_dia: params.bs_dia_mm, bs_length: params.bs_length_mm,
    bs_material: params.bs_material, bs_efficiency: params.bs_efficiency,
    bs_preload_torque: params.bs_preload_torque_Nm,
    bs_n_fixed_blocks: params.bs_n_fixed_blocks, bs_fixed_drag_axial: params.bs_fixed_drag_axial_Nm,
    bs_n_support_blocks: params.bs_n_support_blocks, bs_support_drag_axial: params.bs_support_drag_axial_Nm,
    has_counterbalance: params.has_counterbalance ? 1 : 0, cb_mass: params.cb_mass_kg,
    cb_angle_deg: params.cb_angle_deg, cb_mu: params.cb_mu, cb_n_bushings: params.cb_n_bushings,
    cb_bushing_friction_force: params.cb_bushing_friction_N,
    has_parallel_kit: params.has_parallel_kit ? 1 : 0, pk_ratio: params.pk_ratio,
    pk_no_load_torque: params.pk_no_load_Nm, pk_inertia: params.pk_inertia_kgm2,
    has_gearbox: params.has_gearbox ? 1 : 0, gb_ratio: params.gb_ratio, gb_efficiency: params.gb_efficiency,
    gb_no_load_torque: params.gb_no_load_Nm, gb_inertia: params.gb_inertia_kgm2,
    safety_factor: params.safety_factor_pct,
    sm_permitted_inertia_ratio: 7, sm_encoder_ppr: 1048576,
    acc_pct: 25, project_accuracy: 0, project_shifts: 0, project_hours_shift: 0, project_days_week: 0,
    project_total_cycle: 1, project_operating_time: 0, project_service_life: 0,
    bs_type: 'custom', gb_ratio_user_selected: true, motor_user_selected: false,
    bs_repetition_accuracy: 10,
  };
  const appResult = vm.runInContext('calculate()', context);
  const refResult = referenceCalculate(params);

  const rowFailures = [];
  FIELDS.forEach(f => {
    totalChecks++;
    const a = appResult[f], r = refResult[f];
    const ok = Math.abs(a - r) <= TOL * Math.max(Math.abs(r), 1e-9);
    if (ok) { totalPass++; } else { rowFailures.push(`${f}: app=${a} ref=${r}`); }
  });
  if (rowFailures.length) failures.push({ name, rowFailures });
  console.log(`[${rowFailures.length === 0 ? 'PASS' : 'FAIL'}] ${name}`);
});

console.log('');
if (failures.length) {
  failures.forEach(f => {
    console.log(`  -- ${f.name} --`);
    f.rowFailures.forEach(l => console.log('     ' + l));
  });
}
console.log(`RESULT: ${totalPass}/${totalChecks} field checks passed across ${scenarios.length} scenarios` +
  (totalPass === totalChecks ? '  --  ALL PASS' : '  --  SOME FAILED'));
if (totalPass !== totalChecks) process.exit(1);
