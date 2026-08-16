const DEFAULT_CELL = 20;
const WALL_CLEARANCE = 10;
const ROUTE_GREEN = '#16a34a';

const centerOf = (item) => item.center || (item.bounds && {
  x: item.bounds.x + item.bounds.width / 2,
  y: item.bounds.y + item.bounds.height / 2,
}) || (Array.isArray(item.polygon) && item.polygon.length ? item.polygon.reduce((center, point) => ({
  x: center.x + point.x / item.polygon.length,
  y: center.y + point.y / item.polygon.length,
}), { x: 0, y: 0 }) : null);

const distanceToSegment = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
};

const inBounds = (point, bounds, margin = 0) => bounds
  && point.x >= bounds.x - margin && point.x <= bounds.x + bounds.width + margin
  && point.y >= bounds.y - margin && point.y <= bounds.y + bounds.height + margin;

const transformPoint = (point, transform = {}) => {
  const scaleX = transform.scaleX ?? 1;
  const scaleY = transform.scaleY ?? 1;
  const angle = (transform.rotation || 0) * Math.PI / 180;
  const x = point.x * scaleX;
  const y = point.y * scaleY;
  return {
    x: (transform.x || 0) + x * Math.cos(angle) - y * Math.sin(angle),
    y: (transform.y || 0) + x * Math.sin(angle) + y * Math.cos(angle),
  };
};

const inversePoint = (point, transform = {}) => {
  const angle = -(transform.rotation || 0) * Math.PI / 180;
  const dx = point.x - (transform.x || 0);
  const dy = point.y - (transform.y || 0);
  return {
    x: (dx * Math.cos(angle) - dy * Math.sin(angle)) / (transform.scaleX || 1),
    y: (dx * Math.sin(angle) + dy * Math.cos(angle)) / (transform.scaleY || 1),
  };
};

const simplifyPath = (points) => points.filter((point, index) => {
  if (!index || index === points.length - 1) return true;
  const previous = points[index - 1];
  const next = points[index + 1];
  return (point.x - previous.x) * (next.y - point.y) !== (point.y - previous.y) * (next.x - point.x);
});

const createGrid = (analysis, cell) => {
  const width = analysis.coordinateSystem?.imageWidth || 1200;
  const height = analysis.coordinateSystem?.imageHeight || 800;
  const columns = Math.max(1, Math.ceil(width / cell));
  const rows = Math.max(1, Math.ceil(height / cell));
  const doors = [...(analysis.doors || []), ...(analysis.windows || [])];
  const obstacles = [...(analysis.obstacles || []), ...(analysis.hazards || [])];
  const blocked = (column, row) => {
    const point = { x: (column + .5) * cell, y: (row + .5) * cell };
    if (doors.some((door) => inBounds(point, door.bounds, cell * .7))) return false;
    if (obstacles.some((obstacle) => inBounds(point, obstacle.bounds, WALL_CLEARANCE))) return true;
    return (analysis.walls || []).some((wall) => wall.start && wall.end
      && distanceToSegment(point, wall.start, wall.end) <= Math.max(WALL_CLEARANCE, (wall.thickness || 0) / 2));
  };
  return { width, height, columns, rows, blocked };
};

const nearestWalkable = (point, grid, cell) => {
  const base = {
    x: Math.max(0, Math.min(grid.columns - 1, Math.floor(point.x / cell))),
    y: Math.max(0, Math.min(grid.rows - 1, Math.floor(point.y / cell))),
  };
  if (!grid.blocked(base.x, base.y)) return base;
  for (let radius = 1; radius < 8; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        const candidate = { x: base.x + dx, y: base.y + dy };
        if (candidate.x >= 0 && candidate.y >= 0 && candidate.x < grid.columns && candidate.y < grid.rows && !grid.blocked(candidate.x, candidate.y)) return candidate;
      }
    }
  }
  return null;
};

const aStar = (startPoint, endPoint, grid, cell) => {
  const start = nearestWalkable(startPoint, grid, cell);
  const goal = nearestWalkable(endPoint, grid, cell);
  if (!start || !goal) return null;
  const key = (node) => `${node.x},${node.y}`;
  const open = [start];
  const cameFrom = new Map();
  const costs = new Map([[key(start), 0]]);
  const score = (node) => (costs.get(key(node)) ?? Infinity) + Math.hypot(goal.x - node.x, goal.y - node.y);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const visited = new Set();
  while (open.length) {
    open.sort((a, b) => score(a) - score(b));
    const current = open.shift();
    const currentKey = key(current);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    if (current.x === goal.x && current.y === goal.y) {
      const path = [current];
      let cursor = currentKey;
      while (cameFrom.has(cursor)) {
        const previous = cameFrom.get(cursor);
        path.unshift(previous);
        cursor = key(previous);
      }
      return simplifyPath([startPoint, ...path.map((node) => ({ x: (node.x + .5) * cell, y: (node.y + .5) * cell })), endPoint]);
    }
    directions.forEach(([dx, dy]) => {
      const next = { x: current.x + dx, y: current.y + dy };
      if (next.x < 0 || next.y < 0 || next.x >= grid.columns || next.y >= grid.rows || grid.blocked(next.x, next.y)) return;
      if (dx && dy && (grid.blocked(current.x + dx, current.y) || grid.blocked(current.x, current.y + dy))) return;
      const nextKey = key(next);
      const nextCost = costs.get(currentKey) + (dx && dy ? 1.414 : 1);
      if (nextCost < (costs.get(nextKey) ?? Infinity)) {
        costs.set(nextKey, nextCost);
        cameFrom.set(nextKey, current);
        open.push(next);
      }
    });
  }
  return null;
};

