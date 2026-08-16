const REQUIRED_SYMBOLS = [
  ['emergencyExit', 'Salidas detectadas', 18],
  ['extinguisher', 'Extintores', 10],
  ['alarm', 'Alarmas', 8],
  ['firstAid', 'Botiquines', 7],
];

const SCORE_WEIGHTS = { exits: 20, routes: 20, signage: 15, equipment: 20, observations: 10, routedSectors: 15 };
const SIGNAGE_SYMBOLS = new Set(['emergencyExit', 'evacuationRoute', 'assemblyPoint', 'youAreHere', 'stairs', 'emergencyLight', 'noElevator']);
const EQUIPMENT_SYMBOLS = new Set(['extinguisher', 'alarm', 'firstAid', 'aed', 'fireHose', 'cabinet']);
const coverage = (quantity, target) => target > 0 ? Math.min(quantity / target, 1) : 0;

const routeLength = (element) => {
  const points = element.points || [];
  let total = 0;
  for (let index = 2; index < points.length; index += 2) total += Math.hypot(points[index] - points[index - 2], points[index + 1] - points[index - 1]);
  return total;
};

export const inspectEvacuationPlan = (document) => {
  const analysis = document.buildingAnalysis;
  const symbols = document.elements.filter((element) => element.type === 'symbol');
  const routes = document.elements.filter((element) => element.type === 'arrow');
  const explicitSectors = (analysis?.sectors || []).map((item) => item.id).filter(Boolean);
  const fallbackSectors = [...(analysis?.rooms || []), ...(analysis?.corridors || [])].map((item) => item.id).filter(Boolean);
  const sourceIds = new Set(explicitSectors.length ? explicitSectors : fallbackSectors);
  const routedSourceIds = new Set(routes.map((route) => route.sourceId).filter(Boolean));
  const routedSectorCount = Math.min(sourceIds.size, routedSourceIds.size || routes.length);
  const sectorsWithoutRoute = Math.max(0, sourceIds.size - routedSectorCount);
  const detectedRisks = (analysis?.hazards?.length || 0) + symbols.filter((element) => ['electricalHazard', 'gasShutoff'].includes(element.symbolId)).length;
  const stairsWithoutSigns = Math.max(0, (analysis?.stairs?.length || 0) - symbols.filter((element) => element.symbolId === 'stairs').length);
  const image = document.elements.find((element) => element.type === 'planImage');
  const diagonal = image ? Math.hypot(image.width * (image.scaleX || 1), image.height * (image.scaleY || 1)) : 1000;
  const longRoutes = routes.filter((route) => route.routeRole !== 'alternative' && routeLength(route) > diagonal * .55).length;
  const missingSymbols = REQUIRED_SYMBOLS.filter(([symbolId]) => !symbols.some((symbol) => symbol.symbolId === symbolId));
  const exitCount = symbols.filter((symbol) => symbol.symbolId === 'emergencyExit').length;
  const signageCount = symbols.filter((symbol) => SIGNAGE_SYMBOLS.has(symbol.symbolId)).length;
  const equipmentCount = symbols.filter((symbol) => EQUIPMENT_SYMBOLS.has(symbol.symbolId)).length;
  const observationCount = (analysis?.warnings?.length || 0) + detectedRisks + longRoutes + stairsWithoutSigns;
  const positiveChecks = REQUIRED_SYMBOLS.map(([symbolId, label, weight]) => {
    const count = symbols.filter((symbol) => symbol.symbolId === symbolId).length;
    return { id: symbolId, label, count, ok: count > 0, weight };
  });
  const warnings = [
    { id: 'missing-signs', label: 'Señales faltantes', count: missingSymbols.length, ok: missingSymbols.length === 0, weight: 15 },
    { id: 'unrouted-sectors', label: 'Sectores sin ruta', count: sectorsWithoutRoute, ok: sectorsWithoutRoute === 0 && sourceIds.size > 0, weight: 20 },
    { id: 'risks', label: 'Riesgos detectados', count: detectedRisks, ok: detectedRisks === 0, weight: 5 },
    { id: 'long-routes', label: 'Distancias largas', count: longRoutes, ok: longRoutes === 0 && routes.length > 0, weight: 10 },
    { id: 'unsigned-stairs', label: 'Escaleras sin señalización', count: stairsWithoutSigns, ok: stairsWithoutSigns === 0, weight: 7 },
  ];
  if (!analysis) return { percentage: 0, positiveChecks, warnings, ready: false };
  const sectorTarget = sourceIds.size;
  const exitTarget = Math.max(1, analysis.emergencyExits?.length || 0);
  const scoreBreakdown = {
    exits: coverage(exitCount, exitTarget) * SCORE_WEIGHTS.exits,
    routes: coverage(routes.length, sectorTarget || 1) * SCORE_WEIGHTS.routes,
    signage: coverage(signageCount, sectorTarget || 1) * SCORE_WEIGHTS.signage,
    equipment: coverage(equipmentCount, sectorTarget || 1) * SCORE_WEIGHTS.equipment,
    observations: (1 - coverage(observationCount, sectorTarget || 1)) * SCORE_WEIGHTS.observations,
    routedSectors: sectorTarget ? (1 - sectorsWithoutRoute / sectorTarget) * SCORE_WEIGHTS.routedSectors : 0,
  };
  const percentage = Math.round(Object.values(scoreBreakdown).reduce((sum, score) => sum + score, 0));
  return {
    percentage,
    positiveChecks,
    warnings,
    ready: true,
    scoreBreakdown,
    summary: {
      exits: exitCount,
      routes: routes.length,
      signage: signageCount,
      equipment: equipmentCount,
      observations: observationCount,
      sectors: sourceIds.size,
      sectorsWithoutRoute,
      risks: detectedRisks,
    },
  };
};
