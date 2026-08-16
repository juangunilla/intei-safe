import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAdvisorNarrative, validateAdvisorNarrative } from '../src/editor/advisor/advisorNarrative.js';

const input = {
  deterministicSummary: { general: 'Resumen técnico.' },
  observations: [{ id: 'obs-1', priority: 'high', evidence: [{ measurementId: 'm-1' }] }],
  recommendations: [{ id: 'rec-1', text: 'Revisar medición.' }],
  projectContext: {},
};

const validOutput = { executiveSummary: 'Resumen reformulado.', observationNarratives: { 'obs-1': 'Observación reformulada.' }, recommendationNarratives: { 'rec-1': 'Recomendación reformulada.' } };

test('narrativa asistida acepta únicamente reformulaciones de IDs existentes', async () => {
  assert.deepEqual(await generateAdvisorNarrative(input, async () => validOutput), validOutput);
});

test('narrativa no puede agregar observaciones', () => {
  assert.throws(() => validateAdvisorNarrative(input, { ...validOutput, observationNarratives: { 'obs-new': 'Inventada' } }), /inexistente/);
});

test('narrativa no puede inventar IDs ni ampliar el contrato', () => {
  assert.throws(() => validateAdvisorNarrative(input, { ...validOutput, recommendationNarratives: { 'rec-new': 'Inventada' } }), /inexistente/);
  assert.throws(() => validateAdvisorNarrative(input, { ...validOutput, newRuleIds: ['rule-new'] }), /estructura no permitida/);
});

test('modo asistido permanece inutilizable sin proveedor', async () => {
  await assert.rejects(generateAdvisorNarrative(input, null), /proveedor/);
});
