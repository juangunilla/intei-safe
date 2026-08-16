const test = require('node:test');
const assert = require('node:assert/strict');
const { getApplicableRules, analyzeRegulatory, buildPhysicalMeasurements, ENGINE_VERSION } = require('../../src/regulatory/regulatoryEngine');
const { missingProfileFields } = require('../../src/regulatory/validation/regulatoryValidation');
const { evaluateProfileCompleteness, missingRequiredInputs } = require('../../src/regulatory/profile/profileCompleteness');

test('selecciona reglas nacionales y bonaerenses para una oficina', () => {
  const rules = getApplicableRules({ country: 'Argentina', province: 'Buenos Aires', municipality: 'Hurlingham', activity: 'oficina' });
  assert.equal(ENGINE_VERSION, '1.2.0');
  assert.ok(rules.some(({ id }) => id === 'AR-DEC-351-79-FIRE-PROTECTION'));
  assert.ok(rules.some(({ id }) => id === 'AR-BA-LOCAL-JURISDICTION-REVIEW'));
});

test('devuelve RegulatoryAnalysis preliminar y no verificable ante datos incompletos', () => {
  const result = analyzeRegulatory({
    profile: { country: 'Argentina', province: 'Buenos Aires', activity: 'oficina' },
    document: { buildingAnalysis: { doors: [{ center: { x: 10, y: 20 }, confidence: .8 }] }, elements: [] },
  });
  assert.equal(result.status, 'preliminary');
  assert.equal(result.professionalReviewRequired, true);
  assert.ok(result.missingInformation.includes('municipality'));
  assert.ok(result.complianceChecks.every(({ result: checkResult }) => checkResult === 'not_verifiable'));
  assert.equal(result.detectedElements[0].status, 'detected');
});

test('no marca cumplimiento aun con perfil completo si faltan validaciones geométricas y profesionales', () => {
  const result = analyzeRegulatory({ profile: { name: 'Oficina', country: 'Argentina', province: 'Buenos Aires', municipality: 'Hurlingham', activity: 'oficina', establishmentType: 'oficina' }, document: {} });
  assert.ok(result.applicableRules.length > 0);
  assert.ok(result.complianceChecks.every(({ result: checkResult }) => checkResult === 'not_verifiable'));
  assert.equal(result.criticalWarnings.length, 0);
});

test('no aplica reglas fuera del alcance configurado', () => {
  assert.deepEqual(getApplicableRules({ country: 'Uruguay', province: '', activity: 'oficina' }), []);
  assert.deepEqual(getApplicableRules({ country: 'Argentina', province: 'Buenos Aires', activity: 'industria' }), []);
});

test('identifica información crítica incompleta', () => {
  const missing = missingProfileFields({ country: 'Argentina', province: 'Buenos Aires', activity: 'oficina' });
  assert.ok(missing.includes('municipality'));
  assert.ok(missing.includes('name'));
});

test('recibe longitudes reales sólo cuando existe escala calibrada', () => {
  const unscaled = buildPhysicalMeasurements({ elements: [{ id: 'r1', type: 'arrow', points: [0, 0, 100, 0] }] });
  assert.equal(unscaled.routeLengths[0].meters, null);
  assert.equal(unscaled.routeLengths[0].verifiable, false);
  const scaled = buildPhysicalMeasurements({ scale: { calibrated: true, pixelsPerMeter: 20 }, elements: [{ id: 'r1', type: 'arrow', points: [0, 0, 100, 0] }] });
  assert.equal(scaled.routeLengths[0].meters, 5);
  assert.deepEqual(scaled.widthMeasurements, []);
  assert.deepEqual(scaled.areas, []);
});

