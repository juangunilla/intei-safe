export const contextualSimulationProperties = ({ selection, simulation, document }) => {
  if (!selection || selection.type === 'simulation') return simulation ? {
    kind: 'simulation', title: simulation.name, values: {
      Escenario: simulation.scenario?.name || simulation.name, Ocupantes: simulation.results?.totalOccupants ?? simulation.parameters?.occupantCount ?? 'No calculado',
      'Reacción (s)': simulation.parameters?.reactionTimeSeconds, 'Velocidad (m/s)': simulation.parameters?.walkingSpeedMetersPerSecond,
      Semilla: simulation.parameters?.randomSeed ?? 'Semilla estable', 'Timestep (ms)': simulation.parameters?.simulationStepMs,
    },
  } : { kind: 'empty', title: 'Sin simulación', values: {} };
  if (selection.type === 'sector') {
    const sector = (document.sectors || []).find(({ id }) => id === selection.id);
    if (!sector) return null;
    return { kind: 'sector', title: sector.name, values: { Tipo: sector.type, 'Superficie (m²)': sector.areaSquareMeters ?? 'No informada', Ocupación: sector.occupancy ?? 'No informada', 'Agentes asignados': (simulation?.agents || []).filter(({ sectorId }) => sectorId === sector.id).length } };
  }
  if (selection.type === 'element') {
    const exit = (document.elements || []).find(({ id }) => id === selection.id);
    if (!exit) return null;
    const width = (document.measurements || []).find((measurement) => measurement.type === 'width' && measurement.elementId === exit.id);
    return { kind: 'exit', title: exit.label || exit.id, values: { Estado: simulation?.parameters?.blockedExitIds?.includes(exit.id) || simulation?.scenario?.blockedExitIds?.includes(exit.id) ? 'Bloqueada' : 'Disponible', 'Ancho medido (m)': width?.meters ?? 'No informado', 'Capacidad manual': exit.manualCapacity ?? 'No informada', 'Agentes utilizados': (simulation?.agents || []).filter(({ assignedExitId, status }) => assignedExitId === exit.id && status === 'evacuated').length, 'Cola máxima': 'Aproximación no disponible por salida' } };
  }
  if (selection.type === 'route') {
    const route = (simulation?.routes || []).find(({ routeId }) => routeId === selection.id) || (document.elements || []).find(({ routeId }) => routeId === selection.id);
    if (!route) return null;
    const load = simulation?.results?.routeLoad?.find(({ routeId }) => routeId === selection.id);
    return { kind: 'route', title: route.routeId, values: { 'Longitud (m)': route.meters ?? 'Sin escala', Origen: route.sourceId || 'No asociado', Salida: route.exitId || 'No asociada', Agentes: load?.assignedAgents || 0, Estado: simulation?.parameters?.blockedRouteIds?.includes(route.routeId) ? 'Bloqueada' : 'Disponible', 'Cola máxima aproximada': load?.approximateMaxQueue || 0 } };
  }
  if (selection.type === 'measurement') {
    const item = (document.measurements || []).find(({ id }) => id === selection.id);
    return item ? { kind: 'measurement', title: item.label || item.id, values: { Tipo: item.type, Píxeles: item.pixels, Metros: item.meters ?? 'Sin escala', 'Superficie (m²)': item.squareMeters ?? 'No corresponde' } } : null;
  }
  return null;
};
