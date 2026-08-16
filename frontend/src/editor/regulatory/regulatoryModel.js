export const COMPLIANCE_LABELS = {
  complies: 'Cumple preliminarmente',
  does_not_comply: 'Posible incumplimiento',
  not_verifiable: 'No verificable',
  not_applicable: 'No aplica',
};

export const groupComplianceChecks = (checks = []) => checks.reduce((groups, check) => {
  const key = COMPLIANCE_LABELS[check.result] ? check.result : 'not_verifiable';
  groups[key].push(check);
  return groups;
}, { complies: [], does_not_comply: [], not_verifiable: [], not_applicable: [] });
