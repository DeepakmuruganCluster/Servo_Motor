/* Headless integration test for the Apex gearbox selector.
 * Loads the REAL app files (constants.js + calculations.js), the catalog, and
 * gearbox-selection.js into one vm context, then runs a selection — proving the
 * selector drives the app's own calculate() and returns ranked part numbers.
 *
 * Run:  node scripts/test_gearbox_selection.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const bundle = [
  read('js/constants.js'),
  read('js/calculations.js'),
  read('data/apex_gearbox_catalog.js'),
  read('js/gearbox-selection.js'),
  `
  // Heavy, torque-limited move (gearboxes trade motor speed for torque reduction, so a
  // scenario needs enough load/pitch to make that trade worthwhile — a light, fast move
  // like the ball-screw test's default just raises Nmotor with every ratio and rejects all).
  var state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  state.steps = [{ label:'Move', stroke:300, move_time:3.0, dwell_time:0.4,
                   external_force:500, external_force_dir:'opposing',
                   load_mass:300, movement_dir:'against_gravity',
                   acceleration_time:0.5, deceleration_time:0.5 }];
  state.project_accuracy = 100;
  state.project_total_cycle = 4;
  state.project_service_life = 10;
  state.bs_pitch = 5; state.bs_dia = 15;
  var selectedMotorIdx = 0; // smallest motor — forces a gearbox to be worthwhile

  var base = calculate();
  var stateBefore = JSON.stringify(state);
  var out = selectGearbox({ catalog: APEX_GEARBOX_DB, baseResult: base });
  var stateAfter = JSON.stringify(state);

  var results = [];
  function ok(label, cond){ results.push(cond); console.log('  ['+(cond?'PASS':'FAIL')+']  '+label); }

  console.log('Servo baseline: T_peak_bs='+(base.T_peak_bs||0).toFixed(3)+' Nm, T_bs_load='+(base.T_bs_load||0).toFixed(3)+
              ' Nm, Nmotor(direct)='+(base.Nmotor||0).toFixed(0)+' rpm');
  console.log('Evaluated '+out.num_evaluated+' models, '+out.num_valid+' valid.\\n');
  out.recommended.forEach(function(c){
    var u = c.utilization;
    function p(x){ return (x==null||!isFinite(x))?'—':Math.round(x)+'%'; }
    console.log('  #'+c.rank+' '+c.pn+'  ('+c.series+' '+c.ratio+':1)  '+
      'output torque util '+p(u.output_torque_util)+' | motor torque util '+p(u.motor_torque_util)+
      ' | motor speed util '+p(u.motor_speed_util)+' | accuracy util '+p(u.accuracy_util));
  });
  out.rejected.slice(0, 5).forEach(function(c){ console.log('   x '+c.pn+' — '+c.reject_reason); });

  console.log('');
  ok('selector ran and evaluated the full catalog', out.num_evaluated === APEX_GEARBOX_DB.length);
  ok('every candidate carries a full rule trace', out.recommended.concat(out.rejected).every(function(c){return c.checks && c.checks.length>=3;}));
  ok('recommendations are ranked contiguously', out.recommended.every(function(c,i){return c.rank===i+1;}));
  ok('selector drove the app calculate() per candidate (Nmotor metric present)', out.recommended.every(function(c){return typeof c.metrics.Nmotor === 'number';}));
  ok('global state restored after selection (no mutation)', stateBefore === stateAfter);
  var out2 = selectGearbox({ catalog: APEX_GEARBOX_DB, baseResult: base });
  ok('result is deterministic', JSON.stringify(out.recommended.map(function(c){return c.pn;})) === JSON.stringify(out2.recommended.map(function(c){return c.pn;})));

  var passCount = results.filter(Boolean).length;
  console.log('\\nRESULT: '+passCount+'/'+results.length+' checks passed'+(passCount===results.length?'  --  ALL PASS':'  --  SOME FAILED'));
  if (passCount !== results.length) { throw new Error('integration test failed'); }
  `,
].join('\n;\n');

const context = { console, JSON, Math, Number, Object, Array, Infinity, isFinite, parseInt, parseFloat, Date };
vm.createContext(context);
try {
  vm.runInContext(bundle, context, { filename: 'gearbox_integration_bundle.js' });
} catch (e) {
  console.error('FAILED:', e && e.message ? e.message : e);
  process.exit(1);
}
