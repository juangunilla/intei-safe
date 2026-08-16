import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { advisorNarrativeService } from '../../services';
import { useEditor } from '../store/EditorContext';
import { runAdvisor } from '../advisor/advisorEngine';
import { buildAdvisorNarrativeBatches, validateAdvisorNarrative } from '../advisor/advisorNarrative';
import { ADVISOR_CATEGORIES, ADVISOR_DISCLAIMER, ADVISOR_PRIORITIES, ADVISOR_STATUSES, observationEvidenceSelection } from '../advisor/advisorModel';
import { resolveEntity } from '../selection/entityFocus';

const PRIORITY_LABELS = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };
const STATUS_LABELS = { open: 'Pendiente', in_review: 'En revisión', resolved: 'Resuelta', dismissed: 'Descartada' };

const AdvisorPanel = ({ projectId, open, onClose }) => {
  const { user } = useAuth();
  const { state, setAdvisorAnalysis, setAdvisorNarrative, updateAdvisorObservationStatus, focusEntity } = useEditor();
  const [search, setSearch] = useState(''); const [priority, setPriority] = useState(''); const [category, setCategory] = useState(''); const [status, setStatus] = useState('');
  const [capabilities, setCapabilities] = useState({ available: false }); const [narrativeState, setNarrativeState] = useState('idle');
  const abortRef = useRef(null); const analysis = state.document.advisorAnalysis; const stale = analysis?.status === 'stale';
  const assisted = analysis?.narrativeMode === 'assisted' && analysis.narrativeContextFingerprint === analysis.contextFingerprint;
  useEffect(() => { if (open) advisorNarrativeService.getCapabilities().then(({ data }) => setCapabilities(data)).catch(() => setCapabilities({ available: false })); }, [open]);
  useEffect(() => () => abortRef.current?.abort(), []);
  const observations = useMemo(() => (analysis?.observations || []).filter((item) => {
    const text = `${item.title} ${item.description} ${item.recommendation}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (!priority || item.priority === priority) && (!category || item.category === category) && (!status || item.status === status);
  }), [analysis, search, priority, category, status]);
  const analyze = () => { abortRef.current?.abort(); setNarrativeState('idle'); setAdvisorAnalysis(runAdvisor({ document: state.document, previousAnalysis: analysis, generatedBy: user?.name || user?.email || '' })); };
  const generateNarrative = async () => {
    if (!analysis || !capabilities.available) return;
    abortRef.current = new AbortController(); setNarrativeState('loading');
    try {
      const batches = buildAdvisorNarrativeBatches({ projectId, analysis });
      const responses = [];
      for (const input of batches) {
        const { data } = await advisorNarrativeService.generate(input, abortRef.current.signal);
        if (data.fallbackUsed) throw new Error('Narrative fallback');
        validateAdvisorNarrative(input, data.narrative); responses.push(data);
      }
      const data = { ...responses[0], narrative: { executiveSummary: responses[0].narrative.executiveSummary, observationNarratives: Object.assign({}, ...responses.map(({ narrative }) => narrative.observationNarratives)), recommendationNarratives: Object.assign({}, ...responses.map(({ narrative }) => narrative.recommendationNarratives)) } };
      const now = new Date().toISOString();
      setAdvisorNarrative({
        narrativeMode: data.fallbackUsed ? 'deterministic' : 'assisted', assistedNarrative: data.fallbackUsed ? null : data.narrative,
        narrativeGeneratedAt: now, narrativeProvider: data.provider, narrativeModel: data.model,
        narrativeVersion: analysis.advisorNarrativeVersion, narrativeContextFingerprint: analysis.contextFingerprint,
      }, { projectId, timestamp: now, provider: data.provider, model: data.model, advisorEngineVersion: analysis.advisorEngineVersion, advisorNarrativeVersion: analysis.advisorNarrativeVersion, contextFingerprint: analysis.contextFingerprint, validationResult: data.validationResult, fallbackUsed: data.fallbackUsed });
      setNarrativeState(data.fallbackUsed ? 'fallback' : 'generated');
    } catch (error) { if (error.code !== 'ERR_CANCELED') { const now = new Date().toISOString(); setAdvisorNarrative({ narrativeMode: 'deterministic', assistedNarrative: null, narrativeGeneratedAt: now, narrativeProvider: null, narrativeModel: null, narrativeVersion: analysis.advisorNarrativeVersion, narrativeContextFingerprint: analysis.contextFingerprint }, { projectId, timestamp: now, provider: null, model: null, advisorEngineVersion: analysis.advisorEngineVersion, advisorNarrativeVersion: analysis.advisorNarrativeVersion, contextFingerprint: analysis.contextFingerprint, validationResult: 'network_or_client_validation_error', fallbackUsed: true }); setNarrativeState('fallback'); } }
  };
  const cancelNarrative = () => { abortRef.current?.abort(); setNarrativeState('idle'); };
  const quickFilter = (type) => { setPriority(type === 'critical' ? 'critical' : ''); setStatus(type === 'pending' ? 'open' : ''); setCategory({ regulatory: 'regulatory', simulation: 'simulation', ai: 'ai', missing: 'missing_data' }[type] || ''); };
  const displayedDescription = (item) => assisted ? analysis.assistedNarrative?.observationNarratives?.[item.id] || item.description : item.description;
  const displayedRecommendation = (item) => assisted ? analysis.assistedNarrative?.recommendationNarratives?.[`recommendation-${item.id}`] || item.recommendation : item.recommendation;
  return <div className={`advisor-backdrop ${open ? 'open' : ''}`} aria-hidden={!open}><aside className="advisor-panel" aria-label="Inteli Advisor">
    <header><div><h4>Inteli Advisor</h4><small>Consultor técnico determinístico</small></div><button onClick={onClose}><i className="bi bi-x-lg" /></button></header>
    <div className="advisor-actions"><button className="btn btn-primary" onClick={analyze}><i className="bi bi-search" /> {analysis ? 'Actualizar análisis' : 'Analizar Proyecto'}</button>{analysis && <fieldset className="advisor-narrative-mode"><legend>Modo de redacción</legend><label><input type="radio" checked={!assisted} onChange={() => setAdvisorNarrative({ narrativeMode: 'deterministic' })} /> Estándar</label><label title={capabilities.available ? '' : 'Configurá OPENAI_API_KEY y ADVISOR_NARRATIVE_MODEL en el backend.'}><input type="radio" checked={assisted} disabled={!capabilities.available || stale || narrativeState === 'loading'} onChange={generateNarrative} /> Asistida</label></fieldset>}<small>{ADVISOR_DISCLAIMER}</small></div>
    {narrativeState === 'loading' && <div className="advisor-narrative-status"><span>Mejorando redacción…</span><button onClick={cancelNarrative}>Cancelar</button></div>}{narrativeState === 'generated' && <div className="advisor-narrative-status success">Redacción asistida generada</div>}{narrativeState === 'fallback' && <div className="advisor-narrative-status fallback">Se utilizó redacción estándar.</div>}
    {!analysis ? <div className="advisor-empty"><i className="bi bi-journal-check" /><p>Ejecutá el análisis para interpretar los resultados existentes del proyecto.</p></div> : <><div className={`advisor-validity ${stale ? 'stale' : 'current'}`}><i className={`bi ${stale ? 'bi-clock-history' : 'bi-check-circle'}`} /><span>{stale ? 'Este análisis corresponde a una versión anterior del proyecto.' : 'Análisis actualizado'}</span></div>
      <section className="advisor-summary"><h5>Resumen ejecutivo {stale && <small>Resultado histórico</small>}</h5><p>{assisted ? analysis.assistedNarrative?.executiveSummary : analysis.executiveSummary.general}</p><details open><summary>Fortalezas</summary><ul>{analysis.executiveSummary.strengths.length ? analysis.executiveSummary.strengths.map((item) => <li key={item}>{item}</li>) : <li>No se identificaron fortalezas documentadas suficientes.</li>}</ul></details><details><summary>Puntos pendientes ({analysis.executiveSummary.pendingItems.length})</summary><ul>{analysis.executiveSummary.pendingItems.map((item) => <li key={item}>{item}</li>)}</ul></details><details><summary>Resultados relevantes</summary><ul>{analysis.executiveSummary.relevantResults.map((item) => <li key={item}>{item}</li>)}</ul></details></section>
      <section className="advisor-filters"><input aria-label="Buscar observaciones" placeholder="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Prioridad" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">Todas las prioridades</option>{ADVISOR_PRIORITIES.map((item) => <option key={item} value={item}>{PRIORITY_LABELS[item]}</option>)}</select><select aria-label="Categoría" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas las categorías</option>{Object.entries(ADVISOR_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select aria-label="Estado" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{ADVISOR_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select><div>{[['critical', 'Críticas'], ['pending', 'Pendientes'], ['regulatory', 'Normativas'], ['simulation', 'Simulación'], ['ai', 'IA'], ['missing', 'Datos faltantes']].map(([key, label]) => <button key={key} onClick={() => quickFilter(key)}>{label}</button>)}</div></section>
      <section className="advisor-observations"><h5>Observaciones ({observations.length}) {stale && <small>Resultado histórico</small>}</h5>{observations.map((item) => <article key={item.id} className={`advisor-observation priority-${item.priority}`}><div className="advisor-observation-heading"><span>{ADVISOR_CATEGORIES[item.category]}</span><b>{PRIORITY_LABELS[item.priority]}</b></div><h6>{item.title}</h6><p>{displayedDescription(item)}</p><div className="advisor-recommendation"><b>Recomendación</b>{displayedRecommendation(item)}</div><details><summary>Evidencia ({item.evidence.length})</summary>{item.evidence.map((source, index) => { const target = observationEvidenceSelection(source); const available = target ? Boolean(resolveEntity(state.document, target)) : false; return <div className="advisor-evidence" key={`${source.type}-${index}`}><code>{source.type}</code><span>{Object.entries(source).filter(([key]) => key !== 'type').map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`).join(' · ')}</span>{target && available && <button onClick={() => focusEntity(target.type, target.id)}>{target.label}</button>}{target && !available && <small>Evidencia no disponible en la versión actual.</small>}</div>; })}</details><label>Estado<select value={item.status} onChange={(event) => updateAdvisorObservationStatus(item.id, event.target.value)}>{ADVISOR_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label><small>Requiere revisión profesional</small></article>)}</section></>}
  </aside></div>;
};

export default AdvisorPanel;
