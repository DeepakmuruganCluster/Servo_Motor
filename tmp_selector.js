
// ═══════════════════════════════════════════════════════════
//  MOTOR DATABASE
// ═══════════════════════════════════════════════════════════
const MOTOR_DB = [
  { pn:'1FK2102-1AG10-1MA0', series:'1FK2', kW:0.10,  M0:0.32,  Tmax:0.96,  Nn:3000, Nmax:6000, J:0.052, bits:20, desc:'0.32 Nm · 3000 rpm' },
  { pn:'1FK2102-1AG00-1MA0', series:'1FK2', kW:0.10,  M0:0.32,  Tmax:0.96,  Nn:3000, Nmax:6000, J:0.052, bits:20, desc:'0.32 Nm · 3000 rpm' },
  { pn:'1FK2104-4AF00-1MA0', series:'1FK2', kW:0.40,  M0:1.27,  Tmax:3.81,  Nn:3000, Nmax:7200, J:0.330, bits:20, desc:'1.27 Nm · 3000 rpm' },
  { pn:'1FK2104-4AF10-0MB0', series:'1FK2', kW:0.40,  M0:1.27,  Tmax:3.81,  Nn:3000, Nmax:7200, J:0.330, bits:20, desc:'1.27 Nm · 3000 rpm (brake)' },
  { pn:'1FK2104-4AF10-1MA0', series:'1FK2', kW:0.40,  M0:1.27,  Tmax:3.81,  Nn:3000, Nmax:7200, J:0.330, bits:20, desc:'1.27 Nm · 3000 rpm' },
  { pn:'1FK2105-6AF10-1MA0', series:'1FK2', kW:2.10,  M0:6.70,  Tmax:20.10, Nn:3000, Nmax:6000, J:5.000, bits:20, desc:'6.70 Nm · 3000 rpm' },
  { pn:'1FK2106-3AF10-1MA0', series:'1FK2', kW:2.30,  M0:7.30,  Tmax:21.90, Nn:3000, Nmax:6000, J:5.500, bits:20, desc:'7.30 Nm · 3000 rpm' },
  { pn:'1FK2106-4AF10-1MA0', series:'1FK2', kW:2.70,  M0:8.60,  Tmax:25.80, Nn:3000, Nmax:6000, J:6.000, bits:20, desc:'8.60 Nm · 3000 rpm' },
  { pn:'1FK2106-6AF10-1MA0', series:'1FK2', kW:3.30,  M0:10.50, Tmax:31.50, Nn:3000, Nmax:6000, J:7.500, bits:20, desc:'10.50 Nm · 3000 rpm' },
  { pn:'1FK2203-2AG10-1MA0', series:'1FK2', kW:0.20,  M0:0.64,  Tmax:1.92,  Nn:3000, Nmax:6000, J:0.200, bits:20, desc:'0.64 Nm · 3000 rpm' },
  { pn:'1FK2203-2AK00-1MA0', series:'1FK2', kW:0.26,  M0:0.55,  Tmax:1.65,  Nn:4500, Nmax:9000, J:0.150, bits:20, desc:'0.55 Nm · 4500 rpm' },
  { pn:'1FK2203-2AK10-1MA0', series:'1FK2', kW:0.26,  M0:0.55,  Tmax:1.65,  Nn:4500, Nmax:9000, J:0.150, bits:20, desc:'0.55 Nm · 4500 rpm' },
  { pn:'1FK2203-2AG00-1MA0', series:'1FK2', kW:0.26,  M0:0.64,  Tmax:1.92,  Nn:4000, Nmax:8000, J:0.200, bits:20, desc:'0.64 Nm · 4000 rpm' },
  { pn:'1FK2203-4AG10-1MA0', series:'1FK2', kW:0.40,  M0:1.27,  Tmax:3.81,  Nn:3000, Nmax:6000, J:0.350, bits:20, desc:'1.27 Nm · 3000 rpm' },
  { pn:'1FK2203-4AK00-1MA0', series:'1FK2', kW:0.43,  M0:1.10,  Tmax:3.30,  Nn:4500, Nmax:9000, J:0.280, bits:20, desc:'1.10 Nm · 4500 rpm' },
  { pn:'1FK2203-4AK10-1MA0', series:'1FK2', kW:0.43,  M0:1.10,  Tmax:3.30,  Nn:4500, Nmax:9000, J:0.280, bits:20, desc:'1.10 Nm · 4500 rpm' },
  { pn:'1FK2204-5AK10-1MA0', series:'1FK2', kW:0.57,  M0:1.82,  Tmax:5.46,  Nn:4500, Nmax:9000, J:0.900, bits:20, desc:'1.82 Nm · 4500 rpm' },
  { pn:'1FK2204-5AF00-1MA0', series:'1FK2', kW:0.75,  M0:2.40,  Tmax:7.20,  Nn:3000, Nmax:6000, J:1.200, bits:20, desc:'2.40 Nm · 3000 rpm' },
  { pn:'1FK2204-5AF10-1MA0', series:'1FK2', kW:0.75,  M0:2.40,  Tmax:7.20,  Nn:3000, Nmax:6000, J:1.200, bits:20, desc:'2.40 Nm · 3000 rpm' },
  { pn:'1FK2205-4AF00-1MA0', series:'1FK2', kW:1.45,  M0:5.50,  Tmax:16.50, Nn:3000, Nmax:6000, J:3.500, bits:20, desc:'5.50 Nm · 3000 rpm' },
  { pn:'1FK2205-4AF10-1MA0', series:'1FK2', kW:1.45,  M0:5.50,  Tmax:16.50, Nn:3000, Nmax:6000, J:3.500, bits:20, desc:'5.50 Nm · 3000 rpm' },
  { pn:'1FK2206-2AF00-1MA0', series:'1FK2', kW:1.71,  M0:6.10,  Tmax:18.30, Nn:3000, Nmax:6000, J:5.000, bits:20, desc:'6.10 Nm · 3000 rpm' },
  { pn:'1FK2206-4AF10-1MA0', series:'1FK2', kW:2.85,  M0:10.90, Tmax:32.70, Nn:3000, Nmax:6000, J:8.000, bits:20, desc:'10.90 Nm · 3000 rpm' },
  { pn:'1FL2102-4AF10-1MC0', series:'1FL2', kW:0.10,  M0:0.32,  Tmax:0.96,  Nn:3000, Nmax:6000, J:0.052, bits:21, desc:'0.32 Nm · 3000 rpm' },
  { pn:'1FL2203-4AF10-1MC0', series:'1FL2', kW:0.40,  M0:1.27,  Tmax:3.81,  Nn:3000, Nmax:6000, J:0.350, bits:21, desc:'1.27 Nm · 3000 rpm' },
  { pn:'1FL2204-2AF01-1MC0', series:'1FL2', kW:0.75,  M0:2.40,  Tmax:7.20,  Nn:3000, Nmax:6000, J:1.200, bits:21, desc:'2.40 Nm · 3000 rpm' },
  { pn:'1FK7022-5AK71-1LH3', series:'1FK7', kW:0.38,  M0:0.85,  Tmax:2.55,  Nn:6000, Nmax:9000, J:0.280, bits:24, desc:'0.85 Nm · 6000 rpm' },
  { pn:'1FK7032-2AK71-1CB0', series:'1FK7', kW:0.50,  M0:1.15,  Tmax:3.45,  Nn:6000, Nmax:9000, J:1.300, bits:24, desc:'1.15 Nm · 6000 rpm' },
  { pn:'1FK7034-2AK71-1RH0', series:'1FK7', kW:0.63,  M0:1.60,  Tmax:4.80,  Nn:6000, Nmax:9000, J:0.900, bits:24, desc:'1.60 Nm · 6000 rpm' },
  { pn:'1FK7042-2AF71-1RH0', series:'1FK7', kW:0.82,  M0:3.00,  Tmax:9.00,  Nn:3000, Nmax:6000, J:3.200, bits:24, desc:'3.00 Nm · 3000 rpm' },
  { pn:'1FK7063-2AF71-1CH0', series:'1FK7', kW:2.30,  M0:6.00,  Tmax:18.00, Nn:3000, Nmax:6000, J:8.500, bits:24, desc:'6.00 Nm · 3000 rpm' },
  { pn:'1FT7034-5AK71-1CH0', series:'1FT7', kW:0.88,  M0:1.40,  Tmax:4.20,  Nn:6000, Nmax:9000, J:1.000, bits:22, desc:'1.40 Nm · 6000 rpm' },
  { pn:'1FT7034-1AK71-1CH1', series:'1FT7', kW:0.88,  M0:1.40,  Tmax:4.20,  Nn:6000, Nmax:9000, J:1.000, bits:22, desc:'1.40 Nm · 6000 rpm (opt)' },
  { pn:'1FT7044-5AF70-1CH0', series:'1FT7', kW:1.35,  M0:5.00,  Tmax:15.00, Nn:3000, Nmax:6000, J:5.430, bits:22, desc:'5.00 Nm · 3000 rpm' },
  { pn:'1FT7044-1AF71-1CH1', series:'1FT7', kW:1.35,  M0:5.00,  Tmax:15.00, Nn:3000, Nmax:6000, J:5.430, bits:22, desc:'5.00 Nm · 3000 rpm (opt)' },
  { pn:'1FT7117-7AF71-1LH0', series:'1FT7', kW:9.40,  M0:32.00, Tmax:96.00, Nn:3000, Nmax:6000, J:85.00, bits:22, desc:'32.0 Nm · 3000 rpm' },
  { pn:'1FT7108-5SF71-1CH0', series:'1FT7', kW:18.80, M0:60.00, Tmax:180.0, Nn:3000, Nmax:4500, J:160.0, bits:22, desc:'60.0 Nm · 3000 rpm' },
  { pn:'1PH8133-1HG03-1QA2',        series:'1PH8', kW:15.00, M0:47.75, Tmax:95.50, Nn:3000, Nmax:6000, J:120.0, bits:11, desc:'47.75 Nm · 3000 rpm (spindle)' },
  { pn:'1PH8133-3FG02-2PA1-Z U60',  series:'1PH8', kW:20.00, M0:47.75, Tmax:95.50, Nn:4000, Nmax:8000, J:150.0, bits:11, desc:'47.75 Nm · 4000 rpm (spindle)' },
];

