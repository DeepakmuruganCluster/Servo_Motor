/* Headless integration test for the THK ball screw selector.
 * Loads the REAL app files (constants.js + calculations.js), the catalog, and
 * ballscrew-selection.js into one vm context, then runs a selection — proving the
 * selector drives the app's own calculate() and returns ranked part numbers.
 *
 * Run:  node scripts/test_ballscrew_selection.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const bundle = [
  read('js/constants.js'),
  read('js/calculations.js'),
  read('data/thk_ballscrew_catalog.js'),
  read('js/ballscrew-selection.js'),
  // ---- test driver (same script scope: sees state, MOTOR_DB, calculate, etc.) ----
  `
  // configure an axis (uses DEFAULT_STATE, tweaked to a real move)
  var state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  state.steps = [{ label:'Move', stroke:300, move_time:0.8, dwell_time:0.4,
                   external_force:150, external_force_dir:'opposing',
                   load_mass:40, movement_dir:'against_gravity',
                   acceleration_time:0.15, deceleration_time:0.15 }];
  state.project_accuracy = 100;       // µm positioning accuracy over stroke
  state.project_total_cycle = 3;      // s
  state.project_service_life = 10;    // years
  var selectedMotorIdx = 12;          // 1FK2104-6AF00 (Mn 3.2, Mmax 10, Nn 3000)

  var base = calculate();                        // servo baseline (normalizes state)
  var stateBefore = JSON.stringify(state);       // capture AFTER baseline, BEFORE selection
  var out = selectBallScrew({ catalog: THK_BALLSCREW_DB, baseResult: base });
  var stateAfter = JSON.stringify(state);

  var results = [];
  function ok(label, cond){ results.push(cond); console.log('  ['+(cond?'PASS':'FAIL')+'] '+label); }

  console.log('Servo baseline: Vmax='+ (base.Vmax_mm_s||0).toFixed(0) +' mm/s, '+
              'peak axial='+ (base.axial_force||0).toFixed(0) +' N, '+
              'Nscrew='+ (base.Nscrew||0).toFixed(0) +' rpm, '+
              'peak torque='+ (base.T_peak_motor||0).toFixed(3) +' Nm');
  console.log('Required lead >= '+ out.shared.required_lead_min_mm.toFixed(2) +' mm, '+
              'life target '+ Math.round(out.shared.required_life_hours) +' h\\n');
  console.log('Evaluated '+ out.num_evaluated +' models, '+ out.num_valid +' valid.');
  out.recommended.forEach(function(c){
    var u = c.utilization;
    function p(x){ return (x==null||!isFinite(x))?'—':Math.round(x)+'%'; }
    console.log('  #'+c.rank+' '+c.pn+'  (Ø'+c.dia+'/lead'+c.lead+')  '+
      'safety util '+p(u.safety_util)+' | life util '+p(u.life_util)+' | torque util '+p(u.torque_util)+
      ' | speed util '+p(u.speed_util)+' | accuracy util '+p(u.accuracy_util));
  });
  out.rejected.forEach(function(c){ console.log('   x '+c.pn+' — '+c.reject_reason); });

  console.log('');
  ok('selector ran and evaluated the full catalog', out.num_evaluated === THK_BALLSCREW_DB.length);
  ok('every candidate carries a full rule trace', out.recommended.concat(out.rejected).every(function(c){return c.checks && c.checks.length>=6;}));
  ok('recommendations are ranked contiguously', out.recommended.every(function(c,i){return c.rank===i+1;}));
  ok('selector drove the app calculate() per candidate (torque metric present)',
     out.recommended.concat(out.rejected).every(function(c){return typeof c.metrics.T_peak_motor==='number';}));
  ok('global state restored after selection (no mutation)', stateBefore === stateAfter);
  ok('result is deterministic', JSON.stringify(selectBallScrew({catalog:THK_BALLSCREW_DB,baseResult:base}).recommended.map(function(c){return c.pn;})) ===
                                 JSON.stringify(out.recommended.map(function(c){return c.pn;})));

  var n = results.filter(Boolean).length;
  console.log('\\nRESULT: '+n+'/'+results.length+' checks passed'+(n===results.length?'  --  ALL PASS':'  --  SOME FAILED'));
  if (n !== results.length) { throw new Error('integration test failed'); }
  `
].join('\n;\n');

const context = { console, JSON, Math, Number, Object, Array, Infinity, isFinite, parseInt, parseFloat, Date };
vm.createContext(context);
try {
  vm.runInContext(bundle, context, { filename: 'bs_integration_bundle.js' });
} catch (e) {
  console.error('FAILED:', e && e.message ? e.message : e);
  process.exit(1);
}
