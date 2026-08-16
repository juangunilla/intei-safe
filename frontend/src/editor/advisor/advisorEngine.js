import { ADVISOR_DISCLAIMER, ADVISOR_ENGINE_VERSION, ADVISOR_NARRATIVE_VERSION } from './advisorModel.js';
import { advisorAnalysisStatus, buildAdvisorContextFingerprint } from './advisorFingerprint.js';

const finite = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const stableHash = (value) => {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
};
const percent = (part, total) => total > 0 ? part / total * 100 : null;
const evidence = (type, values = {}) => ({ type, ...values });

export const collectAdvisorContext = (document = {}) => ({
  documentVersion: document.version ?? null,
  profile: document.establishmentProfile || null,
  regulatoryAnalysis: document.regulatoryAnalysis || null,
  measurements: document.measurements || [], sectors: document.sectors || [],
  routes: (document.elements || []).filter(({ routeId }) => routeId),
  exits: (document.elements || []).filter((element) => element.type === 'symbol' && element.symbolId === 'emergencyExit'),
  allSimulations: document.simulations || [],
  simulations: (document.simulations || []).filter(({ status }) => status === 'completed'),
  buildingAnalysis: document.buildingAnalysis || null, auditTrail: document.auditTrail || [], scale: document.scale || { calibrated: false },
});

