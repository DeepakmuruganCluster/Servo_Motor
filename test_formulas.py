#!/usr/bin/env python3
"""
Test script to verify the new calculation engine against reference Excel values.

This test uses the exact inputs extracted from Vertical Ball Screw_Pick_Place.xls
and verifies that the calculated outputs match within ±0.1% error.
"""

import math

# ═══════════════════════════════════════════════════════════════════
# TEST CASE: Reference Excel Values (Vertical Ball Screw_Pick_Place.xls)
# ═══════════════════════════════════════════════════════════════════

# User Inputs
stroke = 15  # mm
t_available = 1  # sec (t_move - dwell in Excel)
dwell = 0.1  # sec
acc_pct = 0.25  # 25%
F_ext = 265  # N
mass_motion = 1  # kg
theta_deg = 0
theta_rad = 0
mu_friction = 0.03  # friction coefficient

# Guide specs
guide_mass = 1.603  # kg
guide_disp_force = 15  # N (not used in main calculation, but part of specs)

# Ball Screw specs
bs_pitch = 2  # mm
bs_pitch_m = 0.002  # m
bs_efficiency = 0.98
bs_friction_torque = 0.05  # Nm (datasheet value)
bs_inertia = 1.0704e-05  # kg-m²

# Kit specs
kit_nl_torque = 0.07  # Nm
kit_inertia = 26.7e-6  # kg-m²

# Gearbox specs
gb_ratio = 1
gb_efficiency = 1.0
gb_nl_torque = 0

# Motor specs
motor_rated_rpm = 3000
motor_rated_torque = 1.27  # Nm
motor_peak_torque = 3.8
motor_inertia = 0.00027

# Safety factor
fw = 0.2  # 20%

# ═══════════════════════════════════════════════════════════════════
# REFERENCE VALUES FROM EXCEL (What we should match)
# ═══════════════════════════════════════════════════════════════════

REFERENCE = {
    'v_required': 22.22222222,
    'rpm_required': 666.66666667,
    'a_required': 98.76543210,
    'F_moving': 265.765282,
    'm_total': 2.603,
    'T_load': 0.206322160,
    'T_accel': 0.011686714,
    'T_peak_bs': 0.261610648,
    'T_peak_motor': 0.261610648,  # gearbox_ratio = 1, efficiency = 1.0
    'motor_loading_pct': 20.60,
    'P_mechanical': 18.264,
}

# ═══════════════════════════════════════════════════════════════════
# STAGE 3.1: MOTION CALCULATIONS
# ═══════════════════════════════════════════════════════════════════

t_movement = t_available - dwell  # 1.0 - 0.1 = 0.9 sec
t_accel = t_movement * acc_pct  # 0.9 * 0.25 = 0.225 sec

# CRITICAL: v_required = stroke / (t_movement - t_accel), NOT stroke / t_available
v_required = stroke / (t_movement - t_accel)  # 15 / (0.9 - 0.225) = 15 / 0.675 = 22.222

a_required = v_required / t_accel  # 22.222 / 0.225 = 98.765
d_accel = 0.5 * a_required * t_accel * t_accel  # 0.5 * 98.765 * 0.225^2 = 2.5
d_const = stroke - 2 * d_accel  # 15 - 2*2.5 = 10.0
t_const = d_const / v_required if v_required > 0 else 0  # 10.0 / 22.222 = 0.45

# RPM
rpm_required = (v_required * 30) / bs_pitch  # 22.222 * 30 / 2 = 333.33... WAIT
# Formula from Excel: RPM = (v_required / pitch_mm) * 60
rpm_required = (v_required / bs_pitch) * 60  # 22.222 / 2 * 60 = 666.67 ✓
omega_rad_sec = rpm_required * 2 * math.pi / 60

# ═══════════════════════════════════════════════════════════════════
# STAGE 3.2: FORCE CALCULATIONS
# ═══════════════════════════════════════════════════════════════════

g_accel = 9.81
m_total = mass_motion + guide_mass  # 1 + 1.603 = 2.603

# Force gravity-friction component
F_gravity_friction = m_total * g_accel * mu_friction * math.cos(theta_rad)  # 2.603 * 9.81 * 0.03 = 0.765282
F_moving = F_ext + F_gravity_friction  # 265 + 0.765282 = 265.765282

# ═══════════════════════════════════════════════════════════════════
# STAGE 3.3: TORQUE CALCULATIONS
# ═══════════════════════════════════════════════════════════════════

