import math

def calculate_values(mass_kg, stroke_mm, t_move_s, lead_mm, efficiency, igb, T_bs_nl, Tgbnl):
    # Formulas from titan-project-calculator.html
    
    stroke_m = stroke_mm / 1000.0
    lead_m = lead_mm / 1000.0
    
    # Assuming acc_pct = 20%, dec_pct = 20%, t_dwell_m = 0.1
    t_dwell_m = 0.1
    t_eff = max(t_move_s - t_dwell_m, t_move_s * 0.5)
    t_acc = t_eff * 0.2
    t_dec = t_eff * 0.2
    
    # Linear Speed (Peak)
    v_max = stroke_m / (t_eff - 0.5 * (t_acc + t_dec))
    
    # Speed in RPM
    n_motor = (v_max / lead_m) * 60 * igb
    
    # Axial Force (simplified for vertical motion: mass + gravity)
    # F = mass * g + friction...
    mu = 0.01 # minor friction
    f_axial = mass_kg * 9.81 + mass_kg * 9.81 * mu # Vertical
    
    # Torque
    # T = (F * Lead) / (2 * PI * eta * igb) + NL_torques
    t_load = (f_axial * lead_m) / (2 * math.pi * efficiency * igb) + T_bs_nl + Tgbnl
    
    return {
        "Vmax (m/s)": v_max,
        "Vmax (mm/s)": v_max * 1000,
        "N_motor (rpm)": n_motor,
        "Faxial (N)": f_axial,
        "Tload (Nm)": t_load
    }

# Check if we can match the user's values:
# Torque: 0.27 Nm
# Speed: 667 rpm
# Linear Speed: 22 mm/sec

# Let's try some inputs
res = calculate_values(
    mass_kg=80, 
    stroke_mm=20, 
    t_move_s=1.0, 
    lead_mm=2.0, 
    efficiency=0.98, 
    igb=1, 
    T_bs_nl=0.01, 
    Tgbnl=0.01
)

print(f"Results for 80kg, 20mm stroke, 1s move, 2mm lead:")
for k, v in res.items():
    print(f"  {k}: {v:.4f}")

# Target values:
# Linear Speed 22 mm/sec -> Vmax = 0.022 m/s
# N = (0.022 / 0.002) * 60 = 660 rpm (Close to 667)
# If Lead = 2, then V = 22 mm/s means RPM = 22 / 2 * 60 = 660. 
# If RPM = 667, V = 667 / 60 * 2 = 22.23 mm/s.

# Torque 0.27 Nm
# If F = 800N, T = (800 * 0.002) / (2 * pi * 0.98) = 1.6 / 6.15 = 0.26 Nm.
# Plus no-load torques, it reaches 0.27 Nm.
