const DEFAULT_COLORS = { primary: '#0F172A', secondary: '#2563EB' };

export const hexToRgb = (hex, fallback = [15, 23, 42]) => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex || '');
  return match ? [parseInt(match[1].slice(0, 2), 16), parseInt(match[1].slice(2, 4), 16), parseInt(match[1].slice(4, 6), 16)] : fallback;
};

export const resolveCorporateTemplate = (document = {}) => (document.corporateTemplates || []).find(({ id }) => id === document.selectedCorporateTemplateId) || null;
export const resolveCorporateAsset = (document = {}, id) => id ? document.corporateAssets?.[id] || null : null;

export const resolveDocumentBranding = (document = {}) => {
  const template = resolveCorporateTemplate(document);
  if (!template) return { enabled: false, colors: DEFAULT_COLORS, template: null, logo: null, signature: null, stamp: null };
  return {
    enabled: true, template,
    colors: { primary: template.primaryColor || DEFAULT_COLORS.primary, secondary: template.secondaryColor || DEFAULT_COLORS.secondary },
    logo: resolveCorporateAsset(document, template.logoAssetId), signature: resolveCorporateAsset(document, template.signatureAssetId), stamp: resolveCorporateAsset(document, template.stampAssetId),
  };
};

export const brandingForExport = (document, target = 'pdf') => ({ target, ...resolveDocumentBranding(document) });
