import { SIMULATION_DISCLAIMER, SIMULATION_ENGINE_VERSION } from './simulationModel.js';

const finite = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const seededRandom = (seed) => {
  let state = 2166136261;
  for (const char of String(seed ?? 'inteli-pde')) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
};

const transformRoutePoint = (element, x, y) => {
  const angle = (element.rotation || 0) * Math.PI / 180;
  const sx = x * (element.scaleX ?? 1); const sy = y * (element.scaleY ?? 1);
  return { x: (element.x || 0) + sx * Math.cos(angle) - sy * Math.sin(angle), y: (element.y || 0) + sx * Math.sin(angle) + sy * Math.cos(angle) };
};

export const routeGeometry = (element, pixelsPerMeter = null) => {
  const points = [];
  for (let index = 0; index + 1 < (element.points || []).length; index += 2) points.push(transformRoutePoint(element, element.points[index], element.points[index + 1]));
  const segments = points.slice(1).map((point, index) => ({ from: points[index], to: point, pixels: Math.hypot(point.x - points[index].x, point.y - points[index].y) }));
  const pixelLength = segments.reduce((sum, segment) => sum + segment.pixels, 0);
  return { routeId: element.routeId || element.id, elementId: element.id, sourceId: element.sourceId || null, exitId: element.exitId || null, points, segments, pixelLength, meters: pixelsPerMeter ? pixelLength / pixelsPerMeter : null };
};

const sectorOccupancy = (sector, parameters) => {
  if (parameters.distributionMode === 'manual') return finite(parameters.sectorOccupancy?.[sector.id]) ? Math.max(0, Math.floor(Number(parameters.sectorOccupancy[sector.id]))) : null;
  return finite(sector.occupancy) ? Math.max(0, Math.floor(Number(sector.occupancy))) : null;
};

const usage = (agents, key) => Object.entries(agents.filter((agent) => agent.status === 'evacuated' && agent[key]).reduce((all, agent) => ({ ...all, [agent[key]]: (all[agent[key]] || 0) + 1 }), {})).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

