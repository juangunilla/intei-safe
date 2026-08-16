const CRITICAL = [
  ['buildingStatus', 'Condición edificio nuevo/existente'], ['buildingUse', 'Uso del edificio'],
  ['mainActivity', 'Actividad principal'], ['numberOfFloors', 'Cantidad de plantas'],
  ['totalCoveredAreaM2', 'Superficie cubierta'], ['maximumOccupancy', 'Cantidad confirmada de ocupantes'],
  ['riskClassification.value', 'Clasificación de riesgo'], ['egress.exitCount', 'Cantidad de salidas'],
];
const RECOMMENDED = [
  ['usualOccupancy', 'Ocupación habitual'], ['hasBasement', 'Existencia de subsuelo'], ['hasMezzanine', 'Existencia de entrepiso'],
  ['fireProtection.extinguishers.present', 'Presencia de extintores'], ['fireProtection.hydrants.present', 'Presencia de hidrantes'],
  ['fireProtection.automaticDetection', 'Detección automática'], ['fireProtection.manualAlarm', 'Alarma manual'],
  ['fireProtection.emergencyLighting', 'Iluminación de emergencia'], ['fireProtection.emergencySignage', 'Señalización de emergencia'],
  ['egress.emergencyExitCount', 'Cantidad de salidas de emergencia'], ['egress.stairCount', 'Cantidad de escaleras'],
];

const getProfileValue = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
const isPresent = (value) => value !== null && value !== undefined && value !== '' && value !== 'unknown';
const missingRequiredInputs = (rule, profile) => (rule.requiredInputs || []).filter((path) => !isPresent(getProfileValue(profile, path)));

const evaluateProfileCompleteness = (profile = {}) => {
  const missingCritical = CRITICAL.filter(([path]) => !isPresent(getProfileValue(profile, path))).map(([, label]) => label);
  const missingRecommended = RECOMMENDED.filter(([path]) => !isPresent(getProfileValue(profile, path))).map(([, label]) => label);
  const total = CRITICAL.length * 2 + RECOMMENDED.length;
  const completed = (CRITICAL.length - missingCritical.length) * 2 + RECOMMENDED.length - missingRecommended.length;
  const score = Math.round((completed / total) * 100);
  return { score, status: missingCritical.length === 0 ? 'sufficient' : score >= 20 ? 'partial' : 'insufficient', missingCritical, missingRecommended };
};

module.exports = { evaluateProfileCompleteness, missingRequiredInputs, getProfileValue, isPresent };
