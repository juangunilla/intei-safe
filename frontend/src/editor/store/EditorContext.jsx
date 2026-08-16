import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { registerEditorBridge, unregisterEditorBridge } from '../ai/editorApi';
import { calculateEvacuationRoutes } from '../routing/evacuationRouteEngine';
import {
  createArrowElement,
  createSymbolElement,
  createTextElement,
  createPlanImageElement,
  createId,
  ELEMENT_TYPES,
  TOOLS,
} from '../types';
import {
  buildDocumentExport,
  editorReducer,
  initialEditorState,
} from './editorReducer';
import { getAdvisorAnalysisStatus } from '../advisor/advisorEngine';

const EditorContext = createContext(null);

export const EditorProvider = ({ children }) => {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  const canvasExporterRef = useRef(null);
  const advisorStatus = useMemo(() => getAdvisorAnalysisStatus(state.document), [
    state.document.version,
    state.document.establishmentProfile,
    state.document.scale,
    state.document.measurements,
    state.document.sectors,
    state.document.elements,
    state.document.simulations,
    state.document.regulatoryAnalysis,
    state.document.buildingAnalysis,
    state.document.advisorAnalysis,
  ]);
  const routingInputSignature = useMemo(() => JSON.stringify({
    revision: state.routingRevision,
    analysis: state.document.buildingAnalysis,
    elements: state.document.elements.filter((element) => !element.generatedRoute).map((element) => {
      if (element.type === 'planImage') return { id: element.id, type: element.type, x: element.x, y: element.y, scaleX: element.scaleX, scaleY: element.scaleY, rotation: element.rotation };
      if (['emergencyExit', 'electricalHazard', 'gasShutoff'].includes(element.symbolId) || element.isObstacle) return element;
      return { id: element.id, type: element.type, symbolId: element.symbolId };
    }),
  }), [state.routingRevision, state.document.buildingAnalysis, state.document.elements]);

  useEffect(() => {
    if (!state.routingEnabled || !state.document.buildingAnalysis) return;
    const routeLayer = state.document.layers.find((layer) => layer.name === 'Plan de evacuación IA');
    if (!routeLayer) return;
    const routes = calculateEvacuationRoutes(state.document).map((route) => ({ ...route, layerId: routeLayer.id }));
    dispatch({ type: 'REPLACE_GENERATED_ROUTES', payload: routes });
  // La firma excluye las rutas derivadas para evitar recalcularse a sí misma.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routingInputSignature, state.document.layers, state.routingEnabled]);

  useEffect(() => {
    if (state.document.advisorAnalysis?.status !== 'stale' && advisorStatus === 'stale') {
      dispatch({ type: 'MARK_ADVISOR_STALE' });
    }
  }, [advisorStatus, state.document.advisorAnalysis?.status]);

  const getActiveLayerId = useCallback(
    () => state.document.activeLayerId || state.document.layers[0]?.id,
    [state.document.activeLayerId, state.document.layers]
  );

  const insertElement = useCallback(
    (element) => {
      const layerId = element.layerId || getActiveLayerId();
      dispatch({ type: 'ADD_ELEMENT', payload: { ...element, layerId } });
      return element.id;
    },
    [getActiveLayerId]
  );

  const insertElements = useCallback(
    (elements) => {
      const layerId = getActiveLayerId();
      const normalized = elements.map((el) => ({ ...el, layerId: el.layerId || layerId }));
      dispatch({ type: 'ADD_ELEMENTS', payload: normalized });
      return normalized.map((el) => el.id);
    },
    [getActiveLayerId]
  );

  const updateElement = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id, patch } });
  }, []);

  const updateElements = useCallback((patches) => {
    dispatch({ type: 'UPDATE_ELEMENTS', payload: patches });
  }, []);

  const removeElements = useCallback((ids) => {
    dispatch({ type: 'REMOVE_ELEMENTS', payload: ids });
  }, []);

  const applyOperations = useCallback((operations) => {
    dispatch({ type: 'APPLY_OPERATIONS', payload: operations });
    dispatch({ type: 'SELECT_ELEMENTS', payload: [] });
  }, []);

  const acceptProposalOperations = useCallback((operations, name = 'Propuesta IA aceptada') => {
    const layerId = createId();
    dispatch({ type: 'ACCEPT_PROPOSAL', payload: { operations, name, layerId } });
    dispatch({ type: 'SELECT_ELEMENTS', payload: [] });
    return layerId;
  }, []);

  const selectElements = useCallback((ids) => {
    dispatch({ type: 'SELECT_ELEMENTS', payload: ids });
  }, []);

  const focusEntity = useCallback((type, id) => {
    dispatch({ type: 'SET_GEOMETRIC_SELECTION', payload: id ? { type, id } : null });
  }, []);

  const clearGeometricSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_GEOMETRIC_SELECTION' });
  }, []);

  const setTool = useCallback((tool) => {
    dispatch({ type: 'SET_TOOL', payload: tool });
  }, []);

  const setSelectedSymbol = useCallback((symbolId) => {
    dispatch({ type: 'SET_SELECTED_SYMBOL', payload: symbolId });
    dispatch({ type: 'SET_TOOL', payload: TOOLS.SYMBOL });
  }, []);

  const setViewport = useCallback((viewport) => {
    dispatch({ type: 'SET_VIEWPORT', payload: viewport });
  }, []);

  const zoom = useCallback((delta, pointer) => {
    const { scale, x, y } = state.document.viewport;
    const newScale = Math.min(5, Math.max(0.1, scale + delta));
    if (!pointer) {
      dispatch({ type: 'SET_VIEWPORT', payload: { scale: newScale } });
      return;
    }
    const mousePointTo = {
      x: (pointer.x - x) / scale,
      y: (pointer.y - y) / scale,
    };
    dispatch({
      type: 'SET_VIEWPORT',
      payload: {
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      },
    });
  }, [state.document.viewport]);

  const addLayer = useCallback((name) => {
    const id = createId();
    dispatch({ type: 'ADD_LAYER', payload: { name, id } });
    return id;
  }, []);

  const updateLayer = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_LAYER', payload: { id, patch } });
  }, []);

  const removeLayer = useCallback((id) => {
    dispatch({ type: 'REMOVE_LAYER', payload: id });
  }, []);

  const reorderLayer = useCallback((layerId, direction) => {
    dispatch({ type: 'REORDER_LAYER', payload: { layerId, direction } });
  }, []);

  const setActiveLayer = useCallback((layerId) => {
    dispatch({ type: 'SET_ACTIVE_LAYER', payload: layerId });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const deleteSelected = useCallback(() => dispatch({ type: 'DELETE_SELECTED' }), []);
  const requestRouteRecalculation = useCallback(() => dispatch({ type: 'REQUEST_ROUTE_RECALCULATION' }), []);
  const registerCanvasExporter = useCallback((exporter) => { canvasExporterRef.current = exporter; }, []);
  const exportCanvasImage = useCallback(() => canvasExporterRef.current?.() || null, []);

  const exportDocument = useCallback(() => buildDocumentExport(state.document), [state.document]);

  const loadDocument = useCallback((doc) => {
    dispatch({ type: 'LOAD_DOCUMENT', payload: doc });
  }, []);

  const loadProject = useCallback((project) => {
    dispatch({ type: 'LOAD_PROJECT', payload: project });
  }, []);

  const setBuildingAnalysis = useCallback((analysis) => {
    dispatch({ type: 'SET_BUILDING_ANALYSIS', payload: analysis });
  }, []);

  const setEstablishmentProfile = useCallback((profile) => {
    dispatch({ type: 'SET_ESTABLISHMENT_PROFILE', payload: profile });
    dispatch({ type: 'APPEND_AUDIT_ENTRY', payload: { type: 'establishment_profile_update', date: new Date().toISOString(), changedFields: Object.keys(profile || {}), profileCompletenessInput: profile } });
  }, []);

  const setSimulationModelDraft = useCallback((draft) => {
    dispatch({ type: 'SET_SIMULATION_MODEL_DRAFT', payload: draft });
  }, []);

  const incorporateSimulationModel = useCallback((model) => {
    dispatch({ type: 'INCORPORATE_SIMULATION_MODEL', payload: model });
    dispatch({ type: 'APPEND_AUDIT_ENTRY', payload: { type: 'simulation_model_incorporated', date: new Date().toISOString(), draftId: model.draft.id, reviewedBy: model.draft.reviewedBy, sectorIds: model.sectors.map(({ id }) => id), elementIds: model.elements.map(({ id }) => id) } });
  }, []);

  const setRegulatoryAnalysis = useCallback((analysis) => {
    dispatch({ type: 'SET_REGULATORY_ANALYSIS', payload: analysis });
  }, []);

  const setAdvisorAnalysis = useCallback((analysis) => {
    dispatch({ type: 'SET_ADVISOR_ANALYSIS', payload: analysis });
    dispatch({ type: 'APPEND_AUDIT_ENTRY', payload: { type: 'advisor_analysis_generated', date: new Date().toISOString(), advisorEngineVersion: analysis.advisorEngineVersion, advisorNarrativeVersion: analysis.advisorNarrativeVersion, contextFingerprint: analysis.contextFingerprint, observationIds: analysis.observations.map(({ id }) => id), sourceSummary: analysis.sourceSummary } });
  }, []);

  const updateAdvisorObservationStatus = useCallback((id, status) => {
    dispatch({ type: 'UPDATE_ADVISOR_OBSERVATION_STATUS', payload: { id, status } });
    dispatch({ type: 'APPEND_AUDIT_ENTRY', payload: { type: 'advisor_observation_status', date: new Date().toISOString(), observationId: id, status } });
  }, []);

  const setAdvisorNarrative = useCallback((payload, audit) => {
    dispatch({ type: 'SET_ADVISOR_NARRATIVE', payload });
    if (audit) dispatch({ type: 'APPEND_AUDIT_ENTRY', payload: { type: 'advisor_narrative_generated', date: new Date().toISOString(), ...audit } });
  }, []);

  const upsertCorporateTemplate = useCallback((template) => dispatch({ type: 'UPSERT_CORPORATE_TEMPLATE', payload: template }), []);
  const removeCorporateTemplate = useCallback((id) => dispatch({ type: 'REMOVE_CORPORATE_TEMPLATE', payload: id }), []);
  const setSelectedCorporateTemplate = useCallback((id) => dispatch({ type: 'SET_SELECTED_CORPORATE_TEMPLATE', payload: id }), []);
  const upsertCorporateAsset = useCallback((asset) => dispatch({ type: 'UPSERT_CORPORATE_ASSET', payload: asset }), []);
  const removeCorporateAsset = useCallback((id) => dispatch({ type: 'REMOVE_CORPORATE_ASSET', payload: id }), []);

  const setScale = useCallback((scale) => {
    dispatch({ type: 'SET_SCALE', payload: scale });
  }, []);

  const addMeasurement = useCallback((measurement) => {
    dispatch({ type: 'ADD_MEASUREMENT', payload: measurement });
    return measurement.id;
  }, []);

  const updateMeasurement = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_MEASUREMENT', payload: { id, patch } });
  }, []);

  const removeMeasurement = useCallback((id) => {
    dispatch({ type: 'REMOVE_MEASUREMENT', payload: id });
  }, []);

  const addSector = useCallback((sector) => {
    dispatch({ type: 'ADD_SECTOR', payload: sector });
    return sector.id;
  }, []);

  const removeSector = useCallback((id) => {
    dispatch({ type: 'REMOVE_SECTOR', payload: id });
  }, []);

  const updateSector = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_SECTOR', payload: { id, patch } });
  }, []);

  const setMeasurementAssociation = useCallback((association) => {
    dispatch({ type: 'SET_MEASUREMENT_ASSOCIATION', payload: association });
  }, []);

  const appendAuditEntry = useCallback((entry) => {
    dispatch({ type: 'APPEND_AUDIT_ENTRY', payload: { date: new Date().toISOString(), ...entry } });
  }, []);

  const saveSimulation = useCallback((simulation) => {
    dispatch({ type: 'SAVE_SIMULATION', payload: simulation });
    dispatch({ type: 'APPEND_AUDIT_ENTRY', payload: { type: 'evacuation_simulation', date: new Date().toISOString(), simulationId: simulation.id, engineVersion: simulation.engineVersion, results: simulation.results } });
  }, []);

  const setSimulationPlayback = useCallback((patch) => dispatch({ type: 'SET_SIMULATION_PLAYBACK', payload: patch }), []);
  const clearSimulationPlayback = useCallback(() => dispatch({ type: 'CLEAR_SIMULATION_PLAYBACK' }), []);
  const deleteSimulation = useCallback((id) => dispatch({ type: 'DELETE_SIMULATION', payload: id }), []);
  const setSimulationViewOptions = useCallback((patch) => dispatch({ type: 'SET_SIMULATION_VIEW_OPTIONS', payload: patch }), []);

  const addSymbolAt = useCallback(
    (symbolId, x, y, overrides = {}) => {
      const element = createSymbolElement({
        symbolId,
        x,
        y,
        layerId: overrides.layerId || getActiveLayerId(),
        overrides,
      });
      dispatch({ type: 'ADD_ELEMENT', payload: element });
      return element;
    },
    [getActiveLayerId]
  );

  const addArrowAt = useCallback(
    (x, y, overrides = {}) => {
      const element = createArrowElement({
        x,
        y,
        layerId: overrides.layerId || getActiveLayerId(),
        overrides,
      });
      dispatch({ type: 'ADD_ELEMENT', payload: element });
      return element;
    },
    [getActiveLayerId]
  );

  const addTextAt = useCallback(
    (x, y, text = 'Texto', overrides = {}) => {
      const element = createTextElement({
        x,
        y,
        text,
        layerId: overrides.layerId || getActiveLayerId(),
        overrides,
      });
      dispatch({ type: 'ADD_ELEMENT', payload: element });
      return element;
    },
    [getActiveLayerId]
  );

  const addPlanImage = useCallback((image, overrides = {}) => {
    const element = createPlanImageElement({
      ...image,
      x: overrides.x ?? 0,
      y: overrides.y ?? 0,
      layerId: overrides.layerId || getActiveLayerId(),
      overrides,
    });
    dispatch({ type: 'ADD_ELEMENT', payload: element });
    dispatch({ type: 'SELECT_ELEMENTS', payload: [element.id] });
    dispatch({ type: 'SET_TOOL', payload: TOOLS.SELECT });
    return element;
  }, [getActiveLayerId]);

  const replacePlanImage = useCallback((image, overrides = {}) => {
    const current = state.document.elements.find((element) => element.type === ELEMENT_TYPES.PLAN_IMAGE);
    const currentLayer = state.document.layers.find((layer) => layer.id === current?.layerId);
    const activeLayer = state.document.layers.find((layer) => layer.id === state.document.activeLayerId);
    const visibleLayerId = currentLayer && currentLayer.visible !== false ? currentLayer.id
      : activeLayer && activeLayer.visible !== false ? activeLayer.id
        : state.document.layers.find((layer) => layer.visible !== false)?.id || getActiveLayerId();
    const element = createPlanImageElement({
      ...image,
      x: overrides.x ?? current?.x ?? 40,
      y: overrides.y ?? current?.y ?? 40,
      layerId: overrides.layerId || visibleLayerId,
      overrides,
    });
    dispatch({ type: 'REPLACE_PLAN_IMAGE', payload: element });
    dispatch({ type: 'SELECT_ELEMENTS', payload: [element.id] });
    dispatch({ type: 'SET_TOOL', payload: TOOLS.SELECT });
    return element;
  }, [getActiveLayerId, state.document.activeLayerId, state.document.elements, state.document.layers]);

  const api = useMemo(
    () => ({
      state,
      insertElement,
      insertElements,
      updateElement,
      updateElements,
      removeElements,
      applyOperations,
      acceptProposalOperations,
      selectElements,
      focusEntity,
      clearGeometricSelection,
      setTool,
      setSelectedSymbol,
      setViewport,
      zoom,
      addLayer,
      updateLayer,
      removeLayer,
      reorderLayer,
      setActiveLayer,
      undo,
      redo,
      deleteSelected,
      requestRouteRecalculation,
      registerCanvasExporter,
      exportCanvasImage,
      exportDocument,
      loadDocument,
      loadProject,
      setBuildingAnalysis,
      setEstablishmentProfile,
      setSimulationModelDraft,
      incorporateSimulationModel,
      setRegulatoryAnalysis,
      setAdvisorAnalysis,
      updateAdvisorObservationStatus,
      setAdvisorNarrative,
      upsertCorporateTemplate,
      removeCorporateTemplate,
      setSelectedCorporateTemplate,
      upsertCorporateAsset,
      removeCorporateAsset,
      setScale,
      addMeasurement,
      updateMeasurement,
      removeMeasurement,
      addSector,
      updateSector,
      removeSector,
      setMeasurementAssociation,
      appendAuditEntry,
      saveSimulation,
      setSimulationPlayback,
      clearSimulationPlayback,
      deleteSimulation,
      setSimulationViewOptions,
      addSymbolAt,
      addArrowAt,
      addTextAt,
      addPlanImage,
      replacePlanImage,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [
      state,
      insertElement,
      insertElements,
      updateElement,
      updateElements,
      removeElements,
      applyOperations,
      acceptProposalOperations,
      selectElements,
      focusEntity,
      clearGeometricSelection,
      setTool,
      setSelectedSymbol,
      setViewport,
      zoom,
      addLayer,
      updateLayer,
      removeLayer,
      reorderLayer,
      setActiveLayer,
      undo,
      redo,
      deleteSelected,
      requestRouteRecalculation,
      registerCanvasExporter,
      exportCanvasImage,
      exportDocument,
      loadDocument,
      loadProject,
      setBuildingAnalysis,
      setEstablishmentProfile,
      setSimulationModelDraft,
      incorporateSimulationModel,
      setRegulatoryAnalysis,
      setAdvisorAnalysis,
      updateAdvisorObservationStatus,
      setAdvisorNarrative,
      upsertCorporateTemplate,
      removeCorporateTemplate,
      setSelectedCorporateTemplate,
      upsertCorporateAsset,
      removeCorporateAsset,
      setScale,
      addMeasurement,
      updateMeasurement,
      removeMeasurement,
      addSector,
      updateSector,
      removeSector,
      setMeasurementAssociation,
      appendAuditEntry,
      saveSimulation,
      setSimulationPlayback,
      clearSimulationPlayback,
      deleteSimulation,
      setSimulationViewOptions,
      addSymbolAt,
      addArrowAt,
      addTextAt,
      addPlanImage,
      replacePlanImage,
    ]
  );

  useEffect(() => {
    registerEditorBridge({
      insertElement,
      insertElements,
      updateElement,
      removeElements,
      applyOperations,
      exportDocument,
      loadDocument,
      loadProject,
      setBuildingAnalysis,
      setEstablishmentProfile,
      setSimulationModelDraft,
      setRegulatoryAnalysis,
      setScale,
      addMeasurement,
      updateMeasurement,
      removeMeasurement,
      addSector,
      updateSector,
      removeSector,
      setMeasurementAssociation,
      appendAuditEntry,
      addSymbolAt,
      addArrowAt,
      addTextAt,
      addPlanImage,
      getDocument: exportDocument,
      getActiveLayerId,
    });
    return unregisterEditorBridge;
  }, [
    insertElement,
    insertElements,
    updateElement,
    removeElements,
    applyOperations,
    exportDocument,
    loadDocument,
    loadProject,
    setBuildingAnalysis,
    setEstablishmentProfile,
    setSimulationModelDraft,
    setRegulatoryAnalysis,
    setScale,
    addMeasurement,
    updateMeasurement,
    removeMeasurement,
    addSector,
    updateSector,
    removeSector,
    setMeasurementAssociation,
    appendAuditEntry,
    addSymbolAt,
    addArrowAt,
    addTextAt,
    addPlanImage,
    getActiveLayerId,
  ]);

  return <EditorContext.Provider value={api}>{children}</EditorContext.Provider>;
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor debe usarse dentro de EditorProvider');
  return context;
};
