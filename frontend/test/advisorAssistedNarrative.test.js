import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdvisorNarrativeBatches, buildAdvisorNarrativeInput } from '../src/editor/advisor/advisorNarrative.js';
import { advisorReportSections } from '../src/editor/report/professionalReport.js';
import { editorReducer, initialEditorState } from '../src/editor/store/editorReducer.js';

const analysis = { advisorEngineVersion: '1.1.0', advisorNarrativeVersion: '1.0.0', contextFingerprint: 'fp', narrativeMode: 'deterministic', executiveSummary: { general: 'Estándar', strengths: [], relevantResults: [] }, observations: [{ id: 'o1', category: 'geometry', priority: 'high', title: 'Título', description: 'Descripción 1,2 m.', recommendation: 'Revisar 1,2 m.', evidence: [{ measurementId: 'm1' }], status: 'open' }] };

test('payload minimizado no incluye documento, imágenes ni historial', () => {
  const payload = buildAdvisorNarrativeInput({ projectId: 'p1', analysis });
  assert.deepEqual(Object.keys(payload), ['projectId', 'advisorEngineVersion', 'contextFingerprint', 'deterministicSummary', 'observations', 'recommendations']);
  assert.equal(payload.observations[0].id, 'o1'); assert.equal(JSON.stringify(payload).includes('auditTrail'), false);
});

test('divide observaciones numerosas en lotes controlados', () => {
  const many = { ...analysis, observations: Array.from({ length: 81 }, (_, index) => ({ ...analysis.observations[0], id: `o${index}` })) };
  assert.deepEqual(buildAdvisorNarrativeBatches({ projectId: 'p1', analysis: many }).map(({ observations }) => observations.length), [40, 40, 1]);
});

test('modo determinístico y asistido alimentan el informe sin alterar estructura', () => {
  assert.equal(advisorReportSections(analysis).summary[0], 'Estándar');
  const assisted = { ...analysis, narrativeMode: 'assisted', narrativeContextFingerprint: 'fp', assistedNarrative: { executiveSummary: 'Asistido', observationNarratives: { o1: 'Redacción asistida.' }, recommendationNarratives: { 'recommendation-o1': 'Recomendación asistida.' } } };
  assert.equal(advisorReportSections(assisted).summary[0], 'Asistido');
  assert.match(advisorReportSections(assisted).observations[0], /Redacción asistida/);
});

test('narrativa persistida conserva fingerprint y auditoría puede agregarse sin clave', () => {
  const saved = editorReducer(initialEditorState, { type: 'SET_ADVISOR_ANALYSIS', payload: analysis });
  const narrated = editorReducer(saved, { type: 'SET_ADVISOR_NARRATIVE', payload: { narrativeMode: 'assisted', narrativeContextFingerprint: 'fp', narrativeProvider: 'openai', narrativeModel: 'mock' } });
  const audited = editorReducer(narrated, { type: 'APPEND_AUDIT_ENTRY', payload: { type: 'advisor_narrative_generated', provider: 'openai', model: 'mock', fallbackUsed: false } });
  assert.equal(narrated.document.advisorAnalysis.narrativeContextFingerprint, 'fp');
  assert.equal(JSON.stringify(audited.document.auditTrail).includes('API_KEY'), false);
});
