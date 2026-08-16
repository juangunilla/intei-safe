import { lazy, Suspense, useMemo, useState } from 'react';
import { useEditor } from '../store/EditorContext';
import { inspectEvacuationPlan } from '../inspection/planInspector';
import { generateProfessionalReport } from '../report/professionalReport';
const CorporateTemplatePanel = lazy(() => import('./CorporateTemplatePanel'));

const ReportPanel = ({ open, onClose }) => {
  const { state, exportCanvasImage } = useEditor();
  const [metadata, setMetadata] = useState({ projectName: 'Plan de evacuación', clientName: '', location: '', date: new Date().toLocaleDateString('es-AR') });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [brandingOpen, setBrandingOpen] = useState(false);
  const inspection = useMemo(() => inspectEvacuationPlan(state.document), [state.document]);
  const update = (key) => (event) => setMetadata((current) => ({ ...current, [key]: event.target.value }));
  const generate = async () => {
    setGenerating(true); setError('');
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await generateProfessionalReport({ document: state.document, inspection, planImage: exportCanvasImage(), metadata });
      onClose();
    } catch (generationError) {
      console.error(generationError); setError('No se pudo generar el PDF. Verificá que el plano esté visible e intentá nuevamente.');
    } finally { setGenerating(false); }
  };
  if (!open) return null;
  return <div className="ai-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="ai-panel report-panel" role="dialog" aria-modal="true" aria-label="Generar informe profesional">
      <div className="ai-panel-header"><div><span className="ai-kicker"><i className="bi bi-file-earmark-pdf" /> Documento profesional</span><h4>Generar informe PDF</h4></div><button aria-label="Cerrar informe" onClick={onClose}><i className="bi bi-x-lg" /></button></div>
      <div className="ai-panel-body">
        <div className="report-preview"><i className="bi bi-file-earmark-pdf-fill" /><div><strong>Informe preliminar para revisión</strong><small>Portada, plano, normativa, trazabilidad técnica y puntos no verificables.</small></div><span>{inspection.percentage}%</span></div>
        <button className="btn btn-outline-primary w-100 mb-3" onClick={() => setBrandingOpen((value) => !value)}><i className="bi bi-palette me-2" />Plantilla de documentos</button>
        {brandingOpen && <Suspense fallback={<div className="corporate-template-empty">Cargando editor de plantilla…</div>}><CorporateTemplatePanel /></Suspense>}
        <div className="mb-3"><label className="form-label fw-semibold">Nombre del proyecto</label><input className="form-control" value={metadata.projectName} onChange={update('projectName')} /></div>
        <div className="mb-3"><label className="form-label fw-semibold">Cliente</label><input className="form-control" placeholder="Razón social o nombre" value={metadata.clientName} onChange={update('clientName')} /></div>
        <div className="mb-3"><label className="form-label fw-semibold">Ubicación</label><input className="form-control" placeholder="Dirección del establecimiento" value={metadata.location} onChange={update('location')} /></div>
        <div className="mb-3"><label className="form-label fw-semibold">Fecha</label><input className="form-control" value={metadata.date} onChange={update('date')} /></div>
        {!state.document.buildingAnalysis && <div className="alert alert-warning">Primero debés analizar el edificio para generar el contenido técnico.</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="report-contents"><strong>Contenido incluido</strong><div>{['Portada', 'Plano', 'Datos declarados', 'Jurisdicción y normativa', 'Detecciones y propuestas', 'Puntos no verificables', 'Medios de escape', 'Equipamiento', 'Procedimiento', 'Recomendaciones', 'Revisión profesional', 'Advertencia legal'].map((item) => <span key={item}><i className="bi bi-check2" />{item}</span>)}</div></div>
      </div>
      <div className="ai-panel-footer"><button className="btn btn-light" onClick={onClose}>Cancelar</button><button className="btn btn-danger" disabled={generating || !state.document.buildingAnalysis || !metadata.projectName.trim()} onClick={generate}>{generating ? <><span className="spinner-border spinner-border-sm me-2" />Generando PDF…</> : <><i className="bi bi-download me-2" />Descargar informe</>}</button></div>
    </div>
  </div>;
};

export default ReportPanel;
