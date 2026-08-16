# Contenido y cálculo del informe PDF

El porcentaje mostrado en el informe representa **completitud técnica estimada del proyecto**. No certifica cumplimiento normativo.

## Datos de entrada

El cálculo usa exclusivamente el documento vigente:

- `E`: cantidad de símbolos `emergencyExit` incorporados;
- `R`: cantidad de objetos editables `arrow`;
- `S`: cantidad de señales incorporadas (`emergencyExit`, `evacuationRoute`, `assemblyPoint`, `youAreHere`, `stairs`, `emergencyLight`, `noElevator`);
- `Q`: cantidad de elementos de equipamiento (`extinguisher`, `alarm`, `firstAid`, `aed`, `fireHose`, `cabinet`);
- `O`: observaciones del análisis + riesgos detectados + rutas largas + escaleras sin señalización;
- `T`: cantidad de sectores analizados. Se usan `buildingAnalysis.sectors`; si no existen, se usan ambientes y pasillos;
- `U`: sectores sin ruta. Se calculan por `sourceId` cuando existe; para flechas editables sin relación explícita se utiliza su cantidad como cobertura conservadora;
- `D`: salidas detectadas por el análisis, con mínimo operativo de 1 para el denominador.

La cobertura normalizada es:

```text
cobertura(cantidad, objetivo) = min(cantidad / objetivo, 1)
```

## Fórmula

```text
Salidas             = cobertura(E, max(1, D)) × 20
Rutas               = cobertura(R, max(1, T)) × 20
Señalización        = cobertura(S, max(1, T)) × 15
Equipamiento        = cobertura(Q, max(1, T)) × 20
Observaciones       = (1 - cobertura(O, max(1, T))) × 10
Sectores con ruta   = T > 0 ? (1 - U / T) × 15 : 0

Porcentaje = redondear(suma de los seis componentes)
```

Los pesos suman 100 puntos. Cada componente queda limitado a su peso máximo; agregar elementos repetidos por encima de la cantidad de sectores no aumenta indefinidamente el resultado.

## Reglas de contenido del PDF

- Si `R = 0`, el informe dice **“No se generaron rutas automáticas.”** y no afirma que existan trayectorias verdes.
- Si extintores, alarmas, botiquines, DEA o hidrantes tienen cantidad 0, el informe dice **“No fueron detectados en este análisis.”**
- El contenido incorpora resumen técnico, observaciones, recomendaciones, advertencias, nivel de confianza y explicación del análisis usando exclusivamente datos del análisis y del documento.
- Las recomendaciones de mantenimiento solo aparecen cuando el equipamiento correspondiente existe.
- El diseño, orden de secciones, portada, colores y tipografía del PDF no cambian.
