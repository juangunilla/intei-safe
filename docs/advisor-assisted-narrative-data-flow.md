# Inteli Advisor — flujo de redacción asistida

## Flujo

`AdvisorPanel → POST /api/ai/advisor/narrative → AdvisorNarrativeService → AdvisorNarrativeProvider → OpenAI Responses API`

El endpoint exige autenticación y tiene un límite de seis solicitudes por minuto por cliente. La clave se lee únicamente desde `OPENAI_API_KEY` en el backend. El modelo se configura con `ADVISOR_NARRATIVE_MODEL`; si falta cualquiera de las dos variables, la capacidad asistida se informa como no disponible.

## Datos enviados a OpenAI

- versión del motor Advisor y fingerprint del contexto;
- resumen determinístico;
- por observación: ID, categoría, prioridad, título, descripción, evidencia resumida como texto, recomendación existente y estado de verificabilidad;
- por recomendación: ID estable y texto determinístico.

Límites: 40 observaciones por solicitud, hasta seis lotes secuenciales, 1.800 caracteres por campo de entrada, 2.200 caracteres por texto de salida, 6.000 tokens máximos de salida por lote y timeout de 15 segundos. Si se superan 240 observaciones o falla cualquier lote, se conserva la redacción estándar completa. No se realizan llamadas reales durante las pruebas automatizadas.

## Datos que no se envían

- imágenes o Data URLs;
- documento completo, plano o geometría sin relación con la redacción;
- historial o audit trail;
- perfil completo del establecimiento;
- credenciales, cookies, tokens o API keys;
- datos de viewport, selección, zoom, pan o reproducción.
- identificador interno del proyecto (se usa en auditoría local, pero se elimina antes de llamar a OpenAI).

## Contrato y validaciones

OpenAI recibe un JSON Schema estricto, sin propiedades adicionales, cuyos mapas admiten exactamente los IDs incluidos en la solicitud. Después de recibir la respuesta, el backend vuelve a validar estructura, cantidad, IDs, textos vacíos, longitudes, números técnicos, referencias normativas, entidades técnicas y lenguaje de aprobación/certificación. El frontend repite la validación estructural antes de persistir.

La narrativa nunca sustituye observaciones, prioridad, estado, evidencia o recomendaciones determinísticas. Sólo se usa como texto de presentación y únicamente mientras su `narrativeContextFingerprint` coincide con el análisis actual.

## Fallback y trazabilidad

Timeout, error de red, rechazo, JSON inválido o incumplimiento de cualquier guardrail produce narrativa estándar. Advisor continúa funcionando y la interfaz muestra “Se utilizó redacción estándar.”

Cada intento persistido registra `advisor_narrative_generated` con proyecto, fecha, provider, modelo, versiones, fingerprint, resultado de validación y uso de fallback. Nunca se guarda la API key.

## Prueba manual controlada

1. Configurar `OPENAI_API_KEY` y `ADVISOR_NARRATIVE_MODEL` sólo en el backend.
2. Reiniciar backend y comprobar `GET /api/ai/advisor/narrative/capabilities` con una sesión autenticada.
3. Crear un proyecto ficticio, ejecutar Advisor y elegir “Asistida”.
4. Verificar que cambie únicamente la redacción y que IDs, prioridades, estados, evidencia y recomendaciones permanezcan iguales.
5. Repetir sin configuración o simulando timeout y comprobar el fallback estándar.
