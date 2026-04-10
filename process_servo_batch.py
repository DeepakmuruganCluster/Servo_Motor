import pandas as pd
import math
import os

G = 9.81

MOTOR_DB = [
    {'pn':'1FK2103-2AH00-0MA0', 'kW':0.28,  'Mn':0.60, 'Mmax':1.95,  'Nn':4500, 'Jmot':0.093, 'brake':False},
    {'pn':'1FK2103-2AH10-0MA0', 'kW':0.28,  'Mn':0.60, 'Mmax':1.95,  'Nn':4500, 'Jmot':0.093, 'brake':True },
    {'pn':'1FK2103-4AH00-0MA0', 'kW':0.48,  'Mn':1.27, 'Mmax':4.05,  'Nn':4500, 'Jmot':0.14,  'brake':False},
    {'pn':'1FK2103-4AH10-0MA0', 'kW':0.48,  'Mn':1.27, 'Mmax':4.05,  'Nn':4500, 'Jmot':0.14,  'brake':True },
    {'pn':'1FK2104-4AF00-0MA0', 'kW':0.40,  'Mn':1.27, 'Mmax':3.75,  'Nn':3000, 'Jmot':0.35,  'brake':False},
    {'pn':'1FK2104-4AF10-0MA0', 'kW':0.40,  'Mn':1.27, 'Mmax':3.75,  'Nn':3000, 'Jmot':0.35,  'brake':True },
    {'pn':'1FK2104-4AK00-0MA0', 'kW':0.60,  'Mn':0.90, 'Mmax':3.85,  'Nn':6000, 'Jmot':0.35,  'brake':False},
    {'pn':'1FK2104-4AK10-0MA0', 'kW':0.60,  'Mn':0.90, 'Mmax':3.85,  'Nn':6000, 'Jmot':0.35,  'brake':True },
    {'pn':'1FK2104-5AF00-0MA0', 'kW':0.75,  'Mn':2.40, 'Mmax':7.50,  'Nn':3000, 'Jmot':0.56,  'brake':False},
    {'pn':'1FK2104-5AF10-0MA0', 'kW':0.75,  'Mn':2.40, 'Mmax':7.50,  'Nn':3000, 'Jmot':0.56,  'brake':True },
    {'pn':'1FK2104-5AK00-0MA0', 'kW':0.107, 'Mn':1.50, 'Mmax':7.60,  'Nn':6000, 'Jmot':0.56,  'brake':False},
    {'pn':'1FK2104-5AK10-0MA0', 'kW':0.107, 'Mn':1.50, 'Mmax':7.60,  'Nn':6000, 'Jmot':0.56,  'brake':True },
    {'pn':'1FK2104-6AF00-0MA0', 'kW':1.00,  'Mn':3.20, 'Mmax':10.0,  'Nn':3000, 'Jmot':0.76,  'brake':False},
    {'pn':'1FK2104-6AF10-0MA0', 'kW':1.00,  'Mn':3.20, 'Mmax':10.0,  'Nn':3000, 'Jmot':0.76,  'brake':True },
]

SM_PERMITTED_INERTIA_RATIO = 7


def suggest_motor(Nmotor, T_peak_motor, I_motor_kg_m2, needs_brake):
    """
    Select best motor: lowest kW first, then lowest total utilization.
    All three checks (speed, torque, inertia) must be <= 100%.
    Returns ranked list of viable motors.
    """
    results = []
    for m in MOTOR_DB:
        J_rotor = m['Jmot'] * 1e-4  # kg·cm² → kg·m²
        speed_util   = Nmotor / m['Nn']
        torque_util  = T_peak_motor / m['Mn']
        inertia_util = (I_motor_kg_m2 + J_rotor) / J_rotor / SM_PERMITTED_INERTIA_RATIO
        speed_ok    = speed_util <= 1.0
        torque_ok   = torque_util <= 1.0
        inertia_ok  = inertia_util <= 1.0
        brake_ok    = (not needs_brake) or m['brake']
        viable      = speed_ok and torque_ok and inertia_ok and brake_ok
        # Primary: lowest kW; secondary: lowest sum of utilizations
        score = m['kW'] * 1000 + (speed_util + torque_util + inertia_util)
        results.append({
            'motor': m,
            'viable': viable,
            'score': score,
            'speed_util': speed_util,
            'torque_util': torque_util,
            'inertia_util': inertia_util,
        })

    viable_list = [r for r in results if r['viable']]
    viable_list.sort(key=lambda r: r['score'])
    return viable_list


