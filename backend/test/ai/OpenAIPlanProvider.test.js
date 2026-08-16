const test = require('node:test');
const assert = require('node:assert/strict');
const { OpenAIPlanProvider } = require('../../src/ai');

test('envía el plano al cliente multimodal y normaliza el JSON', async () => {
  let payload;
  const client = { responses: { create: async (request) => {
    payload = request;
    return { output_text: JSON.stringify({ operations: [], explanation: 'ok', metadata: {} }) };
  } } };
  const provider = new OpenAIPlanProvider({ client, model: 'test-model' });
  const result = await provider.generatePlan({
    instruction: 'Analizar',
    document: { elements: [{ type: 'planImage', src: 'data:image/png;base64,AAAA' }] },
    context: {},
  });
  assert.equal(payload.model, 'test-model');
  assert.equal(payload.input[0].content[1].type, 'input_image');
  assert.deepEqual(result.operations, []);
});

test('analiza solamente la estructura del edificio en coordenadas de imagen', async () => {
  let payload;
  const analysis = {
    coordinateSystem: { unit: 'image-pixels', origin: 'top-left', imageWidth: 1200, imageHeight: 800 },
    walls: [], rooms: [], doors: [], windows: [], corridors: [], stairs: [], emergencyExits: [], sectors: [], elevators: [], openAreas: [], hazards: [], warnings: [],
  };
  const client = { responses: { create: async (request) => {
    payload = request;
    return { output_text: JSON.stringify(analysis) };
  } } };
  const provider = new OpenAIPlanProvider({ client, model: 'vision-model' });
  const result = await provider.analyzeBuilding({
    document: { elements: [{ type: 'planImage', src: 'data:image/png;base64,AAAA', width: 1200, height: 800 }] },
    context: {},
  });
  assert.equal(payload.input[0].content[1].detail, 'high');
  assert.match(payload.input[0].content[0].text, /json/);
  assert.equal(payload.text.format.type, 'json_object');
  assert.equal(result.coordinateSystem.imageWidth, 1200);
  assert.deepEqual(result.hazards, []);
  assert.deepEqual(result.emergencyExits, []);
  assert.deepEqual(result.sectors, []);
});
