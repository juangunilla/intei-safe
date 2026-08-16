# 5. Carga del plano

## Para qué sirve
Incorpora una imagen base o restaura un documento/proyecto JSON.

## Cómo acceder
Barra del editor → **Cargar plano**.

## Datos que necesita
PNG, JPG o WEBP de hasta 8 MB; JSON de hasta 30 MB.

## Paso a paso
1. Pulse **Cargar plano**.
2. Elija el archivo.
3. Espere **Cargando…**.
4. Compruebe imagen y miniatura.

## Controles disponibles
Selector de archivo único. La misma acción admite imagen, documento JSON o bundle Inteli PDE.

## Qué guarda
Imagen como Data URL, tamaño original, escala visual, nombre de archivo y miniatura del proyecto.

## Qué no hace
No interpreta el plano al cargarlo y no calibra escala automáticamente.

## Advertencias y limitaciones
Las imágenes se ajustan inicialmente a un área máxima aproximada de 1200 × 800, sin perder dimensiones originales. Una imagen ilegible reduce la calidad del análisis.

## Errores habituales
Formato no soportado, archivo demasiado grande, imagen inválida o JSON dañado.

## Ejemplo práctico
Cargar `oficina-planta-baja.webp`, verificar que aparezca en el canvas y esperar **Guardado**.
