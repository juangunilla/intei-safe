import test from 'node:test';
import assert from 'node:assert/strict';
import { createAreaMeasurement, createLinearMeasurement, measureArea, polygonAreaPixels, sectorFromMeasurement } from '../src/editor/measurement/measurementModel.js';

test('calcula un ancho en píxeles y metros', () => {
  const width = createLinearMeasurement({ id: 'w1', type: 'width', points: [{ x: 0, y: 0 }, { x: 0, y: 120 }], scale: { calibrated: true, pixelsPerMeter: 100 }, createdAt: '2026-08-07', createdBy: 'QA' });
  assert.equal(width.pixels, 120);
  assert.equal(width.meters, 1.2);
  assert.equal(width.type, 'width');
});

test('un ancho sin escala conserva píxeles y no inventa metros', () => {
  const width = createLinearMeasurement({ type: 'width', points: [{ x: 0, y: 0 }, { x: 30, y: 40 }], scale: { calibrated: false } });
  assert.equal(width.pixels, 50);
  assert.equal(width.meters, null);
});

test('aplica shoelace a un rectángulo y convierte a metros cuadrados', () => {
  const points = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 0, y: 100 }];
  assert.equal(polygonAreaPixels(points), 20000);
  assert.equal(measureArea(points, { calibrated: true, pixelsPerMeter: 20 }).squareMeters, 50);
});

test('calcula correctamente un polígono irregular independientemente de la orientación', () => {
  const polygon = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 2, y: 1 }, { x: 0, y: 3 }];
  assert.equal(polygonAreaPixels(polygon), 8);
  assert.equal(polygonAreaPixels([...polygon].reverse()), 8);
});

test('una superficie sin escala conserva píxeles cuadrados', () => {
  const area = createAreaMeasurement({ id: 'a1', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }], scale: { calibrated: false } });
  assert.equal(area.pixels, 50);
  assert.equal(area.squareMeters, null);
});

test('convierte una superficie en sector asociado sin calcular ocupación', () => {
  const area = createAreaMeasurement({ id: 'a1', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }], scale: { calibrated: true, pixelsPerMeter: 10 } });
  const sector = sectorFromMeasurement({ id: 's1', measurement: area, name: 'Oficina principal', type: 'oficina' });
  assert.equal(sector.sourceMeasurementId, 'a1');
  assert.equal(sector.areaSquareMeters, .5);
  assert.equal(sector.occupancy, null);
});
