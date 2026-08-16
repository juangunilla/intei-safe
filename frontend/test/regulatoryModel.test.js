import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPLIANCE_LABELS, groupComplianceChecks } from '../src/editor/regulatory/regulatoryModel.js';

test('expone estados preliminares sin etiqueta de aprobación', () => {
  assert.equal(COMPLIANCE_LABELS.complies, 'Cumple preliminarmente');
  assert.ok(!Object.values(COMPLIANCE_LABELS).includes('Aprobado'));
});

test('agrupa verificaciones y degrada resultados desconocidos a no verificable', () => {
  const groups = groupComplianceChecks([{ ruleId: 'a', result: 'does_not_comply' }, { ruleId: 'b', result: 'otro' }]);
  assert.equal(groups.does_not_comply.length, 1);
  assert.equal(groups.not_verifiable.length, 1);
});
