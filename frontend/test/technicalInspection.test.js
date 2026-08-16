import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTechnicalInspection, confidenceLabel } from '../src/editor/inspection/technicalInspection.js';

test('calcula estado y confianza por categoría', () => {
  const result = buildTechnicalInspection({
    rooms: [{ id: 'room-1', label: 'Oficina', confidence: 0.9 }],
    doors: [{ id: 'door-1', confidence: 0.6 }],
    stairs: [], corridors: [], hazards: [], sectors: [], emergencyExits: [], warnings: [],
  });
  assert.equal(result.categories.find(({ key }) => key === 'rooms').status, 'success');
  assert.equal(result.categories.find(({ key }) => key === 'doors').status, 'warning');
  assert.equal(result.categories.find(({ key }) => key === 'stairs').status, 'unknown');
  assert.equal(confidenceLabel(result.confidence), '75%');
});

test('detecta sectores sin salida mediante relaciones y coordenadas', () => {
  const result = buildTechnicalInspection({
    rooms: [], doors: [], stairs: [], corridors: [], hazards: [], warnings: [],
    sectors: [
      { id: 'sector-a', label: 'A', bounds: { x: 0, y: 0, width: 100, height: 100 }, confidence: 0.9 },
      { id: 'sector-b', label: 'B', bounds: { x: 200, y: 0, width: 100, height: 100 }, confidence: 0.8 },
    ],
    emergencyExits: [{ id: 'exit-a', center: { x: 50, y: 50 }, confidence: 0.9 }],
  });
  const missing = result.categories.find(({ key }) => key === 'sectorsWithoutExit');
  assert.equal(missing.status, 'danger');
  assert.deepEqual(missing.details.map(({ label }) => label), ['B']);
});

test('el inspector no muta el modelo recibido', () => {
  const analysis = { rooms: [], warnings: ['Plano borroso'] };
  const snapshot = structuredClone(analysis);
  buildTechnicalInspection(analysis);
  assert.deepEqual(analysis, snapshot);
});
