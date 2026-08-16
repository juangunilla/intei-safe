const AIPlanProvider = require('../contracts/AIPlanProvider');
const { AIPlanProviderError, AIPlanValidationError } = require('../errors/AIPlanError');
const { normalizeAnalysis, normalizeResult, validateAnalysisRequest, validateRequest } = require('../validation/planValidation');

/**
 * Caso de uso para generar operaciones sobre un plano mediante IA.
 * Su única dependencia es el puerto AIPlanProvider recibido por constructor.
 */
class AIPlanService {
  /** @param {{ provider: AIPlanProvider }} dependencies */
  constructor({ provider } = {}) {
    if (!provider || typeof provider.generatePlan !== 'function') {
      throw new TypeError('AIPlanService requiere un AIPlanProvider válido');
    }
    this.provider = provider;
  }

  /**
   * @param {import('../contracts/types').AIPlanRequest} request
   * @returns {Promise<import('../contracts/types').AIPlanResult>}
   */
  async generatePlan(request) {
    validateRequest(request);

    const normalizedRequest = {
      instruction: request.instruction.trim(),
      document: request.document || null,
      context: request.context || {},
      requestId: request.requestId,
    };

    try {
      const result = await this.provider.generatePlan(normalizedRequest);
      return normalizeResult(result);
    } catch (error) {
      if (error instanceof AIPlanValidationError) throw error;
      throw new AIPlanProviderError('El proveedor no pudo generar el plano', error);
    }
  }


  async analyzeBuilding(request) {
    validateAnalysisRequest(request);
    const normalizedRequest = {
      document: request.document,
      context: request.context || {},
      requestId: request.requestId,
    };

    try {
      const result = await this.provider.analyzeBuilding(normalizedRequest);
      const analysis = normalizeAnalysis(result);
      const image = request.document.elements.find((element) => element.type === 'planImage' && element.src);
      return {
        ...analysis,
        modelVersion: this.provider.model || 'unconfigured',
        coordinateSystem: {
          ...analysis.coordinateSystem,
          unit: 'image-pixels',
          origin: 'top-left',
          imageWidth: image.width,
          imageHeight: image.height,
        },
        source: {
          imageElementId: image.id || null,
          fileName: image.fileName || null,
          canvasTransform: {
            x: image.x ?? 0,
            y: image.y ?? 0,
            scaleX: image.scaleX ?? 1,
            scaleY: image.scaleY ?? 1,
            rotation: image.rotation ?? 0,
          },
        },
      };
    } catch (error) {
      if (error instanceof AIPlanValidationError) throw error;
      throw new AIPlanProviderError('El proveedor no pudo analizar el edificio', error);
    }
  }

  async generateEvacuationPlan(request) {
    validateAnalysisRequest(request);
    if (!request.document.buildingAnalysis || typeof request.document.buildingAnalysis !== 'object') {
      throw new AIPlanValidationError('Analizá el edificio antes de generar el plan de evacuación');
    }
    const availableSymbols = request.context?.availableSymbols || [];
    if (!availableSymbols.length) throw new AIPlanValidationError('No se informó el catálogo de símbolos');

    const result = await this.generatePlan({
      instruction: 'Generá un plan de evacuación completo usando el análisis arquitectónico adjunto.',
      document: request.document,
      context: {
        ...(request.context || {}),
        task: 'generate-evacuation-plan',
        requiredElementTypes: ['symbol', 'arrow'],
        candidateSymbolIds: availableSymbols.map((symbol) => symbol.id),
      },
      requestId: request.requestId,
    });
    const allowedSymbols = new Set(availableSymbols.map((symbol) => symbol.id));
    result.operations.forEach((operation, index) => {
      if (operation.action !== 'add' || !['symbol', 'arrow'].includes(operation.element?.type)) {
        throw new AIPlanValidationError(`Operación ${index}: el generador sólo puede agregar símbolos o flechas`);
      }
      if (operation.element.type === 'symbol' && !allowedSymbols.has(operation.element.symbolId)) {
        throw new AIPlanValidationError(`Operación ${index}: símbolo desconocido ${operation.element.symbolId}`);
      }
      if (!Number.isFinite(operation.element.x) || !Number.isFinite(operation.element.y)) {
        throw new AIPlanValidationError(`Operación ${index}: coordenadas inválidas`);
      }
      if (!Number.isFinite(operation.element.confidence) || operation.element.confidence < 0 || operation.element.confidence > 1) {
        throw new AIPlanValidationError(`Operación ${index}: confidence debe estar entre 0 y 1`);
      }
      if (typeof operation.element.source !== 'string' || !operation.element.source.trim()) throw new AIPlanValidationError(`Operación ${index}: source es obligatorio`);
      if (operation.element.status !== 'proposed') throw new AIPlanValidationError(`Operación ${index}: status debe ser proposed`);
      if (typeof operation.element.justification !== 'string' || !operation.element.justification.trim()) throw new AIPlanValidationError(`Operación ${index}: justification es obligatoria`);
      if (operation.element.type === 'arrow') {
        if (!Array.isArray(operation.element.points) || operation.element.points.length < 4 || operation.element.points.some((point) => !Number.isFinite(point))) {
          throw new AIPlanValidationError(`Operación ${index}: geometría de flecha inválida`);
        }
      }
    });
    return { ...result, metadata: { ...result.metadata, modelVersion: this.provider.model || 'unconfigured' } };
  }