const S = {
  // 1. Application Requirements
  shifts: 3,
  h_shift: 7,
  days_week: 6,
  t_cycle: 7,
  life_yrs: 10,
  theta: 45,
  sf_pct: 20,
  accu: 10,
  
  // Dynamic Sequences
  steps: [
    { name: 'Sequence 1', stroke: 15, t_move: 1.0, F_ext: 250, mass: 1, theta: 45, acc_pct: 25 },
  ],
  
  // 2. Ball screw Details
  bs_model: 'Festo - ESBF-BS-40',
  T_bs_nl: 0.05,        // Ball screw Friction Torque @ application speed + Ball screw no load torque (Nm) – R21
  Lb: 2,                // Ball screw pitch (mm) – R22
  eta: 0.98,            // Ball screw efficiency – R62
  // Additional ball screw datasheet values (R63–R73)
  I_bs: 10.704,         // Ball screw - Moment of inertia (kgmm²) – R70
  bs_fa_max: 3000,      // Ball screw - permitted axial force max @ specified rod length (N) – R63
  bs_fa_feed: 3000,     // Ball screw - permitted axial force max @ application feed speed (N) – R64
  bs_radial_max: 90,    // Ball screw - permitted radial force max (N) – R65
  bs_torque_max: 3.0,   // Ball screw - Permitted driving torque max (Nm) – R66
  bs_v_max: 400,        // Ball screw - Permitted velocity @ specified stroke length (mm/sec) – R67
  bs_a_max: 5000,       // Ball screw - Permitted acceleration max (mm/s²) – R68
  bs_accuracy: 10,      // Ball screw - Repetition accuracy (+/-) (µm) – R69
  bs_mass: 0.727,       // Ball screw - Moving mass excluding spindle (kg) – R71
  bs_service_km: 30000, // Ball screw service life @ application axial force (km) – R73

  // 3. Parallel Kit / Gearbox
  pk_model: 'Festo - EAMM-U-60',
  igb: 1,
  Tgbnl: 0.07,        // No-load driving torque of parallel kit (Nm) – R27
  I_pk: 26.7,
  pk_tmax: 3,
  pk_nmax: 6000,

  // 4. Guide Details
  guide_model: 'Festo - EAGF-V2',
  mu: 0.03,           // Friction coefficient of sliding surface – R130
  f_disp: 15,         // Displacement force required (N)
  mass_guide: 1.6,    // Guide moving mass (kg)
  f_max_guide: 1000,  // Max withstand force (N)
  life_km: 5000,      // Guide service life (km)

  // Motor bearing life
  motor_life_h: 30000, // Motor bearing life (hrs) – R85

  // UI state
  selMotorIdx: -1,
  suggestedIdx: -1,
  currentTab: 0
};

const g = 9.81, PI = Math.PI;

function calc() {
  const Lb_m   = S.Lb / 1000;                  // pitch: mm → m
  const I_bs   = (S.I_bs || 10.704) * 1e-6;   // ball screw inertia: kgmm² → kg·m² (datasheet R70)
  const I_pk   = S.I_pk * 1e-6;                // parallel kit inertia: kgmm² → kg·m²

  let Tpeak = 0, sumT2t = 0, total_t_op = 0, total_dist_mm = 0;
  let maxVmax = 0, maxNmotor = 0, maxAmax = 0, maxItotal = 0;
  let maxFaxl = 0, maxTL = 0, maxNscrew = 0, maxT_bs = 0;
  let maxT_bs_no_gb = 0, maxI_mass_bs = 0;
  let all_phases = [];

  for (const s of S.steps) {
    const s_mass = (s.mass ?? 1) + S.mass_guide;                  // payload + guide mass (kg)
    const s_th   = (s.theta != null ? s.theta : 0) * PI / 180;   // tilt angle (rad)
    const s_mm   = Math.abs(s.stroke);                             // stroke (mm)
    const s_m    = s_mm / 1000;                                    // stroke (m)

    // ── Velocity profile (Excel R98-R103: deduct 0.1s dwell buffer) ──────────
    const t_avail = Math.max(s.t_move - 0.1, 0.01);              // available move time (s)
    const t_acc   = (s.acc_pct / 100) * t_avail;                  // acceleration time (s)
    const t_dec   = t_acc;                                         // symmetric deceleration
    const t_const = Math.max(0, t_avail - t_acc - t_dec);         // constant velocity time (s)
    const Vmax_ms = t_avail > t_acc ? s_m / (t_avail - t_acc) : s_m / t_avail; // m/s
    const Vmax    = Vmax_ms * 1000;                                // mm/s (for display)
    const amax    = t_acc > 0 ? Vmax_ms / t_acc : 0;              // m/s²

    // ── Speed ────────────────────────────────────────────────────────────────
    const Nscrew     = Vmax / S.Lb * 60;          // ball screw rpm: (mm/s)/(mm/rev)*60
    const Nmotor_rpm = Nscrew * S.igb;
    const omega_bs   = 2 * PI * Nscrew / 60;      // rad/s at BS shaft
    const alpha_bs   = t_acc > 0 ? omega_bs / t_acc : 0;  // rad/s² at BS shaft

    // ── Forces (Excel R126-R131) ──────────────────────────────────────────────
    const Ffric  = s_mass * g * Math.cos(s_th) * S.mu;    // friction: µ × N_normal
    const Fgrav  = s_mass * g * Math.sin(s_th);            // gravity component along axis
    const Fa_ext = (s.F_ext || 0) + S.f_disp;             // external + guide displacement force
    const dir    = s.stroke >= 0 ? 1 : -1;
    const Faxl   = Math.abs(dir * Fgrav + Ffric + Fa_ext); // total axial force (N)

    // ── Inertia (Excel R148-R175) ─────────────────────────────────────────────
    const I_mass_bs  = s_mass * Math.pow(Lb_m / (2 * PI), 2);   // load mass → BS shaft (kg·m²)
    const I_total_bs = I_mass_bs + I_bs + I_pk;                   // total at BS/output shaft (R172)
    const Itotal     = I_total_bs / Math.pow(S.igb, 2);           // reflected to motor shaft
    maxItotal = Math.max(maxItotal, Itotal);

    // ── Torque at ball screw shaft (Excel R139-R184) ───────────────────────────
    const Ta_bs    = I_total_bs * alpha_bs;                        // accel torque at BS shaft (R180)
    const TL_bs    = Faxl * Lb_m / (2 * PI * S.eta)               // load torque from mass (R139)
                   + S.T_bs_nl + S.Tgbnl;                         // + no-load torques (R141+R142)
    const T_bs     = (TL_bs + Ta_bs) * (1 + S.sf_pct / 100);     // with safety factor (R184)
    maxT_bs = Math.max(maxT_bs, T_bs);
    // T at BS shaft WITHOUT gearbox no-load (direct drive baseline)
    const T_bs_no_gb = (Faxl * Lb_m / (2 * PI * S.eta) + S.T_bs_nl + Ta_bs) * (1 + S.sf_pct / 100);
    maxT_bs_no_gb = Math.max(maxT_bs_no_gb, T_bs_no_gb);
    maxI_mass_bs  = Math.max(maxI_mass_bs, I_mass_bs * 1e6);    // kgmm²

    // ── Torque at motor shaft (for igb > 1) ───────────────────────────────────
    const alpha_motor  = alpha_bs * S.igb;
    const TL_motor     = Faxl * Lb_m / (2 * PI * S.eta * S.igb) + S.T_bs_nl / S.igb + S.Tgbnl;
    const Ta_motor     = Itotal * alpha_motor;                     // = Ta_bs / igb
    const Tmotor_peak  = (TL_motor + Ta_motor) * (1 + S.sf_pct / 100);
    Tpeak = Math.max(Tpeak, Tmotor_peak);

    // ── RMS accumulation ──────────────────────────────────────────────────────
    sumT2t += Math.pow(TL_motor + Ta_motor, 2) * t_acc
            + Math.pow(TL_motor, 2) * t_const
            + Math.pow(TL_motor - Ta_motor * 0.4, 2) * t_dec;
    total_t_op    += t_avail;
    total_dist_mm += s_mm;

    all_phases.push(
      { vs: 0,    ve: Vmax,  t: t_acc,   T: TL_motor + Ta_motor },
      { vs: Vmax, ve: Vmax,  t: t_const, T: TL_motor },
      { vs: Vmax, ve: 0,     t: t_dec,   T: TL_motor - Ta_motor * 0.4 }
    );

    maxVmax    = Math.max(maxVmax,    Vmax);         // mm/s
    maxNmotor  = Math.max(maxNmotor,  Nmotor_rpm);
    maxNscrew  = Math.max(maxNscrew,  Nscrew);
    maxAmax    = Math.max(maxAmax,    amax);          // m/s²
    maxFaxl    = Math.max(maxFaxl,    Faxl);
    maxTL      = Math.max(maxTL,      TL_motor);
  }

  const t_cycle = Math.max(S.t_cycle, total_t_op + 0.1);
  const Trms    = Math.sqrt(sumT2t / t_cycle);

  // ── Life calculations ──────────────────────────────────────────────────────
  const h_day        = S.shifts * S.h_shift;
  const days_yr      = S.days_week * 52;
  const h_yr         = days_yr * h_day;
  const total_cycles = S.life_yrs * h_yr * 3600 / t_cycle;
  const L_rev        = total_cycles * (total_dist_mm / S.Lb || 0);

  // Ball screw service life (Excel R73: factor 2 for return stroke)
  const bs_km_per_yr = total_cycles / S.life_yrs * 2 * total_dist_mm / 1e6;
  const bs_life_yrs  = bs_km_per_yr > 0 ? S.bs_service_km / bs_km_per_yr : 999;

  // Motor service life (Excel R273-R283: operating_hrs_per_yr from duty ratio)
  const motor_op_hrs_yr = h_yr * (total_t_op / t_cycle);
  const motor_life_yrs  = motor_op_hrs_yr > 0 ? S.motor_life_h / motor_op_hrs_yr : 999;

  // Acceleration duty cycle %
  let t_acc_total = 0;
  S.steps.forEach(s => {
    const ta = Math.max(s.t_move - 0.1, 0.01);
    t_acc_total += 2 * (s.acc_pct / 100) * ta;
  });
  const duty_peak_pct = t_acc_total / t_cycle * 100;

  const Itotal = maxItotal;
  const m      = S.selMotorIdx >= 0 ? MOTOR_DB[S.selMotorIdx] : null;
  const J_m2   = m ? m.J * 1e-4 : 1e-4;   // motor rotor inertia in kg·m²

  return {
    Itotal, Tpeak, Trms, maxVmax, maxNmotor, maxAmax,
    maxFaxl, maxTL, maxNscrew, maxT_bs, maxT_bs_no_gb, maxI_mass_bs,
    bs_life_yrs, motor_life_yrs, duty_peak_pct,
    u_speed:   m ? maxNmotor / m.Nmax        : maxNmotor / 3000,
    u_peak:    m ? Tpeak     / m.Tmax        : Tpeak / 2.0,
    u_rms:     m ? Trms      / (m.M0 * 0.7) : Trms / (2.0 * 0.7),
    u_inertia: m ? (Itotal + J_m2) / J_m2 / 10 : (Itotal / 2e-4 + 1) / 10,
    all_phases, total_dist_mm, L_rev, t_cycle, t_op: total_t_op,
    inertia_ratio: m ? (Itotal + J_m2) / J_m2 : Itotal / J_m2 + 1
  };
}



