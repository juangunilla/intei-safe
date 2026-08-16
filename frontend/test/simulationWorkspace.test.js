import test from 'node:test';
import assert from 'node:assert/strict';
import { clampSimulationTime, compareSimulations, duplicateSimulationScenario, eventSelection, isEditorMode, simulationStatusLabel, utilizationOverlay } from '../src/editor/simulation/simulationWorkspaceModel.js';
import { contextualSimulationProperties } from '../src/editor/simulation/simulationProperties.js';
import { editorReducer, initialEditorState } from '../src/editor/store/editorReducer.js';

const simulation = { id: 'a', name: 'Normal', status: 'completed', createdBy: 'Pro', parameters: { reactionTimeSeconds: 20, walkingSpeedMetersPerSecond: 1, simulationStepMs: 100, randomSeed: 'seed', blockedExitIds: [] }, scenario: { name: 'Normal', blockedExitIds: [] }, agents: [{ sectorId: 's1', assignedExitId: 'e1', assignedRouteId: 'r1', status: 'evacuated' }], routes: [{ routeId: 'r1', sourceId: 's1', exitId: 'e1', meters: 10 }], results: { totalOccupants: 1, totalSimulationTimeSeconds: 30, averageEvacuationTimeSeconds: 30, evacuated: 1, blocked: 0, maxQueue: 1, exitUsage: [{ id: 'e1', count: 1 }], routeUsage: [{ id: 'r1', count: 1 }], routeLoad: [{ routeId: 'r1', assignedAgents: 1, approximateMaxQueue: 1 }] } };
const document = { sectors: [{ id: 's1', name: 'Oficina', type: 'oficina', areaSquareMeters: 80, occupancy: 10 }], elements: [{ id: 'e1', type: 'symbol', symbolId: 'emergencyExit' }, { id: 'arrow', routeId: 'r1' }], measurements: [{ id: 'w1', type: 'width', elementId: 'e1', meters: 1.2 }] };

test('reconoce el cambio al modo simulación', () => { assert.equal(isEditorMode('simulation'), true); assert.equal(isEditorMode('unknown'), false); });
test('expone propiedades contextuales de simulación, sector, salida y ruta', () => {
  assert.equal(contextualSimulationProperties({ selection: { type: 'simulation' }, simulation, document }).kind, 'simulation');
  assert.equal(contextualSimulationProperties({ selection: { type: 'sector', id: 's1' }, simulation, document }).values['Agentes asignados'], 1);
  assert.equal(contextualSimulationProperties({ selection: { type: 'element', id: 'e1' }, simulation, document }).values['Ancho medido (m)'], 1.2);
  assert.equal(contextualSimulationProperties({ selection: { type: 'route', id: 'r1' }, simulation, document }).values.Agentes, 1);
});
test('timeline limita seek y clasifica estado de reproducción', () => {
  assert.equal(clampSimulationTime(40, 30), 30); assert.equal(clampSimulationTime(-2, 30), 0);
  assert.equal(simulationStatusLabel({ simulation, playing: true }), 'Reproduciendo');
  assert.equal(simulationStatusLabel({ simulation, playing: false, elapsedSeconds: 30 }), 'Finalizada');
});
test('eventos seleccionan ruta, salida o sector existente', () => {
  assert.deepEqual(eventSelection({ routeId: 'r1' }), { type: 'route', id: 'r1' });
  assert.deepEqual(eventSelection({ exitId: 'e1' }), { type: 'element', id: 'e1' });
  assert.deepEqual(eventSelection({ sectorId: 's1' }), { type: 'sector', id: 's1' });
});
test('comparación calcula diferencias absolutas y porcentuales sin valorar seguridad', () => {
  const other = structuredClone(simulation); other.id = 'b'; other.results.totalSimulationTimeSeconds = 45; other.results.blocked = 1;
  const result = compareSimulations(simulation, other);
  assert.equal(result.totalTime.difference, 15); assert.equal(result.totalTime.percentage, 50); assert.equal(result.blocked.percentage, null);
});
test('visibilidad de capas de simulación es efímera', () => {
  const next = editorReducer(initialEditorState, { type: 'SET_SIMULATION_VIEW_OPTIONS', payload: { showAgents: false, showHeatmap: true } });
  assert.equal(next.simulationViewOptions.showAgents, false); assert.equal(next.simulationViewOptions.showHeatmap, true); assert.equal(next.past.length, 0);
});
test('duplica escenario sin copiar resultados y reducer elimina el original', () => {
  const copy = duplicateSimulationScenario(simulation, { id: 'copy', createdAt: '2026-08-07T00:00:00.000Z' });
  assert.equal(copy.name, 'Normal — copia'); assert.equal(copy.status, 'draft'); assert.deepEqual(copy.results, {});
  const state = { ...initialEditorState, document: { ...initialEditorState.document, simulations: [simulation, copy] } };
  assert.deepEqual(editorReducer(state, { type: 'DELETE_SIMULATION', payload: 'a' }).document.simulations, [copy]);
});
test('heatmap expresa utilización relativa y no riesgo', () => {
  const overlay = utilizationOverlay({ results: { routeUsage: [{ id: 'r1', count: 10 }, { id: 'r2', count: 5 }], exitUsage: [{ id: 'e1', count: 7 }] } });
  assert.equal(overlay.routes[0].intensity, 1); assert.equal(overlay.routes[1].intensity, .5); assert.equal(Object.hasOwn(overlay.routes[0], 'risk'), false);
});
