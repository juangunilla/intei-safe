import test from 'node:test';
import assert from 'node:assert/strict';
import { boundsFromPoints, boundsForElement, calculateFocusViewport, evidenceSelection, isSelectionClearKey, resolveEntity } from '../src/editor/selection/entityFocus.js';

const document = {
  measurements: [{ id: 'm1', type: 'distance', points: [{ x: 10, y: 20 }, { x: 110, y: 70 }] }],
  sectors: [{ id: 's1', polygon: [{ x: 200, y: 100 }, { x: 300, y: 100 }, { x: 250, y: 180 }] }],
  elements: [
    { id: 'e1', type: 'symbol', x: 400, y: 300, scaleX: 1, scaleY: 1 },
    { id: 'arrow-1', type: 'arrow', routeId: 'route-1', x: 20, y: 30, scaleX: 1, scaleY: 1, points: [0, 0, 100, 50] },
  ],
};

test('calcula bounding boxes para puntos y elementos', () => {
  assert.deepEqual(boundsFromPoints([{ x: 5, y: 8 }, { x: 20, y: 2 }]), { x: 5, y: 2, width: 15, height: 6 });
  assert.deepEqual(boundsForElement(document.elements[1]), { x: 20, y: 30, width: 100, height: 50 });
});

test('resuelve medición, sector, elemento y ruta sin recorrer durante el render por frame', () => {
  assert.equal(resolveEntity(document, { type: 'measurement', id: 'm1' }).entity.id, 'm1');
  assert.equal(resolveEntity(document, { type: 'sector', id: 's1' }).entity.id, 's1');
  assert.equal(resolveEntity(document, { type: 'element', id: 'e1' }).entity.id, 'e1');
  assert.equal(resolveEntity(document, { type: 'route', id: 'route-1' }).entity.id, 'arrow-1');
});

test('entidad eliminada o evidencia sin ID no produce error', () => {
  assert.equal(resolveEntity(document, { type: 'measurement', id: 'deleted' }), null);
  assert.equal(resolveEntity(document, null), null);
  assert.equal(evidenceSelection({ type: 'unknown' }), null);
});

test('centra una entidad fuera del viewport y evita mover una ya visible', () => {
  const viewport = { scale: 1, x: 0, y: 0 };
  assert.deepEqual(calculateFocusViewport({ bounds: { x: 100, y: 100, width: 100, height: 80 }, viewport, canvasSize: { width: 800, height: 600 } }), viewport);
  const focused = calculateFocusViewport({ bounds: { x: 1200, y: 900, width: 100, height: 80 }, viewport, canvasSize: { width: 800, height: 600 } });
  assert.equal(focused.x, -850);
  assert.equal(focused.y, -640);
  assert.equal(focused.scale, 1);
});

test('ajusta zoom limitado para evidencia demasiado pequeña', () => {
  const focused = calculateFocusViewport({ bounds: { x: 20, y: 20, width: 2, height: 2 }, viewport: { scale: .2, x: 0, y: 0 }, canvasSize: { width: 800, height: 600 } });
  assert.equal(focused.scale, 1.25);
});

test('normaliza evidencia múltiple a selecciones independientes', () => {
  const targets = [
    { type: 'widthMeasurement', id: 'm1' },
    { type: 'sector', id: 's1' },
    { type: 'route', id: 'arrow-1', fields: { routeId: 'route-1' } },
    { type: 'element', elementId: 'e1' },
  ].map(evidenceSelection);
  assert.deepEqual(targets.map(({ type, id }) => ({ type, id })), [
    { type: 'measurement', id: 'm1' }, { type: 'sector', id: 's1' }, { type: 'route', id: 'route-1' }, { type: 'element', id: 'e1' },
  ]);
});

test('Escape se reconoce sin interceptar otras teclas', () => {
  assert.equal(isSelectionClearKey({ key: 'Escape' }), true);
  assert.equal(isSelectionClearKey({ key: 'Delete' }), false);
});