// ═══════════════════════════════════════════════════════════
//  AUTO-SUGGEST
// ═══════════════════════════════════════════════════════════
function suggestMotor(R) {
  const sorted = MOTOR_DB
    .map((m, i) => ({ m, i }))
    .sort((a, b) => a.m.M0 - b.m.M0);

  for (const { m, i } of sorted) {
    const J_m2 = m.J * 1e-4;
    if (R.maxNmotor > m.Nmax)             continue;
    if (R.Tpeak > m.Tmax)                 continue;
    if (R.Trms  > m.M0 * 0.7)            continue;
    if ((R.Itotal + J_m2) / J_m2 > 10)   continue;
    return i;
  }
  return -1;
}

// ═══════════════════════════════════════════════════════════
//  STATUS HELPERS
// ═══════════════════════════════════════════════════════════
function st(u)    { return u >= 1.0 ? 'fail' : u >= 0.8 ? 'warn' : 'ok'; }
function col(u)   { return u >= 1.0 ? '#b91c1c' : u >= 0.8 ? '#92400e' : '#15803d'; }
function label(u) { return u >= 1.0 ? 'NOK ✗' : u >= 0.8 ? 'CHECK ⚠' : 'OK ✓'; }
function chkTag(u) {
  const s = st(u);
  return `<span class="check-tag ${s === 'ok' ? 'pill-ok' : s === 'warn' ? 'pill-warn' : 'pill-fail'}">${label(u)}</span>`;
}
function fmt(v, d=3) { return isNaN(v) ? '–' : v.toFixed(d); }
function fmtE(v) { return v.toExponential(3); }

// ═══════════════════════════════════════════════════════════
//  DOM HELPERS
// ═══════════════════════════════════════════════════════════
function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function specRow(l, v, unit='') {
  return `<tr><td>${l}</td><td>${v}${unit ? ' <small style="color:var(--dim2)">' + unit + '</small>' : ''}</td></tr>`;
}

// ═══════════════════════════════════════════════════════════
//  RENDER ALL
// ═══════════════════════════════════════════════════════════
let _cachedR = null;
function renderAll(skipSeq = false) {
  const R = calc();
  _cachedR = R;
  const idx = suggestMotor(R);
  S.suggestedIdx = idx;

  // Header pills
  const us = [R.u_speed, R.u_peak, R.u_rms, R.u_inertia];
  const nOK   = us.filter(u => u < 0.8).length;
  const nWarn = us.filter(u => u >= 0.8 && u < 1.0).length;
  const nFail = us.filter(u => u >= 1.0).length;
  setText('hOK',   nOK   + ' OK');
  setText('hWARN', nWarn + ' CHECK');
  setText('hFAIL', nFail + ' NOK');

  // Page 1 Summary Metrics
  const total_cycles_disp = R.t_cycle > 0 ? R.L_rev / (R.total_dist_mm / S.Lb || 1) : 0;
  setText('m_vmax',   R.maxVmax.toFixed(1));
  setText('m_amax',   (R.maxAmax * 1000).toFixed(1));
  setText('m_nmotor', Math.round(R.maxNmotor));
  setText('m_tcycle', R.t_cycle.toFixed(2));
  setText('m_moves',  (R.L_rev / 1e6).toFixed(2) + 'M rev');

  // Step Rendering
  renderSteps();

  // Torque mini table (Page 1/2)
  const t_mini = document.getElementById('tbl_torque_mini');
  if (t_mini) t_mini.innerHTML = [
    specRow('Peak Torque', R.Tpeak.toFixed(4), 'Nm'),
    specRow('RMS Torque', R.Trms.toFixed(4), 'Nm'),
    specRow('Overall Max rpm', Math.round(R.maxNmotor), 'rpm'),
  ].join('');

  // Ball screw checks table
  // Tab 2 – requirements
  setText('req_tpeak', R.Tpeak.toFixed(3));
  setText('req_trms',  R.Trms.toFixed(3));
  setText('req_nmotor', Math.round(R.maxNmotor));

  // Sidebar readouts
  renderForceVis(R);
  renderSidebarInputs();

  // 1. Calc Global Results
  const h_day = S.shifts * S.h_shift;
  setTextValue('out_hours_day', h_day);

  let total_t_op = 0;
  S.steps.forEach(s => total_t_op += s.t_move);
  setTextValue('out_t_op', total_t_op.toFixed(2));

  // Verify machine cycle time
  if (S.t_cycle < total_t_op) S.t_cycle = total_t_op + 0.1;

  if (!skipSeq) renderSequences();

  // Other visualizations
  renderP2Outputs(R);
  renderSuggestion(R, idx);
  renderMotorTable(R, idx);
  renderSelectedMotorSpecs(R);
  drawVelChart(R);
  renderSummary(R);
  renderKeyVals(R);
  renderEncoder(R);
  renderResultsMotorCard(R);
}

function renderP2Outputs(R) {
  // Row 1: BS shaft — without gearbox
  setTextContent('o_t_bs_direct', R.maxT_bs_no_gb.toFixed(4));
  setTextContent('o_n_bs',        Math.round(R.maxNscrew));
  setTextContent('o_v_bs',        R.maxVmax.toFixed(1));
  // Row 2: Motor shaft — with gearbox
  setTextContent('o_t_bs',        R.maxT_bs.toFixed(4));
  setTextContent('o_n_motor_bs',  Math.round(R.maxNmotor));
  setTextContent('o_tpeak_motor', R.Tpeak.toFixed(4));
  setTextContent('o_igb_label',   S.igb + ':1');
  // Secondary outputs
  setTextContent('o_faxl',        R.maxFaxl.toFixed(1));
  setTextContent('o_i_mass_bs',   R.maxI_mass_bs.toFixed(4));   // load mass inertia at BS shaft
  setTextContent('o_iscrew',      (S.I_bs || 10.704).toFixed(4));  // datasheet value
  setTextContent('o_itotal',      (R.Itotal * 1e6).toFixed(4));
  setTextContent('o_ineratio',    R.inertia_ratio.toFixed(3));
  setTextContent('o_lrev',        (R.L_rev / 1e6).toFixed(2));
  // Motor requirements — Tab 1 metrics
  setTextContent('req_tpeak',     R.Tpeak.toFixed(4));
  setTextContent('req_trms',      R.Trms.toFixed(4));
  setTextContent('req_nmotor',    Math.round(R.maxNmotor));
  setTextContent('req_inertia',   R.Itotal.toExponential(2));
  // Motor requirements — Tab 2 metrics (different IDs to avoid duplicate)
  setTextContent('req_tpeak_t2',  R.Tpeak.toFixed(4));
  setTextContent('req_trms_t2',   R.Trms.toFixed(4));
  setTextContent('req_nmotor_t2', Math.round(R.maxNmotor));
  // Apex suggestion table
  renderApexSuggestion(R);
}

