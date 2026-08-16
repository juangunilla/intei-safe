const nationalRules = require('./rules/ar/national');
const buenosAiresRules = require('./rules/ar/buenosAires');
const { missingProfileFields, validateRule } = require('./validation/regulatoryValidation');
const { validateWidth, validateRouteLength, validateArea, validateOccupancy, validateExitCapacity } = require('./validators/deterministicValidators');
const { evaluateProfileCompleteness, missingRequiredInputs } = require('./profile/profileCompleteness');

const ENGINE_VERSION = '1.2.0';
const normalize = (value) => String(value || '').trim().toLowerCase();

const allRules = [...nationalRules, ...buenosAiresRules].map(validateRule);

const getApplicableRules = (profile = {}) => allRules.filter((rule) => {
  if (!['argentina', 'ar'].includes(normalize(profile.country))) return false;
  const activities = Array.isArray(rule.activityType) ? rule.activityType : [rule.activityType];
  if (!activities.map(normalize).includes(normalize(profile.activity))) return false;
  if (rule.province && normalize(rule.province) !== normalize(profile.province)) return false;
  return true;
});

const asDetectedElements = (analysis = {}) => Object.entries(analysis).flatMap(([type, elements]) => Array.isArray(elements)
  ? elements.map((element) => ({
    type,
    x: element.center?.x ?? element.bounds?.x ?? element.start?.x ?? null,
    y: element.center?.y ?? element.bounds?.y ?? element.start?.y ?? null,
    confidence: element.confidence ?? null,
    source: `buildingAnalysis.${type}`,
    observations: element.label || '',
    status: 'detected',
  }))
  : []);

const routePixelLength = (element) => {
  if (element.type !== 'arrow' || !Array.isArray(element.points)) return null;
  let total = 0;
  for (let index = 0; index + 3 < element.points.length; index += 2) {
    total += Math.hypot(
      (element.points[index + 2] - element.points[index]) * Math.abs(element.scaleX ?? 1),
      (element.points[index + 3] - element.points[index + 1]) * Math.abs(element.scaleY ?? 1)
    );
  }
  return total;
};

const buildPhysicalMeasurements = (document = {}) => {
  const scale = document.scale || { calibrated: false };
  const calibrated = Boolean(scale.calibrated && scale.pixelsPerMeter > 0);
  const routeLengths = (document.elements || []).map((element) => ({ element, pixels: routePixelLength(element) }))
    .filter(({ pixels }) => pixels !== null)
    .map(({ element, pixels }) => ({
      elementId: element.id || null,
      routeId: element.routeId || null,
      sourceId: element.sourceId || null,
      exitId: element.exitId || null,
      role: element.routeRole || null,
      pixels,
      meters: calibrated ? pixels / scale.pixelsPerMeter : null,
      verifiable: calibrated,
    }));
  const widthMeasurements = (document.measurements || []).filter((measurement) => measurement.type === 'width').map((measurement) => ({
    id: measurement.id,
    label: measurement.label || '',
    elementId: measurement.elementId || null,
    pixels: measurement.pixels,
    meters: calibrated ? measurement.pixels / scale.pixelsPerMeter : null,
    verifiable: calibrated,
  }));
  const areas = (document.measurements || []).filter((measurement) => measurement.type === 'area').map((measurement) => ({
    id: measurement.id,
    label: measurement.label || '',
    polygon: measurement.points || [],
    squarePixels: measurement.pixels,
    squareMeters: calibrated ? measurement.pixels / (scale.pixelsPerMeter ** 2) : null,
    verifiable: calibrated,
  }));
  const sectors = (document.sectors || []).map((sector) => ({ ...sector }));
  return { scale, routeLengths, widthMeasurements, areas, sectors };
};

