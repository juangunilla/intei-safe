const OpenAI = require('openai');

const SYSTEM_PROMPT = `Actuás únicamente como redactor técnico.
No generes hechos nuevos. No infieras cumplimiento. No agregues valores ni normativa.
No cambies prioridades, estados, recomendaciones ni evidencia. No agregues ni elimines observaciones.
Reescribí únicamente la información suministrada. Si un dato está incompleto, conservá explícitamente su incertidumbre.
No transformes “no verificable” en “cumple”. No transformes “posible incumplimiento” en “incumplimiento confirmado”.
No utilices lenguaje de certificación. Mantené exactamente los IDs recibidos y devolvé exclusivamente el esquema solicitado.`;

const schemaFor = (input) => {
  const stringMap = (ids) => ({ type: 'object', properties: Object.fromEntries(ids.map((id) => [id, { type: 'string', minLength: 1, maxLength: 2200 }])), required: ids, additionalProperties: false });
  return {
    type: 'object',
    properties: {
      executiveSummary: { type: 'string', minLength: 1, maxLength: 2200 },
      observationNarratives: stringMap(input.observations.map(({ id }) => id)),
      recommendationNarratives: stringMap(input.recommendations.map(({ id }) => id)),
    },
    required: ['executiveSummary', 'observationNarratives', 'recommendationNarratives'],
    additionalProperties: false,
  };
};

class AdvisorNarrativeProvider {
  constructor({ apiKey, model, client, timeoutMs = 15000, maxOutputTokens = 6000 } = {}) {
    if ((!apiKey && !client) || !model) throw new TypeError('AdvisorNarrativeProvider requiere apiKey/client y model');
    this.client = client || new OpenAI({ apiKey }); this.model = model; this.timeoutMs = timeoutMs; this.maxOutputTokens = maxOutputTokens;
  }

  async generate(input) {
    const response = await this.client.responses.create({
      model: this.model,
      instructions: SYSTEM_PROMPT,
      input: [{ role: 'user', content: [{ type: 'input_text', text: `Reescribí este contenido sin añadir información:\n${JSON.stringify(input)}` }] }],
      max_output_tokens: this.maxOutputTokens,
      text: { format: { type: 'json_schema', name: 'advisor_narrative', strict: true, schema: schemaFor(input) } },
    }, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.output_text) throw new Error('El proveedor no devolvió narrativa');
    return JSON.parse(response.output_text);
  }
}

module.exports = AdvisorNarrativeProvider;
