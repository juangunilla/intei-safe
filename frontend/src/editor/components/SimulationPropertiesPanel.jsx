import { useMemo } from 'react';
import { useEditor } from '../store/EditorContext';
import { contextualSimulationProperties } from '../simulation/simulationProperties';

const SimulationPropertiesPanel = ({ selectedNode, simulation, onPatchSimulation }) => {
  const { state, setSimulationViewOptions } = useEditor();
  const properties = useMemo(() => contextualSimulationProperties({ selection: selectedNode, simulation, document: state.document }), [selectedNode, simulation, state.document]);
  const options = state.simulationViewOptions;
  return <aside className="simulation-properties"><div className="workspace-panel-title">Propiedades</div>{!properties && <p>Entidad no disponible.</p>}{properties && <><h6>{properties.title}</h6>{properties.kind === 'simulation' && simulation && <div className="simulation-property-form">
    <label>Nombre<input value={simulation.name} onChange={(event) => onPatchSimulation({ name: event.target.value, scenario: { ...simulation.scenario, name: event.target.value } })} /></label>
    <label title="Tiempo transcurrido antes de iniciar el desplazamiento.">Tiempo de reacción<input type="number" min="0" value={simulation.parameters.reactionTimeSeconds} onChange={(event) => onPatchSimulation({ parameters: { ...simulation.parameters, reactionTimeSeconds: Number(event.target.value) } })} /></label>
    <label title="Velocidad lineal declarada para los agentes.">Velocidad (m/s)<input type="number" min=".01" step=".1" value={simulation.parameters.walkingSpeedMetersPerSecond} onChange={(event) => onPatchSimulation({ parameters: { ...simulation.parameters, walkingSpeedMetersPerSecond: Number(event.target.value) } })} /></label>
    <label title="Permite repetir exactamente la misma simulación.">Semilla<input value={simulation.parameters.randomSeed ?? ''} onChange={(event) => onPatchSimulation({ parameters: { ...simulation.parameters, randomSeed: event.target.value || null } })} /></label>
    <label title="Intervalo discreto utilizado por el motor determinístico.">Timestep (ms)<input type="number" min="10" value={simulation.parameters.simulationStepMs} onChange={(event) => onPatchSimulation({ parameters: { ...simulation.parameters, simulationStepMs: Number(event.target.value) } })} /></label>
  </div>}{Object.entries(properties.values).map(([key, value]) => <div className="property-row" key={key}><span>{key}</span><b>{String(value)}</b></div>)}</>}
    <section><div className="workspace-panel-title">Visualización</div>{Object.entries({ showAgents: 'Agentes', showRoutes: 'Rutas', showSectors: 'Sectores', showNames: 'Nombres', showResults: 'Resultados', showHeatmap: 'Mapa de utilización' }).map(([key, label]) => <label className="view-option" key={key}><input type="checkbox" checked={options[key]} onChange={(event) => setSimulationViewOptions({ [key]: event.target.checked })} /> {label}</label>)}</section>
    {options.showHeatmap && <small>Mapa de utilización de la simulación. No representa riesgo, densidad física ni cumplimiento.</small>}
  </aside>;
};

export default SimulationPropertiesPanel;
