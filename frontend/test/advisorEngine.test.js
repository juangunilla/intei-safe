import test from 'node:test';
import assert from 'node:assert/strict';
import { collectAdvisorContext, getAdvisorAnalysisStatus, runAdvisor, updateAdvisorObservationStatus } from '../src/editor/advisor/advisorEngine.js';
import { buildAdvisorContextFingerprint } from '../src/editor/advisor/advisorFingerprint.js';
import { ADVISOR_DISCLAIMER, ADVISOR_ENGINE_VERSION, ADVISOR_NARRATIVE_VERSION, observationEvidenceSelection } from '../src/editor/advisor/advisorModel.js';

const completeDocument = () => ({
  version: 1,
  establishmentProfile: { maximumOccupancy: 10, buildingStatus: 'existing', riskClassification: { value: 'Declarada' } },
  regulatoryAnalysis: { complianceChecks: [{ ruleId: 'r-ok', title: 'Control documentado', result: 'complies' }], profileCompleteness: { missingCritical: [] } },
  scale: { calibrated: true, pixelsPerMeter: 10 },
  measurements: [{ id: 'm1', type: 'width', meters: 1.2, confirmedByProfessional: true }],
  sectors: [{ id: 's1', name: 'Oficina', occupancy: 10 }],
  elements: [{ id: 'e1', type: 'symbol', symbolId: 'emergencyExit' }, { id: 'a1', type: 'arrow', routeId: 'r1', sourceId: 's1', exitId: 'e1' }],
  simulations: [{ id: 'sim-normal', name: 'Normal', status: 'completed', scenario: { blockedExitIds: [] }, agents: [], warnings: [], results: { totalOccupants: 10, evacuated: 10, blocked: 0, totalSimulationTimeSeconds: 40, exitUsage: [{ id: 'e1', count: 10 }] } }],
  buildingAnalysis: { rooms: [] }, auditTrail: [{ type: 'regulatory_analysis' }],
});

test('proyecto completo genera sólo observaciones sustentadas y resumen técnico', () => {
  const result = runAdvisor({ document: completeDocument(), generatedAt: '2026-08-07T12:00:00.000Z', generatedBy: 'Profesional' });
  assert.equal(result.disclaimer, ADVISOR_DISCLAIMER);
  assert.match(result.executiveSummary.general, /1 mediciones, 1 sectores, 1 recorridos/);
  assert.ok(result.observations.some(({ title }) => title.includes('Concentración de uso')));
  assert.ok(result.observations.every(({ evidence }) => evidence.length > 0));
});

test('proyecto incompleto identifica datos existentes faltantes sin inventar valores', () => {
  const document = completeDocument(); document.establishmentProfile = { buildingStatus: 'unknown', riskClassification: { value: null } }; document.scale = { calibrated: false }; document.measurements[0].confirmedByProfessional = false; document.sectors[0].occupancy = null;
  const result = runAdvisor({ document });
  const titles = result.observations.map(({ title }) => title);
  assert.ok(titles.includes('Ocupación máxima sin confirmar'));
  assert.ok(titles.includes('Clasificación de riesgo no declarada'));
  assert.ok(titles.includes('Plano sin escala física calibrada'));
  assert.ok(titles.includes('Mediciones pendientes de confirmación profesional'));
  assert.ok(result.observations.find(({ title }) => title.includes('Mediciones')).evidence[0].measurementId === 'm1');
});

test('proyecto sin simulación informa la ausencia sin ejecutar el motor', () => {
  const document = completeDocument(); document.simulations = [];
  const result = runAdvisor({ document });
  assert.ok(result.observations.some(({ title }) => title === 'No existen simulaciones ejecutadas'));
  assert.equal(result.sourceSummary.simulations, 0);
});

test('proyecto sin normativa informa resultado no disponible', () => {
  const document = completeDocument(); document.regulatoryAnalysis = null;
  assert.ok(runAdvisor({ document }).observations.some(({ title }) => title === 'Revisión normativa no ejecutada'));
});

test('proyecto sin perfil produce observación crítica', () => {
  const document = completeDocument(); document.establishmentProfile = null;
  const observation = runAdvisor({ document }).observations.find(({ title }) => title === 'Perfil técnico no informado');
  assert.equal(observation.priority, 'critical'); assert.equal(observation.evidence[0].path, 'establishmentProfile');
});

