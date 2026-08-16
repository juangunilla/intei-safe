const isFiniteNumber = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

const evidence = (type, item, fields) => ({
  type,
  id: type === 'route' ? item?.routeId || item?.elementId || item?.id || null : item?.id || item?.elementId || null,
  label: item?.label || item?.name || '',
  fields: Array.isArray(fields) ? Object.fromEntries(fields.map((field) => [field, item?.[field] ?? null])) : fields,
});

const unavailable = ({ rule, title, unit = null, observations, evidenceItems = [] }) => ({
  ruleId: rule.id,
  title,
  measuredValue: null,
  requiredValue: null,
  unit,
  result: 'not_verifiable',
  source: rule.source,
  sourceSection: rule.sourceSection,
  observations,
  evidence: evidenceItems,
  severity: rule.severity,
  recommendedAction: 'Completar o confirmar profesionalmente los datos faltantes antes de concluir el cumplimiento.',
  requiresProfessionalReview: true,
});

const compareMaximum = ({ rule, title, measuredValue, requiredValue, unit, evidenceItems, observations }) => {
  if (!isFiniteNumber(measuredValue) || !isFiniteNumber(requiredValue)) {
    return { ...unavailable({ rule, title, unit, observations, evidenceItems }), measuredValue: isFiniteNumber(measuredValue) ? Number(measuredValue) : null, requiredValue: isFiniteNumber(requiredValue) ? Number(requiredValue) : null };
  }
  return {
    ...unavailable({ rule, title, unit, observations, evidenceItems }),
    measuredValue: Number(measuredValue),
    requiredValue: Number(requiredValue),
    result: Number(measuredValue) <= Number(requiredValue) ? 'complies' : 'does_not_comply',
  };
};

const compareMinimum = ({ rule, title, measuredValue, requiredValue, unit, evidenceItems, observations }) => {
  if (!isFiniteNumber(measuredValue) || !isFiniteNumber(requiredValue)) {
    return { ...unavailable({ rule, title, unit, observations, evidenceItems }), measuredValue: isFiniteNumber(measuredValue) ? Number(measuredValue) : null, requiredValue: isFiniteNumber(requiredValue) ? Number(requiredValue) : null };
  }
  return {
    ...unavailable({ rule, title, unit, observations, evidenceItems }),
    measuredValue: Number(measuredValue),
    requiredValue: Number(requiredValue),
    result: Number(measuredValue) >= Number(requiredValue) ? 'complies' : 'does_not_comply',
  };
};

const validateWidth = ({ rule, measurement, requiredValue = null }) => compareMinimum({
  rule,
  title: measurement ? `Ancho: ${measurement.label || measurement.id}` : 'Anchos de medios de escape',
  measuredValue: measurement?.meters,
  requiredValue,
  unit: 'm',
  evidenceItems: measurement ? [evidence('widthMeasurement', measurement, ['pixels', 'meters', 'elementId'])] : [],
  observations: !measurement ? 'No existe una medición manual de ancho confirmada.' : !measurement.verifiable
    ? 'La medición existe, pero el plano no tiene escala calibrada.'
    : 'El ancho está medido, pero no puede determinarse el mínimo aplicable sin ocupación confirmada y condición de edificio nuevo o existente.',
});

const validateRouteLength = ({ rule, route, requiredValue = null }) => compareMaximum({
  rule,
  title: route ? `Recorrido: ${route.routeId || route.elementId}` : 'Longitudes de recorrido',
  measuredValue: route?.meters,
  requiredValue,
  unit: 'm',
  evidenceItems: route ? [evidence('route', route, ['pixels', 'meters', 'routeId', 'sourceId', 'exitId'])] : [],
  observations: !route ? 'No existe un recorrido asociado entre un origen y una salida.' : !route.verifiable
    ? 'El recorrido existe, pero el plano no tiene escala calibrada.'
    : 'La longitud está calculada, pero faltan planta, subsuelo y condiciones de aplicabilidad para seleccionar un máximo normativo.',
});

const validateArea = ({ rule, area, requiredValue = null }) => compareMinimum({
  rule,
  title: area ? `Superficie: ${area.label || area.id}` : 'Superficies de sectores',
  measuredValue: area?.squareMeters,
  requiredValue,
  unit: 'm²',
  evidenceItems: area ? [evidence('areaMeasurement', area, ['squarePixels', 'squareMeters'])] : [],
  observations: !area ? 'No existe una superficie medida.' : !area.verifiable
    ? 'La superficie existe en píxeles, pero el plano no tiene escala calibrada.'
    : 'La superficie está disponible; esta regla no define por sí sola un mínimo o máximo aplicable.',
});

const deriveOccupancy = ({ sector, rule }) => {
  const manual = isFiniteNumber(sector?.occupancy) && Number(sector.occupancy) >= 0;
  const factor = Number(rule.occupancyFactor);
  const canCalculate = sector?.type === 'oficina' && isFiniteNumber(sector?.areaSquareMeters)
    && Number(sector.areaSquareMeters) >= 0 && factor > 0;
  return {
    occupancy: manual ? Number(sector.occupancy) : canCalculate ? Number(sector.areaSquareMeters) / factor : null,
    manualOccupancy: manual ? Number(sector.occupancy) : null,
    calculatedOccupancy: canCalculate ? Number(sector.areaSquareMeters) / factor : null,
    occupancySource: manual ? 'manual' : canCalculate ? 'calculated' : null,
    occupancyFactor: canCalculate ? factor : null,
    occupancyFactorSource: canCalculate ? `${rule.source}, ${rule.sourceSection}` : null,
  };
};

const validateOccupancy = ({ rule, sector }) => {
  const derived = deriveOccupancy({ sector, rule });
  return {
    ...unavailable({
      rule,
      title: sector ? `Ocupación: ${sector.name || sector.id}` : 'Ocupación de sectores de oficina',
      unit: 'personas',
      observations: !sector ? 'No existe un sector de oficina.' : derived.occupancySource === 'manual'
        ? 'Se utiliza la ocupación declarada manualmente; prevalece sobre el cálculo orientativo.'
        : derived.occupancySource === 'calculated'
          ? 'Ocupación calculada determinísticamente como superficie / 8 m² por persona; requiere confirmación profesional.'
          : 'Falta superficie real calibrada u ocupación manual.',
      evidenceItems: sector ? [evidence('sector', sector, ['areaSquareMeters', 'occupancy', 'type'])] : [],
    }),
    measuredValue: derived.occupancy,
    occupancy: derived,
  };
};

const validateExitCapacity = ({ rule, occupancy, width, requiredValue = null }) => compareMinimum({
  rule,
  title: 'Capacidad de salida',
  measuredValue: width?.meters,
  requiredValue,
  unit: 'm',
  evidenceItems: [
    ...(width ? [evidence('widthMeasurement', width, ['meters', 'elementId'])] : []),
    ...(isFiniteNumber(occupancy) ? [{ type: 'occupancy', id: null, label: '', fields: { occupancy: Number(occupancy) } }] : []),
  ],
  observations: 'No puede calcularse el ancho exigible sin ocupación total confirmada y condición de edificio nuevo o existente.',
});

module.exports = { validateWidth, validateRouteLength, validateArea, validateOccupancy, validateExitCapacity, deriveOccupancy };
