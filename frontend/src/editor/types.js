export const ELEMENT_TYPES = {
  SYMBOL: 'symbol',
  ARROW: 'arrow',
  TEXT: 'text',
  CALIBRATE: 'calibrate',
  MEASURE: 'measure',
  MEASURE_WIDTH: 'measure-width',
  MEASURE_AREA: 'measure-area',
  PLAN_IMAGE: 'planImage',
};

export const TOOLS = {
  SELECT: 'select',
  PAN: 'pan',
  SYMBOL: 'symbol',
  ARROW: 'arrow',
  TEXT: 'text',
};

export const createId = () => crypto.randomUUID();

export const EDITOR_DOCUMENT_SCHEMA_VERSION = 3;

export const createLayer = (name, order = 0) => ({
  id: createId(),
  name,
  visible: true,
  locked: false,
  order,
});

export const createDefaultDocument = () => {
  const defaultLayer = createLayer('Capa 1', 0);
  return {
    version: 1,
    schemaVersion: EDITOR_DOCUMENT_SCHEMA_VERSION,
    layers: [defaultLayer],
    elements: [],
    buildingAnalysis: null,
    establishmentProfile: null,
    regulatoryAnalysis: null,
    advisorAnalysis: null,
    auditTrail: [],
    scale: { calibrated: false },
    measurements: [],
    sectors: [],
    measurementAssociations: [],
    simulations: [],
    simulationModelDraft: null,
    corporateTemplates: [],
    selectedCorporateTemplateId: null,
    corporateAssets: {},
    activeLayerId: defaultLayer.id,
    viewport: { scale: 1, x: 0, y: 0 },
  };
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Non-destructive compatibility layer for documents created by older editor versions.
// Unknown properties and every valid existing value are intentionally preserved.
export const normalizeEditorDocument = (document = {}) => {
  const source = isObject(document) ? document : {};
  const defaults = createDefaultDocument();
  const layers = Array.isArray(source.layers) && source.layers.length ? source.layers : defaults.layers;

  return {
    ...defaults,
    ...source,
    schemaVersion: source.schemaVersion ?? EDITOR_DOCUMENT_SCHEMA_VERSION,
    layers,
    elements: Array.isArray(source.elements) ? source.elements : defaults.elements,
    buildingAnalysis: source.buildingAnalysis ?? defaults.buildingAnalysis,
    establishmentProfile: source.establishmentProfile ?? defaults.establishmentProfile,
    regulatoryAnalysis: source.regulatoryAnalysis ?? defaults.regulatoryAnalysis,
    advisorAnalysis: source.advisorAnalysis ?? defaults.advisorAnalysis,
    auditTrail: Array.isArray(source.auditTrail) ? source.auditTrail : defaults.auditTrail,
    scale: isObject(source.scale) ? source.scale : defaults.scale,
    measurements: Array.isArray(source.measurements) ? source.measurements : defaults.measurements,
    sectors: Array.isArray(source.sectors) ? source.sectors : defaults.sectors,
    measurementAssociations: Array.isArray(source.measurementAssociations) ? source.measurementAssociations : defaults.measurementAssociations,
    simulations: Array.isArray(source.simulations) ? source.simulations : defaults.simulations,
    simulationModelDraft: isObject(source.simulationModelDraft) ? source.simulationModelDraft : defaults.simulationModelDraft,
    corporateTemplates: Array.isArray(source.corporateTemplates) ? source.corporateTemplates : defaults.corporateTemplates,
    selectedCorporateTemplateId: source.selectedCorporateTemplateId ?? defaults.selectedCorporateTemplateId,
    corporateAssets: isObject(source.corporateAssets) ? source.corporateAssets : defaults.corporateAssets,
    activeLayerId: source.activeLayerId ?? layers[0]?.id ?? null,
    viewport: isObject(source.viewport) ? { ...defaults.viewport, ...source.viewport } : defaults.viewport,
  };
};

export const createSymbolElement = ({ symbolId, x, y, layerId, overrides = {} }) => ({
  id: createId(),
  type: ELEMENT_TYPES.SYMBOL,
  symbolId,
  layerId,
  x,
  y,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  ...overrides,
});

export const createArrowElement = ({ x, y, layerId, overrides = {} }) => ({
  id: createId(),
  type: ELEMENT_TYPES.ARROW,
  layerId,
  x,
  y,
  points: [0, 0, 120, 0],
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  stroke: '#212529',
  strokeWidth: 2,
  pointerLength: 12,
  pointerWidth: 12,
  ...overrides,
});

export const createTextElement = ({ x, y, layerId, text = 'Texto', overrides = {} }) => ({
  id: createId(),
  type: ELEMENT_TYPES.TEXT,
  layerId,
  x,
  y,
  text,
  fontSize: 16,
  fill: '#212529',
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  ...overrides,
});

export const createPlanImageElement = ({ src, width, height, fileName, x = 0, y = 0, layerId, overrides = {} }) => ({
  id: createId(),
  type: ELEMENT_TYPES.PLAN_IMAGE,
  layerId,
  src,
  fileName,
  width,
  height,
  x,
  y,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  ...overrides,
});

export const normalizeElement = (element) => {
  const base = {
    id: element.id || createId(),
    layerId: element.layerId,
    x: element.x ?? 0,
    y: element.y ?? 0,
    rotation: element.rotation ?? 0,
    scaleX: element.scaleX ?? 1,
    scaleY: element.scaleY ?? 1,
  };

  switch (element.type) {
    case ELEMENT_TYPES.SYMBOL:
      return createSymbolElement({
        symbolId: element.symbolId,
        x: base.x,
        y: base.y,
        layerId: base.layerId,
        overrides: { ...base, ...element },
      });
    case ELEMENT_TYPES.ARROW:
      return createArrowElement({
        x: base.x,
        y: base.y,
        layerId: base.layerId,
        overrides: { ...base, ...element },
      });
    case ELEMENT_TYPES.TEXT:
      return createTextElement({
        x: base.x,
        y: base.y,
        layerId: base.layerId,
        text: element.text,
        overrides: { ...base, ...element },
      });
    case ELEMENT_TYPES.PLAN_IMAGE:
      return createPlanImageElement({
        src: element.src,
        width: element.width,
        height: element.height,
        fileName: element.fileName,
        x: base.x,
        y: base.y,
        layerId: base.layerId,
        overrides: { ...base, ...element },
      });
    default:
      throw new Error(`Tipo de elemento desconocido: ${element.type}`);
  }
};
