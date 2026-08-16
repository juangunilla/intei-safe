import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEditor } from '../store/EditorContext';
import { blockedExitScenario, createSimulation, NORMAL_SCENARIO, SIMULATION_DISCLAIMER } from '../simulation/simulationModel';
import { runSimulation } from '../simulation/simulationEngine';
import { simulationFrame } from '../simulation/simulationPlayback';
import { validateSimulationReadiness } from '../simulation/simulationModelValidation';

const numeric = (value) => value === '' ? null : Number(value);

const SimulationPanel = () => {
  const { user } = useAuth();
  const { state, saveSimulation, setSimulationPlayback, clearSimulationPlayback } = useEditor();
  const [open, setOpen] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [scenarioType, setScenarioType] = useState('normal');
  const [parameters, setParameters] = useState({ reactionTimeSeconds: 30, walkingSpeedMetersPerSecond: 1.2, mobilityReducedCount: 0, mobilityReducedSpeedMetersPerSecond: .6, simulationStepMs: 100, selectedSectorIds: [], selectedExitIds: [], blockedExitIds: [], blockedRouteIds: [], randomSeed: '', distributionMode: 'sectors', sectorOccupancy: {} });
  const playback = state.simulationPlayback;
  const exits = useMemo(() => state.document.elements.filter((element) => element.type === 'symbol' && element.symbolId === 'emergencyExit'), [state.document.elements]);
  const sectors = state.document.sectors || [];
  const frame = useMemo(() => simulationFrame(playback.simulation, playback.elapsedSeconds), [playback.simulation, playback.elapsedSeconds]);

  useEffect(() => {
    if (!playback.playing || !playback.simulation) return undefined;
    const interval = setInterval(() => {
      const total = playback.simulation.results.totalSimulationTimeSeconds || 0;
      const next = Math.min(total, playback.elapsedSeconds + .1 * playback.playbackRate);
      setSimulationPlayback({ elapsedSeconds: next, playing: next < total });
    }, 100);
    return () => clearInterval(interval);
  }, [playback.playing, playback.elapsedSeconds, playback.playbackRate, playback.simulation, setSimulationPlayback]);

  const toggleList = (key, id) => setParameters((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id] }));
  const start = () => {
    const selectedSectorIds = parameters.selectedSectorIds.length ? parameters.selectedSectorIds : sectors.map(({ id }) => id);
    const selectedExitIds = parameters.selectedExitIds.length ? parameters.selectedExitIds : exits.map(({ id }) => id);
    const scenario = scenarioType === 'blocked' ? { ...blockedExitScenario(), blockedExitIds: [...parameters.blockedExitIds] } : NORMAL_SCENARIO;
    const draft = createSimulation({
      name: scenario.name, createdBy: user?.name || user?.email || '', planVersion: state.document.version,
      scenario, parameters: { ...parameters, selectedSectorIds, selectedExitIds, randomSeed: parameters.randomSeed || null },
    });
    const readiness = validateSimulationReadiness(state.document, draft);
    if (!readiness.ready) { setValidationError(readiness.issues.map(({ message }) => message).join(' ')); return; }
    setValidationError('');
    const completed = runSimulation({ simulation: draft, document: state.document });
    saveSimulation(completed);
    setSimulationPlayback({ simulation: completed, elapsedSeconds: 0, playing: completed.results.totalSimulationTimeSeconds > 0, playbackRate: 1 });
  };
  const close = () => { setOpen(false); clearSimulationPlayback(); };

  return <aside className={`simulation-panel ${open ? 'open' : ''}`}>
    <button className="simulation-toggle" onClick={() => open ? close() : setOpen(true)}><i className="bi bi-people" /> Simulación</button>
    {open && <div className="simulation-content">
      <h5>Simulación de evacuación</h5><div className="simulation-disclaimer">{SIMULATION_DISCLAIMER}</div>
      <label>Escenario<select value={scenarioType} onChange={(event) => setScenarioType(event.target.value)}><option value="normal">Escenario normal</option><option value="blocked">Salida bloqueada</option></select></label>
      <label>Distribución<select value={parameters.distributionMode} onChange={(event) => setParameters((current) => ({ ...current, distributionMode: event.target.value }))}><option value="sectors">Ocupación confirmada de sectores</option><option value="manual">Distribución manual</option></select></label>
      <section><b>Sectores</b>{!sectors.length && <small>No existen sectores persistentes.</small>}{sectors.map((sector) => <div key={sector.id} className="simulation-option"><label><input type="checkbox" checked={!parameters.selectedSectorIds.length || parameters.selectedSectorIds.includes(sector.id)} onChange={() => toggleList('selectedSectorIds', sector.id)} /> {sector.name}</label>{parameters.distributionMode === 'manual' ? <input aria-label={`Ocupantes en ${sector.name}`} type="number" min="0" value={parameters.sectorOccupancy[sector.id] ?? ''} onChange={(event) => setParameters((current) => ({ ...current, sectorOccupancy: { ...current.sectorOccupancy, [sector.id]: numeric(event.target.value) } }))} /> : <small>Ocupación: {sector.occupancy ?? 'no informada'}</small>}</div>)}</section>
      <section><b>Salidas</b>{!exits.length && <small>No existen salidas editables.</small>}{exits.map((exit) => <div key={exit.id} className="simulation-option"><label><input type="checkbox" checked={!parameters.selectedExitIds.length || parameters.selectedExitIds.includes(exit.id)} onChange={() => toggleList('selectedExitIds', exit.id)} /> {exit.label || exit.id}</label>{scenarioType === 'blocked' && <label><input type="checkbox" checked={parameters.blockedExitIds.includes(exit.id)} onChange={() => toggleList('blockedExitIds', exit.id)} /> Bloqueada</label>}</div>)}</section>
      <div className="simulation-grid">
        <label>Reacción (s)<input type="number" min="0" value={parameters.reactionTimeSeconds} onChange={(event) => setParameters((current) => ({ ...current, reactionTimeSeconds: Number(event.target.value) }))} /><small>Orientativo</small></label>
        <label>Velocidad (m/s)<input type="number" min=".01" step=".1" value={parameters.walkingSpeedMetersPerSecond} onChange={(event) => setParameters((current) => ({ ...current, walkingSpeedMetersPerSecond: Number(event.target.value) }))} /><small>Orientativo</small></label>
        <label>Movilidad reducida<input type="number" min="0" value={parameters.mobilityReducedCount} onChange={(event) => setParameters((current) => ({ ...current, mobilityReducedCount: Number(event.target.value) }))} /><small>Ingresado</small></label>
        <label>Velocidad reducida<input type="number" min=".01" step=".1" value={parameters.mobilityReducedSpeedMetersPerSecond} onChange={(event) => setParameters((current) => ({ ...current, mobilityReducedSpeedMetersPerSecond: Number(event.target.value) }))} /><small>Orientativo</small></label>
        <label>Semilla<input value={parameters.randomSeed} onChange={(event) => setParameters((current) => ({ ...current, randomSeed: event.target.value }))} /><small>Ingresada; vacío usa semilla estable</small></label>
      </div>
      <button className="btn btn-sm btn-primary" onClick={start}>Iniciar simulación</button>
      {validationError && <div className="alert alert-warning mt-2">{validationError}</div>}
      {playback.simulation && <section className="simulation-results"><h6>Resultado de simulación</h6><div>Tiempo: {frame.elapsedSeconds.toFixed(1)} s</div><div>Evacuados: {frame.evacuated} · Restantes: {frame.remaining} · Bloqueados: {frame.blocked}</div><div className="simulation-controls"><button onClick={() => setSimulationPlayback({ playing: true })}>Play</button><button onClick={() => setSimulationPlayback({ playing: false })}>Pausa</button><button onClick={() => setSimulationPlayback({ playing: false, elapsedSeconds: 0 })}>Reiniciar</button><select value={playback.playbackRate} onChange={(event) => setSimulationPlayback({ playbackRate: Number(event.target.value) })}>{[.5, 1, 2, 4].map((rate) => <option key={rate} value={rate}>{rate}x</option>)}</select></div><p>Total: {playback.simulation.results.totalSimulationTimeSeconds.toFixed(1)} s · Evacuados: {playback.simulation.results.evacuated} · Bloqueados: {playback.simulation.results.blocked}</p><p>Salida más utilizada: {playback.simulation.results.exitUsage[0]?.id || 'ninguna'} · Recorrido más utilizado: {playback.simulation.results.routeUsage[0]?.id || 'ninguno'}</p><ul>{playback.simulation.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></section>}
    </div>}
  </aside>;
};

export default SimulationPanel;
