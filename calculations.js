/* Servo Sizing — Physics Engine
 * Depends on: constants.js (G, DEFAULT_STATE, MOTOR_DB, STATE_VERSION)
 * Reads from global `state` and `selectedMotorIdx` set by servo-app.js
 */

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

function normalizeState() {
  state.project_shifts = Math.max(0, Number(state.project_shifts) || 0);
  state.project_hours_shift = Math.max(0, Number(state.project_hours_shift) || 0);
  state.project_days_week = Math.max(0, Number(state.project_days_week) || 0);
  state.project_total_cycle = Math.max(0.1, Number(state.project_total_cycle) || 0.1);
  state.project_operating_time = Math.max(0, Number(state.project_operating_time) || 0);
  state.project_service_life = Math.max(0, Number(state.project_service_life) || 0);
  state.project_accuracy = Math.max(0, Number(state.project_accuracy) || 0);
  state.acc_pct = Math.min(80, Math.max(1, Number(state.acc_pct) || 25));
  if (state.bs_type !== 'preassembled') state.bs_type = 'custom';
  const _lmVal = Number(state.has_lm_guide);
  state.has_lm_guide = _lmVal === 2 ? 2 : 1;
  // Migrate tilt_deg from per-step (legacy) to axis-level
  if (state.tilt_deg == null && Array.isArray(state.steps) && state.steps.length) {
    state.tilt_deg = Number(state.steps[0].tilt_deg) || 0;
  }
  state.tilt_deg = Math.min(90, Math.max(0, Number(state.tilt_deg) || 0));
  state.has_parallel_kit = Number(state.has_parallel_kit) === 0 ? 0 : 1;
  state.has_gearbox = Number(state.has_gearbox) === 0 ? 0 : 1;
  state.gb_ratio_user_selected = !!state.gb_ratio_user_selected;
  state.motor_user_selected = !!state.motor_user_selected;
  if (!Array.isArray(state.steps) || state.steps.length === 0) {
    state.steps = [{ label: 'Step 1', stroke: 15, move_time: 1.0, external_force: 250, load_mass: 1.0 }];
  }
  // Migrate legacy global dwell_time to per-step
  const legacyDwell = Number(state.dwell_time) || 0;
  delete state.dwell_time;
  state.steps = state.steps.slice(0, 8).map((step, index) => ({
    label: String(step.label || step.application || `Step ${index + 1}`),
    stroke: Math.max(0, Number(step.stroke) || 0),
    move_time: Math.max(0.05, Number(step.move_time) || 0.05),
    dwell_time: Math.max(0, Number(step.dwell_time) || legacyDwell || 0),
    acceleration_time: Number.isFinite(Number(step.acceleration_time)) && Number(step.acceleration_time) > 0 ? Number(step.acceleration_time) : null,
    deceleration_time: Number.isFinite(Number(step.deceleration_time)) && Number(step.deceleration_time) > 0 ? Number(step.deceleration_time) : null,
    external_force: Number(step.external_force) || 0,
    external_force_dir: step.external_force_dir === 'aiding' ? 'aiding' : 'opposing',
    load_mass: Math.max(0, Number(step.load_mass) || 0),
    movement_dir: step.movement_dir === 'with_gravity' ? 'with_gravity' : 'against_gravity',
  }));
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
  const _cbV = state.has_counterbalance;
  if (!_cbV || _cbV === 0 || _cbV === '0' || _cbV === 'none') state.has_counterbalance = 0;
  else if (_cbV === 1 || _cbV === true || _cbV === 'yes') state.has_counterbalance = 'guide_shaft';
  state.cb_mass      = Math.max(0, Number(state.cb_mass) || 0);
  if (state.has_counterbalance === 'pulley') {
    state.cb_angle_deg = 90;
  } else {
    state.cb_angle_deg = Math.min(90, Math.max(45, Number(state.cb_angle_deg) || 90));
  }
  state.cb_mu        = Math.max(0, Number(state.cb_mu) || 0);
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
  return { fixed, support, total: fixed + support };
}

