class AIPlanError extends Error {
  constructor(message, { code = 'AI_PLAN_ERROR', cause, details } = {}) {
    super(message, { cause });
    this.name = 'AIPlanError';
    this.code = code;
    this.details = details;
  }
}

class AIPlanValidationError extends AIPlanError {
  constructor(message, details) {
    super(message, { code: 'AI_PLAN_VALIDATION_ERROR', details });
    this.name = 'AIPlanValidationError';
  }
}

class AIPlanProviderError extends AIPlanError {
  constructor(message, cause) {
    super(message, { code: 'AI_PLAN_PROVIDER_ERROR', cause });
    this.name = 'AIPlanProviderError';
  }
}

module.exports = { AIPlanError, AIPlanValidationError, AIPlanProviderError };