test('expone anchos, áreas y sectores declarados para futuras reglas', () => {
  const context = buildPhysicalMeasurements({
    scale: { calibrated: true, pixelsPerMeter: 10 },
    measurements: [
      { id: 'w1', type: 'width', label: 'Puerta', elementId: 'door-1', pixels: 12 },
      { id: 'a1', type: 'area', label: 'Oficina', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }], pixels: 5000 },
    ],
    sectors: [{ id: 's1', name: 'Oficina', type: 'oficina', sourceMeasurementId: 'a1' }],
  });
  assert.equal(context.widthMeasurements[0].meters, 1.2);
  assert.equal(context.widthMeasurements[0].elementId, 'door-1');
  assert.equal(context.areas[0].squareMeters, 50);
  assert.equal(context.sectors[0].id, 's1');
});

test('preserva asociaciones de origen y salida en recorridos', () => {
  const context = buildPhysicalMeasurements({
    scale: { calibrated: true, pixelsPerMeter: 10 },
    elements: [{ id: 'arrow-1', type: 'arrow', routeId: 'sector-1-exit-1', sourceId: 'sector-1', exitId: 'exit-1', routeRole: 'primary', points: [0, 0, 100, 0] }],
  });
  assert.deepEqual(context.routeLengths[0], { elementId: 'arrow-1', routeId: 'sector-1-exit-1', sourceId: 'sector-1', exitId: 'exit-1', role: 'primary', pixels: 100, meters: 10, verifiable: true });
});

test('calcula ocupación de oficina con factor oficial y conserva not_verifiable', () => {
  const result = analyzeRegulatory({
    profile: { name: 'Oficina', country: 'Argentina', province: 'Buenos Aires', municipality: 'Hurlingham', activity: 'oficina', establishmentType: 'oficina', maximumOccupancy: 20, buildingStatus: 'existing', numberOfFloors: 1, egress: { exitCount: 2 } },
    document: { sectors: [{ id: 's1', name: 'Administración', type: 'oficina', areaSquareMeters: 80 }] },
  });
  const check = result.complianceChecks.find(({ ruleId }) => ruleId === 'AR-DEC-351-79-OFFICE-OCCUPANCY');
  assert.equal(check.measuredValue, 10);
  assert.equal(check.occupancy.occupancyFactor, 8);
  assert.equal(check.occupancy.occupancySource, 'calculated');
  assert.equal(check.result, 'not_verifiable');
});

test('la ocupación manual prevalece sin borrar el cálculo disponible', () => {
  const result = analyzeRegulatory({
    profile: { name: 'Oficina', country: 'Argentina', province: 'Buenos Aires', municipality: 'Hurlingham', activity: 'oficina', establishmentType: 'oficina', maximumOccupancy: 20, buildingStatus: 'existing', numberOfFloors: 1, egress: { exitCount: 2 } },
    document: { sectors: [{ id: 's1', name: 'Administración', type: 'oficina', areaSquareMeters: 80, occupancy: 14 }] },
  });
  const check = result.complianceChecks.find(({ ruleId }) => ruleId === 'AR-DEC-351-79-OFFICE-OCCUPANCY');
  assert.equal(check.measuredValue, 14);
  assert.equal(check.occupancy.manualOccupancy, 14);
  assert.equal(check.occupancy.calculatedOccupancy, 10);
  assert.equal(check.occupancy.occupancySource, 'manual');
});

test('ancho y recorrido medidos quedan no verificables sin requisito aplicable', () => {
  const result = analyzeRegulatory({
    profile: { name: 'Oficina', country: 'Argentina', province: 'Buenos Aires', municipality: 'Hurlingham', activity: 'oficina', establishmentType: 'oficina', maximumOccupancy: 20, buildingStatus: 'existing', numberOfFloors: 1, egress: { exitCount: 2 } },
    document: {
      scale: { calibrated: true, pixelsPerMeter: 20 },
      measurements: [{ id: 'w1', type: 'width', label: 'Puerta principal', elementId: 'door-1', pixels: 24 }],
      elements: [{ id: 'route-1', type: 'arrow', routeId: 's1-e1', sourceId: 's1', exitId: 'e1', points: [0, 0, 100, 0] }],
    },
  });
  const checks = result.complianceChecks.filter(({ ruleId }) => ruleId === 'AR-DEC-351-79-MEANS-OF-EGRESS');
  assert.ok(checks.every(({ result: checkResult }) => checkResult === 'not_verifiable'));
  assert.ok(checks.some((check) => check.measuredValue === 1.2 && check.evidence[0].id === 'w1'));
  assert.ok(checks.some((check) => check.measuredValue === 5 && check.evidence[0].fields.sourceId === 's1'));
});