test('múltiples escenarios comparan resultados existentes', () => {
  const document = completeDocument();
  document.simulations.push({ id: 'sim-blocked', name: 'Principal bloqueada', status: 'completed', scenario: { blockedExitIds: ['e1'] }, agents: [{ id: 'x', status: 'blocked', sectorId: 's1' }], warnings: [], results: { totalOccupants: 10, evacuated: 9, blocked: 1, totalSimulationTimeSeconds: 64.4, exitUsage: [] } });
  const result = runAdvisor({ document });
  const comparison = result.observations.find(({ title }) => title.includes('Diferencia entre escenario'));
  assert.match(comparison.description, /61.0 %/);
  assert.equal(comparison.evidence[0].simulationId, 'sim-normal');
  assert.ok(result.observations.length > 1);
});

test('IDs son estables y estados previos se conservan al reanalizar', () => {
  const first = runAdvisor({ document: completeDocument(), generatedAt: 'a' });
  const changed = updateAdvisorObservationStatus(first, first.observations[0].id, 'in_review');
  const second = runAdvisor({ document: completeDocument(), previousAnalysis: changed, generatedAt: 'b' });
  assert.equal(second.observations[0].id, first.observations[0].id);
  assert.equal(second.observations[0].status, 'in_review');
});

test('contexto recopila resultados sin ejecutar otros motores', () => {
  const context = collectAdvisorContext(completeDocument());
  assert.equal(context.simulations.length, 1); assert.equal(context.routes[0].routeId, 'r1'); assert.equal(context.exits[0].id, 'e1');
});

test('advisorEngine no modifica ni recalcula el documento fuente', () => {
  const document = completeDocument(); const snapshot = structuredClone(document);
  runAdvisor({ document });
  assert.deepEqual(document, snapshot);
});

test('evidencia geométrica reutiliza focusEntity', () => {
  assert.deepEqual(observationEvidenceSelection({ measurementId: 'm1' }), { type: 'measurement', id: 'm1', label: 'Ver medición' });
  assert.deepEqual(observationEvidenceSelection({ routeId: 'r1' }), { type: 'route', id: 'r1', label: 'Ver recorrido' });
  assert.equal(observationEvidenceSelection({ simulationId: 'sim' }), null);
});

test('fingerprint es estable y no depende del orden de colecciones', () => {
  const first = completeDocument();
  first.measurements.push({ id: 'm2', type: 'distance', meters: 2 });
  first.sectors.push({ id: 's2', name: 'Pasillo', occupancy: 2 });
  const second = structuredClone(first);
  second.measurements.reverse(); second.sectors.reverse(); second.elements.reverse();
  assert.equal(buildAdvisorContextFingerprint(collectAdvisorContext(first)), buildAdvisorContextFingerprint(collectAdvisorContext(second)));
});

test('cambio técnico invalida y zoom no invalida', () => {
  const document = completeDocument();
  document.advisorAnalysis = runAdvisor({ document });
  assert.equal(getAdvisorAnalysisStatus(document), 'current');
  document.viewport = { scale: 2, x: 100, y: 50 };
  assert.equal(getAdvisorAnalysisStatus(document), 'current');
  document.measurements[0].meters = 1.3;
  assert.equal(getAdvisorAnalysisStatus(document), 'stale');
});

test('versiones del motor y narrativa forman parte de la vigencia', () => {
  const document = completeDocument();
  document.advisorAnalysis = runAdvisor({ document });
  assert.equal(document.advisorAnalysis.advisorEngineVersion, ADVISOR_ENGINE_VERSION);
  assert.equal(document.advisorAnalysis.advisorNarrativeVersion, ADVISOR_NARRATIVE_VERSION);
  document.advisorAnalysis.advisorEngineVersion = '0.9.0';
  assert.equal(getAdvisorAnalysisStatus(document), 'stale');
});

test('eliminación de entidad vinculada vuelve histórica su evidencia', () => {
  const document = completeDocument();
  document.measurements[0].confirmedByProfessional = false;
  document.advisorAnalysis = runAdvisor({ document });
  const evidenceItem = document.advisorAnalysis.observations.find(({ title }) => title.includes('Mediciones')).evidence[0];
  assert.equal(observationEvidenceSelection(evidenceItem).id, 'm1');
  document.measurements = [];
  assert.equal(getAdvisorAnalysisStatus(document), 'stale');
});
