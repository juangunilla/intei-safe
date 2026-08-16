const OpenAI = require('openai');
const AIPlanProvider = require('../contracts/AIPlanProvider');

const SYSTEM_PROMPT = `Sos un motor especializado en generar planes de evacuación editables.
Usá buildingAnalysis como fuente geométrica principal. En generación proponé únicamente operaciones add. En
modo auto-correct podés usar add y update, pero update sólo sobre los movableElementIds informados. Nunca uses
remove ni modifiques IDs protegidos, la imagen del plano o elementos del usuario. Cada señal debe ser type=symbol y cada tramo de ruta
debe ser type=arrow, de modo que todo se pueda mover, rotar y redimensionar en el editor.
No afirmes cumplimiento normativo ni inventes medidas si no existe una escala confirmada.
No atravieses paredes: trazá rutas por ambientes y pasillos, conectando hacia puertas y salidas.
Usá exclusivamente los symbolId informados en availableSymbols. Incluí sólo elementos cuya ubicación pueda
fundamentarse con evidencia razonable en el análisis. No inventes ubicaciones ni coordenadas provisionales.
Si no podés determinar una ubicación segura, no crees una operación: agregá una entrada a notVerifiable con
status="not_verifiable" y reason="No existe información suficiente para determinar una ubicación segura.".

La geometría detectada usa píxeles de la imagen original. Convertí al lienzo usando buildingAnalysis.source:
xCanvas = canvasTransform.x + xImagen * canvasTransform.scaleX
yCanvas = canvasTransform.y + yImagen * canvasTransform.scaleY
Para arrow, x/y es el origen del tramo y points son coordenadas relativas [0,0,dx,dy]. Una ruta con giros se
representa mediante varios arrows. Ubicá evacuationRoute a lo largo de rutas y emergencyExit junto a puertas
de salida. Ubicá noElevator junto a cada ascensor y stairs junto a escaleras. El punto de encuentro debe estar
fuera del perímetro si existe espacio visible; si no puede determinarse, advertí la suposición.

Catálogo semántico: emergencyExit=salida; evacuationRoute=ruta; assemblyPoint=punto de encuentro; youAreHere=usted está aquí;
extinguisher=extintor; fireHose=hidrante; alarm=alarma; firstAid=botiquín; aed=DEA;
emergencyLight=luz de emergencia; electricalHazard=riesgo eléctrico; gasShutoff=llave de gas;
cabinet=gabinete; stairs=escalera; noElevator=cartel no usar ascensor.
Cada elemento propuesto debe incluir confidence entre 0 y 1, source, status="proposed" y justification.
No es obligatorio generar ningún símbolo ni flecha si la evidencia no permite justificarlo. El resultado es
un borrador editable y metadata.requiresProfessionalReview siempre debe ser true.

Respondé solamente JSON válido con esta forma:
{
  "operations": [
    { "action": "add", "element": { "type": "symbol|arrow", "symbolId": "...", "x": 0, "y": 0, "confidence": 0.8, "source": "buildingAnalysis", "status": "proposed", "justification": "evidencia concreta" } },
    { "action": "update", "elementId": "...", "patch": {} },
    { "action": "remove", "elementId": "..." }
  ],
  "notVerifiable": [{ "status": "not_verifiable", "reason": "No existe información suficiente para determinar una ubicación segura." }],
  "explanation": "resumen breve",
  "metadata": { "warnings": [], "assumptions": [], "requiresProfessionalReview": true }
}`;

