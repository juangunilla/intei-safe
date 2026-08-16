# Propuesta automática de evacuación

## Objetivo

Después de completar el análisis arquitectónico, Inteli -Safe genera automáticamente una propuesta editable. La propuesta es un borrador temporal: no forma parte del documento ni modifica el canvas hasta que el usuario la acepta.

## Contenido obligatorio

El backend solicita al proveedor al menos un objeto de cada tipo:

- `evacuationRoute`: señal de ruta de evacuación;
- `assemblyPoint`: punto de encuentro;
- `emergencyExit`: salida de emergencia;
- `extinguisher`: extintor sugerido;
- `firstAid`: botiquín/primeros auxilios;
- `aed`: DEA;
- `alarm`: alarma.

La propuesta debe incluir además una o más operaciones `arrow` para representar flechas y recorridos.

## Flujo

```text
Imagen → Análisis guardado → Generación automática → Vista previa
                                                    ├─ Rechazar → descartar borrador
                                                    ├─ Editar   → ajustar borrador
                                                    └─ Aceptar  → crear capa y aplicar objetos
```

1. `AIPlanPanel` completa `analyze-building` y guarda `document.buildingAnalysis`.
2. Sin intervención adicional, envía una copia exportada del documento con el nuevo análisis a `generate-evacuation`.
3. El backend valida que cada operación sea `add`, que solo use símbolos permitidos, que las coordenadas sean finitas y que exista al menos una flecha.
4. `createProposalDraft` copia las operaciones y agrega metadatos exclusivamente de UI (`previewId`, `included`).
5. `AIProposalPreview` muestra explicación, cantidades, advertencias y objetos propuestos.
6. Hasta este punto `document.elements` no cambia y `routingEnabled` permanece desactivado.

## Decisiones del usuario

### Editar

Cada elemento de la vista previa dispone de controles propios para:

- aceptarlo o excluirlo de la aplicación final;
- eliminarlo definitivamente del borrador;
- moverlo modificando sus coordenadas `x` e `y`;
- abrir y cerrar su edición sin afectar a los demás objetos;
- revisar el tipo y posición de cada elemento.

Después de aceptar, los objetos continúan siendo arrastrables, rotables y escalables mediante el editor normal.

### Rechazar

El borrador se elimina del estado local del panel. No se crea una capa, no se agrega historial y no se modifica el documento.

### Aceptar

1. Se crea la capa `Propuesta IA aceptada`.
2. Solo se transforman las operaciones cuyo campo temporal `included` sea verdadero.
3. Se eliminan los metadatos temporales de vista previa.
4. Cada elemento recibe:

```json
{
  "layerId": "uuid-de-capa",
  "aiGenerated": true,
  "userModified": false,
  "proposalAccepted": true
}
```

5. Capa y objetos se aplican atómicamente mediante una única acción con historial; un solo **Deshacer** revierte toda la aceptación.

## Contrato de operación

Símbolo:

```json
{
  "action": "add",
  "element": {
    "type": "symbol",
    "symbolId": "emergencyExit",
    "x": 420,
    "y": 180
  }
}
```

Flecha:

```json
{
  "action": "add",
  "element": {
    "type": "arrow",
    "x": 120,
    "y": 240,
    "points": [0, 0, 100, 0]
  }
}
```

## Fronteras de seguridad

- La propuesta nunca contiene `update` ni `remove`.
- Solo acepta IDs del catálogo enviado por el frontend.
- El proveedor no puede modificar la imagen, capas ni elementos existentes.
- Rechazar no produce mutaciones.
- Editar la vista previa no produce mutaciones.
- Aceptar es la única transición que escribe en `document.elements`.
- Las ubicaciones sugeridas deben ser revisadas profesionalmente.

## Archivos responsables

- `frontend/src/editor/components/AIPlanPanel.jsx`: orquestación automática y decisión final.
- `frontend/src/editor/components/AIProposalPreview.jsx`: vista previa y edición temporal.
- `frontend/src/editor/proposal/evacuationProposal.js`: modelo puro del borrador.
- `frontend/src/editor/symbols/symbolRegistry.jsx`: catálogo visual editable.
- `backend/src/ai/services/AIPlanService.js`: validación de la propuesta.
- `backend/src/ai/adapters/OpenAIPlanProvider.js`: generación multimodal.
