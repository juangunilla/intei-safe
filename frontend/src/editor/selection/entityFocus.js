const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const boundsFromPoints = (points = []) => {
  if (!Array.isArray(points) || !points.length) return null;
  const xs = points.map((point) => finite(point.x));
  const ys = points.map((point) => finite(point.y));
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const elementPoints = (element) => {
  if (element.type !== 'arrow' || !Array.isArray(element.points)) return null;
  const points = [];
  for (let index = 0; index + 1 < element.points.length; index += 2) {
    points.push({
      x: finite(element.x) + finite(element.points[index]) * finite(element.scaleX, 1),
      y: finite(element.y) + finite(element.points[index + 1]) * finite(element.scaleY, 1),
    });
  }
  return points;
};

export const boundsForElement = (element) => {
  if (!element) return null;
  const arrowBounds = boundsFromPoints(elementPoints(element));
  if (arrowBounds) return arrowBounds;
  const width = element.type === 'planImage' ? finite(element.width) : element.type === 'text' ? Math.max(40, String(element.text || '').length * finite(element.fontSize, 16) * .6) : 48;
  const height = element.type === 'planImage' ? finite(element.height) : element.type === 'text' ? finite(element.fontSize, 16) * 1.4 : 48;
  return { x: finite(element.x), y: finite(element.y), width: Math.abs(width * finite(element.scaleX, 1)), height: Math.abs(height * finite(element.scaleY, 1)) };
};

export const resolveEntity = (document, selection) => {
  if (!selection?.id) return null;
  if (selection.type === 'measurement') {
    const entity = (document.measurements || []).find(({ id }) => id === selection.id);
    return entity ? { type: 'measurement', entity, bounds: boundsFromPoints(entity.points) } : null;
  }
  if (selection.type === 'sector') {
    const entity = (document.sectors || []).find(({ id }) => id === selection.id);
    return entity ? { type: 'sector', entity, bounds: boundsFromPoints(entity.polygon) } : null;
  }
  if (selection.type === 'route') {
    const entity = (document.elements || []).find((element) => element.routeId === selection.id || (element.id === selection.id && element.type === 'arrow'));
    return entity ? { type: 'route', entity, bounds: boundsForElement(entity) } : null;
  }
  if (selection.type === 'element') {
    const entity = (document.elements || []).find(({ id }) => id === selection.id);
    return entity ? { type: 'element', entity, bounds: boundsForElement(entity) } : null;
  }
  return null;
};

export const calculateFocusViewport = ({ bounds, viewport, canvasSize, padding = 72 }) => {
  if (!bounds || !canvasSize?.width || !canvasSize?.height) return viewport;
  const currentScale = Math.max(.2, Math.min(4, finite(viewport?.scale, 1)));
  const left = bounds.x * currentScale + finite(viewport?.x);
  const top = bounds.y * currentScale + finite(viewport?.y);
  const right = (bounds.x + bounds.width) * currentScale + finite(viewport?.x);
  const bottom = (bounds.y + bounds.height) * currentScale + finite(viewport?.y);
  const outside = left < padding || top < padding || right > canvasSize.width - padding || bottom > canvasSize.height - padding;
  const tooSmall = Math.max(bounds.width, bounds.height) * currentScale < 28;
  if (!outside && !tooSmall) return viewport;
  const safeWidth = Math.max(bounds.width, 24);
  const safeHeight = Math.max(bounds.height, 24);
  const fitScale = Math.min((canvasSize.width - padding * 2) / safeWidth, (canvasSize.height - padding * 2) / safeHeight);
  const nextScale = Math.max(.2, Math.min(4, tooSmall ? Math.min(fitScale, Math.max(currentScale, 1.25)) : Math.min(currentScale, fitScale)));
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return { scale: nextScale, x: canvasSize.width / 2 - centerX * nextScale, y: canvasSize.height / 2 - centerY * nextScale };
};

export const evidenceSelection = (item) => {
  const fields = item?.fields || {};
  if (item?.type === 'route' || item?.routeId || fields.routeId) return { type: 'route', id: item.routeId || fields.routeId || item.id, label: 'Ver recorrido' };
  if (['measurement', 'widthMeasurement', 'areaMeasurement'].includes(item?.type) || item?.measurementId) return { type: 'measurement', id: item.measurementId || item.id, label: 'Ver medición' };
  if (item?.type === 'sector' || item?.sectorId) return { type: 'sector', id: item.sectorId || item.id, label: 'Ver sector' };
  if (item?.type === 'element' || item?.type === 'detectedElement' || item?.elementId) return { type: 'element', id: item.elementId || item.id, label: 'Ver elemento' };
  return null;
};

export const isSelectionClearKey = (event) => event?.key === 'Escape';
