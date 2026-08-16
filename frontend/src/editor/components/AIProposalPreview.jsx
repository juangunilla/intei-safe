import { useMemo, useState } from 'react';
import { getSymbolDefinition } from '../symbols/symbolRegistry.jsx';
import {
  proposalSummary,
  removeProposalOperation,
  setProposalOperationIncluded,
  updateProposalOperationElement,
} from '../proposal/evacuationProposal.js';

const operationLabel = (operation) => {
  if (operation.element?.type === 'arrow') return 'Flecha de ruta';
  return getSymbolDefinition(operation.element?.symbolId)?.label || operation.element?.symbolId || 'Objeto';
};

const AIProposalPreview = ({ proposal, onChange, onAccept, onReject }) => {
  const [editingId, setEditingId] = useState(null);
  const summary = useMemo(() => proposalSummary(proposal), [proposal]);
  const includedCount = summary.symbols + summary.arrows;
  const updateCoordinate = (operation, key, value) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) onChange(updateProposalOperationElement(proposal, operation.previewId, { [key]: numeric }));
  };
  const removeOperation = (previewId) => {
    onChange(removeProposalOperation(proposal, previewId));
    if (editingId === previewId) setEditingId(null);
  };

  return <section className="proposal-preview" aria-labelledby="proposal-preview-title">
    <div className="proposal-preview-heading"><div><span>Vista previa</span><h5 id="proposal-preview-title">Propuesta de evacuación</h5></div><span className="proposal-draft-badge">Sin aplicar</span></div>
    <p>{proposal.explanation || 'La IA preparó objetos editables a partir del análisis técnico.'}</p>
    <div className="proposal-summary"><div><strong>{summary.arrows}</strong><span>Flechas</span></div><div><strong>{summary.symbols}</strong><span>Señales</span></div><div><strong>{includedCount}</strong><span>Incluidos</span></div></div>
    <div className="proposal-preview-toolbar"><strong>Objetos propuestos</strong><small>Aceptá, eliminá o editá cada elemento</small></div>
    {!proposal.operations.length && <div className="alert alert-secondary">No se propusieron elementos porque no hay ubicaciones suficientemente justificadas.</div>}
    <div className="proposal-operation-list">{proposal.operations.map((operation) => <article key={operation.previewId} className={`proposal-operation ${operation.included ? '' : 'excluded'}`}>
      <div className="proposal-operation-main">
        <i className={`bi ${operation.element?.type === 'arrow' ? 'bi-arrow-right' : getSymbolDefinition(operation.element?.symbolId)?.icon || 'bi-shapes'}`} aria-hidden="true" />
        <div><strong>{operationLabel(operation)}</strong><small>x {Math.round(operation.element?.x || 0)} · y {Math.round(operation.element?.y || 0)}</small></div>
        <div className="d-flex flex-wrap gap-1 justify-content-end">
          <button className={`btn btn-sm ${operation.included ? 'btn-outline-success' : 'btn-success'}`} onClick={() => onChange(setProposalOperationIncluded(proposal, operation.previewId, !operation.included))}><i className="bi bi-check-lg me-1" />{operation.included ? 'Aceptado' : 'Aceptar'}</button>
          <button className={`btn btn-sm ${editingId === operation.previewId ? 'btn-primary' : 'btn-outline-primary'}`} disabled={!operation.included} onClick={() => setEditingId((current) => current === operation.previewId ? null : operation.previewId)}><i className="bi bi-pencil me-1" />{editingId === operation.previewId ? 'Listo' : 'Editar'}</button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => removeOperation(operation.previewId)}><i className="bi bi-trash me-1" />Eliminar</button>
        </div>
      </div>
      {editingId === operation.previewId && operation.included && <div className="proposal-coordinate-editor"><label>X<input aria-label={`Posición X de ${operationLabel(operation)}`} type="number" value={operation.element?.x ?? 0} onChange={(event) => updateCoordinate(operation, 'x', event.target.value)} /></label><label>Y<input aria-label={`Posición Y de ${operationLabel(operation)}`} type="number" value={operation.element?.y ?? 0} onChange={(event) => updateCoordinate(operation, 'y', event.target.value)} /></label></div>}
    </article>)}</div>
    {proposal.metadata?.warnings?.length > 0 && <div className="analysis-warnings"><strong>Advertencias</strong><ul>{proposal.metadata.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
    {proposal.notVerifiable?.length > 0 && <div className="analysis-warnings"><strong>No verificable</strong><ul>{proposal.notVerifiable.map((item, index) => <li key={`${item.reason}-${index}`}>{item.reason}</li>)}</ul></div>}
    <div className="proposal-decision-bar"><button className="btn btn-outline-danger" onClick={onReject}><i className="bi bi-x-lg me-1" />Rechazar</button><button className="btn btn-success" disabled={!includedCount} onClick={onAccept}><i className="bi bi-check-lg me-1" />Aceptar propuesta</button></div>
    <small className="proposal-safety-note">El plano no se modifica hasta aceptar. Después, cada objeto puede editarse individualmente en el canvas.</small>
  </section>;
};

export default AIProposalPreview;
