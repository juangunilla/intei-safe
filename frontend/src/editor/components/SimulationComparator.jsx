import { useMemo, useState } from 'react';
import { compareSimulations } from '../simulation/simulationWorkspaceModel';

const Metric = ({ label, value, suffix = '' }) => <tr><th>{label}</th><td>{value.a.toFixed(1)}{suffix}</td><td>{value.b.toFixed(1)}{suffix}</td><td>{value.difference >= 0 ? '+' : ''}{value.difference.toFixed(1)}{suffix}</td><td>{value.percentage === null ? '—' : `${value.percentage >= 0 ? '+' : ''}${value.percentage.toFixed(1)}%`}</td></tr>;

const SimulationComparator = ({ simulations, onClose }) => {
  const completed = simulations.filter(({ status }) => status === 'completed');
  const [firstId, setFirstId] = useState(completed[0]?.id || '');
  const [secondId, setSecondId] = useState(completed[1]?.id || completed[0]?.id || '');
  const comparison = useMemo(() => compareSimulations(completed.find(({ id }) => id === firstId), completed.find(({ id }) => id === secondId)), [completed, firstId, secondId]);
  return <div className="simulation-comparator"><div className="comparator-heading"><h5>Comparar simulaciones</h5><button onClick={onClose}><i className="bi bi-x-lg" /></button></div><div className="comparator-selectors"><select value={firstId} onChange={(event) => setFirstId(event.target.value)}>{completed.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><b>vs</b><select value={secondId} onChange={(event) => setSecondId(event.target.value)}>{completed.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>{comparison ? <table><thead><tr><th>Métrica</th><th>Simulación A</th><th>Simulación B</th><th>Diferencia</th><th>Diferencia %</th></tr></thead><tbody><Metric label="Tiempo total" value={comparison.totalTime} suffix=" s" /><Metric label="Tiempo promedio" value={comparison.averageTime} suffix=" s" /><Metric label="Evacuados" value={comparison.evacuated} /><Metric label="Bloqueados" value={comparison.blocked} /><Metric label="Cola máxima aproximada" value={comparison.maxQueue} /><tr><th>Salida más utilizada</th><td>{comparison.mostUsedExit.a?.id || '—'}</td><td>{comparison.mostUsedExit.b?.id || '—'}</td><td colSpan="2">Sin valoración automática</td></tr><tr><th>Cuello de botella</th><td>{comparison.bottleneck.a?.routeId || '—'}</td><td>{comparison.bottleneck.b?.routeId || '—'}</td><td colSpan="2">Uso relativo de rutas</td></tr></tbody></table> : <p>Se necesitan dos simulaciones ejecutadas.</p>}<small>La comparación no determina seguridad, aprobación ni cumplimiento.</small></div>;
};

export default SimulationComparator;