  async correctEvacuationPlan(request) {
    validateAnalysisRequest(request);
    if (!request.document.buildingAnalysis) throw new AIPlanValidationError('Analizá el edificio antes de corregir el plan');
    const availableSymbols = request.context?.availableSymbols || [];
    const allowedSymbols = new Set(availableSymbols.map((symbol) => symbol.id));
    const movableIds = new Set(request.document.elements
      .filter((element) => element.aiGenerated && !element.userModified && !element.generatedRoute)
      .map((element) => element.id));
    const protectedIds = request.document.elements.filter((element) => element.userModified || !element.aiGenerated).map((element) => element.id);
    const normalizedRequest = {
      instruction: `Corregí y optimizá el plan. Agregá señalización faltante y reubicá solamente objetos automáticos no modificados.
No borres nada. Las flechas y rutas serán recalculadas por el motor local, por lo que no agregues ni actualices arrows.`,
      document: request.document,
      context: { ...(request.context || {}), task: 'auto-correct', movableElementIds: [...movableIds], protectedElementIds: protectedIds },
      requestId: request.requestId,
    };
    let result;
    try {
      result = normalizeResult(await this.provider.generatePlan(normalizedRequest));
    } catch (error) {
      if (error instanceof AIPlanValidationError) throw error;
      throw new AIPlanProviderError('El proveedor no pudo corregir el plano', error);
    }
    const allowedPatchKeys = new Set(['x', 'y', 'rotation', 'scaleX', 'scaleY']);
    result.operations.forEach((operation, index) => {
      if (operation.action === 'remove') throw new AIPlanValidationError(`Operación ${index}: el corrector no puede borrar elementos`);
      if (operation.action === 'update') {
        if (!movableIds.has(operation.elementId)) throw new AIPlanValidationError(`Operación ${index}: intentó modificar un elemento protegido`);
        if (Object.keys(operation.patch).some((key) => !allowedPatchKeys.has(key))) throw new AIPlanValidationError(`Operación ${index}: contiene cambios no permitidos`);
      }
      if (operation.action === 'add') {
        if (operation.element?.type !== 'symbol' || !allowedSymbols.has(operation.element.symbolId)) throw new AIPlanValidationError(`Operación ${index}: sólo se pueden agregar señales conocidas`);
      }
      const geometry = operation.action === 'add' ? operation.element : operation.patch;
      if (geometry.x !== undefined && !Number.isFinite(geometry.x)) throw new AIPlanValidationError(`Operación ${index}: coordenada x inválida`);
      if (geometry.y !== undefined && !Number.isFinite(geometry.y)) throw new AIPlanValidationError(`Operación ${index}: coordenada y inválida`);
    });
    return result;
  }
}

module.exports = AIPlanService;
