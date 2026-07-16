/* Siemens Servo Drive Selection — runs AFTER the servo module, same reporting style as
 * js/ballscrew-selection.js and js/gearbox-selection.js, but a simpler architecture: drive
 * choice doesn't feed back into the servo physics (no candidate re-run of calculate()), so this
 * just ranks SIEMENS_DRIVE_DB against the CURRENTLY SELECTED motor's requirements.
 *
 * Depends on globals: state, lastResult, calculate(), MOTOR_DB, selectedMotorIdx
 * (constants.js + calculations.js + servo-app.js) and SIEMENS_DRIVE_DB
 * (data/siemens_drive_catalog.js). Load this file AFTER calculations.js.
 *
 * Selection basis: Siemens pairs S210 drives 1:1 with SIMOTICS S-1FK2 motors (the motor family
 * in MOTOR_DB) — S200 drives in the same MLFB family pair with the different S-1FL2 motor line
 * and are NOT a valid substitute here, so they're always rejected with an explicit reason rather
 * than silently ranked. Sizing is power-class matching (drive rated_power_kW >= motor's rated kW,
 * smallest sufficient preferred) PLUS a real current check: MOTOR_DB carries each 1FK2 motor's
 * rated/max current (In/Imax, sourced from Siemens' own datasheets) and this is checked directly
 * against the candidate drive's rated_current_A/max_current_A — not just a power-derived proxy.
 *
 * Hard rule: a drive's input supply phase count (cand.input_phases) must exactly match the
 * motor's rated supply phase count (motor.phases, in MOTOR_DB) — single-phase motors only pair
 * with single-phase (1AC) drives, three-phase motors only pair with three-phase (3AC) drives.
 * No exceptions, no warning-only path: a mismatch is a hard reject (see 'supply_phase' check in
 * evaluate()). Every motor currently in MOTOR_DB is phases:3 (Siemens publishes 1FK2 rated data
 * for 3AC 400V only), so this eliminates all 1AC drives from recommendation today.
 *
 * Auto-sync: js/servo-app.js's render() keeps state.sd_applied_pn synced to the top-ranked
 * recommendation on every render until the designer explicitly overrides it via "Use this drive"
 * (which sets sd_user_selected = true and stops the auto-sync), same pattern as the ball screw
 * and gearbox selectors.
 */
