# Component Selection Logic

How the ball screw, gearbox, and servo drive recommendation panels on the calculator page
actually pick and rank candidates. One place to point the team instead of reading three source
files (`js/ballscrew-selection.js`, `js/gearbox-selection.js`, `js/drive-selection.js`).

## Shared design, across all three selectors

| Concept | What it means here |
|---|---|
| **Real catalog data** | Every candidate's numbers (torque, load ratings, current, backlash, etc.) come from the manufacturer's own published datasheets — THK's ball screw manual, Apex's AB/ABR/PE II/PG II/PA II/PS II/AE/AER/AFHKC catalogs, Siemens' TED datasheets. Nothing is estimated unless explicitly flagged (see each section's caveats). |
| **Drives the app's own physics** | The ball screw and gearbox selectors don't reimplement torque/speed/inertia formulas. For each candidate they temporarily override the relevant `state` fields (`bs_pitch`, `gb_ratio`, etc.), call the app's own `calculate()`, read the result, then restore `state`. This guarantees a candidate's numbers can never drift from what Primary Results would show if you configured it manually. |
| **Reject, don't fudge** | A candidate that fails any hard constraint (load, speed, torque, accuracy) is excluded from the ranked list entirely and moved to a collapsible "N rejected — click to view reasons" panel with the specific failing rule. Nothing failing is ever silently ranked. |
| **Utilization, not raw margin** | Every checklist reports `actual / capacity × 100` (bounded, reads like "12% used"), not `(capacity − actual) / actual × 100` (unbounded, can read as "4900% margin" for a lightly loaded pick and looks alarming for no reason). Same convention as the pre-existing Verification Checklist. |
| **Smallest-sufficient ranking** | Among everything that passes, the smallest/cheapest candidate wins, with a small tie-break bonus toward extra headroom. The tool is not trying to find the "safest" oversized part — it's finding the smallest part that's still genuinely safe. |
| **Click a row → Selection Checklist** | Clicking any recommended row swaps a detail panel below the table: Capacity/Selected vs Actual/Required vs Utilization vs OK/NOK, one row per constraint checked — the same format as the main Verification Checklist. |

---

## 0. Servo motor (core physics engine) — `js/calculations.js`

This is the one all three selectors lean on — `calculate()` is the single source of truth for
torque, speed, and inertia. Ball screw and gearbox candidates are evaluated by temporarily
overriding `state` and calling this same function, so it's worth knowing what it actually
computes. Run once per motion step, then the worst case across all steps is kept.

**Timings** (`getStepTimings`):
```
t_acc  = acceleration_time input, or a fallback = min(avail/2, avail·acc_pct)
t_dec  = deceleration_time input, or t_acc if not given
t_const = avail − t_acc − t_dec                        (avail = move_time)
```

**Peak linear speed** (`getPeakLinearSpeed`):
```
span     = avail − 0.5·(t_acc + t_dec)
Vmax_mm  = stroke / span                                 [mm/s]
Vmax_m   = Vmax_mm / 1000                                [m/s]
```

**Speed conversion:**
```
amax   = Vmax_m / t_acc                                   [m/s²]
Nscrew = Vmax_mm / bs_pitch · 60                           [rpm]   (ball-screw shaft speed)
Nmotor = Nscrew · pk_ratio · gb_ratio                      [rpm]   (motor shaft speed)
```

**Axial force** (evaluated separately for the accel-phase and decel-phase, opposite signs where
direction-dependent):
```
θ  = tilt_deg · π/180
total_mass = load_mass + guide_mass + bs_nut_mass + guide_n_blocks·guide_block_mass

F_external  = ±external_force                             (sign flips with external_force_dir / accel vs decel)
F_gravity   = ±total_mass·g·sin(θ)                         (sign flips with movement_dir / accel vs decel)
F_friction  = total_mass·g·μ·cos(θ)  +  guide_n_blocks·guide_force  +  cb_n_bushings·cb_bushing_friction_force
F_counterbalance = ±cb_mass·g·(sin(θ_cb) + cb_mu·cos(θ_cb))          (only if counterbalance enabled)

axial_force = F_external + F_gravity + F_friction + F_counterbalance      [N]
```

**Torque at the ball screw:**
```
T_axial_force = axial_force · bs_pitch / (2π · bs_efficiency)             [Nm]
T_bs_load     = T_axial_force + bs_preload_torque + bearing_drag + pk_no_load_torque

bearing_drag  = n_fixed_blocks·fixed_drag_axial + n_support_blocks·support_drag_axial
```

