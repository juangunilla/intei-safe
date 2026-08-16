import { getSymbolList } from '../symbols/symbolRegistry.jsx';
import { useEditor } from '../store/EditorContext';
import MeasurementPanel from './MeasurementPanel';

const EditorSidebar = () => {
  const { state, setSelectedSymbol, addLayer, updateLayer, removeLayer, reorderLayer, setActiveLayer } = useEditor();
  const layers = [...state.document.layers].sort((a, b) => b.order - a.order);
  return <aside className="editor-sidebar">
    <section>
      <div className="sidebar-title">Símbolos</div>
      <div className="symbol-grid">
        {getSymbolList().map((symbol) => <button key={symbol.id} draggable
          className={`symbol-card ${state.selectedSymbolId === symbol.id ? 'active' : ''}`}
          aria-pressed={state.selectedSymbolId === symbol.id}
          onClick={() => setSelectedSymbol(symbol.id)} onDragStart={(e) => e.dataTransfer.setData('application/x-inteli-symbol', symbol.id)}>
          <i className={`bi ${symbol.icon}`} /><span>{symbol.label}</span>
        </button>)}
      </div>
      <small className="text-muted">Seleccioná un símbolo y hacé clic en el plano.</small>
    </section>
    <section className="layers-section">
      <div className="sidebar-title d-flex justify-content-between align-items-center">Capas
        <button className="btn btn-sm btn-primary" aria-label="Agregar capa" onClick={() => addLayer()}><i className="bi bi-plus-lg" /></button>
      </div>
      {layers.map((layer) => <div key={layer.id} className={`layer-row ${state.document.activeLayerId === layer.id ? 'active' : ''}`} onClick={() => setActiveLayer(layer.id)}>
        <button aria-label={`${layer.visible ? 'Ocultar' : 'Mostrar'} ${layer.name}`} onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}><i className={`bi ${layer.visible ? 'bi-eye' : 'bi-eye-slash'}`} /></button>
        <input aria-label={`Nombre de capa ${layer.name}`} value={layer.name} onClick={(e) => e.stopPropagation()} onChange={(e) => updateLayer(layer.id, { name: e.target.value })} />
        <button aria-label={`${layer.locked ? 'Desbloquear' : 'Bloquear'} ${layer.name}`} onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}><i className={`bi ${layer.locked ? 'bi-lock-fill' : 'bi-unlock'}`} /></button>
        <button title="Subir" onClick={(e) => { e.stopPropagation(); reorderLayer(layer.id, 'up'); }}><i className="bi bi-chevron-up" /></button>
        <button title="Eliminar" aria-label={`Eliminar ${layer.name}`} onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}><i className="bi bi-x-lg" /></button>
      </div>)}
    </section>
    <MeasurementPanel />
  </aside>;
};
export default EditorSidebar;
