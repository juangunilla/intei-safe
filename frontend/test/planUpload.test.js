import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlanFile, validateImageFile } from '../src/editor/io/planFileLoader.js';
import { editorReducer, initialEditorState } from '../src/editor/store/editorReducer.js';
import { createDefaultDocument } from '../src/editor/types.js';
import { confirmPlanReplacement, requiresPlanReplacementConfirmation } from '../src/editor/io/planReplacement.js';
import { shouldApplyInitialProject } from '../src/editor/io/initialProjectLoad.js';

const originalFileReader = globalThis.FileReader;
const originalImage = globalThis.Image;

class FakeFileReader {
  readAsDataURL(file) {
    queueMicrotask(() => {
      if (file.readerFailure === 'error') this.onerror?.();
      else if (file.readerFailure === 'abort') this.onabort?.();
      else { this.result = file.corrupt ? 'data:corrupt' : `data:${file.type || 'image/png'};base64,AAAA`; this.onload?.(); }
    });
  }
  readAsText() { throw new Error('not used'); }
  abort() { this.onabort?.(); }
}

class FakeImage {
  set src(value) {
    queueMicrotask(() => {
      if (value === 'data:corrupt') this.onerror?.();
      else { this.naturalWidth = 1000; this.naturalHeight = 500; this.onload?.(); }
    });
  }
}

test.before(() => { globalThis.FileReader = FakeFileReader; globalThis.Image = FakeImage; });
test.after(() => { globalThis.FileReader = originalFileReader; globalThis.Image = originalImage; });

const file = (name, type, extras = {}) => ({ name, type, size: 1024, ...extras });

test('acepta PNG, JPG y WEBP por MIME', async () => {
  for (const candidate of [file('p.png', 'image/png'), file('p.jpg', 'image/jpeg'), file('p.webp', 'image/webp')]) {
    const loaded = await loadPlanFile(candidate);
    assert.equal(loaded.kind, 'image');
    assert.equal(loaded.image.width, 1000);
  }
});

test('acepta MIME vacío sólo con extensión de imagen válida', async () => {
  assert.equal((await loadPlanFile(file('plano.JPEG', ''))).kind, 'image');
  assert.throws(() => validateImageFile(file('plano.exe', '')), /Formato no soportado/);
});

test('rechaza imágenes superiores a 8 MB', () => {
  assert.throws(() => validateImageFile(file('grande.png', 'image/png', { size: 8 * 1024 * 1024 + 1 })), /8 MB/);
});

test('rechaza archivo corrupto, error y aborto de FileReader', async () => {
  await assert.rejects(loadPlanFile(file('corrupta.png', 'image/png', { corrupt: true })), /no pudo decodificarse/);
  await assert.rejects(loadPlanFile(file('error.png', 'image/png', { readerFailure: 'error' })), /No se pudo leer/);
  await assert.rejects(loadPlanFile(file('abort.png', 'image/png', { readerFailure: 'abort' })), /cancelada/);
});

test('el mismo archivo puede procesarse dos veces', async () => {
  const same = file('igual.png', 'image/png');
  assert.equal((await loadPlanFile(same)).kind, 'image');
  assert.equal((await loadPlanFile(same)).kind, 'image');
});

const plan = (id) => ({ id, type: 'planImage', layerId: initialEditorState.document.activeLayerId, src: `data:${id}`, width: 100, height: 100, x: 0, y: 0 });

test('primera carga agrega un único plano sin invalidar una escala inexistente', () => {
  const next = editorReducer(initialEditorState, { type: 'REPLACE_PLAN_IMAGE', payload: plan('first') });
  assert.equal(next.document.elements.filter(({ type }) => type === 'planImage').length, 1);
  assert.deepEqual(next.document.scale, { calibrated: false });
});

test('reemplazo conserva datos técnicos, deja un solo plano e invalida escala', () => {
  const document = { ...createDefaultDocument(), elements: [plan('old'), { id: 'symbol', type: 'symbol', symbolId: 'extinguisher', layerId: initialEditorState.document.activeLayerId }], scale: { calibrated: true, pixelsPerMeter: 20 }, measurements: [{ id: 'm1' }], sectors: [{ id: 's1' }], simulations: [{ id: 'sim1' }] };
  const next = editorReducer({ ...initialEditorState, document }, { type: 'REPLACE_PLAN_IMAGE', payload: plan('new') });
  assert.deepEqual(next.document.elements.filter(({ type }) => type === 'planImage').map(({ id }) => id), ['new']);
  assert.ok(next.document.elements.some(({ id }) => id === 'symbol'));
  assert.deepEqual(next.document.measurements, document.measurements);
  assert.deepEqual(next.document.sectors, document.sectors);
  assert.deepEqual(next.document.simulations, document.simulations);
  assert.equal(next.document.scale.calibrated, false);
  assert.equal(next.document.regulatoryAnalysis, null);
});

test('la confirmación sólo corresponde a un reemplazo con datos dependientes', () => {
  assert.equal(requiresPlanReplacementConfirmation(createDefaultDocument()), false);
  assert.equal(requiresPlanReplacementConfirmation({ ...createDefaultDocument(), elements: [plan('old')] }), false);
  assert.equal(requiresPlanReplacementConfirmation({ ...createDefaultDocument(), elements: [plan('old')], measurements: [{ id: 'm1' }] }), true);
});

test('la confirmación cancelada impide reemplazar y la aceptada lo permite', () => {
  const document = { ...createDefaultDocument(), elements: [plan('old')], simulations: [{ id: 'sim1' }] };
  assert.equal(confirmPlanReplacement(document, () => false), false);
  assert.equal(confirmPlanReplacement(document, () => true), true);
  assert.equal(confirmPlanReplacement(createDefaultDocument(), () => { throw new Error('no debe preguntar'); }), true);
});

test('una respuesta MongoDB tardía no puede sobrescribir estado local', () => {
  const initial = createDefaultDocument();
  const locallyChanged = { ...initial, elements: [plan('local')] };
  assert.equal(shouldApplyInitialProject({ requestToken: 1, currentToken: 1, documentAtStart: initial, currentDocument: locallyChanged }), false);
  assert.equal(shouldApplyInitialProject({ requestToken: 1, currentToken: 2, documentAtStart: initial, currentDocument: initial }), false);
  assert.equal(shouldApplyInitialProject({ requestToken: 1, currentToken: 1, documentAtStart: initial, currentDocument: initial }), true);
});
