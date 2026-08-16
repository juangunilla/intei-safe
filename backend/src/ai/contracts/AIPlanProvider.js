/**
 * Puerto que debe implementar cualquier proveedor de IA para planos.
 *
 * El dominio nunca debe importar un SDK concreto. Un adaptador externo recibe
 * la solicitud normalizada y devuelve un resultado conforme a este contrato.
 */
class AIPlanProvider {
  /**
   * @param {import('./types').AIPlanRequest} request
   * @returns {Promise<import('./types').AIPlanResult>}
   */
  async generatePlan(_request) {
    throw new Error('AIPlanProvider.generatePlan debe ser implementado');
  }

  /** Analiza la arquitectura del plano sin producir elementos gráficos. */
  async analyzeBuilding(_request) {
    throw new Error('AIPlanProvider.analyzeBuilding debe ser implementado');
  }
}

module.exports = AIPlanProvider;
