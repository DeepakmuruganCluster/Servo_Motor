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
      const id = 'proj-' + Date.now();
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
      const id = 'servo-' + Date.now();
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
    updateServo(projectId, servoId, { state, motorIdx, motor, status } = {}) {
      const store = getStore();
      const proj = store.projects[projectId];
      if (!proj) return;
      const servo = proj.servos.find(s => s.id === servoId);
      if (!servo) return;
      if (state !== undefined) servo.state = state;
      if (motorIdx !== undefined) servo.motorIdx = motorIdx;
      if (motor !== undefined) servo.motor = motor;
      if (status !== undefined) servo.status = status;
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
