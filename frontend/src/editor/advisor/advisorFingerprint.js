import { ADVISOR_ENGINE_VERSION, ADVISOR_NARRATIVE_VERSION } from './advisorModel.js';

const UNORDERED_COLLECTIONS = new Set([
  'measurements', 'sectors', 'routes', 'exits', 'simulations', 'complianceChecks',
  'applicableRules', 'doors', 'corridors', 'emergencyExits', 'stairs', 'rooms',
  'blockedExitIds', 'blockedRouteIds', 'exitUsage', 'routeUsage', 'routeLoad',
]);

const identity = (value) => value?.id ?? value?.ruleId ?? value?.routeId ?? value?.measurementId
  ?? value?.sectorId ?? value?.exitId ?? value?.elementId ?? value?.name ?? null;

export const stableAdvisorValue = (value, key = '') => {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return Number.isNaN(value) ? null : value;
  if (Array.isArray(value)) {
    const normalized = value.map((item) => stableAdvisorValue(item, key));
    if (!UNORDERED_COLLECTIONS.has(key)) return normalized;
    return normalized.sort((a, b) => {
      const aKey = identity(a) ?? JSON.stringify(a);
      const bKey = identity(b) ?? JSON.stringify(b);
      return String(aKey).localeCompare(String(bKey));
    });
  }
  return Object.fromEntries(Object.keys(value).sort().map((childKey) => [childKey, stableAdvisorValue(value[childKey], childKey)]));
};

export const stableAdvisorStringify = (value) => JSON.stringify(stableAdvisorValue(value));

const hash = (value) => {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return (result >>> 0).toString(16).padStart(8, '0');
};

export const buildAdvisorContextFingerprint = (context = {}) => `advisor-context-v1-${hash(stableAdvisorStringify({
  documentVersion: context.documentVersion ?? null,
  profile: context.profile ?? null,
  scale: context.scale ?? null,
  measurements: context.measurements || [],
  sectors: context.sectors || [],
  routes: context.routes || [],
  exits: context.exits || [],
  simulations: context.allSimulations || context.simulations || [],
  regulatoryAnalysis: context.regulatoryAnalysis ?? null,
  buildingAnalysis: context.buildingAnalysis ?? null,
}))}`;

export const advisorAnalysisStatus = (analysis, context) => {
  if (!analysis) return null;
  const currentFingerprint = buildAdvisorContextFingerprint(context);
  return analysis.contextFingerprint === currentFingerprint
    && analysis.advisorEngineVersion === ADVISOR_ENGINE_VERSION
    && analysis.advisorNarrativeVersion === ADVISOR_NARRATIVE_VERSION
    ? 'current' : 'stale';
};