def calculate_axis(row_dict):
    def g(key, default=0):
        val = row_dict.get(key, default)
        try:
            v = float(val)
            return v if not math.isnan(v) else default
        except (TypeError, ValueError):
            return default

    stroke_m   = g('stroke_mm') / 1000.0
    t_move     = g('move_time_s', 1.0)
    dwell_time = g('dwell_time_s', 0.1)
    acc_pct    = g('acc_pct', 25)
    if acc_pct <= 1:          # calc sheet stores as decimal fraction (0.25 → 25%)
        acc_pct *= 100
    safety_pct = g('safety_factor_pct', 20)
    if safety_pct <= 1:       # calc sheet stores as decimal fraction (0.20 → 20%)
        safety_pct *= 100
    tilt_deg   = g('tilt_deg', 0)

    available_time = max(t_move - dwell_time, 0.01)
    t_acc   = min(available_time / 2, available_time * (acc_pct / 100))
    t_dec   = t_acc
    t_const = max(0, available_time - t_acc - t_dec)

    if t_acc > 0 and available_time > 0:
        Vmax_m_s = stroke_m / available_time
    else:
        Vmax_m_s = 0

    amax = Vmax_m_s / t_acc if t_acc > 0 else 0

    bs_pitch_m = g('bs_pitch_mm', 5) / 1000.0
    pk_ratio   = max(g('pk_ratio', 1), 1)
    gb_ratio   = max(g('gb_ratio', 1), 1)
    eff_ratio  = pk_ratio * gb_ratio

    bs_eff  = g('bs_efficiency', 0.98)
    gb_eff  = g('gb_efficiency', 0.97)
    eff_efficiency = bs_eff * (gb_eff if gb_ratio > 1 else 1.0)

    Nscrew = (Vmax_m_s / bs_pitch_m) * 60 if bs_pitch_m > 0 else 0
    Nmotor = Nscrew * eff_ratio

    theta  = math.radians(tilt_deg)
    mass   = g('load_mass_kg', 1.0)
    F_ext  = g('external_force_N', 0)
    mu     = g('mu', 0.03)

    axial_force = (F_ext
                   + mass * G * math.sin(theta)
                   + mass * G * math.cos(theta) * mu)

    T_bs_load = axial_force * bs_pitch_m / (2 * math.pi) if bs_pitch_m > 0 else 0
    bs_friction = g('bs_friction_torque', 0.05)
    T_bs_load += bs_friction

    # Inertia (reflected to motor shaft)
    bs_inertia = g('bs_inertia_kg_m2', 1.0704e-5)
    pk_inertia = g('pk_inertia_kg_m2', 2.67e-5)
    I_load_bs  = mass * (bs_pitch_m / (2 * math.pi)) ** 2
    I_motor    = (I_load_bs + bs_inertia + pk_inertia) / (eff_ratio ** 2)

    alpha = amax * (2 * math.pi) / bs_pitch_m if bs_pitch_m > 0 else 0
    T_accel = I_motor * alpha

    gb_no_load = g('gb_no_load_torque', 0.01)
    T_peak_bs    = (T_bs_load + T_accel / eff_ratio) * (1 + safety_pct / 100)
    T_peak_motor = (T_peak_bs / (eff_ratio * eff_efficiency) + gb_no_load) if eff_ratio > 0 else 0

    needs_brake = tilt_deg != 0

    ranked = suggest_motor(Nmotor, T_peak_motor, I_motor, needs_brake)

    best_pn   = ranked[0]['motor']['pn'] if ranked else 'NONE'
    best_rank = [
        f"#{i+1} {r['motor']['pn']} ({r['motor']['kW']}kW) "
        f"N:{r['speed_util']*100:.0f}% T:{r['torque_util']*100:.0f}% J:{r['inertia_util']*100:.0f}%"
        for i, r in enumerate(ranked[:3])
    ]

    return {
        'Application':     row_dict.get('name', ''),
        'Nmotor (rpm)':    round(Nmotor),
        'T_peak_motor (Nm)': round(T_peak_motor, 3),
        'I_motor (kg·m²)': f'{I_motor:.4e}',
        'Needs brake':     'Yes' if needs_brake else 'No',
        'Best motor':      best_pn,
        'Ranked options':  ' | '.join(best_rank) if best_rank else 'NONE',
    }


def norm_label(s):
    import re
    return re.sub(r'[^a-z0-9]+', ' ', str(s).lower()).strip()