**Reflected inertia:**
```
Jrm  = (π/32)·ρ_material·(bs_length/1000)·(bs_dia/1000)⁴                 [kg·m²]  (screw shaft itself)
J_mass = total_mass · (bs_pitch/1000 / 2π)²                              [kg·m²]  (payload reflected through the lead)
J_reflected = J_mass + Jrm + pk_inertia + gb_inertia
```

**Acceleration torque and peak torque at the ball screw:**
```
T_accel = J_reflected · Nscrew / (9.55 · t_acc)
T_decel = J_reflected · Nscrew / (9.55 · t_dec)

T_peak_bs = max( |T_bs_load + T_accel|, |T_bs_load_decel − T_decel| ) · (1 + safety_factor/100)
```

**Referred to the motor shaft** (through gearbox ratio & efficiency):
```
T_peak_motor = T_peak_bs / (pk_ratio·gb_ratio · gb_efficiency)  +  gb_no_load_torque
T_load_motor = T_bs_load / (pk_ratio·gb_ratio · gb_efficiency)  +  gb_no_load_torque
```

**RMS (thermal/continuous) torque** — energy-weighted over accel/const/decel/dwell phases, standard
trapezoidal RMS torque integral:
```
I_acc   = (t_acc/3)·(T_load_motor² + T_load_motor·T_peak_accel_motor + T_peak_accel_motor²)
I_dec   = (t_dec/3)·(T_peak_decel_motor² + T_peak_decel_motor·T_load_motor_decel + T_load_motor_decel²)
I_const = T_load_motor² · t_const

T_rms_motor = √( Σ(I_acc + I_const + I_dec) / Σ(t_acc + t_const + t_dec) )     [Nm]
I_motor (reflected inertia at motor) = max(J_reflected) / (pk_ratio·gb_ratio)²
```

**Motor selection** (`suggestBestMotor`) — scores every `MOTOR_DB` entry and picks the smallest
viable one:
```
speedUtil   = Nmotor / motor.Nn
torqueUtil  = T_peak_motor / motor.Mn
inertiaUtil = (I_motor + motor.Jmot·1e-4) / (motor.Jmot·1e-4) / sm_permitted_inertia_ratio
viable = speedUtil ≤ 1  AND  torqueUtil ≤ 1  AND  inertiaUtil ≤ 1  AND  (brake not required OR motor.brake)

score = motor.kW·1000 + (torqueUtil + speedUtil + inertiaUtil)      → smallest kW among viable wins
```

---

## 1. Ball screw (THK) — `js/ballscrew-selection.js`

**Catalog:** `data/thk_ballscrew_catalog.js` — 5 models seeded from THK's own worked selection examples (manual `en_b15_069.pdf`), cross-verified line-by-line against that source (see conversation history / commit for the verification table: every Ca, C0a, d1, D, efficiency, grade-error, and constant matched exactly).

**Requirements derived once per selection run** (`deriveRequirements`), from the current `calculate()`
result (`base`) and project inputs (`st`):
```
Vmax    = base.Vmax_mm_s / 1000                                            [m/s]
Ph_min  = Vmax · 60 · 1000 / N_rated                                       [mm/rev]  (N_rated = selected motor's Nn, or bs_max_speed if no motor)
reqLen  = max(stroke over all steps) + nutLenAllow(100) + shaftEndAllow(100)    [mm]
posAcc  = project_accuracy / 1000                                          [mm]  (µm → mm)
Fa_max  = base.axial_force                                                 [N]   (already worst-case across steps/directions)

hoursPerYear = project_shifts · project_hours_shift · project_days_week · 52
reqLifeH     = project_service_life · hoursPerYear
```

**Checks per candidate** (`fs = 2.0` static safety factor, `fw = 1.5` dynamic load factor,
`λ` = critical-speed constant for the configured support method — 3.4 fixed-free / 9.7
supported-supported / 15.1 fixed-supported / 21.9 fixed-fixed):

