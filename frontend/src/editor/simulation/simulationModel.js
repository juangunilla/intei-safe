export const SIMULATION_ENGINE_VERSION = '1.0.0';
export const SIMULATION_DISCLAIMER = 'Simulación estimativa basada en la geometría y parámetros declarados. No reemplaza un simulacro presencial ni la evaluación de un profesional competente.';

export const DEFAULT_SIMULATION_PARAMETERS = {
  occupantCount: null,
  reactionTimeSeconds: 30,
  walkingSpeedMetersPerSecond: 1.2,
  mobilityReducedCount: 0,
  mobilityReducedSpeedMetersPerSecond: 0.6,
  selectedSectorIds: [], selectedExitIds: [], blockedExitIds: [], blockedRouteIds: [],
  randomSeed: null, simulationStepMs: 100, distributionMode: 'sectors', sectorOccupancy: {},
};

export const PARAMETER_SOURCES = {
  occupantCount: 'calculated', reactionTimeSeconds: 'orientative', walkingSpeedMetersPerSecond: 'orientative',
  mobilityReducedCount: 'user', mobilityReducedSpeedMetersPerSecond: 'orientative', selectedSectorIds: 'user',
  selectedExitIds: 'user', blockedExitIds: 'user', blockedRouteIds: 'user', randomSeed: 'user',
};

export const createSimulation = ({ id = crypto.randomUUID(), name = 'Escenario normal', createdBy = '', createdAt = new Date().toISOString(), parameters = {}, scenario = null, planVersion = null } = {}) => ({
  id, name, status: 'draft', createdAt, createdBy,
  engineVersion: SIMULATION_ENGINE_VERSION, planVersion,
  parameters: { ...DEFAULT_SIMULATION_PARAMETERS, ...parameters },
  parameterSources: { ...PARAMETER_SOURCES },
  scenario: scenario || { name, description: '', blockedExitIds: [], blockedRouteIds: [], parameters: {} },
  agents: [], routes: [], events: [], results: {}, warnings: [SIMULATION_DISCLAIMER],
});

export const NORMAL_SCENARIO = { name: 'Escenario normal', description: 'Utiliza las rutas y salidas seleccionadas sin bloqueos adicionales.', blockedExitIds: [], blockedRouteIds: [], parameters: {} };
export const blockedExitScenario = (exitId = null) => ({ name: 'Salida bloqueada', description: 'Excluye manualmente una salida del escenario.', blockedExitIds: exitId ? [exitId] : [], blockedRouteIds: [], parameters: {} });