function renderApexSuggestion(R) {
  const tbody = document.getElementById('apexSugBody');
  if (!tbody) return;
  const m = S.selMotorIdx >= 0 ? MOTOR_DB[S.selMotorIdx] : (S.suggestedIdx >= 0 ? MOTOR_DB[S.suggestedIdx] : null);
  let bestRatio = 1, bestScore = Infinity;

  const rows = APEX_RATIOS.map(r => {
    const d = APEX_DATA[r];
    const T_motor = R.maxT_bs / (r * d.eff) + d.tnl;
    const N_motor = R.maxNscrew * r;
    const ok_spd  = !m || N_motor <= m.Nmax;
    const ok_trq  = !m || T_motor <= m.Tmax;
    const ok_pk   = T_motor <= d.Tmax;
    const viable  = ok_spd && ok_trq && ok_pk;
    // score = normalized motor torque (prefer lower torque, penalise over-limit)
    const score   = viable ? T_motor : Infinity;
    if (score < bestScore) { bestScore = score; bestRatio = r; }
    return { r, d, T_motor, N_motor, ok_spd, ok_trq, ok_pk, viable };
  });

  tbody.innerHTML = rows.map(({ r, d, T_motor, N_motor, ok_spd, ok_trq, ok_pk, viable }) => {
    const isBest = viable && r === bestRatio;
    const statusTag = isBest
      ? `<span class="tag tag-ok" style="font-weight:800;">★ Best</span>`
      : viable
        ? `<span class="tag tag-ok">OK</span>`
        : `<span class="tag tag-fail">Limit</span>`;
    const rowStyle = isBest ? 'background:#f0fdf4; font-weight:600;' : '';
    return `<tr style="${rowStyle}">
      <td style="text-align:center; font-weight:700;">${r === 1 ? '1 (Direct)' : r + ':1'}</td>
      <td style="text-align:center; font-size:10px; color:var(--dim);">${d.eff}</td>
      <td style="text-align:center; font-family:monospace; font-weight:${isBest?'800':'600'}; color:${isBest?'var(--green)':'var(--accent)'};">${T_motor.toFixed(4)}</td>
      <td style="text-align:center; font-family:monospace;">${Math.round(N_motor)}</td>
      <td style="text-align:center;">${d.Tmax}</td>
      <td style="text-align:center;">${d.Nmax}</td>
      <td style="text-align:center;">${statusTag}</td>
    </tr>`;
  }).join('');

  // Auto-select best ratio if it changed
  if (bestRatio !== S.igb) {
    // Only update UI highlight, not full re-select (avoids infinite loop)
    APEX_RATIOS.forEach(x => document.getElementById('apex_btn_' + x)?.classList.toggle('active', x === bestRatio));
  }
}

function renderSequences() {
  const tbody = document.getElementById('seqTableBody');
  if (!tbody) return;
  tbody.innerHTML = S.steps.map((s, i) => `
    <tr>
      <td style="font-weight:700; color:var(--dim); text-align:center;">${i+1}</td>
      <td><input class="num-in green" style="width:90px;" type="number" value="${s.stroke}" oninput="updateSequence(${i},'stroke',+this.value)"></td>
      <td><input class="num-in green" style="width:90px;" type="number" step="0.1" value="${s.t_move}" oninput="updateSequence(${i},'t_move',+this.value)"></td>
      <td><input class="num-in green" style="width:90px;" type="number" value="${s.F_ext}" oninput="updateSequence(${i},'F_ext',+this.value)"></td>
      <td><input class="num-in green" style="width:90px;" type="number" step="0.1" value="${s.mass ?? 1}" oninput="updateSequence(${i},'mass',+this.value)"></td>
      <td><input class="num-in green" style="width:90px;" type="number" value="${s.theta ?? 45}" oninput="updateSequence(${i},'theta',+this.value)"></td>
      <td><input class="num-in green" style="width:90px;" type="number" value="${s.acc_pct}" oninput="updateSequence(${i},'acc_pct',+this.value)"></td>
      <td><button onclick="removeSequence(${i})" style="background:none; border:none; color:var(--red); font-weight:800; cursor:pointer; font-size:14px;">✕</button></td>
    </tr>
  `).join('');
}

function addSequence() {
  S.steps.push({ name: 'New Seq', stroke: 50, t_move: 1.0, F_ext: 0, mass: 1, theta: 45, acc_pct: 25 });
  renderAll();
}
function removeSequence(idx) {
  if (S.steps.length > 1) S.steps.splice(idx,1);
  renderAll();
}
function updateSequence(idx, key, val) {
  S.steps[idx][key] = val;
  renderAll(true);   // skip seq rebuild so focused input keeps its cursor
}

// ── Generate Report ──
function generateReport() {
  const R = calc();
  const m = S.selMotorIdx >= 0 ? MOTOR_DB[S.selMotorIdx] : (S.suggestedIdx >= 0 ? MOTOR_DB[S.suggestedIdx] : null);
  const now = new Date();
  const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

  const win = window.open('', '_blank');
  win.document.write(`
    <html>
    <head>
      <title>Titan Servo Report - Sizing Analysis</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; line-height: 1.5; color: #333; }
        .hdr { border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; }
        h1 { font-size: 20px; margin: 0; }
        h2 { font-size: 14px; color: #1d4ed8; text-transform: uppercase; margin-top: 25px; border-bottom: 1px solid #eee; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { text-align: left; background: #f8fafc; padding: 8px; border-bottom: 1px solid #ddd; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .val { font-weight: 700; text-align: right; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="hdr">
        <div><b style="font-size: 24px;">TITAN</b></div>
        <div style="text-align: right;"><h1>Sizing Report</h1><div>${dateStr}</div></div>
      </div>

      <h2>1. Application Requirements</h2>
      <table>
        <tr><td>Shifts / Day</td><td class="val">${S.shifts}</td><td>Working Hours / Day</td><td class="val">${S.shifts * S.h_shift} h</td></tr>
        <tr><td>Cycle Time</td><td class="val">${S.t_cycle} s</td><td>Total Operating Time</td><td class="val">${R.t_op.toFixed(2)} s</td></tr>
        <tr><td>Design Life</td><td class="val">${S.life_yrs} Yrs</td><td>Sequences</td><td class="val">${S.steps.length}</td></tr>
      </table>

      <h2>2. Motion Sequences</h2>
      <table>
        <thead><tr><th>#</th><th>Stroke (mm)</th><th>Time (s)</th><th>Force (N)</th><th>Mass (kg)</th><th>Tilt (deg)</th><th>Accel %</th></tr></thead>
        <tbody>
          ${S.steps.map((s, i) => `<tr><td>${i+1}</td><td class="val">${s.stroke}</td><td class="val">${s.t_move}</td><td class="val">${s.F_ext}</td><td class="val">${s.mass != null ? s.mass : 1}</td><td class="val">${s.theta != null ? s.theta : 45}</td><td class="val">${s.acc_pct}</td></tr>`).join('')}
        </tbody>
      </table>

      <h2>3. Calculated Results</h2>
      <table>
        <tr><td>Max Velocity</td><td class="val">${R.maxVmax.toFixed(1)} mm/s</td><td>Max Motor Speed</td><td class="val">${Math.round(R.maxNmotor)} rpm</td></tr>
        <tr><td>Peak Torque</td><td class="val">${R.Tpeak.toFixed(4)} Nm</td><td>RMS Torque</td><td class="val">${R.Trms.toFixed(4)} Nm</td></tr>
        <tr><td>Inertia Ratio</td><td class="val">${R.inertia_ratio.toFixed(2)}</td><td>T at BS shaft</td><td class="val">${R.maxT_bs.toFixed(4)} Nm</td></tr>
      </table>

      <h2>4. Selection Verdict</h2>
      ${m ? `<div style="padding: 15px; background: #f0f9ff; border-radius: 8px; margin-top: 10px;"><b>${m.pn}</b><p>${m.desc}</p></div>` : '<p>No motor selected.</p>'}
      
      <button onclick="window.print()" style="margin-top: 30px;" class="no-print">Print PDF</button>
    </body>
    </html>
  `);
  win.document.close();
}

function setTextValue(id, val)    { const el = document.getElementById(id); if (el) el.value       = val; }
function setTextContent(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
// ── Force bars ──
function renderForceVis(R) {
  // Obsolete - removed to streamline UI
}

// ── Suggestion ──
function renderSuggestion(R, idx) {
  const card = document.getElementById('suggestContent');
  if (!card) return;
  if (idx < 0) {
    card.innerHTML = '<span style="color:var(--red); font-weight:700;">⚠ No suitable motor found</span>';
    return;
  }
  const m = MOTOR_DB[idx];
  const J_m2 = m.J * 1e-4;
  
  const pctPeak = (R.u_peak * 100).toFixed(0);
  const pctRms  = (R.u_rms * 100).toFixed(0);
  const pctSpd  = (R.u_speed * 100).toFixed(0);
  card.innerHTML = `
    <div style="font-weight:700; font-size:13px; color:var(--green); margin-bottom:6px;">✓ ${m.pn}</div>
    <div style="color:var(--text); margin-bottom:4px;">${m.desc} · <span class="series-badge s-${m.series.toLowerCase()}">${m.series}</span></div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-top:8px;">
      <div style="text-align:center; background:var(--green-bg); padding:5px; border-radius:5px;">
        <div style="font-weight:700; color:var(--green); font-size:14px;">${pctPeak}%</div>
        <div style="font-size:9px; color:var(--dim);">Peak torque</div>
      </div>
      <div style="text-align:center; background:var(--green-bg); padding:5px; border-radius:5px;">
        <div style="font-weight:700; color:var(--green); font-size:14px;">${pctRms}%</div>
        <div style="font-size:9px; color:var(--dim);">RMS torque</div>
      </div>
      <div style="text-align:center; background:var(--green-bg); padding:5px; border-radius:5px;">
        <div style="font-weight:700; color:var(--green); font-size:14px;">${pctSpd}%</div>
        <div style="font-size:9px; color:var(--dim);">Speed</div>
      </div>
    </div>`;
}

// ── Motor table ──
let currentFilter = 'ALL';
function filterMotors(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.textContent === f || (f==='ALL' && b.textContent==='All')));
  renderAll();
}