def parse_horizontal_sheet(sheet_df):
    """
    Horizontal layout: Row N = headers, Rows N+1.. = data (one row per axis).
    Returns list of row_dicts or None if no usable header found.
    """
    header_row_idx = -1
    for i, row in sheet_df.iterrows():
        cells = [str(c) for c in row if pd.notna(c) and str(c).strip()]
        joined = ' '.join(cells).lower()
        if ('stroke' in joined or 'stn no' in joined) and len(cells) >= 3:
            header_row_idx = i
            break
    if header_row_idx == -1:
        return None

    headers = [str(c).strip() for c in sheet_df.iloc[header_row_idx]]
    col_map = {}
    for col_idx, h in enumerate(headers):
        h_l = h.lower()
        if 'appl' in h_l or ('stn' in h_l and 'no' in h_l):
            col_map.setdefault('name', col_idx)
        elif 'stroke' in h_l:
            col_map.setdefault('stroke_mm', col_idx)
        elif 'cycle time' in h_l or 'move time' in h_l:
            col_map.setdefault('move_time_s', col_idx)
        elif 'accel' in h_l or 'acc %' in h_l:
            col_map.setdefault('acc_pct', col_idx)
        elif 'external force' in h_l:
            col_map.setdefault('external_force_N', col_idx)
        elif 'moving mass' in h_l or 'load mass' in h_l:
            col_map.setdefault('load_mass_kg', col_idx)
        elif 'tilt' in h_l:
            col_map.setdefault('tilt_deg', col_idx)
        elif 'pitch' in h_l:
            col_map.setdefault('bs_pitch_mm', col_idx)
        elif 'safety factor' in h_l:
            col_map.setdefault('safety_factor_pct', col_idx)

    rows_out = []
    for i in range(header_row_idx + 1, len(sheet_df)):
        row = sheet_df.iloc[i].tolist()
        if all(v is None or (isinstance(v, float) and math.isnan(v)) or str(v).strip() == ''
               for v in row):
            continue
        row_dict = {}
        for key, col_idx in col_map.items():
            if col_idx < len(row):
                row_dict[key] = row[col_idx]
        rows_out.append(row_dict)

    return rows_out if rows_out else None


def parse_vertical_sheet(sheet_df):
    """
    Vertical layout: label in col B (index 1), value in col C (index 2).
    Returns a single row_dict.
    """
    label_map = {
        'movement stroke required':              'stroke_mm',
        'cycle time available for single movement': 'move_time_s',
        'external force on the moving mass':     'external_force_N',
        'moving mass':                           'load_mass_kg',
        'tilt angle of the setup':               'tilt_deg',
        'ball screw pitch':                      'bs_pitch_mm',
        'acceleration time':                     'acc_pct',
        'acceleration':                          'acc_pct',
        'accel decel time':                      'acc_pct',
        'safety factor':                         'safety_factor_pct',
        'gear ratio':                            'pk_ratio',
        'selected gear ratio':                   'gb_ratio',
    }
    row_dict = {'name': 'calc axis'}
    for _, row in sheet_df.iterrows():
        if len(row) < 3:
            continue
        lbl = norm_label(row.iloc[1]) if pd.notna(row.iloc[1]) else ''
        val = row.iloc[2]
        if not lbl or not pd.notna(val):
            continue
        for k, field in label_map.items():
            if k in lbl:
                try:
                    row_dict[field] = float(val)
                except (TypeError, ValueError):
                    pass
                break
    return row_dict


def process_file(file_path):
    xl = pd.ExcelFile(file_path)
    sheets = xl.sheet_names

    # Try 'User input' sheet first (horizontal layout, multiple axes)
    user_input_name = next((s for s in sheets if s.lower().replace(' ', '') == 'userinput'), None)
    calc_name = next((s for s in sheets if s.lower() == 'calc'), None)

    results = []

    if user_input_name:
        df_ui = pd.read_excel(file_path, sheet_name=user_input_name, header=None)
        rows = parse_horizontal_sheet(df_ui)
        # Only process rows that have actual parameter data (stroke > 0)
        if rows:
            data_rows = []
            for r in rows:
                try:
                    if float(r.get('stroke_mm', 0) or 0) > 0:
                        data_rows.append(r)
                except (TypeError, ValueError):
                    pass
            for row_dict in data_rows:
                results.append(calculate_axis(row_dict))

    # If no rows from User input, parse calc sheet (single axis, vertical)
    if not results and calc_name:
        df_calc = pd.read_excel(file_path, sheet_name=calc_name, header=None)
        row_dict = parse_vertical_sheet(df_calc)
        results.append(calculate_axis(row_dict))

    if not results:
        print('No data found in file.')
        return

    res_df = pd.DataFrame(results)
    print('\nMotor Selection Results:')
    print(res_df.to_string(index=False))

    out_path = 'servo_motor_selection.xlsx'
    res_df.to_excel(out_path, index=False)
    print(f'\nResults exported to {out_path}')


if __name__ == '__main__':
    candidates = [
        'Vertical Ball Screw_Pick_Place.xlsx',
        'Vertical Ball Screw_Pick_Place.xls',
        'titan_servo_test_12axes.xlsx',
    ]
    for path in candidates:
        if os.path.exists(path):
            print(f'Processing: {path}')
            process_file(path)
            break
    else:
        print('No input file found. Tried:', candidates)