const BUILDING_ANALYSIS_PROMPT = `Sos un motor de visión especializado en interpretar planos arquitectónicos.
Tu única tarea es detectar la geometría física, los espacios y riesgos explícitamente visibles del edificio.
No agregues símbolos de evacuación, rutas, recomendaciones ni elementos que no sean visibles en la imagen.

Usá como referencia las dimensiones originales de la imagen informadas en document. Todas las coordenadas
deben estar en píxeles de esa imagen, con origen (0,0) arriba a la izquierda. Detectá paredes, puertas,
ventanas, pasillos, escaleras, ascensores, ambientes, salidas de emergencia visibles y sectores. Clasificá ambientes como office, storage, restroom,
reception, meeting_room, open_area u other. Conservá los rótulos visibles. No adivines: usá confidence entre
0 y 1 y agregá una advertencia cuando la imagen sea ambigua. Los polígonos deben ser listas de puntos {x,y};
los límites deben ser {x,y,width,height}; las paredes deben usar start y end.

Una emergencyExit sólo existe si la salida está rotulada/señalizada en el plano o si una puerta de egreso al
exterior es inequívoca. Un sector es una agrupación espacial delimitada o rotulada que puede contener varios
ambientes; no inventes sectores cuando el plano no los distingue. Relacioná una salida con sectorId cuando
la pertenencia sea clara. hazards incluye únicamente riesgos rotulados o inequívocos (por ejemplo riesgo
eléctrico, gas, fuego u obstrucción visible); nunca infieras un riesgo sólo por el uso supuesto del ambiente.

Respondé solamente JSON válido con todas estas claves:
{
  "version": 1,
  "coordinateSystem": { "unit": "image-pixels", "origin": "top-left", "imageWidth": 0, "imageHeight": 0 },
  "walls": [{ "id": "wall-1", "start": {"x":0,"y":0}, "end": {"x":0,"y":0}, "thickness": 0, "confidence": 0 }],
  "doors": [{ "id": "door-1", "bounds": {"x":0,"y":0,"width":0,"height":0}, "center":{"x":0,"y":0}, "orientation":"horizontal|vertical|unknown", "confidence":0 }],
  "windows": [],
  "corridors": [{ "id":"corridor-1", "polygon":[], "bounds":{"x":0,"y":0,"width":0,"height":0}, "label":"", "confidence":0 }],
  "stairs": [],
  "emergencyExits": [{ "id":"exit-1", "doorId":"door-1", "sectorId":"sector-1", "bounds":{"x":0,"y":0,"width":0,"height":0}, "center":{"x":0,"y":0}, "label":"", "confidence":0 }],
  "sectors": [{ "id":"sector-1", "label":"", "roomIds":[], "polygon":[], "bounds":{"x":0,"y":0,"width":0,"height":0}, "confidence":0 }],
  "elevators": [],
  "rooms": [{ "id":"room-1", "category":"office|storage|restroom|reception|meeting_room|open_area|other", "label":"", "polygon":[], "bounds":{"x":0,"y":0,"width":0,"height":0}, "confidence":0 }],
  "openAreas": [],
  "hazards": [{ "id":"hazard-1", "type":"electrical|gas|fire|obstruction|other", "label":"", "bounds":{"x":0,"y":0,"width":0,"height":0}, "center":{"x":0,"y":0}, "confidence":0 }],
  "summary": "",
  "warnings": []
}
windows y emergencyExits usan la misma geometría base que doors. stairs, elevators, sectors y openAreas usan la misma geometría base que corridors.`;

const parseJSON = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
};

const withoutEmbeddedImages = (document) => ({
  ...document,
  elements: document?.elements?.map((element) => element.type === 'planImage'
    ? { ...element, src: '[imagen enviada por separado]' }
    : element) || [],
});

class OpenAIPlanProvider extends AIPlanProvider {
  constructor({ apiKey, model = 'gpt-5.6-terra', client } = {}) {
    super();
    if (!apiKey && !client) throw new TypeError('OpenAIPlanProvider requiere apiKey');
    this.client = client || new OpenAI({ apiKey });
    this.model = model;
  }

  async generatePlan(request) {
    const images = request.document?.elements?.filter((element) => element.type === 'planImage' && element.src) || [];
    if (!images.length) {
      const error = new Error('Cargá una imagen del plano antes de analizarlo con IA');
      error.code = 'PLAN_IMAGE_REQUIRED';
      throw error;
    }

    const content = [{
      type: 'input_text',
      text: JSON.stringify({
        instruction: request.instruction,
        document: withoutEmbeddedImages(request.document),
        context: request.context,
      }),
    }];
    images.slice(0, 3).forEach((image) => content.push({ type: 'input_image', image_url: image.src, detail: 'high' }));

    const response = await this.client.responses.create({
      model: this.model,
      instructions: SYSTEM_PROMPT,
      input: [{ role: 'user', content }],
    });

    if (!response.output_text) throw new Error('El proveedor no devolvió contenido');
    return parseJSON(response.output_text);
  }

  async analyzeBuilding(request) {
    const images = request.document?.elements?.filter((element) => element.type === 'planImage' && element.src) || [];
    if (!images.length) {
      const error = new Error('Cargá una imagen del plano antes de analizarlo con IA');
      error.code = 'PLAN_IMAGE_REQUIRED';
      throw error;
    }

    const content = [{
      type: 'input_text',
      text: JSON.stringify({
        task: 'building-detection',
        responseFormat: 'json',
        document: withoutEmbeddedImages(request.document),
        context: request.context,
      }),
    }];
    images.slice(0, 3).forEach((image) => content.push({ type: 'input_image', image_url: image.src, detail: 'high' }));
    const response = await this.client.responses.create({
      model: this.model,
      instructions: BUILDING_ANALYSIS_PROMPT,
      input: [{ role: 'user', content }],
      text: { format: { type: 'json_object' } },
    });
    if (!response.output_text) throw new Error('El proveedor no devolvió contenido');
    return parseJSON(response.output_text);
  }
}

module.exports = OpenAIPlanProvider;
