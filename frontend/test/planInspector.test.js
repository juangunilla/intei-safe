import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectEvacuationPlan } from '../src/editor/inspection/planInspector.js';

test('calcula cumplimiento con salidas, rutas, señalización, equipamiento, observaciones y sectores sin ruta', () => {
  const inspection = inspectEvacuationPlan({
    buildingAnalysis: {
      sectors: [{ id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' }],
      emergencyExits: [{ id: 'e1' }, { id: 'e2' }],
      hazards: [{ id: 'h1' }], warnings: ['Revisar escala'], stairs: [],
    },
    elements: [
      { type: 'symbol', symbolId: 'emergencyExit' }, { type: 'symbol', symbolId: 'emergencyExit' },
      { type: 'symbol', symbolId: 'evacuationRoute' }, { type: 'symbol', symbolId: 'assemblyPoint' },
      { type: 'symbol', symbolId: 'extinguisher' }, { type: 'symbol', symbolId: 'alarm' },
      { type: 'arrow', sourceId: 's1', points: [0, 0, 10, 0] },
      { type: 'arrow', sourceId: 's2', points: [0, 0, 10, 0] },
    ],
  });
  assert.equal(inspection.percentage, 68);
  assert.deepEqual(inspection.summary, { exits: 2, routes: 2, signage: 4, equipment: 2, observations: 2, sectors: 4, sectorsWithoutRoute: 2, risks: 1 });
  assert.deepEqual(inspection.scoreBreakdown, { exits: 20, routes: 10, signage: 15, equipment: 10, observations: 5, routedSectors: 7.5 });
});

test('cuenta flechas editables aunque no tengan la marca generatedRoute', () => {
  const inspection = inspectEvacuationPlan({
    buildingAnalysis: { sectors: [{ id: 's1' }], emergencyExits: [], hazards: [], warnings: [], stairs: [] },
    elements: [{ type: 'arrow', points: [0, 0, 20, 0] }],
  });
  assert.equal(inspection.summary.routes, 1);
  assert.equal(inspection.summary.sectorsWithoutRoute, 0);
});

test('un proyecto sin rutas ni equipamiento no obtiene cobertura inexistente', () => {
  const inspection = inspectEvacuationPlan({
    buildingAnalysis: { sectors: [{ id: 's1' }, { id: 's2' }], emergencyExits: [], hazards: [], warnings: [], stairs: [] },
    elements: [],
  });
  assert.equal(inspection.summary.routes, 0);
  assert.equal(inspection.summary.equipment, 0);
  assert.equal(inspection.summary.sectorsWithoutRoute, 2);
  assert.equal(inspection.percentage, 10);
});
