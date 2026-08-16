import { useEffect, useMemo, useRef, useState } from 'react';
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import { useEditor } from '../store/EditorContext';
import { TOOLS } from '../types';
import CanvasElement from './CanvasElement';
import { calibrateScale, formatRealDistance, measureDistance } from '../measurement/scale';
import { createAreaMeasurement, createLinearMeasurement } from '../measurement/measurementModel';
import { useAuth } from '../../context/AuthContext';
import { calculateFocusViewport, isSelectionClearKey, resolveEntity } from '../selection/entityFocus';
import { simulationFrame } from '../simulation/simulationPlayback';
import { utilizationOverlay } from '../simulation/simulationWorkspaceModel';

const GRID_SIZE = 40;

const EditorCanvas = () => {
  const wrapperRef = useRef(null);
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const panStartRef = useRef(null);
  const spacePressedRef = useRef(false);
  const [size, setSize] = useState({ width: 900, height: 650 });
  const [measurementPoints, setMeasurementPoints] = useState([]);
  const [measurement, setMeasurement] = useState(null);
  const { user } = useAuth();
  const { state, selectElements, clearGeometricSelection, updateElement, setViewport, setScale, addMeasurement, appendAuditEntry, addSymbolAt, addArrowAt, addTextAt, undo, redo, deleteSelected, registerCanvasExporter } = useEditor();
  const { document, selectedIds, geometricSelection, activeTool, selectedSymbolId } = state;
  const { viewport } = document;

  useEffect(() => { setMeasurementPoints([]); setMeasurement(null); }, [activeTool]);

  const focusedEntity = useMemo(() => resolveEntity(document, geometricSelection), [document.elements, document.measurements, document.sectors, geometricSelection]);
  const activeSimulationFrame = useMemo(() => simulationFrame(state.simulationPlayback.simulation, state.simulationPlayback.elapsedSeconds), [state.simulationPlayback.simulation, state.simulationPlayback.elapsedSeconds]);
  const simulationOverlay = useMemo(() => utilizationOverlay(state.simulationPlayback.simulation), [state.simulationPlayback.simulation]);
  const simulationRouteIndex = useMemo(() => new Map((state.simulationPlayback.simulation?.routes || []).map((route) => [route.routeId, route])), [state.simulationPlayback.simulation]);
  const documentElementIndex = useMemo(() => new Map(document.elements.map((element) => [element.id, element])), [document.elements]);
  const simulationView = state.simulationViewOptions;

  useEffect(() => {
    if (!focusedEntity?.bounds) return;
    const next = calculateFocusViewport({ bounds: focusedEntity.bounds, viewport, canvasSize: size });
    if (next.scale !== viewport.scale || next.x !== viewport.x || next.y !== viewport.y) setViewport(next);
  }, [geometricSelection, focusedEntity, size.width, size.height]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;
    transformer.nodes(selectedIds.map((id) => stage.findOne(`#${id}`)).filter(Boolean));
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, document.elements]);

  useEffect(() => {
    registerCanvasExporter(() => {
      const stage = stageRef.current;
      const transformer = transformerRef.current;
      if (!stage) return null;
      const selectedNodes = transformer?.nodes() || [];
      transformer?.nodes([]); transformer?.getLayer()?.draw();
      const image = document.elements.find((element) => element.type === 'planImage');
      let options = { pixelRatio: 2, mimeType: 'image/png' };
      if (image) {
        const padding = 24;
        options = { ...options,
          x: viewport.x + image.x * viewport.scale - padding,
          y: viewport.y + image.y * viewport.scale - padding,
          width: image.width * Math.abs(image.scaleX || 1) * viewport.scale + padding * 2,
          height: image.height * Math.abs(image.scaleY || 1) * viewport.scale + padding * 2,
        };
      }
      const dataUrl = stage.toDataURL(options);
      transformer?.nodes(selectedNodes); transformer?.getLayer()?.draw();
      return dataUrl;
    });
    return () => registerCanvasExporter(null);
  }, [document.elements, viewport, registerCanvasExporter]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.code === 'Space') spacePressedRef.current = true;
      const editingText = ['INPUT', 'TEXTAREA'].includes(globalThis.document.activeElement?.tagName);
      if (editingText) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault(); redo();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault(); deleteSelected();
      } else if (isSelectionClearKey(event)) {
        clearGeometricSelection();
      }
    };
    const handleKeyUp = (event) => { if (event.code === 'Space') spacePressedRef.current = false; };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKeyUp); };
  }, [undo, redo, deleteSelected, clearGeometricSelection]);

  const pointerInDocument = () => {
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return null;
    return { x: (pointer.x - viewport.x) / viewport.scale, y: (pointer.y - viewport.y) / viewport.scale };
  };

  const handleWheel = (event) => {
    event.evt.preventDefault();
    const pointer = stageRef.current.getPointerPosition();
    const oldScale = viewport.scale;
    const point = { x: (pointer.x - viewport.x) / oldScale, y: (pointer.y - viewport.y) / oldScale };
    const nextScale = Math.max(0.2, Math.min(4, oldScale * (event.evt.deltaY > 0 ? 0.9 : 1.1)));
    setViewport({ scale: nextScale, x: pointer.x - point.x * nextScale, y: pointer.y - point.y * nextScale });
  };

  const handlePointerDown = (event) => {
    const emptyCanvas = event.target === event.target.getStage() || event.target.name() === 'canvas-background';
    if (activeTool === TOOLS.PAN || event.evt.button === 1 || spacePressedRef.current) {
      panStartRef.current = { pointer: stageRef.current.getPointerPosition(), viewport: { ...viewport } };
      return;
    }
    const point = pointerInDocument();
    if (!point) return;
    if (activeTool === TOOLS.MEASURE_AREA) {
      if (measurement && measurement.type === 'area') { setMeasurementPoints([point]); setMeasurement(null); return; }
      const closeThreshold = 12 / viewport.scale;
      if (measurementPoints.length >= 3 && Math.hypot(point.x - measurementPoints[0].x, point.y - measurementPoints[0].y) <= closeThreshold) {
        try {
          setMeasurement(createAreaMeasurement({ points: measurementPoints, scale: document.scale, createdBy: user?.name || user?.email || '' }));
        } catch (error) { window.alert(error.message); }
        return;
      }
      setMeasurementPoints((current) => [...current, point]);
      setMeasurement(null);
      return;
    }
    if ([TOOLS.CALIBRATE, TOOLS.MEASURE, TOOLS.MEASURE_WIDTH].includes(activeTool)) {
      if (!measurementPoints.length) {
        setMeasurementPoints([point]); setMeasurement(null); return;
      }
      const pointA = measurementPoints[0];
      setMeasurementPoints([pointA, point]);
      if (activeTool === TOOLS.CALIBRATE) {
        const input = window.prompt('Distancia real entre los puntos, en metros (ejemplo: 8.40)');
        if (input === null) { setMeasurementPoints([]); return; }
        try {
          const scale = calibrateScale({ pointA, pointB: point, distanceMeters: String(input).replace(',', '.'), calibratedBy: user?.name || user?.email || '' });
          setScale(scale);
          appendAuditEntry({ type: 'scale_calibration', scale });
          setMeasurement(measureDistance(pointA, point, scale));
        } catch (error) { window.alert(error.message); setMeasurementPoints([]); }
      } else {
        const type = activeTool === TOOLS.MEASURE_WIDTH ? 'width' : 'distance';
        setMeasurement(createLinearMeasurement({ type, points: [pointA, point], scale: document.scale, createdBy: user?.name || user?.email || '' }));
      }
      return;
    }
    if (!emptyCanvas) return;
    if (activeTool === TOOLS.SYMBOL) addSymbolAt(selectedSymbolId, point.x - 20, point.y - 20);
    else if (activeTool === TOOLS.ARROW) addArrowAt(point.x, point.y);
    else if (activeTool === TOOLS.TEXT) addTextAt(point.x, point.y);
    else { selectElements([]); clearGeometricSelection(); }
  };

  const handlePointerMove = () => {
    if (!panStartRef.current) return;
    const pointer = stageRef.current.getPointerPosition();
    const start = panStartRef.current;
    setViewport({ x: start.viewport.x + pointer.x - start.pointer.x, y: start.viewport.y + pointer.y - start.pointer.y });
  };

  const selectElement = (id, additive) => {
    if (activeTool !== TOOLS.SELECT) return;
    if (additive) {
      selectElements(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
    } else selectElements([id]);
  };

  const layers = useMemo(() => [...document.layers].sort((a, b) => a.order - b.order), [document.layers]);
  const elementsByLayer = useMemo(() => document.elements.reduce((groups, element) => {
    if (!groups.has(element.layerId)) groups.set(element.layerId, []);
    groups.get(element.layerId).push(element);
    return groups;
  }, new Map()), [document.elements]);
  const gridLines = useMemo(() => {
    const lines = [];
    for (let x = -2000; x <= 4000; x += GRID_SIZE) lines.push(<Line key={`x${x}`} points={[x, -2000, x, 4000]} stroke="#e7ebf0" strokeWidth={1} listening={false} />);
    for (let y = -2000; y <= 4000; y += GRID_SIZE) lines.push(<Line key={`y${y}`} points={[-2000, y, 4000, y]} stroke="#e7ebf0" strokeWidth={1} listening={false} />);
    return lines;
  }, []);
  const pointArray = (points) => points.flatMap((point) => [point.x, point.y]);
  const measurementText = (item) => {
    if (item.type === 'area') return item.squareMeters === null
      ? `${item.pixels.toFixed(1)} px² · Calibrá el plano para obtener una superficie real.`
      : `${item.squareMeters.toLocaleString('es-AR', { maximumFractionDigits: 2 })} m² · ${item.pixels.toFixed(1)} px²`;
    const result = { pixels: item.pixels, meters: item.meters, centimeters: item.meters === null ? null : item.meters * 100, verifiable: item.meters !== null };
    if (item.type === 'width' && !result.verifiable) return `No se puede medir un ancho real hasta calibrar el plano. · ${item.pixels.toFixed(1)} px`;
    return `${formatRealDistance(result)} · ${item.pixels.toFixed(1)} px`;
  };

  return (
    <div ref={wrapperRef} className={`editor-canvas tool-${activeTool}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const symbolId = event.dataTransfer.getData('application/x-inteli-symbol');
        const rect = wrapperRef.current.getBoundingClientRect();
        if (symbolId) addSymbolAt(symbolId, (event.clientX - rect.left - viewport.x) / viewport.scale - 20, (event.clientY - rect.top - viewport.y) / viewport.scale - 20);
      }}>
      <Stage ref={stageRef} width={size.width} height={size.height} onWheel={handleWheel}
        onMouseDown={handlePointerDown} onTouchStart={handlePointerDown}
        onMouseMove={handlePointerMove} onTouchMove={handlePointerMove}
        onMouseUp={() => { panStartRef.current = null; }} onTouchEnd={() => { panStartRef.current = null; }}>
        <Layer x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
          <Rect name="canvas-background" x={-2000} y={-2000} width={6000} height={6000} fill="#f9fafb" />
          {gridLines}
          {layers.map((layer) => layer.visible && (elementsByLayer.get(layer.id) || []).filter((element) => simulationView.showRoutes || !element.routeId).map((element) => (
            <CanvasElement key={element.id} element={element} isSelected={selectedIds.includes(element.id)}
              layerLocked={layer.locked} onSelect={selectElement} onChange={updateElement} />
          )))}
          {simulationView.showSectors && (document.sectors || []).map((sector) => {
            const focused = geometricSelection?.type === 'sector' && geometricSelection.id === sector.id;
            const center = sector.polygon.reduce((result, point) => ({ x: result.x + point.x / sector.polygon.length, y: result.y + point.y / sector.polygon.length }), { x: 0, y: 0 });
            return <Group key={sector.id} listening={false}><Line points={pointArray(sector.polygon)} closed stroke={focused ? '#2563eb' : '#7c3aed'} strokeWidth={(focused ? 5 : 2) / viewport.scale} shadowColor={focused ? '#60a5fa' : undefined} shadowBlur={focused ? 14 / viewport.scale : 0} dash={[6 / viewport.scale, 4 / viewport.scale]} fill={focused ? 'rgba(37,99,235,.14)' : 'rgba(124,58,237,.06)'} />{focused && <Text x={center.x} y={center.y} text={`${sector.name} · ${sector.type}${sector.areaSquareMeters !== null ? ` · ${sector.areaSquareMeters.toFixed(2)} m²` : ''}`} fontSize={13 / viewport.scale} fill="#1d4ed8" />}</Group>;
          })}
          {(document.measurements || []).filter((item) => item.visible !== false || (geometricSelection?.type === 'measurement' && geometricSelection.id === item.id)).map((item) => {
            const center = item.points.reduce((result, point) => ({ x: result.x + point.x / item.points.length, y: result.y + point.y / item.points.length }), { x: 0, y: 0 });
            const focused = geometricSelection?.type === 'measurement' && geometricSelection.id === item.id;
            return <Group key={item.id} listening={false} opacity={item.visible === false && !focused ? 0 : 1}><Line points={pointArray(item.points)} closed={item.type === 'area'} stroke={focused ? '#2563eb' : item.type === 'width' ? '#d97706' : '#0f766e'} strokeWidth={(focused ? 5 : 2) / viewport.scale} shadowColor={focused ? '#60a5fa' : undefined} shadowBlur={focused ? 14 / viewport.scale : 0} fill={item.type === 'area' ? focused ? 'rgba(37,99,235,.14)' : 'rgba(15,118,110,.08)' : undefined} /><Text x={center.x} y={center.y - 20 / viewport.scale} text={`${item.label ? `${item.label}: ` : ''}${measurementText(item)}`} fontSize={(focused ? 14 : 12) / viewport.scale} fill={focused ? '#1d4ed8' : '#0f4f49'} /></Group>;
          })}
          {geometricSelection?.type === 'route' && focusedEntity?.entity && <Arrow x={focusedEntity.entity.x} y={focusedEntity.entity.y} rotation={focusedEntity.entity.rotation} scaleX={focusedEntity.entity.scaleX} scaleY={focusedEntity.entity.scaleY} points={focusedEntity.entity.points} stroke="#2563eb" fill="#2563eb" strokeWidth={6 / viewport.scale} pointerLength={focusedEntity.entity.pointerLength} pointerWidth={focusedEntity.entity.pointerWidth} opacity={.7} shadowColor="#60a5fa" shadowBlur={16 / viewport.scale} listening={false} />}
          {geometricSelection?.type === 'element' && focusedEntity?.bounds && <Rect x={focusedEntity.bounds.x - 8 / viewport.scale} y={focusedEntity.bounds.y - 8 / viewport.scale} width={focusedEntity.bounds.width + 16 / viewport.scale} height={focusedEntity.bounds.height + 16 / viewport.scale} stroke="#2563eb" strokeWidth={3 / viewport.scale} cornerRadius={6 / viewport.scale} shadowColor="#60a5fa" shadowBlur={14 / viewport.scale} listening={false} />}
          {simulationView.showHeatmap && simulationOverlay.routes.map((usage) => { const route = simulationRouteIndex.get(usage.id); return route ? <Line key={`heat-${usage.id}`} points={route.points.flatMap(({ x, y }) => [x, y])} stroke={`rgba(220,38,38,${.2 + usage.intensity * .65})`} strokeWidth={(5 + usage.intensity * 12) / viewport.scale} lineCap="round" listening={false} /> : null; })}
          {simulationView.showResults && simulationOverlay.exits.map((usage) => { const exit = documentElementIndex.get(usage.id); return exit ? <Circle key={`exit-use-${usage.id}`} x={exit.x + 24} y={exit.y + 24} radius={(12 + usage.intensity * 14) / viewport.scale} stroke="#7c3aed" strokeWidth={3 / viewport.scale} opacity={.7} listening={false} /> : null; })}
          {simulationView.showAgents && activeSimulationFrame.agents.filter(({ position, visualStatus }) => position && visualStatus !== 'evacuated').map((agent) => <Group key={agent.id} listening={false}><Circle x={agent.position.x} y={agent.position.y} radius={5 / viewport.scale} fill={agent.visualStatus === 'blocked' ? '#dc2626' : agent.visualStatus === 'queued' ? '#7c3aed' : agent.visualStatus === 'waiting' ? '#f59e0b' : '#2563eb'} stroke="#ffffff" strokeWidth={1.5 / viewport.scale} shadowColor="#0f172a" shadowBlur={4 / viewport.scale} />{simulationView.showNames && <Text x={agent.position.x + 7 / viewport.scale} y={agent.position.y - 7 / viewport.scale} text={agent.id.split('-agent-').at(-1)} fontSize={9 / viewport.scale} fill="#0f172a" />}</Group>)}
          {measurementPoints.length > 0 && <Circle x={measurementPoints[0].x} y={measurementPoints[0].y} radius={5 / viewport.scale} fill="#2563eb" listening={false} />}
          {measurementPoints.length > 1 && <>
            <Line points={pointArray(measurementPoints)} closed={Boolean(measurement?.type === 'area')} stroke="#2563eb" strokeWidth={2 / viewport.scale} dash={[8 / viewport.scale, 5 / viewport.scale]} fill={measurement?.type === 'area' ? 'rgba(37,99,235,.08)' : undefined} listening={false} />
            {measurementPoints.slice(1).map((item, index) => <Circle key={index} x={item.x} y={item.y} radius={4 / viewport.scale} fill="#2563eb" listening={false} />)}
            {measurement && <Text x={measurementPoints.reduce((sum, item) => sum + item.x, 0) / measurementPoints.length} y={measurementPoints.reduce((sum, item) => sum + item.y, 0) / measurementPoints.length - 24 / viewport.scale} text={measurementText(measurement)} fontSize={14 / viewport.scale} fill="#173b70" listening={false} />}
          </>}
          <Transformer ref={transformerRef} rotateEnabled enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            boundBoxFunc={(oldBox, newBox) => Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8 ? oldBox : newBox} />
        </Layer>
      </Stage>
      {measurement && activeTool !== TOOLS.CALIBRATE && <div className="measurement-draft-actions"><strong>{measurement.type === 'width' ? 'Ancho' : measurement.type === 'area' ? 'Superficie' : 'Distancia'}: {measurementText(measurement)}</strong><button className="btn btn-sm btn-primary" onClick={() => { addMeasurement(measurement); setMeasurement(null); setMeasurementPoints([]); }}>Guardar medición</button><button className="btn btn-sm btn-light" onClick={() => { setMeasurement(null); setMeasurementPoints([]); }}>Descartar</button></div>}
      <div className="canvas-hint">{activeTool === TOOLS.CALIBRATE ? 'Seleccioná dos puntos e indicá la distancia real.' : activeTool === TOOLS.MEASURE ? 'Seleccioná dos puntos para medir.' : activeTool === TOOLS.MEASURE_WIDTH ? 'Seleccioná dos puntos perpendiculares al ancho.' : activeTool === TOOLS.MEASURE_AREA ? 'Marcá al menos tres vértices y cerrá haciendo clic en el primero.' : 'Rueda: zoom · Herramienta mano: pan · Shift: selección múltiple'}</div>
    </div>
  );
};

export default EditorCanvas;
