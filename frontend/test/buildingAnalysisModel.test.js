import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING_DETECTIONS, getBuildingAnalysisCounts } from '../src/editor/analysis/buildingAnalysisModel.js';

test('el modelo principal expone todas las detecciones solicitadas', () => {
  assert.deepEqual(BUILDING_DETECTIONS.map(([key]) => key), [
    'walls', 'rooms', 'doors', 'windows', 'corridors', 'stairs', 'emergencyExits', 'sectors', 'hazards',
  ]);
});

test('los conteos toleran colecciones ausentes sin alterar el análisis', () => {
  const analysis = { walls: [{ id: 'wall-1' }], rooms: [] };
  const counts = getBuildingAnalysisCounts(analysis);
  assert.equal(counts.walls, 1);
  assert.equal(counts.emergencyExits, 0);
  assert.deepEqual(analysis, { walls: [{ id: 'wall-1' }], rooms: [] });
});