function seriesBadge(s) {
  return `<span class="series-badge s-${s.toLowerCase()}">${s}</span>`;
}

function renderMotorTable(R, sugIdx) {
  const tbody = document.getElementById('motorTableBody');
  if (!tbody) return;

  const filtered = MOTOR_DB.map((m, i) => ({ m, i }))
    .filter(({ m }) => currentFilter === 'ALL' || m.series === currentFilter)
    .sort((a, b) => a.m.M0 - b.m.M0);

  tbody.innerHTML = filtered.map(({ m, i }) => {
    const J_m2 = m.J * 1e-4;
    const spdOK  = R.maxNmotor <= m.Nmax;
    const pkOK   = R.Tpeak <= m.Tmax;
    const rmsOK  = R.Trms  <= m.M0 * 0.7;
    const jOK    = (R.Itotal + J_m2) / J_m2 <= 10;
    const allOK  = spdOK && pkOK && rmsOK && jOK;
    const anyFail = !spdOK || !pkOK || !rmsOK || !jOK;

    const isSugg = i === sugIdx;
    const isSel  = i === S.selMotorIdx;
    const rowCls = isSel ? 'selected' : isSugg ? 'suggested' : '';

    const vsTag = allOK
      ? `<span class="tag tag-ok">✓ PASS</span>`
      : anyFail
        ? `<span class="tag tag-fail">✗ FAIL</span>`
        : `<span class="tag tag-warn">⚠ CHECK</span>`;

    const marker = isSugg ? ' ⭐' : isSel ? ' ●' : '';

    return `<tr class="${rowCls}" onclick="selectMotor(${i})" style="cursor:pointer;">
      <td style="font-family:monospace; font-size:11px; font-weight:${isSel||isSugg?'700':'400'};">${m.pn}${marker}</td>
      <td>${seriesBadge(m.series)}</td>
      <td style="font-family:monospace;">${m.kW}</td>
      <td style="font-family:monospace; font-weight:600;">${m.M0}</td>
      <td style="font-family:monospace;">${m.Tmax}</td>
      <td style="font-family:monospace;">${m.Nn.toLocaleString()}</td>
      <td style="font-family:monospace;">${m.Nmax.toLocaleString()}</td>
      <td style="font-family:monospace;">${m.J}</td>
      <td style="font-size:10px;">${m.bits}-bit</td>
      <td>${vsTag}</td>
    </tr>`;
  }).join('');
}

function selectMotor(idx) {
  S.selMotorIdx = idx;
  renderAll();
}

function renderSelectedMotorSpecs(R) {
  const el = document.getElementById('tbl_selected_specs');
  if (!el) return;
  const m = S.selMotorIdx >= 0 ? MOTOR_DB[S.selMotorIdx] : (S.suggestedIdx >= 0 ? MOTOR_DB[S.suggestedIdx] : null);
  if (!m) { el.innerHTML = specRow('—', 'Select from catalog'); return; }
  el.innerHTML = [
    specRow('Model', `<span style="font-family:monospace;font-size:10px;">${m.pn}</span>`),
    specRow('Stall torque M₀', m.M0, 'Nm'),
    specRow('Peak torque Tmax', m.Tmax, 'Nm'),
    specRow('Rated speed Nn', m.Nn.toLocaleString(), 'rpm'),
    specRow('Max speed Nmax', m.Nmax.toLocaleString(), 'rpm'),
    specRow('Rotor inertia J', m.J, 'kg·cm²'),
    specRow('Power', m.kW, 'kW'),
    specRow('Encoder', m.bits + '-bit'),
  ].join('');
}

// ── Summary ──
function renderSummary(R) {
  const m = S.selMotorIdx >= 0 ? MOTOR_DB[S.selMotorIdx] : (S.suggestedIdx >= 0 ? MOTOR_DB[S.suggestedIdx] : null);

  // Gravity holding / brake torque (Excel R258-R262: F_grav * Lb / (2π * igb))
  const s0     = S.steps[0];
  const s0_th  = (s0?.theta != null ? s0.theta : 0) * PI / 180;
  const s0_m   = (s0?.mass ?? 1) + S.mass_guide;
  const F_hold = s0_m * g * Math.sin(s0_th);   // gravitational holding force (N)
  const T_hold = F_hold * (S.Lb/1000) / (2*PI*S.igb);  // hold torque at motor shaft

  function row(name, actual, capacity, u, remarks) {
    return `<tr>
      <td>${name}</td>
      <td class="mono">${capacity}</td>
      <td class="mono">${actual}</td>
      <td><div style="display:flex;align-items:center;gap:6px;">
        <div style="width:70px;height:5px;background:var(--border);border-radius:4px;overflow:hidden;">
          <div style="width:${Math.min(u*100,100).toFixed(0)}%;height:100%;background:${col(u)};border-radius:4px;"></div>
        </div>
        <span style="font-size:10px;font-family:monospace;color:${col(u)}">${(u*100).toFixed(0)}%</span>
      </div></td>
      <td>${chkTag(u)}</td>
      <td style="font-size:10px;color:var(--dim);">${remarks}</td>
    </tr>`;
  }
  function wishRow(name, actual, capacity, u, remarks) {
    return `<tr style="background:var(--surface2);">
      <td style="color:var(--dim);">${name}</td>
      <td class="mono" style="color:var(--dim2);">${capacity}</td>
      <td class="mono" style="color:var(--dim);">${actual}</td>
      <td><div style="display:flex;align-items:center;gap:6px;">
        <div style="width:70px;height:5px;background:var(--border);border-radius:4px;overflow:hidden;">
          <div style="width:${Math.min(u*100,100).toFixed(0)}%;height:100%;background:${col(u)};border-radius:4px;"></div>
        </div>
        <span style="font-size:10px;font-family:monospace;color:${col(u)}">${(u*100).toFixed(0)}%</span>
      </div></td>
      <td>${chkTag(u)}</td>
      <td style="font-size:10px;color:var(--dim2);">${remarks}</td>
    </tr>`;
  }

  const NA = '–';
  const motorRows = m ? [
    // Excel Checklist R4: Motor Rated Speed
    row('Motor Rated Speed, rpm',
        Math.round(R.maxNmotor), m.Nmax,
        R.maxNmotor / m.Nmax, ''),
    // Excel Checklist R5: Motor Rated Torque — actual = required torque (w/ SF)
    row('Motor Rated Torque, Nm',
        R.Tpeak.toFixed(4), m.M0.toFixed(2),
        R.Tpeak / m.M0, ''),
    // Excel Checklist R6: Peak duty cycle ≤ 20%
    row('Motor Duty cycle for Peak torque operation, %',
        R.duty_peak_pct.toFixed(1)+'%', '20%',
        R.duty_peak_pct / 20, ''),
    // Excel Checklist R7: Mechanical brake (no brake in DB → show holding torque)
    row('Motor Mechanical Braking — power off, Nm',
        T_hold.toFixed(4), NA,
        0, 'No motor brake in DB'),
    // Excel Checklist R8: Servo lock — holding torque vs rated torque
    row('Motor Servo Lock Braking — regular operation, Nm',
        T_hold.toFixed(4), m.M0.toFixed(2),
        T_hold / m.M0, ''),
    // Excel Checklist R9: Inertia ratio ≤ permitted (Excel: capacity = 10)
    row('Motor Inertia Ratio',
        R.inertia_ratio.toFixed(3), m.J ? '10' : '10',
        R.inertia_ratio / 10, ''),
    // Excel Checklist R10: Motor service life — capacity = computed life yrs
    row('Motor service life, yrs',
        S.life_yrs, R.motor_life_yrs.toFixed(1),
        S.life_yrs / R.motor_life_yrs, 'Bearing life of motor'),
  ] : [`<tr><td colspan="6" style="color:var(--dim);padding:20px;text-align:center;">Select a motor in Tab 3 (Motor Selection)</td></tr>`];

  // Encoder resolution for movement accuracy (Excel R204-R208)
  const enc_res_mm = m ? S.Lb / Math.pow(2, m.bits) : 0;   // mm/pulse
  const enc_res_um = enc_res_mm * 1000;                      // µm/pulse (+/-)
  const gb_backlash_um = 0;   // no backlash data yet → 0
  const total_accuracy = S.bs_accuracy + gb_backlash_um + enc_res_um;  // µm (+/-)

  const wishRows = [
    // Excel Checklist R15: BS max speed
    wishRow('Ball screw max speed, rpm',
        Math.round(R.maxNscrew), S.bs_n_max,
        R.maxNscrew / S.bs_n_max, ''),
    // Excel Checklist R16: BS max acceleration, mm/sec2
    wishRow('Ball screw max acceleration, mm/sec2',
        (R.maxAmax * 1000).toFixed(1), S.bs_a_max,
        R.maxAmax * 1000 / S.bs_a_max, ''),
    // Excel Checklist R17: Ball screw max torque vs BS permitted driving torque (R66)
    wishRow('Ball screw max torque',
        R.maxT_bs.toFixed(4), S.bs_torque_max.toFixed(1),
        R.maxT_bs / S.bs_torque_max, ''),
    // Excel Checklist R18: Axial Load on Ball screw — running force vs permitted @ rod length
    wishRow('Axial Load on Ball screw, N',
        R.maxFaxl.toFixed(1), S.bs_fa_max,
        R.maxFaxl / S.bs_fa_max, ''),
    // Excel Checklist R19: Service life of the Ball screw, Yrs
    wishRow('Service life of the Ball screw, Yrs',
        S.life_yrs, R.bs_life_yrs.toFixed(1),
        S.life_yrs / R.bs_life_yrs, ''),
    // Excel Checklist R20: Movement accuracy — BS accuracy + encoder res
    wishRow('Movement accuracy of the system, (+/-) µm',
        m ? total_accuracy.toFixed(3) : NA,
        S.accu,
        m ? total_accuracy / S.accu : 0, 'BS accur + encoder res'),
    // Excel Checklist R21: Overall system life = motor life
    wishRow('Overall System service life, yrs',
        S.life_yrs, R.motor_life_yrs.toFixed(1),
        S.life_yrs / R.motor_life_yrs, ''),
  ];

  const divider = `<tr style="background:#f8f9fa;">
    <td colspan="6" style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--dim2);padding:6px 10px;">
      Wish List — Ball Screw Checks
    </td></tr>`;

  document.getElementById('sumBody').innerHTML =
    motorRows.join('') + divider + wishRows.join('');
}

