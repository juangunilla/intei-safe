const MAX_OBSERVATIONS = 40;
const MAX_INPUT_TEXT = 1800;
const MAX_OUTPUT_TEXT = 2200;

const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));

const deterministicCorpus = (input) => JSON.stringify({
  deterministicSummary: input.deterministicSummary,
  observations: input.observations,
  recommendations: input.recommendations,
});

const technicalNumbers = (text) => new Set((String(text).match(/\b\d+(?:[.,]\d+)?\s*(?:%|m²|m2|m|min|s|cm|mm|personas?|ocupantes?)?/gi) || [])
  .map((value) => normalize(value).replace(',', '.').replace(/\s+/g, '')));

const normativeReferences = (text) => String(text).match(/\b(?:ley|decreto|resoluci[oó]n|iram|art[ií]culo|apartado)\s*(?:n[°ºo]\s*)?[a-z0-9./-]+/gi) || [];
const entityReferences = (text) => String(text).match(/\b(?:sector|salida|ruta|establecimiento|profesional)\s+[A-ZÁÉÍÓÚÑ0-9][\wÁÉÍÓÚáéíóúÑñ.-]*(?:\s+[A-ZÁÉÍÓÚÑ0-9][\wÁÉÍÓÚáéíóúÑñ.-]*){0,3}/g) || [];
const forbiddenPhrases = ['cumple con', 'cumple la normativa', 'esta aprobado', 'certificado', 'garantiza', 'es seguro', 'cumplimiento total', 'aprobado legalmente'];

const validateTextSafety = (input, output) => {
  const source = deterministicCorpus(input);
  const sourceNormalized = normalize(source);
  const outputText = JSON.stringify(output);
  const outputNormalized = normalize(outputText);
  for (const phrase of forbiddenPhrases) {
    if (outputNormalized.includes(phrase) && !sourceNormalized.includes(phrase)) throw new Error(`Frase de certificación no permitida: ${phrase}`);
  }
  for (const reference of normativeReferences(outputText)) {
    if (!sourceNormalized.includes(normalize(reference))) throw new Error(`Referencia normativa no suministrada: ${reference}`);
  }
  const allowedNumbers = technicalNumbers(source);
  for (const number of technicalNumbers(outputText)) {
    if (!allowedNumbers.has(number)) throw new Error(`Número técnico no suministrado: ${number}`);
  }
  for (const entity of entityReferences(outputText)) {
    if (!sourceNormalized.includes(normalize(entity))) throw new Error(`Entidad técnica no suministrada: ${entity}`);
  }
};

const validateInputItem = (item, fields, label) => {
  if (!item || typeof item !== 'object' || !nonEmpty(item.id)) throw new Error(`${label}: id obligatorio`);
  for (const field of fields) if (!nonEmpty(item[field]) || item[field].length > MAX_INPUT_TEXT) throw new Error(`${label}: ${field} inválido`);
};

const validateAdvisorNarrativeInput = (input) => {
  if (!input || typeof input !== 'object') throw new Error('Solicitud de narrativa inválida');
  if (!exactKeys(input, ['projectId', 'advisorEngineVersion', 'contextFingerprint', 'deterministicSummary', 'observations', 'recommendations'])) throw new Error('La solicitud contiene propiedades no permitidas');
  if (!nonEmpty(input.projectId) || !nonEmpty(input.advisorEngineVersion) || !nonEmpty(input.contextFingerprint)) throw new Error('Faltan metadatos del análisis');
  if (!input.deterministicSummary || typeof input.deterministicSummary !== 'object' || JSON.stringify(input.deterministicSummary).length > 12000) throw new Error('deterministicSummary es obligatorio o demasiado extenso');
  if (!Array.isArray(input.observations) || input.observations.length > MAX_OBSERVATIONS) throw new Error(`Se permiten hasta ${MAX_OBSERVATIONS} observaciones por solicitud`);
  if (!Array.isArray(input.recommendations) || input.recommendations.length > MAX_OBSERVATIONS) throw new Error(`Se permiten hasta ${MAX_OBSERVATIONS} recomendaciones por solicitud`);
  const observationIds = new Set();
  input.observations.forEach((item, index) => {
    if (!exactKeys(item, ['id', 'category', 'priority', 'title', 'description', 'evidenceText', 'recommendation', 'verifiabilityStatus'])) throw new Error(`Observación ${index + 1}: propiedades no permitidas`);
    validateInputItem(item, ['category', 'priority', 'title', 'description', 'evidenceText', 'recommendation', 'verifiabilityStatus'], `Observación ${index + 1}`);
    if (observationIds.has(item.id)) throw new Error('IDs de observación duplicados');
    observationIds.add(item.id);
  });
  const recommendationIds = new Set();
  input.recommendations.forEach((item, index) => {
    if (!exactKeys(item, ['id', 'text'])) throw new Error(`Recomendación ${index + 1}: propiedades no permitidas`);
    validateInputItem(item, ['text'], `Recomendación ${index + 1}`);
    if (recommendationIds.has(item.id)) throw new Error('IDs de recomendación duplicados');
    recommendationIds.add(item.id);
  });
  return input;
};

const validateMap = (map, ids, label) => {
  if (!exactKeys(map, ids)) throw new Error(`${label}: los IDs no coinciden exactamente`);
  Object.values(map).forEach((value) => {
    if (!nonEmpty(value) || value.length > MAX_OUTPUT_TEXT) throw new Error(`${label}: texto vacío o demasiado extenso`);
  });
};

const validateAdvisorNarrativeOutput = (input, output) => {
  if (!exactKeys(output, ['executiveSummary', 'observationNarratives', 'recommendationNarratives'])) throw new Error('La respuesta contiene propiedades no permitidas');
  if (!nonEmpty(output.executiveSummary) || output.executiveSummary.length > MAX_OUTPUT_TEXT) throw new Error('Resumen ejecutivo inválido');
  validateMap(output.observationNarratives, input.observations.map(({ id }) => id), 'Observaciones');
  validateMap(output.recommendationNarratives, input.recommendations.map(({ id }) => id), 'Recomendaciones');
  validateTextSafety(input, output);
  return output;
};

const deterministicFallback = (input) => ({
  executiveSummary: input.deterministicSummary.general || 'Resumen técnico no disponible.',
  observationNarratives: Object.fromEntries(input.observations.map((item) => [item.id, item.description])),
  recommendationNarratives: Object.fromEntries(input.recommendations.map((item) => [item.id, item.text])),
});

module.exports = { MAX_OBSERVATIONS, deterministicFallback, validateAdvisorNarrativeInput, validateAdvisorNarrativeOutput };
