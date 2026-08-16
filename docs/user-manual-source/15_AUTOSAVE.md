# 15. Autoguardado

## Para qué sirve
Persiste automáticamente el estado del editor en el proyecto abierto.

## Cómo acceder
Es automático. El estado aparece junto al botón de descarga JSON.

## Datos que necesita
Proyecto abierto, sesión válida y conexión con backend/MongoDB.

## Paso a paso
1. Realice un cambio.
2. Observe **Cambios pendientes**.
3. Espere **Guardando...** y luego **Guardado**.
4. Si aparece error, no cierre hasta resolverlo.

## Controles disponibles
No existe botón de guardar en servidor; el icono **Guardar proyecto** descarga JSON.

## Qué guarda
Bundle del editor, historial, assets, análisis y auditoría después de una espera aproximada de 1,2 segundos.

## Qué no hace
No resuelve automáticamente conflictos entre dos pestañas y no garantiza persistencia si se cierra antes de completar.

## Advertencias y limitaciones
Usa `documentVersion`; una escritura sobre versión antigua puede devolver 409 Conflict.

## Errores habituales
Confundir descarga JSON con autoguardado, cerrar en “Guardando...” o editar simultáneamente en dos sesiones.

## Ejemplo práctico
Mover una señal, esperar **Guardado**, salir y reabrir para verificar posición.
