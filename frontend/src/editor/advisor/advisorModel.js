export const ADVISOR_ENGINE_VERSION = '1.1.0';
export const ADVISOR_NARRATIVE_VERSION = '1.0.0';
export const ADVISOR_DISCLAIMER = 'Documento sujeto a revisión y validación profesional.';
export const ADVISOR_NARRATIVE_MODES = { deterministic: 'Determinístico', assisted: 'Asistido' };

export const ADVISOR_CATEGORIES = {
  regulatory: 'Normativa', simulation: 'Simulación', evacuation: 'Evacuación', profile: 'Perfil', geometry: 'Geometría',
  documentation: 'Documentación', missing_data: 'Datos faltantes', risk: 'Riesgo', ai: 'IA',
};
export const ADVISOR_PRIORITIES = ['critical', 'high', 'medium', 'low'];
export const ADVISOR_STATUSES = ['open', 'in_review', 'resolved', 'dismissed'];

export const observationEvidenceSelection = (evidence) => {
  if (evidence?.measurementId) return { type: 'measurement', id: evidence.measurementId, label: 'Ver medición' };
  if (evidence?.sectorId) return { type: 'sector', id: evidence.sectorId, label: 'Ver sector' };
  if (evidence?.routeId) return { type: 'route', id: evidence.routeId, label: 'Ver recorrido' };
  if (evidence?.exitId || evidence?.elementId) return { type: 'element', id: evidence.exitId || evidence.elementId, label: 'Ver elemento' };
  return null;
};