// ── Key values ──
function renderKeyVals(R) {
  document.getElementById('tbl_keyvals').innerHTML = [
    specRow('Max Vmax', R.maxVmax.toFixed(1), 'mm/s'),
    specRow('Max amax', (R.maxAmax*1000).toFixed(1), 'mm/s²'),
    specRow('Max N BS shaft', Math.round(R.maxNscrew), 'rpm'),
    specRow('Max N motor', Math.round(R.maxNmotor), 'rpm'),
    specRow('T at BS shaft (w/ SF)', R.maxT_bs.toFixed(4), 'Nm'),
    specRow('Tpeak motor (w/ SF)', R.Tpeak.toFixed(4), 'Nm'),
    specRow('Trms motor', R.Trms.toFixed(4), 'Nm'),
    specRow('Inertia ratio', R.inertia_ratio.toFixed(3), ''),
    specRow('Life revolutions', (R.L_rev/1e6).toFixed(2), 'M rev'),
    specRow('Cycle Time', R.t_cycle.toFixed(2), 's'),
  ].join('');
}

// ── Encoder ──
function renderEncoder(R) {
  const m = S.selMotorIdx >= 0 ? MOTOR_DB[S.selMotorIdx] : (S.suggestedIdx >= 0 ? MOTOR_DB[S.suggestedIdx] : null);
  if (!m) { document.getElementById('tbl_encoder').innerHTML = specRow('—', 'Select motor'); return; }
  const ppr = Math.pow(2, m.bits);
  const res_mm = S.Lb / ppr;
  document.getElementById('tbl_encoder').innerHTML = [
    specRow('Type', m.bits + '-bit EnDat'),
    specRow('Resolution', ppr.toLocaleString(), 'ppr'),
    specRow('Linear res.', (res_mm * 1000).toFixed(3), 'µm/pulse'),
    specRow('= nm/pulse', (res_mm * 1e6).toFixed(1), 'nm'),
  ].join('');
}

// ── Results motor card ──
function renderResultsMotorCard(R) {
  const el = document.getElementById('resultsMotorCard');
  const m = S.selMotorIdx >= 0 ? MOTOR_DB[S.selMotorIdx] : (S.suggestedIdx >= 0 ? MOTOR_DB[S.suggestedIdx] : null);
  if (!m) { el.innerHTML = '<span style="color:var(--dim);">Go to Tab 2 (Motor Selection) and click a motor row</span>'; return; }
  const J_m2 = m.J * 1e-4;
  el.innerHTML = `
    <div style="font-weight:700; color:var(--accent); font-size:12px; margin-bottom:4px;">${m.pn}</div>
    <div style="margin-bottom:8px;">${seriesBadge(m.series)} <span style="color:var(--dim); font-size:11px;">${m.desc}</span></div>
    <table class="spec-table">
      ${specRow('Inertia ratio', R.inertia_ratio.toFixed(3))}
      ${specRow('Speed utilisation', (R.maxNmotor / m.Nmax * 100).toFixed(1) + '%')}
      ${specRow('Peak utilisation', (R.Tpeak / m.Tmax * 100).toFixed(1) + '%')}
      ${specRow('RMS utilisation', (R.Trms / (m.M0 * 0.7) * 100).toFixed(1) + '%')}
    </table>`;
}

// ═══════════════════════════════════════════════════════════
//  VELOCITY CHART
// ═══════════════════════════════════════════════════════════
function drawVelChart(R) {
  const svg = document.getElementById('velChart');
  if (!svg) return;
  const W = svg.getBoundingClientRect().width || 600;
  const H = svg.getBoundingClientRect().height || 160;
  const PL=44, PR=12, PT=10, PB=28;
  const CW = W - PL - PR, CH = H - PT - PB;
  const t_cycle = R.t_cycle;
  const maxV = R.maxVmax || 10;

  function tx(t) { return PL + (t / t_cycle) * CW; }
  function ty(v) { return PT + CH - (Math.abs(v) / maxV) * CH; }

  let pathD = `M${tx(0)},${ty(0)}`;
  let curT = 0;
  let fills = '';

  R.all_phases.forEach((p, idx) => {
    const x1 = tx(curT), x2 = tx(curT + p.t);
    const y1 = ty(p.vs), y2 = ty(p.ve);
    pathD += ` L${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`;
    
    // Fill colors for phases
    const fillCol = p.type==='acc' ? 'rgba(59,130,246,0.1)' : p.type==='const' ? 'rgba(22,163,74,0.1)' : p.type==='dec' ? 'rgba(245,158,11,0.1)' : 'transparent';
    if(p.type!=='dwell'){
      fills += `<path d="M${x1.toFixed(1)},${ty(0)} L${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} L${x2.toFixed(1)},${ty(0)}Z" fill="${fillCol}"/>`;
    }
    curT += p.t;
  });

  const grid = [0, 0.5, 1.0].map(f => {
    const v = f*maxV, y = ty(v);
    return `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${PL+CW}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
            <text x="${(PL-4).toFixed(1)}" y="${y.toFixed(1)}" fill="#9ca3af" font-size="9" text-anchor="end" dominant-baseline="middle">${v.toFixed(0)}</text>`;
  }).join('');

  svg.innerHTML = `
    ${grid}
    ${fills}
    <path d="${pathD}" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-linejoin="round"/>
    <text x="${W/2}" y="${H-5}" fill="#9ca3af" font-size="9" text-anchor="middle">Time (full cycle: ${t_cycle.toFixed(1)}s)</text>
    <rect x="${PL}" y="${PT}" width="${CW}" height="${CH}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`;
}

// ═══════════════════════════════════════════════════════════
//  MACHINE ANIMATION
// ═══════════════════════════════════════════════════════════
let lastTS = 0;
let animT = 0;
function animLoop(ts) {
  if (!lastTS) lastTS = ts;
  const R = _cachedR || calc();
  const dt = Math.min((ts - lastTS) / 1000, 0.1);
  lastTS = ts;
  animT = (animT + dt) % R.t_cycle;

  let elapsed = 0, currentPos = 0, phase = 'dwell';
  
  for(const s of S.steps) {
    const t_avail = Math.max(s.t_move - 0.1, 0.01);
    const ta = s.acc_pct/100*t_avail, td = ta, tc = Math.max(0, t_avail - ta - td);
    const vm = t_avail > ta ? (Math.abs(s.stroke)) / (t_avail - ta) : Math.abs(s.stroke) / t_avail; // mm/s
    const dir = s.stroke >= 0 ? 1 : -1;

    if (animT < elapsed + t_avail) {
      const stepT = animT - elapsed;
      let d = 0;
      if (stepT < ta) {
        d = ta > 0 ? 0.5 * (vm/ta) * stepT * stepT : 0;
        phase = 'acc';
      } else if (stepT < ta + tc) {
        d = 0.5 * vm * ta + vm * (stepT - ta);
        phase = 'const';
      } else {
        const dt_dec = stepT - (ta + tc);
        d = 0.5 * vm * ta + vm * tc + (td > 0 ? vm * dt_dec - 0.5 * (vm/td) * dt_dec * dt_dec : 0);
        phase = 'dec';
      }
      currentPos += dir * d;   // vm is mm/s, d is mm
      break;
    }
    currentPos += s.stroke;
    elapsed += t_avail;
    if (animT < elapsed + 0.1) {   // 0.1s dwell buffer
      phase = 'dwell';
      break;
    }
    elapsed += 0.1;
  }

  // Normalize currentPos to [0, max_stroke] for display or similar? 
  // Simple: relative to start
  drawMachine(currentPos, phase);
  requestAnimationFrame(animLoop);
}

function drawMachine(posMM, phase) {
  const svg = document.getElementById('machSVG');
  if (!svg) return;
  const W = svg.getBoundingClientRect().width || 700;
  const H = svg.getBoundingClientRect().height || 140;
  const PL = 80; // horizontal track start
  const CW = W - PL - 40; 
  
  // Use a fixed track length for visual scale, e.g., 500mm
  const displayScale = CW / 300; 
  const carX = PL + posMM * displayScale;

  setText('animPosText', posMM.toFixed(1) + ' mm');
  const pt = document.getElementById('animPhaseTag');
  if (pt) {
    pt.textContent = phase.toUpperCase();
    pt.className = 'phase-tag ' + (phase==='dwell'?'phase-dwell':phase==='acc'?'phase-pick':'phase-place');
  }

  svg.innerHTML = `
    <rect width="${W}" height="${H}" fill="#f9fafb" rx="6"/>
    <line x1="${PL}" y1="${H/2}" x2="${PL+CW}" y2="${H/2}" stroke="#9ca3af" stroke-width="4" stroke-linecap="round"/>
    <!-- Position ticks -->
    <text x="${PL}" y="${H/2 + 20}" fill="#9ca3af" font-size="9" text-anchor="middle">0</text>
    <text x="${PL+displayScale*100}" y="${H/2 + 20}" fill="#9ca3af" font-size="9" text-anchor="middle">100</text>
    <text x="${PL+displayScale*200}" y="${H/2 + 20}" fill="#9ca3af" font-size="9" text-anchor="middle">200</text>
    <!-- Motor / Screw end -->
    <rect x="${PL-30}" y="${H/2-10}" width="20" height="20" rx="3" fill="#e5e7eb" stroke="#d1d5db"/>
    <!-- Carriage -->
    <rect x="${carX-20}" y="${H/2-15}" width="40" height="30" rx="4"
          fill="${phase==='acc'?'#3b82f6':phase==='const'?'#16a34a':phase==='dec'?'#f59e0b':'#94a3b8'}"
          opacity="0.9"/>
    <text x="${carX}" y="${H/2 + 5}" fill="white" font-size="8" text-anchor="middle" font-weight="700">CAR</text>
  `;
}

