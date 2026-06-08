#!/usr/bin/env python3
"""
Servo Calculator Formula Verification
======================================
Mirrors every formula from "Detailed calculations.xlsx" and servo-app.js.
Edit the INPUT PARAMETERS section with your values, then run:
    python3 verify_calculations.py

The script prints each intermediate step with the formula used,
so you can compare against the app's outputs line by line.
"""

import math

# ═══════════════════════════════════════════════════════════════════════════════
# INPUT PARAMETERS  ← Edit these to match your Excel / app inputs
# ═══════════════════════════════════════════════════════════════════════════════

# Motion
stroke_mm       = 15.0       # mm
move_time_s     = 0.9        # s  (total time available for move)
accel_time_s    = 0.2        # s  (ta)
decel_time_s    = 0.2        # s  (td)
dwell_time_s    = 0.1        # s  (idle)
tilt_deg        = 45.0       # degrees (0 = horizontal)
movement_dir    = 'against_gravity'   # 'against_gravity' or 'with_gravity'
ext_force_N     = 5.0        # N  (additional external force)
ext_force_dir   = 'opposing'          # 'opposing' or 'aiding'

# Masses
payload_mass_kg     = 5.0    # kg  (payload / workpiece)
carriage_mass_kg    = 0.5    # kg  (fixture / carriage)
bs_nut_mass_kg      = 0.052  # kg  (ballscrew nut mass)
guide_block_mass_kg = 0.2    # kg  (mass per carriage block)
n_guide_blocks      = 2      # number of guide blocks

# Friction / Guide
guide_friction_N    = 15.0   # N  (LM guide friction per block × n_blocks combined, or force per block if using per-block)
mu                  = 0.03   # ball-screw preload friction coefficient (mu for normal-force friction)

# Ball Screw
bs_pitch_mm     = 5.0        # mm
bs_dia_mm       = 10.0       # mm
bs_length_mm    = 171.0      # mm
bs_material     = 'steel'    # 'steel' | 'stainless' | 'aluminum'
bs_efficiency   = 0.98       # (fraction, e.g. 0.98)
bs_preload_torque_Nm    = 0.0
bs_bearing_drag_Nm      = 0.0   # total bearing drag torque (or use components below)
bs_n_fixed_blocks       = 1
bs_fixed_drag_axial_Nm  = 0.0
bs_n_support_blocks     = 1
bs_support_drag_axial_Nm= 0.0

# Counterbalance
has_counterbalance  = False
cb_mass_kg          = 0.0
cb_angle_deg        = 90.0
cb_mu               = 0.005
cb_n_bushings       = 0
cb_bushing_friction_N = 0.0

# Parallel Kit
has_parallel_kit    = True
pk_ratio            = 1.0
pk_no_load_Nm       = 0.07
pk_inertia_kgm2     = 2.67e-5

# Gearbox
has_gearbox         = True
gb_ratio            = 3.0
gb_efficiency       = 0.97
gb_no_load_Nm       = 0.01
gb_inertia_kgm2     = 0.0

# Safety factor
safety_factor_pct   = 20.0   # %

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════
G = 9.81
BS_DENSITY = {'steel': 7870, 'stainless': 7930, 'aluminum': 2700}

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════
def sep(title=''):
    width = 72
    if title:
        print(f"\n{'─'*3} {title} {'─'*(width - len(title) - 5)}")
    else:
        print('─' * width)

def row(label, formula, value, unit=''):
    print(f"  {label:<38} {formula:<28} = {value:>12.6g}  {unit}")

def check(label, app_value, calc_value, unit='', tol=1e-4):
    match = abs(app_value - calc_value) <= tol * max(abs(calc_value), 1e-12)
    flag  = '✓' if match else '✗ MISMATCH'
    print(f"  {label:<38} App={app_value:>12.6g}  Calc={calc_value:>12.6g}  {unit:6}  {flag}")

# ═══════════════════════════════════════════════════════════════════════════════
# CALCULATIONS
# ═══════════════════════════════════════════════════════════════════════════════

