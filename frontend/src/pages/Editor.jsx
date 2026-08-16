import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import EditorCanvas from '../editor/components/EditorCanvas';
import EditorSidebar from '../editor/components/EditorSidebar';
import EditorToolbar from '../editor/components/EditorToolbar';
import { EditorProvider } from '../editor/store/EditorContext';
import AIPlanPanel from '../editor/components/AIPlanPanel';
import AIInspectorPanel from '../editor/components/AIInspectorPanel';
import ReportPanel from '../editor/components/ReportPanel';
import { projectService } from '../services';
import { useEditor } from '../editor/store/EditorContext';
import { createProjectBundle, restoreProjectBundle } from '../editor/io/projectBundle';
import { useAuth } from '../context/AuthContext';
import { shouldApplyInitialProject } from '../editor/io/initialProjectLoad';
import RegulatoryReviewPanel from '../editor/components/RegulatoryReviewPanel';
import SimulationPanel from '../editor/components/SimulationPanel';
import { EDITOR_MODES, editorModeLabel } from '../editor/simulation/simulationWorkspaceModel';

const SimulationWorkspace = lazy(() => import('../editor/components/SimulationWorkspace'));
const AdvisorPanel = lazy(() => import('../editor/components/AdvisorPanel'));

const EditorContent = () => {
  const { projectId } = useParams();
  const { state, loadProject } = useEditor();
  const { user } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('plan');
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('loading');
  const [editorNotice, setEditorNotice] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const loadedRef = useRef(false);
  const versionRef = useRef(0);
  const saveQueueRef = useRef(Promise.resolve());
  const latestSaveRef = useRef(0);
  const loadTokenRef = useRef(0);
  const latestDocumentRef = useRef(state.document);
  latestDocumentRef.current = state.document;
  useEffect(() => {
    if (!projectId) return;
    loadedRef.current = false;
    setInitialLoadComplete(false);
    saveQueueRef.current = Promise.resolve();
    latestSaveRef.current = 0;
    const requestToken = loadTokenRef.current + 1;
    loadTokenRef.current = requestToken;
    const documentAtStart = latestDocumentRef.current;
    setSaveStatus('loading');
    projectService.get(projectId).then(({ data }) => {
      setProjectName(data.project.name);
      versionRef.current = data.project.documentVersion || 0;
      if (!shouldApplyInitialProject({ requestToken, currentToken: loadTokenRef.current, documentAtStart, currentDocument: latestDocumentRef.current })) {
        setEditorNotice({ type: 'warning', message: 'El proyecto cambió localmente durante la carga inicial. Se conservaron los cambios locales.' });
        loadedRef.current = true;
        setInitialLoadComplete(true);
        setSaveStatus('pending');
        return;
      }
      if (data.project.editorState) loadProject(restoreProjectBundle(data.project.editorState));
      loadedRef.current = true;
      setInitialLoadComplete(true);
      setSaveStatus('saved');
    }).catch((error) => {
      setProjectName('Proyecto');
      setSaveStatus('error');
      setEditorNotice({ type: 'error', message: error?.response?.data?.message || 'No se pudo recuperar el proyecto.' });
    });
  }, [projectId, loadProject]);

  useEffect(() => {
    if (!projectId || !loadedRef.current) return undefined;
    setSaveStatus('pending');
    const timer = setTimeout(() => {
      const saveId = latestSaveRef.current + 1;
      latestSaveRef.current = saveId;
      const editorState = createProjectBundle({ state, user });
      setSaveStatus('saving');
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        try {
          const { data } = await projectService.update(projectId, {
            editorState,
            expectedDocumentVersion: versionRef.current,
          });
          versionRef.current = data.project.documentVersion;
          if (saveId === latestSaveRef.current) setSaveStatus('saved');
        } catch (error) {
          if (saveId === latestSaveRef.current) {
            setSaveStatus('error');
            const conflict = error?.response?.status === 409;
            setEditorNotice({ type: 'error', message: conflict
              ? 'Conflicto de guardado: existe una versión más reciente en el servidor. Tus cambios locales no fueron descartados.'
              : error?.response?.data?.message || 'No se pudo guardar el proyecto. Tus cambios locales se conservan.' });
          }
        }
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [projectId, state.document, state.past, state.future, user, initialLoadComplete]);
  return <>
    <div className="editor-header"><div><h2>{projectName || 'Editor de planos'}</h2><p>Diseñá y validá planes de evacuación con asistencia inteligente.</p></div><span className="ai-ready"><i className="bi bi-stars" /> Preparado para IA</span></div>
    <div className="editor-shell"><EditorToolbar projectId={projectId} saveStatus={saveStatus} externalNotice={editorNotice} onDismissExternalNotice={() => setEditorNotice(null)} onOpenAI={() => setAiOpen(true)} onOpenAdvisor={() => setAdvisorOpen(true)} onOpenReport={() => { setEditorMode('report'); setReportOpen(true); }} /><nav className="editor-mode-bar" aria-label="Modo de trabajo">{EDITOR_MODES.map((mode) => <button key={mode} className={editorMode === mode ? 'active' : ''} onClick={() => { setEditorMode(mode); if (mode === 'report') setReportOpen(true); }}>{editorModeLabel[mode]}</button>)}</nav>{editorMode === 'simulation' ? <Suspense fallback={<div className="simulation-loading">Cargando espacio de simulación…</div>}><SimulationWorkspace /></Suspense> : <div className="editor-workspace"><EditorSidebar /><EditorCanvas /><AIInspectorPanel />{editorMode === 'plan' && <SimulationPanel />}<RegulatoryReviewPanel key={editorMode} defaultOpen={editorMode === 'regulatory'} /></div>}</div>
    <AIPlanPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    <ReportPanel open={reportOpen} onClose={() => { setReportOpen(false); if (editorMode === 'report') setEditorMode('plan'); }} />
    {advisorOpen && <Suspense fallback={null}><AdvisorPanel projectId={projectId} open={advisorOpen} onClose={() => setAdvisorOpen(false)} /></Suspense>}
  </>;
};

const Editor = () => <Layout>
  <EditorProvider>
    <EditorContent />
  </EditorProvider>
</Layout>;
export default Editor;
