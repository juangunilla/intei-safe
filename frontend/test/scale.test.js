import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrateScale, formatRealDistance, measureDistance, pixelDistance } from '../src/editor/measurement/scale.js';
import { buildDocumentExport, editorReducer, initialEditorState } from '../src/editor/store/editorReducer.js';

test('calibra y convierte píxeles a metros', () => {
  const scale = calibrateScale({ pointA: { x: 0, y: 0 }, pointB: { x: 320, y: 0 }, distanceMeters: 8.4, calibratedAt: '2026-08-07', calibratedBy: 'Profesional' });
  assert.equal(pixelDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.ok(Math.abs(scale.pixelsPerMeter - 38.095238) < .000001);
  assert.equal(measureDistance({ x: 0, y: 0 }, { x: 320, y: 0 }, scale).meters, 8.4);
});

test('muestra centímetros para mediciones menores a un metro', () => {
  const result = measureDistance({ x: 0, y: 0 }, { x: 50, y: 0 }, { calibrated: true, pixelsPerMeter: 100 });
  assert.match(formatRealDistance(result), /50/);
  assert.match(formatRealDistance(result), /cm/);
});

test('un proyecto sin escala no produce distancia real', () => {
  const result = measureDistance({ x: 0, y: 0 }, { x: 20, y: 0 }, { calibrated: false });
  assert.equal(result.meters, null);
  assert.equal(formatRealDistance(result), 'No se puede calcular una distancia real hasta calibrar la escala del plano.');
});

test('recalibrar reemplaza la escala y undo restaura la anterior', () => {
  const first = calibrateScale({ pointA: { x: 0, y: 0 }, pointB: { x: 100, y: 0 }, distanceMeters: 5 });
  const second = calibrateScale({ pointA: { x: 0, y: 0 }, pointB: { x: 100, y: 0 }, distanceMeters: 10 });
  const once = editorReducer(initialEditorState, { type: 'SET_SCALE', payload: first });
  const twice = editorReducer(once, { type: 'SET_SCALE', payload: second });
  assert.equal(twice.document.scale.pixelsPerMeter, 10);
  const undone = editorReducer(twice, { type: 'UNDO' });
  assert.equal(undone.document.scale.pixelsPerMeter, 20);
  assert.deepEqual(buildDocumentExport(undone.document).scale, first);
});

test('cambios y undo posteriores no destruyen una calibración existente', () => {
  const scale = calibrateScale({ pointA: { x: 0, y: 0 }, pointB: { x: 100, y: 0 }, distanceMeters: 5 });
  const calibrated = editorReducer(initialEditorState, { type: 'SET_SCALE', payload: scale });
  const changed = editorReducer(calibrated, { type: 'ADD_ELEMENT', payload: { id: 't1', type: 'text', text: 'x', x: 1, y: 1, layerId: calibrated.document.layers[0].id } });
  assert.deepEqual(editorReducer(changed, { type: 'UNDO' }).document.scale, scale);
});

test('transformar geométricamente la imagen invalida la escala sin inferir otra', () => {
  const scale = calibrateScale({ pointA: { x: 0, y: 0 }, pointB: { x: 100, y: 0 }, distanceMeters: 5 });
  const state = { ...initialEditorState, document: { ...initialEditorState.document, scale, elements: [{ id: 'plan', type: 'planImage', x: 0, y: 0, scaleX: 1, scaleY: 1 }] } };
  const changed = editorReducer(state, { type: 'UPDATE_ELEMENT', payload: { id: 'plan', patch: { scaleX: 2, userModified: true } } });
  assert.equal(changed.document.scale.calibrated, false);
  assert.match(changed.document.scale.invalidationReason, /cambió/);
});
