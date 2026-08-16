# 16. Importación y exportación

## Para qué sirve
Permite respaldar/restaurar el proyecto y descargar resultados específicos.

## Cómo acceder
Barra → icono **Guardar proyecto** para JSON; **Cargar plano** para importar; panel IA → **Descargar JSON**; informes → PDF.

## Datos que necesita
Bundle Inteli PDE o documento JSON válido. Máximo 30 MB para JSON.

## Paso a paso
1. Descargue `proyecto-inteli-pde-AAAA-MM-DD.json`.
2. Para restaurar, abra un proyecto y use **Cargar plano**.
3. Seleccione el JSON y compruebe el contenido antes de continuar.

## Controles disponibles
Exportación de proyecto, análisis de edificio JSON y PDF. El botón Exportar de Simulación está deshabilitado.

## Qué guarda
Formato `inteli-pde-project`, esquema 2, versiones, futuras versiones, usuario, contenidos y assets deduplicados.

## Qué no hace
No combina dos proyectos ni importa PDF/DWG.

## Advertencias y limitaciones
Importar reemplaza el estado cargado. Conserve copias antes de restaurar JSON externo.

## Errores habituales
JSON dañado, estructura sin capas/elementos, versión ajena o tamaño excesivo.

## Ejemplo práctico
Exportar antes de una modificación importante y restaurar el bundle en un proyecto de prueba.