sep('DRIVE RATIOS')
eff_ratio      = (pk_ratio if has_parallel_kit else 1) * (gb_ratio if has_gearbox else 1)
eff_efficiency = gb_efficiency if has_gearbox else 1.0
pk_no_load     = pk_no_load_Nm if has_parallel_kit else 0.0
gb_no_load     = gb_no_load_Nm if has_gearbox else 0.0
pk_inertia     = pk_inertia_kgm2 if has_parallel_kit else 0.0
gb_inertia     = gb_inertia_kgm2 if has_gearbox else 0.0
pitch_m        = bs_pitch_mm / 1000
row('PK ratio',        'pk_ratio if enabled',           pk_ratio if has_parallel_kit else 1)
row('GB ratio',        'gb_ratio if enabled',           gb_ratio if has_gearbox else 1)
row('Combined ratio',  'pk_ratio × gb_ratio',           eff_ratio)
row('Drive efficiency','gb_efficiency if enabled',      eff_efficiency)

sep('TIMING')
t_const = move_time_s - accel_time_s - decel_time_s
row('Constant-speed time', 't - ta - td', t_const, 's')
assert t_const >= 0, f"ERROR: ta+td ({accel_time_s+decel_time_s}s) exceeds move_time ({move_time_s}s)"

sep('SPEED  (Speed calc sheet)')
# Peak linear speed: V = S / (t - 0.5*(ta+td))
Vmax_m_s   = (stroke_mm / 1000) / (move_time_s - 0.5 * (accel_time_s + decel_time_s))
Vmax_mm_s  = Vmax_m_s * 1000
Nscrew_rpm = Vmax_mm_s / bs_pitch_mm * 60      # RPM at ballscrew shaft
Nmotor_rpm = Nscrew_rpm * eff_ratio
amax_m_s2  = Vmax_m_s / accel_time_s

row('Peak linear speed',   'S / (t - 0.5(ta+td))',   Vmax_mm_s, 'mm/s')
row('Peak linear speed',   '',                         Vmax_m_s,  'm/s')
row('Ballscrew RPM',       'Vmax_mm/s / pitch × 60', Nscrew_rpm, 'rpm')
row('Motor RPM',           'Nscrew × eff_ratio',      Nmotor_rpm, 'rpm')
row('Max acceleration',    'Vmax / ta',                amax_m_s2, 'm/s²')

sep('MASSES')
total_mass = payload_mass_kg + carriage_mass_kg + bs_nut_mass_kg + n_guide_blocks * guide_block_mass_kg
row('Payload mass',         'mp',                       payload_mass_kg,     'kg')
row('Carriage mass',        'mc',                       carriage_mass_kg,    'kg')
row('BS nut mass',          'mn',                       bs_nut_mass_kg,      'kg')
row('Guide block mass×n',   'ml × n_blocks',            n_guide_blocks * guide_block_mass_kg, 'kg')
row('Total moving mass',    'mp+mc+mn+ml×n',            total_mass,          'kg')

sep('AXIAL FORCE COMPONENTS  (Load Torque sheet)')
theta        = tilt_deg * math.pi / 180
gravity_sign = -1 if movement_dir == 'with_gravity' else 1
ext_sign     = -1 if ext_force_dir == 'aiding' else 1

F_gravity    = gravity_sign * total_mass * G * math.sin(theta)
F_external   = ext_sign * ext_force_N
F_pl         = total_mass * G * mu * math.cos(theta)       # normal-force preload friction
F_ffp        = n_guide_blocks * guide_friction_N            # LM guide friction (total)
F_cb_bushing = cb_n_bushings * cb_bushing_friction_N
F_friction   = F_pl + F_ffp + F_cb_bushing

F_counterbalance = 0.0
if has_counterbalance:
    theta_cb         = cb_angle_deg * math.pi / 180
    F_cb_raw         = cb_mass_kg * G * (math.sin(theta_cb) + cb_mu * math.cos(theta_cb))
    F_counterbalance = -gravity_sign * F_cb_raw

axial_force  = F_external + F_gravity + F_friction + F_counterbalance

