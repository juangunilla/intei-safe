export const BUILDING_DETECTIONS = [
  ['walls', 'Muros'],
  ['rooms', 'Ambientes'],
  ['doors', 'Puertas'],
  ['windows', 'Ventanas'],
  ['corridors', 'Pasillos'],
  ['stairs', 'Escaleras'],
  ['emergencyExits', 'Salidas'],
  ['sectors', 'Sectores'],
  ['hazards', 'Riesgos visibles'],
];

export const getBuildingAnalysisCounts = (analysis) => Object.fromEntries(
  BUILDING_DETECTIONS.map(([key]) => [key, Array.isArray(analysis?.[key]) ? analysis[key].length : 0])
);
