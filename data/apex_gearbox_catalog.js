/* Apex Dynamics Gearbox Catalog — global DB (mirrors the THK_BALLSCREW_DB pattern in
 * data/thk_ballscrew_catalog.js). Units: torque Nm, speed rpm, backlash arcmin, inertia kg·cm²,
 * weight kg. Sourced from Apex's own published catalogs:
 *   AB/ABR      — apexdynamicsusa.com/.../ababr_catalog.pdf
 *   PEII/PEIIR, PGII/PGIIR, PAII/PAIIR, PSII/PSIIR — apexdynamicsusa.com/.../pii_piir_calatog.pdf
 *   AE/AER      — apexdynamicsusa.com/.../aeaer_catalog.pdf
 *   AFHKC       — apexdynamicsusa.com/.../afh-_afhk_catalog.pdf
 *
 * Fields:
 *   pn              catalog part number (as ordered — encodes stage/ratio/shaft/backlash grade)
 *   series          Apex series code (AB, ABR, PEII, PEIIR, PGII, PGIIR, PAII, PAIIR, PSII, PSIIR, AE, AER, AFHKC)
 *   type            'inline' (coaxial output) | 'right-angle' (90° output)
 *   frame           nominal flange size (mm); PSII uses letter frame codes A-E, stored as the
 *                   equivalent mm size for sorting (A=50,B=70,C=90,D=120,E=155) with frame_code kept too
 *   stage           1, 2, or 3 (planetary reduction stages)
 *   ratio           i = N_in / N_out
 *   rated_torque_Nm         T2N, nominal continuous output torque
 *   peak_torque_Nm          T2B, max repeated acceleration torque (60% of T2NOT for all series
 *                           except AFHKC, which publishes 1.5x T2N directly)
 *   emergency_torque_Nm     T2NOT, one-time non-repeating limit (3x T2N; 2x for AFHKC) — informational only
 *   no_load_torque_Nm       drag torque at zero load, same field the app already models as gb_no_load_torque
 *   nominal_input_speed_rpm n1N
 *   max_input_speed_rpm     n1B
 *   backlash_arcmin         for the SPECIFIC grade/stage encoded in this pn (P1/P2 for AB/ABR;
 *                           II vs IIR variant for the P-series; single spec for AE/AER/AFHKC)
 *   efficiency              0-1, for this stage
 *   max_radial_load_N, max_axial_load_N   at output shaft center, 100 rpm, 20,000 h life
 *   inertia_kgcm2           reflected input-side inertia — for the P-series (PEII/PGII/PAII/PSII
 *                           and their R variants) this is a representative value at the SMALLEST
 *                           available input-shaft bore for that frame/stage (actual value depends
 *                           on which motor coupling bore is ordered; treat as an estimate, same
 *                           spirit as thk_ballscrew_catalog.js's nut_len estimate)
 *   weight_kg               null where the source catalog's Performance table doesn't list it
 *   service_life_hr         20,000 for all series (S5 cyclic duty per Apex's own definition)
 *
 * PGII/PGIIR and PSII/PSIIR inertia values are extrapolated from the byte-identical PEII/PAII
 * bore-inertia tables (confirmed identical to each other across every other field we checked —
 * same underlying planetary gear train, different flange/branding) — NOT independently read from
 * a PG/PS-specific inertia table. Flagged per-row with inertia_estimated: true.
 *
 * Three part numbers in the source list didn't match a standard catalog ratio and were corrected
 * per user confirmation: PAII090-012-S2 -> ratio 10 (typo), AB090A-016-S2-P2 -> ratio 15 (typo),
 * AB1180-004-S2-P2 -> AB180-004-S2-P2 (invalid frame size, corrected to AB180).
 */
