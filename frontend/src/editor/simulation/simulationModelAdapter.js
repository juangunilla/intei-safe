import { calculateEvacuationRoutes } from '../routing/evacuationRouteEngine.js';

const pointOf = (item) => item?.center || (item?.bounds ? { x: item.bounds.x + item.bounds.width / 2, y: item.bounds.y + item.bounds.height / 2 } : null);
const polygonOf = (item) => Array.isArray(item?.polygon) && item.polygon.length >= 3 ? item.polygon : item?.bounds ? [
  { x: item.bounds.x, y: item.bounds.y },
  { x: item.bounds.x + item.bounds.width, y: item.bounds.y },
  { x: item.bounds.x + item.bounds.width, y: item.bounds.y + item.bounds.height },
  { x: item.bounds.x, y: item.bounds.y + item.bounds.height },
] : [];

const transformPoint = (point, transform = {}) => {
  const angle = (transform.rotation || 0) * Math.PI / 180;
  const sx = point.x * (transform.scaleX ?? 1); const sy = point.y * (transform.scaleY ?? 1);
  return { x: (transform.x || 0) + sx * Math.cos(angle) - sy * Math.sin(angle), y: (transform.y || 0) + sx * Math.sin(angle) + sy * Math.cos(angle) };
};

const candidateBase = (kind, item) => ({
  id: `candidate-${kind}-${item.id}`,
  analysisId: item.id,
  source: 'ai',
  confidence: Number.isFinite(item.confidence) ? item.confidence : null,
  reviewStatus: 'detected',
  disposition: 'pending',
  issues: [],
});

export const createSimulationModelDraft = (document, { createdBy = '', createdAt = new Date().toISOString() } = {}) => {
  const analysis = document?.buildingAnalysis;
  if (!analysis) throw new TypeError('Primero debés analizar el plano.');
  const transform = analysis.source?.canvasTransform || {};
  const detectedSectors = analysis.sectors?.length ? analysis.sectors : [...(analysis.rooms || []), ...(analysis.corridors || [])];
  const sectors = detectedSectors.map((item, index) => {
    const polygon = polygonOf(item).map((point) => transformPoint(point, transform));
    return {
      ...candidateBase('sector', item),
      operationalId: `sim-sector-${item.id}`,
      sourceAnalysisIds: [item.id, ...(item.roomIds || [])],
      name: item.label || `Sector detectado ${index + 1}`,
      type: item.category || 'otro',
      polygon,
      occupancy: null,
      occupancySource: null,
      geometryStatus: polygon.length >= 3 ? 'available' : 'invalid',
      issues: polygon.length >= 3 ? [] : ['No tiene un polígono utilizable.'],
    };
  });
  const exits = (analysis.emergencyExits || []).map((item, index) => {
    const point = pointOf(item);
    return {
      ...candidateBase('exit', item),
      operationalId: `sim-exit-${item.id}`,
      sourceDoorId: item.doorId || null,
      sourceSectorId: item.sectorId || null,
      label: item.label || `Salida detectada ${index + 1}`,
      point: point ? transformPoint(point, transform) : null,
      geometryStatus: point ? 'available' : 'invalid',
      issues: point ? [] : ['No tiene una ubicación geométrica utilizable.'],
    };
  });
  return {
    version: 1, id: crypto.randomUUID(), status: 'draft', source: 'ai', createdAt, createdBy,
    sourceAnalysisVersion: analysis.version || 1,
    sourceImageElementId: analysis.source?.imageElementId || null,
    sectors, exits, unresolved: [...(analysis.warnings || []).map((reason) => ({ status: 'not_verifiable', reason }))],
    reviewedAt: null, reviewedBy: null, incorporatedAt: null,
  };
};

export const updateSimulationCandidate = (draft, kind, id, patch) => ({
  ...draft,
  [kind]: (draft?.[kind] || []).map((item) => item.id === id ? { ...item, ...patch } : item),
});

export const reviewSimulationCandidate = (draft, kind, id, disposition, reviewer = '') => updateSimulationCandidate(draft, kind, id, {
  disposition,
  reviewStatus: disposition === 'accepted' ? 'professional_confirmed' : disposition === 'discarded' ? 'rejected' : 'detected',
  reviewedBy: disposition === 'pending' ? null : reviewer,
  reviewedAt: disposition === 'pending' ? null : new Date().toISOString(),
});

export const materializeSimulationModel = (document, draft, { reviewedBy = '', layerId = crypto.randomUUID(), incorporatedAt = new Date().toISOString() } = {}) => {
  const acceptedSectors = (draft?.sectors || []).filter((item) => item.disposition === 'accepted' && item.geometryStatus === 'available');
  const acceptedExits = (draft?.exits || []).filter((item) => item.disposition === 'accepted' && item.geometryStatus === 'available');
  const sectors = acceptedSectors.map((item) => ({
    id: item.operationalId, name: item.name, type: item.type, polygon: item.polygon, areaSquareMeters: null,
    occupancy: item.occupancy, occupancySource: item.occupancy === null ? null : (item.occupancySource || 'declared'),
    notes: '', source: item.source, lastModifiedSource: item.lastModifiedSource || null, reviewStatus: item.reviewStatus, sourceAnalysisId: item.analysisId,
    sourceAnalysisIds: item.sourceAnalysisIds, confirmedBy: item.reviewedBy || reviewedBy, confirmedAt: item.reviewedAt || incorporatedAt,
    simulationModelGenerated: true,
  }));
  const exits = acceptedExits.map((item) => ({
    id: item.operationalId, type: 'symbol', symbolId: 'emergencyExit', layerId,
    x: item.point.x - 24, y: item.point.y - 24, rotation: 0, scaleX: 1, scaleY: 1,
    label: item.label, source: item.source, lastModifiedSource: item.lastModifiedSource || null, reviewStatus: item.reviewStatus, sourceAnalysisId: item.analysisId,
    sourceDoorId: item.sourceDoorId, confirmedBy: item.reviewedBy || reviewedBy, confirmedAt: item.reviewedAt || incorporatedAt,
  }));
  const temporary = { ...document, sectors, elements: [...(document.elements || []).filter((item) => !(item.simulationModelGenerated)), ...exits] };
  const sourceToSector = new Map(acceptedSectors.flatMap((item) => item.sourceAnalysisIds.map((id) => [id, item.operationalId])));
  const exitMap = new Map(acceptedExits.map((item) => [item.analysisId, item.operationalId]));
  const routes = calculateEvacuationRoutes(temporary).filter((route) => sourceToSector.has(route.sourceId)).map((route) => ({
    ...route, id: `sim-route-${route.routeId}`, routeId: `sim-route-${route.routeId}`,
    sourceId: sourceToSector.get(route.sourceId), exitId: exitMap.get(route.exitId) || route.exitId,
    layerId, simulationModelGenerated: true, source: 'calculated', reviewStatus: 'professional_confirmed',
  })).filter((route) => acceptedExits.some((item) => item.operationalId === route.exitId));
  return {
    layer: { id: layerId, name: 'Modelo de simulación confirmado', visible: true, locked: false, order: document.layers.length },
    sectors, elements: [...exits.map((item) => ({ ...item, simulationModelGenerated: true })), ...routes],
    draft: { ...draft, status: 'incorporated', reviewedAt: incorporatedAt, reviewedBy, incorporatedAt },
  };
};
