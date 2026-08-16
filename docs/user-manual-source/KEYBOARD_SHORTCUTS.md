# Atajos de teclado implementados

Los atajos se escuchan en el editor y se omiten mientras el foco está en `input` o `textarea`.

| Atajo | Acción | Condición |
|---|---|---|
| `Ctrl+Z` / `Cmd+Z` | Deshacer | Existe historial anterior |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Rehacer | Existe historial futuro |
| `Ctrl+Y` / `Cmd+Y` | Rehacer | Existe historial futuro |
| `Delete` o `Backspace` | Eliminar selección de elementos | Hay objetos seleccionados |
| `Escape` | Limpiar selección geométrica/evidencia | Hay foco geométrico |
| Mantener `Espacio` y arrastrar | Desplazar el canvas temporalmente | Foco fuera de campos de texto |
| Arrastre con botón central | Desplazar el canvas | Cursor sobre canvas |
| Rueda del mouse | Zoom alrededor del puntero | Cursor sobre canvas |

No están implementados atajos para guardar, abrir paneles, copiar/pegar, cambiar herramienta ni ejecutar análisis.
