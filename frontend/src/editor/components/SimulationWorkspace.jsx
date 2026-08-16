import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEditor } from '../store/EditorContext';
import EditorCanvas from './EditorCanvas';
import SimulationModelTree from './SimulationModelTree';
import SimulationPropertiesPanel from './SimulationPropertiesPanel';
import SimulationTimeline from './SimulationTimeline';
import SimulationComparator from './SimulationComparator';
import { createSimulation } from '../simulation/simulationModel';
import { runSimulation } from '../simulation/simulationEngine';
import { duplicateSimulationScenario, simulationStatusLabel } from '../simulation/simulationWorkspaceModel';
import { validateSimulationReadiness } from '../simulation/simulationModelValidation';
import SimulationModelPreparationPanel from './SimulationModelPreparationPanel';

const SimulationWorkspace = () => {
  const { user } = useAuth();
  const { state, saveSimulation, deleteSimulation, setSimulationPlayback, focusEntity } = useEditor();
  const [selectedNode, setSelectedNode] = useState({ type: 'simulation' });
  const [activeId, setActiveId] = useState(state.simulationPlayback.simulation?.id || state.document.simulations?.at(-1)?.id || null);
  const [comparing, setComparing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [readinessIssues, setReadinessIssues] = useState([]);
  const simulations = state.document.simulations || [];
  const activeSimulation = simulations.find(({ id }) => id === activeId) || state.simulationPlayback.simulation || null;
  const playback = state.simulationPlayback;
  const status = calculating ? 'Calculando' : simulationStatusLabel({ simulation: playback.simulation || activeSimulation, playing: playback.playing, elapsedSeconds: playback.elapsedSeconds });

  useEffect(() => {
    if (!playback.playing || !playback.simulation) return undefined;
    const interval = setInterval(() => {
      const total = playback.simulation.results.totalSimulationTimeSeconds || 0;
      const next = Math.min(total, playback.elapsedSeconds + .1 * playback.playbackRate);
      setSimulationPlayback({ elapsedSeconds: next, playing: next < total });
    }, 100);
    return () => clearInterval(interval);
  }, [playback.playing, playback.elapsedSeconds, playback.playbackRate, playback.simulation, setSimulationPlayback]);

  const newSimulation = () => {
    const simulation = createSimulation({ name: `Simulación ${simulations.length + 1}`, createdBy: user?.name || user?.email || '', planVersion: state.document.version });
    saveSimulation(simulation); setActiveId(simulation.id); setSelectedNode({ type: 'simulation', id: simulation.id }); setSimulationPlayback({ simulation, elapsedSeconds: 0, playing: false });
  };
  const selectSimulation = (simulation) => { setActiveId(simulation.id); setSelectedNode({ type: 'simulation', id: simulation.id }); setSimulationPlayback({ simulation, elapsedSeconds: 0, playing: false }); };
  const execute = (simulation = activeSimulation) => {
    if (!simulation) return newSimulation();
    const readiness = validateSimulationReadiness(state.document, simulation);
    if (!readiness.ready) { setReadinessIssues(readiness.issues); return; }
    setReadinessIssues([]);
    setCalculating(true);
    const completed = runSimulation({ simulation: { ...simulation, status: 'running' }, document: state.document });
    saveSimulation(completed); setActiveId(completed.id); setSimulationPlayback({ simulation: completed, elapsedSeconds: 0, playing: false }); setCalculating(false);
  };
  const duplicate = (simulation = activeSimulation) => {
    if (!simulation) return;
    const copy = duplicateSimulationScenario(simulation, { id: crypto.randomUUID(), createdAt: new Date().toISOString(), createdBy: user?.name || user?.email || '' });
    saveSimulation(copy); setActiveId(copy.id); setSimulationPlayback({ simulation: copy, elapsedSeconds: 0, playing: false });
  };
  const remove = (id) => { deleteSimulation(id); if (activeId === id) { setActiveId(null); setSimulationPlayback({ simulation: null, elapsedSeconds: 0, playing: false }); } };
  const patch = (changes) => { if (!activeSimulation) return; const updated = { ...activeSimulation, ...changes, status: changes.name ? activeSimulation.status : 'draft' }; saveSimulation(updated); setSimulationPlayback({ simulation: updated, playing: false }); };
  const toolbar = useMemo(() => [
    ['Preparar modelo', 'bi-diagram-3', () => setPreparing(true), false], ['Nueva simulación', 'bi-plus-lg', newSimulation, false], ['Ejecutar', 'bi-play-fill', () => execute(), !activeSimulation], ['Reiniciar', 'bi-arrow-counterclockwise', () => setSimulationPlayback({ elapsedSeconds: 0, playing: false }), !playback.simulation], ['Duplicar escenario', 'bi-copy', () => duplicate(), !activeSimulation], ['Comparar', 'bi-columns-gap', () => setComparing(true), simulations.filter(({ status }) => status === 'completed').length < 2], ['Exportar', 'bi-box-arrow-up', () => {}, true],
  ], [activeSimulation, playback.simulation, simulations]);
  return <section className="simulation-workspace"><header className="simulation-workspace-toolbar"><div>{toolbar.map(([label, icon, action, disabled]) => <button key={label} title={label} disabled={disabled} onClick={action}><i className={`bi ${icon}`} /><span>{label}</span></button>)}</div><span className={`simulation-workspace-status status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span></header>{readinessIssues.length > 0 && <div className="simulation-readiness-alert"><strong>El modelo todavía no se puede ejecutar:</strong> {readinessIssues.map(({ message }) => message).join(' ') } <button onClick={() => setPreparing(true)}>Revisar modelo</button></div>}<div className="simulation-workspace-body"><SimulationModelTree activeSimulation={activeSimulation} selectedNode={selectedNode} onSelectSimulation={selectSimulation} onSelectNode={setSelectedNode} onNew={newSimulation} onDuplicate={duplicate} onDelete={remove} onRun={execute} /><main className="simulation-viewport"><EditorCanvas /></main><SimulationPropertiesPanel selectedNode={selectedNode} simulation={activeSimulation} onPatchSimulation={patch} /></div><SimulationTimeline />{comparing && <SimulationComparator simulations={simulations} onClose={() => setComparing(false)} />}{preparing && <SimulationModelPreparationPanel onClose={() => setPreparing(false)} />}</section>;
};

export default SimulationWorkspace;
