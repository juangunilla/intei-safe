import { useAuth } from '../../context/AuthContext';
import { useEditor } from '../store/EditorContext';
import { createSimulationModelDraft, materializeSimulationModel, reviewSimulationCandidate, updateSimulationCandidate } from '../simulation/simulationModelAdapter';

const sourceLabel = { ai: 'Detectado por IA', declared: 'Declarado', manual: 'Manual', professional: 'Confirmado por profesional' };

const SimulationModelPreparationPanel = ({ onClose }) => {
  const { user } = useAuth();
  const { state, setSimulationModelDraft, incorporateSimulationModel } = useEditor();
  const draft = state.document.simulationModelDraft;
  const reviewer = user?.name || user?.email || user?.id || 'Profesional';
  const declaredExits = state.document.establishmentProfile?.egress?.exitCount;
  const prepare = () => setSimulationModelDraft(createSimulationModelDraft(state.document, { createdBy: reviewer }));
  const patch = (kind, id, changes) => setSimulationModelDraft(updateSimulationCandidate(draft, kind, id, changes));
  const review = (kind, id, disposition) => setSimulationModelDraft(reviewSimulationCandidate(draft, kind, id, disposition, reviewer));
  const acceptedSectors = (draft?.sectors || []).filter(({ disposition, geometryStatus }) => disposition === 'accepted' && geometryStatus === 'available');
  const acceptedExits = (draft?.exits || []).filter(({ disposition, geometryStatus }) => disposition === 'accepted' && geometryStatus === 'available');
  const incorporate = () => incorporateSimulationModel(materializeSimulationModel(state.document, draft, { reviewedBy: reviewer }));

  return <div className="simulation-preparation-backdrop"><section className="simulation-preparation" role="dialog" aria-modal="true" aria-label="Preparar modelo de simulación">
    <header><div><small>Revisión profesional</small><h4>Preparar modelo de simulación</h4></div><button onClick={onClose} aria-label="Cerrar"><i className="bi bi-x-lg" /></button></header>
    {!state.document.buildingAnalysis && <div className="alert alert-warning">Primero analizá el plano con el Inspector IA.</div>}
    {state.document.buildingAnalysis && !draft && <div className="simulation-preparation-empty"><p>Se creará un borrador revisable. Ninguna detección se incorporará automáticamente.</p><button className="btn btn-primary" onClick={prepare}>Crear borrador desde el análisis</button></div>}
    {draft && <>
      <div className="alert alert-info">Cada elemento permanece como detección IA hasta que el profesional lo confirme. {declaredExits !== null && declaredExits !== undefined ? `El perfil declara ${declaredExits} salida(s), pero sólo cuentan las que tengan ubicación confirmada.` : 'No hay una cantidad de salidas declarada en el perfil.'}</div>
      <div className="simulation-preparation-summary"><span>{acceptedSectors.length} sectores confirmados</span><span>{acceptedExits.length} salidas confirmadas</span><span>{draft.unresolved?.length || 0} advertencias</span></div>
      <h5>Sectores candidatos</h5>
      {!draft.sectors.length && <p>No se detectaron sectores ni ambientes utilizables.</p>}
      {draft.sectors.map((item) => <article key={item.id} className={`simulation-candidate candidate-${item.disposition}`}>
        <div><strong>{item.name}</strong><small>{sourceLabel[item.source]} · confianza {item.confidence === null ? 'no informada' : `${Math.round(item.confidence * 100)}%`} · {item.geometryStatus === 'available' ? 'geometría disponible' : 'geometría inválida'}</small></div>
        <label>Nombre<input value={item.name} onChange={(event) => patch('sectors', item.id, { name: event.target.value, lastModifiedSource: 'manual' })} /></label>
        <label>Ocupantes<input type="number" min="0" value={item.occupancy ?? ''} onChange={(event) => patch('sectors', item.id, { occupancy: event.target.value === '' ? null : Number(event.target.value), occupancySource: 'declared' })} /></label>
        <div className="simulation-candidate-actions"><button className="btn btn-sm btn-success" disabled={item.geometryStatus !== 'available'} onClick={() => review('sectors', item.id, 'accepted')}>Confirmar</button><button className="btn btn-sm btn-outline-secondary" onClick={() => review('sectors', item.id, 'pending')}>Pendiente</button><button className="btn btn-sm btn-outline-danger" onClick={() => review('sectors', item.id, 'discarded')}>Descartar</button></div>
        {item.issues.map((issue) => <small className="text-danger" key={issue}>{issue}</small>)}
      </article>)}
      <h5>Salidas candidatas</h5>
      {!draft.exits.length && <p>No se detectaron salidas geométricas. Una cantidad declarada no puede sustituir su ubicación.</p>}
      {draft.exits.map((item) => <article key={item.id} className={`simulation-candidate candidate-${item.disposition}`}>
        <div><strong>{item.label}</strong><small>{sourceLabel[item.source]} · confianza {item.confidence === null ? 'no informada' : `${Math.round(item.confidence * 100)}%`} · {item.geometryStatus === 'available' ? 'ubicación disponible' : 'sin ubicación'}</small></div>
        <label>Etiqueta<input value={item.label} onChange={(event) => patch('exits', item.id, { label: event.target.value, lastModifiedSource: 'manual' })} /></label>
        <div className="simulation-coordinate-grid"><label>X<input type="number" value={item.point?.x ?? ''} onChange={(event) => patch('exits', item.id, { point: { x: Number(event.target.value), y: item.point?.y || 0 }, geometryStatus: 'available', lastModifiedSource: 'manual' })} /></label><label>Y<input type="number" value={item.point?.y ?? ''} onChange={(event) => patch('exits', item.id, { point: { x: item.point?.x || 0, y: Number(event.target.value) }, geometryStatus: 'available', lastModifiedSource: 'manual' })} /></label></div>
        <div className="simulation-candidate-actions"><button className="btn btn-sm btn-success" disabled={item.geometryStatus !== 'available'} onClick={() => review('exits', item.id, 'accepted')}>Confirmar</button><button className="btn btn-sm btn-outline-secondary" onClick={() => review('exits', item.id, 'pending')}>Pendiente</button><button className="btn btn-sm btn-outline-danger" onClick={() => review('exits', item.id, 'discarded')}>Descartar</button></div>
      </article>)}
      {draft.unresolved?.length > 0 && <details><summary>No verificable / advertencias</summary><ul>{draft.unresolved.map((item, index) => <li key={index}>{item.reason}</li>)}</ul></details>}
      <footer><button className="btn btn-light" onClick={prepare}>Regenerar borrador</button><button className="btn btn-primary" disabled={!acceptedSectors.length || !acceptedExits.length} onClick={incorporate}>Incorporar modelo confirmado</button></footer>
    </>}
  </section></div>;
};

export default SimulationModelPreparationPanel;