```
Nscrew  = Vmax · 60 · 1000 / candidate.lead                                [rpm]
ℓb      = reqLen − mountMargin(100)                                        [mm]

① Lead:            candidate.lead ≥ Ph_min
② Shaft length:     reqLen ≤ candidate.max_len
③ Static safety:    faPerm = candidate.C0a / fs  ≥  Fa_max
④ Critical speed:   N1 = λ · candidate.d1 / ℓb² · 10⁷,  then N1_allow = N1 · 0.80  ≥  Nscrew
⑤ DN value:         N2 = 70000 / candidate.D  ≥  Nscrew
⑥ Configured max:   bs_max_speed (your own wish-list input, or N2 if unset)  ≥  Nscrew
⑦ Dynamic life:     Fam = Fa_max
                     L10 = (candidate.Ca / (fw · Fam))³ · 10⁶               [rev]
                     revsPerHour = (travelPerCycle / candidate.lead) · (3600 / cycleTime)
                     Lh = L10 / revsPerHour                                 [h]     ≥ reqLifeH
⑧ Positioning accuracy:  gradeErr = min available grade's error (mm per 300 mm travel)
                     pErr = gradeErr/300 · maxStroke  +  12×10⁻⁶ · 5°C · maxStroke     [mm]  ≤ posAcc
⑨ Motor speed/torque/inertia: re-run calculate() with bs_pitch=candidate.lead, bs_dia=candidate.dia,
                     bs_efficiency=candidate.eff, bs_preload_torque=candidate.preload_Nm, then compare
                     resulting Nmotor ≤ motor.Nn  and  T_peak_motor ≤ motor.Mmax  and  inertia_ratio ≤ sm_permitted_inertia_ratio
```

**Ranking:** compactness score (`2·diameter + lead + 0.2·nut_len`) minus a small bonus for extra life headroom — smallest screw that clears every check wins.

**Apply:** "Use this ball screw" writes `bs_pitch`, `bs_dia`, `bs_efficiency`, `bs_preload_torque`, `bs_length` into the real Ball Screw Inputs and recalculates the whole page.

**Known simplifications (flagged in the catalog file itself):**
- Dynamic life treats peak axial load as if constant (`Fam = Fa_max`) rather than a duty-cycle cubic-mean load — conservative (understates life), not overstated.
- `nut_len` / `max_len` are catalog dimensional values, not independently re-derived.

---

## 2. Gearbox (Apex) — `js/gearbox-selection.js`

**Catalog:** `data/apex_gearbox_catalog.js` — 42 unique models (from your 46-part list, after merging exact duplicates and correcting 3 confirmed typos), sourced from Apex's AB/ABR, PE II/PE IIR, PG II/PG IIR, PA II/PA IIR, PS II/PS IIR, AE/AER, and AFHKC catalogs.

**Key physics fact this relies on:** the ball-screw-side torque (`T_peak_bs`, `T_bs_load`) does **not** depend on gearbox ratio — only the motor-side reflection (`T_peak_motor`, `Nmotor`, inertia ratio) does. So the gearbox's own output-torque capacity check uses the current servo result directly; only the motor-side checks need a per-candidate `calculate()` re-run.

**Requirements derived once per selection run** (`deriveRequirements`) — note the output-side
torques come straight from the *current* `calculate()` result, unaffected by gearbox ratio:
```
T_bs_peak  = base.T_peak_bs                                                [Nm]  (independent of gb_ratio)
T_bs_rated = base.T_bs_load                                                [Nm]  (independent of gb_ratio)

bs_acc    = bs_repetition_accuracy (µm), default 10
motor_acc = (bs_pitch / sm_encoder_ppr) / 2 · 1000                         [µm]
posAcc    = project_accuracy                                               [µm]

direct-drive baseline: re-run calculate() with has_gearbox=0 → direct_T_peak_motor, direct_Nmotor
direct_motor = suggestBestMotor(direct-drive result)
```

**Checks per candidate:**
```
① Peak output torque:   candidate.peak_torque_Nm  ≥  T_bs_peak
② Rated output torque:  candidate.rated_torque_Nm ≥  T_bs_rated

r = calculate() re-run with gb_ratio=candidate.ratio, gb_efficiency=candidate.efficiency,
    gb_no_load_torque=candidate.no_load_torque_Nm, gb_inertia=candidate.inertia_kgcm2·1e-4,
    gb_backlash=candidate.backlash_arcmin, has_gearbox=1

③ Gearbox input speed:  r.Nmotor ≤ candidate.max_input_speed_rpm
④ Motor speed:          r.Nmotor ≤ motor.Nn
⑤ Motor peak torque:    r.T_peak_motor ≤ motor.Mmax  (or Mn if Mmax not published)
⑥ Inertia ratio:        r.inertia_ratio ≤ sm_permitted_inertia_ratio

⑦ System accuracy:      gb_deg = candidate.backlash_arcmin / 60
                         gb_acc = (gb_deg/360 · bs_pitch) / 2 · 1000        [µm]
                         pos_error = bs_acc + motor_acc + gb_acc            [µm]  ≤ posAcc
```
(Check ⑦ mirrors the app's own `calculateSystemAccuracy()` exactly — same linear-sum-in-microns formula, just with the candidate's own backlash substituted in.)

