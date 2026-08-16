const test = require('node:test');
const assert = require('node:assert/strict');
const { applyExpectedDocumentVersion } = require('../../src/services/projectService');

test('la versión cero también acepta proyectos heredados sin documentVersion', () => {
  const filter = applyExpectedDocumentVersion({ owner: 'owner' }, 0);
  assert.deepEqual(filter.$or, [
    { documentVersion: 0 },
    { documentVersion: { $exists: false } },
    { documentVersion: null },
  ]);
});

test('las versiones posteriores conservan comparación estricta', () => {
  const filter = applyExpectedDocumentVersion({ owner: 'owner' }, 3);
  assert.equal(filter.documentVersion, 3);
  assert.equal(filter.$or, undefined);
});
