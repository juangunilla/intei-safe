import { useState } from 'react';
import { aiPlanService } from '../../services';
import { useEditor } from '../store/EditorContext';
import { BUILDING_DETECTIONS } from '../analysis/buildingAnalysisModel.js';
import { getSymbolList } from '../symbols/symbolRegistry.jsx';
import { acceptedProposalOperations, createProposalDraft, PROPOSAL_SYMBOL_IDS } from '../proposal/evacuationProposal.js';
import AIProposalPreview from './AIProposalPreview.jsx';
import EstablishmentDataForm from './EstablishmentDataForm.jsx';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AIPlanPanel = ({ open, onClose }) => {
  const { exportDocument, setBuildingAnalysis, setEstablishmentProfile, acceptProposalOperations, appendAuditEntry, state } = useEditor();
  const { projectId } = useParams();
  const { user } = useAuth();
  const [result, setResult] = useState(state.document.buildingAnalysis || null);
  const [loading, setLoading] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [proposalError, setProposalError] = useState('');
  const [decisionMessage, setDecisionMessage] = useState('');
  const [error, setError] = useState('');

  const analyze = async () => {
    setLoading(true);
    setError('');
    setProposal(null);
    setProposalError('');
    setDecisionMessage('');
    try {
      const document = exportDocument();
      const image = document.elements.find((element) => element.type === 'planImage' && element.src);
      if (!image) throw new Error('Cargá una imagen del plano antes de analizarlo con IA.');
      const { data } = await aiPlanService.analyzeBuilding({
        document,
        context: {
          task: 'building-detection-only',
          imageSize: { width: image.width, height: image.height },
          coordinateSystem: 'original-image-pixels',
          requestedDetections: BUILDING_DETECTIONS.map(([key]) => key),
          establishmentProfile: document.establishmentProfile || null,
        },
        requestId: crypto.randomUUID(),
      });
      setBuildingAnalysis(data);
      appendAuditEntry({ type: 'ai_building_analysis', user: user ? { id: user.id || user._id, name: user.name } : null, projectId, documentVersion: document.version, modelVersion: data.modelVersion || 'unknown', dataUsed: document.establishmentProfile || {}, result: data });
      setResult(data);
      setLoading(false);
      setProposalLoading(true);
      try {
        const availableSymbols = getSymbolList().filter(({ id }) => PROPOSAL_SYMBOL_IDS.includes(id)).map(({ id, label, category }) => ({ id, label, category }));
        const proposalDocument = { ...document, buildingAnalysis: data };
        const { data: generatedProposal } = await aiPlanService.generateEvacuation({
          document: proposalDocument,
          context: {
            availableSymbols,
            proposalMode: true,
            editableObjectsOnly: true,
            doNotApplyToDocument: true,
          },
          requestId: crypto.randomUUID(),
        });
        setProposal(createProposalDraft(generatedProposal));
        appendAuditEntry({ type: 'ai_proposal_generated', user: user ? { id: user.id || user._id, name: user.name } : null, projectId, documentVersion: document.version, modelVersion: generatedProposal.metadata?.modelVersion || 'unknown', proposedElements: generatedProposal.operations, notVerifiable: generatedProposal.notVerifiable || [] });
      } catch (proposalRequestError) {
        setProposalError(proposalRequestError.response?.data?.message || proposalRequestError.message || 'El análisis terminó, pero no se pudo generar la propuesta.');
      } finally {
        setProposalLoading(false);
      }
    } catch (requestError) {
      const code = requestError.response?.data?.code;
      setError(code === 'AI_PROVIDER_NOT_CONFIGURED'
        ? 'El motor está instalado, pero falta configurar OPENAI_API_KEY en el backend.'
        : requestError.response?.data?.message || requestError.message || 'No se pudo analizar el plano.');
    } finally {
      setLoading(false);
    }
  };

  const acceptProposal = () => {
    if (!proposal) return;
    const operations = acceptedProposalOperations(proposal);
    acceptProposalOperations(operations);
    appendAuditEntry({ type: 'ai_proposal_decision', user: user ? { id: user.id || user._id, name: user.name } : null, projectId, acceptedElements: operations.map(({ element }) => element), rejectedElements: proposal.operations.filter((operation) => !operation.included).map(({ element }) => ({ ...element, status: 'rejected' })) });
    setProposal(null);
    setDecisionMessage(`${operations.length} objetos editables agregados al plano.`);
  };

  const rejectProposal = () => {
    appendAuditEntry({ type: 'ai_proposal_decision', user: user ? { id: user.id || user._id, name: user.name } : null, projectId, acceptedElements: [], rejectedElements: (proposal?.operations || []).map(({ element }) => ({ ...element, status: 'rejected' })) });
    setProposal(null);
    setDecisionMessage('Propuesta rechazada. El plano no fue modificado.');
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'analisis-edificio.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;
  return <div className="ai-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="ai-panel" role="dialog" aria-modal="true" aria-label="Análisis del edificio">
      <div className="ai-panel-header">
        <div><span className="ai-kicker"><i className="bi bi-stars" /> Motor de visión</span><h4>Analizar edificio</h4></div>
        <button onClick={onClose} aria-label="Cerrar"><i className="bi bi-x-lg" /></button>
      </div>
      <div className="ai-panel-body">
        <p className="text-secondary">La IA analizará la estructura y preparará una propuesta editable. Nada se agregará al plano hasta que la aceptes.</p>
        <EstablishmentDataForm value={state.document.establishmentProfile} onSave={setEstablishmentProfile} />
        <div className="analysis-scope">{BUILDING_DETECTIONS.map(([, label]) => <span key={label}><i className="bi bi-check2" /> {label}</span>)}</div>
        {error && <div className="alert alert-warning mt-3 mb-0"><i className="bi bi-exclamation-triangle me-2" />{error}</div>}
        {result && <div className="ai-proposal">
          <div className="analysis-success"><i className="bi bi-check-circle-fill" /><div><strong>Análisis guardado</strong><small>{result.summary || 'La geometría quedó vinculada al documento.'}</small></div></div>
          <div className="analysis-counts">{BUILDING_DETECTIONS.map(([key, label]) => <div key={key}><strong>{result[key]?.length || 0}</strong><span>{label}</span></div>)}</div>
          {result.warnings?.length > 0 && <div className="analysis-warnings"><strong>Advertencias</strong><ul>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
          <details className="analysis-json"><summary>Ver estructura JSON</summary><pre>{JSON.stringify(result, null, 2)}</pre></details>
        </div>}
        {proposalLoading && <div className="proposal-loading" role="status"><span className="spinner-border spinner-border-sm" /><div><strong>Generando propuesta…</strong><small>Calculando señales y rutas editables sin modificar el plano.</small></div></div>}
        {proposalError && <div className="alert alert-warning mt-3"><strong>El análisis fue guardado.</strong><br />{proposalError}</div>}
        {decisionMessage && <div className="alert alert-info mt-3" role="status">{decisionMessage}</div>}
        {proposal && <AIProposalPreview proposal={proposal} onChange={setProposal} onAccept={acceptProposal} onReject={rejectProposal} />}
      </div>
      <div className="ai-panel-footer">
        <button className="btn btn-light" onClick={onClose}>Cerrar</button>
        {result && <button className="btn btn-light" onClick={downloadJSON}><i className="bi bi-download me-2" />Descargar JSON</button>}
        <button className="btn btn-ai" disabled={loading || proposalLoading} onClick={analyze}>{loading ? <><span className="spinner-border spinner-border-sm me-2" />Analizando edificio…</> : <><i className="bi bi-stars me-2" />{result ? 'Volver a analizar' : 'Analizar con IA'}</>}</button>
      </div>
    </div>
  </div>;
};

export default AIPlanPanel;
