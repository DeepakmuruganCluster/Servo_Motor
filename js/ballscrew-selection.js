/* THK Ball Screw Selection — runs AFTER the servo module.
 *
 * Design: instead of duplicating the servo physics, this module drives each
 * CANDIDATE ball screw through the app's existing calculate() (headless, no DOM)
 * so torque / speed / inertia checks stay perfectly consistent with the servo
 * module, then layers the THK catalog-only checks on top (static load, critical
 * speed, DN value, dynamic life, positioning accuracy, backlash).
 *
 * Depends on globals: state, calculate(), MOTOR_DB, selectedMotorIdx (from
 * constants.js + calculations.js + servo-app.js) and THK_BALLSCREW_DB
 * (data/thk_ballscrew_catalog.js). Load this file AFTER calculations.js.
 *
 * Buckling is intentionally excluded per project scope.
 */
(function (global) {
  'use strict';

  var CFG = {
    fs: 2.0,                 // static safety factor (2.5-3.0 for impact)
    fw: 1.5,                 // load factor
    dnConstant: 70000,
    criticalSpeedDerate: 0.8, // usable critical speed = 80% of theoretical Nc, standard margin for whirl safety
    criticalSpeedFactor: { 'fixed-free': 3.4, 'supported-supported': 9.7,
                           'fixed-supported': 15.1, 'fixed-fixed': 21.9 },
    supportMethod: 'fixed-supported',
    thermalCoeff: 12e-6,     // steel, per °C
    tempRiseC: 5,
    nutLenAllow: 100,        // shaft-length estimate: nut allowance (mm)
    shaftEndAllow: 100,      // shaft-length estimate: journals (mm)
    mountMargin: 100,        // ell_b = shaft_len - margin (mm)
    gradeError: { C0:0.0035, C1:0.006, C3:0.012, C5:0.018, C7:0.05, C8:0.10, C10:0.21 },
    topN: 5,
  };

  function bestGradeError(cand) {
    var grades = cand.grades && cand.grades.length ? cand.grades : ['C7'];
    return Math.min.apply(null, grades.map(function (g) {
      return CFG.gradeError[g] != null ? CFG.gradeError[g] : 0.05;
    }));
  }

  // Run the app's own calculate() with candidate screw geometry, then restore state.
  function servoWithCandidate(cand, reqLen) {
    var snap = JSON.parse(JSON.stringify(state));
    var overrides = {
      bs_pitch: cand.lead,
      bs_dia: cand.dia,
      bs_length: reqLen,
      bs_efficiency: cand.eff,
      bs_preload_torque: cand.preload_Nm || 0,
      bs_type: 'custom',
    };
    Object.keys(overrides).forEach(function (k) { state[k] = overrides[k]; });
    var r;
    try { r = calculate(); }
    finally {
      // restore state in place (calculate() also mutates via normalizeState)
      Object.keys(state).forEach(function (k) { if (!(k in snap)) delete state[k]; });
      Object.keys(snap).forEach(function (k) { state[k] = snap[k]; });
    }
    return r;
  }

  function deriveRequirements(st, base) {
    var Vmax = (base.Vmax_mm_s || 0) / 1000;                 // m/s
    // Read the live global selection rather than base.selectedMotor: render() calls
    // renderBallScrewSelection() before its own auto-motor-sync block runs, so the
    // baseResult snapshot can still have selectedMotor=null even though a motor is set.
    var motor = (typeof selectedMotorIdx !== 'undefined' && selectedMotorIdx >= 0 && typeof MOTOR_DB !== 'undefined')
      ? MOTOR_DB[selectedMotorIdx]
      : (base.selectedMotor || null);
    var Nrated = motor ? motor.Nn : (Number(st.bs_max_speed) || 3000);
    var Ph_min = Nrated > 0 ? Vmax * 60 * 1000 / Nrated : 0; // F1
    var maxStroke = Math.max.apply(null, (st.steps || []).map(function (s) { return Number(s.stroke) || 0; }).concat([0]));
    var reqLen = maxStroke + CFG.nutLenAllow + CFG.shaftEndAllow;
    var posAcc_mm = (Number(st.project_accuracy) || 0) / 1000;  // µm -> mm
    var Fa_max = base.axial_force || 0;                          // N (already computed by servo)
    // duty -> required life hours
    var hoursPerYear = (Number(st.project_shifts) || 0) * (Number(st.project_hours_shift) || 0)
                     * (Number(st.project_days_week) || 0) * 52;
    var reqLifeH = (Number(st.project_service_life) || 0) * hoursPerYear;
    // revolutions per hour from duty (two-way travel per cycle)
    var travelPerCycle = (st.steps || []).reduce(function (a, s) { return a + 2 * (Number(s.stroke) || 0); }, 0);
    var cycleTime = Math.max(0.1, Number(st.project_total_cycle) || 0.1);
    return { Vmax: Vmax, motor: motor, Nrated: Nrated, Ph_min: Ph_min, maxStroke: maxStroke,
             reqLen: reqLen, posAcc_mm: posAcc_mm, Fa_max: Fa_max, reqLifeH: reqLifeH,
             travelPerCycle: travelPerCycle, cycleTime: cycleTime };
  }

  function evaluate(cand, st, req) {
    var checks = [];
    var reject = null;
    function add(rule, pass, value, limit, reason) {
      checks.push({ rule: rule, passed: pass, value: value, limit: limit, reason: reason });
      if (!pass && reject === null) reject = rule + ': ' + reason;
    }

    var Nscrew = cand.lead > 0 ? req.Vmax * 60 * 1000 / cand.lead : 0;    // rpm at Vmax
    var ell_b = req.reqLen - CFG.mountMargin;
    var lam = CFG.criticalSpeedFactor[CFG.supportMethod];

    // --- THK catalog checks ---
    add('lead', cand.lead >= req.Ph_min - 1e-9, cand.lead, req.Ph_min,
        cand.lead >= req.Ph_min ? 'lead reaches Vmax at rated speed' : 'lead too short: Vmax needs speed above motor rating');
    add('length', req.reqLen <= cand.max_len, req.reqLen, cand.max_len,
        req.reqLen <= cand.max_len ? 'shaft length within manufacturable range' : 'required shaft length exceeds model maximum');
    var faPerm = cand.C0a / CFG.fs;
    add('axial_load', faPerm >= req.Fa_max, faPerm, req.Fa_max,
        faPerm >= req.Fa_max ? 'permissible static load exceeds peak axial load' : 'peak axial load exceeds permissible static load');
    var N1_theoretical = lam * cand.d1 / (ell_b * ell_b) * 1e7;
    var N1 = N1_theoretical * CFG.criticalSpeedDerate; // derated usable limit
    add('critical_speed', Nscrew <= N1, N1, Nscrew,
        Nscrew <= N1 ? 'operating speed below ' + Math.round(CFG.criticalSpeedDerate * 100) + '% of critical (whirl) speed'
                      : 'operating speed exceeds ' + Math.round(CFG.criticalSpeedDerate * 100) + '% of critical speed of shaft');
    var N2 = CFG.dnConstant / cand.D;
    add('dn_value', Nscrew <= N2, N2, Nscrew,
        Nscrew <= N2 ? 'operating speed within DN limit' : 'operating speed exceeds DN-value limit');
    var bsMax = Number(st.bs_max_speed) || N2;
    add('bs_max_speed', Nscrew <= bsMax, bsMax, Nscrew,
        Nscrew <= bsMax ? 'within configured max screw speed' : 'operating speed exceeds configured max screw speed');
    var speedCap = Math.min(N1, N2, bsMax);

    // dynamic life (Fam ~ Fa_max, conservative)
    var Fam = req.Fa_max;
    var L10 = Fam > 0 ? Math.pow(cand.Ca / (CFG.fw * Fam), 3) * 1e6 : Infinity;   // rev
    var revsPerHour = req.cycleTime > 0 ? (req.travelPerCycle / cand.lead) * (3600 / req.cycleTime) : 0;
    var Lh = revsPerHour > 0 ? L10 / revsPerHour : Infinity;
    add('dynamic_life', Lh >= req.reqLifeH, Lh, req.reqLifeH,
        Lh >= req.reqLifeH ? 'service life meets requirement' : 'service life below requirement');

    // positioning accuracy (F18)
    var pErr = bestGradeError(cand) / 300 * req.maxStroke + CFG.thermalCoeff * CFG.tempRiseC * req.maxStroke;
    if (req.posAcc_mm > 0) {
      add('positioning_accuracy', pErr <= req.posAcc_mm, pErr, req.posAcc_mm,
          pErr <= req.posAcc_mm ? 'positioning error within requirement' : 'positioning error exceeds requirement');
    }

    // --- servo consistency checks via the app's own calculate() ---
    var r = servoWithCandidate(cand, req.reqLen);
    var motor = req.motor;
    if (r.checks) {
      add('motor_speed', r.checks.speed !== false, r.Nmotor, motor ? motor.Nn : 0,
          r.checks.speed !== false ? 'motor speed sufficient for this lead' : 'required motor speed exceeds motor limit');
      // Compare against Mmax (peak/instantaneous rating) directly rather than reusing
      // calculate()'s checks.torque flag, which tests against Mn (continuous rated torque)
      // — that flag is for the app's own duty-cycle motor check, not a peak-torque limit.
      var motorPeakLimit = motor ? (motor.Mmax || motor.Mn) : 0;
      add('peak_torque', motor ? r.T_peak_motor <= motorPeakLimit : true, r.T_peak_motor, motorPeakLimit,
          !motor || r.T_peak_motor <= motorPeakLimit ? 'motor peak torque covers this lead' : 'required peak torque exceeds motor limit');
      add('inertia_match', r.checks.inertia !== false, r.inertia_ratio, st.sm_permitted_inertia_ratio,
          r.checks.inertia !== false ? 'inertia ratio within permitted range' : 'reflected inertia ratio exceeds permitted');
      add('accel_limit', r.checks.ball_screw_accel !== false, r.amax, 5,
          r.checks.ball_screw_accel !== false ? 'acceleration within screw limit' : 'acceleration exceeds screw limit');
    }

    // Utilization = actual/capacity, bounded 0-100% for any passing candidate — easier to
    // read than an unbounded excess-margin percentage, and matches the app's own Verification
    // Checklist convention (Capacity/Selected vs Actual/Required -> Utilization).
    var utilization = {
      safety_util: faPerm > 0 ? req.Fa_max / faPerm * 100 : null,
      life_util: isFinite(Lh) && Lh > 0 ? req.reqLifeH / Lh * 100 : 0,
      torque_util: motor ? r.T_peak_motor / motorPeakLimit * 100 : null,
      speed_util: speedCap > 0 ? Nscrew / speedCap * 100 : null,
      accuracy_util: req.posAcc_mm > 0 ? pErr / req.posAcc_mm * 100 : null,
    };

    return {
      pn: cand.pn, series: cand.series, dia: cand.dia, lead: cand.lead, nut_len: cand.nut_len,
      rejected: reject !== null, reject_reason: reject || '',
      metrics: { Nscrew: Nscrew, N1: N1, N1_theoretical: N1_theoretical, N2: N2, speedCap: speedCap,
                 Lh: Lh, L10: L10, T_peak_motor: r.T_peak_motor, T_rms_motor: r.T_rms_motor,
                 inertia_ratio: r.inertia_ratio, pos_error_mm: pErr, Fa_perm: faPerm },
      utilization: utilization,
      checks: checks,
    };
  }

  function rank(valid) {
    valid.forEach(function (c) {
      var compact = 2 * c.dia + c.lead + 0.2 * c.nut_len;
      var lifeUtil = isFinite(c.utilization.life_util) ? c.utilization.life_util : 100;
      var lifeBonus = (100 - lifeUtil) * 0.001; // small tie-break toward more life headroom
      c._score = compact - lifeBonus;
    });
    valid.sort(function (a, b) {
      if (a._score !== b._score) return a._score - b._score;
      return (b.metrics.Lh || 0) - (a.metrics.Lh || 0);
    });
  }

  /* Public: run selection. Pass an existing result to avoid recomputing the baseline. */
  function selectBallScrew(opts) {
    opts = opts || {};
    var st = opts.state || state;
    var catalog = opts.catalog || THK_BALLSCREW_DB || [];
    var base = opts.baseResult || lastResult || calculate();
    if (opts.config) Object.keys(opts.config).forEach(function (k) { CFG[k] = opts.config[k]; });

    var req = deriveRequirements(st, base);
    var all = catalog.map(function (cand) { return evaluate(cand, st, req); });
    var valid = all.filter(function (c) { return !c.rejected; });
    rank(valid);
    valid.forEach(function (c, i) { c.rank = i + 1; });

    return {
      shared: { required_lead_min_mm: req.Ph_min, Fa_max_N: req.Fa_max,
                required_life_hours: req.reqLifeH, shaft_length_mm: req.reqLen,
                max_stroke_mm: req.maxStroke, positioning_accuracy_mm: req.posAcc_mm },
      recommended: valid.slice(0, CFG.topN),
      rejected: all.filter(function (c) { return c.rejected; }),
      num_valid: valid.length, num_evaluated: all.length,
      no_candidate_hint: valid.length === 0 ? bindingHint(all) : null,
      motor: req.motor,
    };
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

  /* Public: render Top-5 into a DOM container (id or element). */
  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById('bs-select-styles')) return;
    var s = document.createElement('style');
    s.id = 'bs-select-styles';
    s.textContent =
      '.bs-selection h3{margin:0 0 6px;font-size:18px;letter-spacing:.01em;}' +
      '.bs-selection>.bs-sub{color:#6b7280;font-size:13px;margin:0 0 18px;}' +
      '.bs-table{width:100%;border-collapse:collapse;font-size:13px;}' +
      '.bs-table th,.bs-table td{padding:8px 10px;text-align:left;border-bottom:1px solid #eef0f3;}' +
      '.bs-table th{color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.03em;}' +
      '.bs-table .bs-sub{margin:0;font-size:12px;}' +
      '.bs-row{cursor:pointer;}' +
      '.bs-row:hover{background:#f9fafb;}' +
      '.bs-row-active{background:#f5f8ff;}' +
      '.bs-empty{color:#9ca3af;font-size:13px;padding:12px 0;}' +
      '.bs-rejected{margin-top:10px;}' +
      '.bs-rejected summary{cursor:pointer;color:#6b7280;font-size:12px;user-select:none;}' +
      '.bs-rejected summary:hover{color:#374151;}' +
      '.bs-rejected .bs-table{margin-top:8px;}' +
      '.bs-rejected td{color:#9ca3af;}' +
      '.bs-rejected td.bs-reason{color:#b45309;}';
    document.head.appendChild(s);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // Which recommended candidate's checklist is shown; persists across re-renders (input changes)
  // so the designer's choice sticks until the candidate list changes shape.
  var selectedPn = null;

  function renderBallScrewSelection(target) {
    injectStyles();
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;
    var out = selectBallScrew();
    var rejectedHtml = renderRejected(out.rejected);
    if (!out.recommended.length) {
      el.innerHTML = '<div class="bs-empty">No THK ball screw satisfies the constraints.' +
        (out.no_candidate_hint ? ' ' + out.no_candidate_hint : '') + '</div>' + rejectedHtml;
      return;
    }
    var active = out.recommended.filter(function (c) { return c.pn === selectedPn; })[0] || out.recommended[0];
    var rows = out.recommended.map(function (c) {
      var u = c.utilization;
      function pct(x) { return x == null || !isFinite(x) ? '—' : Math.round(x) + '%'; }
      var inStock = (typeof inInventory === 'function') && inInventory(c.pn, 'ballscrew');
      var stockBadge = inStock ? ' <span class="badge badge-stock" title="In your inventory">✓ In Stock</span>' : '';
      return '<tr class="bs-row' + (c.pn === active.pn ? ' bs-row-active' : '') + '" data-pn="' + escapeHtml(c.pn) + '">' +
        '<td>#' + c.rank + '</td>' +
        '<td><strong>' + c.pn + '</strong>' + stockBadge + '<br><span class="bs-sub">Ø' + c.dia + ' / lead ' + c.lead + '</span></td>' +
        '<td>' + pct(u.safety_util) + '</td>' +
        '<td>' + pct(u.life_util) + '</td>' +
        '<td>' + pct(u.torque_util) + '</td>' +
        '<td>' + pct(u.speed_util) + '</td>' +
        '<td>' + pct(u.accuracy_util) + '</td>' +
        '</tr>';
    }).join('');
    el.innerHTML =
      '<h3>Recommended THK Ball Screws</h3>' +
      '<div class="bs-sub">Required lead ≥ ' + out.shared.required_lead_min_mm.toFixed(1) +
      ' mm · peak axial ' + Math.round(out.shared.Fa_max_N) + ' N · life target ' +
      Math.round(out.shared.required_life_hours).toLocaleString() +
      ' h · columns show utilization (% of capacity used — click a row to inspect it)</div>' +
      '<table class="bs-table"><thead><tr>' +
      '<th></th><th>Part No.</th><th>Safety</th><th>Life</th><th>Torque</th><th>Speed</th><th>Accuracy</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      renderChecklist(active, out.shared, out.motor) +
      rejectedHtml;

    el.querySelectorAll('.bs-row').forEach(function (tr) {
      tr.addEventListener('click', function () {
        selectedPn = tr.getAttribute('data-pn');
        renderBallScrewSelection(el);
      });
    });
    var applyBtn = el.querySelector('.bs-apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        applyBallScrewSelection(active.pn);
      });
    }
  }

  /* Write the candidate's geometry into the main Ball Screw Inputs (bs_pitch, bs_dia, ...). Looks
     up the RAW catalog entry (THK_BALLSCREW_DB) rather than an evaluate()-returned candidate,
     which only carries pn/series/dia/lead — not eff/preload_Nm — so callers must always go
     through here (or applyBallScrewFields for the no-render() variant) rather than copying fields
     off a ranked/recommended object directly. Returns false if pn isn't a real catalog part. */
  function applyBallScrewFields(pn) {
    var cand = THK_BALLSCREW_DB.filter(function (c) { return c.pn === pn; })[0];
    if (!cand) return false;
    state.bs_pitch = cand.lead;
    state.bs_dia = cand.dia;
    state.bs_efficiency = cand.eff;
    state.bs_preload_torque = cand.preload_Nm || 0;
    var out = selectBallScrew();
    state.bs_length = Math.ceil(out.shared.shaft_length_mm / 10) * 10;
    return true;
  }

  /* Same as applyBallScrewFields but also marks this as an explicit user choice and triggers a
     full re-render — used by the "Use this ball screw" button. render()'s own auto-sync (which
     runs on every render until bs_user_selected is set) calls applyBallScrewFields directly to
     avoid re-entering render() from inside itself. */
  function applyBallScrewSelection(pn) {
    if (!applyBallScrewFields(pn)) return;
    state.bs_user_selected = true;
    // Gearbox/Drive were only ever suggested for whatever ball screw was configured before —
    // unlock them so they immediately re-suggest the best fit for this one (js/servo-app.js).
    if (typeof unlockDownstreamOfBallScrew === 'function') unlockDownstreamOfBallScrew();
    if (typeof saveState === 'function') saveState();
    if (typeof renderInputs === 'function') renderInputs();
    if (typeof render === 'function') render();
  }

  function isCandidateApplied(c) {
    return Math.abs(Number(state.bs_pitch) - c.lead) < 1e-6 && Math.abs(Number(state.bs_dia) - c.dia) < 1e-6;
  }

  /* Public: which catalog ball screw (if any) matches the currently configured bs_pitch/bs_dia —
     used by the Selected Components summary / report export. */
  function getAppliedBallScrew() {
    var db = (typeof THK_BALLSCREW_DB !== 'undefined') ? THK_BALLSCREW_DB : [];
    return db.filter(isCandidateApplied)[0] || null;
  }

  /* Detail checklist for the selected candidate — same Capacity/Actual/Utilization/Result
     layout as the app's main Verification Checklist, so designers can read it the same way. */
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
      { label: 'Static axial load, N', capacity: m.Fa_perm.toFixed(0), actual: shared.Fa_max_N.toFixed(0),
        u: u.safety_util, ok: shared.Fa_max_N <= m.Fa_perm },
      { label: 'Service life, h', capacity: isFinite(m.Lh) ? Math.round(m.Lh).toLocaleString() : '—',
        actual: Math.round(shared.required_life_hours).toLocaleString(),
        u: u.life_util, ok: shared.required_life_hours <= m.Lh },
      { label: 'Motor peak torque, Nm', capacity: motor ? (motor.Mmax || motor.Mn).toFixed(2) : '—',
        actual: m.T_peak_motor != null ? m.T_peak_motor.toFixed(2) : '—',
        u: u.torque_util, ok: motor ? m.T_peak_motor <= (motor.Mmax || motor.Mn) : null },
      { label: 'Ball screw max speed, rpm (' + Math.round(CFG.criticalSpeedDerate * 100) + '% derated critical/DN limit)',
        capacity: Math.round(m.speedCap).toLocaleString(), actual: Math.round(m.Nscrew).toLocaleString(),
        u: u.speed_util, ok: m.Nscrew <= m.speedCap },
      { label: 'Movement accuracy, mm', capacity: shared.positioning_accuracy_mm.toFixed(3),
        actual: m.pos_error_mm.toFixed(3),
        u: u.accuracy_util, ok: m.pos_error_mm <= shared.positioning_accuracy_mm },
    ];
    var body = rows.map(function (r) {
      return '<tr><td>' + r.label + '</td><td class="mono">' + r.capacity + '</td>' +
        '<td class="mono">' + r.actual + '</td><td class="mono">' + fmtUtil(r.u) + '</td>' +
        '<td>' + badge(r.ok) + '</td></tr>';
    }).join('');
    var headerRight = applied
      ? '<span class="badge badge-selected">Applied to Ball Screw Inputs — matches Primary Results</span>'
      : '<button type="button" class="bs-apply-btn button secondary" style="padding:4px 10px;font-size:12px;">Use this ball screw</button>' +
        '<span class="bs-sub" style="margin:4px 0 0;">Preview only — Primary Results still reflect the manually entered screw until applied.</span>';
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
        '<td><strong>' + escapeHtml(c.pn) + '</strong><br><span class="bs-sub">Ø' + c.dia + ' / lead ' + c.lead + '</span></td>' +
        '<td class="bs-reason">' + escapeHtml(c.reject_reason) + '</td>' +
        '</tr>';
    }).join('');
    return '<details class="bs-rejected">' +
      '<summary>' + rejected.length + ' model(s) rejected — click to view reasons</summary>' +
      '<table class="bs-table"><thead><tr><th>Part No.</th><th>Reason</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</details>';
  }

  global.selectBallScrew = selectBallScrew;
  global.renderBallScrewSelection = renderBallScrewSelection;
  global.getAppliedBallScrew = getAppliedBallScrew;
  global.applyBallScrewFields = applyBallScrewFields;
  global.BS_SELECT_CONFIG = CFG;
  if (typeof module !== 'undefined' && module.exports) module.exports = { selectBallScrew: selectBallScrew, CFG: CFG };

})(typeof window !== 'undefined' ? window : globalThis);
