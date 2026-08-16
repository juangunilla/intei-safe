export const CORPORATE_ASSET_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_CORPORATE_ASSET_BYTES = 2 * 1024 * 1024;
export const CORPORATE_TEXT_LIMIT = 240;

const text = (value, limit = CORPORATE_TEXT_LIMIT) => String(value || '').trim().slice(0, limit);
const color = (value) => /^#[0-9a-f]{6}$/i.test(value || '') ? value.toUpperCase() : null;

export const createCorporateTemplate = (values = {}) => ({
  id: values.id || crypto.randomUUID(), name: text(values.name || 'Plantilla principal', 80), companyName: text(values.companyName), legalName: text(values.legalName), cuit: text(values.cuit, 30),
  logoAssetId: values.logoAssetId || null, address: text(values.address), phone: text(values.phone, 60), email: text(values.email, 120), website: text(values.website, 120),
  professionalName: text(values.professionalName, 120), professionalLicense: text(values.professionalLicense, 80), headerText: text(values.headerText), footerText: text(values.footerText),
  primaryColor: color(values.primaryColor), secondaryColor: color(values.secondaryColor), showPageNumber: values.showPageNumber !== false, showGeneratedDate: values.showGeneratedDate !== false,
  showProfessionalSignature: values.showProfessionalSignature !== false, signatureAssetId: values.signatureAssetId || null, stampAssetId: values.stampAssetId || null,
});

export const duplicateCorporateTemplate = (template, id = crypto.randomUUID()) => createCorporateTemplate({ ...template, id, name: `${template.name || 'Plantilla'} — copia` });

export const removeCorporateTemplate = ({ templates = [], selectedId = null }, id) => {
  const remaining = templates.filter((template) => template.id !== id);
  return { templates: remaining, selectedId: selectedId === id ? remaining[0]?.id || null : selectedId };
};

export const validateCorporateAsset = ({ mimeType, size, dataUrl }) => {
  if (!CORPORATE_ASSET_MIME_TYPES.includes(mimeType)) throw new Error('Usá una imagen PNG, JPG o WEBP.');
  if (!Number.isFinite(size) || size <= 0 || size > MAX_CORPORATE_ASSET_BYTES) throw new Error('La imagen debe pesar menos de 2 MB.');
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(`data:${mimeType};base64,`)) throw new Error('El archivo de imagen no es válido.');
  return true;
};

export const createCorporateAsset = ({ id = crypto.randomUUID(), kind, name, mimeType, size, dataUrl }) => {
  validateCorporateAsset({ mimeType, size, dataUrl });
  return { id, kind, name: text(name, 120), mimeType, size, dataUrl, createdAt: new Date().toISOString() };
};

export const readCorporateAssetFile = (file, kind) => new Promise((resolve, reject) => {
  if (!CORPORATE_ASSET_MIME_TYPES.includes(file?.type) || file.size > MAX_CORPORATE_ASSET_BYTES) return reject(new Error('Usá PNG, JPG o WEBP de hasta 2 MB.'));
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
  reader.onload = () => { try { resolve(createCorporateAsset({ kind, name: file.name, mimeType: file.type, size: file.size, dataUrl: reader.result })); } catch (error) { reject(error); } };
  reader.readAsDataURL(file);
});
