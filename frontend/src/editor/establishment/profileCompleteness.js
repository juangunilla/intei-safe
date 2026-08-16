export const PROFILE_CRITICAL = [
  ['buildingStatus', 'Condición edificio nuevo/existente'], ['buildingUse', 'Uso del edificio'],
  ['mainActivity', 'Actividad principal'], ['numberOfFloors', 'Cantidad de plantas'],
  ['totalCoveredAreaM2', 'Superficie cubierta'], ['maximumOccupancy', 'Cantidad confirmada de ocupantes'],
  ['riskClassification.value', 'Clasificación de riesgo'], ['egress.exitCount', 'Cantidad de salidas'],
];
export const PROFILE_RECOMMENDED = [
  ['usualOccupancy', 'Ocupación habitual'], ['hasBasement', 'Existencia de subsuelo'], ['hasMezzanine', 'Existencia de entrepiso'],
  ['fireProtection.extinguishers.present', 'Presencia de extintores'], ['fireProtection.hydrants.present', 'Presencia de hidrantes'],
  ['fireProtection.automaticDetection', 'Detección automática'], ['fireProtection.manualAlarm', 'Alarma manual'],
  ['fireProtection.emergencyLighting', 'Iluminación de emergencia'], ['fireProtection.emergencySignage', 'Señalización de emergencia'],
  ['egress.emergencyExitCount', 'Cantidad de salidas de emergencia'], ['egress.stairCount', 'Cantidad de escaleras'],
];

export const getProfileValue = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
export const isProfileValuePresent = (value) => value !== null && value !== undefined && value !== '' && value !== 'unknown';

export const evaluateProfileCompleteness = (profile = {}) => {
  const missingCritical = PROFILE_CRITICAL.filter(([path]) => !isProfileValuePresent(getProfileValue(profile, path))).map(([, label]) => label);
  const missingRecommended = PROFILE_RECOMMENDED.filter(([path]) => !isProfileValuePresent(getProfileValue(profile, path))).map(([, label]) => label);
  const total = PROFILE_CRITICAL.length * 2 + PROFILE_RECOMMENDED.length;
  const completed = (PROFILE_CRITICAL.length - missingCritical.length) * 2 + PROFILE_RECOMMENDED.length - missingRecommended.length;
  const score = Math.round((completed / total) * 100);
  return { score, status: missingCritical.length === 0 ? 'sufficient' : score >= 20 ? 'partial' : 'insufficient', missingCritical, missingRecommended };
};