// ═══════════════════════════════════════════════════════════
//  EVENT HANDLERS
// ═══════════════════════════════════════════════════════════
function onSlider(key, val) { S[key] = val; renderAll(); }
function onNum(key, val)    { if (!isNaN(val)) { S[key] = val; renderAll(); } }
function setTheta(deg) {
  S.theta = deg;
  document.getElementById('sl_theta').value = deg;
  ['btn_vert','btn_horiz','btn_angl'].forEach(id => document.getElementById(id).classList.remove('active'));
  if (deg === 90) document.getElementById('btn_vert').classList.add('active');
  else if (deg === 0) document.getElementById('btn_horiz').classList.add('active');
  else document.getElementById('btn_angl').classList.add('active');
  renderAll();
}

// ═══════════════════════════════════════════════════════════
//  TAB NAVIGATION
// ═══════════════════════════════════════════════════════════
function showTab(i) {
  document.querySelectorAll('.panel').forEach((p, j) => p.classList.toggle('active', j === i));
  document.querySelectorAll('.tab').forEach((t, j) => t.classList.toggle('active', j === i));
  if (i === 0) setTimeout(() => drawVelChart(calc()), 50);
}

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// ── Sync Inputs ──
function syncInputs(fromId, toId) {
  const fromEl = document.getElementById(fromId);
  const toEl   = document.getElementById(toId);
  if (fromEl && toEl) toEl.value = fromEl.value;
}

// ── STEP MANAGEMENT ──
function selectStep(idx) {
  S.currentStepIdx = idx;
  renderAll();
}

function addStep() {
  const lastPos = S.steps.length > 0 ? S.steps[S.steps.length - 1].pos : 0;
  S.steps.push({ name: 'New Pos', pos: lastPos + 10, t_move: 1.0, acc_pct: 25, dec_pct: 25, F_ext: 0, t_dwell: 0.5 });
  S.currentStepIdx = S.steps.length - 1;
  renderAll();
}

function removeStep(idx) {
  if (S.steps.length <= 1) return;
  S.steps.splice(idx, 1);
  if (S.currentStepIdx >= S.steps.length) S.currentStepIdx = S.steps.length - 1;
  renderAll();
}

function updateStep(idx, key, val) {
  S.steps[idx][key] = val;
  renderAll();
}

function renderSteps() {
  const container = document.getElementById('stepContainer');
  if (!container) return;
  
  container.innerHTML = S.steps.map((s, i) => {
    const isActive = i === S.currentStepIdx;
    return `
    <div class="row" style="display:grid; grid-template-columns: 80px 1fr 100px 100px 100px 1fr 40px; gap:10px; align-items:center; padding:10px; border-radius:6px; background:${isActive ? 'var(--accent-lt)' : 'var(--surface)'}; border:1px solid ${isActive ? 'var(--accent-md)' : 'var(--border)'}; cursor:pointer;" onclick="selectStep(${i})">
       <div style="font-weight:800; color:var(--dim); padding-left:10px;">${i+1}</div>
       <input class="num-in" style="width:100%; text-align:left;" type="text" value="${s.name}" oninput="updateStep(${i},'name',this.value)" onclick="event.stopPropagation()">
       <input class="num-in" style="width:100%;" type="number" value="${s.pos}" oninput="updateStep(${i},'pos',+this.value)" onclick="event.stopPropagation()">
       <input class="num-in" style="width:100%;" type="number" step="0.1" value="${s.t_move}" oninput="updateStep(${i},'t_move',+this.value)" onclick="event.stopPropagation()">
       <input class="num-in" style="width:100%;" type="number" step="0.1" value="${s.t_dwell}" oninput="updateStep(${i},'t_dwell',+this.value)" onclick="event.stopPropagation()">
       <div style="font-size:10px; color:var(--dim2); line-height:1.2;">
          <div>Acc/Dec: ${s.acc_pct}% each</div>
          <div>Stroke: ${s.stroke >= 0 ? '+' : ''}${s.stroke.toFixed(1)} mm</div>
       </div>
       <button onclick="event.stopPropagation(); removeStep(${i})" style="background:none; border:none; color:var(--red); font-weight:800; cursor:pointer;" title="Delete Step">✕</button>
    </div>`;
  }).join('');
}