const analyzeRegulatory = ({ profile = {}, document = {} } = {}) => {
  const rules = getApplicableRules(profile);
  const missingInformation = missingProfileFields(profile);
  const detectedElements = asDetectedElements(document.buildingAnalysis);
  const proposedElements = (document.elements || []).filter((element) => element.aiGenerated).map((element) => ({
    type: element.type,
    symbolId: element.symbolId,
    x: element.x,
    y: element.y,
    confidence: element.confidence ?? null,
    source: element.source || 'ai-proposal',
    status: element.status || (element.proposalAccepted ? 'confirmed' : 'proposed'),
    justification: element.justification || '',
  }));
  const physicalMeasurements = buildPhysicalMeasurements(document);
  const profileCompleteness = evaluateProfileCompleteness(profile);
  const regulatoryContext = {
    buildingStatus: profile.buildingStatus || 'unknown', buildingUse: profile.buildingUse || '',
    mainActivity: profile.mainActivity || profile.activity || '', numberOfFloors: profile.numberOfFloors ?? null,
    totalCoveredAreaM2: profile.totalCoveredAreaM2 ?? null, maximumOccupancy: profile.maximumOccupancy ?? null,
    usualOccupancy: profile.usualOccupancy ?? null, hasBasement: profile.hasBasement ?? null, hasMezzanine: profile.hasMezzanine ?? null,
    riskClassification: profile.riskClassification || {},
    fireProtection: profile.fireProtection || {}, egress: profile.egress || {}, profileCompleteness,
  };
  const scopeSupported = rules.length > 0;
  const observations = missingInformation.length
    ? 'Información insuficiente para realizar una evaluación normativa completa.'
    : 'La geometría y las medidas requieren validación profesional; no se presume cumplimiento.';
  const genericChecks = rules.filter((rule) => !['AR-DEC-351-79-MEANS-OF-EGRESS', 'AR-DEC-351-79-OFFICE-OCCUPANCY'].includes(rule.id)).map((rule) => ({
    ruleId: rule.id,
    title: rule.title,
    result: 'not_verifiable',
    severity: rule.severity,
    measuredValue: null,
    requiredValue: null,
    unit: null,
    source: rule.source,
    sourceSection: rule.sourceSection,
    evidence: detectedElements.map((element, index) => ({ type: 'detectedElement', id: element.id || null, label: element.type, fields: { index, confidence: element.confidence, x: element.x, y: element.y } })),
    observations,
    recommendedAction: rule.id.includes('LOCAL')
      ? `Verificar la normativa vigente de ${profile.municipality || 'la jurisdicción municipal'}.`
      : 'Validar datos declarados, geometría, escala y condiciones reales con un profesional competente.',
    requiresProfessionalReview: true,
  }));
  const egressRule = rules.find((rule) => rule.id === 'AR-DEC-351-79-MEANS-OF-EGRESS');
  const occupancyRule = rules.find((rule) => rule.id === 'AR-DEC-351-79-OFFICE-OCCUPANCY');
  const egressChecks = egressRule ? [
    ...(physicalMeasurements.widthMeasurements.length
      ? physicalMeasurements.widthMeasurements.map((measurement) => validateWidth({ rule: egressRule, measurement }))
      : [validateWidth({ rule: egressRule })]),
    ...(physicalMeasurements.routeLengths.length
      ? physicalMeasurements.routeLengths.map((route) => validateRouteLength({ rule: egressRule, route }))
      : [validateRouteLength({ rule: egressRule })]),
    ...(physicalMeasurements.areas.length
      ? physicalMeasurements.areas.map((area) => validateArea({ rule: egressRule, area }))
      : [validateArea({ rule: egressRule })]),
    validateExitCapacity({ rule: egressRule }),
  ] : [];
  const occupancyChecks = occupancyRule ? (physicalMeasurements.sectors.filter((sector) => sector.type === 'oficina').length
    ? physicalMeasurements.sectors.filter((sector) => sector.type === 'oficina').map((sector) => validateOccupancy({ rule: occupancyRule, sector }))
    : [validateOccupancy({ rule: occupancyRule })]) : [];
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  const complianceChecks = [...genericChecks, ...occupancyChecks, ...egressChecks].map((check) => {
    const missingInputs = missingRequiredInputs(rulesById.get(check.ruleId) || {}, profile);
    if (!missingInputs.length) return check;
    return {
      ...check, result: 'not_verifiable', requiredValue: null,
      observations: `Faltan datos requeridos para aplicar esta regla: ${missingInputs.join(', ')}.`,
      missingRequiredInputs: missingInputs,
    };
  });

  return {
    status: 'preliminary',
    engineVersion: ENGINE_VERSION,
    jurisdiction: { country: profile.country || '', province: profile.province || '', municipality: profile.municipality || '' },
    applicableRules: rules,
    detectedElements,
    proposedElements,
    physicalMeasurements,
    regulatoryContext,
    profileCompleteness,
    complianceChecks,
    missingInformation,
    criticalWarnings: [
      ...(!scopeSupported ? ['La jurisdicción o actividad indicada no está configurada en esta versión del motor.'] : []),
      ...(missingInformation.length ? ['Información insuficiente para realizar una evaluación normativa completa.'] : []),
    ],
    recommendations: ['Revisar el resultado, la normativa local vigente y las condiciones reales del establecimiento.'],
    professionalReviewRequired: true,
  };
};

module.exports = { ENGINE_VERSION, getApplicableRules, analyzeRegulatory, buildPhysicalMeasurements };
