# Ball Screw Calculation Specification
## Based on Reference: Vertical Ball Screw_Pick_Place.xls

### Input Fields (From Servo Inputs Sheet)

#### Section 1: Data Inputs
- `stn_no`: Station/Axis identifier
- `appl`: Application identifier
- `shifts_per_day`: Number of shifts (default 3)
- `hours_per_shift`: Hours per shift (default 7)
- `hours_per_day`: Total operating hours per day
- `days_per_week`: Operating days per week (default 6)
- `total_cycle_time`: Full machine cycle time [sec]
- `total_op_time`: Total operating time per cycle [sec]
- `service_life`: Expected machine service life [years] (default 10)
- `stroke`: Movement stroke required [mm]
- `move_time`: Available time for single movement [sec]
- `force_ext`: External force on mass [N]
- `mass`: Moving mass [kg]
- `tilt_angle`: Tilt angle of setup [deg]
- `accel_pct`: Acceleration time as % of move time (0-1)
- `safety_factor`: Safety factor as fraction (e.g., 0.20 = 20%)
- `accuracy_req`: Required positioning accuracy [micron]

#### Section 2: Ball Screw Details
- `bs_model`: Model identifier
- `bs_friction_torque`: Friction torque @ application speed [Nm]
- `bs_pitch`: Ball screw pitch/lead [mm]
- `bs_dia`: Ball screw diameter [mm]
- `bs_rod_length`: Rod/shaft length [mm]
- `bs_efficiency`: Efficiency [0-1]
- `bs_max_axial_force_rod`: Max axial force @ rod length [N]
- `bs_max_axial_force_speed`: Max axial force @ application speed [N]
- `bs_max_radial_force`: Max radial force [N]
- `bs_max_torque`: Max permitted torque [Nm]
- `bs_max_velocity`: Max velocity [mm/sec]
- `bs_max_accel`: Max acceleration [m/sec²]
- `bs_accuracy`: Repetition accuracy [micron]
- `bs_moment_inertia`: Moment of inertia [kg·m²]
- `bs_moving_mass`: Moving mass excluding spindle [kg]
- `bs_duty_cycle`: Duty cycle [0-1]
- `bs_service_life`: Service life @ application load [km]

#### Section 3: Parallel Kit Details
- `kit_model`: Model identifier
- `kit_ratio`: Gear ratio
- `kit_nl_torque`: No load driving torque [Nm]
- `kit_inertia`: Mass moment of inertia [kg·mm²]
- `kit_max_torque`: Max transferable torque [Nm]
- `kit_max_speed`: Max rotational speed [rpm]

#### Section 4: Guide Details
- `guide_model`: Model identifier
- `guide_force_req`: Displacement force required [N]
- `guide_mass`: Moving mass [kg]
- `guide_max_force`: Max withstand force [N]
- `guide_service_life`: Service life at 100% load [km]

#### Section 5: Gear Box Details
- `gb_model`: Model identifier
- `gb_ratio`: Gear ratio
- `gb_inertia`: Inertia [kg·m²]
- `gb_efficiency`: Efficiency [0-1]
- `gb_nl_torque`: No load running torque [Nm]
- `gb_backlash`: Backlash [arcmin]
- Additional specs: rated/max speeds, torques, forces, service life

#### Section 6: Servo Motor Details
- `motor_model`: Model identifier
- `motor_rated_rpm`: Rated RPM
- `motor_rated_torque`: Rated torque [Nm]
- `motor_peak_torque`: Peak torque [Nm]
- `motor_inertia`: Rotor inertia [kg·m²]
- `motor_inertia_ratio`: Permitted inertia ratio
- `motor_brake_capacity`: Mechanical brake capacity [Nm]
- `motor_encoder_res`: Encoder resolution [ppr]
- `motor_max_rpm`: Maximum RPM
- `motor_bearing_life`: Service life [hr]
- `motor_brake_life`: Brake service life [times]

### Calculation Steps

#### 1. Motion Analysis
```
dwell_time = move_time * 0.1  (10% buffer by default)
available_time = move_time - dwell_time
required_velocity = stroke / available_time  [mm/sec]

# Account for acceleration/deceleration phases
acc_time = available_time * accel_pct
dec_time = available_time * accel_pct
const_velocity_time = available_time - acc_time - dec_time
velocity_avg = stroke / available_time

# If less than const velocity time available, adjust
if (acc_time + dec_time) >= available_time:
    velocity_needed = stroke / (available_time * 0.5)  # simplified
else:
    velocity_needed = velocity_avg
```

