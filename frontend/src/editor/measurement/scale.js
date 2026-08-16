const finitePoint = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y);

export const pixelDistance = (pointA, pointB) => {
  if (!finitePoint(pointA) || !finitePoint(pointB)) throw new TypeError('Se requieren dos puntos válidos');
  return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
};

export const calibrateScale = ({ pointA, pointB, distanceMeters, calibratedBy = '', calibratedAt = new Date().toISOString() }) => {
  const referenceDistancePixels = pixelDistance(pointA, pointB);
  const meters = Number(distanceMeters);
  if (!Number.isFinite(meters) || meters <= 0) throw new TypeError('La distancia real debe ser mayor que cero');
  if (referenceDistancePixels <= 0) throw new TypeError('Los puntos de calibración deben ser diferentes');
  return {
    calibrated: true,
    pixelsPerMeter: referenceDistancePixels / meters,
    referenceDistanceMeters: meters,
    referenceDistancePixels,
    referencePoints: { pointA: { ...pointA }, pointB: { ...pointB } },
    coordinateSpace: 'document-pixels',
    calibratedAt,
    calibratedBy,
  };
};

export const measureDistance = (pointA, pointB, scale) => {
  const pixels = pixelDistance(pointA, pointB);
  if (!scale?.calibrated || !Number.isFinite(scale.pixelsPerMeter) || scale.pixelsPerMeter <= 0) {
    return { pixels, meters: null, centimeters: null, verifiable: false };
  }
  const meters = pixels / scale.pixelsPerMeter;
  return { pixels, meters, centimeters: meters * 100, verifiable: true };
};

export const formatRealDistance = (measurement) => {
  if (!measurement?.verifiable) return 'No se puede calcular una distancia real hasta calibrar la escala del plano.';
  if (measurement.meters < 1) return `${measurement.centimeters.toLocaleString('es-AR', { maximumFractionDigits: 1 })} cm`;
  return `${measurement.meters.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
};
