/* Siemens SINAMICS Servo Drive Catalog — global DB (mirrors the APEX_GEARBOX_DB /
 * THK_BALLSCREW_DB pattern). Units: power kW, current A. Sourced from official Siemens
 * TED (Technical Equipment Data) datasheets, fetched per article number from
 * mall.industry.siemens.com's docuservice endpoint — same source Siemens' own Industry Mall
 * product pages link to.
 *
 * Two product families are represented:
 *   S210 (MLFB 6SL3210-... and its successor numbering 6SL5310-...) — single-axis PROFINET
 *        servo drive, the standard pairing for SIMOTICS S-1FK2 motors (the MOTOR_DB in
 *        constants.js). This is what "1FK2xxx" motors in this app are designed to run on.
 *   S200 (MLFB 6SL5510-...) — a separate, simpler single-axis Power Module product line.
 *
 * Fields:
 *   pn                  MLFB order number
 *   series              'S210' | 'S200'
 *   input_phases        1 or 3 (AC)
 *   line_voltage        supply voltage range as published
 *   rated_power_kW      continuous rated output power (at the datasheet's rated line voltage)
 *   rated_current_A     rated output current IN
 *   max_current_A       max. (peak/overload) output current
 *   frame_size          FSA / FSB / FSC — mounting/physical size class
 *   weight_kg
 *   communication       'PROFINET' for all parts in this list
 *
 * Selection basis: Siemens pairs S210/S200 drives to SIMOTICS S-1FK2 motors by matching
 * RATED POWER (kW) — this is how Siemens' own catalogs and motor+drive+gearbox bundle part
 * numbers (see the "bundled_motor" fields in apex_gearbox_catalog.js) present valid
 * combinations. MOTOR_DB (constants.js) does not carry rated/peak current data for the 1FK2
 * motors, so a true current-based check isn't possible here — js/drive-selection.js uses
 * power-class matching (drive rated_power_kW >= motor kW) plus an estimated peak-power check
 * (scaling rated power by the drive's own max/rated current ratio) as a secondary, quantitative
 * headroom check. This is a simplification flagged the same way nut_len/inertia estimates were
 * flagged in the other two catalogs.
 */
const SIEMENS_DRIVE_DB = [
  { pn:'6SL3210-5HE10-4UF0', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:0.40, rated_current_A:1.2, max_current_A:4.2, frame_size:'FSA', weight_kg:2.10,
    communication:'PROFINET' },

  { pn:'6SL3210-5HE10-8UF0', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:0.75, rated_current_A:2.3, max_current_A:7.6, frame_size:'FSA', weight_kg:2.10,
    communication:'PROFINET' },

  { pn:'6SL3210-5HE11-5UF0', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:1.50, rated_current_A:5.0, max_current_A:19.0, frame_size:'FSB', weight_kg:3.30,
    communication:'PROFINET' },

  { pn:'6SL3210-5HE12-0UF0', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:2.00, rated_current_A:7.0, max_current_A:24.0, frame_size:'FSB', weight_kg:3.30,
    communication:'PROFINET' },

  { pn:'6SL3210-5HB10-4UF0', series:'S210', input_phases:1, line_voltage:'200...240 V ±10%',
    rated_power_kW:0.40, rated_current_A:2.4, max_current_A:8.7, frame_size:'FSB', weight_kg:1.30,
    communication:'PROFINET' },

  { pn:'6SL5510-1BE10-8AF0', series:'S200', input_phases:3, line_voltage:'380...480 V +10%',
    rated_power_kW:0.75, rated_current_A:2.5, max_current_A:9.3, frame_size:'FSB', weight_kg:2.00,
    communication:'PROFINET' },

  { pn:'6SL5510-1BE10-4AF0', series:'S200', input_phases:3, line_voltage:'380...480 V +10%',
    rated_power_kW:0.40, rated_current_A:1.3, max_current_A:6.0, frame_size:'FSA', weight_kg:1.00,
    communication:'PROFINET' },

  { pn:'6SL5510-1BE10-2AF0', series:'S200', input_phases:3, line_voltage:'380...480 V +10%',
    rated_power_kW:0.20, rated_current_A:1.3, max_current_A:5.1, frame_size:'FSA', weight_kg:1.00,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE10-4DF0', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:0.40, rated_current_A:1.2, max_current_A:4.2, frame_size:'FSA', weight_kg:2.10,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE11-0DF0', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:1.00, rated_current_A:3.0, max_current_A:10.9, frame_size:'FSA', weight_kg:2.10,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE10-8DF0', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:0.75, rated_current_A:2.3, max_current_A:7.6, frame_size:'FSA', weight_kg:2.10,
    communication:'PROFINET' },

  { pn:'6SL5310-1BB10-2CF0', series:'S210', input_phases:1, line_voltage:'200...240 V ±10%',
    rated_power_kW:0.20, rated_current_A:1.4, max_current_A:4.8, frame_size:'FSA', weight_kg:1.10,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE13-5DF0', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:3.50, rated_current_A:9.0, max_current_A:33.0, frame_size:'FSC', weight_kg:5.00,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE10-4DF1', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:0.40, rated_current_A:1.2, max_current_A:4.2, frame_size:'FSA', weight_kg:2.10,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE10-8DF1', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:0.75, rated_current_A:2.3, max_current_A:7.6, frame_size:'FSA', weight_kg:2.10,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE11-5DF1', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:1.50, rated_current_A:5.0, max_current_A:19.0, frame_size:'FSB', weight_kg:3.30,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE12-0DF1', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:2.00, rated_current_A:7.0, max_current_A:24.0, frame_size:'FSB', weight_kg:3.30,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE13-5DF1', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:3.50, rated_current_A:9.0, max_current_A:33.0, frame_size:'FSC', weight_kg:5.00,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE17-0DF1', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:7.00, rated_current_A:15.0, max_current_A:55.0, frame_size:'FSC', weight_kg:5.00,
    communication:'PROFINET' },

  { pn:'6SL5310-1BE15-0DF1', series:'S210', input_phases:3, line_voltage:'200...480 V ±10%',
    rated_power_kW:5.00, rated_current_A:12.0, max_current_A:44.0, frame_size:'FSC', weight_kg:5.00,
    communication:'PROFINET' },
];

if (typeof module !== 'undefined' && module.exports) module.exports = { SIEMENS_DRIVE_DB };
