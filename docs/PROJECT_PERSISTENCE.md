# Persistencia de proyectos Inteli -Safe

El botón **Guardar proyecto** descarga un archivo JSON autocontenido. Al volver a cargarlo, el editor restaura el documento y su historial sin recalcular el análisis ni alterar los elementos.

## Contenido guardado

- imagen o imágenes originales del plano, almacenadas una sola vez como recursos;
- documento editado completo: capas, orden, visibilidad, viewport y elementos;
- resultado íntegro de `buildingAnalysis`;
- identificadores de símbolos agregados y elementos modificados manualmente;
- versiones anteriores y versiones futuras para conservar Deshacer/Rehacer;
- observaciones devueltas por el análisis;
- fecha ISO del guardado;
- identificador, nombre y correo del usuario autenticado.

## Compatibilidad

El cargador reconoce el formato `inteli-pde-project` versión 2 y continúa aceptando los JSON antiguos que contenían solamente el documento. Las imágenes se separan del historial para no repetir su contenido Base64 en cada versión y se reponen al abrir el proyecto.
