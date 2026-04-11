/**
 * TITAN Servo Sizing — Project Store
 * Manages multiple projects, each containing individual servo axes.
 */
(function (global) {
  'use strict';

  const STORE_KEY = 'titanProjectStore';
  const CONTEXT_KEY = 'titanServoContext';

  function getStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : { projects: {} };
    } catch {
      return { projects: {} };
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function now() {
    return new Date().toISOString();
  }

  let _seq = 0;
  function uid(prefix) {
    return `${prefix}-${Date.now()}-${++_seq}`;
  }

  const Projects = {
    /** Return all projects sorted by last updated, newest first. */
    getAll() {
      return Object.values(getStore().projects)
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    },

    /** Return a single project by id, or null. */
    get(id) {
      return getStore().projects[id] || null;
    },

    /** Create a new project. Returns the new project id. */
    create({ name, customer = '', machine = '' }) {
      const store = getStore();
      const id = uid('proj');
      store.projects[id] = {
        id,
        name,
        customer,
        machine,
        created: now(),
        lastUpdated: now(),
        servos: [],
      };
      saveStore(store);
      return id;
    },

    /** Update project metadata fields. */
    updateMeta(id, { name, customer, machine } = {}) {
      const store = getStore();
      const proj = store.projects[id];
      if (!proj) return;
      if (name !== undefined) proj.name = name;
      if (customer !== undefined) proj.customer = customer;
      if (machine !== undefined) proj.machine = machine;
      proj.lastUpdated = now();
      saveStore(store);
    },

    /** Delete a project permanently. */
    delete(id) {
      const store = getStore();
      delete store.projects[id];
      saveStore(store);
    },

    /** Add a new servo axis to a project. Returns the servo id. */
    addServo(projectId, name) {
      const store = getStore();
      const proj = store.projects[projectId];
      if (!proj) return null;
      const id = uid('servo');
      proj.servos.push({
        id,
        name,
        state: null,
        motorIdx: -1,
        motor: null,
        status: 'NEW',
        lastUpdated: now(),
      });
      proj.lastUpdated = now();
      saveStore(store);
      return id;
    },

    /** Update a servo's persisted state and status after an edit session. */
    updateServo(projectId, servoId, { state, motorIdx, motor, status, metrics } = {}) {
      const store = getStore();
      const proj = store.projects[projectId];
      if (!proj) return;
      const servo = proj.servos.find(s => s.id === servoId);
      if (!servo) return;
      if (state !== undefined) servo.state = state;
      if (motorIdx !== undefined) servo.motorIdx = motorIdx;
      if (motor !== undefined) servo.motor = motor;
      if (status !== undefined) servo.status = status;
      if (metrics !== undefined) servo.metrics = metrics;
      servo.lastUpdated = now();
      proj.lastUpdated = now();
      saveStore(store);
    },

    /** Remove a servo axis from a project. */
    deleteServo(projectId, servoId) {
      const store = getStore();
      const proj = store.projects[projectId];
      if (!proj) return;
      proj.servos = proj.servos.filter(s => s.id !== servoId);
      proj.lastUpdated = now();
      saveStore(store);
    },

    /**
     * Launch a servo in the calculator.
     * Copies servo state into titanServoState and navigates to the calculator.
     */
    launchServo(projectId, servoId) {
      const proj = this.get(projectId);
      if (!proj) return;
      const servo = proj.servos.find(s => s.id === servoId);
      if (!servo) return;

      if (servo.state) {
        localStorage.setItem('titanServoState', JSON.stringify(servo.state));
      } else {
        localStorage.removeItem('titanServoState');
      }
      localStorage.setItem(
        'titanServoSelectedMotor',
        servo.motorIdx != null && servo.motorIdx >= 0 ? String(servo.motorIdx) : '-1'
      );

      localStorage.setItem(
        CONTEXT_KEY,
        JSON.stringify({
          projectId,
          servoId,
          projectName: proj.name,
          servoName: servo.name,
        })
      );

      window.location.href = 'titan-project-calculator.html?ctx=1';
    },

    /** Read the current edit context (set by launchServo). */
    getContext() {
      try {
        return JSON.parse(localStorage.getItem(CONTEXT_KEY) || 'null');
      } catch {
        return null;
      }
    },

    /** Clear the edit context after returning from the calculator. */
    clearContext() {
      localStorage.removeItem(CONTEXT_KEY);
    },
  };

  global.Projects = Projects;
})(window);

