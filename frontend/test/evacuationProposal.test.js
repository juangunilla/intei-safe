import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptedProposalOperations,
  createProposalDraft,
  PROPOSAL_SYMBOL_IDS,
  proposalSummary,
  removeProposalOperation,
  setProposalOperationIncluded,
  updateProposalOperationElement,
} from '../src/editor/proposal/evacuationProposal.js';

test('la propuesta incluye todos los símbolos requeridos por el módulo', () => {
  assert.deepEqual(PROPOSAL_SYMBOL_IDS, ['evacuationRoute', 'assemblyPoint', 'emergencyExit', 'extinguisher', 'firstAid', 'aed', 'alarm']);
});

test('editar, excluir y eliminar elementos solo modifica el borrador', () => {
  const proposal = createProposalDraft({ operations: [
    { action: 'add', element: { type: 'symbol', symbolId: 'emergencyExit', x: 10, y: 20 } },
    { action: 'add', element: { type: 'arrow', x: 30, y: 40, points: [0, 0, 50, 0] } },
  ] });
  const moved = updateProposalOperationElement(proposal, 'proposal-0', { x: 80, y: 90 });
  const excluded = setProposalOperationIncluded(moved, 'proposal-0', false);
  const removed = removeProposalOperation(excluded, 'proposal-1');

  assert.equal(proposal.operations[0].element.x, 10);
  assert.deepEqual(moved.operations[0].element, { type: 'symbol', symbolId: 'emergencyExit', x: 80, y: 90 });
  assert.equal(excluded.operations[0].included, false);
  assert.equal(removed.operations.length, 1);
  assert.deepEqual(acceptedProposalOperations(removed, 'proposal-layer'), []);
});

test('crear una vista previa no muta las operaciones originales', () => {
  const result = { operations: [{ action: 'add', element: { type: 'symbol', symbolId: 'aed', x: 10, y: 20 } }] };
  const snapshot = structuredClone(result);
  const proposal = createProposalDraft(result);
  assert.deepEqual(result, snapshot);
  assert.equal(proposal.operations[0].included, true);
});

test('conserva motivos no verificables sin fabricar operaciones', () => {
  const proposal = createProposalDraft({ operations: [], notVerifiable: [{ status: 'not_verifiable', reason: 'Sin escala' }] });
  assert.deepEqual(proposal.operations, []);
  assert.equal(proposal.notVerifiable[0].reason, 'Sin escala');
});

test('aceptar aplica sólo objetos incluidos como elementos editables', () => {
  const proposal = createProposalDraft({ operations: [
    { action: 'add', element: { type: 'symbol', symbolId: 'aed', x: 10, y: 20 } },
    { action: 'add', element: { type: 'arrow', x: 0, y: 0, points: [0, 0, 50, 0] } },
  ] });
  proposal.operations[1].included = false;
  const accepted = acceptedProposalOperations(proposal, 'proposal-layer');
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].element.layerId, 'proposal-layer');
  assert.equal(accepted[0].element.aiGenerated, true);
  assert.equal(accepted[0].element.userModified, false);
  assert.equal(accepted[0].element.status, 'confirmed');
  assert.equal(accepted[0].previewId, undefined);
  assert.deepEqual(proposalSummary(proposal), { arrows: 0, symbols: 1, bySymbol: { aed: 1 } });
});