# Load torque components
T_mass = (F_moving * bs_pitch_m) / (2 * math.pi * bs_efficiency)
T_bs_friction = bs_friction_torque
T_kit_nl = kit_nl_torque

T_load = T_mass + T_bs_friction + T_kit_nl  # 0.0863 + 0.05 + 0.07 = 0.2063

# Acceleration torque (inertia-based)
J_moving_mass = m_total * math.pow(bs_pitch_m / (2 * math.pi), 2)
J_reflected = J_moving_mass + bs_inertia + kit_inertia

a_linear_m_per_sec = a_required / 1000  # Convert mm/sec² to m/sec²
alpha_rad_sec2 = a_linear_m_per_sec * (2 * math.pi) / bs_pitch_m

T_accel = J_reflected * alpha_rad_sec2  # [Nm]

# Peak torque
T_peak_bs = (T_load + T_accel) * (1 + fw)
T_peak_motor = (T_peak_bs / gb_ratio) / gb_efficiency

# Power
P_mechanical = T_peak_motor * omega_rad_sec

# Motor utilization
motor_loading_pct = (T_peak_motor / motor_rated_torque) * 100

# ═══════════════════════════════════════════════════════════════════
# VERIFICATION & RESULTS
# ═══════════════════════════════════════════════════════════════════

print("=" * 90)
print("FORMULA VERIFICATION - Comparing Calculated vs Reference Excel Values")
print("=" * 90)

results = {
    'v_required': v_required,
    'rpm_required': rpm_required,
    'a_required': a_required,
    'F_moving': F_moving,
    'm_total': m_total,
    'T_load': T_load,
    'T_accel': T_accel,
    'T_peak_bs': T_peak_bs,
    'T_peak_motor': T_peak_motor,
    'motor_loading_pct': motor_loading_pct,
    'P_mechanical': P_mechanical,
}

all_pass = True
for key, calculated in results.items():
    ref_value = REFERENCE[key]
    error_pct = abs(calculated - ref_value) / ref_value * 100 if ref_value != 0 else 0
    status = "✅ PASS" if error_pct < 0.1 else "❌ FAIL" if error_pct > 1 else "⚠️ WARN"
    
    if error_pct >= 0.1:
        all_pass = False
    
    print(f"\n{key:25} | Calculated: {calculated:15.10f}")
    print(f"{' '*25} | Reference:  {ref_value:15.10f}")
    print(f"{' '*25} | Error:      {error_pct:6.4f}% {status}")

print("\n" + "=" * 90)
if all_pass:
    print("✅ ALL TESTS PASSED - Formulas verified to ±0.1% accuracy!")
else:
    print("⚠️ Some tests failed or have warnings - review above for details")
print("=" * 90)

# ═══════════════════════════════════════════════════════════════════
# DIAGNOSTIC OUTPUT
# ═══════════════════════════════════════════════════════════════════

print("\n📊 INTERMEDIATE CALCULATIONS (For Debugging):\n")
print(f"Motion Timing:")
print(f"  t_movement     = {t_movement:.3f} sec")
print(f"  t_accel        = {t_accel:.3f} sec")
print(f"  t_const        = {t_const:.3f} sec")
print(f"  d_accel        = {d_accel:.3f} mm")
print(f"  d_const        = {d_const:.3f} mm")

print(f"\nInertia Breakdown:")
print(f"  J_moving_mass  = {J_moving_mass:.10e} kg-m²")
print(f"  J_bs_inertia   = {bs_inertia:.10e} kg-m²")
print(f"  J_kit_inertia  = {kit_inertia:.10e} kg-m²")
print(f"  J_reflected    = {J_reflected:.10e} kg-m²")

print(f"\nAngular Values:")
print(f"  a_linear m/s²  = {a_linear_m_per_sec:.10f} m/sec²")
print(f"  α rad/sec²      = {alpha_rad_sec2:.10f} rad/sec²")
print(f"  ω rad/sec       = {omega_rad_sec:.10f} rad/sec")

print(f"\nTorque Components:")
print(f"  T_mass         = {T_mass:.10f} Nm (load from moving mass)")
print(f"  T_bs_friction  = {T_bs_friction:.10f} Nm (ball screw friction)")
print(f"  T_kit_nl       = {T_kit_nl:.10f} Nm (kit no-load)")
print(f"  T_load         = {T_load:.10f} Nm (steady-state)")
print(f"  T_accel        = {T_accel:.10f} Nm (from acceleration)")

print("\n" + "=" * 90)
