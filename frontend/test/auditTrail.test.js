import test from 'node:test';
import assert from 'node:assert/strict';
import { editorReducer, initialEditorState } from '../src/editor/store/editorReducer.js';

test('guarda eventos de análisis en la traza sin crear una versión de deshacer', () => {
  const state = editorReducer(initialEditorState, { type: 'APPEND_AUDIT_ENTRY', payload: { type: 'regulatory_analysis', date: '2026-08-07' } });
  assert.equal(state.document.auditTrail.length, 1);
  assert.equal(state.past.length, 0);
});

test('registra modificaciones manuales posteriores sobre elementos', () => {
  const withElement = { ...initialEditorState, document: { ...initialEditorState.document, elements: [{ id: 'ai-1', type: 'symbol', symbolId: 'alarm', x: 0, y: 0 }], auditTrail: [] } };
  const state = editorReducer(withElement, { type: 'UPDATE_ELEMENT', payload: { id: 'ai-1', patch: { x: 20, userModified: true } } });
  assert.equal(state.document.auditTrail[0].type, 'manual_element_modification');
  assert.equal(state.document.auditTrail[0].elementId, 'ai-1');
});