row('θ (inclination)',       'tilt_deg → radians',      theta,          'rad')
row('Gravity sign',          '-1 with gravity, +1 against', gravity_sign)
row('F_gravity',             '±m·g·sin(θ)',             F_gravity,      'N')
row('F_external',            '±F_ext',                  F_external,     'N')
row('F_preload friction',    'm·g·μ·cos(θ)',            F_pl,           'N')
row('F_guide friction',      'n_blocks × F_per_block',  F_ffp,          'N')
row('F_CB bushing friction', 'n_bush × F_per_bush',     F_cb_bushing,   'N')
row('F_friction total',      'Fpl + Ffp + Fcb_bush',    F_friction,     'N')
row('F_counterbalance',      '±(Mcb·g·(sinθcb+μcb·cosθcb))', F_counterbalance, 'N')
row('AXIAL FORCE total',     'Fext+Fg+Ffric+Fcb',       axial_force,    'N')

sep('LOAD TORQUE @ BALLSCREW SHAFT  (Load Torque sheet)')
bs_bearing_drag = (bs_n_fixed_blocks   * bs_fixed_drag_axial_Nm +
                   bs_n_support_blocks * bs_support_drag_axial_Nm +
                   bs_bearing_drag_Nm)
T_axial  = (axial_force * pitch_m) / (2 * math.pi * bs_efficiency) if pitch_m > 0 else 0
T_bs_load = T_axial + bs_preload_torque_Nm + bs_bearing_drag + pk_no_load

row('T_axial_force',         'F·pitch/(2π·η)',          T_axial,        'Nm')
row('T_preload',             'bs_preload_torque',        bs_preload_torque_Nm, 'Nm')
row('T_bearing_drag',        'fixed+support drag',       bs_bearing_drag, 'Nm')
row('T_pk_no_load',          'pk_no_load_torque',        pk_no_load,     'Nm')
row('T_bs_load (steady)',    'T_axial+Tpre+Tdrag+Tpk', T_bs_load,      'Nm')

sep('INERTIA  (Acceleration Torque sheet)')
rho    = BS_DENSITY.get(bs_material, 7870)
Lb     = bs_length_mm / 1000
Db     = bs_dia_mm / 1000
Jrm    = (math.pi / 32) * rho * Lb * Db**4
J_mass = total_mass * (pitch_m / (2 * math.pi))**2
J_reflected = J_mass + Jrm + pk_inertia + gb_inertia
I_motor     = J_reflected / eff_ratio**2 if eff_ratio > 0 else 0

row('Ballscrew density ρ',  f'material={bs_material}',  rho,            'kg/m³')
row('Jrm (ballscrew)',       '(π/32)·ρ·Lb·Db⁴',        Jrm,            'kg·m²')
row('J_linear_mass',         'm·(pitch/2π)²',           J_mass,         'kg·m²')
row('J_pk',                  'pk_inertia',               pk_inertia,     'kg·m²')
row('J_gb',                  'gb_inertia',               gb_inertia,     'kg·m²')
row('J_reflected (total)',   'Jlm+Jrm+Jpk+Jgb',        J_reflected,    'kg·m²')
row('I_motor (at motor)',     'J_reflected/ratio²',      I_motor,        'kg·m²')

sep('ACCELERATION / DECELERATION TORQUE  (Acceleration Torque sheet)')
T_accel = J_reflected * Nscrew_rpm / (9.55 * accel_time_s) if accel_time_s > 0 else 0
T_decel = J_reflected * Nscrew_rpm / (9.55 * decel_time_s) if decel_time_s > 0 else 0

row('T_accel',               'J·(N/9.55)/ta',           T_accel,        'Nm')
row('T_decel',               'J·(N/9.55)/td',           T_decel,        'Nm')

sep('TOTAL TORQUE PER PHASE @ BALLSCREW  (Total Torque sheet)')
T_total_accel    = T_bs_load + T_accel
T_total_topspeed = T_bs_load
T_total_decel    = T_bs_load - T_decel

row('T during acceleration', 'Tl + Ta',                  T_total_accel,   'Nm')
row('T during topspeed',     'Tl',                       T_total_topspeed,'Nm')
row('T during deceleration', 'Tl − Td',                  T_total_decel,   'Nm')

sep('PEAK TORQUE @ MOTOR')
SF          = 1 + safety_factor_pct / 100
T_peak_bs   = max(abs(T_total_accel), abs(T_total_decel)) * SF
T_peak_motor = T_peak_bs / (eff_ratio * eff_efficiency) + gb_no_load if eff_ratio > 0 else 0
T_load_motor = abs(T_bs_load) / (eff_ratio * eff_efficiency) + gb_no_load if eff_ratio > 0 else 0

