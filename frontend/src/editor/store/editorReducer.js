import {
  createDefaultDocument,
  createId,
  createLayer,
  normalizeElement,
  normalizeEditorDocument,
} from '../types.js';
import { measureArea } from '../measurement/measurementModel.js';
import { measureDistance } from '../measurement/scale.js';

const MAX_HISTORY = 50;

const cloneDocument = (doc) => JSON.parse(JSON.stringify(doc));

export const initialEditorState = {
  document: createDefaultDocument(),
  selectedIds: [],
  geometricSelection: null,
  activeTool: 'select',
  selectedSymbolId: 'emergencyExit',
  past: [],
  future: [],
  routingRevision: 0,
  routingEnabled: false,
  simulationPlayback: { simulation: null, elapsedSeconds: 0, playing: false, playbackRate: 1 },
  simulationViewOptions: { showAgents: true, showRoutes: true, showSectors: true, showNames: false, showResults: true, showHeatmap: false },
};

const pushHistory = (state, nextDocument) => {
  const past = [...state.past, cloneDocument(state.document)].slice(-MAX_HISTORY);
  return { past, future: [] };
};

const applyDocumentChange = (state, updater) => {
  const nextDocument = typeof updater === 'function' ? updater(cloneDocument(state.document)) : updater;
  const history = pushHistory(state, nextDocument);
  return {
    ...state,
    document: nextDocument,
    ...history,
  };
};

const recalculateMeasurement = (measurement, scale) => {
  if (measurement.type === 'area') {
    const result = measureArea(measurement.points, scale);
    return { ...measurement, pixels: result.pixels, squareMeters: result.squareMeters };
  }
  const result = measureDistance(measurement.points[0], measurement.points[1], scale);
  return { ...measurement, pixels: result.pixels, meters: result.meters };
};

