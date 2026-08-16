# Flujos completos

Todos los flujos terminan esperando el estado **Guardado**. Ningún resultado implica certificación.

## Flujo 1 — Crear un proyecto
1. Abra **Mis Proyectos**. 2. Pulse **Crear proyecto**. 3. Ingrese nombre, descripción y estado. 4. Confirme. 5. Pulse **Abrir**.

## Flujo 2 — Subir un plano
1. En el editor pulse **Cargar plano**. 2. Seleccione PNG/JPG/WEBP menor de 8 MB. 3. Compruebe imagen y miniatura. 4. Espere **Guardado**.

## Flujo 3 — Calibrar escala
1. Active **Calibrar escala**. 2. Marque dos puntos de distancia conocida. 3. Ingrese metros en el diálogo. 4. Verifique el indicador `px/m`.

## Flujo 4 — Medir distancias y anchos
1. Active **Medir** o **Medir ancho**. 2. Marque los extremos. 3. Revise píxeles y metros. 4. Guarde el borrador. 5. Para ancho, asocie un elemento si corresponde.

## Flujo 5 — Medir superficies
1. Active **Medir superficie**. 2. Marque vértices. 3. Cierre cerca del primer punto. 4. Revise px²/m². 5. Guarde.

## Flujo 6 — Crear sectores
1. Localice un área guardada. 2. Pulse **Convertir en sector**. 3. Ingrese nombre y tipo. 4. Declare ocupación manual si está confirmada.

## Flujo 7 — Analizar plano con IA
1. Abra **Analizar con IA**. 2. Verifique perfil. 3. Ejecute. 4. Revise detecciones, advertencias y JSON. 5. Espere la propuesta editable.

## Flujo 8 — Aceptar o rechazar propuestas
1. Revise cada operación. 2. Use aceptar/excluir, editar X/Y o eliminar. 3. Pulse **Aceptar propuesta** para aplicar incluidos, o **Rechazar** para no modificar el plano.

## Flujo 9 — Completar perfil técnico
1. Abra el panel IA. 2. Complete identidad, jurisdicción, edificio, ocupación, riesgo, protección y egresos. 3. Declare procedencia. 4. Pulse **Guardar perfil**.

## Flujo 10 — Ejecutar revisión normativa
1. Abra el modo/panel normativo. 2. Pulse **Ejecutar revisión**. 3. Revise normas, completitud y checks. 4. Trate `not_verifiable` como dato pendiente.

## Flujo 11 — Navegar evidencia normativa
1. Expanda **Evidencia** en un check. 2. Pulse **Ver…**. 3. Observe el resaltado y el centrado del canvas. 4. Pulse Escape para limpiar la selección geométrica.

## Flujo 12 — Configurar simulación
1. Cree un escenario en modo Simulación. 2. Seleccione sectores/salidas. 3. Configure reacción, velocidades, movilidad, distribución, semilla y bloqueos.

## Flujo 13 — Ejecutar simulación
1. Pulse **Ejecutar**. 2. Revise estado final, agentes, tiempo, bloqueados y advertencias. 3. Use timeline y reproducción.

## Flujo 14 — Comparar escenarios
1. Ejecute al menos dos escenarios. 2. Pulse **Comparar**. 3. Seleccione A y B. 4. Compare tiempos, evacuados, bloqueados, colas, salida y cuello de botella sin convertirlos en aprobación.

## Flujo 15 — Usar Inteli Advisor
1. Abra Advisor. 2. Pulse **Analizar Proyecto**. 3. Revise resumen y observaciones. 4. Filtre, navegue evidencia y cambie estados. 5. Actualice si aparece desactualizado. 6. Opcionalmente use redacción asistida configurada.

## Flujo 16 — Generar informe
1. Abra **Generar informe**. 2. Complete proyecto, cliente, ubicación y fecha. 3. Revise cobertura. 4. Pulse **Descargar informe**.

## Flujo 17 — Configurar plantilla corporativa
1. En Informe abra **Plantilla de documentos**. 2. Cree una plantilla. 3. Complete identidad/contacto/profesional. 4. Cargue assets. 5. Ajuste colores/opciones. 6. Revise preview y selección.

## Flujo 18 — Guardar/exportar proyecto
1. Espere **Guardado** para MongoDB. 2. Pulse el icono de descarga para respaldo JSON. 3. Conserve el bundle. 4. Para restaurar, use **Cargar plano** y seleccione el JSON.