const routeRisk = (path, analysis) => {
  const hazards = [...(analysis.hazards || []), ...(analysis.obstacles || [])];
  return path.reduce((risk, point) => risk + hazards.reduce((total, hazard) => {
    const center = centerOf(hazard);
    return total + (center ? Math.max(0, 200 - Math.hypot(point.x - center.x, point.y - center.y)) / 20 : 0);
  }, 0), 0);
};

const routeLength = (path) => path.slice(1).reduce((total, point, index) => total + Math.hypot(point.x - path[index].x, point.y - path[index].y), 0);

const toArrow = (path, transform, routeId, alternative, sourceId, exitId) => {
  const canvasPoints = path.map((point) => transformPoint(point, transform));
  const origin = canvasPoints[0];
  return {
    id: crypto.randomUUID(), type: 'arrow', x: origin.x, y: origin.y,
    points: canvasPoints.flatMap((point) => [point.x - origin.x, point.y - origin.y]),
    stroke: ROUTE_GREEN, strokeWidth: alternative ? 3 : 5, pointerLength: 14, pointerWidth: 14,
    opacity: alternative ? .65 : .9, rotation: 0, scaleX: 1, scaleY: 1,
    generatedRoute: true, routeId, routeRole: alternative ? 'alternative' : 'primary', sourceId, exitId,
  };
};

export const calculateEvacuationRoutes = (document) => {
  const analysis = document.buildingAnalysis;
  if (!analysis) return [];
  const sourceImage = document.elements.find((element) => element.id === analysis.source?.imageElementId)
    || document.elements.find((element) => element.type === 'planImage');
  const transform = sourceImage ? {
    x: sourceImage.x, y: sourceImage.y, scaleX: sourceImage.scaleX, scaleY: sourceImage.scaleY, rotation: sourceImage.rotation,
  } : analysis.source?.canvasTransform || {};
  const dynamicHazards = document.elements
    .filter((element) => element.type === 'symbol' && ['electricalHazard', 'gasShutoff'].includes(element.symbolId))
    .map((element) => {
      const point = inversePoint({ x: element.x + 24, y: element.y + 24 }, transform);
      return { center: point, bounds: { x: point.x - 20, y: point.y - 20, width: 40, height: 40 } };
    });
  const routingAnalysis = { ...analysis, hazards: [...(analysis.hazards || []), ...dynamicHazards] };
  const exits = document.elements.filter((element) => element.type === 'symbol' && element.symbolId === 'emergencyExit')
    .map((element) => ({ id: element.id, point: inversePoint({ x: element.x + 24, y: element.y + 24 }, transform) }));
  if (!exits.length) return [];
  const rawSources = [...(analysis.rooms || []), ...(analysis.corridors || [])]
    .map((item) => ({ id: item.id, point: centerOf(item) })).filter((item) => item.point);
  const sources = rawSources.filter((source, index) => rawSources.findIndex((other) => Math.hypot(source.point.x - other.point.x, source.point.y - other.point.y) < 60) === index);
  const cell = Math.max(DEFAULT_CELL, Math.round(Math.max(analysis.coordinateSystem?.imageWidth || 0, analysis.coordinateSystem?.imageHeight || 0) / 100));
  const grid = createGrid(routingAnalysis, cell);
  const arrows = [];
  const protectedRouteIds = new Set(document.elements.filter((element) => element.generatedRoute && element.userModified).map((element) => element.routeId));
  sources.forEach((source) => {
    const candidates = exits.map((exit) => {
      const path = aStar(source.point, exit.point, grid, cell);
      return path && { exit, path, score: routeLength(path) + routeRisk(path, routingAnalysis) * cell * 4 };
    }).filter(Boolean).sort((a, b) => a.score - b.score);
    candidates.slice(0, Math.min(2, candidates.length)).forEach((candidate, index) => {
      const routeId = `${source.id}-${candidate.exit.id}`;
      if (!protectedRouteIds.has(routeId)) arrows.push(toArrow(candidate.path, transform, routeId, index > 0, source.id, candidate.exit.id));
    });
  });
  return arrows;
};
