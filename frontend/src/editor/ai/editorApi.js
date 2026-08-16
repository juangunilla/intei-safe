/**
 * API del editor para integración con IA.
 *
 * Esquema de documento:
 * {
 *   version: 1,
 *   layers: [{ id, name, visible, locked, order }],
 *   elements: [
 *     { id, type: 'symbol'|'arrow'|'text'|'planImage', layerId, x, y, rotation, scaleX, scaleY, ...props }
 *   ],
 *   viewport: { scale, x, y }
 *   buildingAnalysis: { walls, rooms, doors, windows, corridors, stairs, emergencyExits, sectors }
 * }
 *
 * Uso desde consola o agente IA:
 *   window.__INTELI_PDE_EDITOR__.insertElements([...])
 *   window.__INTELI_PDE_EDITOR__.exportDocument()
 */

export const EDITOR_AI_SCHEMA = {
  version: 1,
  elementTypes: ['symbol', 'arrow', 'text', 'planImage'],
  symbolIds: ['emergencyExit', 'evacuationRoute', 'extinguisher', 'fireHose', 'alarm', 'firstAid', 'assemblyPoint', 'stairs', 'aed', 'emergencyLight', 'electricalHazard', 'gasShutoff', 'cabinet', 'noElevator'],
  buildingAnalysisCollections: ['walls', 'rooms', 'doors', 'windows', 'corridors', 'stairs', 'emergencyExits', 'sectors'],
  examples: {
    symbol: {
      type: 'symbol',
      symbolId: 'emergencyExit',
      layerId: '<layer-id>',
      x: 200,
      y: 150,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    arrow: {
      type: 'arrow',
      layerId: '<layer-id>',
      x: 100,
      y: 100,
      points: [0, 0, 150, 50],
      stroke: '#212529',
      strokeWidth: 2,
      rotation: 0,
    },
    text: {
      type: 'text',
      layerId: '<layer-id>',
      x: 300,
      y: 200,
      text: 'Sala principal',
      fontSize: 18,
      fill: '#212529',
    },
  },
};

export const registerEditorBridge = (api) => {
  if (typeof window !== 'undefined') {
    window.__INTELI_PDE_EDITOR__ = {
      schema: EDITOR_AI_SCHEMA,
      ...api,
    };
  }
};

export const unregisterEditorBridge = () => {
  if (typeof window !== 'undefined') {
    delete window.__INTELI_PDE_EDITOR__;
  }
};
