import { useMemo } from 'react';
import { useEditor } from '../store/EditorContext';
import { buildTechnicalInspection, confidenceLabel } from '../inspection/technicalInspection.js';

const STATUS = {
  success: { label: 'Correcto', icon: 'bi-check-circle-fill' },
  warning: { label: 'Revisar', icon: 'bi-exclamation-triangle-fill' },
  danger: { label: 'Crítico', icon: 'bi-x-octagon-fill' },
  unknown: { label: 'No detectado', icon: 'bi-question-circle-fill' },
};

const TechnicalCategory = ({ category }) => {
  const status = STATUS[category.status];
  return <details className={`technical-check status-${category.status}`}>
    <summary>
      <i className={`bi ${status.icon}`} aria-hidden="true" />
      <span className="technical-check-title"><strong>{category.label}</strong><small>{category.description}</small></span>
      <span className="technical-check-metrics"><b>{category.count}</b><small>{confidenceLabel(category.confidence)}</small></span>
      <i className="bi bi-chevron-down technical-chevron" aria-hidden="true" />
    </summary>
    <div className="technical-check-detail">
      <div className="technical-state"><span>Estado</span><strong>{status.label}</strong></div>
      <div className="technical-state"><span>Confianza</span><strong>{confidenceLabel(category.confidence)}</strong></div>
      {category.details.length > 0 ? <ul>{category.details.map((item) => <li key={item.id}>
        <div><strong>{item.label}</strong><small>{item.description}</small></div>
        <span>{confidenceLabel(item.confidence)}</span>
      </li>)}</ul> : <p>No hay elementos para mostrar en esta categoría.</p>}
    </div>
  </details>;
};

const ResultList = ({ title, items, emptyMessage, tone }) => <details className={`technical-result-list ${tone}`}>
  <summary><span>{title}</span><strong>{items.length}</strong><i className="bi bi-chevron-down" aria-hidden="true" /></summary>
  {items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{emptyMessage}</p>}
</details>;

const AIInspectorPanel = () => {
  const { state } = useEditor();
  const inspection = useMemo(() => buildTechnicalInspection(state.document.buildingAnalysis), [state.document.buildingAnalysis]);
  const confidence = inspection?.confidence;
  const confidenceStatus = !Number.isFinite(confidence) ? 'unknown' : confidence >= .75 ? 'success' : confidence >= .5 ? 'warning' : 'danger';

  return <aside className="ai-inspector technical-inspector" aria-label="Inspector técnico de inteligencia artificial">
    <div className="inspector-heading">
      <span><i className="bi bi-stars" aria-hidden="true" /> INSPECTOR IA</span>
      <small>Diagnóstico técnico del plano</small>
    </div>

    {!inspection && <div className="inspector-empty">
      <i className="bi bi-file-earmark-image" aria-hidden="true" />
      <p>Presioná “Analizar con IA” para generar el diagnóstico técnico.</p>
    </div>}

    {inspection && <>
      <section className={`technical-confidence status-${confidenceStatus}`} aria-label="Nivel de confianza general">
        <div><span>Nivel de confianza</span><strong>{confidenceLabel(confidence)}</strong></div>
        <div className="progress" role="progressbar" aria-valuenow={Math.round((confidence || 0) * 100)} aria-valuemin="0" aria-valuemax="100">
          <div className="progress-bar" style={{ width: `${Math.round((confidence || 0) * 100)}%` }} />
        </div>
        <small>Promedio de las detecciones que informaron confianza.</small>
      </section>

      <section aria-labelledby="technical-detections-title">
        <div id="technical-detections-title" className="inspector-section-title">Inspección técnica</div>
        <div className="technical-checks">{inspection.categories.map((category) => <TechnicalCategory key={category.key} category={category} />)}</div>
      </section>

      <section aria-label="Resultado del análisis">
        <ResultList title="Detectado correctamente" items={inspection.detectedCorrectly} emptyMessage="No hay detecciones con confianza suficiente." tone="success" />
        <ResultList title="No pudo detectar" items={inspection.couldNotDetect} emptyMessage="No se registraron categorías pendientes." tone="warning" />
        <ResultList title="Observaciones" items={inspection.observations} emptyMessage="El análisis no informó observaciones." tone="neutral" />
      </section>

      <details className="analysis-json inspector-json">
        <summary>JSON técnico completo</summary>
        <pre>{JSON.stringify(state.document.buildingAnalysis, null, 2)}</pre>
      </details>
    </>}

    <p className="inspector-disclaimer">El inspector solo interpreta datos. No agrega, mueve ni elimina objetos del plano.</p>
  </aside>;
};

export default AIInspectorPanel;
