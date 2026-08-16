import { useEditor } from '../store/EditorContext';
import { sectorFromMeasurement, SECTOR_TYPES } from '../measurement/measurementModel';

const typeLabels = { distance: 'Distancia', width: 'Ancho', area: 'Superficie' };

const MeasurementPanel = () => {
  const { state, updateMeasurement, removeMeasurement, addSector, updateSector, removeSector, setMeasurementAssociation } = useEditor();
  const measurements = state.document.measurements || [];
  const sectors = state.document.sectors || [];
  const candidates = [
    ...(state.document.elements || []).map((element) => ({ id: element.id, label: element.symbolId || element.type })),
    ...['doors', 'corridors', 'emergencyExits', 'stairs', 'sectors'].flatMap((collection) => (state.document.buildingAnalysis?.[collection] || []).map((element) => ({ id: element.id, label: `${collection}: ${element.label || element.id}` }))),
  ].filter((item) => item.id);

  const convertToSector = (measurement) => {
    const name = window.prompt('Nombre del sector', measurement.label || 'Sector');
    if (name === null) return;
    const requestedType = window.prompt(`Tipo (${SECTOR_TYPES.join(', ')})`, 'oficina');
    if (requestedType === null) return;
    try { addSector(sectorFromMeasurement({ measurement, name, type: requestedType.trim().toLowerCase() })); }
    catch (error) { window.alert(error.message); }
  };

  return <section className="measurement-panel">
    <div className="sidebar-title">Mediciones guardadas</div>
    {!measurements.length && <small className="text-muted">Todavía no hay mediciones guardadas.</small>}
    {measurements.map((measurement) => <article key={measurement.id} className="measurement-row">
      <div><strong>{typeLabels[measurement.type]}</strong><small>{measurement.type === 'area' ? `${measurement.pixels.toFixed(1)} px²` : `${measurement.pixels.toFixed(1)} px`}</small></div>
      <input key={`${measurement.id}-${measurement.label}`} aria-label={`Etiqueta de ${typeLabels[measurement.type]}`} placeholder="Etiqueta" defaultValue={measurement.label} onBlur={(event) => { if (event.target.value !== measurement.label) updateMeasurement(measurement.id, { label: event.target.value }); }} />
      {measurement.type === 'width' && <select aria-label="Asociar ancho a elemento" value={measurement.elementId || ''} onChange={(event) => {
        const elementId = event.target.value || null;
        setMeasurementAssociation({ elementId, widthMeasurementId: measurement.id });
      }}><option value="">Sin asociar</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select>}
      <div className="measurement-row-actions">
        <button title={measurement.visible === false ? 'Mostrar' : 'Ocultar'} onClick={() => updateMeasurement(measurement.id, { visible: measurement.visible === false })}><i className={`bi ${measurement.visible === false ? 'bi-eye' : 'bi-eye-slash'}`} /></button>
        {measurement.type === 'area' && !sectors.some((sector) => sector.sourceMeasurementId === measurement.id) && <button title="Convertir en sector" onClick={() => convertToSector(measurement)}><i className="bi bi-bounding-box" /></button>}
        <button title="Eliminar medición" onClick={() => removeMeasurement(measurement.id)}><i className="bi bi-trash" /></button>
      </div>
    </article>)}
    {sectors.length > 0 && <><div className="sidebar-title mt-3">Sectores</div>{sectors.map((sector) => <div key={sector.id} className="sector-row"><span><strong>{sector.name}</strong><small>{sector.type}{sector.areaSquareMeters !== null ? ` · ${sector.areaSquareMeters.toFixed(2)} m²` : ''}</small><label className="d-block mt-1"><small>Ocupación manual</small><input type="number" min="0" step="1" value={sector.occupancy ?? ''} placeholder="Sin declarar" onChange={(event) => {
      const occupancy = event.target.value === '' ? null : Number(event.target.value);
      updateSector(sector.id, { occupancy, occupancySource: occupancy === null ? null : 'manual' });
    }} /></label></span><button title="Eliminar sector" onClick={() => removeSector(sector.id)}><i className="bi bi-x-lg" /></button></div>)}</>}
  </section>;
};

export default MeasurementPanel;
