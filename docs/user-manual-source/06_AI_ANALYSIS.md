# 6. Análisis del plano con IA

## Para qué sirve
Detecta geometría visible y prepara una propuesta editable de señales y rutas.

## Cómo acceder
Barra del editor → **Analizar con IA**.

## Datos que necesita
Imagen del plano; opcionalmente perfil técnico. Backend con `OPENAI_API_KEY` configurada.

## Paso a paso
1. Revise o complete el perfil incluido en el panel.
2. Pulse **Analizar con IA**.
3. Revise detecciones, advertencias y JSON.
4. Revise cada objeto propuesto.
5. Incluya, excluya, edite coordenadas o elimine objetos.
6. Pulse **Aceptar propuesta** o **Rechazar**.

## Controles disponibles
Analizar/volver a analizar, descargar JSON, ver estructura, aceptar por objeto, editar X/Y, eliminar, aceptar o rechazar propuesta completa.

## Qué guarda
`buildingAnalysis`, modelo utilizado, propuesta aceptada como objetos editables y eventos de auditoría.

## Qué no hace
No aplica la propuesta sin confirmación, no certifica ubicaciones y no debe inventar medidas.

## Advertencias y limitaciones
La detección depende de resolución, rótulos y legibilidad. Todo resultado requiere validación profesional.

## Errores habituales
Plano ausente, proveedor no configurado, error de red o propuesta no generada después de un análisis exitoso.

## Ejemplo práctico
Analizar una oficina, excluir una señal dudosa, corregir la posición X/Y de otra y aceptar sólo los objetos justificados.
