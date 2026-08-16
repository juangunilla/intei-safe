import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultDocument,
  EDITOR_DOCUMENT_SCHEMA_VERSION,
  normalizeEditorDocument,
} from '../src/editor/types.js';
import { editorReducer, initialEditorState } from '../src/editor/store/editorReducer.js';
import { validateDocument } from '../src/editor/io/planFileLoader.js';
import { createProjectBundle, restoreProjectBundle } from '../src/editor/io/projectBundle.js';

const legacyDocument = () => ({
  version: 1,
  layers: [{ id: 'legacy-layer', name: 'Plano', visible: true, locked: false, order: 0 }],
  elements: [],
  activeLayerId: 'legacy-layer',
  viewport: { scale: 1, x: 0, y: 0 },
});

test('normaliza un proyecto antiguo con las colecciones y análisis actuales', () => {
  const normalized = normalizeEditorDocument({ ...legacyDocument(), customLegacyField: { kept: true } });
  assert.deepEqual(normalized.sectors, []);
  assert.deepEqual(normalized.measurements, []);
  assert.deepEqual(normalized.simulations, []);
  assert.equal(normalized.simulationModelDraft, null);
  assert.deepEqual(normalized.corporateTemplates, []);
  assert.deepEqual(normalized.corporateAssets, {});
  assert.equal(normalized.advisorAnalysis, null);
  assert.equal(normalized.establishmentProfile, null);
  assert.equal(normalized.buildingAnalysis, null);
  assert.equal(normalized.regulatoryAnalysis, null);
  assert.deepEqual(normalized.scale, { calibrated: false });
  assert.deepEqual(normalized.customLegacyField, { kept: true });
  assert.equal(normalized.schemaVersion, EDITOR_DOCUMENT_SCHEMA_VERSION);
});

test('la normalización es idempotente y no modifica datos actuales', () => {
  const current = createDefaultDocument();
  current.sectors = [{ id: 's1' }];
  current.measurements = [{ id: 'm1' }];
  current.simulations = [{ id: 'sim1' }];
  current.simulationModelDraft = { id: 'draft-1', status: 'draft' };
  current.corporateTemplates = [{ id: 't1' }];
  current.advisorAnalysis = { id: 'a1' };
  current.unknownFutureProperty = 'preserved';
  const once = normalizeEditorDocument(current);
  const twice = normalizeEditorDocument(once);
  assert.deepEqual(twice, once);
  assert.deepEqual(once, current);
});

test('LOAD_PROJECT normaliza documento e historial recuperados', () => {
  const loaded = editorReducer(initialEditorState, {
    type: 'LOAD_PROJECT',
    payload: { document: legacyDocument(), past: [legacyDocument()], future: [legacyDocument()] },
  });
  for (const document of [loaded.document, ...loaded.past, ...loaded.future]) {
    assert.deepEqual(document.sectors, []);
    assert.deepEqual(document.measurements, []);
    assert.deepEqual(document.simulations, []);
  }
});

test('Simulation Workspace puede abrir un documento sin sectores', () => {
  const loaded = editorReducer(initialEditorState, {
    type: 'LOAD_PROJECT',
    payload: { document: legacyDocument(), past: [], future: [] },
  });
  assert.equal(loaded.document.sectors.length, 0);
  assert.equal(loaded.document.measurements.length, 0);
  assert.equal(loaded.document.simulations.length, 0);
});

test('UNDO y REDO normalizan snapshots antiguos', () => {
  const state = { ...initialEditorState, past: [legacyDocument()], future: [legacyDocument()] };
  const undone = editorReducer(state, { type: 'UNDO' });
  assert.deepEqual(undone.document.sectors, []);
  const redone = editorReducer({ ...undone, future: [legacyDocument()] }, { type: 'REDO' });
  assert.deepEqual(redone.document.measurements, []);
});

test('la importación JSON antigua devuelve un documento normalizado', () => {
  const imported = validateDocument(legacyDocument());
  assert.deepEqual(imported.sectors, []);
  assert.deepEqual(imported.corporateTemplates, []);
  assert.equal(imported.advisorAnalysis, null);
});

test('recupera persistencia MongoDB antigua sin formato bundle', () => {
  const restored = restoreProjectBundle({ document: legacyDocument(), past: [legacyDocument()], future: [] });
  assert.deepEqual(restored.document.simulations, []);
  assert.deepEqual(restored.past[0].measurements, []);
});

test('restaura un bundle antiguo y normaliza todas sus versiones', () => {
  const current = createDefaultDocument();
  const bundle = createProjectBundle({ state: { document: current, past: [], future: [] }, user: null });
  delete bundle.versions[0].document.sectors;
  delete bundle.versions[0].document.measurements;
  delete bundle.versions[0].document.simulations;
  const restored = restoreProjectBundle(bundle);
  assert.deepEqual(restored.document.sectors, []);
  assert.deepEqual(restored.document.measurements, []);
  assert.deepEqual(restored.document.simulations, []);
});
