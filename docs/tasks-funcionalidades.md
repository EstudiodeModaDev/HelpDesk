# Tareas

## Descripción general
Cubre dos flujos internos de gestión personal del equipo de soporte: la solicitud de ausencias (permisos/incapacidades, sujetas a aprobación) y el manejo de tareas/recordatorios con fecha de vencimiento, estado y porcentaje de cumplimiento mensual. Ambos son formularios + listado respaldados por listas de SharePoint a través de servicios (`AusenciaService`, `TareasService`).

## Archivos
- `src/Funcionalidades/tasks/Ausencias.ts` — hook `useAusencias`, formulario de solicitud de ausencia.
- `src/Funcionalidades/tasks/Tareas.ts` — hook `useTareas`, CRUD y ciclo de vida de tareas/recordatorios (pendiente → iniciada → finalizada).

## Funciones y constantes clave

### `useAusencias({ Ausencias })` (Ausencias.ts)
- Estado inicial: `Fechadeinicio`/`Fechayhora` en `new Date().toISOString()` (hoy), `Title: account.username`, `NombreSolicitante: account.name`.
- `validate()`: requiere `Title`, `Fechadeinicio`, `Fechayhora`, `Descripcion`; además valida `Fechadeinicio > Fechayhora` (comparación lexicográfica de strings ISO) para exigir que el inicio sea anterior al fin.
- `handleSubmit(e)`: crea el registro (`Ausencias.create(payload)`) y hace `alert("Se ha solicitado la aprobación de su ausencia... con ID <id>")`; en error, `console.error` + `alert` genérico.
- No expone `load`/lista de ausencias existentes: este hook solo cubre la creación de la solicitud.

### `useTareas(TareaSvc)` (Tareas.ts)
- Helpers de fecha a nivel de módulo: `toISODateOnly` (passthrough), `combineLocalDateTime(dateStr, timeStr)`, `localDateOnly(d)`, `toDate(v)`.
- `patchTarea(TareaSvc: any, id, data)`: duck-typing que prueba `update`/`patch`/`set` en el servicio recibido, lanza error si ninguno existe.
- `buildFilter()`: según `filterMode` (`"Pendientes" | "Iniciadas" | "Finalizadas"`), arma el filtro OData sobre `fields/Estado` (usa `startswith` para "Finalizadas" y así cubrir variantes como "Finalizada a tiempo"/"Finalizada fuera de tiempo"); ordena por `fields/Fechadesolicitud desc`, `top: 1000`.
- `loadTasks()`: trae tareas según `buildFilter()`.
- `loadMonthTask()`: calcula el rango `[inicio, fin)` del mes actual y hace **tres** consultas en paralelo (`Promise.all`): pendientes+iniciadas del mes, finalizadas del mes, y todas las del mes; con eso calcula `percentaje = finalizadas/total * 100` y `monthlyItems` (las pendientes/iniciadas del mes).
- `validate()`: requiere `titulo`, `solicitante`, `fecha`, `hora`.
- `handleSubmit(e)`: arma el payload (`Cantidaddediasalarma`, `Estado: "Pendiente"`, `Quienlasolicita`, `Reportadapor`/`ReportadaporCorreo` desde `Encargado` o, si no hay, desde la cuenta autenticada, `Fechadelanota`, `Fechadesolicitud` combinando fecha+hora), crea la tarea, resetea el formulario y llama `loadTasks()`.
- `deleteTask(Id)`: elimina y recarga (`loadTasks`).
- `iniciarTarea(Id)`: `patchTarea(..., { Estado: "Iniciada" })` + recarga.
- `finalizarTarea({ Id, Fechadesolicitud })`: compara solo la fecha (sin hora) de vencimiento contra hoy; si la fecha de vencimiento es estrictamente posterior a hoy, marca `"Finalizada a tiempo"`, en caso contrario (incluye el mismo día) `"Finalizada fuera de tiempo"`.
- `React.useEffect`: al montar llama `loadTasks()` y `loadMonthTask()`.
- `reloadAll()`: pese al nombre, solo llama `loadTasks()` (no recarga las métricas mensuales).

