import { useMemo, useState } from 'react';
import { regulatoryService } from '../../services';
import { useEditor } from '../store/EditorContext';
import { COMPLIANCE_LABELS, groupComplianceChecks } from '../regulatory/regulatoryModel';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { evidenceSelection, resolveEntity } from '../selection/entityFocus';

const RegulatoryReviewPanel = ({ defaultOpen = false }) => {
  const { state, exportDocument, setRegulatoryAnalysis, appendAuditEntry, focusEntity, clearGeometricSelection } = useEditor();
  const { projectId } = useParams();
  const { user } = useAuth();
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const analysis = state.document.regulatoryAnalysis;
  const groups = useMemo(() => groupComplianceChecks(analysis?.complianceChecks), [analysis]);

  const analyze = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await regulatoryService.analyze({ profile: state.document.establishmentProfile || {}, document: exportDocument() });
      setRegulatoryAnalysis(data);
      appendAuditEntry({ type: 'regulatory_analysis', user: user ? { id: user.id || user._id, name: user.name } : null, projectId, documentVersion: state.document.version, engineVersion: data.engineVersion, appliedRuleIds: data.applicableRules.map(({ id }) => id), dataUsed: state.document.establishmentProfile || {}, result: data });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo ejecutar la revisión normativa.');
    } finally { setLoading(false); }
  };

  return <aside className={`regulatory-panel ${open ? 'open' : ''}`}>
    <button className="regulatory-toggle" onClick={() => setOpen((current) => { if (current) clearGeometricSelection(); return !current; })}><i className="bi bi-clipboard2-check" /> Revisión normativa</button>
    {open && <div className="regulatory-content">
      <div className="d-flex justify-content-between gap-2"><div><strong>Revisión normativa</strong><small className="d-block">Documento preliminar</small></div><button className="btn btn-sm btn-primary" disabled={loading} onClick={analyze}>{loading ? 'Revisando…' : 'Ejecutar revisión'}</button></div>
      {error && <div className="alert alert-warning mt-2">{error}</div>}
      {!analysis && <p className="text-secondary mt-3">Completá el perfil y ejecutá la revisión. No se emitirá una aprobación legal.</p>}
      {analysis && <>
        <section><h6>Jurisdicción</h6><p>{analysis.jurisdiction.country || 'Sin país'} · {analysis.jurisdiction.province || 'Sin provincia'} · {analysis.jurisdiction.municipality || 'Sin municipio'}</p></section>
        <section><h6>Normativa considerada</h6><ul>{analysis.applicableRules.map((rule) => <li key={rule.id}><strong>{rule.source}</strong><small>{rule.sourceSection} · {rule.title}</small></li>)}</ul></section>
        {analysis.profileCompleteness && <section><h6>Información necesaria para completar la revisión</h6><p><strong>Información técnica: {analysis.profileCompleteness.score}%</strong><small className="d-block">Este porcentaje mide completitud de datos, no seguridad ni cumplimiento.</small></p>{analysis.profileCompleteness.missingCritical.length > 0 && <><b>Datos críticos faltantes</b><ul>{analysis.profileCompleteness.missingCritical.map((item) => <li key={item}>{item}</li>)}</ul></>}{analysis.profileCompleteness.missingRecommended.length > 0 && <details><summary>Datos recomendados faltantes ({analysis.profileCompleteness.missingRecommended.length})</summary><ul>{analysis.profileCompleteness.missingRecommended.map((item) => <li key={item}>{item}</li>)}</ul></details>}</section>}
        {analysis.missingInformation.length > 0 && <section><h6>Datos faltantes</h6><ul>{analysis.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        {Object.entries(groups).map(([result, checks]) => checks.length > 0 && <section key={result} className={`compliance-group compliance-${result}`}><h6>{COMPLIANCE_LABELS[result]}</h6>{checks.map((check, index) => <article key={`${check.ruleId}-${index}`}><strong>{check.title}</strong>{check.measuredValue !== null && check.measuredValue !== undefined && <div>Medido/calculado: <b>{Number(check.measuredValue).toLocaleString('es-AR', { maximumFractionDigits: 2 })} {check.unit}</b></div>}{check.requiredValue !== null && check.requiredValue !== undefined && <div>Exigido: <b>{check.requiredValue} {check.unit}</b></div>}{check.occupancy && <small className="d-block">Origen: {check.occupancy.occupancySource === 'manual' ? 'declaración manual' : check.occupancy.occupancySource === 'calculated' ? 'cálculo por superficie' : 'sin determinar'}{check.occupancy.calculatedOccupancy !== null ? ` · cálculo: ${check.occupancy.calculatedOccupancy.toLocaleString('es-AR', { maximumFractionDigits: 2 })} personas` : ''}</small>}<p>{check.observations}</p><small>{check.source} · {check.sourceSection}</small>{check.evidence?.length > 0 && <details><summary>Evidencia ({check.evidence.length})</summary><ul>{check.evidence.map((item, evidenceIndex) => {
          const target = evidenceSelection(item);
          const available = target?.id ? Boolean(resolveEntity(state.document, target)) : false;
          return <li key={`${item.type}-${item.id || evidenceIndex}`}><b>{item.label || item.type}</b><small>{Object.entries(item.fields || {}).filter(([, value]) => value !== null && value !== undefined).map(([key, value]) => `${key}: ${value}`).join(' · ')}</small>{target && available && <button type="button" className="evidence-focus-button" onClick={() => focusEntity(target.type, target.id)}>{target.label}</button>}{target && !available && <small className="evidence-unavailable">{target.type === 'element' ? 'Elemento no disponible en la versión actual del plano.' : 'Evidencia no disponible en la versión actual del plano.'}</small>}</li>;
        })}</ul></details>}<small className="d-block mt-1">{check.recommendedAction}</small></article>)}</section>)}
        {analysis.recommendations.length > 0 && <section><h6>Recomendaciones</h6><ul>{analysis.recommendations.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
        {analysis.criticalWarnings.length > 0 && <section className="compliance-critical"><h6>Advertencias críticas</h6><ul>{analysis.criticalWarnings.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
        <div className="professional-review"><i className="bi bi-person-check" /> Requiere revisión profesional</div>
      </>}
    </div>}
  </aside>;
};

export default RegulatoryReviewPanel;
