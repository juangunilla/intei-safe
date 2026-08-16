import test from 'node:test';
import assert from 'node:assert/strict';
import { createCorporateAsset, createCorporateTemplate, duplicateCorporateTemplate, removeCorporateTemplate, validateCorporateAsset } from '../src/editor/branding/corporateTemplate.js';
import { resolveDocumentBranding } from '../src/editor/branding/brandingService.js';
import { editorReducer, initialEditorState } from '../src/editor/store/editorReducer.js';

const dataUrl = 'data:image/png;base64,AAAA';

test('plantilla vacía usa valores opcionales seguros', () => {
  const template = createCorporateTemplate({ id: 't1', name: '' });
  assert.equal(template.companyName, ''); assert.equal(template.logoAssetId, null); assert.equal(template.showPageNumber, true);
});

test('plantilla completa normaliza colores y limita textos', () => {
  const template = createCorporateTemplate({ id: 't1', companyName: 'Empresa', legalName: 'Empresa SA', cuit: '30-1', professionalName: 'Ana', professionalLicense: 'MP 1', primaryColor: '#abcdef', secondaryColor: 'invalid', footerText: 'x'.repeat(400) });
  assert.equal(template.primaryColor, '#ABCDEF'); assert.equal(template.secondaryColor, null); assert.equal(template.footerText.length, 240);
});

test('logo, firma y sello se resuelven por referencia', () => {
  const assets = Object.fromEntries(['logo', 'signature', 'stamp'].map((kind) => { const asset = createCorporateAsset({ id: kind, kind, name: `${kind}.png`, mimeType: 'image/png', size: 4, dataUrl }); return [kind, asset]; }));
  const template = createCorporateTemplate({ id: 't1', logoAssetId: 'logo', signatureAssetId: 'signature', stampAssetId: 'stamp' });
  const branding = resolveDocumentBranding({ corporateTemplates: [template], selectedCorporateTemplateId: 't1', corporateAssets: assets });
  assert.equal(branding.logo.kind, 'logo'); assert.equal(branding.signature.kind, 'signature'); assert.equal(branding.stamp.kind, 'stamp');
});

test('rechaza formatos o tamaños de asset no permitidos', () => {
  assert.throws(() => validateCorporateAsset({ mimeType: 'image/svg+xml', size: 4, dataUrl: 'data:image/svg+xml;base64,AAAA' }), /PNG/);
  assert.throws(() => validateCorporateAsset({ mimeType: 'image/png', size: 3 * 1024 * 1024, dataUrl }), /2 MB/);
});

test('duplicación genera identidad nueva y eliminación selecciona fallback', () => {
  const first = createCorporateTemplate({ id: 't1', name: 'Principal' }); const second = duplicateCorporateTemplate(first, 't2');
  assert.equal(second.id, 't2'); assert.match(second.name, /copia/);
  assert.deepEqual(removeCorporateTemplate({ templates: [first, second], selectedId: 't1' }, 't1'), { templates: [second], selectedId: 't2' });
});

test('reducer crea, selecciona y elimina plantilla y asset sin referencias rotas', () => {
  const template = createCorporateTemplate({ id: 't1', logoAssetId: 'a1' });
  let state = editorReducer(initialEditorState, { type: 'UPSERT_CORPORATE_TEMPLATE', payload: template });
  state = editorReducer(state, { type: 'UPSERT_CORPORATE_ASSET', payload: { id: 'a1', dataUrl } });
  assert.equal(state.document.selectedCorporateTemplateId, 't1');
  state = editorReducer(state, { type: 'REMOVE_CORPORATE_ASSET', payload: 'a1' });
  assert.equal(state.document.corporateTemplates[0].logoAssetId, null);
  state = editorReducer(state, { type: 'REMOVE_CORPORATE_TEMPLATE', payload: 't1' });
  assert.equal(state.document.selectedCorporateTemplateId, null);
});

test('plantilla o asset faltante mantienen fallback robusto', () => {
  assert.equal(resolveDocumentBranding({ corporateTemplates: [], selectedCorporateTemplateId: 'missing' }).enabled, false);
  const branding = resolveDocumentBranding({ corporateTemplates: [createCorporateTemplate({ id: 't1', logoAssetId: 'missing' })], selectedCorporateTemplateId: 't1', corporateAssets: {} });
  assert.equal(branding.enabled, true); assert.equal(branding.logo, null);
});
