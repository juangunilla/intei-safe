import test from 'node:test';
import assert from 'node:assert/strict';
import { createEstablishmentProfile, getMissingProfileInformation } from '../src/editor/establishment/establishmentProfile.js';
import { evaluateProfileCompleteness } from '../src/editor/establishment/profileCompleteness.js';

test('crea el caso inicial argentino para oficina sin inventar datos del establecimiento', () => {
  const profile = createEstablishmentProfile();
  assert.equal(profile.country, 'Argentina');
  assert.equal(profile.province, 'Buenos Aires');
  assert.equal(profile.activity, 'oficina');
  assert.equal(profile.name, undefined);
});

test('crea el perfil inicial cuando el perfil persistido es null', () => {
  const profile = createEstablishmentProfile(null);
  assert.equal(profile.country, 'Argentina');
  assert.equal(profile.buildingUse, '');
  assert.equal(profile.fireProtection.extinguishers.present, null);
  assert.ok(getMissingProfileInformation(null).length > 0);
});

test('evalúa perfiles vacío, parcial y suficiente sin interpretar cumplimiento', () => {
  const empty = evaluateProfileCompleteness(createEstablishmentProfile());
  assert.equal(empty.status, 'insufficient');
  assert.ok(empty.missingCritical.includes('Clasificación de riesgo'));
  const partial = evaluateProfileCompleteness(createEstablishmentProfile({ buildingStatus: 'existing', buildingUse: 'oficina', mainActivity: 'oficina', numberOfFloors: 1 }));
  assert.equal(partial.status, 'partial');
  const sufficient = evaluateProfileCompleteness(createEstablishmentProfile({
    buildingStatus: 'existing', buildingUse: 'oficina', mainActivity: 'oficina', numberOfFloors: 1, totalCoveredAreaM2: 100,
    maximumOccupancy: 12, riskClassification: { value: 'Declarada', source: 'manual', confirmedByProfessional: true }, egress: { exitCount: 2 },
  }));
  assert.equal(sufficient.status, 'sufficient');
  assert.equal(sufficient.missingCritical.length, 0);
});

test('distingue false de no informado y conserva confirmación profesional', () => {
  const profile = createEstablishmentProfile({ hasBasement: false, fireProtection: { sprinklers: false }, riskClassification: { value: null, source: 'unknown', confirmedByProfessional: false } });
  assert.equal(profile.hasBasement, false);
  assert.equal(profile.fireProtection.sprinklers, false);
  assert.equal(profile.fireProtection.automaticDetection, null);
  assert.equal(profile.riskClassification.value, null);
});

test('distingue información obligatoria faltante de la recomendada', () => {
  const missing = getMissingProfileInformation(createEstablishmentProfile({ name: 'Oficina', municipality: 'Hurlingham', establishmentType: 'oficina' }));
  assert.deepEqual(missing, []);
  const incomplete = getMissingProfileInformation(createEstablishmentProfile());
  assert.ok(incomplete.some(({ key }) => key === 'municipality'));
});