function renderSidebarInputs() {
  const container = document.getElementById('sidebar_motion_inputs');
  if (!container) return;
  const i = S.currentStepIdx;
  const s = S.steps[i];
  if (!s) return;

  container.innerHTML = `
    <div style="margin-bottom:8px; font-weight:700; color:var(--accent); font-size:11px;">Active Step: ${i+1} - ${s.name}</div>
    <div class="ig">
      <div class="ig-header"><span class="ig-label">Target Position</span><span class="ig-val">${s.pos}<span class="ig-unit">mm</span></span></div>
      <input type="range" min="0" max="500" value="${s.pos}" oninput="updateStep(${i},'pos',+this.value)">
    </div>
    <div class="ig">
      <div class="ig-header"><span class="ig-label">Move Time</span><span class="ig-val">${s.t_move}<span class="ig-unit">s</span></span></div>
      <input type="range" min="0.1" max="10" step="0.1" value="${s.t_move}" oninput="updateStep(${i},'t_move',+this.value)">
    </div>
    <div class="ig">
      <div class="ig-header"><span class="ig-label">Acceleration Phase</span><span class="ig-val">${s.acc_pct}<span class="ig-unit">%</span></span></div>
      <input type="range" min="1" max="50" value="${s.acc_pct}" oninput="updateStep(${i},'acc_pct',+this.value)">
    </div>
    <div class="ig">
      <div class="ig-header"><span class="ig-label">Deceleration Phase</span><span class="ig-val">${s.acc_pct}<span class="ig-unit">%</span></span></div>
      <input type="range" min="1" max="50" value="${s.acc_pct}" oninput="updateStep(${i},'acc_pct',+this.value)">
    </div>
    <div class="row adv-field" style="gap:10px; margin-top:10px;">
       <div class="ig grow">
          <div class="ig-label">External Force (N)</div>
          <input class="num-in" style="width:100%;" type="number" value="${s.F_ext}" oninput="updateStep(${i},'F_ext',+this.value)">
       </div>
       <div class="ig grow">
          <div class="ig-label">Dwell (s)</div>
          <input class="num-in" style="width:100%;" type="number" step="0.1" value="${s.t_dwell}" oninput="updateStep(${i},'t_dwell',+this.value)">
       </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
//  SAVE / LOAD PROJECT
// ═══════════════════════════════════════════════════════════
async function saveToServer() {
  const R = calc();
  const m = S.selMotorIdx >= 0 ? MOTOR_DB[S.selMotorIdx] : (S.suggestedIdx >= 0 ? MOTOR_DB[S.suggestedIdx] : null);
  
  // Construct a Result object matching titan-project-calculator.html structure
  const axisResult = {
    name: S._axisName || 'Standalone Axis',
    Vmax: R.maxVmax / 1000, // Selector uses mm/s, Calculator uses m/s
    a_max: R.maxAmax,
    N_motor: R.maxNmotor,
    Faxl_pick: R.maxFaxl,
    TL_pick: R.maxTL * S.igb, // Reflected back if needed? Calculator wants TL_pick at motor
    Tpeak: R.Tpeak,
    Trms: R.Trms,
    Itotal_kgcm2: R.Itotal * 1e4,
    Jratio: R.inertia_ratio,
    pctPeak: R.u_peak * 100,
    pctRms: R.u_rms * 100,
    pctSpeed: R.u_speed * 100,
    pctInert: R.u_inertia * 100,
    motor: m,
    status: R.u_peak > 1 || R.u_rms > 1 || R.u_speed > 1 || R.u_inertia > 1 ? 'FAIL' : (R.u_peak > 0.85 ? 'CHECK' : 'OK'),
    _inputs: {
       name: S._axisName, stroke: S.steps[0].stroke, t_move: S.steps[0].t_move,
       acc_pct: S.steps[0].acc_pct, dec_pct: S.steps[0].dec_pct,
       t_cycle: S.t_cycle, theta_deg: S.theta, mass: S.steps[0].mass,
       F_pick: S.steps[0].F_ext, mu: S.mu, fw: S.sf_pct/100 + 1,
       Lb: S.Lb, eta: S.eta, I_screw: S.I_bs, I_coup: S.I_pk,
       igb: S.igb, eta_gb: 1, Tgbnl: S.Tgbnl, T_bs_nl: S.T_bs_nl,
       life_yrs: S.life_yrs, Ddays: S.days_week * 52, h_day: S.shifts * S.h_shift
    }
  };

  try {
    const btn = document.getElementById('btnSave');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    const resp = await fetch('/save-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        axisUpdate: axisResult,
        selectorState: JSON.parse(JSON.stringify(S)),
        lastUpdated: new Date().toISOString()
      })
    });
    if (resp.ok) {
       btn.innerHTML = '✓ Saved';
       btn.style.background = 'var(--green)';
       setTimeout(() => { 
         btn.innerHTML = oldHtml; 
         btn.style.background = ''; 
         btn.disabled = false;
       }, 2000);
    }
  } catch(e) {
    console.error("Failed to save to server", e);
    alert("Save failed: " + e.message);
  }
}

function saveProject() {
  saveToServer(); // Directly save to server instead of downloading
}

async function loadFromServer() {
  // Don't load stale server state if we were launched from the Project Calculator
  if (sessionStorage.getItem('titanAxisData')) return;
  try {
    const resp = await fetch('/project_state.json');
    if (!resp.ok) return;
    const data = await resp.json();
    if (data && data.selectorState) {
      // Merge keys carefully
      Object.keys(data.selectorState).forEach(k => { S[k] = data.selectorState[k]; });
      renderAll();
      console.log("Loaded state from server.");
    }
  } catch(e) {}
}

function loadProject(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      // Merge all keys into S
      const reserved = ['selMotorIdx', 'suggestedIdx', 'currentTab'];
      Object.keys(data).forEach(k => { if (!reserved.includes(k)) S[k] = data[k]; });
      // Sync visible inputs
      const numFields = {
        T_bs_nl:'in_T_bs_nl', Lb:'in_Lb', eta:'in_eta',
        I_bs:'in_I_bs', bs_mass:'in_bs_mass', bs_fa_max:'in_bs_fa_max', bs_fa_feed:'in_bs_fa_feed',
        bs_radial_max:'in_bs_radial_max', bs_torque_max:'in_bs_torque_max', bs_v_max:'in_bs_v_max',
        bs_a_max:'in_bs_a_max', bs_accuracy:'in_bs_accuracy', bs_service_km:'in_bs_service_km',
        mu:'in_mu', f_disp:'in_f_disp', mass_guide:'in_mass_guide', f_max_guide:'in_f_max_guide',
        life_km:'in_life_km', shifts:'in_shifts', h_shift:'in_hours_shift', days_week:'in_days_week',
        t_cycle:'in_t_cycle', life_yrs:'in_life_yrs', sf_pct:'in_sf', accu:'in_accu'
      };
      Object.entries(numFields).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (el && S[k] !== undefined) el.value = S[k];
      });
      // Re-apply gearbox
      onApexSelect(S.igb || 1);
      renderAll();
      alert('Project loaded successfully.');
    } catch(err) {
      alert('Error loading file: ' + err.message);
    }
    input.value = '';  // reset so same file can be re-loaded
  };
  reader.readAsText(file);
}

window.addEventListener('DOMContentLoaded', loadFromServer);

// ═══════════════════════════════════════════════════════════
//  CUSTOM GEARBOX
// ═══════════════════════════════════════════════════════════
let _customGbActive = false;
function toggleCustomGearbox() {
  _customGbActive = !_customGbActive;
  document.getElementById('customGbForm').style.display = _customGbActive ? 'block' : 'none';
  document.getElementById('apex_btn_custom').classList.toggle('active', _customGbActive);
  if (_customGbActive) {
    // Deactivate standard ratio buttons
    APEX_RATIOS.forEach(x => document.getElementById('apex_btn_' + x)?.classList.remove('active'));
    applyCustomGearbox();
  } else {
    onApexSelect(S.igb || 1);
  }
}

function applyCustomGearbox() {
  if (!_customGbActive) return;
  const ratio = parseFloat(document.getElementById('cg_ratio').value) || 1;
  const eff   = parseFloat(document.getElementById('cg_eff').value)   || 0.97;
  const tnl   = parseFloat(document.getElementById('cg_tnl').value)   || 0.05;
  const I     = parseFloat(document.getElementById('cg_I').value)     || 21.0;
  const Tmax  = parseFloat(document.getElementById('cg_Tmax').value)  || 9.0;
  const Nmax  = parseFloat(document.getElementById('cg_Nmax').value)  || 6000;
  S.igb     = ratio;
  S.Tgbnl   = tnl;
  S.I_pk    = I;
  S.pk_tmax = Tmax;
  S.pk_nmax = Nmax;
  setTextValue('in_igb',     ratio);
  setTextValue('in_Tgbnl',   tnl);
  setTextValue('in_I_pk',    I);
  setTextValue('in_pk_tmax', Tmax);
  setTextValue('in_pk_nmax', Nmax);
  renderAll();
}

// ── Apex / Festo EAMM Parallel Kit Data (standard ratios) ──
// ratio: { eff, tnl(Nm), I(Kgmm²), Tmax(Nm), Nmax(rpm) }
const APEX_DATA = {
  1:  { eff:1.00, tnl:0.07, I:26.7, Tmax:3.0,  Nmax:6000 },
  3:  { eff:0.97, tnl:0.05, I:21.0, Tmax:9.0,  Nmax:6000 },
  4:  { eff:0.97, tnl:0.05, I:19.0, Tmax:12.0, Nmax:6000 },
  5:  { eff:0.97, tnl:0.05, I:17.5, Tmax:15.0, Nmax:6000 },
  7:  { eff:0.97, tnl:0.05, I:15.0, Tmax:21.0, Nmax:5000 },
  10: { eff:0.94, tnl:0.08, I:12.5, Tmax:30.0, Nmax:4500 },
  15: { eff:0.94, tnl:0.08, I:11.0, Tmax:45.0, Nmax:4000 },
  20: { eff:0.94, tnl:0.08, I:10.5, Tmax:60.0, Nmax:3000 },
  25: { eff:0.94, tnl:0.08, I:10.0, Tmax:75.0, Nmax:2500 },
};
const APEX_RATIOS = [1, 3, 4, 5, 7, 10, 15, 20, 25];

function buildApexRatioBtns() {
  const cont = document.getElementById('apexRatioBtns');
  if (!cont) return;
  cont.innerHTML = APEX_RATIOS.map(r =>
    `<button id="apex_btn_${r}" class="apex-btn" onclick="onApexSelect(${r})">${r === 1 ? 'Direct (1:1)' : r + ':1'}</button>`
  ).join('');
}

function onApexSelect(r) {
  // Deactivate custom gearbox if standard ratio is clicked
  _customGbActive = false;
  const cg = document.getElementById('customGbForm');
  if (cg) cg.style.display = 'none';
  document.getElementById('apex_btn_custom')?.classList.remove('active');
  S.igb = r;
  const d = APEX_DATA[r] || APEX_DATA[1];
  S.Tgbnl = d.tnl;
  S.I_pk  = d.I;
  S.pk_tmax = d.Tmax;
  S.pk_nmax = d.Nmax;
  setTextValue('in_igb',     r);
  setTextValue('in_Tgbnl',   d.tnl);
  setTextValue('in_I_pk',    d.I);
  setTextValue('in_pk_tmax', d.Tmax);
  setTextValue('in_pk_nmax', d.Nmax);
  APEX_RATIOS.forEach(x => {
    document.getElementById('apex_btn_' + x)?.classList.toggle('active', x === r);
  });
  renderAll();
}




// ═══════════════════════════════════════════════════════════
//  BACK TO PROJECT
// ═══════════════════════════════════════════════════════════
function goBackToProject() {
  sessionStorage.removeItem('titanAxisData');
  window.location.href = 'titan-project-calculator.html';
}

// ═══════════════════════════════════════════════════════════
//  INIT — load from project if launched via ⚙ button
// ═══════════════════════════════════════════════════════════
(function initFromProject() {
  try {
    const raw = sessionStorage.getItem('titanAxisData');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data._fromProject) return;

    document.getElementById('hdrSub').textContent = 'Ball Screw Servo Selector · Project mode';

    // Merge all recognised keys into S
    const keys = ['t_cycle','theta','mu',
                   'Lb','D2','L_screw','eta','igb','Tgbnl','T_bs_nl',
                   'I_bs','bs_fa_max','bs_n_max','bs_a_max','bs_accuracy','bs_service_km','bs_mass',
                   'mass_guide','f_disp','f_max_guide','life_km',
                   'shifts','h_shift','days_week','life_yrs','sf_pct','accu'];
    keys.forEach(k => { if (data[k] !== undefined) S[k] = data[k]; });

    // Sync sliders to loaded values
    const sliderMap = {
      stroke:'sl_stroke', t_move:'sl_tmove', acc_pct:'sl_acc',
      dec_pct:'sl_dec', t_cycle:'sl_tcycle', theta:'sl_theta',
      mass:'sl_mass', F_pick:'sl_fpick',
      mu:'sl_mu', fw:'sl_fw'
    };
    Object.entries(sliderMap).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.value = S[key];
    });

    // Sync number inputs
    const numMap = {
      Lb:'in_Lb', eta:'in_eta',
      igb:'in_igb', eta_gb:'in_etagb',
      Tgbnl:'in_Tgbnl',
      years:'in_years', Ddays:'in_Ddays', h_day:'in_hday', FOS:'in_FOS',
      T_bs_nl:'in_T_bs_nl'
    };
    Object.entries(numMap).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.value = S[key];
    });

    // Update orientation buttons
    setTheta(S.theta);

    // Show back button + update project navigation
    const backBtn = document.getElementById('backBtn');
    const logoLink = document.getElementById('hdrLogoLink');
    if (backBtn) backBtn.style.display = 'inline-flex';
    if (logoLink) logoLink.href = 'titan-project-calculator.html';
    if (data._axisName) {
      document.getElementById('hdrSub').textContent =
        `Axis: ${data._axisName} · from Project Calculator`;
    }

    // Clear the session so refreshing doesn't re-apply stale data
    sessionStorage.removeItem('titanAxisData');
  } catch(e) {
    console.warn('Could not load project data:', e);
  }
})();

window.addEventListener('resize', () => drawVelChart(calc()));
buildApexRatioBtns();
onApexSelect(1);
requestAnimationFrame(animLoop);
