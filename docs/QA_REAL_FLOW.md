# Validación integrada del editor

## Precondiciones

- MongoDB accesible mediante `MONGODB_URI`.
- Backend en `http://localhost:5000` y frontend en `http://localhost:3000`.
- `JWT_SECRET` configurado.
- `OPENAI_API_KEY` configurada para las pruebas de IA.
- `GET /api/health` debe responder HTTP 200.
- Tras iniciar sesión, `GET /api/ai/plans/capabilities` debe informar `providerConfigured: true`.

## Flujo manual

1. Iniciar sesión y crear un proyecto de QA.
2. Entrar al editor y cargar un PNG, JPG o WEBP de hasta 8 MB.
3. Esperar el estado **Guardado**.
4. Salir y volver a entrar; comprobar imagen, capas, viewport e historial.
5. Completar y guardar el perfil del establecimiento.
6. Ejecutar el análisis de IA y revisar la propuesta sin aplicarla automáticamente.
7. Excluir algunos elementos, aceptar los restantes y mover uno manualmente.
8. Calibrar la escala con dos puntos y una distancia conocida.
9. Medir otra distancia y verificar metros, centímetros y píxeles.
10. Salir y volver a entrar; comprobar elementos, escala y trazabilidad.
11. Ejecutar la revisión normativa. Los controles dependientes de datos insuficientes deben continuar en **No verificable**.
12. Generar el PDF y verificar datos declarados, normativa, advertencia profesional y puntos no verificables.

## Persistencia y tamaño

El bundle `inteli-pde-project` extrae cada Data URL a `assets.planImages`, identificada por el ID del elemento. Los documentos actual, anteriores y futuros conservan sólo `assetId`; al restaurar se repone el Data URL. Una misma imagen con otro ID se considera otro asset.

El historial mantiene hasta 50 estados. En memoria los snapshots pueden repetir la cadena Base64; en MongoDB y en el JSON exportado se guarda una sola copia por ID. El backend rechaza bundles mayores a 12 MB. Para dejar margen al crecimiento del análisis y la traza, la carga de imágenes individuales se limita a 8 MB.

## Evidencia a conservar

- Capturas de los estados Guardando/Guardado.
- ID del proyecto y versión antes/después de reabrir.
- Respuesta de capacidades sin exponer la API key.
- Resultado de análisis, decisiones de propuesta y evento de modificación manual.
- Escala recuperada y medición de control.
- RegulatoryAnalysis y PDF generado.

## E2E pendiente

Playwright no forma parte de las dependencias actuales. Una prueba estable de calibración y persistencia necesita:

- instalar `@playwright/test` y al menos un navegador administrado por Playwright;
- iniciar frontend, backend y una base MongoDB aislada para tests;
- crear un usuario y proyecto fixture sin ejecutar el seed destructivo;
- disponer de un plano fixture pequeño y coordenadas de canvas estables;
- exponer el diálogo de distancia como un formulario direccionable por selectores, en lugar de depender de `window.prompt`;
- limpiar el proyecto y usuario al finalizar.

No se incorporó esa infraestructura en esta etapa para evitar dependencias y cambios de interfaz desproporcionados.
