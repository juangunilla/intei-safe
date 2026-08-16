export const pointAlongRoute = (route, progress) => {
  if (!route?.points?.length) return null;
  const clamped = Math.max(0, Math.min(1, progress));
  const target = route.pixelLength * clamped;
  let covered = 0;
  for (const segment of route.segments) {
    if (covered + segment.pixels >= target) {
      const ratio = segment.pixels ? (target - covered) / segment.pixels : 0;
      return { x: segment.from.x + (segment.to.x - segment.from.x) * ratio, y: segment.from.y + (segment.to.y - segment.from.y) * ratio };
    }
    covered += segment.pixels;
  }
  return route.points.at(-1);
};

const routeIndexCache = new WeakMap();
const routeIndex = (simulation) => {
  if (!simulation || typeof simulation !== 'object') return new Map();
  if (!routeIndexCache.has(simulation)) routeIndexCache.set(simulation, new Map((simulation.routes || []).map((route) => [route.routeId, route])));
  return routeIndexCache.get(simulation);
};

export const simulationFrame = (simulation, elapsedSeconds) => {
  const routes = routeIndex(simulation);
  const agents = (simulation?.agents || []).map((agent) => {
    if (agent.status === 'blocked') return { ...agent, visualStatus: 'blocked', position: agent.currentPosition || agent.startPosition };
    if (elapsedSeconds < agent.reactionTime) return { ...agent, visualStatus: 'waiting', position: agent.startPosition };
    if (elapsedSeconds >= agent.evacuationTimeSeconds) return { ...agent, visualStatus: 'evacuated', position: routes.get(agent.assignedRouteId)?.points.at(-1) || agent.startPosition };
    const movementDuration = agent.evacuationTimeSeconds - agent.reactionTime;
    return { ...agent, visualStatus: 'evacuating', position: pointAlongRoute(routes.get(agent.assignedRouteId), (elapsedSeconds - agent.reactionTime) / movementDuration) };
  });
  return { elapsedSeconds, agents, evacuated: agents.filter(({ visualStatus }) => visualStatus === 'evacuated').length, blocked: agents.filter(({ visualStatus }) => visualStatus === 'blocked').length, remaining: agents.filter(({ visualStatus }) => ['waiting', 'evacuating'].includes(visualStatus)).length };
};

export const playbackTransition = (state, action) => {
  if (action === 'play') return { ...state, playing: true };
  if (action === 'pause') return { ...state, playing: false };
  if (action === 'restart') return { ...state, playing: false, elapsedSeconds: 0 };
  return state;
};
