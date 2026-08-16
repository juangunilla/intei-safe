export const ESTABLISHMENT_FIELDS = [
  ['name', 'Nombre', 'required'], ['address', 'Domicilio', 'recommended'],
  ['country', 'País', 'required'], ['province', 'Provincia', 'required'], ['municipality', 'Municipio', 'required'],
  ['activity', 'Actividad', 'required'], ['establishmentType', 'Tipo de establecimiento', 'required'],
  ['buildingStatus', 'Condición del edificio', 'critical'], ['buildingUse', 'Uso del edificio', 'critical'],
  ['mainActivity', 'Actividad principal', 'critical'], ['numberOfFloors', 'Cantidad de plantas', 'critical'],
  ['totalCoveredAreaM2', 'Superficie cubierta', 'critical'], ['maximumOccupancy', 'Ocupación máxima', 'critical'],
  ['usualOccupancy', 'Ocupación habitual', 'recommended'],
];

export const CRITICAL_METADATA_FIELDS = ['buildingStatus', 'buildingUse', 'numberOfFloors', 'totalCoveredAreaM2', 'maximumOccupancy', 'riskClassification', 'exitCount', 'fireProtection'];

const metadata = (value, source = 'user') => ({ value, source, confirmed: false, updatedAt: '' });
const numericOrNull = (value) => value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);

export const createEstablishmentProfile = (profile = {}) => {
  profile = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
  const result = {
    country: 'Argentina', province: 'Buenos Aires', activity: 'oficina',
    buildingStatus: 'unknown', buildingUse: profile.establishmentType || '', mainActivity: profile.activity || 'oficina',
    numberOfFloors: numericOrNull(profile.floorCount), hasBasement: typeof profile.hasBasement === 'boolean' ? profile.hasBasement : null,
    hasMezzanine: typeof profile.hasMezzanine === 'boolean' ? profile.hasMezzanine : null,
    totalCoveredAreaM2: numericOrNull(profile.coveredArea), maximumOccupancy: numericOrNull(profile.maxOccupants),
    usualOccupancy: numericOrNull(profile.usualOccupants),
    riskClassification: { value: null, source: 'unknown', confirmedByProfessional: false, notes: '' },
    fireProtection: {
      extinguishers: { present: null, count: null }, hydrants: { present: null, count: null },
      automaticDetection: null, manualAlarm: null, sprinklers: null, emergencyLighting: null, emergencySignage: null,
    },
    egress: { exitCount: null, emergencyExitCount: null, stairCount: null, protectedStairs: null, alternativeRoutes: null },
    fieldMetadata: {},
    ...profile,
  };
  result.riskClassification = { value: null, source: 'unknown', confirmedByProfessional: false, notes: '', ...(profile.riskClassification || {}) };
  result.fireProtection = {
    extinguishers: { present: null, count: null, ...(profile.fireProtection?.extinguishers || {}) },
    hydrants: { present: null, count: null, ...(profile.fireProtection?.hydrants || {}) },
    automaticDetection: null, manualAlarm: null, sprinklers: null, emergencyLighting: null, emergencySignage: null,
    ...(profile.fireProtection || {}),
  };
  result.egress = { exitCount: null, emergencyExitCount: null, stairCount: null, protectedStairs: null, alternativeRoutes: null, ...(profile.egress || {}) };
  result.fieldMetadata = { ...CRITICAL_METADATA_FIELDS.reduce((all, key) => ({ ...all, [key]: metadata(key === 'exitCount' ? result.egress?.exitCount : result[key]) }), {}), ...(profile.fieldMetadata || {}) };
  return result;
};

export const getMissingProfileInformation = (profile = {}, levels = ['required']) => {
  profile = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
  return ESTABLISHMENT_FIELDS
    .filter(([, , level]) => levels.includes(level))
    .filter(([key]) => profile[key] === undefined || profile[key] === null || String(profile[key]).trim() === '')
    .map(([key, label, level]) => ({ key, label, level }));
};

export const updateFieldMetadata = (profile, key, value, patch = {}) => ({
  ...(profile.fieldMetadata || {})[key], value, source: 'user', confirmed: false,
  updatedAt: new Date().toISOString(), ...patch,
});
