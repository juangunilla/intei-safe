const { deterministicFallback, validateAdvisorNarrativeInput, validateAdvisorNarrativeOutput } = require('./advisorNarrativeValidation');

class AdvisorNarrativeService {
  constructor({ provider = null, configured = false } = {}) { this.provider = provider; this.configured = configured; }

  capabilities() { return { available: Boolean(this.configured && this.provider), provider: this.configured ? 'openai' : null, model: this.configured ? this.provider.model : null, maxObservations: 40 }; }

  async generate(rawInput) {
    const input = validateAdvisorNarrativeInput(rawInput);
    const fallback = deterministicFallback(input);
    if (!this.configured || !this.provider) return { narrative: fallback, narrativeMode: 'deterministic', fallbackUsed: true, validationResult: 'provider_not_configured', provider: null, model: null };
    try {
      const { projectId: _projectId, ...providerInput } = input;
      const narrative = validateAdvisorNarrativeOutput(input, await this.provider.generate(providerInput));
      return { narrative, narrativeMode: 'assisted', fallbackUsed: false, validationResult: 'valid', provider: 'openai', model: this.provider.model };
    } catch (error) {
      return { narrative: fallback, narrativeMode: 'deterministic', fallbackUsed: true, validationResult: error.name === 'TimeoutError' ? 'timeout' : 'rejected', provider: 'openai', model: this.provider.model };
    }
  }
}

module.exports = AdvisorNarrativeService;
