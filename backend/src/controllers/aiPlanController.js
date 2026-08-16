const { AIPlanValidationError, AIPlanProviderError } = require('../ai');

const providerErrorResponse = (error) => {
  const cause = error.cause;
  const notConfigured = cause?.code === 'AI_PROVIDER_NOT_CONFIGURED';
  const providerMessage = cause?.error?.message || cause?.message;

  console.error('Error del proveedor de IA', {
    status: cause?.status,
    code: cause?.code,
    type: cause?.type,
    message: providerMessage,
  });

  return {
    status: notConfigured ? 503 : 502,
    body: {
      message: notConfigured
        ? cause.message
        : (process.env.NODE_ENV !== 'production' && providerMessage ? providerMessage : error.message),
      code: notConfigured ? cause.code : (cause?.code || error.code),
    },
  };
};

const createAIPlanController = ({ aiPlanService, isProviderConfigured = () => false }) => {
  if (!aiPlanService) throw new TypeError('aiPlanService es obligatorio');

  const generatePlan = async (req, res) => {
    try {
      const result = await aiPlanService.generatePlan({
        instruction: req.body.instruction,
        document: req.body.document,
        context: req.body.context,
        requestId: req.body.requestId,
      });
      return res.json(result);
    } catch (error) {
      if (error instanceof AIPlanValidationError) {
        return res.status(400).json({ message: error.message, code: error.code, details: error.details });
      }
      if (error instanceof AIPlanProviderError) {
        const response = providerErrorResponse(error);
        return res.status(response.status).json(response.body);
      }
      throw error;
    }
  };

  const analyzeBuilding = async (req, res) => {
    try {
      const result = await aiPlanService.analyzeBuilding({
        document: req.body.document,
        context: req.body.context,
        requestId: req.body.requestId,
      });
      return res.json(result);
    } catch (error) {
      if (error instanceof AIPlanValidationError) {
        return res.status(400).json({ message: error.message, code: error.code, details: error.details });
      }
      if (error instanceof AIPlanProviderError) {
        const response = providerErrorResponse(error);
        return res.status(response.status).json(response.body);
      }
      throw error;
    }
  };

  const generateEvacuationPlan = async (req, res) => {
    try {
      const result = await aiPlanService.generateEvacuationPlan({
        document: req.body.document,
        context: req.body.context,
        requestId: req.body.requestId,
      });
      return res.json(result);
    } catch (error) {
      if (error instanceof AIPlanValidationError) {
        return res.status(400).json({ message: error.message, code: error.code, details: error.details });
      }
      if (error instanceof AIPlanProviderError) {
        const response = providerErrorResponse(error);
        return res.status(response.status).json(response.body);
      }
      throw error;
    }
  };

  const correctEvacuationPlan = async (req, res) => {
    try {
      return res.json(await aiPlanService.correctEvacuationPlan({ document: req.body.document, context: req.body.context, requestId: req.body.requestId }));
    } catch (error) {
      if (error instanceof AIPlanValidationError) return res.status(400).json({ message: error.message, code: error.code, details: error.details });
      if (error instanceof AIPlanProviderError) {
        const response = providerErrorResponse(error);
        return res.status(response.status).json(response.body);
      }
      throw error;
    }
  };

  const getCapabilities = (_req, res) => res.json({
    service: 'AIPlanService',
    version: 2,
    buildingAnalysis: true,
    evacuationPlanGeneration: true,
    automaticCorrection: true,
    operations: ['add', 'update', 'remove'],
    elementTypes: ['symbol', 'arrow', 'text', 'planImage'],
    providerConfigured: isProviderConfigured(),
  });

  return { generatePlan, analyzeBuilding, generateEvacuationPlan, correctEvacuationPlan, getCapabilities };
};

module.exports = createAIPlanController;