export const runSimulation = ({ simulation, document }) => {
  const parameters = { ...simulation.parameters, ...(simulation.scenario?.parameters || {}) };
  const blockedExitIds = new Set([...(parameters.blockedExitIds || []), ...(simulation.scenario?.blockedExitIds || [])]);
  const blockedRouteIds = new Set([...(parameters.blockedRouteIds || []), ...(simulation.scenario?.blockedRouteIds || [])]);
  const selectedSectors = (document.sectors || []).filter((sector) => !parameters.selectedSectorIds?.length || parameters.selectedSectorIds.includes(sector.id));
  const selectedExitIds = new Set(parameters.selectedExitIds || []);
  const calibrated = Boolean(document.scale?.calibrated && document.scale.pixelsPerMeter > 0);
  const routes = (document.elements || []).filter((element) => element.type === 'arrow' && element.routeId).map((element) => routeGeometry(element, calibrated ? document.scale.pixelsPerMeter : null));
  const validRoutes = routes.filter((route) => !blockedRouteIds.has(route.routeId) && !blockedExitIds.has(route.exitId) && (!selectedExitIds.size || selectedExitIds.has(route.exitId)));
  const warnings = [SIMULATION_DISCLAIMER];
  if (!calibrated) warnings.push('El plano no tiene escala calibrada; no pueden calcularse tiempos físicos de evacuación.');
  const random = seededRandom(parameters.randomSeed);
  const definitions = [];
  selectedSectors.forEach((sector) => {
    const count = sectorOccupancy(sector, parameters);
    if (count === null) { warnings.push(`Falta ocupación confirmada para el sector ${sector.name || sector.id}.`); return; }
    for (let index = 0; index < count; index += 1) definitions.push({ sector, ordinal: index, randomOrder: random() });
  });
  definitions.sort((a, b) => a.randomOrder - b.randomOrder);
  parameters.occupantCount = definitions.length;
  const mobilityCount = Math.min(definitions.length, Math.max(0, Math.floor(Number(parameters.mobilityReducedCount) || 0)));
  const stepSeconds = Math.max(.01, Number(parameters.simulationStepMs || 100) / 1000);
  const agents = definitions.map(({ sector, ordinal }, index) => {
    const candidates = validRoutes.filter((route) => route.sourceId === sector.id && route.points.length >= 2).sort((a, b) => (a.meters ?? a.pixelLength) - (b.meters ?? b.pixelLength) || a.routeId.localeCompare(b.routeId));
    const route = candidates[0];
    const mobilityReduced = index < mobilityCount;
    const speed = mobilityReduced ? Number(parameters.mobilityReducedSpeedMetersPerSecond) : Number(parameters.walkingSpeedMetersPerSecond);
    const reactionTime = Math.max(0, Number(parameters.reactionTimeSeconds) || 0);
    if (!route || !calibrated || !(speed > 0)) return {
      id: `${simulation.id}-agent-${index + 1}`, sectorId: sector.id, startPosition: route?.points[0] || null, currentPosition: route?.points[0] || null,
      assignedRouteId: route?.routeId || null, assignedExitId: route?.exitId || null, speed, reactionTime, status: 'blocked', evacuationTimeSeconds: null, mobilityReduced,
    };
    const rawTime = reactionTime + route.meters / speed;
    const evacuationTimeSeconds = Math.round(Math.ceil(rawTime / stepSeconds) * stepSeconds * 1000) / 1000;
    return {
      id: `${simulation.id}-agent-${index + 1}`, sectorId: sector.id, startPosition: route.points[0], currentPosition: route.points[0],
      assignedRouteId: route.routeId, assignedExitId: route.exitId, speed, reactionTime, status: 'evacuated', evacuationTimeSeconds, mobilityReduced,
    };
  });
  const blockedSectors = new Set(agents.filter((agent) => agent.status === 'blocked').map((agent) => agent.sectorId));
  blockedSectors.forEach((sectorId) => warnings.push(`Los ocupantes del sector ${sectorId} no tienen una ruta válida con escala y salida disponible.`));
  const evacuated = agents.filter((agent) => agent.status === 'evacuated');
  const times = evacuated.map(({ evacuationTimeSeconds }) => evacuationTimeSeconds);
  const totalTime = times.length ? Math.max(...times) : 0;
  const agentEvents = agents.flatMap((agent) => agent.status === 'evacuated' ? [
    { timestampSeconds: agent.reactionTime, type: 'agent_started', agentId: agent.id, routeId: agent.assignedRouteId },
    { timestampSeconds: agent.evacuationTimeSeconds, type: 'agent_evacuated', agentId: agent.id, exitId: agent.assignedExitId },
  ] : [{ timestampSeconds: 0, type: 'agent_blocked', agentId: agent.id, sectorId: agent.sectorId }]);
  const routeLoad = Object.entries(agents.filter(({ assignedRouteId }) => assignedRouteId).reduce((all, agent) => ({ ...all, [agent.assignedRouteId]: (all[agent.assignedRouteId] || 0) + 1 }), {})).map(([routeId, assignedAgents]) => ({ routeId, assignedAgents, waitingAtStart: assignedAgents, approximateMaxQueue: assignedAgents, concentrationModel: 'not_implemented' }));
  const firstEvacuation = times.length ? Math.min(...times) : null;
  const aggregateEvents = [
    { timestampSeconds: 0, type: 'simulation_started' },
    ...[...blockedExitIds].map((exitId) => ({ timestampSeconds: 0, type: 'exit_blocked', exitId })),
    ...routeLoad.filter(({ assignedAgents }) => assignedAgents > 1).flatMap(({ routeId, assignedAgents }) => [
      { timestampSeconds: Math.max(0, Number(parameters.reactionTimeSeconds) || 0), type: 'queue_started', routeId, value: assignedAgents, approximate: true },
      { timestampSeconds: Math.max(0, Number(parameters.reactionTimeSeconds) || 0), type: 'queue_maximum', routeId, value: assignedAgents, approximate: true },
    ]),
    ...(firstEvacuation !== null ? [{ timestampSeconds: firstEvacuation, type: 'first_evacuated' }, { timestampSeconds: totalTime, type: 'last_evacuated' }] : []),
  ];
  const events = [...agentEvents, ...aggregateEvents].sort((a, b) => a.timestampSeconds - b.timestampSeconds || String(a.type).localeCompare(String(b.type)));
  const results = {
    totalOccupants: agents.length, evacuated: evacuated.length, blocked: agents.length - evacuated.length,
    totalSimulationTimeSeconds: totalTime, averageEvacuationTimeSeconds: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    maxEvacuationTimeSeconds: totalTime, exitUsage: usage(agents, 'assignedExitId'), routeUsage: usage(agents, 'assignedRouteId'), warnings,
    routeLoad, maxQueue: routeLoad.length ? Math.max(...routeLoad.map(({ approximateMaxQueue }) => approximateMaxQueue)) : 0,
  };
  return { ...simulation, status: 'completed', engineVersion: SIMULATION_ENGINE_VERSION, parameters, agents, routes, events, results, warnings };
};