function calculateStepGroup(steps) {
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

    const theta      = state.tilt_deg * Math.PI / 180;
    const total_mass = step.load_mass + state.guide_mass
                     + state.bs_nut_mass
                     + state.guide_n_blocks * state.guide_block_mass;

    const ext_sign_accel = step.external_force_dir === 'aiding' ? -1 : 1;
    const ext_sign_decel = step.external_force_dir === 'aiding' ? 1  : -1;
    const F_external       = ext_sign_accel * step.external_force;
    const F_external_decel = ext_sign_decel * step.external_force;

    const grav_sign_accel = step.movement_dir === 'with_gravity' ? -1 : 1;
    const grav_sign_decel = step.movement_dir === 'with_gravity' ? 1  : -1;
    const F_gravity       = grav_sign_accel * total_mass * G * Math.sin(theta);
    const F_gravity_decel = grav_sign_decel * total_mass * G * Math.sin(theta);

    const F_pl             = total_mass * G * state.mu * Math.cos(theta);
    const F_ffp            = state.guide_n_blocks * state.guide_force;
    const F_cb_friction    = (Number(state.cb_n_bushings) || 0) * (Number(state.cb_bushing_friction_force) || 0);
    const F_friction       = F_pl + F_ffp + F_cb_friction;

    let F_counterbalance       = 0;
    let F_counterbalance_decel = 0;
    if (state.has_counterbalance && state.has_counterbalance !== 0) {
      const cb_sign_accel = step.movement_dir === 'with_gravity' ? 1  : -1;
      const cb_sign_decel = step.movement_dir === 'with_gravity' ? -1 : 1;
      const theta_cb = state.cb_angle_deg * Math.PI / 180;
      const F_cb_raw = state.cb_mass * G * (Math.sin(theta_cb) + state.cb_mu * Math.cos(theta_cb));
      F_counterbalance       = cb_sign_accel * F_cb_raw;
      F_counterbalance_decel = cb_sign_decel * F_cb_raw;
    }

    const axial_force       = F_external       + F_gravity       + F_friction + F_counterbalance;
    const axial_force_decel = F_external_decel + F_gravity_decel + F_friction + F_counterbalance_decel;

    const T_axial_force_signed       = pitch_m > 0 ? (axial_force       * pitch_m) / (2 * Math.PI * state.bs_efficiency) : 0;
    const T_axial_force_signed_decel = pitch_m > 0 ? (axial_force_decel * pitch_m) / (2 * Math.PI * state.bs_efficiency) : 0;
    const T_preload      = state.bs_preload_torque;
    const bearingDrag    = getBearingDragComponents();
    const T_bs_load       = T_axial_force_signed       + T_preload + bearingDrag.total + pkNoLoadTorque;
    const T_bs_load_decel = T_axial_force_signed_decel + T_preload + bearingDrag.total + pkNoLoadTorque;

    const BS_DENSITY = { steel: 7870, stainless: 7930, aluminum: 2700 };
    const rho_bs    = BS_DENSITY[state.bs_material] || 7870;
    const Lb        = state.bs_length / 1000;
    const Db        = state.bs_dia / 1000;
    const Jrm       = (Math.PI / 32) * rho_bs * Lb * Math.pow(Db, 4);
    const J_mass      = total_mass * Math.pow(pitch_m / (2 * Math.PI), 2);
    const J_reflected = J_mass + Jrm + pkInertia + gbInertia;
    const T_accel      = t_acc > 0 ? J_reflected * Nscrew / (9.55 * t_acc) : 0;
    const T_decel      = t_dec > 0 ? J_reflected * Nscrew / (9.55 * t_dec) : 0;
    const T_total_accel    = T_bs_load       + T_accel;
    const T_total_topspeed = T_bs_load;
    const T_total_decel    = T_bs_load_decel - T_decel;
    const SF = 1 + state.safety_factor / 100;
    const T_peak_bs_acc = Math.abs(T_total_accel) * SF;
    const T_peak_bs_dec = Math.abs(T_total_decel) * SF;
    const T_peak_bs    = Math.max(T_peak_bs_acc, T_peak_bs_dec);
    const T_peak_accel_motor = eff_ratio > 0 ? T_peak_bs_acc / (eff_ratio * eff_efficiency) + gbNoLoadTorque : 0;
    const T_peak_decel_motor = eff_ratio > 0 ? T_peak_bs_dec / (eff_ratio * eff_efficiency) + gbNoLoadTorque : 0;
    const T_peak_motor       = Math.max(T_peak_accel_motor, T_peak_decel_motor);
    const T_load_motor       = eff_ratio > 0 ? Math.abs(T_bs_load)       / (eff_ratio * eff_efficiency) + gbNoLoadTorque : 0;
    const T_load_motor_decel = eff_ratio > 0 ? Math.abs(T_bs_load_decel) / (eff_ratio * eff_efficiency) + gbNoLoadTorque : 0;

    const Iacc   = (t_acc / 3) * (T_load_motor       ** 2 + T_load_motor       * T_peak_accel_motor + T_peak_accel_motor ** 2);
    const Idec   = (t_dec / 3) * (T_peak_decel_motor ** 2 + T_peak_decel_motor * T_load_motor_decel + T_load_motor_decel ** 2);
    const Iconst = T_load_motor ** 2 * t_const;
    const stepEnergy = Iacc + Iconst + Idec;

    results.Vmax_mm_s  = Math.max(results.Vmax_mm_s,  Vmax_mm_s);
    results.amax       = Math.max(results.amax,        amax);
    results.Nscrew     = Math.max(results.Nscrew,      Nscrew);
    results.Nmotor     = Math.max(results.Nmotor,      Nmotor);
    results.axial_force      = Math.max(results.axial_force,      Math.abs(axial_force), Math.abs(axial_force_decel));
    results.F_external       = Math.max(results.F_external,       Math.abs(F_external));
    results.F_gravity        = Math.max(results.F_gravity,        Math.abs(F_gravity), Math.abs(F_gravity_decel));
    results.F_friction       = Math.max(results.F_friction,       F_friction);
    results.F_counterbalance = Math.max(results.F_counterbalance, Math.abs(F_counterbalance), Math.abs(F_counterbalance_decel));
    results.T_axial_force    = Math.max(results.T_axial_force,    Math.abs(T_axial_force_signed), Math.abs(T_axial_force_signed_decel));
    results.T_preload        = Math.max(results.T_preload,        T_preload);
    results.T_fixed_bearing_drag   = Math.max(results.T_fixed_bearing_drag,   bearingDrag.fixed);
    results.T_support_bearing_drag  = Math.max(results.T_support_bearing_drag,  bearingDrag.support);
    results.T_bearing_drag         = Math.max(results.T_bearing_drag,         bearingDrag.total);
    results.T_bs_load        = Math.max(results.T_bs_load,        Math.abs(T_bs_load), Math.abs(T_bs_load_decel));
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

  const needsBrake = Number(state.tilt_deg) !== 0;

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

function suggestBestMotor(result) {
  const needsBrakeSuggest = Number(state.tilt_deg) !== 0;
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
    const score = motor.kW * 1000 + (torqueUtil + speedUtil + inertiaUtil);
    return { motor, index, speedOk, torqueOk, inertiaOk, brakeOk, viable, score };
  });

  const pass = scored.filter(m => m.viable).sort((a, b) => a.score - b.score);
  return pass[0] || scored.sort((a, b) => a.score - b.score)[0] || null;
}