/**
 * Confidence score based on "Confidence level calc.xlsx".
 * Formula:
 * (sum(Must * acquisitionFactor) + sum(Critical * acquisitionFactor) + sum(Additional * acquisitionFactor))
 * * selectionModelFactor
 * where category accuracies are Must=60%, Critical=30%, Additional=10%.
 *
 * Accepts either a servo object ({ state, motorIdx, metrics, ... })
 * or a raw state object.
 */
function calculateConfidence(input) {
  const servo = input && input.state ? input : { state: input || {} };
  const state = servo.state || {};
  const steps = Array.isArray(state.steps) && state.steps.length > 0 ? state.steps : [];
  const s0 = steps[0] || {};
  const hasPK = Number(state.has_parallel_kit) !== 0;

  const ACCURACY = { must: 0.60, critical: 0.30, additional: 0.10 };
  const VALUE_FACTOR = { direct: 1.0, derived: 0.5 };

  function hasNumber(val, allowZero = false) {
    const n = Number(val);
    if (!Number.isFinite(n)) return false;
    return allowZero ? true : n !== 0;
  }

  function entry(ok, acquisition = 'direct') {
    return (ok ? 1 : 0) * (VALUE_FACTOR[acquisition] || 1);
  }

  const must = [
    entry(hasNumber(s0.stroke)),
    entry(hasNumber(s0.move_time)),
    entry(hasNumber(s0.external_force, true)),
    entry(hasNumber(s0.load_mass)),
    entry(hasNumber(s0.tilt_deg, true)),
    entry(hasNumber(state.project_accuracy)),
    entry(hasNumber(state.bs_pitch)),
    entry(hasNumber(state.bs_dia)),
    entry(hasPK ? hasNumber(state.pk_ratio) : true),
    entry(hasPK ? hasNumber(state.pk_no_load_torque) : true),
    entry(hasPK ? hasNumber(state.pk_inertia) : true),
    entry(hasPK ? hasNumber(state.pk_max_torque) : true),
    entry(hasPK ? hasNumber(state.pk_max_speed) : true),
    entry(hasNumber(state.guide_force)),
    entry(hasNumber(state.guide_mass)),
    entry(hasNumber(state.guide_max_force)),
  ];

  const critical = [
    entry(hasNumber(state.project_operating_time)),
    entry(hasNumber(state.acc_pct)),
    entry(hasNumber(state.safety_factor)),
    entry(hasNumber(state.bs_friction_torque)),
  ];

  const additional = [
    entry(hasNumber(state.project_shifts)),
    entry(hasNumber(state.project_hours_shift)),
    entry(hasNumber(state.project_shifts) && hasNumber(state.project_hours_shift), 'derived'), // working hours/day
    entry(hasNumber(state.project_days_week)),
    entry(hasNumber(state.project_total_cycle)),
    entry(hasNumber(state.project_service_life)),
    entry(hasNumber(state.guide_service_life)),
  ];

  function weightedCategoryScore(values, accuracyPct) {
    if (!values.length) return 0;
    const perParamWeight = accuracyPct / values.length;
    return values.reduce((sum, value) => sum + value * perParamWeight, 0);
  }

  const baseScore =
    weightedCategoryScore(must, ACCURACY.must) +
    weightedCategoryScore(critical, ACCURACY.critical) +
    weightedCategoryScore(additional, ACCURACY.additional);

  // Selection model factor
  // Catalogue selection: motor resolved from catalog in-app
  // Application selection: external/manual motor reference
  const hasCatalogSelection = Number(servo.motorIdx) >= 0 && !!servo.metrics;
  const selectionModelFactor = hasCatalogSelection ? 1.0 : 0.9;

  return Math.round(baseScore * selectionModelFactor * 100);
}
