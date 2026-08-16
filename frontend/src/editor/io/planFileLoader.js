import { isProjectBundle, restoreProjectBundle } from './projectBundle.js';
import { normalizeEditorDocument } from '../types.js';

// El Data URL agrega aproximadamente 33%; 8 MB deja margen para historial,
// análisis y trazabilidad dentro del límite persistible de 12 MB.
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_PROJECT_SIZE = 30 * 1024 * 1024;
const FILE_READ_TIMEOUT_MS = 15000;
const IMAGE_DECODE_TIMEOUT_MS = 15000;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

const readFile = (file, method) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  let settled = false;
  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    callback(value);
  };
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    try { reader.abort(); } catch { /* reader may already be closed */ }
    reject(new Error('La lectura del archivo excedió el tiempo permitido'));
  }, FILE_READ_TIMEOUT_MS);
  reader.onload = () => finish(resolve, reader.result);
  reader.onerror = () => finish(reject, new Error('No se pudo leer el archivo'));
  reader.onabort = () => finish(reject, new Error('La lectura del archivo fue cancelada'));
  reader[method](file);
});

const readAsDataURL = (file) => readFile(file, 'readAsDataURL');
const readAsText = (file) => readFile(file, 'readAsText');

const getImageSize = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  let settled = false;
  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    image.onload = null;
    image.onerror = null;
    callback(value);
  };
  const timer = setTimeout(() => finish(reject, new Error('La decodificación de la imagen excedió el tiempo permitido')), IMAGE_DECODE_TIMEOUT_MS);
  image.onload = () => finish(resolve, { width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => finish(reject, new Error('La imagen no pudo decodificarse'));
  image.src = src;
});

export const validateImageFile = (file) => {
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase();
  if (file?.type) {
    if (!IMAGE_TYPES.has(file.type)) throw new Error('Formato no soportado. Usá PNG, JPG, JPEG, WEBP o JSON');
  } else if (!IMAGE_EXTENSIONS.has(extension)) {
    throw new Error('Formato no soportado. Usá PNG, JPG, JPEG, WEBP o JSON');
  }
  if (file.size > MAX_IMAGE_SIZE) throw new Error(`${file.name || 'El archivo'} supera el límite de 8 MB`);
};

export const createPlanThumbnail = (src, maxWidth = 480, maxHeight = 270) => new Promise((resolve, reject) => {
  const image = new Image();
  let settled = false;
  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    image.onload = null;
    image.onerror = null;
    callback(value);
  };
  const timer = setTimeout(() => finish(reject, new Error('La generación de la miniatura excedió el tiempo permitido')), IMAGE_DECODE_TIMEOUT_MS);
  image.onload = () => {
    try {
      const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la miniatura');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      finish(resolve, canvas.toDataURL('image/jpeg', 0.72));
    } catch (error) {
      finish(reject, error);
    }
  };
  image.onerror = () => finish(reject, new Error('No se pudo generar la miniatura del plano'));
  image.src = src;
});

export const validateDocument = (document) => {
  if (!document || typeof document !== 'object' || !Array.isArray(document.layers) || !Array.isArray(document.elements)) {
    throw new Error('El JSON no contiene un documento de plano válido');
  }
  return normalizeEditorDocument(document);
};

export const loadPlanFile = async (file) => {
  if (!file) throw new Error('No se seleccionó ningún archivo');
  const isJSON = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
  if (isJSON && file.size > MAX_PROJECT_SIZE) throw new Error(`${file.name || 'El archivo'} supera el límite de 30 MB`);

  if (isJSON) {
    try {
      const parsed = JSON.parse(await readAsText(file));
      if (isProjectBundle(parsed)) return { kind: 'project', project: restoreProjectBundle(parsed) };
      return { kind: 'document', document: validateDocument(parsed) };
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('El archivo JSON está dañado o tiene un formato inválido');
      throw error;
    }
  }

  validateImageFile(file);
  const src = await readAsDataURL(file);
  const { width, height } = await getImageSize(src);
  const fitScale = Math.min(1, 1200 / width, 800 / height);
  return {
    kind: 'image',
    image: { src, fileName: file.name, width, height, scaleX: fitScale, scaleY: fitScale },
  };
};