## Flujo del módulo
- `src/components/Ausencia/Ausencia.tsx` usa `useAusencias` para el formulario de solicitud.
- `src/components/Tareas/Tareas.tsx`, `src/components/Tareas/TareasRegistradas/TareasRegistradas.tsx` y `src/components/Tareas/TareasForm/TareasForm.tsx` usan `useTareas`: el primero probablemente orquesta el estado compartido (filtro, métricas), `TareasForm` consume `state`/`setField`/`handleSubmit`/`errors`, y `TareasRegistradas` consume `rows`/`deleteTask`/`iniciarTarea`/`finalizarTarea`.
- Ciclo típico de una tarea: se crea en estado `"Pendiente"` → el usuario la marca `"Iniciada"` (`iniciarTarea`) → al completarla se llama `finalizarTarea`, que decide automáticamente si fue a tiempo o no comparando la fecha de vencimiento con la fecha actual → cada mutación dispara `loadTasks()` para refrescar la tabla, pero **no** `loadMonthTask()`, por lo que el contador/porcentaje mensual mostrado en pantalla puede quedar desactualizado hasta el siguiente montaje del hook.

## Dependencias
- Internas: `Services/Ausencia.service`, `Services/Tareas.service`, `Models/Ausencia`, `Models/Tareas`, `Models/Commons` (`GetAllOpts`), `auth/authContext`.
- Externas: React (hooks).

## Oportunidades de mejora
- **`reloadAll()` no recarga todo (Tareas.ts)**: después de `deleteTask`, `iniciarTarea` o `finalizarTarea` solo se invoca `loadTasks()`; `cantidadTareas`, `percentaje` y `monthlyItems` (que dependen de `loadMonthTask()`) quedan obsoletos hasta que el componente se vuelva a montar, aunque el nombre de la función (`reloadAll`) sugiere lo contrario.
- **Regla de negocio poco visible en `finalizarTarea`**: una tarea cuya fecha de vencimiento es "hoy" se clasifica como `"Finalizada fuera de tiempo"` (por el uso de `>` estricto en vez de `>=`), lo cual podría no ser la intención de negocio y no está documentado ni comentado en el código.
- **Tres llamadas de red en `loadMonthTask`** donde probablemente bastarían una consulta del mes completo y un cálculo local de los tres subconjuntos (pendientes+iniciadas, finalizadas, total), evitando round-trips redundantes a SharePoint.
- **Tipado débil en `patchTarea`**: `TareaSvc: any` renuncia al chequeo de tipos justo en la función que decide qué método de mutación invocar; un error de firma en el servicio solo se detectaría en tiempo de ejecución.
- **Comparación de fechas ISO como strings** en `useAusencias.validate()` (`state.Fechadeinicio > state.Fechayhora`): funciona solo si ambos valores tienen exactamente el mismo formato ISO; cualquier variación (offset de zona horaria, precisión de milisegundos) podría producir comparaciones incorrectas.
- **Nombre de campo ambiguo `Fechayhora`** en el modelo de ausencias: se usa como fecha de "fin" del permiso, pero el nombre no lo deja claro frente a `Fechadeinicio`, lo que puede inducir a errores al extender el formulario.
- **`useAusencias` no expone lectura del historial**: solo cubre la creación; si existe una vista de "mis ausencias" en la UI, no queda claro desde este archivo de dónde obtiene los datos, lo que sugiere lógica de lectura duplicada o ausente en otro lugar no cubierto por este módulo.
- **`Title` reutilizado como identificador de usuario** (correo) en `ausencia.Title`, igual que en el módulo de préstamos — patrón recurrente en el código base de sobrecargar el campo `Title` de SharePoint como "identificador de persona" en vez de usar un campo dedicado, lo que dificulta razonar sobre el propósito real de cada lista.
