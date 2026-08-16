export const EDITOR_MODES = ['plan', 'regulatory', 'simulation', 'report'];
export const editorModeLabel = { plan: 'Plano', regulatory: 'Revisión normativa', simulation: 'Simulación', report: 'Informe' };
export const isEditorMode = (mode) => EDITOR_MODES.includes(mode);

export const simulationStatusLabel = ({ simulation, playing, elapsedSeconds = 0 }) => {
  if (!simulation) return 'Sin ejecutar';
  if (playing) return 'Reproduciendo';
  if (simulation.status === 'draft') return 'Sin ejecutar';
  if (simulation.status === 'running') return 'Calculando';
  if (elapsedSeconds >= (simulation.results?.totalSimulationTimeSeconds || 0)) return 'Finalizada';
  if (elapsedSeconds > 0) return 'Pausada';
  return 'Lista';
};

export const compareSimulations = (first, second) => {
  if (!first || !second) return null;
  const metric = (key) => {
    const a = Number(first.results?.[key]) || 0; const b = Number(second.results?.[key]) || 0;
    const difference = b - a; const percentage = a === 0 ? null : difference / a * 100;
    return { a, b, difference, percentage };
  };
  return {
    firstId: first.id, secondId: second.id,
    totalTime: metric('totalSimulationTimeSeconds'), averageTime: metric('averageEvacuationTimeSeconds'),
    evacuated: metric('evacuated'), blocked: metric('blocked'), maxQueue: metric('maxQueue'),
    mostUsedExit: { a: first.results?.exitUsage?.[0] || null, b: second.results?.exitUsage?.[0] || null },
    bottleneck: { a: [...(first.results?.routeLoad || [])].sort((x, y) => y.assignedAgents - x.assignedAgents)[0] || null, b: [...(second.results?.routeLoad || [])].sort((x, y) => y.assignedAgents - x.assignedAgents)[0] || null },
  };
};

export const utilizationOverlay = (simulation) => {
  const routeMax = Math.max(1, ...(simulation?.results?.routeUsage || []).map(({ count }) => count));
  const exitMax = Math.max(1, ...(simulation?.results?.exitUsage || []).map(({ count }) => count));
  return {
    routes: (simulation?.results?.routeUsage || []).map((item) => ({ ...item, intensity: item.count / routeMax })),
    exits: (simulation?.results?.exitUsage || []).map((item) => ({ ...item, intensity: item.count / exitMax })),
  };
};

export const eventSelection = (event) => {
  if (event?.routeId) return { type: 'route', id: event.routeId };
  if (event?.exitId) return { type: 'element', id: event.exitId };
  if (event?.sectorId) return { type: 'sector', id: event.sectorId };
  return null;
};

export const clampSimulationTime = (value, duration) => Math.max(0, Math.min(Math.max(0, Number(duration) || 0), Number(value) || 0));

export const duplicateSimulationScenario = (simulation, { id, createdAt, createdBy = simulation?.createdBy || '' }) => ({
  ...structuredClone(simulation), id, name: `${simulation.name} — copia`, status: 'draft', createdAt, createdBy,
  scenario: { ...structuredClone(simulation.scenario), name: `${simulation.name} — copia` }, agents: [], routes: [], events: [], results: {}, warnings: [...(simulation.warnings || [])],
});
