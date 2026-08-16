# 17. Errores y advertencias

## Para qué sirve
Ayuda a interpretar estados visibles sin convertirlos en conclusiones técnicas.

## Cómo acceder
Mensajes de formularios, paneles, estado de autoguardado, advertencias de análisis/simulación y consola sólo para diagnóstico técnico.

## Datos que necesita
Registre acción, mensaje, proyecto y momento del error.

## Paso a paso
1. Lea el mensaje completo.
2. Verifique conexión y autoguardado.
3. Compruebe requisitos del módulo.
4. Reintente sólo después de corregir el dato.
5. Exporte respaldo si el problema persiste.

## Controles disponibles
Alertas descartables, reintentos manuales, fallback estándar de Advisor y estados loading/pending/saving/saved/error.

## Qué guarda
Algunos eventos técnicos se auditan; errores de interfaz no siempre se persisten.

## Qué no hace
Una advertencia no equivale automáticamente a incumplimiento.

## Advertencias y limitaciones
409 indica conflicto de versión. `not_verifiable` indica falta de datos. “Resultado histórico” indica fingerprint antiguo.

## Errores habituales
Proveedor IA no configurado, plano ausente, escala ausente, archivo inválido, evidencia eliminada y PDF sin análisis.

## Ejemplo práctico
Ante “No se puede medir un ancho real…”, calibrar escala y repetir la medición.
