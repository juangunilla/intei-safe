const test = require('node:test');
const assert = require('node:assert/strict');
const { AIPlanService, AIPlanValidationError } = require('../../src/ai');

test('delega en un proveedor inyectado y devuelve operaciones neutrales', async () => {
  const provider = {
    async generatePlan(request) {
      assert.equal(request.instruction, 'Agregar una luminaria');
      return { operations: [{ action: 'add', element: { type: 'symbol', symbolId: 'lamp', x: 20, y: 30 } }] };
    },
  };
  const service = new AIPlanService({ provider });
  const result = await service.generatePlan({ instruction: '  Agregar una luminaria  ' });
  assert.equal(result.operations[0].element.symbolId, 'lamp');
});

test('rechaza solicitudes inválidas antes de invocar al proveedor', async () => {
  const service = new AIPlanService({ provider: { generatePlan: async () => ({ operations: [] }) } });
  await assert.rejects(() => service.generatePlan({ instruction: '' }), AIPlanValidationError);
});

test('normaliza el análisis arquitectónico con todas las colecciones', async () => {
  const provider = {
    generatePlan: async () => ({ operations: [] }),
    analyzeBuilding: async () => ({ walls: [{ id: 'wall-1' }], rooms: [{ id: 'room-1' }], hazards: [{ id: 'hazard-1', type: 'electrical' }] }),
  };
  const service = new AIPlanService({ provider });
  const result = await service.analyzeBuilding({
    document: { elements: [{ type: 'planImage', src: 'data:image/png;base64,AAAA', width: 100, height: 100 }] },
  });
  assert.equal(result.walls.length, 1);
  assert.equal(result.rooms.length, 1);
  assert.deepEqual(result.doors, []);
  assert.deepEqual(result.openAreas, []);
  assert.deepEqual(result.hazards, [{ id: 'hazard-1', type: 'electrical' }]);
  assert.deepEqual(result.emergencyExits, []);
  assert.deepEqual(result.sectors, []);
});

test('genera un plan editable completo a partir del análisis', async () => {
  const provider = {
    analyzeBuilding: async () => ({}),
    generatePlan: async () => ({
      operations: [
        { action: 'add', element: { type: 'symbol', symbolId: 'emergencyExit', x: 10, y: 20, confidence: .9, source: 'buildingAnalysis.emergencyExits', status: 'proposed', justification: 'Salida visible' } },
        { action: 'add', element: { type: 'symbol', symbolId: 'extinguisher', x: 30, y: 40, confidence: .7, source: 'buildingAnalysis', status: 'proposed', justification: 'Sector accesible visible' } },
        { action: 'add', element: { type: 'arrow', x: 10, y: 10, points: [0, 0, 100, 20], confidence: .8, source: 'buildingAnalysis.corridors', status: 'proposed', justification: 'Pasillo continuo hacia salida' } },
      ],
      metadata: { requiresProfessionalReview: true },
    }),
  };
  const service = new AIPlanService({ provider });
  const result = await service.generateEvacuationPlan({
    document: {
      buildingAnalysis: { walls: [], rooms: [] },
      elements: [{ type: 'planImage', src: 'data:image/png;base64,AAAA', width: 100, height: 100 }],
    },
    context: { availableSymbols: [{ id: 'emergencyExit' }, { id: 'extinguisher' }] },
  });
  assert.equal(result.operations.length, 3);
  assert.equal(result.metadata.requiresProfessionalReview, true);
});

test('admite una respuesta sin coordenadas cuando la ubicación no es verificable', async () => {
  const provider = {
    analyzeBuilding: async () => ({}),
    generatePlan: async () => ({
      operations: [],
      notVerifiable: [{ status: 'not_verifiable', reason: 'No existe información suficiente para determinar una ubicación segura.' }],
    }),
  };
  const service = new AIPlanService({ provider });
  const result = await service.generateEvacuationPlan({
    document: { buildingAnalysis: {}, elements: [{ type: 'planImage', src: 'data:image/png;base64,AAAA', width: 100, height: 100 }] },
    context: { availableSymbols: [{ id: 'emergencyExit' }] },
  });
  assert.equal(result.operations.length, 0);
  assert.equal(result.notVerifiable[0].status, 'not_verifiable');
});

test('el corrector agrega y mueve sólo objetos automáticos intactos', async () => {
  const provider = {
    analyzeBuilding: async () => ({}),
    generatePlan: async () => ({ operations: [
      { action: 'update', elementId: 'ai-1', patch: { x: 80, y: 90 } },
      { action: 'add', element: { type: 'symbol', symbolId: 'alarm', x: 20, y: 30 } },
    ] }),
  };
  const service = new AIPlanService({ provider });
  const result = await service.correctEvacuationPlan({
    document: { buildingAnalysis: {}, elements: [
      { type: 'planImage', src: 'data:image/png;base64,AAAA', width: 100, height: 100 },
      { id: 'ai-1', type: 'symbol', symbolId: 'alarm', aiGenerated: true, userModified: false },
      { id: 'manual-1', type: 'symbol', symbolId: 'alarm', userModified: true },
    ] },
    context: { availableSymbols: [{ id: 'alarm' }] },
  });
  assert.equal(result.operations.length, 2);
});

test('el corrector rechaza cambios sobre objetos modificados por el usuario', async () => {
  const provider = {
    analyzeBuilding: async () => ({}),
    generatePlan: async () => ({ operations: [{ action: 'update', elementId: 'protected-1', patch: { x: 10 } }] }),
  };
  const service = new AIPlanService({ provider });
  await assert.rejects(() => service.correctEvacuationPlan({
    document: { buildingAnalysis: {}, elements: [
      { type: 'planImage', src: 'data:image/png;base64,AAAA', width: 100, height: 100 },
      { id: 'protected-1', type: 'symbol', aiGenerated: true, userModified: true },
    ] },
    context: { availableSymbols: [{ id: 'alarm' }] },
  }), AIPlanValidationError);
});
