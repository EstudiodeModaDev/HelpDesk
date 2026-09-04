# Componentes de Almacenamiento

## Descripción general
Este módulo ofrece herramientas de diagnóstico para el equipo de TI sobre el consumo de almacenamiento del sitio de SharePoint que respalda la aplicación (`estudiodemoda.sharepoint.com/sites/TransformacionDigital/IN/HD`): cuánto ocupan las bibliotecas de documentos y cuánto ocupan (de forma estimada) las listas. Son pantallas de solo lectura orientadas a soporte/administración técnica, no a los usuarios finales de la mesa de ayuda.

## Archivos
- `src/components/Storage/StoragePage.tsx` (`StoragePage`): contenedor con pestañas "Bibliotecas" / "Listas" que monta uno u otro panel y les pasa `graph`, `hostname` y `sitePath` fijos.
- `src/components/Storage/LibrariesStorage.tsx` (`LibrariesStorage`): calcula y muestra, por biblioteca (drive) del sitio, el número de archivos y el tamaño total real, con barra de progreso mientras recorre cada drive.
- `src/components/Storage/ListsStorageEstimate.tsx` (`ListsStorageEstimate`): muestra una estimación del tamaño de las listas del sitio basada en el peso del JSON de sus campos (fields), tomando una muestra de items (`sampleSize`).

## Funciones y constantes clave

| Componente | Props | Servicios/hooks consumidos | Estado local | Efectos / Handlers |
|---|---|---|---|---|
| `StoragePage.tsx` | ninguna | `useGraphServices()` (`src/graph/GrapServicesContext`) → `graph` | `tab: "bibliotecas" \| "listas"` | ninguno; solo alterna el panel renderizado |
| `LibrariesStorage.tsx` | `graph: { get }`, `hostname`, `sitePath` | Instancia local `new SharePointStorageService(graph)` (`src/Services/sharepointStorage.service`) — **no** es un hook de `Funcionalidades`, se instancia directo en el componente | `rows: DriveSizeResult[]`, `loading`, `error`, `progress { done, total }` | `load` (memorizado con `useCallback`) resuelve el `siteId`, lista drives, y por cada uno llama `svc.computeDriveSize(d.id)` actualizando `rows`/`progress` incrementalmente; `useEffect([load])` ejecuta `load()` al montar; función módulo `formatBytes` |
| `ListsStorageEstimate.tsx` | `graph`, `hostname`, `sitePath`, `sampleSize?` (default 200) | Instancia local `new SharePointListsStorageService(graph)` (`src/Services/sharepointListsStorage.service`) | `rows: ListSizeEstimate[]`, `loading`, `error` | `load` llama `svc.estimateListsUsage(hostname, sitePath, sampleSize)`; `useEffect([load])` ejecuta `load()` al montar; misma función `formatBytes` duplicada localmente |

## Flujo del módulo
1. El usuario entra a `StoragePage`, que por defecto muestra la pestaña "Bibliotecas".
2. `LibrariesStorage` dispara automáticamente el cálculo al montarse: resuelve el sitio, lista las bibliotecas y calcula el tamaño de cada una secuencialmente, refrescando la tabla y la barra de progreso a medida que avanza (`done/total`). El usuario puede pulsar "Recalcular" para repetir el proceso.
3. Al cambiar a la pestaña "Listas", se monta `ListsStorageEstimate`, que también calcula automáticamente al montar (una sola llamada `estimateListsUsage`, sin progreso incremental) y muestra una tabla con el estimado por lista y el total.
4. No hay navegación posterior ni acciones de escritura: es un flujo de consulta unidireccional (cargar → mostrar → opcionalmente recalcular).

## Dependencias
- **Servicios (no hooks de Funcionalidades)**: `src/Services/sharepointStorage.service.ts` (`SharePointStorageService`), `src/Services/sharepointListsStorage.service.ts` (`SharePointListsStorageService`).
- **Contexto**: `src/graph/GrapServicesContext` (`useGraphServices`) solo para obtener el cliente `graph`.
- **Models**: `src/Models/Files.ts` (`DriveSizeResult`, `ListSizeEstimate`).
- **Librerías externas**: ninguna librería de UI de terceros; tablas y barra de progreso son HTML/CSS puro (`LibrariesStorage.css`, `ListsStorageEstimate.css`).

## Oportunidades de mejora
1. **Inconsistencia arquitectónica**: a diferencia de casi todos los demás componentes documentados (que consumen hooks `useXxx` de `src/Funcionalidades`), este módulo instancia servicios directamente dentro del componente (`new SharePointStorageService(graph)`, `new SharePointListsStorageService(graph)`) y maneja `rows/loading/error` con `useState`/`useCallback` a mano. Esto duplica el patrón que en el resto del código está encapsulado en `Funcionalidades/*`; sería más consistente extraer `useLibrariesStorage`/`useListsStorageEstimate` a `Funcionalidades`.
2. **`formatBytes` duplicada**: la misma función `formatBytes` (idéntica lógica de unidades B/KB/MB/GB/TB) está copiada en `LibrariesStorage.tsx` y `ListsStorageEstimate.tsx`. Debería moverse a un util compartido (p. ej. `src/Funcionalidades/shared` o `src/lib`).
3. **`hostname`/`sitePath` hardcodeados**: `StoragePage.tsx` fija `"estudiodemoda.sharepoint.com"` y `"/sites/TransformacionDigital/IN/HD"` como literales en el componente en vez de leerlos de configuración/entorno, lo que dificulta apuntar la herramienta a otro sitio sin tocar código.
4. **Tipo `graph` débil**: la prop `graph: { get: (path: string) => Promise<any> }` usa `any` como tipo de retorno, perdiendo tipado en toda la cadena de llamadas a los servicios de Graph.
5. **`colSpan` inconsistente**: en `LibrariesStorage.tsx` la fila vacía usa `colSpan={5}` pero la tabla solo tiene 4 columnas (Biblioteca, Archivos, Tamaño, % del total); en `ListsStorageEstimate.tsx` ocurre lo mismo con `colSpan={6}` sobre una tabla de 4 columnas. Es un defecto menor de maquetación (funciona visualmente pero es semánticamente incorrecto).
6. **Sin manejo de operación en curso duplicada**: si el usuario pulsa "Recalcular" varias veces rápido, no hay `AbortController` ni bloqueo adicional más allá de `disabled={loading}` en el botón; una carrera de promesas podría dejar `rows` en un estado inconsistente si `load()` se invoca dos veces casi simultáneamente antes de que `loading` se refleje.
7. **Accesibilidad de la barra de progreso**: el `div.ls-progress__bar` en `LibrariesStorage.tsx` no usa `role="progressbar"` ni `aria-valuenow/aria-valuemin/aria-valuemax`, por lo que el avance no es anunciado a tecnologías asistivas.
