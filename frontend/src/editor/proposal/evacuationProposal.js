export const PROPOSAL_SYMBOL_IDS = [
  'evacuationRoute',
  'assemblyPoint',
  'emergencyExit',
  'extinguisher',
  'firstAid',
  'aed',
  'alarm',
];

export const createProposalDraft = (result) => ({
  explanation: result?.explanation || '',
  metadata: result?.metadata || {},
  notVerifiable: result?.notVerifiable || [],
  operations: (result?.operations || []).map((operation, index) => ({
    ...operation,
    previewId: `proposal-${index}`,
    included: true,
    element: operation.element ? { ...operation.element } : operation.element,
  })),
});

export const proposalSummary = (proposal) => proposal.operations.reduce((summary, operation) => {
  if (!operation.included || operation.action !== 'add') return summary;
  const type = operation.element?.type;
  if (type === 'arrow') summary.arrows += 1;
  if (type === 'symbol') {
    summary.symbols += 1;
    summary.bySymbol[operation.element.symbolId] = (summary.bySymbol[operation.element.symbolId] || 0) + 1;
  }
  return summary;
}, { arrows: 0, symbols: 0, bySymbol: {} });

export const setProposalOperationIncluded = (proposal, previewId, included) => ({
  ...proposal,
  operations: proposal.operations.map((operation) => operation.previewId === previewId
    ? { ...operation, included }
    : operation),
});

export const updateProposalOperationElement = (proposal, previewId, changes) => ({
  ...proposal,
  operations: proposal.operations.map((operation) => operation.previewId === previewId
    ? { ...operation, element: { ...operation.element, ...changes } }
    : operation),
});

export const removeProposalOperation = (proposal, previewId) => ({
  ...proposal,
  operations: proposal.operations.filter((operation) => operation.previewId !== previewId),
});

export const acceptedProposalOperations = (proposal, layerId) => proposal.operations
  .filter((operation) => operation.included)
  .map(({ previewId: _previewId, included: _included, ...operation }) => ({
    ...operation,
    element: operation.element ? {
      ...operation.element,
      layerId,
      aiGenerated: true,
      userModified: false,
      proposalAccepted: true,
      status: 'confirmed',
    } : operation.element,
  }));