**Ranking:** frame size + ratio + stage as a compactness proxy, smallest sufficient gearbox wins.

**Motor-sizing comparison** (the "relate to motor size" feature) — for every candidate, also
compares what motor a **direct-drive** (no gearbox) setup would need against what becomes
sufficient **with** this gearbox:
```
candidate_motor = suggestBestMotor(r)                                      (best motor once this gearbox is applied)
torque_reduction_pct = (direct_T_peak_motor − r.T_peak_motor) / direct_T_peak_motor · 100
smaller_motor = candidate_motor.kW < direct_motor.kW
```
Shown as "↓ N% smaller than direct drive" — this is what tells you a gearbox is actually worth adding, not just technically valid.

**Apply:** "Use this gearbox" writes `gb_ratio`, `gb_efficiency`, `gb_no_load_torque`, `gb_inertia`, `gb_backlash`, `has_gearbox` into the real Gearbox Inputs and recalculates the whole page.

**Known simplifications (flagged in the catalog file itself):**
- PG II/PS II reflected-inertia values are extrapolated from the byte-identical PE II/PA II bore-inertia tables (same underlying gear train, different flange branding) rather than independently read from a PG/PS-specific table — marked `inertia_estimated: true` per row.
- Inertia is a representative value at the *smallest* available input-shaft bore for that frame — actual value depends on which motor-coupling bore is ordered.

---

## 3. Servo drive (Siemens) — `js/drive-selection.js`

**Catalog:** `data/siemens_drive_catalog.js` — all 20 parts from your list, sourced from official Siemens TED datasheets (rated/max current, rated power, frame size, weight, supply voltage/phases).

**This one doesn't re-run `calculate()`** — a drive choice doesn't feed back into servo physics, it's a downstream compatibility/sizing check against whichever motor is currently selected.

**Requirements derived once per selection run:**
```
motor = MOTOR_DB[selectedMotorIdx]
continuous_power_kW = motor.kW
peak_power_kW = base.T_peak_motor · base.Nmotor · 2π / 60 / 1000        [kW]   (mechanical peak power the load actually demands)
```

**Checks per candidate:**
```
① Motor family:   candidate.series === 'S210'                                       (S200 always rejected — different motor line, see below)
② Rated power:    candidate.rated_power_kW ≥ continuous_power_kW
③ Peak power:     drivePeakKW = candidate.rated_power_kW · (candidate.max_current_A / candidate.rated_current_A)
                   drivePeakKW ≥ peak_power_kW
```
Check ③'s `max_current / rated_current` ratio is the drive's own published overload ratio — scaling
rated power by that ratio gives an estimated peak-power capability without needing the motor's
actual current draw (which `MOTOR_DB` doesn't carry — see the caveat below).

**Ranking:** smallest rated-power drive that clears both checks wins.

**Why check ① is a hard reject, not a sizing preference:** S200-family parts (`6SL5510-...`)
pair with SIMOTICS S-1FL2 motors, a different motor line than the 1FK2 motors in `MOTOR_DB`. A
S200 drive can look perfectly sized on power alone and still be the wrong part.

**No apply button** — there's no `state` field a drive selection maps onto (a drive doesn't change torque/speed physics), so this panel is a pure recommendation, not a page input.

**Known simplification (flagged in the catalog file and in the checklist itself):** the app's `MOTOR_DB` doesn't carry per-motor rated/peak current ratings, so this is power-class matching (which is how Siemens' own catalogs document valid motor-drive combinations) rather than a true current-based check. Rated/max current are shown in the checklist as drive capacity only, not compared against a motor current figure.

---

## Where things live

| Component | Catalog data | Selection logic | Test |
|---|---|---|---|
| Ball screw | `data/thk_ballscrew_catalog.js` | `js/ballscrew-selection.js` | `scripts/test_ballscrew_selection.js` |
| Gearbox | `data/apex_gearbox_catalog.js` | `js/gearbox-selection.js` | `scripts/test_gearbox_selection.js` |
| Servo drive | `data/siemens_drive_catalog.js` | `js/drive-selection.js` | `scripts/test_drive_selection.js` |

Each test script loads the real app files into a Node `vm` context and runs a full selection headlessly — run any of them with `node scripts/test_<name>_selection.js` to confirm the selector logic still holds after a change.
