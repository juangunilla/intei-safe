import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectBundle, restoreProjectBundle } from '../src/editor/io/projectBundle.js';
import { normalizeEditorDocument } from '../src/editor/types.js';

const image = { id: 'plan-1', type: 'planImage', src: 'data:image/png;base64,AAAA', width: 100, height: 80 };
const symbol = { id: 'symbol-1', type: 'symbol', symbolId: 'extinguisher', x: 20, y: 30, userModified: true };
const document = {
  version: 1,
  layers: [{ id: 'layer-1', name: 'Capa 1', visible: true, locked: false, order: 0 }],
  activeLayerId: 'layer-1',
  viewport: { scale: 1.5, x: 12, y: 24 },
  elements: [image, symbol],
  buildingAnalysis: { rooms: [{ id: 'room-1' }], warnings: ['Verificar salida'] },
  scale: { calibrated: true, pixelsPerMeter: 20, referenceDistanceMeters: 5, referenceDistancePixels: 100 },
  measurements: [{ id: 'w1', type: 'width', points: [{ x: 0, y: 0 }, { x: 20, y: 0 }], pixels: 20, meters: 1, visible: true }],
  sectors: [{ id: 's1', name: 'Pasillo', type: 'pasillo', polygon: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 20 }], areaSquareMeters: .5, occupancy: null, notes: '' }],
  measurementAssociations: [{ elementId: 'door-1', widthMeasurementId: 'w1' }],
  establishmentProfile: { buildingStatus: 'existing', numberOfFloors: 2, riskClassification: { value: 'manual', source: 'manual', confirmedByProfessional: true }, fireProtection: { sprinklers: false }, egress: { exitCount: 2 }, fieldMetadata: { buildingStatus: { value: 'existing', source: 'professional', confirmed: true, updatedAt: '2026-08-07T12:00:00.000Z' } } },
  auditTrail: [{ type: 'establishment_profile_update', date: '2026-08-07T12:00:00.000Z' }],
  simulations: [{ id: 'sim-1', status: 'completed', engineVersion: '1.0.0', planVersion: 1, parameters: { randomSeed: 'seed' }, scenario: { name: 'Normal' }, results: { evacuated: 1 }, events: [{ timestampSeconds: 10, type: 'agent_evacuated', agentId: 'a1' }] }],
  advisorAnalysis: { engineVersion: '1.0.0', executiveSummary: { general: 'Resumen' }, observations: [{ id: 'o1', status: 'open', evidence: [] }] },
  corporateTemplates: [{ id: 'template-1', name: 'Principal', companyName: 'Empresa', logoAssetId: 'brand-1' }],
  selectedCorporateTemplateId: 'template-1',
  corporateAssets: { 'brand-1': { id: 'brand-1', kind: 'logo', mimeType: 'image/png', size: 4, dataUrl: 'data:image/png;base64,BBBB' } },
};

test('guarda y restaura exactamente documento, análisis, símbolos, cambios y versiones', () => {
  const previous = { ...structuredClone(document), elements: [structuredClone(image)] };
  const bundle = createProjectBundle({
    state: { document, past: [previous], future: [] },
    user: { id: 'user-1', name: 'Usuario', email: 'user@example.com' },
    savedAt: '2026-08-05T12:00:00.000Z',
  });
  const restored = restoreProjectBundle(bundle);

  assert.deepEqual(restored.document, normalizeEditorDocument(document));
  assert.equal(restored.document.scale.pixelsPerMeter, 20);
  assert.deepEqual(restored.document.measurements, document.measurements);
  assert.deepEqual(restored.document.sectors, document.sectors);
  assert.deepEqual(restored.document.measurementAssociations, document.measurementAssociations);
  assert.deepEqual(restored.document.establishmentProfile, document.establishmentProfile);
  assert.deepEqual(restored.document.auditTrail, document.auditTrail);
  assert.deepEqual(restored.document.simulations, document.simulations);
  assert.deepEqual(restored.document.advisorAnalysis, document.advisorAnalysis);
  assert.deepEqual(restored.document.corporateTemplates, document.corporateTemplates);
  assert.deepEqual(restored.document.corporateAssets, document.corporateAssets);
  assert.deepEqual(restored.past, [normalizeEditorDocument(previous)]);
  assert.equal(bundle.assets.planImages['plan-1'], image.src);
  assert.equal(bundle.versions[0].document.elements[0].src, undefined);
  assert.equal(bundle.assets.corporate['brand-1'], document.corporateAssets['brand-1'].dataUrl);
  assert.equal(bundle.versions[0].document.corporateAssets['brand-1'].dataUrl, undefined);
  assert.deepEqual(bundle.contents.symbolElementIds, ['symbol-1']);
  assert.deepEqual(bundle.contents.manuallyChangedElementIds, ['symbol-1']);
  assert.deepEqual(bundle.observations, ['Verificar salida']);
  assert.equal(bundle.savedAt, '2026-08-05T12:00:00.000Z');
  assert.equal(bundle.user.name, 'Usuario');
});