#### 2. Speed Calculations
```
rpm_required = (velocity_avg * 60) / bs_pitch
omega_rad_sec = (rpm_required * 2 * pi) / 60
```

#### 3. Force Calculations
```
g = 9.81  [m/sec²]
mu = 0.03  (default friction coefficient)
sin_theta = sin(tilt_angle * pi/180)
cos_theta = cos(tilt_angle * pi/180)

axial_force = force_ext + (mass * g * sin_theta) + (mass * g * cos_theta * mu)
```

#### 4. Torque Calculations
```
# Torque to overcome axial load (ball screw conversion)
torque_axial = (axial_force * bs_pitch) / (2 * pi)

# Add friction/no-load torque (already @ application speed)
torque_bs = torque_axial + bs_friction_torque

# At gearbox output (same if ratio = 1)
torque_gb = torque_bs * gb_ratio

# At motor shaft (applying efficiency loss)
torque_motor = (torque_gb / gb_efficiency) + (gb_nl_torque / gb_ratio)

# With safety factor
torque_peak = torque_motor * (1 + safety_factor)

# RMS Torque (simplified: assume rectangular duty with 20% peak time)
torque_rms = sqrt(torque_peak^2 * 0.2 + torque_motor^2 * 0.8)
```

#### 5. Speed at Motor
```
speed_motor = rpm_required * kit_ratio
```

#### 6. Inertia Analysis
```
# Load inertia reflected
inertia_load = mass * (bs_pitch / (2*pi))^2 + bs_moment_inertia + kit_inertia
inertia_ratio = inertia_load / motor_inertia
```

### Validation Checks

All should output OK/CHECK/FAIL status:

1. **Motor Speed**: `rpm_required ≤ motor_max_rpm`
   - Utilization = `rpm_required / motor_max_rpm * 100%`

2. **Motor Peak Torque**: `torque_peak ≤ motor_peak_torque`
   - Utilization = `torque_peak / motor_peak_torque * 100%`

3. **Motor Rated Torque**: `torque_rms ≤ motor_rated_torque * 0.7`
   - Utilization = `torque_rms / (motor_rated_torque*0.7) * 100%`

4. **Inertia Ratio**: `inertia_ratio ≤ motor_inertia_ratio` (typically 10, use 7 for margin)
   - At reference: 1.14 / 0.00027 = 4223 (way under limit!)

5. **Ball Screw Speed**: `velocity_avg ≤ bs_max_velocity`

6. **Ball Screw Acceleration**: Must calculate & check against `bs_max_accel`

7. **Ball Screw Torque**: `torque_axial ≤ bs_max_torque`

8. **Ball Screw Axial Load**: `axial_force ≤ bs_max_axial_force_speed`

9. **Ball Screw Service Life**: Calculate based on load & duty cycle

10. **Movement Accuracy**: System accuracy ≤ required

### Output Fields (Results)

- `rpm_motor`: Required motor speed
- `torque_motor`: Required motor torque
- `torque_peak`: Peak torque with safety factor
- `torque_rms`: RMS/continuous torque
- `inertia_ratio`: Load/motor inertia ratio
- `velocity_linear`: Required linear velocity
- `accel_linear`: Required acceleration
- `status`: Overall status (OK/CHECK/FAIL)
- Utilization percentages for each parameter

### Reference Example Values
```
Input:
  Stroke: 15 mm
  Move Time: 1 sec
  Force: 250 N
  Mass: 1 kg
  Angle: 45° (note: reference shows 0, using 45 per user's template)
  BS Pitch: 2 mm
  BS Friction: 0.05 Nm
  Motor: SIEMENS 1FL6042, 3000 rpm, 0.16 Nm rated

Output:
  Velocity Required: 22.22 mm/sec
  RPM Required: 666.67 rpm
  Torque BS: 0.2616 Nm
  Torque Motor: 0.2616 Nm
  Speed Utilization: 22.2%
  Torque Utilization: 20.6% (peak against rated)
```
