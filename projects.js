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
 * Confidence score for a servo state object.
 * Formula: (must×0.60 + critical×0.30 + additional×0.10) × 0.9 (Application Selection Method)
 * Returns integer 0–90.
 */
function calculateConfidence(state) {
  if (!state) return 0;

  const hasPK = state.has_parallel_kit === true || Number(state.has_parallel_kit) === 1;
  const steps = Array.isArray(state.steps) && state.steps.length > 0 ? state.steps : null;
  const s0 = steps ? steps[0] : {};

  // 1 if value was explicitly provided (non-zero finite number), 0 otherwise
  function direct(val) {
    const n = Number(val);
    return (val !== undefined && val !== null && Number.isFinite(n) && n !== 0) ? 1 : 0;
  }

  // Must have (60%) — 16 parameters per spec
  const must = [
    steps && direct(s0.stroke)              ? 1 : 0,  // Movement stroke
    steps && direct(s0.move_time)           ? 1 : 0,  // Cycle time for movement
    steps                                   ? 1 : 0,  // External force (0 N is valid)
    steps && direct(s0.load_mass)           ? 1 : 0,  // Moving mass
    steps                                   ? 1 : 0,  // Tilt angle (0° is valid)
    direct(state.project_accuracy),                   // Movement accuracy
    direct(state.bs_pitch),                           // Ball screw pitch
    0,                                                // Ball screw dia — not collected ⚠
    hasPK ? direct(state.pk_ratio)          : 1,     // PK gear ratio
    hasPK ? direct(state.pk_no_load_torque) : 1,     // PK no-load torque
    hasPK ? direct(state.pk_inertia)        : 1,     // PK inertia
    hasPK ? direct(state.pk_max_torque)     : 1,     // PK max torque
    hasPK ? direct(state.pk_max_speed)      : 1,     // PK max speed
    direct(state.guide_force),                        // Guide displacement force
    direct(state.guide_mass),                         // Guide moving mass
    0,                                                // Guide max withstand force — not collected ⚠
  ];

  // Critical (30%) — 4 parameters
  const crit = [
    direct(state.project_operating_time),  // Operating time per cycle
    direct(state.acc_pct),                 // Acceleration %
    direct(state.safety_factor),           // Safety factor %
    direct(state.bs_friction_torque),      // BS friction torque
  ];

  // Additional (10%) — 7 parameters
  const add = [
    direct(state.project_shifts),          // Shifts per day
    direct(state.project_hours_shift),     // Hours per shift
    0.5,                                   // Hours per day — always derived
    direct(state.project_days_week),       // Days per week
    direct(state.project_total_cycle),     // Total cycle time
    direct(state.project_service_life),    // Service life
    0,                                     // Guide service life — not collected ⚠
  ];

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.round((avg(must) * 0.60 + avg(crit) * 0.30 + avg(add) * 0.10) * 0.9 * 100);
}
