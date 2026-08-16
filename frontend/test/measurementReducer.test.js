import test from 'node:test';
import assert from 'node:assert/strict';
import { editorReducer, initialEditorState } from '../src/editor/store/editorReducer.js';

const width = { id: 'w1', type: 'width', label: '', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], pixels: 100, meters: 1, visible: true };
const area = { id: 'a1', type: 'area', label: 'Área', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }], pixels: 50, squareMeters: .5, visible: true };

test('agregar, editar, ocultar y eliminar mediciones participa de undo/redo', () => {
  const added = editorReducer(initialEditorState, { type: 'ADD_MEASUREMENT', payload: width });
  const hidden = editorReducer(added, { type: 'UPDATE_MEASUREMENT', payload: { id: 'w1', patch: { label: 'Puerta', visible: false } } });
  assert.equal(hidden.document.measurements[0].label, 'Puerta');
  assert.equal(hidden.document.measurements[0].visible, false);
  const removed = editorReducer(hidden, { type: 'REMOVE_MEASUREMENT', payload: 'w1' });
  assert.equal(removed.document.measurements.length, 0);
  assert.equal(editorReducer(removed, { type: 'UNDO' }).document.measurements.length, 1);
  assert.equal(editorReducer(editorReducer(removed, { type: 'UNDO' }), { type: 'REDO' }).document.measurements.length, 0);
});

test('eliminar una superficie elimina también su sector derivado', () => {
  const state = { ...initialEditorState, document: { ...initialEditorState.document, measurements: [area], sectors: [{ id: 's1', sourceMeasurementId: 'a1' }] } };
  const removed = editorReducer(state, { type: 'REMOVE_MEASUREMENT', payload: 'a1' });
  assert.deepEqual(removed.document.sectors, []);
});

test('asocia manualmente un ancho a un elemento en una sola operación', () => {
  const state = { ...initialEditorState, document: { ...initialEditorState.document, measurements: [width], measurementAssociations: [] } };
  const associated = editorReducer(state, { type: 'SET_MEASUREMENT_ASSOCIATION', payload: { elementId: 'door-1', widthMeasurementId: 'w1' } });
  assert.equal(associated.document.measurements[0].elementId, 'door-1');
  assert.deepEqual(associated.document.measurementAssociations, [{ elementId: 'door-1', widthMeasurementId: 'w1' }]);
});

test('recalibrar actualiza metros y superficie sin alterar los píxeles', () => {
  const state = { ...initialEditorState, document: { ...initialEditorState.document, measurements: [width, area], sectors: [{ id: 's1', sourceMeasurementId: 'a1', areaSquareMeters: .5 }] } };
  const recalibrated = editorReducer(state, { type: 'SET_SCALE', payload: { calibrated: true, pixelsPerMeter: 20 } });
  assert.equal(recalibrated.document.measurements[0].meters, 5);
  assert.equal(recalibrated.document.measurements[1].squareMeters, .125);
  assert.equal(recalibrated.document.sectors[0].areaSquareMeters, .125);
});

test('la ocupación manual de un sector participa de undo/redo', () => {
  const state = { ...initialEditorState, document: { ...initialEditorState.document, sectors: [{ id: 's1', name: 'Oficina', occupancy: null, occupancySource: null }] } };
  const updated = editorReducer(state, { type: 'UPDATE_SECTOR', payload: { id: 's1', patch: { occupancy: 12, occupancySource: 'manual' } } });
  assert.equal(updated.document.sectors[0].occupancy, 12);
  assert.equal(updated.document.sectors[0].occupancySource, 'manual');
  assert.equal(editorReducer(updated, { type: 'UNDO' }).document.sectors[0].occupancy, null);
});
