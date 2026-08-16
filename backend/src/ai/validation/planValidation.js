const { AIPlanValidationError } = require('../errors/AIPlanError');

const ACTIONS = new Set(['add', 'update', 'remove']);
const COLLECTIONS = ['walls', 'rooms', 'doors', 'windows', 'corridors', 'stairs', 'emergencyExits', 'sectors', 'elevators', 'openAreas', 'hazards'];
const PLAN_IMAGE_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i;
const MAX_OPERATIONS = 500;

const validateRequest = (request) => {
  if (!request || typeof request !== 'object') {
    throw new AIPlanValidationError('La solicitud debe ser un objeto');
  }
  if (typeof request.instruction !== 'string' || !request.instruction.trim()) {
    throw new AIPlanValidationError('instruction es obligatorio');
  }
  if (request.instruction.length > 4000) throw new AIPlanValidationError('instruction supera el máximo de 4000 caracteres');
  if (request.document !== undefined && (typeof request.document !== 'object' || request.document === null)) {
    throw new AIPlanValidationError('document debe ser un objeto');
  }
};

const validateAnalysisRequest = (request) => {
  if (!request || typeof request !== 'object') throw new AIPlanValidationError('La solicitud debe ser un objeto');
  if (!request.document || typeof request.document !== 'object') {
    throw new AIPlanValidationError('document es obligatorio');
  }
  const images = request.document.elements?.filter((element) => element.type === 'planImage' && element.src) || [];
  if (!images.length) throw new AIPlanValidationError('Cargá una imagen del plano antes de analizarlo con IA');
  if (images.length > 3) throw new AIPlanValidationError('Se permiten hasta 3 imágenes por análisis');
  images.forEach((image) => {
    if (typeof image.src !== 'string' || !PLAN_IMAGE_PATTERN.test(image.src)) {
      throw new AIPlanValidationError('La imagen debe ser PNG, JPG o WEBP válida');
    }
    if (!Number.isFinite(image.width) || image.width <= 0 || !Number.isFinite(image.height) || image.height <= 0) {
      throw new AIPlanValidationError('Las dimensiones de la imagen son inválidas');
    }
  });
};

const validateOperation = (operation, index) => {
  if (!operation || !ACTIONS.has(operation.action)) {
    throw new AIPlanValidationError(`Operación ${index}: action no es válido`);
  }
  if (operation.action === 'add' && (!operation.element || typeof operation.element !== 'object')) {
    throw new AIPlanValidationError(`Operación ${index}: add requiere element`);
  }
  if (['update', 'remove'].includes(operation.action) && !operation.elementId) {
    throw new AIPlanValidationError(`Operación ${index}: ${operation.action} requiere elementId`);
  }
  if (operation.action === 'update' && (!operation.patch || typeof operation.patch !== 'object')) {
    throw new AIPlanValidationError(`Operación ${index}: update requiere patch`);
  }
};

const normalizeResult = (result) => {
  if (!result || typeof result !== 'object' || !Array.isArray(result.operations)) {
    throw new AIPlanValidationError('El proveedor debe devolver un arreglo operations');
  }
  if (result.operations.length > MAX_OPERATIONS) throw new AIPlanValidationError(`El proveedor superó el máximo de ${MAX_OPERATIONS} operaciones`);
  result.operations.forEach(validateOperation);
  return {
    operations: result.operations,
    notVerifiable: Array.isArray(result.notVerifiable) ? result.notVerifiable.filter((item) => item?.status === 'not_verifiable' && typeof item.reason === 'string') : [],
    explanation: typeof result.explanation === 'string' ? result.explanation : '',
    metadata: result.metadata && typeof result.metadata === 'object' ? result.metadata : {},
  };
};

const normalizeAnalysis = (result) => {
  if (!result || typeof result !== 'object') throw new AIPlanValidationError('El proveedor debe devolver un análisis');
  const normalized = {
    version: 1,
    coordinateSystem: result.coordinateSystem && typeof result.coordinateSystem === 'object'
      ? result.coordinateSystem
      : { unit: 'image-pixels', origin: 'top-left' },
    summary: typeof result.summary === 'string' ? result.summary : '',
    warnings: Array.isArray(result.warnings) ? result.warnings.filter((item) => typeof item === 'string') : [],
  };
  COLLECTIONS.forEach((name) => {
    if (result[name] !== undefined && !Array.isArray(result[name])) {
      throw new AIPlanValidationError(`${name} debe ser un arreglo`);
    }
    normalized[name] = (result[name] || []).filter((item) => item && typeof item === 'object');
  });
  return normalized;
};

module.exports = { validateRequest, validateAnalysisRequest, normalizeResult, normalizeAnalysis };