test('las reglas exponen fuente, sección, versión y fecha de control', () => {
  const rule = getApplicableRules({ country: 'Argentina', province: 'Buenos Aires', activity: 'oficina' })[0];
  for (const field of ['country', 'province', 'municipality', 'activityType', 'source', 'sourceSection', 'sourceUrl', 'effectiveFrom', 'effectiveTo', 'ruleVersion', 'checkedAt']) {
    assert.ok(Object.hasOwn(rule, field), `falta ${field}`);
  }
});

test('ancho ausente y recorrido sin escala explican por qué no son verificables', () => {
  const result = analyzeRegulatory({
    profile: { name: 'Oficina', country: 'Argentina', province: 'Buenos Aires', municipality: 'Hurlingham', activity: 'oficina', establishmentType: 'oficina', maximumOccupancy: 20, buildingStatus: 'existing', numberOfFloors: 1, egress: { exitCount: 2 } },
    document: { elements: [{ id: 'route-1', type: 'arrow', routeId: 's1-e1', sourceId: 's1', exitId: 'e1', points: [0, 0, 100, 0] }] },
  });
  const checks = result.complianceChecks.filter(({ ruleId }) => ruleId === 'AR-DEC-351-79-MEANS-OF-EGRESS');
  const width = checks.find(({ title }) => title === 'Anchos de medios de escape');
  const route = checks.find(({ title }) => title.startsWith('Recorrido:'));
  assert.equal(width.result, 'not_verifiable');
  assert.match(width.observations, /No existe una medición manual/);
  assert.equal(route.measuredValue, null);
  assert.match(route.observations, /no tiene escala calibrada/);
  assert.equal(route.evidence[0].id, 's1-e1');
  assert.equal(route.evidence[0].fields.routeId, 's1-e1');
});

test('evalúa completitud y conserva false como dato informado', () => {
  const empty = evaluateProfileCompleteness({});
  assert.equal(empty.status, 'insufficient');
  const partial = evaluateProfileCompleteness({ buildingStatus: 'existing', buildingUse: 'oficina', mainActivity: 'oficina', numberOfFloors: 1, hasBasement: false });
  assert.equal(partial.status, 'partial');
  assert.ok(!partial.missingRecommended.includes('Existencia de subsuelo'));
});

test('requiredInputs se evalúa centralmente y bloquea reglas sin datos', () => {
  const rule = { requiredInputs: ['maximumOccupancy', 'buildingStatus', 'riskClassification.value'] };
  assert.deepEqual(missingRequiredInputs(rule, { maximumOccupancy: 20, buildingStatus: 'existing', riskClassification: { value: null } }), ['riskClassification.value']);
  const result = analyzeRegulatory({
    profile: { name: 'Oficina', country: 'Argentina', province: 'Buenos Aires', municipality: 'Hurlingham', activity: 'oficina', establishmentType: 'oficina' }, document: {},
  });
  const egress = result.complianceChecks.find(({ ruleId }) => ruleId === 'AR-DEC-351-79-MEANS-OF-EGRESS');
  assert.equal(egress.result, 'not_verifiable');
  assert.ok(egress.missingRequiredInputs.includes('maximumOccupancy'));
  assert.ok(result.profileCompleteness.missingCritical.length > 0);
});
