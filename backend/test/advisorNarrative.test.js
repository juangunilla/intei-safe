const test = require('node:test');
const assert = require('node:assert/strict');
const AdvisorNarrativeProvider = require('../src/advisor/AdvisorNarrativeProvider');
const AdvisorNarrativeService = require('../src/advisor/AdvisorNarrativeService');
const { validateAdvisorNarrativeOutput } = require('../src/advisor/advisorNarrativeValidation');

const input = () => ({
  projectId: 'project-1', advisorEngineVersion: '1.1.0', contextFingerprint: 'fp-1',
  deterministicSummary: { general: 'La salida norte concentra 74 % de 10 ocupantes. Estado no verificable.' },
  observations: [{ id: 'obs-1', category: 'simulation', priority: 'high', title: 'Concentración', description: 'La salida norte concentra 74 % de 10 ocupantes.', evidenceText: 'exitId: salida-norte; 74 %', recommendation: 'Revisar la salida norte.', verifiabilityStatus: 'not_verifiable' }],
  recommendations: [{ id: 'rec-1', text: 'Revisar la salida norte.' }],
});
const valid = () => ({ executiveSummary: 'La salida norte concentra 74 % de 10 ocupantes y permanece no verificable.', observationNarratives: { 'obs-1': 'Se registra una concentración de 74 % en la salida norte para 10 ocupantes.' }, recommendationNarratives: { 'rec-1': 'Se recomienda revisar la salida norte.' } });

test('acepta respuesta válida con IDs exactos', () => assert.deepEqual(validateAdvisorNarrativeOutput(input(), valid()), valid()));
test('rechaza ID inventado y observación extra', () => assert.throws(() => validateAdvisorNarrativeOutput(input(), { ...valid(), observationNarratives: { ...valid().observationNarratives, 'obs-2': 'Extra' } }), /IDs/));
test('rechaza recomendación extra', () => assert.throws(() => validateAdvisorNarrativeOutput(input(), { ...valid(), recommendationNarratives: { ...valid().recommendationNarratives, 'rec-2': 'Extra' } }), /IDs/));
test('rechaza número técnico inventado', () => assert.throws(() => validateAdvisorNarrativeOutput(input(), { ...valid(), executiveSummary: 'La salida norte concentra 85 %.' }), /Número técnico/));
test('rechaza norma inventada', () => assert.throws(() => validateAdvisorNarrativeOutput(input(), { ...valid(), executiveSummary: 'Aplica Decreto 351/79.' }), /normativa/));
test('rechaza frase de certificación inexistente en la fuente', () => assert.throws(() => validateAdvisorNarrativeOutput(input(), { ...valid(), executiveSummary: 'El proyecto cumple la normativa.' }), /certificación/));

test('provider exige JSON Schema estricto y usa cliente mock', async () => {
  let request;
  const client = { responses: { create: async (body) => { request = body; return { output_text: JSON.stringify(valid()) }; } } };
  const provider = new AdvisorNarrativeProvider({ client, model: 'test-model' });
  assert.deepEqual(await provider.generate(input()), valid());
  assert.equal(request.text.format.strict, true); assert.equal(request.text.format.schema.additionalProperties, false);
});

test('JSON inválido usa fallback determinístico', async () => {
  const provider = { model: 'mock', generate: async () => JSON.parse('{') };
  const result = await new AdvisorNarrativeService({ provider, configured: true }).generate(input());
  assert.equal(result.fallbackUsed, true); assert.equal(result.narrativeMode, 'deterministic');
});

test('timeout y error de provider usan fallback', async () => {
  const timeout = new Error('timeout'); timeout.name = 'TimeoutError';
  const timed = await new AdvisorNarrativeService({ provider: { model: 'mock', generate: async () => { throw timeout; } }, configured: true }).generate(input());
  const failed = await new AdvisorNarrativeService({ provider: { model: 'mock', generate: async () => { throw new Error('red'); } }, configured: true }).generate(input());
  assert.equal(timed.validationResult, 'timeout'); assert.equal(failed.fallbackUsed, true);
});

test('modelo sin configurar informa capacidad no disponible y fallback', async () => {
  const service = new AdvisorNarrativeService();
  assert.equal(service.capabilities().available, false);
  assert.equal((await service.generate(input())).validationResult, 'provider_not_configured');
  assert.throws(() => new AdvisorNarrativeProvider({ client: {}, model: '' }), /model/);
});

test('no envía projectId al proveedor y rechaza campos privados adicionales', async () => {
  let received;
  const service = new AdvisorNarrativeService({ provider: { model: 'mock', generate: async (payload) => { received = payload; return valid(); } }, configured: true });
  assert.equal((await service.generate(input())).fallbackUsed, false);
  assert.equal(received.projectId, undefined);
  await assert.rejects(service.generate({ ...input(), document: { images: ['secret'] } }), /propiedades no permitidas/);
});
