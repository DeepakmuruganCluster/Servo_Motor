/* THK Ball Screw Catalog — global DB (mirrors the MOTOR_DB pattern in constants.js)
 * Units: length mm, force N. Seeded from THK manual en_b15_069 worked examples so the
 * selector is testable immediately. Extend by appending rows in the same shape.
 * Fields consumed by js/ballscrew-selection.js — see docs 05_database_schema.md.
 */
const THK_BALLSCREW_DB = [
  { pn:'WTF2040-2', series:'WTF', dia:20, lead:40, d1:17.5, D:20.75, nut_len:100,
    Ca:5400,  C0a:13600, grades:['C7','C8','C10'], clearance:0.10, preload_Nm:0,
    max_len:3000, inertia_per_len:1.23e-3, eff:0.9, kind:'rolled' },
  { pn:'WTF2040-3', series:'WTF', dia:20, lead:40, d1:17.5, D:20.75, nut_len:124,
    Ca:6600,  C0a:17200, grades:['C7','C8','C10'], clearance:0.10, preload_Nm:0,
    max_len:3000, inertia_per_len:1.23e-3, eff:0.9, kind:'rolled' },
  { pn:'WTF3060-2', series:'WTF', dia:30, lead:60, d1:26.4, D:31.25, nut_len:150,
    Ca:11800, C0a:30600, grades:['C7','C8','C10'], clearance:0.14, preload_Nm:0,
    max_len:3000, inertia_per_len:6.24e-3, eff:0.9, kind:'rolled' },
  { pn:'WTF3060-3', series:'WTF', dia:30, lead:60, d1:26.4, D:31.25, nut_len:186,
    Ca:14500, C0a:38900, grades:['C7','C8','C10'], clearance:0.14, preload_Nm:0,
    max_len:3000, inertia_per_len:6.24e-3, eff:0.9, kind:'rolled' },
  { pn:'BLK1510-5.6', series:'BLK', dia:15, lead:10, d1:12.5, D:15.75, nut_len:100,
    Ca:9800,  C0a:25200, grades:['C7','C8','C10'], clearance:0.10, preload_Nm:0,
    max_len:2000, inertia_per_len:3.9e-4, eff:0.9, kind:'rolled' },
];

if (typeof module !== 'undefined' && module.exports) module.exports = { THK_BALLSCREW_DB };
