import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEditor } from '../store/EditorContext';
import { createPlanThumbnail, loadPlanFile } from '../io/planFileLoader';
import { createProjectBundle } from '../io/projectBundle';
import { TOOLS } from '../types';
import { projectService } from '../../services';
import { confirmPlanReplacement } from '../io/planReplacement';

const tools = [
  [TOOLS.SELECT, 'bi-cursor', 'Seleccionar'], [TOOLS.PAN, 'bi-hand-index', 'Mover plano'],
  [TOOLS.SYMBOL, 'bi-shapes', 'Símbolo'], [TOOLS.ARROW, 'bi-arrow-right', 'Flecha'], [TOOLS.TEXT, 'bi-fonts', 'Texto'],
];

const SAVE_LABELS = { loading: 'Cargando…', pending: 'Cambios pendientes', saving: 'Guardando...', saved: 'Guardado', error: 'Error al guardar' };

const EditorToolbar = ({ onOpenAI, onOpenAdvisor, onOpenReport, projectId, saveStatus, externalNotice, onDismissExternalNotice }) => {
  const { user } = useAuth();
  const { state, setTool, undo, redo, canUndo, canRedo, deleteSelected, setViewport, loadDocument, loadProject, replacePlanImage } = useEditor();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [fileNotice, setFileNotice] = useState(null);

  const handlePlanFile = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) { input.value = ''; return; }
    setLoading(true);
    setFileNotice({ type: 'info', message: `Cargando ${file.name}…` });
    try {
      const isJSON = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
      if (!isJSON && !confirmPlanReplacement(state.document, () => window.confirm('Cambiar el plano base puede invalidar escala, mediciones, rutas y simulaciones existentes.\n\n¿Reemplazar plano?'))) {
        setFileNotice({ type: 'info', message: 'Reemplazo de plano cancelado.' });
        return;
      }
      const loaded = await loadPlanFile(file);
      let planImage;
      if (loaded.kind === 'project') {
        loadProject(loaded.project);
        planImage = loaded.project.document?.elements?.find((element) => element.type === 'planImage');
      } else if (loaded.kind === 'document') {
        loadDocument(loaded.document);
        planImage = loaded.document.elements?.find((element) => element.type === 'planImage');
      } else {
        replacePlanImage(loaded.image);
        planImage = loaded.image;
      }
      setFileNotice({ type: 'success', message: `${file.name} cargado correctamente.` });
      if (projectId && planImage?.src) {
        void createPlanThumbnail(planImage.src)
          .then((thumbnail) => projectService.update(projectId, { thumbnail }, { timeout: 10000 }))
          .catch((thumbnailError) => {
          setFileNotice({ type: 'warning', message: `${file.name} se cargó, pero no se pudo actualizar la miniatura: ${thumbnailError.message}` });
          });
      }
    } catch (error) {
      setFileNotice({ type: 'error', message: `${file.name}: ${error?.message || 'No se pudo cargar el plano.'}` });
    } finally {
      input.value = '';
      setLoading(false);
    }
  };
  const saveDocument = () => {
    const project = createProjectBundle({ state, user });
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = globalThis.document.createElement('a');
    link.href = url; link.download = `proyecto-inteli-pde-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    URL.revokeObjectURL(url);
  };
  return <div className="editor-toolbar">
    <input ref={fileInputRef} type="file" hidden accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp,application/json,.json" onChange={handlePlanFile} />
    <button type="button" className="btn btn-primary d-flex align-items-center gap-2" disabled={loading || saveStatus === 'loading'} title={saveStatus === 'loading' ? 'Esperando carga del proyecto…' : 'Cargar o reemplazar plano'} onClick={() => fileInputRef.current?.click()}>
      <i className={`bi ${loading ? 'bi-hourglass-split' : 'bi-upload'}`} /><span className="toolbar-responsive-label">{saveStatus === 'loading' ? 'Esperando proyecto…' : loading ? 'Cargando plano…' : 'Cargar plano'}</span>
    </button>
    <button className="btn btn-light" title="Guardar proyecto" aria-label="Guardar proyecto Inteli -Safe" onClick={saveDocument}><i className="bi bi-download" /></button>
    {projectId && <span className={`autosave-status autosave-${saveStatus || 'saved'}`} role="status">{SAVE_LABELS[saveStatus] || SAVE_LABELS.saved}</span>}
    {(externalNotice || fileNotice) && <span className={`plan-load-notice notice-${(externalNotice || fileNotice).type}`} role={(externalNotice || fileNotice).type === 'error' ? 'alert' : 'status'} title={(externalNotice || fileNotice).message}>{(externalNotice || fileNotice).message}<button type="button" aria-label="Cerrar mensaje" onClick={() => { setFileNotice(null); onDismissExternalNotice?.(); }}>×</button></span>}
    <span className="toolbar-divider" />
    <button className={`btn ${state.activeTool === TOOLS.CALIBRATE ? 'btn-primary' : 'btn-light'}`} aria-label="Calibrar escala" title="Calibrar escala" onClick={() => setTool(TOOLS.CALIBRATE)}><i className="bi bi-rulers" /><span className="toolbar-responsive-label ms-1">Calibrar escala</span></button>
    <button className={`btn ${state.activeTool === TOOLS.MEASURE ? 'btn-primary' : 'btn-light'}`} aria-label="Medir distancia" title="Medir distancia" onClick={() => setTool(TOOLS.MEASURE)}><i className="bi bi-arrows" /><span className="toolbar-responsive-label ms-1">Medir</span></button>
    <button className={`btn ${state.activeTool === TOOLS.MEASURE_WIDTH ? 'btn-primary' : 'btn-light'}`} aria-label="Medir ancho" title="Medir ancho" onClick={() => setTool(TOOLS.MEASURE_WIDTH)}><i className="bi bi-arrows-collapse" /><span className="toolbar-responsive-label ms-1">Medir ancho</span></button>
    <button className={`btn ${state.activeTool === TOOLS.MEASURE_AREA ? 'btn-primary' : 'btn-light'}`} aria-label="Medir superficie" title="Medir superficie" onClick={() => setTool(TOOLS.MEASURE_AREA)}><i className="bi bi-pentagon" /><span className="toolbar-responsive-label ms-1">Medir superficie</span></button>
    <span className={`scale-status ${state.document.scale?.calibrated ? 'calibrated' : ''}`}>{state.document.scale?.calibrated ? `${state.document.scale.pixelsPerMeter.toFixed(2)} px/m` : 'Sin escala'}</span>
    <span className="toolbar-divider" />
    <div className="btn-group">
      {tools.map(([id, icon, label]) => <button key={id} title={label} aria-label={label} aria-pressed={state.activeTool === id} className={`btn ${state.activeTool === id ? 'btn-primary' : 'btn-light'}`} onClick={() => setTool(id)}><i className={`bi ${icon}`} /></button>)}
    </div>
    <span className="toolbar-divider" />
    <button className="btn btn-light" title="Deshacer" aria-label="Deshacer" disabled={!canUndo} onClick={undo}><i className="bi bi-arrow-counterclockwise" /></button>
    <button className="btn btn-light" title="Rehacer" aria-label="Rehacer" disabled={!canRedo} onClick={redo}><i className="bi bi-arrow-clockwise" /></button>
    <button className="btn btn-light" title="Eliminar" aria-label="Eliminar selección" disabled={!state.selectedIds.length} onClick={deleteSelected}><i className="bi bi-trash" /></button>
    <span className="toolbar-divider" />
    <button className="btn btn-light" onClick={() => setViewport({ scale: Math.max(.2, state.document.viewport.scale - .1) })}>−</button>
    <span className="zoom-label">{Math.round(state.document.viewport.scale * 100)}%</span>
    <button className="btn btn-light" onClick={() => setViewport({ scale: Math.min(4, state.document.viewport.scale + .1) })}>+</button>
    <button className="btn btn-light" title="Centrar vista" onClick={() => setViewport({ scale: 1, x: 80, y: 80 })}><i className="bi bi-bounding-box-circles" /></button>
    <button className="btn btn-ai ms-auto" onClick={onOpenAI}><i className="bi bi-stars" /><span className="toolbar-responsive-label ms-2">Analizar con IA</span></button>
    <button className="btn btn-light d-flex align-items-center gap-2" title="Interpretar resultados existentes" onClick={onOpenAdvisor}><i className="bi bi-journal-check" /><span className="toolbar-responsive-label">Inteli Advisor</span></button>
    <button className="btn btn-danger d-flex align-items-center gap-2" onClick={onOpenReport}><i className="bi bi-file-earmark-pdf" /><span className="toolbar-responsive-label">Generar informe</span></button>
  </div>;
};
export default EditorToolbar;
