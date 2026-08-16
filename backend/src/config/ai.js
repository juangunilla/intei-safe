const { AIPlanService } = require('../ai');
const UnconfiguredAIPlanProvider = require('../ai/adapters/UnconfiguredAIPlanProvider');
const OpenAIPlanProvider = require('../ai/adapters/OpenAIPlanProvider');

// Composition root: este es el único lugar donde se elige la implementación.
// En el futuro se reemplaza por: configureAIPlanProvider(new MiProveedor()).
let provider = new UnconfiguredAIPlanProvider();
let configured = false;

if (process.env.OPENAI_API_KEY) {
  provider = new OpenAIPlanProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-5.6-terra',
  });
  configured = true;
}

const configureAIPlanProvider = (nextProvider) => {
  if (!nextProvider || typeof nextProvider.generatePlan !== 'function' || typeof nextProvider.analyzeBuilding !== 'function') {
    throw new TypeError('El proveedor debe implementar generatePlan(request) y analyzeBuilding(request)');
  }
  provider = nextProvider;
  configured = !(nextProvider instanceof UnconfiguredAIPlanProvider);
};

const createAIPlanService = () => new AIPlanService({
  // Resuelve el proveedor al ejecutar, permitiendo configurarlo al iniciar la app.
  provider: {
    get model() { return provider.model || 'unconfigured'; },
    generatePlan: (request) => provider.generatePlan(request),
    analyzeBuilding: (request) => provider.analyzeBuilding(request),
  },
});

const isAIPlanProviderConfigured = () => configured;

module.exports = { configureAIPlanProvider, createAIPlanService, isAIPlanProviderConfigured };
