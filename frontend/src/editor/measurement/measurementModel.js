import { measureDistance } from './scale.js';

export const MEASUREMENT_TYPES = ['distance', 'width', 'area'];
export const SECTOR_TYPES = ['oficina', 'pasillo', 'depósito', 'circulación', 'escalera', 'salida', 'otro'];

export const polygonAreaPixels = (points) => {
  if (!Array.isArray(points) || points.length < 3) return 0;
  const twiceArea = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.abs(twiceArea) / 2;
};

export const measureArea = (points, scale) => {
  const pixels = polygonAreaPixels(points);
  const calibrated = Boolean(scale?.calibrated && Number.isFinite(scale.pixelsPerMeter) && scale.pixelsPerMeter > 0);
  return {
    pixels,
    squareMeters: calibrated ? pixels / (scale.pixelsPerMeter ** 2) : null,
    verifiable: calibrated,
  };
};

export const createLinearMeasurement = ({ id = crypto.randomUUID(), type = 'distance', label = '', points, scale, createdBy = '', createdAt = new Date().toISOString(), elementId = null }) => {
  if (!['distance', 'width'].includes(type)) throw new TypeError('Tipo de medición lineal inválido');
  if (!Array.isArray(points) || points.length !== 2) throw new TypeError('La medición lineal requiere dos puntos');
  const result = measureDistance(points[0], points[1], scale);
  return {
    id, type, label, points: points.map((point) => ({ ...point })), pixels: result.pixels,
    meters: result.meters, squareMeters: null, createdAt, createdBy,
    userModified: false, visible: true, elementId,
  };
};

export const createAreaMeasurement = ({ id = crypto.randomUUID(), label = '', points, scale, createdBy = '', createdAt = new Date().toISOString() }) => {
  if (!Array.isArray(points) || points.length < 3) throw new TypeError('La superficie requiere al menos tres puntos');
  const result = measureArea(points, scale);
  return {
    id, type: 'area', label, points: points.map((point) => ({ ...point })), pixels: result.pixels,
    meters: null, squareMeters: result.squareMeters, createdAt, createdBy,
    userModified: false, visible: true, elementId: null,
  };
};

export const sectorFromMeasurement = ({ id = crypto.randomUUID(), measurement, name, type = 'otro', occupancy = null, notes = '' }) => {
  if (measurement?.type !== 'area') throw new TypeError('Sólo una medición de superficie puede convertirse en sector');
  if (!SECTOR_TYPES.includes(type)) throw new TypeError('Tipo de sector inválido');
  return {
    id, name: name || 'Sector sin nombre', type,
    polygon: measurement.points.map((point) => ({ ...point })),
    areaSquareMeters: measurement.squareMeters ?? null,
    occupancy, occupancySource: occupancy === null ? null : 'manual',
    occupancyFactor: null, occupancyFactorSource: null,
    notes, sourceMeasurementId: measurement.id,
  };
};
