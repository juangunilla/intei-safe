import test from 'node:test';
import assert from 'node:assert/strict';
import { editorReducer, initialEditorState } from '../src/editor/store/editorReducer.js';

const element = (id) => ({ id, type: 'text', text: id, layerId: initialEditorState.document.layers[0].id, x: 0, y: 0 });

test('borrar la selección elimina elementos y limpia IDs seleccionados', () => {
  let state = editorReducer(initialEditorState, { type: 'ADD_ELEMENTS', payload: [element('one'), element('two')] });
  state = editorReducer(state, { type: 'SELECT_ELEMENTS', payload: ['one'] });
  state = editorReducer(state, { type: 'DELETE_SELECTED' });
  assert.deepEqual(state.document.elements.map(({ id }) => id), ['two']);
  assert.deepEqual(state.selectedIds, []);
});

test('undo restaura un cambio del documento y redo lo vuelve a aplicar', () => {
  const changed = editorReducer(initialEditorState, { type: 'ADD_ELEMENT', payload: element('one') });
  const undone = editorReducer(changed, { type: 'UNDO' });
  assert.equal(undone.document.elements.length, 0);
  const redone = editorReducer(undone, { type: 'REDO' });
  assert.equal(redone.document.elements[0].id, 'one');
});

test('guardar un análisis no habilita ni ejecuta el motor gráfico', () => {
  const routingState = { ...initialEditorState, routingEnabled: true, routingRevision: 3, document: { ...initialEditorState.document, simulationModelDraft: { id: 'old' } } };
  const analyzed = editorReducer(routingState, { type: 'SET_BUILDING_ANALYSIS', payload: { walls: [], rooms: [] } });
  assert.equal(analyzed.routingEnabled, false);
  assert.deepEqual(analyzed.document.buildingAnalysis, { walls: [], rooms: [] });
  assert.equal(analyzed.document.elements.length, 0);
  assert.equal(analyzed.document.simulationModelDraft, null);
});

test('incorpora el modelo de simulación como una operación reversible', () => {
  const incorporated = editorReducer(initialEditorState, { type: 'INCORPORATE_SIMULATION_MODEL', payload: {
    layer: { id: 'sim-layer', name: 'Modelo de simulación confirmado', order: 1, visible: true, locked: false },
    sectors: [{ id: 'sim-sector-room-1', polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }] }],
    elements: [{ id: 'sim-exit-exit-1', type: 'symbol', symbolId: 'emergencyExit', x: 4, y: 5, layerId: 'sim-layer' }],
    draft: { id: 'draft-1', status: 'incorporated' },
  } });
  assert.equal(incorporated.document.sectors[0].id, 'sim-sector-room-1');
  assert.equal(incorporated.document.elements[0].sourceAnalysisId, undefined);
  assert.equal(incorporated.document.simulationModelDraft.status, 'incorporated');
  assert.equal(editorReducer(incorporated, { type: 'UNDO' }).document.sectors.length, 0);
});

test('aceptar una propuesta agrega capa y objetos en una sola entrada de historial', () => {
  const accepted = editorReducer(initialEditorState, { type: 'ACCEPT_PROPOSAL', payload: {
    layerId: 'proposal-layer', name: 'Propuesta IA aceptada',
    operations: [{ action: 'add', element: { type: 'symbol', symbolId: 'aed', x: 10, y: 20 } }],
  } });
  assert.equal(accepted.document.layers.at(-1).id, 'proposal-layer');
  assert.equal(accepted.document.elements[0].layerId, 'proposal-layer');
  assert.equal(accepted.past.length, 1);
  const undone = editorReducer(accepted, { type: 'UNDO' });
  assert.equal(undone.document.layers.length, initialEditorState.document.layers.length);
  assert.equal(undone.document.elements.length, 0);
});

test('abrir un proyecto restaura el documento y sus versiones de deshacer y rehacer', () => {
  const previous = { ...initialEditorState.document, version: 10 };
  const current = { ...initialEditorState.document, version: 11 };
  const future = { ...initialEditorState.document, version: 12 };
  const loaded = editorReducer(initialEditorState, { type: 'LOAD_PROJECT', payload: {
    document: current,
    past: [previous],
    future: [future],
  } });

  assert.equal(loaded.document.version, 11);
  assert.equal(loaded.past[0].version, 10);
  assert.equal(loaded.future[0].version, 12);
  assert.equal(loaded.routingEnabled, false);
});

test('selecciona, cambia y limpia una entidad geométrica fuera del historial', () => {
  const measurement = editorReducer(initialEditorState, { type: 'SET_GEOMETRIC_SELECTION', payload: { type: 'measurement', id: 'm1' } });
  assert.deepEqual(measurement.geometricSelection, { type: 'measurement', id: 'm1' });
  assert.equal(measurement.past.length, 0);
  const sector = editorReducer(measurement, { type: 'SET_GEOMETRIC_SELECTION', payload: { type: 'sector', id: 's1' } });
  assert.deepEqual(sector.geometricSelection, { type: 'sector', id: 's1' });
  assert.equal(editorReducer(sector, { type: 'CLEAR_GEOMETRIC_SELECTION' }).geometricSelection, null);
});

test('persiste resultados de simulación y mantiene reproducción fuera del documento', () => {
  const simulation = { id: 'sim-1', status: 'completed', engineVersion: '1.0.0', results: { evacuated: 3 } };
  const saved = editorReducer(initialEditorState, { type: 'SAVE_SIMULATION', payload: simulation });
  assert.deepEqual(saved.document.simulations, [simulation]);
  const playing = editorReducer(saved, { type: 'SET_SIMULATION_PLAYBACK', payload: { simulation, playing: true, elapsedSeconds: 2 } });
  assert.equal(playing.simulationPlayback.playing, true);
  assert.deepEqual(playing.document.simulations, [simulation]);
  assert.equal(editorReducer(playing, { type: 'CLEAR_SIMULATION_PLAYBACK' }).simulationPlayback.simulation, null);
});

test('persiste Advisor y permite cambiar estado de una observación', () => {
  const analysis = { engineVersion: '1.0.0', observations: [{ id: 'o1', status: 'open' }] };
  const saved = editorReducer(initialEditorState, { type: 'SET_ADVISOR_ANALYSIS', payload: analysis });
  assert.deepEqual(saved.document.advisorAnalysis, analysis);
  const reviewed = editorReducer(saved, { type: 'UPDATE_ADVISOR_OBSERVATION_STATUS', payload: { id: 'o1', status: 'in_review' } });
  assert.equal(reviewed.document.advisorAnalysis.observations[0].status, 'in_review');
});

test('marca Advisor desactualizado sin borrar observaciones ni agregar undo', () => {
  const analysis = { status: 'current', observations: [{ id: 'o1', status: 'open', evidence: [] }] };
  const saved = editorReducer(initialEditorState, { type: 'SET_ADVISOR_ANALYSIS', payload: analysis });
  const marked = editorReducer(saved, { type: 'MARK_ADVISOR_STALE' });
  assert.equal(marked.document.advisorAnalysis.status, 'stale');
  assert.equal(marked.document.advisorAnalysis.observations[0].id, 'o1');
  assert.equal(marked.past.length, saved.past.length);
});
