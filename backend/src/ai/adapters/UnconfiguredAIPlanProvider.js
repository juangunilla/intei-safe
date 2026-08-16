const AIPlanProvider = require('../contracts/AIPlanProvider');

/**
 * Adaptador seguro utilizado mientras no exista un proveedor real.
 * Permite montar el módulo HTTP sin acoplar la aplicación a un proveedor.
 */
class UnconfiguredAIPlanProvider extends AIPlanProvider {
  async generatePlan() {
    const error = new Error('No hay un proveedor de IA configurado');
    error.code = 'AI_PROVIDER_NOT_CONFIGURED';
    throw error;
  }


  async analyzeBuilding() {
    return this.generatePlan();
  }
}

module.exports = UnconfiguredAIPlanProvider;
