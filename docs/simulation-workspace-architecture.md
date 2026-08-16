# Simulation Workspace — extensibilidad técnica

El modelo de simulación es independiente de React y Konva. `simulationEngine` recibe un documento serializable y devuelve rutas, agentes, eventos y resultados serializables. `simulationFrame` reconstruye un estado visual para cualquier timestamp, por lo que el mismo contrato puede alimentar canvas 2D, un visor 3D o un renderizador de video.

## Datos todavía necesarios para 3D

- elevación y altura de cada planta;
- altura libre de sectores y conexiones;
- geometría tridimensional de escaleras y rampas;
- relaciones explícitas entre plantas;
- coordenada Z para rutas, salidas y agentes;
- transformación común entre plano 2D y modelo 3D;
- envolventes espaciales navegables y obstáculos tridimensionales.

No debe inferirse ninguno de estos datos desde el plano sin confirmación técnica.

## Integración futura de incendio o humo

Un módulo externo podría implementar un contrato `FireSimulationAdapter` sin incorporar física al motor de evacuación. Su entrada futura podría contener zonas afectadas, visibilidad, temperatura, toxicidad y timestamps. Su salida debería limitarse a restricciones temporales serializables: rutas o salidas no disponibles, penalizaciones de velocidad verificadas y advertencias.

El adaptador no está implementado. Antes de incorporarlo será necesario definir la procedencia del modelo físico, sistema de coordenadas, unidades, resolución temporal, validación y tratamiento de datos faltantes. El Simulation Workspace actual no calcula humo, temperatura, toxicidad, propagación ni CFD.

## Exportación futura de video

`simulationFrame(simulation, timestamp)` permite un render determinístico con timestep fijo. Para MP4 faltan un renderer offscreen, composición de overlays, tamaño/FPS configurables, captura de frames, codificador WebCodecs o servicio equivalente, progreso, cancelación y pruebas de sincronización. No se incorporó FFmpeg ni un encoder en esta etapa.