const APEX_GEARBOX_DB = [
  { pn:'AB060-010-S2-P1', series:'AB', type:'inline', frame:60, stage:1, ratio:10,
    rated_torque_Nm:40, peak_torque_Nm:72, emergency_torque_Nm:120, no_load_torque_Nm:null,
    nominal_input_speed_rpm:5000, max_input_speed_rpm:10000, backlash_arcmin:3, efficiency:0.97,
    max_radial_load_N:1530, max_axial_load_N:765, inertia_kgcm2:0.13, inertia_estimated:false,
    weight_kg:1.3, service_life_hr:20000 },

  { pn:'AB115-004-S2-P2', series:'AB', type:'inline', frame:115, stage:1, ratio:4,
    rated_torque_Nm:290, peak_torque_Nm:522, emergency_torque_Nm:870, no_load_torque_Nm:null,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:8000, backlash_arcmin:5, efficiency:0.97,
    max_radial_load_N:6700, max_axial_load_N:3350, inertia_kgcm2:2.74, inertia_estimated:false,
    weight_kg:7.8, service_life_hr:20000 },

  { pn:'PAII060-005-S2', series:'PAII', type:'inline', frame:60, stage:1, ratio:5,
    rated_torque_Nm:40, peak_torque_Nm:72, emergency_torque_Nm:120, no_load_torque_Nm:0.10,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:7, efficiency:0.97,
    max_radial_load_N:1150, max_axial_load_N:575, inertia_kgcm2:0.10, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'AE070-003', series:'AE', type:'inline', frame:70, stage:1, ratio:3,
    rated_torque_Nm:55, peak_torque_Nm:99, emergency_torque_Nm:165, no_load_torque_Nm:null,
    nominal_input_speed_rpm:5000, max_input_speed_rpm:10000, backlash_arcmin:8, efficiency:0.97,
    max_radial_load_N:1377, max_axial_load_N:765, inertia_kgcm2:0.16, inertia_estimated:false,
    weight_kg:1.4, service_life_hr:20000 },

  { pn:'PAII060-007-S2', series:'PAII', type:'inline', frame:60, stage:1, ratio:7,
    rated_torque_Nm:35, peak_torque_Nm:63, emergency_torque_Nm:105, no_load_torque_Nm:0.10,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:7, efficiency:0.97,
    max_radial_load_N:1150, max_axial_load_N:575, inertia_kgcm2:0.10, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000, bundled_motor:'1FK2204-5AK00-0' },

  { pn:'PEII070-004', series:'PEII', type:'inline', frame:70, stage:1, ratio:4,
    rated_torque_Nm:42, peak_torque_Nm:75.6, emergency_torque_Nm:126, no_load_torque_Nm:0.10,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:7, efficiency:0.97,
    max_radial_load_N:1150, max_axial_load_N:575, inertia_kgcm2:0.12, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PEII120-003', series:'PEII', type:'inline', frame:120, stage:1, ratio:3,
    rated_torque_Nm:217, peak_torque_Nm:390.6, emergency_torque_Nm:651, no_load_torque_Nm:0.80,
    nominal_input_speed_rpm:3600, max_input_speed_rpm:4800, backlash_arcmin:6, efficiency:0.97,
    max_radial_load_N:3260, max_axial_load_N:1630, inertia_kgcm2:0.36, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PEIIR070-004', series:'PEIIR', type:'right-angle', frame:70, stage:1, ratio:4,
    rated_torque_Nm:42, peak_torque_Nm:75.6, emergency_torque_Nm:126, no_load_torque_Nm:0.15,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:11, efficiency:0.93,
    max_radial_load_N:1150, max_axial_load_N:575, inertia_kgcm2:0.36, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PGII060-003', series:'PGII', type:'inline', frame:60, stage:1, ratio:3,
    rated_torque_Nm:42, peak_torque_Nm:75.6, emergency_torque_Nm:126, no_load_torque_Nm:0.10,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:7, efficiency:0.97,
    max_radial_load_N:1030, max_axial_load_N:515, inertia_kgcm2:0.12, inertia_estimated:true,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PEIIR070-003', series:'PEIIR', type:'right-angle', frame:70, stage:1, ratio:3,
    rated_torque_Nm:42, peak_torque_Nm:75.6, emergency_torque_Nm:126, no_load_torque_Nm:0.15,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:11, efficiency:0.93,
    max_radial_load_N:1150, max_axial_load_N:575, inertia_kgcm2:0.36, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PAII060-003-S2', series:'PAII', type:'inline', frame:60, stage:1, ratio:3,
    rated_torque_Nm:42, peak_torque_Nm:75.6, emergency_torque_Nm:126, no_load_torque_Nm:0.10,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:7, efficiency:0.97,
    max_radial_load_N:1150, max_axial_load_N:575, inertia_kgcm2:0.10, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PAII060-004-S2', series:'PAII', type:'inline', frame:60, stage:1, ratio:4,
    rated_torque_Nm:42, peak_torque_Nm:75.6, emergency_torque_Nm:126, no_load_torque_Nm:0.10,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:7, efficiency:0.97,
    max_radial_load_N:1150, max_axial_load_N:575, inertia_kgcm2:0.10, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PSIIC-010', series:'PSII', type:'inline', frame:90, frame_code:'C', stage:1, ratio:10,
    rated_torque_Nm:68, peak_torque_Nm:122.4, emergency_torque_Nm:204, no_load_torque_Nm:0.40,
    nominal_input_speed_rpm:3600, max_input_speed_rpm:6000, backlash_arcmin:6, efficiency:0.97,
    max_radial_load_N:1510, max_axial_load_N:755, inertia_kgcm2:0.22, inertia_estimated:true,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PSIIRC-010', series:'PSIIR', type:'right-angle', frame:90, frame_code:'C', stage:1, ratio:10,
    rated_torque_Nm:68, peak_torque_Nm:122.4, emergency_torque_Nm:204, no_load_torque_Nm:0.45,
    nominal_input_speed_rpm:3600, max_input_speed_rpm:6000, backlash_arcmin:10, efficiency:0.93,
    max_radial_load_N:1510, max_axial_load_N:755, inertia_kgcm2:1.87, inertia_estimated:true,
    weight_kg:null, service_life_hr:20000 },

  { pn:'AB090-003-S2-P2', series:'AB', type:'inline', frame:90, stage:1, ratio:3,
    rated_torque_Nm:130, peak_torque_Nm:234, emergency_torque_Nm:390, no_load_torque_Nm:null,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:8000, backlash_arcmin:5, efficiency:0.97,
    max_radial_load_N:3250, max_axial_load_N:1625, inertia_kgcm2:0.61, inertia_estimated:false,
    weight_kg:3.7, service_life_hr:20000 },

  { pn:'AB090-008-S2-P2', series:'AB', type:'inline', frame:90, stage:1, ratio:8,
    rated_torque_Nm:120, peak_torque_Nm:216, emergency_torque_Nm:360, no_load_torque_Nm:null,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:8000, backlash_arcmin:5, efficiency:0.97,
    max_radial_load_N:3250, max_axial_load_N:1625, inertia_kgcm2:0.44, inertia_estimated:false,
    weight_kg:3.7, service_life_hr:20000 },

  { pn:'AB090-004-S2-P2', series:'AB', type:'inline', frame:90, stage:1, ratio:4,
    rated_torque_Nm:140, peak_torque_Nm:252, emergency_torque_Nm:420, no_load_torque_Nm:null,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:8000, backlash_arcmin:5, efficiency:0.97,
    max_radial_load_N:3250, max_axial_load_N:1625, inertia_kgcm2:0.48, inertia_estimated:false,
    weight_kg:3.7, service_life_hr:20000 },

  // Corrected from "PAII090-012-S2" — ratio 12 isn't a catalog option; treated as ratio 10 (typo), per user confirmation.
  { pn:'PAII090-010-S2', series:'PAII', type:'inline', frame:90, stage:1, ratio:10,
    rated_torque_Nm:68, peak_torque_Nm:122.4, emergency_torque_Nm:204, no_load_torque_Nm:0.40,
    nominal_input_speed_rpm:3600, max_input_speed_rpm:6000, backlash_arcmin:6, efficiency:0.97,
    max_radial_load_N:1530, max_axial_load_N:765, inertia_kgcm2:0.22, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000, note:'source list said PAII090-012-S2; 012 is not a catalog ratio, corrected to 010 per user confirmation' },

  // Corrected from "AB1180-004-S2-P2" — AB1180 is not a valid AB frame size; corrected to AB180 per user confirmation.
  { pn:'AB180-004-S2-P2', series:'AB', type:'inline', frame:180, stage:1, ratio:4,
    rated_torque_Nm:1050, peak_torque_Nm:1890, emergency_torque_Nm:3150, no_load_torque_Nm:null,
    nominal_input_speed_rpm:3000, max_input_speed_rpm:6000, backlash_arcmin:5, efficiency:0.97,
    max_radial_load_N:14500, max_axial_load_N:7250, inertia_kgcm2:23.67, inertia_estimated:false,
    weight_kg:29, service_life_hr:20000, note:'source list said AB1180-004-S2-P2; AB1180 is not a valid frame size, corrected to AB180 per user confirmation' },

  // Corrected from "AB090A-016-S2-P2" — ratio 16 isn't a catalog option for AB090A; treated as ratio 15 (typo).
  // This is the same part as the separately-listed "AB090A-015-S2-P2" (item 34 in the source list) — merged.
  { pn:'AB090A-015-S2-P2', series:'AB', type:'inline', frame:90, frame_code:'090A', stage:2, ratio:15,
    rated_torque_Nm:130, peak_torque_Nm:234, emergency_torque_Nm:390, no_load_torque_Nm:null,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:8000, backlash_arcmin:7, efficiency:0.94,
    max_radial_load_N:3250, max_axial_load_N:1625, inertia_kgcm2:0.47, inertia_estimated:false,
    weight_kg:5.3, service_life_hr:20000, note:'source list had both AB090A-016-S2-P2 (016 not a catalog ratio, corrected to 015) and AB090A-015-S2-P2 — same part, merged' },

  { pn:'AFHKC060-004-S2', series:'AFHKC', type:'right-angle', frame:60, stage:2, ratio:4,
    rated_torque_Nm:95, peak_torque_Nm:142.5, emergency_torque_Nm:190, no_load_torque_Nm:2,
    nominal_input_speed_rpm:5000, max_input_speed_rpm:7000, backlash_arcmin:3, efficiency:0.95,
    max_radial_load_N:3000, max_axial_load_N:1500, inertia_kgcm2:0.10, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000, max_tilting_moment_Nm:160 },

  { pn:'PGII060-004', series:'PGII', type:'inline', frame:60, stage:1, ratio:4,
    rated_torque_Nm:42, peak_torque_Nm:75.6, emergency_torque_Nm:126, no_load_torque_Nm:0.10,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:7, efficiency:0.97,
    max_radial_load_N:1030, max_axial_load_N:515, inertia_kgcm2:0.12, inertia_estimated:true,
    weight_kg:null, service_life_hr:20000 },

  { pn:'AB180-004-S1-P1', series:'AB', type:'inline', frame:180, stage:1, ratio:4,
    rated_torque_Nm:1050, peak_torque_Nm:1890, emergency_torque_Nm:3150, no_load_torque_Nm:null,
    nominal_input_speed_rpm:3000, max_input_speed_rpm:6000, backlash_arcmin:3, efficiency:0.97,
    max_radial_load_N:14500, max_axial_load_N:7250, inertia_kgcm2:23.67, inertia_estimated:false,
    weight_kg:29, service_life_hr:20000 },

  { pn:'PEIIR090-010', series:'PEIIR', type:'right-angle', frame:90, stage:1, ratio:10,
    rated_torque_Nm:68, peak_torque_Nm:122.4, emergency_torque_Nm:204, no_load_torque_Nm:0.45,
    nominal_input_speed_rpm:3600, max_input_speed_rpm:6000, backlash_arcmin:10, efficiency:0.93,
    max_radial_load_N:1530, max_axial_load_N:765, inertia_kgcm2:1.87, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'AB090-005-S2-P2', series:'AB', type:'inline', frame:90, stage:1, ratio:5,
    rated_torque_Nm:160, peak_torque_Nm:288, emergency_torque_Nm:480, no_load_torque_Nm:null,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:8000, backlash_arcmin:5, efficiency:0.97,
    max_radial_load_N:3250, max_axial_load_N:1625, inertia_kgcm2:0.47, inertia_estimated:false,
    weight_kg:3.7, service_life_hr:20000, bundled_motor:'1FK2205-4AF00-0' },

  { pn:'ABR060-005-S2-P2', series:'ABR', type:'right-angle', frame:60, stage:1, ratio:5,
    rated_torque_Nm:60, peak_torque_Nm:108, emergency_torque_Nm:180, no_load_torque_Nm:null,
    nominal_input_speed_rpm:5000, max_input_speed_rpm:10000, backlash_arcmin:6, efficiency:0.95,
    max_radial_load_N:1530, max_axial_load_N:765, inertia_kgcm2:0.35, inertia_estimated:false,
    weight_kg:2.1, service_life_hr:20000 },

  { pn:'AB090-010-S2-P2', series:'AB', type:'inline', frame:90, stage:1, ratio:10,
    rated_torque_Nm:100, peak_torque_Nm:180, emergency_torque_Nm:300, no_load_torque_Nm:null,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:8000, backlash_arcmin:5, efficiency:0.97,
    max_radial_load_N:3250, max_axial_load_N:1625, inertia_kgcm2:0.44, inertia_estimated:false,
    weight_kg:3.7, service_life_hr:20000, bundled_motor:'1FK2205-4AF00-0' },

  { pn:'PAII115-030-S2', series:'PAII', type:'inline', frame:115, stage:2, ratio:30,
    rated_torque_Nm:212, peak_torque_Nm:381.6, emergency_torque_Nm:636, no_load_torque_Nm:0.40,
    nominal_input_speed_rpm:3600, max_input_speed_rpm:4800, backlash_arcmin:8, efficiency:0.94,
    max_radial_load_N:3470, max_axial_load_N:1735, inertia_kgcm2:0.24, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PGIIR040-003', series:'PGIIR', type:'right-angle', frame:40, stage:1, ratio:3,
    rated_torque_Nm:16, peak_torque_Nm:28.8, emergency_torque_Nm:48, no_load_torque_Nm:0.10,
    nominal_input_speed_rpm:4500, max_input_speed_rpm:8000, backlash_arcmin:12, efficiency:0.93,
    max_radial_load_N:520, max_axial_load_N:260, inertia_kgcm2:0.18, inertia_estimated:true,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PGII040-005', series:'PGII', type:'inline', frame:40, stage:1, ratio:5,
    rated_torque_Nm:15, peak_torque_Nm:27, emergency_torque_Nm:45, no_load_torque_Nm:0.05,
    nominal_input_speed_rpm:4500, max_input_speed_rpm:8000, backlash_arcmin:8, efficiency:0.97,
    max_radial_load_N:520, max_axial_load_N:260, inertia_kgcm2:0.10, inertia_estimated:true,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PEII050-007', series:'PEII', type:'inline', frame:50, stage:1, ratio:7,
    rated_torque_Nm:12, peak_torque_Nm:21.6, emergency_torque_Nm:36, no_load_torque_Nm:0.05,
    nominal_input_speed_rpm:4500, max_input_speed_rpm:8000, backlash_arcmin:8, efficiency:0.97,
    max_radial_load_N:810, max_axial_load_N:405, inertia_kgcm2:0.10, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PEIIR050-005', series:'PEIIR', type:'right-angle', frame:50, stage:1, ratio:5,
    rated_torque_Nm:15, peak_torque_Nm:27, emergency_torque_Nm:45, no_load_torque_Nm:0.10,
    nominal_input_speed_rpm:4500, max_input_speed_rpm:8000, backlash_arcmin:12, efficiency:0.93,
    max_radial_load_N:810, max_axial_load_N:405, inertia_kgcm2:0.18, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PGIIR160-020', series:'PGIIR', type:'right-angle', frame:160, stage:2, ratio:20,
    rated_torque_Nm:454, peak_torque_Nm:817.2, emergency_torque_Nm:1362, no_load_torque_Nm:0.85,
    nominal_input_speed_rpm:2500, max_input_speed_rpm:3600, backlash_arcmin:12, efficiency:0.90,
    max_radial_load_N:4690, max_axial_load_N:2345, inertia_kgcm2:2.18, inertia_estimated:true,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PGII060-007', series:'PGII', type:'inline', frame:60, stage:1, ratio:7,
    rated_torque_Nm:35, peak_torque_Nm:63, emergency_torque_Nm:105, no_load_torque_Nm:0.10,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:7, efficiency:0.97,
    max_radial_load_N:1030, max_axial_load_N:515, inertia_kgcm2:0.12, inertia_estimated:true,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PGIIR060-007', series:'PGIIR', type:'right-angle', frame:60, stage:1, ratio:7,
    rated_torque_Nm:35, peak_torque_Nm:63, emergency_torque_Nm:105, no_load_torque_Nm:0.15,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:11, efficiency:0.93,
    max_radial_load_N:1030, max_axial_load_N:515, inertia_kgcm2:0.36, inertia_estimated:true,
    weight_kg:null, service_life_hr:20000 },

  { pn:'PGIIR060-003', series:'PGIIR', type:'right-angle', frame:60, stage:1, ratio:3,
    rated_torque_Nm:42, peak_torque_Nm:75.6, emergency_torque_Nm:126, no_load_torque_Nm:0.15,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:6000, backlash_arcmin:11, efficiency:0.93,
    max_radial_load_N:1030, max_axial_load_N:515, inertia_kgcm2:0.36, inertia_estimated:true,
    weight_kg:null, service_life_hr:20000 },

  { pn:'ABR060-020-S2-P2', series:'ABR', type:'right-angle', frame:60, stage:1, ratio:20,
    rated_torque_Nm:40, peak_torque_Nm:72, emergency_torque_Nm:120, no_load_torque_Nm:null,
    nominal_input_speed_rpm:5000, max_input_speed_rpm:10000, backlash_arcmin:6, efficiency:0.95,
    max_radial_load_N:1530, max_axial_load_N:765, inertia_kgcm2:0.07, inertia_estimated:false,
    weight_kg:2.1, service_life_hr:20000 },

  { pn:'AB060-003-S2-P2', series:'AB', type:'inline', frame:60, stage:1, ratio:3,
    rated_torque_Nm:55, peak_torque_Nm:99, emergency_torque_Nm:165, no_load_torque_Nm:null,
    nominal_input_speed_rpm:5000, max_input_speed_rpm:10000, backlash_arcmin:5, efficiency:0.97,
    max_radial_load_N:1530, max_axial_load_N:765, inertia_kgcm2:0.16, inertia_estimated:false,
    weight_kg:1.3, service_life_hr:20000 },

  { pn:'AB090-030-S2-P2', series:'AB', type:'inline', frame:90, stage:2, ratio:30,
    rated_torque_Nm:150, peak_torque_Nm:270, emergency_torque_Nm:450, no_load_torque_Nm:null,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:8000, backlash_arcmin:7, efficiency:0.94,
    max_radial_load_N:3250, max_axial_load_N:1625, inertia_kgcm2:0.13, inertia_estimated:false,
    weight_kg:4.1, service_life_hr:20000 },

  { pn:'AER090-020', series:'AER', type:'right-angle', frame:90, stage:1, ratio:20,
    rated_torque_Nm:100, peak_torque_Nm:180, emergency_torque_Nm:300, no_load_torque_Nm:null,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:8000, backlash_arcmin:10, efficiency:0.95,
    max_radial_load_N:2985, max_axial_load_N:1625, inertia_kgcm2:1.87, inertia_estimated:false,
    weight_kg:5.8, service_life_hr:20000 },

  { pn:'AB115-003-S2-P2', series:'AB', type:'inline', frame:115, stage:1, ratio:3,
    rated_torque_Nm:208, peak_torque_Nm:374.4, emergency_torque_Nm:624, no_load_torque_Nm:null,
    nominal_input_speed_rpm:4000, max_input_speed_rpm:8000, backlash_arcmin:5, efficiency:0.97,
    max_radial_load_N:6700, max_axial_load_N:3350, inertia_kgcm2:3.25, inertia_estimated:false,
    weight_kg:7.8, service_life_hr:20000 },

  { pn:'PEII120-010', series:'PEII', type:'inline', frame:120, stage:1, ratio:10,
    rated_torque_Nm:155, peak_torque_Nm:279, emergency_torque_Nm:465, no_load_torque_Nm:0.80,
    nominal_input_speed_rpm:3600, max_input_speed_rpm:4800, backlash_arcmin:6, efficiency:0.97,
    max_radial_load_N:3260, max_axial_load_N:1630, inertia_kgcm2:0.36, inertia_estimated:false,
    weight_kg:null, service_life_hr:20000, bundled_motor:'1FK2105-6AF00-0' },
];

if (typeof module !== 'undefined' && module.exports) module.exports = { APEX_GEARBOX_DB };
