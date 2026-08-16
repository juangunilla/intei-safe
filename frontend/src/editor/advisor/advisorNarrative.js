// Contrato estable para una futura mejora de redacción. Un renderer nunca debe
// crear observaciones ni modificar evidencia, prioridad, estado o recomendaciones.
export const deterministicAdvisorNarrative = (analysis) => analysis.executiveSummary;

export const renderAdvisorNarrative = (analysis, renderer = deterministicAdvisorNarrative) => renderer(analysis);

const outputKeys = new Set(['executiveSummary', 'observationNarratives', 'recommendationNarratives']);
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);

export const validateAdvisorNarrative = (input, output) => {
  if (!object(output) || Object.keys(output).some((key) => !outputKeys.has(key))) throw new Error('La narrativa contiene una estructura no permitida.');
  if (typeof output.executiveSummary !== 'string' || !object(output.observationNarratives) || !object(output.recommendationNarratives)) throw new Error('La narrativa no cumple el contrato permitido.');
  const observationIds = new Set((input.observations || []).map(({ id }) => id));
  const recommendationIds = new Set((input.recommendations || []).map((item, index) => object(item) && item.id ? item.id : String(index)));
  if (Object.keys(output.observationNarratives).length !== observationIds.size || Object.keys(output.observationNarratives).some((id) => !observationIds.has(id))) throw new Error('La narrativa intentó agregar, eliminar o referenciar una observación inexistente.');
  if (Object.keys(output.recommendationNarratives).length !== recommendationIds.size || Object.keys(output.recommendationNarratives).some((id) => !recommendationIds.has(id))) throw new Error('La narrativa intentó agregar una recomendación inexistente o eliminar una existente.');
  if (![output.executiveSummary, ...Object.values(output.observationNarratives), ...Object.values(output.recommendationNarratives)].every((text) => typeof text === 'string' && text.trim() && text.length <= 2200)) throw new Error('La narrativa contiene textos vacíos o demasiado extensos.');
  const evidenceIds = new Set((input.observations || []).flatMap(({ evidence = [] }) => evidence.flatMap((item) => ['ruleId', 'measurementId', 'sectorId', 'simulationId', 'routeId', 'exitId', 'elementId'].map((key) => item[key]).filter(Boolean))));
  const declaredReferences = output.referencedIds || [];
  if (declaredReferences.some((id) => !evidenceIds.has(id) && !observationIds.has(id))) throw new Error('La narrativa intentó inventar una referencia de evidencia.');
  return { executiveSummary: output.executiveSummary, observationNarratives: { ...output.observationNarratives }, recommendationNarratives: { ...output.recommendationNarratives } };
};

export const generateAdvisorNarrative = async (input, provider) => {
  if (!provider) throw new Error('No existe un proveedor de redacción asistida configurado.');
  const generate = typeof provider === 'function' ? provider : provider.generate;
  if (typeof generate !== 'function') throw new Error('El proveedor de narrativa no es válido.');
  return validateAdvisorNarrative(input, await generate(structuredClone(input)));
};

const narrativeObservations = (analysis) => (analysis?.observations || []).map((item) => ({
    id: item.id,
    category: item.category,
    priority: item.priority,
    title: item.title,
    description: item.description,
    evidenceText: item.evidence.map((evidence) => Object.entries(evidence).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' · ')).join(' | ') || 'Sin evidencia textual adicional',
    recommendation: item.recommendation,
    verifiabilityStatus: item.evidence.some(({ missingRequiredInputs }) => missingRequiredInputs?.length) ? 'not_verifiable' : 'requires_professional_review',
  }));

const narrativeInput = ({ projectId, analysis, observations }) => ({
    projectId,
    advisorEngineVersion: analysis.advisorEngineVersion,
    contextFingerprint: analysis.contextFingerprint,
    deterministicSummary: analysis.executiveSummary,
    observations,
    recommendations: observations.map((item) => ({ id: `recommendation-${item.id}`, text: item.recommendation })),
});

export const buildAdvisorNarrativeInput = ({ projectId, analysis }) => narrativeInput({ projectId, analysis, observations: narrativeObservations(analysis).slice(0, 40) });

export const buildAdvisorNarrativeBatches = ({ projectId, analysis, batchSize = 40, maxBatches = 6 }) => {
  const observations = narrativeObservations(analysis);
  if (observations.length > batchSize * maxBatches) throw new Error('El análisis supera el máximo de observaciones admitido para redacción asistida.');
  const batches = [];
  for (let index = 0; index < observations.length; index += batchSize) batches.push(narrativeInput({ projectId, analysis, observations: observations.slice(index, index + batchSize) }));
  return batches.length ? batches : [narrativeInput({ projectId, analysis, observations: [] })];
};