row('Safety factor SF',      '1 + SF%/100',              SF)
row('T_peak @ BS',           'max(|Tacc|,|Tdec|) × SF', T_peak_bs,      'Nm')
row('T_peak @ motor',        'T_pk_bs/(ratio×η)+Tgbnl', T_peak_motor,   'Nm')
row('T_load @ motor',        '|Tl|/(ratio×η)+Tgbnl',    T_load_motor,   'Nm')

sep('RMS TORQUE @ MOTOR')
Iacc    = (accel_time_s / 3) * (T_load_motor**2 + T_load_motor * T_peak_motor + T_peak_motor**2)
Idec    = (decel_time_s / 3) * (T_peak_motor**2 + T_peak_motor * T_load_motor + T_load_motor**2)
Iconst  = T_load_motor**2 * t_const
total_motion_time = accel_time_s + t_const + decel_time_s
T_rms_motor = math.sqrt((Iacc + Iconst + Idec) / total_motion_time) if total_motion_time > 0 else 0

row('Energy during accel',   '(ta/3)(Tl²+Tl·Tp+Tp²)',  Iacc)
row('Energy during const',   'Tl² × tc',                Iconst)
row('Energy during decel',   '(td/3)(Tp²+Tp·Tl+Tl²)',  Idec)
row('Total motion time',     'ta+tc+td',                 total_motion_time, 's')
row('T_rms @ motor',         '√(ΣT²t / total_t)',        T_rms_motor,    'Nm')

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY TABLE — compare these against the app's display
# ═══════════════════════════════════════════════════════════════════════════════
sep()
print()
print('╔══════════════════════════════════════════════════════════════════════╗')
print('║                    SUMMARY — compare vs app                        ║')
print('╠══════════════════════════════════════════════════════════════════════╣')
fmt = '║  {:<35} {:>12.5g}  {:<8}  {:<10}║'
def srow(label, value, unit, app_field=''):
    print(fmt.format(label, value, unit, app_field))

srow('Total moving mass',           total_mass,         'kg',    'guide_mass→')
srow('Axial Force (max abs)',        abs(axial_force),   'N',     'out_axial_force')
srow('Load Torque @ BS',            abs(T_bs_load),     'Nm',    'out_load_torque')
srow('Inertia J_reflected',         J_reflected,        'kg·m²', 'out_inertia_bs')
srow('Inertia at motor I_motor',    I_motor,            'kg·m²', 'out_inertia')
srow('Accel torque @ BS',           T_accel,            'Nm',    'out_accel_torque')
srow('Decel torque @ BS',           T_decel,            'Nm',    'out_decel_torque')
srow('T accel phase @ BS',          abs(T_total_accel), 'Nm',    'out_torque_accel')
srow('T topspeed phase @ BS',       abs(T_total_topspeed),'Nm',  'out_torque_topspd')
srow('T decel phase @ BS',          abs(T_total_decel), 'Nm',    'out_torque_decel')
srow('T peak @ BS (with SF)',       T_peak_bs,          'Nm',    'out_peak_torque_bs')
srow('T peak @ motor',              T_peak_motor,       'Nm',    'out_peak_torque')
srow('T load @ motor',              T_load_motor,       'Nm',    'out_load_torque_m')
srow('T rms @ motor',               T_rms_motor,        'Nm',    'out_rms_torque')
srow('Ballscrew RPM',               Nscrew_rpm,         'rpm',   'out_speed_bs')
srow('Motor RPM',                   Nmotor_rpm,         'rpm',   'out_speed_motor')
print('╚══════════════════════════════════════════════════════════════════════╝')

print("""
HOW TO USE:
  1. Open the app → edit your application → note each displayed value.
  2. Edit INPUT PARAMETERS at the top of this script to match your inputs.
  3. Run:  python3 verify_calculations.py
  4. Compare the SUMMARY table values against what the app shows.
     Any mismatch in the summary table points to a formula discrepancy.
  5. For deep-dive: the step-by-step intermediate values above the summary
     match the rows in "Detailed calculations.xlsx" one-to-one.
""")
