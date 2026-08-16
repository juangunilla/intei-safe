const REQUIRED_PROFILE_FIELDS = ['name', 'country', 'province', 'municipality', 'activity', 'establishmentType'];

const missingProfileFields = (profile = {}) => REQUIRED_PROFILE_FIELDS.filter((field) => {
  const value = profile[field];
  return value === undefined || value === null || String(value).trim() === '';
});

const validateRule = (rule) => {
  const required = ['id', 'country', 'province', 'municipality', 'activityType', 'title', 'source', 'sourceSection', 'sourceUrl', 'summary', 'validationType', 'severity', 'requiresProfessionalReview', 'effectiveFrom', 'effectiveTo', 'ruleVersion', 'checkedAt', 'requiredInputs'];
  const missing = required.filter((field) => rule[field] === undefined);
  if (missing.length) throw new TypeError(`Regla ${rule.id || 'sin id'} incompleta: ${missing.join(', ')}`);
  return rule;
};

module.exports = { REQUIRED_PROFILE_FIELDS, missingProfileFields, validateRule };
