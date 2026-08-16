import { useMemo, useState } from 'react';
import { useEditor } from '../store/EditorContext';

const Branch = ({ id, label, children, initial = true }) => {
  const [open, setOpen] = useState(initial);
  return <li className="model-branch"><button onClick={() => setOpen((value) => !value)} aria-expanded={open}><i className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'}`} /> {label}</button>{open && <ul>{children}</ul>}</li>;
};

const Entity = ({ label, onClick, selected }) => <li><button className={selected ? 'selected' : ''} onClick={onClick}>{label}</button></li>;

const SimulationModelTree = ({ activeSimulation, selectedNode, onSelectSimulation, onSelectNode, onNew, onDuplicate, onDelete, onRun }) => {
  const { state, focusEntity } = useEditor();
  const document = state.document;
  const elements = document.elements ?? [];
  const sectors = document.sectors ?? [];
  const measurements = document.measurements ?? [];
  const simulations = document.simulations ?? [];
  const routes = useMemo(() => elements.filter(({ routeId }) => routeId), [elements]);
  const exits = useMemo(() => elements.filter((element) => element.type === 'symbol' && element.symbolId === 'emergencyExit'), [elements]);
  const selectEntity = (type, id) => { focusEntity(type, id); onSelectNode({ type, id }); };
  return <aside className="simulation-model-tree"><div className="workspace-panel-title">Modelo</div><ul className="model-tree-root">
    <Branch id="project" label="Proyecto"><Branch id="floor" label="Planta">
      <Branch id="sectors" label={`Sectores (${sectors.length})`}>{sectors.map((item) => <Entity key={item.id} label={item.name} selected={selectedNode?.id === item.id} onClick={() => selectEntity('sector', item.id)} />)}</Branch>
      <Branch id="routes" label={`Rutas (${routes.length})`}>{routes.map((item) => <Entity key={item.routeId} label={item.routeId} selected={selectedNode?.id === item.routeId} onClick={() => selectEntity('route', item.routeId)} />)}</Branch>
      <Branch id="exits" label={`Salidas (${exits.length})`}>{exits.map((item) => <Entity key={item.id} label={item.label || item.id} selected={selectedNode?.id === item.id} onClick={() => selectEntity('element', item.id)} />)}</Branch>
      <Branch id="measurements" label={`Mediciones (${measurements.length})`}>{measurements.map((item) => <Entity key={item.id} label={item.label || item.type} selected={selectedNode?.id === item.id} onClick={() => selectEntity('measurement', item.id)} />)}</Branch>
    </Branch></Branch>
    <Branch id="simulation" label="Simulación"><Branch id="scenarios" label={`Escenarios (${simulations.length})`}>{simulations.map((item) => <li key={item.id} className={activeSimulation?.id === item.id ? 'selected-simulation' : ''}><button onClick={() => onSelectSimulation(item)}>{item.name}</button><span><button title="Ejecutar escenario" onClick={() => onRun(item)}><i className="bi bi-play-fill" /></button><button title="Duplicar escenario" onClick={() => onDuplicate(item)}><i className="bi bi-copy" /></button><button title="Eliminar escenario" onClick={() => onDelete(item.id)}><i className="bi bi-trash" /></button></span></li>)}</Branch><Entity label="Ocupantes" onClick={() => onSelectNode({ type: 'simulation' })} /><Entity label="Bloqueos" onClick={() => onSelectNode({ type: 'simulation' })} /><li><button onClick={onNew}><i className="bi bi-plus" /> Nuevo escenario</button></li></Branch>
    <Branch id="results" label="Resultados"><Branch id="result-sectors" label="Sectores">{sectors.map((item) => <Entity key={item.id} label={item.name} onClick={() => selectEntity('sector', item.id)} />)}</Branch><Branch id="result-exits" label="Salidas">{(activeSimulation?.results?.exitUsage || []).map((item) => <Entity key={item.id} label={`${item.id} · ${item.count}`} onClick={() => selectEntity('element', item.id)} />)}</Branch><Branch id="bottlenecks" label="Cuellos de botella">{[...(activeSimulation?.results?.routeLoad || [])].sort((a, b) => b.assignedAgents - a.assignedAgents).map((item) => <Entity key={item.routeId} label={`${item.routeId} · ${item.assignedAgents}`} onClick={() => selectEntity('route', item.routeId)} />)}</Branch></Branch>
  </ul></aside>;
};

export default SimulationModelTree;
