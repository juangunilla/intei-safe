const AdvisorNarrativeProvider = require('../advisor/AdvisorNarrativeProvider');
const AdvisorNarrativeService = require('../advisor/AdvisorNarrativeService');

const model = process.env.ADVISOR_NARRATIVE_MODEL?.trim();
const configured = Boolean(process.env.OPENAI_API_KEY?.trim() && model);
const provider = configured ? new AdvisorNarrativeProvider({ apiKey: process.env.OPENAI_API_KEY, model }) : null;

const createAdvisorNarrativeService = () => new AdvisorNarrativeService({ provider, configured });

module.exports = { createAdvisorNarrativeService };
