import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationModelDraft, materializeSimulationModel, reviewSimulationCandidate, updateSimulationCandidate } from '../src/editor/simulation/simulationModelAdapter.js';
import { validateSimulationReadiness } from '../src/editor/simulation/simulationModelValidation.js';

const documentWithAnalysis = () => ({
  layers: [{ id: 'base', name: 'Base', order: 0 }],
  elements: [{ id: 'image', type: 'planImage', x: 0, y: 0, scaleX: 1, scaleY: 1 }],
  scale: { calibrated: true, pixelsPerMeter: 10 }, sectors: [],
  establishmentProfile: { egress: { exitCount: 2 } },
  buildingAnalysis: {
    version: 1, source: { imageElementId: 'image', canvasTransform: { x: 0, y: 0, scaleX: 1, scaleY: 1 } }, coordinateSystem: { imageWidth: 200, imageHeight: 100 },
    walls: [], doors: [], hazards: [], corridors: [],
    rooms: [{ id: 'room-1', label: 'Oficina', category: 'office', polygon: [{ x: 10, y: 10 }, { x: 70, y: 10 }, { x: 70, y: 70 }, { x: 10, y: 70 }], confidence: .8 }],
    sectors: [], emergencyExits: [{ id: 'exit-1', center: { x: 180, y: 50 }, confidence: .9 }], warnings: [],
  },
});

test('prepara detecciones sin confirmarlas ni materializarlas automáticamente', () => {
  const document = documentWithAnalysis();
  const draft = createSimulationModelDraft(document, { createdBy: 'Profesional' });
  assert.equal(draft.sectors[0].reviewStatus, 'detected');
  assert.equal(draft.sectors[0].disposition, 'pending');
  assert.equal(draft.exits[0].source, 'ai');
  assert.deepEqual(document.sectors, []);
  assert.equal(document.elements.length, 1);
});

test('materializa sólo candidatos confirmados y conserva IDs de origen estables', () => {
  const document = documentWithAnalysis();
  let draft = createSimulationModelDraft(document);
  draft = updateSimulationCandidate(draft, 'sectors', draft.sectors[0].id, { occupancy: 5, occupancySource: 'declared' });
  draft = reviewSimulationCandidate(draft, 'sectors', draft.sectors[0].id, 'accepted', 'Arq. Prueba');
  draft = reviewSimulationCandidate(draft, 'exits', draft.exits[0].id, 'accepted', 'Arq. Prueba');
  const model = materializeSimulationModel(document, draft, { reviewedBy: 'Arq. Prueba', layerId: 'simulation-layer' });
  assert.equal(model.sectors[0].id, 'sim-sector-room-1');
  assert.equal(model.sectors[0].sourceAnalysisId, 'room-1');
  assert.equal(model.sectors[0].reviewStatus, 'professional_confirmed');
  assert.equal(model.elements.find(({ symbolId }) => symbolId === 'emergencyExit').id, 'sim-exit-exit-1');
  assert.ok(model.elements.some(({ routeId, sourceId, exitId }) => routeId && sourceId === 'sim-sector-room-1' && exitId === 'sim-exit-exit-1'));
});

test('una cantidad de salidas declarada no satisface la validación geométrica', () => {
  const document = documentWithAnalysis();
  document.sectors = [{ id: 's1', name: 'Oficina', occupancy: 4, polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }] }];
  const result = validateSimulationReadiness(document);
  assert.equal(result.ready, false);
  assert.ok(result.issues.some(({ code }) => code === 'NO_EXITS'));
});