export const editorReducer = (state, action) => {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, activeTool: action.payload };

    case 'REQUEST_ROUTE_RECALCULATION':
      return { ...state, routingEnabled: true, routingRevision: state.routingRevision + 1 };

    case 'SET_SELECTED_SYMBOL':
      return { ...state, selectedSymbolId: action.payload };

    case 'SELECT_ELEMENTS':
      return { ...state, selectedIds: action.payload, geometricSelection: action.payload.length === 1 ? { type: 'element', id: action.payload[0] } : null };

    case 'SET_GEOMETRIC_SELECTION':
      return { ...state, geometricSelection: action.payload || null };

    case 'CLEAR_GEOMETRIC_SELECTION':
      return { ...state, geometricSelection: null };

    case 'SAVE_SIMULATION':
      return applyDocumentChange(state, (doc) => ({ ...doc, simulations: [...(doc.simulations || []).filter(({ id }) => id !== action.payload.id), action.payload] }));

    case 'DELETE_SIMULATION':
      return applyDocumentChange(state, (doc) => ({ ...doc, simulations: (doc.simulations || []).filter(({ id }) => id !== action.payload) }));

    case 'SET_SIMULATION_PLAYBACK':
      return { ...state, simulationPlayback: { ...state.simulationPlayback, ...action.payload } };

    case 'CLEAR_SIMULATION_PLAYBACK':
      return { ...state, simulationPlayback: { simulation: null, elapsedSeconds: 0, playing: false, playbackRate: 1 } };

    case 'SET_SIMULATION_VIEW_OPTIONS':
      return { ...state, simulationViewOptions: { ...state.simulationViewOptions, ...action.payload } };

    case 'SET_ACTIVE_LAYER':
      return {
        ...state,
        document: { ...state.document, activeLayerId: action.payload },
      };

    case 'SET_VIEWPORT':
      return {
        ...state,
        document: {
          ...state.document,
          viewport: { ...state.document.viewport, ...action.payload },
        },
      };

    case 'SET_BUILDING_ANALYSIS':
      return {
        ...applyDocumentChange(state, (doc) => ({
          ...doc,
          buildingAnalysis: action.payload,
          simulationModelDraft: null,
        })),
        routingEnabled: false,
      };

    case 'SET_ESTABLISHMENT_PROFILE':
      return applyDocumentChange(state, (doc) => ({ ...doc, establishmentProfile: action.payload, regulatoryAnalysis: null }));

    case 'SET_SIMULATION_MODEL_DRAFT':
      return applyDocumentChange(state, (doc) => ({ ...doc, simulationModelDraft: action.payload }));

    case 'INCORPORATE_SIMULATION_MODEL':
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        layers: [...doc.layers.filter((layer) => layer.name !== 'Modelo de simulación confirmado'), action.payload.layer],
        activeLayerId: action.payload.layer.id,
        sectors: [...(doc.sectors || []).filter((sector) => !sector.simulationModelGenerated), ...action.payload.sectors],
        elements: [...doc.elements.filter((element) => !element.simulationModelGenerated), ...action.payload.elements.map(normalizeElement)],
        simulationModelDraft: action.payload.draft,
        simulations: [],
        regulatoryAnalysis: null,
      }));

    case 'SET_REGULATORY_ANALYSIS':
      return applyDocumentChange(state, (doc) => ({ ...doc, regulatoryAnalysis: action.payload }));

    case 'SET_ADVISOR_ANALYSIS':
      return applyDocumentChange(state, (doc) => ({ ...doc, advisorAnalysis: action.payload }));

    case 'MARK_ADVISOR_STALE':
      if (!state.document.advisorAnalysis || state.document.advisorAnalysis.status === 'stale') return state;
      return { ...state, document: { ...state.document, advisorAnalysis: { ...state.document.advisorAnalysis, status: 'stale' } } };

    case 'UPDATE_ADVISOR_OBSERVATION_STATUS':
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        advisorAnalysis: doc.advisorAnalysis ? { ...doc.advisorAnalysis, observations: doc.advisorAnalysis.observations.map((item) => item.id === action.payload.id ? { ...item, status: action.payload.status } : item) } : null,
      }));

    case 'SET_ADVISOR_NARRATIVE':
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        advisorAnalysis: doc.advisorAnalysis ? { ...doc.advisorAnalysis, ...action.payload } : null,
      }));

    case 'UPSERT_CORPORATE_TEMPLATE':
      return applyDocumentChange(state, (doc) => ({ ...doc, corporateTemplates: [...(doc.corporateTemplates || []).filter(({ id }) => id !== action.payload.id), action.payload], selectedCorporateTemplateId: doc.selectedCorporateTemplateId || action.payload.id }));

    case 'REMOVE_CORPORATE_TEMPLATE':
      return applyDocumentChange(state, (doc) => { const templates = (doc.corporateTemplates || []).filter(({ id }) => id !== action.payload); return { ...doc, corporateTemplates: templates, selectedCorporateTemplateId: doc.selectedCorporateTemplateId === action.payload ? templates[0]?.id || null : doc.selectedCorporateTemplateId }; });

    case 'SET_SELECTED_CORPORATE_TEMPLATE':
      return applyDocumentChange(state, (doc) => ({ ...doc, selectedCorporateTemplateId: (doc.corporateTemplates || []).some(({ id }) => id === action.payload) ? action.payload : null }));

    case 'UPSERT_CORPORATE_ASSET':
      return applyDocumentChange(state, (doc) => ({ ...doc, corporateAssets: { ...(doc.corporateAssets || {}), [action.payload.id]: action.payload } }));

    case 'REMOVE_CORPORATE_ASSET':
      return applyDocumentChange(state, (doc) => ({ ...doc, corporateAssets: Object.fromEntries(Object.entries(doc.corporateAssets || {}).filter(([id]) => id !== action.payload)), corporateTemplates: (doc.corporateTemplates || []).map((template) => ({ ...template, ...(template.logoAssetId === action.payload ? { logoAssetId: null } : {}), ...(template.signatureAssetId === action.payload ? { signatureAssetId: null } : {}), ...(template.stampAssetId === action.payload ? { stampAssetId: null } : {}) })) }));

    case 'SET_SCALE':
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        scale: action.payload,
        measurements: (doc.measurements || []).map((measurement) => recalculateMeasurement(measurement, action.payload)),
        sectors: (doc.sectors || []).map((sector) => {
          const measurement = (doc.measurements || []).find((item) => item.id === sector.sourceMeasurementId);
          return measurement ? { ...sector, areaSquareMeters: measureArea(measurement.points, action.payload).squareMeters } : sector;
        }),
        regulatoryAnalysis: null,
      }));

    case 'ADD_MEASUREMENT':
      return applyDocumentChange(state, (doc) => ({ ...doc, measurements: [...(doc.measurements || []), action.payload], regulatoryAnalysis: null }));

    case 'UPDATE_MEASUREMENT':
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        measurements: (doc.measurements || []).map((measurement) => measurement.id === action.payload.id
          ? { ...measurement, ...action.payload.patch, userModified: true }
          : measurement),
        regulatoryAnalysis: null,
      }));

    case 'REMOVE_MEASUREMENT':
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        measurements: (doc.measurements || []).filter((measurement) => measurement.id !== action.payload),
        sectors: (doc.sectors || []).filter((sector) => sector.sourceMeasurementId !== action.payload),
        measurementAssociations: (doc.measurementAssociations || []).filter((association) => association.widthMeasurementId !== action.payload),
        regulatoryAnalysis: null,
      }));

    case 'ADD_SECTOR':
      return applyDocumentChange(state, (doc) => ({ ...doc, sectors: [...(doc.sectors || []), action.payload], regulatoryAnalysis: null }));

    case 'UPDATE_SECTOR':
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        sectors: (doc.sectors || []).map((sector) => sector.id === action.payload.id
          ? { ...sector, ...action.payload.patch }
          : sector),
        regulatoryAnalysis: null,
      }));

    case 'REMOVE_SECTOR':
      return applyDocumentChange(state, (doc) => ({ ...doc, sectors: (doc.sectors || []).filter((sector) => sector.id !== action.payload), regulatoryAnalysis: null }));

    case 'SET_MEASUREMENT_ASSOCIATION':
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        measurements: (doc.measurements || []).map((measurement) => measurement.id === action.payload.widthMeasurementId ? { ...measurement, elementId: action.payload.elementId, userModified: true } : measurement),
        measurementAssociations: [
          ...(doc.measurementAssociations || []).filter((association) => association.elementId !== action.payload.elementId && association.widthMeasurementId !== action.payload.widthMeasurementId),
          ...(action.payload.elementId ? [action.payload] : []),
        ],
        regulatoryAnalysis: null,
      }));

    case 'APPEND_AUDIT_ENTRY':
      return {
        ...state,
        document: { ...state.document, auditTrail: [...(state.document.auditTrail || []), action.payload] },
      };

    case 'REPLACE_GENERATED_ROUTES':
      {
        const protectedRoutes = state.document.elements.filter((element) => element.generatedRoute && element.userModified);
      return {
        ...state,
        document: {
          ...state.document,
          elements: [
            ...state.document.elements.filter((element) => !element.generatedRoute),
            ...protectedRoutes,
            ...action.payload.map(normalizeElement),
          ],
        },
        selectedIds: state.selectedIds.filter((id) => state.document.elements.some((element) => element.id === id && !element.generatedRoute)),
      };
      }

    case 'ADD_ELEMENT':
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        elements: [...doc.elements, normalizeElement(action.payload)],
      }));

    case 'REPLACE_PLAN_IMAGE':
      return applyDocumentChange(state, (doc) => {
        const replacing = doc.elements.some((element) => element.type === 'planImage');
        return {
          ...doc,
          elements: [...doc.elements.filter((element) => element.type !== 'planImage'), normalizeElement(action.payload)],
          scale: replacing
            ? { calibrated: false, invalidatedAt: new Date().toISOString(), invalidationReason: 'El plano base fue reemplazado.' }
            : doc.scale,
          regulatoryAnalysis: replacing ? null : doc.regulatoryAnalysis,
          auditTrail: [...(doc.auditTrail || []), {
            type: replacing ? 'plan_image_replaced' : 'plan_image_added',
            elementId: action.payload.id,
            date: new Date().toISOString(),
          }],
        };
      });

    case 'ADD_ELEMENTS':
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        elements: [...doc.elements, ...action.payload.map(normalizeElement)],
      }));

    case 'UPDATE_ELEMENT': {
      const { id, patch } = action.payload;
      return applyDocumentChange(state, (doc) => {
        const invalidatesScale = doc.elements.some((element) => element.id === id && element.type === 'planImage')
          && ['scaleX', 'scaleY', 'rotation'].some((key) => patch[key] !== undefined);
        return {
          ...doc,
          elements: doc.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
          scale: invalidatesScale ? { calibrated: false, invalidatedAt: new Date().toISOString(), invalidationReason: 'La transformación geométrica del plano cambió después de calibrar.' } : doc.scale,
          measurements: invalidatesScale ? (doc.measurements || []).map((measurement) => ({ ...measurement, meters: null, squareMeters: null })) : (doc.measurements || []),
          sectors: invalidatesScale ? (doc.sectors || []).map((sector) => ({ ...sector, areaSquareMeters: null })) : (doc.sectors || []),
          regulatoryAnalysis: invalidatesScale ? null : doc.regulatoryAnalysis,
          auditTrail: patch.userModified ? [...(doc.auditTrail || []), { type: 'manual_element_modification', elementId: id, patch, date: new Date().toISOString() }] : (doc.auditTrail || []),
        };
      });
    }

    case 'UPDATE_ELEMENTS': {
      const patches = action.payload;
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        elements: doc.elements.map((el) => {
          const patch = patches[el.id];
          return patch ? { ...el, ...patch } : el;
        }),
      }));
    }

    case 'REMOVE_ELEMENTS':
      return {
        ...applyDocumentChange(state, (doc) => ({
        ...doc,
        elements: doc.elements.filter((el) => !action.payload.includes(el.id)),
        activeLayerId: doc.activeLayerId,
        })),
        selectedIds: state.selectedIds.filter((id) => !action.payload.includes(id)),
      };

    case 'APPLY_OPERATIONS':
      return applyDocumentChange(state, (doc) => {
        let elements = [...doc.elements];
        action.payload.forEach((operation) => {
          if (operation.action === 'add' && operation.element) {
            elements.push(normalizeElement({
              ...operation.element,
              layerId: operation.element.layerId || doc.activeLayerId || doc.layers[0]?.id,
            }));
          } else if (operation.action === 'update' && operation.elementId && operation.patch) {
            elements = elements.map((element) => element.id === operation.elementId ? { ...element, ...operation.patch } : element);
          } else if (operation.action === 'remove' && operation.elementId) {
            elements = elements.filter((element) => element.id !== operation.elementId);
          }
        });
        return { ...doc, elements };
      });

    case 'ACCEPT_PROPOSAL':
      return applyDocumentChange(state, (doc) => {
        const layer = createLayer(action.payload.name || 'Propuesta IA aceptada', doc.layers.length);
        layer.id = action.payload.layerId;
        const elements = action.payload.operations.filter((operation) => operation.action === 'add' && operation.element).map((operation) => normalizeElement({
          ...operation.element,
          layerId: layer.id,
        }));
        return { ...doc, layers: [...doc.layers, layer], activeLayerId: layer.id, elements: [...doc.elements, ...elements] };
      });

    case 'ADD_LAYER':
      return applyDocumentChange(state, (doc) => {
        const layer = createLayer(action.payload?.name || `Capa ${doc.layers.length + 1}`, doc.layers.length);
        if (action.payload?.id) layer.id = action.payload.id;
        return {
          ...doc,
          layers: [...doc.layers, layer],
          activeLayerId: layer.id,
        };
      });

    case 'UPDATE_LAYER': {
      const { id, patch } = action.payload;
      return applyDocumentChange(state, (doc) => ({
        ...doc,
        layers: doc.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
      }));
    }

    case 'REMOVE_LAYER': {
      const layerId = action.payload;
      if (state.document.layers.length <= 1) return state;
      return applyDocumentChange(state, (doc) => {
        const layers = doc.layers.filter((l) => l.id !== layerId);
        const fallbackLayer = layers[0];
        return {
          ...doc,
          layers,
          elements: doc.elements.filter((el) => el.layerId !== layerId),
          activeLayerId: doc.activeLayerId === layerId ? fallbackLayer.id : doc.activeLayerId,
        };
      });
    }

    case 'REORDER_LAYER': {
      const { layerId, direction } = action.payload;
      return applyDocumentChange(state, (doc) => {
        const layers = [...doc.layers].sort((a, b) => a.order - b.order);
        const index = layers.findIndex((l) => l.id === layerId);
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= layers.length) return doc;
        [layers[index], layers[targetIndex]] = [layers[targetIndex], layers[index]];
        return {
          ...doc,
          layers: layers.map((layer, i) => ({ ...layer, order: i })),
        };
      });
    }

    case 'LOAD_DOCUMENT':
      return {
        ...state,
        document: normalizeEditorDocument(action.payload),
        selectedIds: [],
        past: [],
        future: [],
        routingEnabled: false,
        simulationPlayback: { simulation: null, elapsedSeconds: 0, playing: false, playbackRate: 1 },
      };

    case 'LOAD_PROJECT':
      return {
        ...state,
        document: normalizeEditorDocument(action.payload.document),
        selectedIds: [],
        past: (action.payload.past || []).map(normalizeEditorDocument),
        future: (action.payload.future || []).map(normalizeEditorDocument),
        routingEnabled: false,
        simulationPlayback: { simulation: null, elapsedSeconds: 0, playing: false, playbackRate: 1 },
      };

    case 'UNDO': {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        document: normalizeEditorDocument(previous),
        past: state.past.slice(0, -1),
        future: [cloneDocument(state.document), ...state.future].slice(0, MAX_HISTORY),
        selectedIds: [],
      };
    }

    case 'REDO': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        ...state,
        document: normalizeEditorDocument(next),
        future: state.future.slice(1),
        past: [...state.past, cloneDocument(state.document)].slice(-MAX_HISTORY),
        selectedIds: [],
      };
    }

    case 'DELETE_SELECTED':
      return {
        ...applyDocumentChange(state, (doc) => ({
          ...doc,
          elements: doc.elements.filter((el) => !state.selectedIds.includes(el.id)),
        })),
        selectedIds: [],
      };

    default:
      return state;
  }
};

export const buildDocumentExport = (document) => ({
  version: document.version,
  schemaVersion: document.schemaVersion,
  layers: document.layers,
  elements: document.elements,
  viewport: document.viewport,
  buildingAnalysis: document.buildingAnalysis || null,
  establishmentProfile: document.establishmentProfile || null,
  regulatoryAnalysis: document.regulatoryAnalysis || null,
  advisorAnalysis: document.advisorAnalysis || null,
  auditTrail: document.auditTrail || [],
  scale: document.scale || { calibrated: false },
  measurements: document.measurements || [],
  sectors: document.sectors || [],
  measurementAssociations: document.measurementAssociations || [],
  simulations: document.simulations || [],
  simulationModelDraft: document.simulationModelDraft || null,
  corporateTemplates: document.corporateTemplates || [],
  selectedCorporateTemplateId: document.selectedCorporateTemplateId || null,
  corporateAssets: document.corporateAssets || {},
});
