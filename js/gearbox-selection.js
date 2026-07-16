/* Apex Gearbox Selection — runs AFTER the servo module, same architecture as
 * js/ballscrew-selection.js: drives each CANDIDATE gearbox through the app's own calculate()
 * (headless, no DOM) so torque/speed/inertia checks stay consistent with the servo module, then
 * layers Apex's catalog-only checks on top (output peak/rated torque, gearbox input speed limit).
 *
 * Depends on globals: state, calculate(), MOTOR_DB, selectedMotorIdx (from constants.js +
 * calculations.js + servo-app.js) and APEX_GEARBOX_DB (data/apex_gearbox_catalog.js).
 * Load this file AFTER calculations.js.
 *
 * Key physics fact this relies on: the ball-screw-side torque (T_peak_bs, T_bs_load) does NOT
 * depend on gearbox ratio — gb_ratio only affects the MOTOR-side reflection (T_peak_motor,
 * Nmotor, inertia_ratio). So the gearbox's own output-torque capacity check uses the base
 * (pre-candidate) servo result directly, while motor-side checks re-run calculate() per candidate.
 */
(function (global) {
  'use strict';

  var CFG = {
    topN: 5,
  };

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // Run the app's own calculate() with candidate gearbox overrides, then restore state.
  function servoWithCandidate(cand) {
    var snap = JSON.parse(JSON.stringify(state));
    var overrides = {
      has_gearbox: 1,
      gb_ratio: cand.ratio,
      gb_efficiency: cand.efficiency,
      gb_no_load_torque: cand.no_load_torque_Nm || 0,
      gb_inertia: cand.inertia_kgcm2 * 1e-4, // kg.cm^2 -> kg.m^2
      gb_backlash: cand.backlash_arcmin,
    };
    Object.keys(overrides).forEach(function (k) { state[k] = overrides[k]; });
    var r;
    try { r = calculate(); }
    finally {
      Object.keys(state).forEach(function (k) { if (!(k in snap)) delete state[k]; });
      Object.keys(snap).forEach(function (k) { state[k] = snap[k]; });
    }
    return r;
  }

  // Direct-drive (no gearbox) baseline, regardless of whatever gearbox is currently configured —
  // this is what motor the load would need with the motor coupled straight to the ball screw.
  function directDriveResult() {
    var snap = JSON.parse(JSON.stringify(state));
    state.has_gearbox = 0;
    var r;
    try { r = calculate(); }
    finally {
      Object.keys(state).forEach(function (k) { if (!(k in snap)) delete state[k]; });
      Object.keys(snap).forEach(function (k) { state[k] = snap[k]; });
    }
    return r;
  }

  function bestMotorFor(result) {
    if (typeof suggestBestMotor !== 'function') return null;
    var best = suggestBestMotor(result);
    return best ? { motor: best.motor, viable: best.viable } : null;
  }

  function deriveRequirements(st, base) {
    var motor = (typeof selectedMotorIdx !== 'undefined' && selectedMotorIdx >= 0 && typeof MOTOR_DB !== 'undefined')
      ? MOTOR_DB[selectedMotorIdx]
      : (base.selectedMotor || null);
    // Output-side (ball-screw shaft) torque requirement — independent of gearbox ratio.
    var T_bs_peak = base.T_peak_bs || 0;
    var T_bs_rated = base.T_bs_load || 0;
    // System accuracy budget excluding the gearbox's own backlash contribution (added per candidate).
    var bs_acc = Number(st.bs_repetition_accuracy) || 10; // micron
    var motor_mm = st.bs_pitch > 0 ? st.bs_pitch / (Number(st.sm_encoder_ppr) || 1048576) : 0;
    var motor_acc = motor_mm / 2 * 1000; // micron
    var posAcc_um = Number(st.project_accuracy) || 0;
    // Duty-cycle hours, same derivation as ballscrew-selection.js, for an informational life comparison
    // against Apex's flat 20,000 h S5-cycle rating (planetary gearboxes don't have a cubic load-life curve).
    var hoursPerYear = (Number(st.project_shifts) || 0) * (Number(st.project_hours_shift) || 0)
                     * (Number(st.project_days_week) || 0) * 52;
    var reqLifeH = (Number(st.project_service_life) || 0) * hoursPerYear;
    var direct = directDriveResult();
    var directMotor = bestMotorFor(direct);
    return { motor: motor, T_bs_peak: T_bs_peak, T_bs_rated: T_bs_rated,
             bs_acc: bs_acc, motor_acc: motor_acc, posAcc_um: posAcc_um, reqLifeH: reqLifeH,
             direct_T_peak_motor: direct.T_peak_motor, direct_Nmotor: direct.Nmotor, direct_motor: directMotor };
  }

  function evaluate(cand, st, req) {
    var checks = [];
    var reject = null;
    function add(rule, pass, value, limit, reason) {
      checks.push({ rule: rule, passed: pass, value: value, limit: limit, reason: reason });
      if (!pass && reject === null) reject = rule + ': ' + reason;
    }

    add('output_peak_torque', cand.peak_torque_Nm >= req.T_bs_peak, cand.peak_torque_Nm, req.T_bs_peak,
        cand.peak_torque_Nm >= req.T_bs_peak ? 'peak output torque rating covers required peak load'
                                              : 'required peak load exceeds gearbox peak output torque rating');
    add('output_rated_torque', cand.rated_torque_Nm >= req.T_bs_rated, cand.rated_torque_Nm, req.T_bs_rated,
        cand.rated_torque_Nm >= req.T_bs_rated ? 'nominal output torque covers steady-state load'
                                                : 'steady-state load exceeds gearbox nominal output torque rating');

    var r = servoWithCandidate(cand);
    var motor = req.motor;
    add('gearbox_input_speed', r.Nmotor <= cand.max_input_speed_rpm, r.Nmotor, cand.max_input_speed_rpm,
        r.Nmotor <= cand.max_input_speed_rpm ? 'motor speed within gearbox max input speed'
                                              : 'motor speed exceeds gearbox max input speed rating');
    if (motor) {
      add('motor_speed', r.Nmotor <= motor.Nn, r.Nmotor, motor.Nn,
          r.Nmotor <= motor.Nn ? 'motor speed within rated speed' : 'required motor speed exceeds motor rated speed');
      var motorPeakLimit = motor.Mmax || motor.Mn;
      add('motor_peak_torque', r.T_peak_motor <= motorPeakLimit, r.T_peak_motor, motorPeakLimit,
          r.T_peak_motor <= motorPeakLimit ? 'motor peak torque covers this ratio' : 'required peak torque exceeds motor limit');
    }
    add('inertia_match', r.inertia_ratio !== null ? r.inertia_ratio <= st.sm_permitted_inertia_ratio : true,
        r.inertia_ratio, st.sm_permitted_inertia_ratio,
        (r.inertia_ratio === null || r.inertia_ratio <= st.sm_permitted_inertia_ratio)
          ? 'inertia ratio within permitted range' : 'reflected inertia ratio exceeds permitted');

    var gb_deg = cand.backlash_arcmin / 60;
    var gb_acc_um = st.bs_pitch > 0 ? (gb_deg / 360 * st.bs_pitch) / 2 * 1000 : 0;
    var pos_error_um = req.bs_acc + req.motor_acc + gb_acc_um;
    if (req.posAcc_um > 0) {
      add('positioning_accuracy', pos_error_um <= req.posAcc_um, pos_error_um, req.posAcc_um,
          pos_error_um <= req.posAcc_um ? 'system accuracy within requirement' : 'system accuracy exceeds requirement');
    }

    var utilization = {
      output_torque_util: cand.peak_torque_Nm > 0 ? req.T_bs_peak / cand.peak_torque_Nm * 100 : null,
      motor_torque_util: motor ? r.T_peak_motor / (motor.Mmax || motor.Mn) * 100 : null,
      motor_speed_util: motor ? r.Nmotor / motor.Nn * 100 : null,
      gearbox_speed_util: cand.max_input_speed_rpm > 0 ? r.Nmotor / cand.max_input_speed_rpm * 100 : null,
      accuracy_util: req.posAcc_um > 0 ? pos_error_um / req.posAcc_um * 100 : null,
    };

    // Motor sizing — does adding this gearbox let a smaller/cheaper motor be used vs direct drive?
    var candidateMotor = bestMotorFor(r);
    var torqueReductionPct = req.direct_T_peak_motor > 0
      ? (req.direct_T_peak_motor - r.T_peak_motor) / req.direct_T_peak_motor * 100 : 0;
    var motorSizing = {
      direct_motor: req.direct_motor, candidate_motor: candidateMotor,
      torque_reduction_pct: torqueReductionPct,
      smaller_motor: !!(req.direct_motor && candidateMotor
        && candidateMotor.motor.kW < req.direct_motor.motor.kW),
    };

    return {
      pn: cand.pn, series: cand.series, type: cand.type, frame: cand.frame, stage: cand.stage, ratio: cand.ratio,
      backlash_arcmin: cand.backlash_arcmin, efficiency: cand.efficiency,
      no_load_torque_Nm: cand.no_load_torque_Nm, inertia_kgcm2: cand.inertia_kgcm2,
      rejected: reject !== null, reject_reason: reject || '',
      metrics: { Nmotor: r.Nmotor, T_peak_motor: r.T_peak_motor, T_rms_motor: r.T_rms_motor,
                 inertia_ratio: r.inertia_ratio, pos_error_um: pos_error_um,
                 output_peak_capacity: cand.peak_torque_Nm, output_rated_capacity: cand.rated_torque_Nm,
                 input_speed_cap: cand.max_input_speed_rpm },
      utilization: utilization,
      motor_sizing: motorSizing,
      checks: checks,
    };
  }

  function rank(valid) {
    valid.forEach(function (c) {
      var compact = 2 * c.frame + c.ratio * 0.5 + c.stage * 20;
      var u = isFinite(c.utilization.output_torque_util) ? c.utilization.output_torque_util : 100;
      var headroomBonus = (100 - u) * 0.001; // small tie-break toward more torque headroom
      c._score = compact - headroomBonus;
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

  /* Public: run selection. Pass an existing result to avoid recomputing the baseline. */
  function selectGearbox(opts) {
    opts = opts || {};
    var st = opts.state || state;
    var catalog = opts.catalog || APEX_GEARBOX_DB || [];
    var base = opts.baseResult || lastResult || calculate();
    if (opts.config) Object.keys(opts.config).forEach(function (k) { CFG[k] = opts.config[k]; });

    var req = deriveRequirements(st, base);
    var all = catalog.map(function (cand) { return evaluate(cand, st, req); });
    var valid = all.filter(function (c) { return !c.rejected; });
    rank(valid);
    valid.forEach(function (c, i) { c.rank = i + 1; });

    return {
      shared: { required_peak_torque_Nm: req.T_bs_peak, required_rated_torque_Nm: req.T_bs_rated,
                positioning_accuracy_um: req.posAcc_um, required_life_hours: req.reqLifeH,
                direct_T_peak_motor: req.direct_T_peak_motor, direct_motor: req.direct_motor },
      recommended: valid.slice(0, CFG.topN),
      rejected: all.filter(function (c) { return c.rejected; }),
      num_valid: valid.length, num_evaluated: all.length,
      no_candidate_hint: valid.length === 0 ? bindingHint(all) : null,
      motor: req.motor,
    };
  }

  /* Public: render Top-5 into a DOM container (id or element). */
  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById('gb-select-styles')) return;
    var s = document.createElement('style');
    s.id = 'gb-select-styles';
    s.textContent =
      '.gb-selection h3{margin:0 0 6px;font-size:18px;letter-spacing:.01em;}' +
      '.gb-selection>.gb-sub{color:#6b7280;font-size:13px;margin:0 0 18px;}' +
      '.gb-table{width:100%;border-collapse:collapse;font-size:13px;}' +
      '.gb-table th,.gb-table td{padding:8px 10px;text-align:left;border-bottom:1px solid #eef0f3;}' +
      '.gb-table th{color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.03em;}' +
      '.gb-table .gb-sub{margin:0;font-size:12px;}' +
      '.gb-row{cursor:pointer;}' +
      '.gb-row:hover{background:#f9fafb;}' +
      '.gb-row-active{background:#f5f8ff;}' +
      '.gb-empty{color:#9ca3af;font-size:13px;padding:12px 0;}' +
      '.gb-rejected{margin-top:10px;}' +
      '.gb-rejected summary{cursor:pointer;color:#6b7280;font-size:12px;user-select:none;}' +
      '.gb-rejected summary:hover{color:#374151;}' +
      '.gb-rejected .gb-table{margin-top:8px;}' +
      '.gb-rejected td{color:#9ca3af;}' +
      '.gb-rejected td.gb-reason{color:#b45309;}';
    document.head.appendChild(s);
  }

  var selectedPn = null;

  function renderGearboxSelection(target) {
    injectStyles();
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;
    var out = selectGearbox();
    var rejectedHtml = renderRejected(out.rejected);
    if (!out.recommended.length) {
      el.innerHTML = '<div class="gb-empty">No Apex gearbox satisfies the constraints.' +
        (out.no_candidate_hint ? ' ' + out.no_candidate_hint : '') + '</div>' + rejectedHtml;
      return;
    }
    var active = out.recommended.filter(function (c) { return c.pn === selectedPn; })[0] || out.recommended[0];
    var rows = out.recommended.map(function (c) {
      var u = c.utilization;
      var ms = c.motor_sizing;
      function pct(x) { return x == null || !isFinite(x) ? '—' : Math.round(x) + '%'; }
      var motorSizeCell = ms.candidate_motor
        ? ms.candidate_motor.motor.pn + ' (' + ms.candidate_motor.motor.kW.toFixed(2) + ' kW)' +
          (ms.smaller_motor ? '<br><span class="gb-sub" style="color:#166534;">&#8595; ' + Math.round(ms.torque_reduction_pct) + '% smaller than direct drive</span>' : '')
        : '—';
      var inStock = (typeof inInventory === 'function') && inInventory(c.pn, 'gearbox');
      var stockBadge = inStock ? ' <span class="badge badge-stock" title="In your inventory">✓ In Stock</span>' : '';
      return '<tr class="gb-row' + (c.pn === active.pn ? ' gb-row-active' : '') + '" data-pn="' + escapeHtml(c.pn) + '">' +
        '<td>#' + c.rank + '</td>' +
        '<td><strong>' + c.pn + '</strong>' + stockBadge + '<br><span class="gb-sub">' + c.series + ' · ' + c.type + ' · ' + c.ratio + ':1</span></td>' +
        '<td>' + pct(u.output_torque_util) + '</td>' +
        '<td>' + pct(u.motor_torque_util) + '</td>' +
        '<td>' + pct(u.motor_speed_util) + '</td>' +
        '<td>' + pct(u.accuracy_util) + '</td>' +
        '<td>' + motorSizeCell + '</td>' +
        '</tr>';
    }).join('');
    var directNote = out.shared.direct_motor
      ? '<div class="gb-sub">Direct drive (no gearbox) would need <strong>' + out.shared.direct_motor.motor.pn +
        '</strong> (' + out.shared.direct_motor.motor.kW.toFixed(2) + ' kW, ' + out.shared.direct_T_peak_motor.toFixed(2) + ' Nm peak).</div>'
      : '';
    el.innerHTML =
      '<h3>Recommended Apex Gearboxes</h3>' +
      '<div class="gb-sub">Required peak output torque ≥ ' + out.shared.required_peak_torque_Nm.toFixed(1) +
      ' Nm · rated ≥ ' + out.shared.required_rated_torque_Nm.toFixed(1) +
      ' Nm · columns show utilization (% of capacity used — click a row to inspect it)</div>' +
      directNote +
      '<table class="gb-table"><thead><tr>' +
      '<th></th><th>Part No.</th><th>Output Torque</th><th>Motor Torque</th><th>Motor Speed</th><th>Accuracy</th><th>Motor Size</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      renderChecklist(active, out.shared, out.motor) +
      rejectedHtml;

    el.querySelectorAll('.gb-row').forEach(function (tr) {
      tr.addEventListener('click', function () {
        selectedPn = tr.getAttribute('data-pn');
        renderGearboxSelection(el);
      });
    });
    var applyBtn = el.querySelector('.gb-apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        applyGearboxSelection(active.pn);
      });
    }
  }

  /* Write the candidate's ratio/efficiency/inertia/backlash into the main Gearbox Inputs. Looks
     up the RAW catalog entry (APEX_GEARBOX_DB) rather than an evaluate()-returned candidate,
     which nests max_input_speed_rpm/rated_torque_Nm under metrics.input_speed_cap /
     metrics.output_rated_capacity instead of exposing them directly — so callers must always go
     through here (or applyGearboxFields for the no-render() variant) rather than copying fields
     off a ranked/recommended object directly. Returns false if pn isn't a real catalog part. */
  function applyGearboxFields(pn) {
    var cand = APEX_GEARBOX_DB.filter(function (c) { return c.pn === pn; })[0];
    if (!cand) return false;
    state.has_gearbox = 1;
    state.gb_ratio = cand.ratio;
    state.gb_efficiency = cand.efficiency;
    state.gb_no_load_torque = cand.no_load_torque_Nm || 0;
    state.gb_inertia = cand.inertia_kgcm2 * 1e-4;
    state.gb_backlash = cand.backlash_arcmin;
    // Feeds the main Verification Checklist's GearBox rows (state.gb_rated_input_speed /
    // gb_rated_output_torque have no dedicated input field — they're wish-list capacity numbers
    // otherwise only reachable via Excel import — so the checklist shows #DIV/0! until a
    // catalog gearbox is applied here).
    state.gb_rated_input_speed = cand.max_input_speed_rpm;
    state.gb_rated_output_torque = cand.rated_torque_Nm;
    return true;
  }

  /* Same as applyGearboxFields but also marks this as an explicit user choice and triggers a full
     re-render — used by the "Use this gearbox" button. render()'s own auto-sync (which runs on
     every render until gb_ratio_user_selected is set) calls applyGearboxFields directly to avoid
     re-entering render() from inside itself. */
  function applyGearboxSelection(pn) {
    if (!applyGearboxFields(pn)) return;
    state.gb_ratio_user_selected = true;
    if (typeof saveState === 'function') saveState();
    if (typeof renderInputs === 'function') renderInputs();
    if (typeof render === 'function') render();
  }

  function isCandidateApplied(c) {
    return Number(state.has_gearbox) !== 0
      && Math.abs(Number(state.gb_ratio) - c.ratio) < 1e-6
      && String(state.gb_backlash) === String(c.backlash_arcmin);
  }

  /* Public: which catalog gearbox (if any) matches the currently configured gb_ratio/gb_backlash —
     used by the Selected Components summary / report export. */
  function getAppliedGearbox() {
    if (Number(state.has_gearbox) === 0) return null;
    var db = (typeof APEX_GEARBOX_DB !== 'undefined') ? APEX_GEARBOX_DB : [];
    return db.filter(isCandidateApplied)[0] || null;
  }

  function renderChecklist(c, shared, motor) {
    var m = c.metrics;
    var u = c.utilization;
    var applied = isCandidateApplied(c);
    function fmtUtil(x) { return x == null || !isFinite(x) ? '—' : Math.round(x) + '%'; }
    function badge(ok) {
      if (ok === null) return '<span class="badge badge-warn">—</span>';
      return ok ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-fail">NOK</span>';
    }
    var rows = [
      { label: 'Peak output torque, Nm', capacity: m.output_peak_capacity.toFixed(1), actual: shared.required_peak_torque_Nm.toFixed(1),
        u: u.output_torque_util, ok: shared.required_peak_torque_Nm <= m.output_peak_capacity },
      { label: 'Rated output torque, Nm', capacity: m.output_rated_capacity.toFixed(1), actual: shared.required_rated_torque_Nm.toFixed(1),
        u: m.output_rated_capacity > 0 ? shared.required_rated_torque_Nm / m.output_rated_capacity * 100 : null,
        ok: shared.required_rated_torque_Nm <= m.output_rated_capacity },
      { label: 'Motor peak torque, Nm', capacity: motor ? (motor.Mmax || motor.Mn).toFixed(2) : '—',
        actual: m.T_peak_motor != null ? m.T_peak_motor.toFixed(2) : '—',
        u: u.motor_torque_util, ok: motor ? m.T_peak_motor <= (motor.Mmax || motor.Mn) : null },
      { label: 'Motor / gearbox input speed, rpm', capacity: Math.round(Math.min(motor ? motor.Nn : Infinity, m.input_speed_cap)).toLocaleString(),
        actual: Math.round(m.Nmotor).toLocaleString(),
        u: u.motor_speed_util, ok: motor ? m.Nmotor <= motor.Nn && m.Nmotor <= m.input_speed_cap : m.Nmotor <= m.input_speed_cap },
      { label: 'System accuracy, µm', capacity: shared.positioning_accuracy_um.toFixed(1),
        actual: m.pos_error_um.toFixed(1),
        u: u.accuracy_util, ok: m.pos_error_um <= shared.positioning_accuracy_um },
    ];
    var body = rows.map(function (r) {
      return '<tr><td>' + r.label + '</td><td class="mono">' + r.capacity + '</td>' +
        '<td class="mono">' + r.actual + '</td><td class="mono">' + fmtUtil(r.u) + '</td>' +
        '<td>' + badge(r.ok) + '</td></tr>';
    }).join('');
    var headerRight = applied
      ? '<span class="badge badge-selected">Applied to Gearbox Inputs — matches Primary Results</span>'
      : '<button type="button" class="gb-apply-btn button secondary" style="padding:4px 10px;font-size:12px;">Use this gearbox</button>' +
        '<span class="gb-sub" style="margin:4px 0 0;">Preview only — Primary Results still reflect the manually entered gearbox until applied.</span>';
    var ms = c.motor_sizing;
    var motorSizingNote = '';
    if (ms.direct_motor && ms.candidate_motor) {
      motorSizingNote = ms.smaller_motor
        ? '<div class="gb-sub" style="color:#166534;margin:0 0 10px;">&#10003; ' + Math.round(ms.torque_reduction_pct) + '% torque reduction vs direct drive — ' +
          '<strong>' + ms.candidate_motor.motor.pn + '</strong> (' + ms.candidate_motor.motor.kW.toFixed(2) + ' kW) suffices instead of ' +
          '<strong>' + ms.direct_motor.motor.pn + '</strong> (' + ms.direct_motor.motor.kW.toFixed(2) + ' kW) for direct drive.</div>'
        : '<div class="gb-sub" style="margin:0 0 10px;">Best-fit motor with this gearbox is the same size as direct drive (' +
          ms.candidate_motor.motor.pn + ', ' + ms.candidate_motor.motor.kW.toFixed(2) + ' kW) — this ratio doesn\'t enable a smaller motor.</div>';
    }
    return '<div class="subsection-divider">' +
      '<h4 class="subsection-heading">Selection Checklist — #' + c.rank + ' ' + escapeHtml(c.pn) + '</h4>' +
      '<div style="text-align:right;">' + headerRight + '</div></div>' +
      (motorSizingNote ? '<div style="margin-top:10px;">' + motorSizingNote + '</div>' : '') +
      '<table class="checklist" style="margin-top:14px;"><thead><tr>' +
      '<th>Parameter</th><th>Capacity / Selected</th><th>Actual / Required</th><th>Utilization</th><th>Result</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderRejected(rejected) {
    if (!rejected.length) return '';
    var rows = rejected.map(function (c) {
      return '<tr>' +
        '<td><strong>' + escapeHtml(c.pn) + '</strong><br><span class="gb-sub">' + c.series + ' · ' + c.ratio + ':1</span></td>' +
        '<td class="gb-reason">' + escapeHtml(c.reject_reason) + '</td>' +
        '</tr>';
    }).join('');
    return '<details class="gb-rejected">' +
      '<summary>' + rejected.length + ' model(s) rejected — click to view reasons</summary>' +
      '<table class="gb-table"><thead><tr><th>Part No.</th><th>Reason</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</details>';
  }

  global.selectGearbox = selectGearbox;
  global.renderGearboxSelection = renderGearboxSelection;
  global.getAppliedGearbox = getAppliedGearbox;
  global.applyGearboxFields = applyGearboxFields;
  global.GB_SELECT_CONFIG = CFG;
  if (typeof module !== 'undefined' && module.exports) module.exports = { selectGearbox: selectGearbox, CFG: CFG };

})(typeof window !== 'undefined' ? window : globalThis);
