/* Headless integration test for the Siemens servo drive selector.
 * Run:  node scripts/test_drive_selection.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const bundle = [
  read('js/constants.js'),
  read('js/calculations.js'),
  read('data/siemens_drive_catalog.js'),
  read('js/drive-selection.js'),
  `
  var state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  state.steps = [{ label:'Move', stroke:300, move_time:0.8, dwell_time:0.4,
                   external_force:150, external_force_dir:'opposing',
                   load_mass:40, movement_dir:'against_gravity',
                   acceleration_time:0.15, deceleration_time:0.15 }];
  state.bs_pitch = 10; state.bs_dia = 15;
  var selectedMotorIdx = 12; // 1FK2104-6AF00 (kW 1.00, Mn 3.2, Mmax 10, Nn 3000)

  var base = calculate();
  var lastResult = base;
  var stateBefore = JSON.stringify(state);
  var out = selectDrive({ catalog: SIEMENS_DRIVE_DB, baseResult: base });
  var stateAfter = JSON.stringify(state);

  var results = [];
  function ok(label, cond){ results.push(cond); console.log('  ['+(cond?'PASS':'FAIL')+']  '+label); }

  console.log('Motor: '+out.motor.pn+' ('+out.motor.kW+' kW)');
  console.log('Required: rated >= '+out.shared.continuous_power_kW.toFixed(2)+' kW, peak >= '+out.shared.peak_power_kW.toFixed(2)+' kW\\n');
  console.log('Evaluated '+out.num_evaluated+' models, '+out.num_valid+' valid.');
  out.recommended.forEach(function(c){
    var u = c.utilization;
    function p(x){ return (x==null||!isFinite(x))?'—':Math.round(x)+'%'; }
    console.log('  #'+c.rank+' '+c.pn+'  ('+c.series+', '+c.rated_power_kW+' kW)  power util '+p(u.power_util)+' | peak util '+p(u.peak_util));
  });
  out.rejected.forEach(function(c){ console.log('   x '+c.pn+' — '+c.reject_reason); });

  console.log('');
  ok('selector ran and evaluated the full catalog', out.num_evaluated === SIEMENS_DRIVE_DB.length);
  ok('S200 drives are always rejected as wrong motor family', out.rejected.some(function(c){return c.series==='S200';}) &&
     out.recommended.every(function(c){return c.series==='S210';}));
  ok('every candidate carries a full rule trace', out.recommended.concat(out.rejected).every(function(c){return c.checks && c.checks.length>=3;}));
  ok('recommendations are ranked contiguously', out.recommended.every(function(c,i){return c.rank===i+1;}));
  ok('top pick is rated power >= motor kW', out.recommended.length===0 || out.recommended[0].rated_power_kW >= out.motor.kW - 1e-9);
  ok('no state mutation', stateBefore === stateAfter);

  var n = results.filter(Boolean).length;
  console.log('\\nRESULT: '+n+'/'+results.length+' checks passed'+(n===results.length?'  --  ALL PASS':'  --  SOME FAILED'));
  if (n !== results.length) { throw new Error('integration test failed'); }
  `,
].join('\n;\n');

const context = { console, JSON, Math, Number, Object, Array, Infinity, isFinite };
vm.createContext(context);
try {
  vm.runInContext(bundle, context, { filename: 'drive_selection_bundle.js' });
} catch (e) {
  console.error('FAILED:', e && e.message ? e.message : e);
  process.exit(1);
}
