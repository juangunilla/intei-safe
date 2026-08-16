# Hallazgos de documentación e interfaz

Estos puntos se registran sin modificar el producto.

## Botones sin tooltip o etiqueta accesible suficiente
- Zoom `−` y `+` no tienen `title` ni `aria-label` descriptivo.
- Botón de cierre de Advisor sólo muestra icono.
- Varios botones rápidos de filtros de Advisor no exponen estado activo.
- Controles Play/Pausa/Reiniciar del panel clásico dependen principalmente del texto corto.

## Nombres o conceptos poco claros
- El icono **Guardar proyecto** descarga JSON; el servidor se guarda automáticamente.
- Conviven “Medir” y “Medir distancia”.
- “Cobertura técnica estimada” puede confundirse con seguridad o cumplimiento pese a las advertencias.
- “Analizar con IA” ejecuta dos etapas: análisis y propuesta.
- “Revisión normativa” aparece como modo superior y panel lateral.

## Comportamientos inconsistentes
- Existen un panel clásico de Simulación y un Simulation Workspace con controles distintos.
- Algunos borrados requieren confirmación (proyecto) y otros dependen sólo de undo (elementos, mediciones, escenarios, plantillas).
- El perfil técnico está dentro del panel IA aunque también es requisito normativo.
- Los metadatos escritos al generar PDF no persisten como configuración del proyecto.
- Algunas entradas usan diálogos nativos `prompt/alert`; otras usan paneles y formularios propios.

## Funciones difíciles de descubrir
- Cerrar el polígono de superficie acercándose al primer vértice.
- Mantener Espacio o usar botón central para pan.
- Asociación de ancho con elementos.
- Diferencia entre selección normal y foco de evidencia.
- Restaurar JSON mediante el mismo botón **Cargar plano**.
- Seleccionar “Sin plantilla” para recuperar diseño histórico.

## Ayuda contextual necesaria
- Consecuencias de recalibrar o transformar la imagen.
- Significado de `not_verifiable`, completitud y Advisor stale.
- Fuentes de parámetros de simulación.
- Diferencia entre firma visual y firma digital.
- Conflicto 409 y trabajo en múltiples pestañas.

## Funciones visibles pero no disponibles
- **Exportar** en Simulation Workspace está deshabilitado.
- Redacción asistida aparece deshabilitada sin configuración backend.

## Recomendación documental
El manual final debería combinar recorridos por tarea, advertencias profesionales repetidas en puntos críticos, capturas anotadas, glosario lateral y una matriz “dato requerido → función afectada”.
