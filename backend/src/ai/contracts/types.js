/**
 * Tipos documentales del dominio. No dependen de ningún proveedor ni SDK.
 *
 * @typedef {Object} PlanOperation
 * @property {'add'|'update'|'remove'} action
 * @property {string=} elementId Identificador requerido para update/remove.
 * @property {Object=} element Elemento completo requerido para add.
 * @property {Object=} patch Propiedades a cambiar para update.
 *
 * @typedef {Object} AIPlanRequest
 * @property {string} instruction Instrucción del usuario.
 * @property {Object=} document Estado actual serializable del editor.
 * @property {Object=} context Contexto adicional neutral al proveedor.
 * @property {string=} requestId Identificador para trazabilidad.
 *
 * @typedef {Object} AIPlanResult
 * @property {PlanOperation[]} operations
 * @property {string=} explanation
 * @property {Object=} metadata Metadatos neutrales y opcionales.
 *
 * @typedef {Object} BuildingAnalysis
 * @property {1} version
 * @property {Object} coordinateSystem Coordenadas sobre los píxeles originales de la imagen.
 * @property {Object} source Transformación de la imagen para proyectar la geometría sobre el lienzo.
 * @property {Object[]} walls
 * @property {Object[]} doors
 * @property {Object[]} windows
 * @property {Object[]} corridors
 * @property {Object[]} rooms
 * @property {Object[]} stairs
 * @property {Object[]} emergencyExits
 * @property {Object[]} sectors
 * @property {Object[]} elevators
 * @property {Object[]} openAreas
 * @property {Object[]} hazards Riesgos explícitamente visibles, sin inferencias normativas.
 */

module.exports = {};
