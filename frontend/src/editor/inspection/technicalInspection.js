const CATEGORY_CONFIG = [
  { key: 'rooms', label: 'Ambientes detectados', description: 'Espacios funcionales delimitados dentro del plano.' },
  { key: 'doors', label: 'Puertas', description: 'Aberturas y conexiones entre ambientes o hacia el exterior.' },
  { key: 'stairs', label: 'Escaleras', description: 'Conexiones verticales visibles en el plano.' },
  { key: 'corridors', label: 'Pasillos', description: 'Áreas principales de circulación.' },
];

const averageConfidence = (items) => {
  const values = items.map((item) => item?.confidence).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
};

const statusForDetection = (count, confidence) => {
  if (!count) return 'unknown';
  if (confidence === null || confidence >= 0.75) return 'success';
  if (confidence >= 0.5) return 'warning';
  return 'danger';
};

const describeItem = (item, index) => item.label || item.name || item.id || `Elemento ${index + 1}`;

const pointInsideBounds = (point, bounds) => point && bounds
  && point.x >= bounds.x && point.x <= bounds.x + bounds.width
  && point.y >= bounds.y && point.y <= bounds.y + bounds.height;

const sectorHasExit = (sector, exits) => exits.some((exit) => (
  exit.sectorId === sector.id
  || sector.exitIds?.includes(exit.id)
  || pointInsideBounds(exit.center, sector.bounds)
));

export const buildTechnicalInspection = (analysis) => {
  if (!analysis) return null;

  const categories = CATEGORY_CONFIG.map((config) => {
    const items = Array.isArray(analysis[config.key]) ? analysis[config.key] : [];
    const confidence = averageConfidence(items);
    return {
      ...config,
      count: items.length,
      confidence,
      status: statusForDetection(items.length, confidence),
      details: items.map((item, index) => ({
        id: item.id || `${config.key}-${index}`,
        label: describeItem(item, index),
        confidence: Number.isFinite(item.confidence) ? item.confidence : null,
        description: item.category || item.orientation || 'Geometría detectada',
      })),
    };
  });

  const hazards = Array.isArray(analysis.hazards) ? analysis.hazards : [];
  const hazardConfidence = averageConfidence(hazards);
  categories.push({
    key: 'hazards',
    label: 'Riesgos',
    description: hazards.length ? 'Riesgos visibles que requieren revisión.' : 'No se identificaron riesgos visibles; la ausencia no confirma que no existan.',
    count: hazards.length,
    confidence: hazardConfidence,
    status: hazards.length ? 'warning' : 'unknown',
    details: hazards.map((item, index) => ({
      id: item.id || `hazard-${index}`,
      label: describeItem(item, index),
      confidence: Number.isFinite(item.confidence) ? item.confidence : null,
      description: item.type || item.description || 'Riesgo visible',
    })),
  });

  const sectors = Array.isArray(analysis.sectors) ? analysis.sectors : [];
  const exits = Array.isArray(analysis.emergencyExits) ? analysis.emergencyExits : [];
  const sectorsWithoutExit = sectors.filter((sector) => !sectorHasExit(sector, exits));
  const sectorConfidence = averageConfidence(sectorsWithoutExit);
  categories.push({
    key: 'sectorsWithoutExit',
    label: 'Sectores sin salida',
    description: sectors.length
      ? 'Sectores sin una salida asociada o ubicada dentro de sus límites.'
      : 'No hay sectores suficientes para evaluar cobertura de salidas.',
    count: sectorsWithoutExit.length,
    confidence: sectorConfidence,
    status: !sectors.length ? 'unknown' : sectorsWithoutExit.length ? 'danger' : 'success',
    details: sectorsWithoutExit.map((item, index) => ({
      id: item.id || `sector-${index}`,
      label: describeItem(item, index),
      confidence: Number.isFinite(item.confidence) ? item.confidence : null,
      description: 'No posee una salida de emergencia relacionada.',
    })),
  });

  const confidenceValues = categories.map(({ confidence }) => confidence).filter(Number.isFinite);
  const confidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : null;
  const detectedCorrectly = categories.filter(({ status }) => status === 'success').map(({ label }) => label);
  const couldNotDetect = categories.filter(({ status }) => status === 'unknown' || status === 'danger').map(({ label }) => label);

  return {
    categories,
    confidence,
    observations: Array.isArray(analysis.warnings) ? analysis.warnings : [],
    detectedCorrectly,
    couldNotDetect,
  };
};

export const confidenceLabel = (confidence) => {
  if (!Number.isFinite(confidence)) return 'No disponible';
  return `${Math.round(confidence * 100)}%`;
};
