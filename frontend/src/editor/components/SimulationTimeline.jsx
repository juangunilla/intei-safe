import { useMemo } from 'react';
import { useEditor } from '../store/EditorContext';
import { clampSimulationTime, eventSelection } from '../simulation/simulationWorkspaceModel';

const EVENT_LABELS = { simulation_started: 'Inicio', agent_started: 'Inicio de evacuación', first_evacuated: 'Primer evacuado', exit_blocked: 'Salida bloqueada', queue_started: 'Inicio de cola aproximada', queue_maximum: 'Máximo de cola aproximada', last_evacuated: 'Último evacuado', agent_blocked: 'Agente bloqueado', agent_evacuated: 'Evacuado' };

const SimulationTimeline = () => {
  const { state, setSimulationPlayback, focusEntity } = useEditor();
  const playback = state.simulationPlayback;
  const simulation = playback.simulation;
  const duration = simulation?.results?.totalSimulationTimeSeconds || 0;
  const events = useMemo(() => (simulation?.events || []).filter((event, index, all) => ['simulation_started', 'first_evacuated', 'exit_blocked', 'queue_started', 'queue_maximum', 'last_evacuated', 'agent_blocked'].includes(event.type) && all.findIndex((candidate) => candidate.type === event.type && candidate.timestampSeconds === event.timestampSeconds && candidate.routeId === event.routeId && candidate.exitId === event.exitId) === index), [simulation]);
  const seek = (value) => setSimulationPlayback({ elapsedSeconds: clampSimulationTime(value, duration), playing: false });
  const eventClick = (event) => { seek(event.timestampSeconds); const target = eventSelection(event); if (target) focusEntity(target.type, target.id); };
  return <footer className="simulation-timeline"><div className="timeline-controls"><button title="Ir al inicio" onClick={() => seek(0)}><i className="bi bi-skip-start-fill" /></button><button title={playback.playing ? 'Pausar reproducción' : 'Iniciar reproducción'} onClick={() => setSimulationPlayback({ playing: !playback.playing })}><i className={`bi ${playback.playing ? 'bi-pause-fill' : 'bi-play-fill'}`} /></button><button title="Reiniciar reproducción" onClick={() => seek(0)}><i className="bi bi-arrow-counterclockwise" /></button><button title="Ir al final" onClick={() => seek(duration)}><i className="bi bi-skip-end-fill" /></button><b>{playback.elapsedSeconds.toFixed(1)} / {duration.toFixed(1)} s</b><select title="Velocidad de reproducción" value={playback.playbackRate} onChange={(event) => setSimulationPlayback({ playbackRate: Number(event.target.value) })}>{[.5, 1, 2, 4].map((rate) => <option key={rate} value={rate}>{rate}x</option>)}</select></div><div className="timeline-track"><input aria-label="Tiempo de simulación" type="range" min="0" max={duration || 1} step=".1" value={Math.min(playback.elapsedSeconds, duration || 1)} onChange={(event) => seek(event.target.value)} />{events.map((event, index) => <button key={`${event.type}-${index}`} className={`timeline-event event-${event.type}`} style={{ left: `${duration ? event.timestampSeconds / duration * 100 : 0}%` }} title={`${EVENT_LABELS[event.type] || event.type} · ${event.timestampSeconds.toFixed(1)} s`} onClick={() => eventClick(event)} />)}</div></footer>;
};

export default SimulationTimeline;
