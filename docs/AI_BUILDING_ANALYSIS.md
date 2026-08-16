# Motor de análisis arquitectónico con IA

## Alcance

El botón **Analizar con IA** interpreta la imagen del plano y crea un modelo interno estructurado. Este módulo no dibuja geometría, símbolos ni rutas y no genera un plan de evacuación.

## Flujo extremo a extremo

1. El usuario carga una imagen PNG, JPG o WEBP de hasta 15 MB.
2. El frontend exporta el documento actual y localiza el elemento `planImage`.
3. `POST /api/ai/plans/analyze-building` recibe el documento, contexto y `requestId`.
4. El backend valida autenticación, rate limit, tipo de imagen, dimensiones y cantidad máxima de imágenes.
5. `AIPlanService` delega la detección multimodal en `OpenAIPlanProvider`.
6. El proveedor recibe la imagen separada del JSON para evitar duplicarla en el texto del prompt.
7. La respuesta JSON se parsea, valida y normaliza. Todas las colecciones del contrato quedan presentes aunque estén vacías.
8. El servicio agrega el sistema de coordenadas y la transformación de la imagen fuente.
9. El frontend guarda el resultado en `document.buildingAnalysis` mediante `SET_BUILDING_ANALYSIS`.
10. El Inspector IA muestra conteos, resumen, advertencias y el JSON completo.

Guardar el análisis desactiva `routingEnabled`. Por lo tanto, este flujo nunca crea ni recalcula elementos del canvas.

## Contrato JSON

```json
{
  "version": 1,
  "coordinateSystem": {
    "unit": "image-pixels",
    "origin": "top-left",
    "imageWidth": 1600,
    "imageHeight": 900
  },
  "walls": [],
  "rooms": [],
  "doors": [],
  "windows": [],
  "corridors": [],
  "stairs": [],
  "emergencyExits": [],
  "sectors": [],
  "elevators": [],
  "openAreas": [],
  "hazards": [],
  "summary": "",
  "warnings": [],
  "source": {
    "imageElementId": "uuid",
    "fileName": "plano.png",
    "canvasTransform": {
      "x": 40,
      "y": 40,
      "scaleX": 0.75,
      "scaleY": 0.75,
      "rotation": 0
    }
  }
}
```

Las colecciones principales son:

- `walls`: segmentos de muro con inicio, fin, espesor y confianza.
- `rooms`: ambientes con categoría, rótulo, polígono, límites y confianza.
- `doors` y `windows`: aberturas con límites, centro, orientación y confianza.
- `corridors`: pasillos con polígono, límites, rótulo y confianza.
- `stairs`: escaleras visibles con geometría espacial.
- `emergencyExits`: salidas rotuladas/señalizadas o egresos exteriores inequívocos. Pueden referenciar `doorId`.
- `sectors`: agrupaciones delimitadas o rotuladas de ambientes. No se inventan si el plano no las distingue.

`elevators` y `openAreas` se conservan como información arquitectónica complementaria. `hazards` contiene exclusivamente riesgos rotulados o inequívocamente visibles; no incluye inferencias basadas en el supuesto uso de un ambiente.

## Inspector técnico

El Inspector IA deriva una vista técnica del modelo sin modificarlo:

- estado por categoría: `Correcto`, `Revisar`, `Crítico` o `No detectado`;
- color semántico verde, ámbar, rojo o gris;
- descripción funcional de cada categoría;
- confianza promedio y confianza por elemento;
- detalle desplegable de ambientes, puertas, escaleras, pasillos y riesgos;
- sectores sin salida calculados mediante `sectorId`, `exitIds` o ubicación de la salida dentro de los límites del sector;
- listas desplegables de detecciones correctas, categorías no detectadas y observaciones del proveedor.

El nivel de confianza general es el promedio de las categorías que incluyen valores de confianza. No es un porcentaje de cumplimiento normativo.

## Coordenadas

Las detecciones usan píxeles de la imagen original, con origen arriba a la izquierda. No usan coordenadas del viewport ni del canvas. `source.canvasTransform` permite convertirlas en un módulo gráfico futuro:

```text
xCanvas = canvasTransform.x + xImagen * canvasTransform.scaleX
yCanvas = canvasTransform.y + yImagen * canvasTransform.scaleY
```

Esta conversión no se ejecuta durante el análisis.

## Estados de interfaz

- Sin imagen: el frontend bloquea el análisis con un mensaje claro.
- Analizando: el botón queda deshabilitado y muestra progreso.
- Completado: el modelo se guarda, el Inspector IA se actualiza y se habilita la descarga JSON.
- Reanálisis: reemplaza el modelo anterior y vuelve a desactivar el motor de rutas.
- Error: se conserva el canvas y se muestra el mensaje normalizado del backend.

## Seguridad y límites

- La ruta requiere una sesión autenticada.
- Se permiten hasta 10 solicitudes de IA por minuto e IP en una instancia.
- Se aceptan como máximo 3 imágenes por análisis.
- Solo se aceptan data URLs PNG, JPEG o WEBP con dimensiones positivas.
- Express y Nginx limitan el cuerpo a 25 MB.
- El backend no devuelve detalles internos del proveedor en producción.

## Archivos responsables

- `frontend/src/editor/components/AIPlanPanel.jsx`: acción del usuario y estados de solicitud.
- `frontend/src/editor/components/AIInspectorPanel.jsx`: visualización del modelo.
- `frontend/src/editor/analysis/buildingAnalysisModel.js`: catálogo de detecciones.
- `frontend/src/editor/store/editorReducer.js`: persistencia y frontera sin dibujo.
- `backend/src/routes/aiPlanRoutes.js`: endpoint autenticado.
- `backend/src/ai/services/AIPlanService.js`: caso de uso.
- `backend/src/ai/adapters/OpenAIPlanProvider.js`: análisis multimodal y prompt.
- `backend/src/ai/validation/planValidation.js`: validación y normalización.

## Fuera de alcance

Este módulo no debe:

- agregar símbolos;
- generar flechas o rutas;
- modificar capas;
- calcular cumplimiento;
- corregir automáticamente el plano;
- emitir recomendaciones normativas.

Esas capacidades pertenecen a módulos posteriores y requieren una acción explícita independiente.