export const runAdvisor = ({ document = {}, previousAnalysis = null, generatedAt = new Date().toISOString(), generatedBy = '' } = {}) => {
  const context = collectAdvisorContext(document);
  const previousStatuses = new Map((previousAnalysis?.observations || []).map(({ id, status }) => [id, status]));
  const observations = [];
  const add = ({ category, priority, title, description, evidence: items, recommendation }) => {
    if (!items?.length) return;
    const signature = JSON.stringify([category, title, items]);
    const id = `advisor-${stableHash(signature)}`;
    observations.push({ id, category, priority, title, description, evidence: items, recommendation, requiresProfessionalReview: true, status: previousStatuses.get(id) || 'open' });
  };

  if (!context.profile) add({ category: 'missing_data', priority: 'critical', title: 'Perfil técnico no informado', description: 'El proyecto no contiene un perfil técnico del establecimiento.', evidence: [evidence('documentField', { path: 'establishmentProfile', value: null })], recommendation: 'Completar y validar profesionalmente el perfil técnico antes de interpretar resultados.' });
  if (context.profile) {
    if (!finite(context.profile.maximumOccupancy)) add({ category: 'profile', priority: 'high', title: 'Ocupación máxima sin confirmar', description: 'El perfil no contiene una ocupación máxima declarada.', evidence: [evidence('profileField', { path: 'maximumOccupancy', value: context.profile.maximumOccupancy ?? null })], recommendation: 'Confirmar la ocupación máxima con el profesional responsable.' });
    if (!context.profile.riskClassification?.value) add({ category: 'risk', priority: 'high', title: 'Clasificación de riesgo no declarada', description: 'No existe una clasificación de riesgo registrada en el perfil técnico.', evidence: [evidence('profileField', { path: 'riskClassification.value', value: null })], recommendation: 'Declarar y confirmar profesionalmente la clasificación de riesgo aplicable.' });
    if (context.profile.buildingStatus === 'unknown' || !context.profile.buildingStatus) add({ category: 'profile', priority: 'medium', title: 'Condición del edificio no informada', description: 'No se indicó si el edificio es nuevo o existente.', evidence: [evidence('profileField', { path: 'buildingStatus', value: context.profile.buildingStatus ?? null })], recommendation: 'Registrar la condición del edificio y su procedencia.' });
  }

  if (!context.regulatoryAnalysis) add({ category: 'documentation', priority: 'high', title: 'Revisión normativa no ejecutada', description: 'El proyecto no contiene resultados guardados de revisión normativa.', evidence: [evidence('documentField', { path: 'regulatoryAnalysis', value: null })], recommendation: 'Ejecutar la revisión normativa y someter sus resultados a evaluación profesional.' });
  if (context.regulatoryAnalysis) {
    const unverifiable = (context.regulatoryAnalysis.complianceChecks || []).filter(({ result }) => result === 'not_verifiable');
    if (unverifiable.length) add({ category: 'regulatory', priority: 'high', title: 'Controles normativos no verificables', description: `${unverifiable.length} controles permanecen sin información suficiente para verificarse.`, evidence: unverifiable.map((check) => evidence('rule', { ruleId: check.ruleId, title: check.title, missingRequiredInputs: check.missingRequiredInputs || [] })), recommendation: 'Completar los datos señalados y repetir la revisión sin interpretar el estado como aprobación.' });
    const missing = context.regulatoryAnalysis.profileCompleteness?.missingCritical || [];
    if (missing.length) add({ category: 'missing_data', priority: 'high', title: 'Información técnica crítica pendiente', description: `La revisión identifica ${missing.length} datos críticos faltantes.`, evidence: missing.map((label) => evidence('profileCompleteness', { label })), recommendation: 'Completar los datos críticos indicados y confirmar su procedencia.' });
  }

  if (!context.scale.calibrated) add({ category: 'geometry', priority: 'high', title: 'Plano sin escala física calibrada', description: 'Las distancias reales y los tiempos dependientes de longitud no pueden interpretarse físicamente.', evidence: [evidence('scale', { calibrated: false })], recommendation: 'Calibrar la escala mediante una distancia real conocida.' });
  const unconfirmedMeasurements = context.measurements.filter((item) => item.confirmedByProfessional !== true);
  if (unconfirmedMeasurements.length) add({ category: 'geometry', priority: 'medium', title: 'Mediciones pendientes de confirmación profesional', description: `${unconfirmedMeasurements.length} mediciones no registran confirmación profesional explícita.`, evidence: unconfirmedMeasurements.map((item) => evidence('measurement', { measurementId: item.id, measurementType: item.type, value: item.meters ?? item.squareMeters ?? item.pixels })), recommendation: 'Revisar las mediciones y registrar su confirmación profesional.' });
  const sectorsWithoutOccupancy = context.sectors.filter((sector) => !finite(sector.occupancy));
  if (sectorsWithoutOccupancy.length) add({ category: 'missing_data', priority: 'medium', title: 'Sectores sin ocupación confirmada', description: `${sectorsWithoutOccupancy.length} sectores no tienen ocupación disponible.`, evidence: sectorsWithoutOccupancy.map((sector) => evidence('sector', { sectorId: sector.id, name: sector.name })), recommendation: 'Declarar o confirmar la ocupación de cada sector utilizado en evaluaciones.' });
  const routesWithoutAssociation = context.routes.filter((route) => !route.sourceId || !route.exitId);
  if (routesWithoutAssociation.length) add({ category: 'evacuation', priority: 'medium', title: 'Recorridos con asociaciones incompletas', description: `${routesWithoutAssociation.length} recorridos no identifican completamente origen y salida.`, evidence: routesWithoutAssociation.map((route) => evidence('route', { routeId: route.routeId, sourceId: route.sourceId || null, exitId: route.exitId || null })), recommendation: 'Asociar cada recorrido con un origen y una salida existentes.' });

  if (!context.simulations.length) add({ category: 'simulation', priority: 'medium', title: 'No existen simulaciones ejecutadas', description: 'El proyecto no contiene resultados completos de simulación.', evidence: [evidence('documentCollection', { path: 'simulations', completedCount: 0 })], recommendation: 'Ejecutar al menos un escenario con parámetros declarados.' });
  context.simulations.forEach((simulation) => {
    if (simulation.results?.blocked > 0) add({ category: 'simulation', priority: 'high', title: `Agentes bloqueados en ${simulation.name}`, description: `${simulation.results.blocked} de ${simulation.results.totalOccupants} ocupantes simulados no alcanzaron una salida.`, evidence: [evidence('simulation', { simulationId: simulation.id, blocked: simulation.results.blocked, totalOccupants: simulation.results.totalOccupants }), ...simulation.agents.filter(({ status }) => status === 'blocked').slice(0, 20).map((agent) => evidence('sector', { sectorId: agent.sectorId, agentId: agent.id }))], recommendation: 'Revisar asociaciones de sectores, rutas, salidas, escala y bloqueos del escenario.' });
    const topExit = simulation.results?.exitUsage?.[0];
    const share = topExit ? percent(topExit.count, simulation.results.evacuated) : null;
    if (share !== null && share >= 50) add({ category: 'evacuation', priority: share >= 75 ? 'high' : 'medium', title: `Concentración de uso en la salida ${topExit.id}`, description: `La salida ${topExit.id} concentra ${share.toFixed(1)} % de los ocupantes evacuados en la simulación ${simulation.name}.`, evidence: [evidence('exit', { exitId: topExit.id, simulationId: simulation.id, count: topExit.count, percentage: share })], recommendation: 'Revisar profesionalmente la distribución de rutas y ejecutar escenarios alternativos sin modificar automáticamente el plano.' });
    const materialWarnings = (simulation.warnings || []).filter((warning) => !warning.startsWith('Simulación estimativa'));
    if (materialWarnings.length) add({ category: 'simulation', priority: 'medium', title: `Advertencias registradas en ${simulation.name}`, description: materialWarnings.join(' '), evidence: [evidence('simulation', { simulationId: simulation.id, warnings: materialWarnings })], recommendation: 'Resolver o documentar las condiciones señaladas antes de interpretar los tiempos.' });
  });

  const normal = context.simulations.find((item) => !(item.scenario?.blockedExitIds || []).length);
  const blocked = context.simulations.find((item) => (item.scenario?.blockedExitIds || []).length);
  if (normal && blocked && normal.results?.totalSimulationTimeSeconds > 0) {
    const increase = (blocked.results.totalSimulationTimeSeconds - normal.results.totalSimulationTimeSeconds) / normal.results.totalSimulationTimeSeconds * 100;
    add({ category: 'simulation', priority: increase > 50 || blocked.results.blocked > normal.results.blocked ? 'high' : 'medium', title: 'Diferencia entre escenario normal y salida bloqueada', description: `El escenario ${blocked.name} presenta una variación de ${increase.toFixed(1)} % en el tiempo total respecto de ${normal.name}.`, evidence: [evidence('simulationComparison', { simulationId: normal.id, comparedSimulationId: blocked.id, baseSeconds: normal.results.totalSimulationTimeSeconds, comparedSeconds: blocked.results.totalSimulationTimeSeconds, percentageDifference: increase })], recommendation: 'Analizar la diferencia y los agentes bloqueados con criterio profesional, sin interpretarla como aprobación.' });
  }

  if (!context.buildingAnalysis) add({ category: 'ai', priority: 'low', title: 'No existe análisis arquitectónico guardado', description: 'El proyecto no contiene resultados previos de análisis del plano.', evidence: [evidence('documentField', { path: 'buildingAnalysis', value: null })], recommendation: 'Analizar el plano si resulta necesario y validar profesionalmente todas las detecciones.' });
  if (!context.auditTrail.length) add({ category: 'documentation', priority: 'medium', title: 'Historial técnico vacío', description: 'No existen eventos registrados en la trazabilidad del documento.', evidence: [evidence('documentCollection', { path: 'auditTrail', count: 0 })], recommendation: 'Mantener registro de análisis, revisiones y modificaciones relevantes.' });

  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
  observations.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.title.localeCompare(b.title));
  const strengths = [
    ...(context.scale.calibrated ? ['El plano dispone de escala física calibrada.'] : []),
    ...(context.regulatoryAnalysis ? ['Existe una revisión normativa estructurada guardada.'] : []),
    ...(context.simulations.length ? [`Existen ${context.simulations.length} simulaciones ejecutadas y trazables.`] : []),
    ...(context.profile ? ['El proyecto contiene un perfil técnico del establecimiento.'] : []),
  ];
  const recommendations = [...new Set(observations.filter(({ status }) => status === 'open').map(({ recommendation }) => recommendation))];
  const critical = observations.filter(({ priority }) => ['critical', 'high'].includes(priority));
  const executiveSummary = {
    general: `Se analizaron ${context.measurements.length} mediciones, ${context.sectors.length} sectores, ${context.routes.length} recorridos, ${context.exits.length} salidas y ${context.simulations.length} simulaciones existentes. Se generaron ${observations.length} observaciones basadas exclusivamente en evidencia guardada.`,
    strengths,
    pendingItems: observations.filter(({ status }) => status === 'open').map(({ title }) => title),
    missingData: observations.filter(({ category }) => category === 'missing_data').map(({ title }) => title),
    relevantResults: context.simulations.map((item) => `${item.name}: ${item.results.evacuated || 0} evacuados, ${item.results.blocked || 0} bloqueados, ${Number(item.results.totalSimulationTimeSeconds || 0).toFixed(1)} s.`),
    criticalObservations: critical.map(({ title }) => title), recommendations,
  };
  return { engineVersion: ADVISOR_ENGINE_VERSION, advisorEngineVersion: ADVISOR_ENGINE_VERSION, advisorNarrativeVersion: ADVISOR_NARRATIVE_VERSION, narrativeMode: 'deterministic', generatedAt, generatedBy, contextFingerprint: buildAdvisorContextFingerprint(context), status: 'current', disclaimer: ADVISOR_DISCLAIMER, executiveSummary, observations, sourceSummary: { measurements: context.measurements.length, sectors: context.sectors.length, routes: context.routes.length, exits: context.exits.length, simulations: context.simulations.length, auditEntries: context.auditTrail.length } };
};

export const getAdvisorAnalysisStatus = (document = {}) => advisorAnalysisStatus(document.advisorAnalysis, collectAdvisorContext(document));

export const updateAdvisorObservationStatus = (analysis, observationId, status) => ({ ...analysis, observations: analysis.observations.map((item) => item.id === observationId ? { ...item, status } : item) });