(function (global) {
  'use strict';

  var CFG = { topN: 5 };

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function deriveRequirements(base) {
    var motor = (typeof selectedMotorIdx !== 'undefined' && selectedMotorIdx >= 0 && typeof MOTOR_DB !== 'undefined')
      ? MOTOR_DB[selectedMotorIdx]
      : (base.selectedMotor || null);
    if (!motor) return { motor: null };
    var peak_power_kW = (base.T_peak_motor || 0) * (base.Nmotor || 0) * 2 * Math.PI / 60 / 1000;
    return { motor: motor, continuous_power_kW: motor.kW, peak_power_kW: peak_power_kW };
  }

  function evaluate(cand, req) {
    var checks = [];
    var reject = null;
    function add(rule, pass, value, limit, reason) {
      checks.push({ rule: rule, passed: pass, value: value, limit: limit, reason: reason });
      if (!pass && reject === null) reject = rule + ': ' + reason;
    }

    add('motor_family', cand.series === 'S210', cand.series, 'S210',
        cand.series === 'S210' ? 'S210 is the drive family paired with SIMOTICS S-1FK2 motors'
                                : 'S200 pairs with SIMOTICS S-1FL2 motors, not the 1FK2 motors used in this app');

    // Hard rule: a drive's input supply phase count must match the motor's rated supply phase
    // count. Single-phase (1AC) drives only pair with single-phase-rated motors; three-phase
    // (3AC) drives only pair with three-phase-rated motors — no mixing, no exceptions.
    var motorPhases = req.motor.phases;
    if (motorPhases != null) {
      add('supply_phase', cand.input_phases === motorPhases, cand.input_phases + 'AC', motorPhases + 'AC',
          cand.input_phases === motorPhases ? 'drive supply phase matches the motor\'s rated supply phase'
              : 'motor is rated for ' + motorPhases + 'AC supply only — a ' + cand.input_phases + 'AC drive is not a valid match');
    }

    add('rated_power', cand.rated_power_kW >= req.continuous_power_kW, cand.rated_power_kW, req.continuous_power_kW,
        cand.rated_power_kW >= req.continuous_power_kW ? 'rated power covers the motor\'s rated power'
                                                         : 'motor rated power exceeds drive rated power');

    var drivePeakKW = cand.rated_power_kW * (cand.max_current_A / cand.rated_current_A);
    add('peak_power', drivePeakKW >= req.peak_power_kW, drivePeakKW, req.peak_power_kW,
        drivePeakKW >= req.peak_power_kW ? 'peak power capability covers required peak load'
                                          : 'required peak load exceeds drive peak power capability');

    // Real current check — motor.In/Imax come from Siemens' own SIMOTICS S-1FK2 datasheets
    // (constants.js), so this verifies actual current capability, not just a power-class proxy.
    var motorIn = req.motor.In, motorImax = req.motor.Imax;
    if (motorIn != null && motorImax != null) {
      add('rated_current', cand.rated_current_A >= motorIn, cand.rated_current_A, motorIn,
          cand.rated_current_A >= motorIn ? 'drive rated current covers the motor\'s rated current'
                                           : 'motor rated current exceeds drive rated current');
      add('max_current', cand.max_current_A >= motorImax, cand.max_current_A, motorImax,
          cand.max_current_A >= motorImax ? 'drive max current covers the motor\'s max current'
                                           : 'motor max current exceeds drive max current');
    }

    var utilization = {
      power_util: cand.rated_power_kW > 0 ? req.continuous_power_kW / cand.rated_power_kW * 100 : null,
      peak_util: drivePeakKW > 0 ? req.peak_power_kW / drivePeakKW * 100 : null,
      current_util: (motorIn != null && cand.rated_current_A > 0) ? motorIn / cand.rated_current_A * 100 : null,
      peak_current_util: (motorImax != null && cand.max_current_A > 0) ? motorImax / cand.max_current_A * 100 : null,
    };

    return {
      pn: cand.pn, series: cand.series, input_phases: cand.input_phases, line_voltage: cand.line_voltage,
      frame_size: cand.frame_size, weight_kg: cand.weight_kg,
      rated_power_kW: cand.rated_power_kW, rated_current_A: cand.rated_current_A, max_current_A: cand.max_current_A,
      rejected: reject !== null, reject_reason: reject || '',
      metrics: { drive_peak_kW: drivePeakKW, motor_In: motorIn, motor_Imax: motorImax },
      utilization: utilization,
      checks: checks,
    };
  }

  function rank(valid) {
    valid.forEach(function (c) {
      var u = isFinite(c.utilization.peak_util) ? c.utilization.peak_util : 100;
      var headroomBonus = (100 - u) * 0.001;
      c._score = c.rated_power_kW - headroomBonus; // smallest sufficient drive preferred
    });
    valid.sort(function (a, b) { return a._score - b._score; });
  }

  function bindingHint(all) {
    var counts = {};
    all.forEach(function (c) {
      var first = c.checks.filter(function (k) { return !k.passed; })[0];
      if (first) counts[first.rule] = (counts[first.rule] || 0) + 1;
    });
    var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
    return top ? ('Most common binding constraint: ' + top) : null;
  }

  function selectDrive(opts) {
    opts = opts || {};
    var catalog = opts.catalog || SIEMENS_DRIVE_DB || [];
    var base = opts.baseResult || lastResult || calculate();
    if (opts.config) Object.keys(opts.config).forEach(function (k) { CFG[k] = opts.config[k]; });

    var req = deriveRequirements(base);
    if (!req.motor) {
      return { motor: null, shared: {}, recommended: [], rejected: [], num_valid: 0, num_evaluated: 0, no_candidate_hint: null };
    }
    var all = catalog.map(function (cand) { return evaluate(cand, req); });
    var valid = all.filter(function (c) { return !c.rejected; });
    rank(valid);
    valid.forEach(function (c, i) { c.rank = i + 1; });

    return {
      motor: req.motor,
      shared: { continuous_power_kW: req.continuous_power_kW, peak_power_kW: req.peak_power_kW },
      recommended: valid.slice(0, CFG.topN),
      rejected: all.filter(function (c) { return c.rejected; }),
      num_valid: valid.length, num_evaluated: all.length,
      no_candidate_hint: valid.length === 0 ? bindingHint(all) : null,
    };
  }

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById('sd-select-styles')) return;
    var s = document.createElement('style');
    s.id = 'sd-select-styles';
    s.textContent =
      '.sd-selection h3{margin:0 0 6px;font-size:18px;letter-spacing:.01em;}' +
      '.sd-selection>.sd-sub{color:#6b7280;font-size:13px;margin:0 0 18px;}' +
      '.sd-table{width:100%;border-collapse:collapse;font-size:13px;}' +
      '.sd-table th,.sd-table td{padding:8px 10px;text-align:left;border-bottom:1px solid #eef0f3;}' +
      '.sd-table th{color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.03em;}' +
      '.sd-table .sd-sub{margin:0;font-size:12px;}' +
      '.sd-row{cursor:pointer;}' +
      '.sd-row:hover{background:#f9fafb;}' +
      '.sd-row-active{background:#f5f8ff;}' +
      '.sd-empty{color:#9ca3af;font-size:13px;padding:12px 0;}' +
      '.sd-rejected{margin-top:10px;}' +
      '.sd-rejected summary{cursor:pointer;color:#6b7280;font-size:12px;user-select:none;}' +
      '.sd-rejected summary:hover{color:#374151;}' +
      '.sd-rejected .sd-table{margin-top:8px;}' +
      '.sd-rejected td{color:#9ca3af;}' +
      '.sd-rejected td.sd-reason{color:#b45309;}';
    document.head.appendChild(s);
  }

  var selectedPn = null;

  function renderDriveSelection(target) {
    injectStyles();
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;
    var out = selectDrive();
    if (!out.motor) {
      el.innerHTML = '<h3>Recommended Servo Drives</h3><div class="sd-empty">Select a motor first — drive selection matches the currently selected motor\'s rated and peak power.</div>';
      return;
    }
    var rejectedHtml = renderRejected(out.rejected);
    if (!out.recommended.length) {
      el.innerHTML = '<h3>Recommended Servo Drives</h3><div class="sd-empty">No Siemens drive satisfies the constraints for ' + escapeHtml(out.motor.pn) + '.' +
        (out.no_candidate_hint ? ' ' + out.no_candidate_hint : '') + '</div>' + rejectedHtml;
      return;
    }
    var active = out.recommended.filter(function (c) { return c.pn === selectedPn; })[0] ||
      out.recommended.filter(isCandidateApplied)[0] || out.recommended[0];
    var rows = out.recommended.map(function (c) {
      var u = c.utilization;
      function pct(x) { return x == null || !isFinite(x) ? '—' : Math.round(x) + '%'; }
      var inStock = (typeof inInventory === 'function') && inInventory(c.pn, 'drive');
      var stockBadge = inStock ? ' <span class="badge badge-stock" title="In your inventory">✓ In Stock</span>' : '';
      return '<tr class="sd-row' + (c.pn === active.pn ? ' sd-row-active' : '') + '" data-pn="' + escapeHtml(c.pn) + '">' +
        '<td>#' + c.rank + '</td>' +
        '<td><strong>' + c.pn + '</strong>' + stockBadge + '<br><span class="sd-sub">' + c.series + '</span></td>' +
        '<td><strong>' + c.input_phases + 'AC</strong><br><span class="sd-sub">' + c.line_voltage + '</span></td>' +
        '<td>' + c.rated_power_kW.toFixed(2) + ' kW</td>' +
        '<td>' + pct(u.power_util) + '</td>' +
        '<td>' + pct(u.peak_util) + '</td>' +
        '<td>' + c.rated_current_A.toFixed(1) + ' A</td>' +
        '<td>' + c.max_current_A.toFixed(1) + ' A</td>' +
        '<td>' + c.frame_size + '</td>' +
        '</tr>';
    }).join('');
    el.innerHTML =
      '<h3>Recommended Servo Drives</h3>' +
      '<div class="sd-sub">For motor <strong>' + escapeHtml(out.motor.pn) + '</strong> (rated for ' + out.motor.phases + 'AC supply) — requires ≥ ' +
      out.shared.continuous_power_kW.toFixed(2) + ' kW rated, ≥ ' + out.shared.peak_power_kW.toFixed(2) +
      ' kW peak · only drives with matching supply phase count are shown · columns show utilization (click a row to inspect it)</div>' +
      '<table class="sd-table"><thead><tr>' +
      '<th></th><th>Part No.</th><th>Supply</th><th>Rated Power</th><th>Power Util.</th><th>Peak Util.</th><th>Rated Current</th><th>Max Current</th><th>Frame</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      renderChecklist(active, out.shared, out.motor) +
      rejectedHtml;

    el.querySelectorAll('.sd-row').forEach(function (tr) {
      tr.addEventListener('click', function () {
        selectedPn = tr.getAttribute('data-pn');
        renderDriveSelection(el);
      });
    });
    var applyBtn = el.querySelector('.sd-apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        applyDriveSelection(active.pn);
        renderDriveSelection(el);
      });
    }
  }

  /* Drives don't feed the servo physics (no state field a drive choice maps onto), so "apply"
     just persists the chosen part number as an explicit pick, distinct from the default
     top-ranked recommendation — mirrors ball screw / gearbox apply UX for consistency. */
  function applyDriveSelection(pn) {
    state.sd_applied_pn = pn;
    state.sd_user_selected = true;
    if (typeof saveState === 'function') saveState();
    if (typeof render === 'function') render();
  }

  function isCandidateApplied(c) {
    return !!state.sd_applied_pn && c.pn === state.sd_applied_pn;
  }

  /* Public: the explicitly applied drive (if any and still valid for the current motor),
     falling back to the top-ranked recommendation. Used by the Selected Components summary /
     report export. */
  function getAppliedDrive() {
    var out = selectDrive();
    return out.recommended.filter(isCandidateApplied)[0] || null;
  }

  function renderChecklist(c, shared, motor) {
    var u = c.utilization;
    var applied = isCandidateApplied(c);
    function fmtUtil(x) { return x == null || !isFinite(x) ? '—' : Math.round(x) + '%'; }
    function badge(ok) {
      if (ok === null) return '<span class="badge badge-warn">—</span>';
      return ok ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-fail">NOK</span>';
    }
    var rows = [
      { label: 'Supply phase', capacity: c.input_phases + 'AC, ' + c.line_voltage, actual: motor.phases + 'AC (rated)',
        u: null, ok: c.input_phases === motor.phases },
      { label: 'Rated power, kW', capacity: c.rated_power_kW.toFixed(2), actual: shared.continuous_power_kW.toFixed(2),
        u: u.power_util, ok: shared.continuous_power_kW <= c.rated_power_kW },
      { label: 'Peak power, kW', capacity: c.metrics.drive_peak_kW.toFixed(2), actual: shared.peak_power_kW.toFixed(2),
        u: u.peak_util, ok: shared.peak_power_kW <= c.metrics.drive_peak_kW },
      { label: 'Rated current, A', capacity: c.rated_current_A.toFixed(1),
        actual: c.metrics.motor_In != null ? c.metrics.motor_In.toFixed(1) : '—',
        u: u.current_util, ok: c.metrics.motor_In != null ? c.metrics.motor_In <= c.rated_current_A : null },
      { label: 'Max current, A', capacity: c.max_current_A.toFixed(1),
        actual: c.metrics.motor_Imax != null ? c.metrics.motor_Imax.toFixed(1) : '—',
        u: u.peak_current_util, ok: c.metrics.motor_Imax != null ? c.metrics.motor_Imax <= c.max_current_A : null },
    ];
    var body = rows.map(function (r) {
      return '<tr><td>' + r.label + '</td><td class="mono">' + r.capacity + '</td>' +
        '<td class="mono">' + r.actual + '</td><td class="mono">' + fmtUtil(r.u) + '</td>' +
        '<td>' + badge(r.ok) + '</td></tr>';
    }).join('');
    var headerRight = applied
      ? '<span class="badge badge-selected">Applied — this is the confirmed Servo Drive pick</span>'
      : '<button type="button" class="sd-apply-btn button secondary" style="padding:4px 10px;font-size:12px;">Use this drive</button>' +
        '<span class="sd-sub" style="margin:4px 0 0;">Preview only — not yet confirmed as the applied drive pick.</span>';
    return '<div class="subsection-divider">' +
      '<h4 class="subsection-heading">Selection Checklist — #' + c.rank + ' ' + escapeHtml(c.pn) + '</h4>' +
      '<div style="text-align:right;">' + headerRight + '</div></div>' +
      '<table class="checklist" style="margin-top:14px;"><thead><tr>' +
      '<th>Parameter</th><th>Capacity / Selected</th><th>Actual / Required</th><th>Utilization</th><th>Result</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderRejected(rejected) {
    if (!rejected.length) return '';
    var rows = rejected.map(function (c) {
      return '<tr>' +
        '<td><strong>' + escapeHtml(c.pn) + '</strong><br><span class="sd-sub">' + c.series + ' · ' + c.rated_power_kW.toFixed(2) + ' kW</span></td>' +
        '<td class="sd-reason">' + escapeHtml(c.reject_reason) + '</td>' +
        '</tr>';
    }).join('');
    return '<details class="sd-rejected">' +
      '<summary>' + rejected.length + ' model(s) rejected — click to view reasons</summary>' +
      '<table class="sd-table"><thead><tr><th>Part No.</th><th>Reason</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</details>';
  }

  /* Public: the explicitly applied drive if one has been picked and is still valid for the
     currently selected motor, otherwise falls back to the top-ranked recommendation. Used by
     the Selected Components summary / report export. */
  function getRecommendedDrive() {
    var out = selectDrive();
    return out.recommended.filter(isCandidateApplied)[0] || out.recommended[0] || null;
  }

  global.selectDrive = selectDrive;
  global.renderDriveSelection = renderDriveSelection;
  global.getRecommendedDrive = getRecommendedDrive;
  global.getAppliedDrive = getAppliedDrive;
  global.SD_SELECT_CONFIG = CFG;
  if (typeof module !== 'undefined' && module.exports) module.exports = { selectDrive: selectDrive, CFG: CFG };

})(typeof window !== 'undefined' ? window : globalThis);
