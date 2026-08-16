import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, blockedExitScenario } from '../src/editor/simulation/simulationModel.js';
import { runSimulation } from '../src/editor/simulation/simulationEngine.js';
import { playbackTransition, simulationFrame } from '../src/editor/simulation/simulationPlayback.js';

const route = (id, exitId, lengthPixels = 100, role = 'primary') => ({ id: `arrow-${id}`, type: 'arrow', routeId: id, sourceId: 's1', exitId, routeRole: role, x: 0, y: 0, scaleX: 1, scaleY: 1, points: [0, 0, lengthPixels, 0] });
const documentFor = ({ occupancy = 1, routes = [route('r1', 'e1')], calibrated = true } = {}) => ({
  version: 7, scale: calibrated ? { calibrated: true, pixelsPerMeter: 10 } : { calibrated: false },
  sectors: [{ id: 's1', name: 'Oficina', occupancy, polygon: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }] }], elements: routes,
});
const simulate = (document, parameters = {}, scenario) => runSimulation({ simulation: createSimulation({ id: 'sim', parameters: { selectedSectorIds: ['s1'], selectedExitIds: ['e1', 'e2'], randomSeed: 'seed', ...parameters }, scenario }), document });

test('simula un agente con reacción, velocidad y tiempo discretizado', () => {
  const result = simulate(documentFor(), { reactionTimeSeconds: 30, walkingSpeedMetersPerSecond: 1.2, simulationStepMs: 100 });
  assert.equal(result.agents.length, 1);
  assert.equal(result.agents[0].status, 'evacuated');
  assert.equal(result.agents[0].evacuationTimeSeconds, 38.4);
  assert.equal(result.results.totalSimulationTimeSeconds, 38.4);
  assert.ok(result.events.some(({ type }) => type === 'simulation_started'));
  assert.ok(result.events.some(({ type }) => type === 'first_evacuated'));
});

test('múltiples agentes usan parámetros de movilidad sin dinámica física inventada', () => {
  const result = simulate(documentFor({ occupancy: 10 }), { mobilityReducedCount: 2, mobilityReducedSpeedMetersPerSecond: .5 });
  assert.equal(result.results.totalOccupants, 10);
  assert.equal(result.agents.filter(({ mobilityReduced }) => mobilityReduced).length, 2);
  assert.equal(result.results.routeLoad[0].assignedAgents, 10);
  assert.equal(result.results.routeLoad[0].concentrationModel, 'not_implemented');
});

test('distribución manual no inventa ocupación faltante', () => {
  const missing = simulate(documentFor({ occupancy: null }));
  assert.equal(missing.results.totalOccupants, 0);
  assert.ok(missing.warnings.some((warning) => warning.includes('Falta ocupación')));
  const manual = simulate(documentFor({ occupancy: null }), { distributionMode: 'manual', sectorOccupancy: { s1: 3 } });
  assert.equal(manual.results.totalOccupants, 3);
  assert.equal(manual.parameters.occupantCount, 3);
});

test('ruta inexistente y plano sin escala bloquean sin atravesar geometría', () => {
  assert.equal(simulate(documentFor({ routes: [] })).agents[0].status, 'blocked');
  const unscaled = simulate(documentFor({ calibrated: false }));
  assert.equal(unscaled.agents[0].status, 'blocked');
  assert.ok(unscaled.warnings.some((warning) => warning.includes('escala calibrada')));
});

test('salida bloqueada usa alternativa existente', () => {
  const document = documentFor({ routes: [route('r1', 'e1', 80), route('r2', 'e2', 120, 'alternative')] });
  const result = simulate(document, {}, blockedExitScenario('e1'));
  assert.equal(result.agents[0].assignedRouteId, 'r2');
  assert.equal(result.agents[0].assignedExitId, 'e2');
  assert.equal(result.agents[0].status, 'evacuated');
});

test('salida bloqueada sin alternativa deja agente bloqueado', () => {
  const result = simulate(documentFor(), {}, blockedExitScenario('e1'));
  assert.equal(result.agents[0].status, 'blocked');
  assert.equal(result.results.blocked, 1);
});

test('la misma semilla reproduce agentes, eventos y resultados', () => {
  const first = simulate(documentFor({ occupancy: 8 }), { mobilityReducedCount: 3, randomSeed: 'repetible' });
  const second = simulate(documentFor({ occupancy: 8 }), { mobilityReducedCount: 3, randomSeed: 'repetible' });
  assert.deepEqual(first.agents, second.agents);
  assert.deepEqual(first.events, second.events);
  assert.deepEqual(first.results, second.results);
});

test('frame parametrizado reproduce posiciones sin guardar snapshots', () => {
  const result = simulate(documentFor(), { reactionTimeSeconds: 2, walkingSpeedMetersPerSecond: 1 });
  assert.equal(simulationFrame(result, 1).agents[0].visualStatus, 'waiting');
  const moving = simulationFrame(result, 7);
  assert.equal(moving.agents[0].visualStatus, 'evacuating');
  assert.equal(moving.agents[0].position.x, 50);
  assert.ok(result.events.length >= 5);
});

test('pause y restart son transiciones puras', () => {
  const state = { playing: true, elapsedSeconds: 12 };
  assert.deepEqual(playbackTransition(state, 'pause'), { playing: false, elapsedSeconds: 12 });
  assert.deepEqual(playbackTransition(state, 'restart'), { playing: false, elapsedSeconds: 0 });
  assert.equal(playbackTransition(state, 'play').playing, true);
});

test('procesa 10, 50, 100 y 250 agentes con eventos compactos', () => {
  [10, 50, 100, 250].forEach((occupancy) => {
    const result = simulate(documentFor({ occupancy }));
    assert.equal(result.agents.length, occupancy);
    assert.ok(result.events.length <= occupancy * 2 + 6);
    assert.equal(Object.hasOwn(result, 'frames'), false);
  });
});
