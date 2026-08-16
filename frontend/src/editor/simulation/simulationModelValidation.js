const finite = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

export const validateSimulationReadiness = (document, simulation = null) => {
  const selectedSectorIds = simulation?.parameters?.selectedSectorIds || [];
  const selectedExitIds = simulation?.parameters?.selectedExitIds || [];
  const sectors = (document?.sectors || []).filter((item) => !selectedSectorIds.length || selectedSectorIds.includes(item.id));
  const exits = (document?.elements || []).filter((item) => item.type === 'symbol' && item.symbolId === 'emergencyExit' && Number.isFinite(item.x) && Number.isFinite(item.y) && (!selectedExitIds.length || selectedExitIds.includes(item.id)));
  const routes = (document?.elements || []).filter((item) => item.type === 'arrow' && item.routeId);
  const exitIds = new Set(exits.map(({ id }) => id));
  const sectorIds = new Set(sectors.map(({ id }) => id));
  const validRoutes = routes.filter((route) => sectorIds.has(route.sourceId) && exitIds.has(route.exitId) && Array.isArray(route.points) && route.points.length >= 4);
  const issues = [];
  if (!sectors.length) issues.push({ code: 'NO_SECTORS', message: 'No existen sectores utilizables.' });
  if (!exits.length) issues.push({ code: 'NO_EXITS', message: 'No existe una salida con ubicación geométrica válida.' });
  if (sectors.some((sector) => !Array.isArray(sector.polygon) || sector.polygon.length < 3)) issues.push({ code: 'INVALID_SECTOR_GEOMETRY', message: 'Hay sectores sin geometría mínima válida.' });
  if (sectors.some((sector) => !finite(simulation?.parameters?.distributionMode === 'manual' ? simulation.parameters.sectorOccupancy?.[sector.id] : sector.occupancy))) issues.push({ code: 'NO_OCCUPANTS', message: 'Todos los sectores seleccionados necesitan ocupantes.' });
  if (sectors.some((sector) => !validRoutes.some((route) => route.sourceId === sector.id))) issues.push({ code: 'INCONSISTENT_ROUTES', message: 'Cada sector seleccionado necesita una ruta conectada a una salida válida.' });
  if (!document?.scale?.calibrated || !(document.scale.pixelsPerMeter > 0)) issues.push({ code: 'NO_SCALE', message: 'El plano necesita una escala calibrada para calcular tiempos.' });
  return { ready: issues.length === 0, issues, counts: { sectors: sectors.length, exits: exits.length, routes: validRoutes.length } };
};
