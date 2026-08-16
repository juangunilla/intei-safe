import { normalizeEditorDocument } from '../types.js';

export const PROJECT_FORMAT = 'inteli-pde-project';
export const PROJECT_SCHEMA_VERSION = 2;

const clone = (value) => JSON.parse(JSON.stringify(value));

const collectImageAssets = (documents) => {
  const assets = new Map();
  documents.forEach((document) => document?.elements?.forEach((element) => {
    if (element.type === 'planImage' && element.id && element.src) assets.set(element.id, element.src);
  }));
  return Object.fromEntries(assets);
};

const collectCorporateAssets = (documents) => {
  const assets = new Map();
  documents.forEach((document) => Object.values(document?.corporateAssets || {}).forEach((asset) => { if (asset?.id && asset.dataUrl) assets.set(asset.id, asset.dataUrl); }));
  return Object.fromEntries(assets);
};

const compactDocument = (document) => ({
  ...clone(document),
  elements: (document?.elements || []).map((element) => element.type === 'planImage'
    ? { ...clone(element), src: undefined, assetId: element.id }
    : clone(element)),
  corporateAssets: Object.fromEntries(Object.entries(document?.corporateAssets || {}).map(([id, asset]) => [id, { ...clone(asset), dataUrl: undefined }])),
});

const restoreDocument = (document, assets, corporateAssets = {}) => normalizeEditorDocument({
  ...clone(document),
  elements: (document?.elements || []).map((element) => {
    if (element.type !== 'planImage') return clone(element);
    const { assetId, ...planImage } = clone(element);
    return { ...planImage, src: element.src || assets[assetId || element.id] };
  }),
  corporateAssets: Object.fromEntries(Object.entries(document?.corporateAssets || {}).map(([id, asset]) => [id, { ...clone(asset), dataUrl: asset.dataUrl || corporateAssets[id] || null }])),
});

export const createProjectBundle = ({ state, user, savedAt = new Date().toISOString() }) => {
  const normalizedState = {
    ...state,
    document: normalizeEditorDocument(state.document),
    past: (state.past || []).map(normalizeEditorDocument),
    future: (state.future || []).map(normalizeEditorDocument),
  };
  const allDocuments = [...normalizedState.past, normalizedState.document, ...normalizedState.future];
  const assets = collectImageAssets(allDocuments);
  const corporateAssets = collectCorporateAssets(allDocuments);
  const versions = [...normalizedState.past, normalizedState.document].map((document, index, documents) => ({
    number: index + 1,
    current: index === documents.length - 1,
    document: compactDocument(document),
  }));
  const planImages = normalizedState.document.elements.filter((element) => element.type === 'planImage');
  const symbols = normalizedState.document.elements.filter((element) => element.type === 'symbol');
  const manuallyChanged = normalizedState.document.elements.filter((element) => element.userModified);

  return {
    format: PROJECT_FORMAT,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    savedAt,
    user: user ? { id: user.id || user._id, name: user.name, email: user.email } : null,
    observations: [...(normalizedState.document.buildingAnalysis?.warnings || [])],
    contents: {
      originalPlanElementIds: planImages.map(({ id }) => id),
      analysisSaved: Boolean(normalizedState.document.buildingAnalysis),
      symbolElementIds: symbols.map(({ id }) => id),
      manuallyChangedElementIds: manuallyChanged.map(({ id }) => id),
    },
    assets: { planImages: assets, corporate: corporateAssets },
    versions,
    futureVersions: normalizedState.future.map(compactDocument),
  };
};

export const isProjectBundle = (value) => value?.format === PROJECT_FORMAT;

export const restoreProjectBundle = (bundle) => {
  // Early MongoDB records stored editor state directly, before project bundles existed.
  if (!isProjectBundle(bundle) && bundle?.document && typeof bundle.document === 'object') {
    return {
      ...bundle,
      document: normalizeEditorDocument(bundle.document),
      past: (bundle.past || []).map(normalizeEditorDocument),
      future: (bundle.future || []).map(normalizeEditorDocument),
    };
  }
  if (!isProjectBundle(bundle) || !Array.isArray(bundle.versions) || !bundle.versions.length) {
    throw new Error('El archivo no contiene un proyecto Inteli -Safe válido');
  }
  const assets = bundle.assets?.planImages || {};
  const corporateAssets = bundle.assets?.corporate || {};
  const documents = bundle.versions.map(({ document }) => restoreDocument(document, assets, corporateAssets));
  return {
    document: documents.at(-1),
    past: documents.slice(0, -1),
    future: (bundle.futureVersions || []).map((document) => restoreDocument(document, assets, corporateAssets)),
    metadata: {
      savedAt: bundle.savedAt || null,
      user: bundle.user || null,
      observations: Array.isArray(bundle.observations) ? bundle.observations : [],
    },
  };
};
