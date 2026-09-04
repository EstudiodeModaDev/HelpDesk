# Componentes de Tareas / Ausencias / Seguimiento

## Descripción general
Este módulo agrupa las pantallas de productividad y trazabilidad del agente de help desk: la gestión de tareas/recordatorios personales (creación, listado, filtrado por estado, KPI de avance mensual), el registro de ausencias del agente (modal tipo "evento de calendario"), el contador de tiempo trabajado en un ticket (inicio/pausa de sesión con persistencia en Supabase) y el historial de seguimiento/solución de un ticket (línea de tiempo de mensajes y adjuntos). Son componentes que se usan tanto de forma independiente (páginas propias) como embebidos dentro del detalle de un ticket (`TimeCounter`, `Seguimiento`).

## Archivos
- `src/components/Tareas/Tareas.tsx`: página contenedora (`TareasPage`) que combina la lista de tareas, el resumen de actividad y el modal de creación de tarea (`FormTareaModal`).
- `src/components/Tareas/ResumenActividad/ResumenActividad.tsx`: tarjeta (`ActivityStatusCard`) con un anillo de progreso SVG (% de tareas finalizadas en el mes) y una lista de las próximas 3 tareas.
- `src/components/Tareas/TareasForm/TareasForm.tsx`: formulario (`FormTarea`) para crear una nueva tarea/recordatorio, con selección de solicitante y encargado vía `react-select` (combinando trabajadores y franquicias).
- `src/components/Tareas/TareasRegistradas/TareasRegistradas.tsx`: lista (`ListaTareas`) de tareas del usuario con pestañas de filtro (Pendientes/Iniciadas/Finalizadas) y acciones por tarea (iniciar, finalizar, eliminar con confirmación).
- `src/components/Ausencia/Ausencia.tsx`: modal (`TeamsEventForm`) para reportar una ausencia, con estilo de "evento de calendario" (fecha/hora de inicio y fin, motivo).
- `src/components/TimeCounter/TimeCounter.tsx`: widget (`TimeCounter`) embebido en el detalle de ticket para iniciar/pausar/reanudar el cronómetro de trabajo sobre ese ticket, sincronizado contra sesiones persistidas en backend.
- `src/components/Seguimiento/Seguimiento.tsx`: panel (`TicketHistorial`) que muestra la línea de tiempo de seguimientos/soluciones de un ticket (mensajes + adjuntos) y permite pasar a modo "documentar" para agregar un nuevo seguimiento o solución.

## Funciones y constantes clave

### `Tareas.tsx` (`TareasPage`, `FormTareaModal`)
- `TareasPage`: sin props; usa `useGraphServices()` (con cast a `{ Tareas: TareasService }`) y el hook `useTareas(Tareas)` de `src/Funcionalidades/tasks/Tareas.ts`, del que consume `monthlyItems`, `percentaje`, `cantidadTareas`.
- Estado local: `open` (bool) controla la visibilidad del modal de creación.
- `FormTareaModal`: props `{ open, onClose }`; retorna `null` si `!open`; envuelve `FormTarea` en un diálogo modal accesible (`role="dialog"`, `aria-modal`).

### `ResumenActividad/ResumenActividad.tsx` (`ActivityStatusCard`)
- Props: `title?`, `percent`, `tasks: Tarea[]`, `taskThisMonth`, `locale?` (default `"es-CO"`), `accentColor?`, `ringSize?` (default 140). Sin estado ni hooks; es puramente de presentación.
- Constantes/cálculos: `safePercent` clampa el porcentaje a `[0,100]`; `stroke`, `radius`, `circumference`, `dashOffset` calculan la geometría del anillo SVG; usa `Intl.DateTimeFormat` para formatear la fecha corta de cada tarea y `toDate` de `src/utils/Date.ts`.

### `TareasForm/TareasForm.tsx` (`FormTarea`)
- Sin props; usa `useGraphServices()` y tres hooks de `Funcionalidades`:
  - `useTareas(Tareas)` → `{ handleSubmit, errors, setField, state, reloadAll }`.
  - `useWorkers({ onlyEnabled: true })` de `Funcionalidades/access/Workers.ts` → `{ workersOptions, loadingWorkers, error }`.
  - `useFranquicias(FranquiciasSvc)` de `Funcionalidades/access/Franquicias.ts` → `{ franqOptions, loading, error }`.
- `combinedOptions` (memoizado): fusiona y deduplica `workersOptions` + `franqOptions` por email/valor/label, ordenados alfabéticamente; se usa como lista de opciones para los selects de "Solicitante" y "Encargado".
- `userFilter`: función de filtrado personalizada para `react-select` que normaliza (`norm` de `src/utils/Commons.ts`) y busca contra label/email/jobTitle.
- `Option`: componente de opción custom para `react-select` que muestra email y cargo debajo del nombre.
- Handler de envío: `onSubmit={(e) => { handleSubmit(e); reloadAll(); }}`.

### `TareasRegistradas/TareasRegistradas.tsx` (`ListaTareas`)
- Props: `{ onOpen: () => void }` (abre el modal de nueva tarea desde el botón "+").
- Hooks: `useTareas(Tareas)` → `{ rows, setFilterMode, filterMode, deleteTask, iniciarTarea, finalizarTarea }`; `useConfirm()` de `src/components/ModalDelete/ConfirmProvider.tsx` para el diálogo de confirmación de borrado.
- Handler `handleDelete(t)`: pide confirmación (`confirm({...})`), y si se acepta llama `deleteTask(t.Id)`; luego hace `setFilterMode((prev) => prev)` con el comentario "opcional, fuerza efecto si dependes del filtro" — no cambia realmente el filtro.
- Botones de acción por tarea: "Marcar como iniciada" (`iniciarTarea`) solo visible si `t.Estado === "pendiente"`; "Marcar como finalizada" (`finalizarTarea`) en otro caso; ambos ocultos si `t.Estado.startsWith("Finalizado")`.

### `Ausencia/Ausencia.tsx` (`TeamsEventForm`, export default)
- Props: `{ isOpen?, onSave?, onDiscard?, onClose? }`.
- Hook: `useAusencias({ Ausencias })` de `src/Funcionalidades/tasks/Ausencias.ts` → `{ state, errors, submitting, setField, handleSubmit }`.
- Estado local: `values: EventFormValues` (fecha/hora de inicio y fin en formato de `<input>`), inicializado con la fecha/hora actuales (`todayISO`, `currentTime`).
- `buildRange()`: convierte `values` a ISO combinando fecha+hora (`toIsoFromDateTime` de `src/utils/Date.ts`) y los guarda en el estado del hook (`Fechadeinicio`, `Fechayhora`) justo antes de enviar.
- Handlers: `handleChange(field)` actualiza `values`; `handleDiscard` llama `onDiscard`+`onClose`; `handleBackdropClick` cierra al hacer clic fuera; el botón "Guardar" ejecuta `buildRange()` y luego `handleSubmit(e)` en el mismo `onClick` (además del `type="submit"` del botón).

### `TimeCounter/TimeCounter.tsx` (`TimeCounter`, export default)
- Props: `{ title?, subtitle?, initialSeconds?, autoStart?, className?, ticket?: Ticket, resolutorId? }`.
- Hooks: `useContador()` de `src/Funcionalidades/timeCounter/hooks/useCounter.ts` (agrega `usePauseCounter`, `useStopCounter`, `useStartCounter`, `useGetSessions`, `useSendHeartBeat`) → expone `startCounter`, `resumeCounter`, `pauseCounter`, `stopCounter`, `isStarting`, `isPausing`, `isStopping`, `isBusy`, `getTicketSessions`, `hasAnySession`, etc.; `useGraphServices()` (para `Usuarios.getAll`); `useAuth()` (para el email del resolutor).
- Estado local: `seconds`, `isRunning`, `activeSession` (`{ sesion_id, estado }`); refs `baseSecondsRef` y `activeStartRef` para calcular el tiempo transcurrido sin depender de la precisión de `setInterval`.
- Funciones puras a nivel de módulo: `formatTime`, `parseSessionDate`, `getSessionStoredSeconds`, `getActiveStartTimestamp`.
- Efectos: sincroniza la sesión del ticket al montar/cambiar `ticket` (`syncTicketSession`); actualiza el contador visual cada segundo mientras `isRunning` (recalculando `Date.now() - activeStartRef.current` en vez de incrementar contador, para evitar drift).
- Handlers: `handleStart` (reanuda sesión existente o crea una nueva, obteniendo primero el `resolutorId` vía `getResolutorId`), `handlePause`. Usa `react-hot-toast` para todos los mensajes de error/información.
- `canInteractuar`, `canStart`, `canPause` controlan visibilidad/habilitación de los botones.

### `Seguimiento/Seguimiento.tsx` (`TicketHistorial`, export default)
- Props: `{ role, ticketId, onVolver, onAdd, defaultTab?, className?, ticket, onAddClick }`.
- Hook: `useRepositories()` → `{ logs, attachments }`.
- Estado local: `tab` (`"seguimiento" | "solucion"`), `mode` (`"detalle" | "documentar"`), `mensajes: Log[]`, `attachmentsByLog`, `loading`, `error`.
- Efecto: cuando `mode === "detalle"`, carga en paralelo (`Promise.all`) los logs del ticket (`logs.loadLogs`) y los adjuntos de tipo "Documentacion" (`attachments.loadAttachments`), con `cancel` flag para evitar condiciones de carrera.
- Funciones auxiliares a nivel de módulo (lógica de datos dentro del archivo de componente): `mapItemsToMensajes`, `formatDateTime`, `tipoToClass` (clasifica el tipo de acción para el estilo de burbuja), `groupAttachmentsByLog`, `getAttachmentUrl` (esta última importa y usa directamente `supabase` de `src/Services/Supabase.service.ts` para resolver URLs públicas de storage).
- Subcomponente `HistRow`: fila de la línea de tiempo con avatar, nombre, fecha y burbuja de contenido (`HtmlContent` de `src/components/Renderizador/Renderizador.tsx`), con toggle local `showAttachments`.
- En modo `"documentar"` delega a `src/components/Documentar/Documentar.tsx`.

## Flujo del módulo
**Tareas**: el agente abre `TareasPage`, ve `ListaTareas` (filtrada por defecto en "Pendientes") junto al `ActivityStatusCard` con el % de tareas finalizadas del mes y sus próximas 3 tareas. Pulsa "+" → se abre `FormTareaModal` → completa `FormTarea` (asunto, descripción, solicitante/encargado vía selects combinados, fecha/hora del evento, días de anticipación del recordatorio) → al enviar, `useTareas().handleSubmit` valida, crea la tarea en el backend (`TareaSvc.create`) con estado `"Pendiente"`, resetea el formulario y recarga la lista (`reloadAll`). De vuelta en la lista, el agente puede mover una tarea a "Iniciada" (`iniciarTarea`) y luego a "Finalizada a tiempo"/"Finalizada fuera de tiempo" (`finalizarTarea`, que compara la fecha de la tarea con la fecha actual), o eliminarla tras confirmar en un diálogo modal (`useConfirm`).

**Ausencias**: el agente abre el modal `TeamsEventForm` (prellenado con la fecha/hora actual), ingresa el motivo y ajusta fecha/hora de inicio y fin; al guardar se valida (fecha fin ≥ fecha inicio, campos requeridos) y se crea el registro de ausencia (`Ausencias.create`), mostrando un `alert()` con el ID generado para seguimiento/aprobación.

**Contador de tiempo (`TimeCounter`)**: embebido en el detalle de un ticket. Al montarse, sincroniza si ya existe una sesión de tiempo para ese ticket (`getTicketSessions`); si hay una sesión activa, calcula los segundos transcurridos y arranca el `setInterval` de refresco visual. El agente pulsa "Iniciar" para crear una sesión nueva o reanudar la última pausada (requiere resolver el `resolutorId` de SharePoint a partir del correo autenticado), o "Pausar" para detener el conteo y persistir el tiempo acumulado. El widget se deshabilita completamente si el ticket ya está cerrado.

**Seguimiento (`Seguimiento`)**: al abrir el detalle de un ticket, `TicketHistorial` carga y muestra en modo `"detalle"` la línea de tiempo de logs (creación, seguimiento, solución, cierre) con sus adjuntos opcionales. Si el usuario tiene rol privilegiado y el ticket no está cerrado, puede pulsar "Seguimiento" o "Solución" para pasar a modo `"documentar"`, delegando en `Documentar` la creación de un nuevo registro; al terminar (`onDone`), vuelve a modo `"detalle"` y notifica al padre (`onAdd`, `onAddClick`) para refrescar el ticket.

## Dependencias
- **Funcionalidades**: `src/Funcionalidades/tasks/Tareas.ts` (`useTareas`), `src/Funcionalidades/tasks/Ausencias.ts` (`useAusencias`), `src/Funcionalidades/access/Workers.ts` (`useWorkers`), `src/Funcionalidades/access/Franquicias.ts` (`useFranquicias`), `src/Funcionalidades/timeCounter/hooks/useCounter.ts` y sus sub-hooks (`useGetSessions`, `usePauseCounter`, `useStartCounter`, `useStopCounter`, `useSendHeartBeat`).
- **Contextos/servicios transversales**: `src/graph/GrapServicesContext.tsx` (`useGraphServices` → `Tareas`, `Franquicias`, `Usuarios`), `src/auth/authContext.ts` (`useAuth`), `src/repositories/repositoriesContext.tsx` (`useRepositories` → `logs`, `attachments`), `src/Services/Supabase.service.ts` (`supabase`, usado directamente en `Seguimiento.tsx`).
- **Models**: `src/Models/Tareas.ts` (`Tarea`, `NuevaTarea`, `TareasError`, `FilterMode`), `src/Models/Ausencia.ts` (`ausencia`, `AusenciaErrors`), `src/Models/Tickets.ts` (`Ticket`), `src/Models/Log.ts` (`Log`), `src/Models/Commons.ts` (`UserOption`/`GetAllOpts`).
- **Otros componentes reutilizados**: `src/components/NuevoTicket/NuevoTicketForm.tsx` (`UserOptionEx`, usado en `TareasForm.tsx`), `src/components/ModalDelete/ConfirmProvider.tsx` (`useConfirm`), `src/components/Renderizador/Renderizador.tsx` (`HtmlContent`), `src/components/Documentar/Documentar.tsx`.
- **Externas**: `react-select` (selects de solicitante/encargado en `TareasForm.tsx`), `react-hot-toast` (notificaciones en `TimeCounter.tsx`), `@supabase/supabase-js` (resolución de URLs de adjuntos en `Seguimiento.tsx`).

## Oportunidades de mejora
- **Lógica de negocio e infraestructura filtrada dentro del componente de UI**: `Seguimiento.tsx` importa y llama directamente a `supabase.storage.from(bucket).getPublicUrl(...)` (función `getAttachmentUrl`) en vez de delegarlo a un repositorio/servicio (p. ej. `attachments` de `useRepositories()`), rompiendo la separación de capas que sí se respeta en otros módulos (Loans, Formatos) donde el acceso a datos vive en `Funcionalidades`/`repositories`.
- **Funciones de mapeo/formato de datos viviendo en el archivo de componente**: `mapItemsToMensajes`, `groupAttachmentsByLog`, `tipoToClass`, `formatDateTime` en `Seguimiento.tsx` son lógica pura de transformación de datos que podría extraerse a `src/utils` o a un hook dedicado, facilitando pruebas unitarias sin renderizar el componente.
- **`TimeCounter.tsx` es un componente muy extenso (~400 líneas) que mezcla varias responsabilidades**: sincronización de sesión con el backend, cálculo de tiempo transcurrido con refs, resolución del `resolutorId` vía Graph/SharePoint y la UI del cronómetro. Buena parte de esa lógica (`syncTicketSession`, `getResolutorId`, `getSessionStoredSeconds`, `getActiveStartTimestamp`) es candidata a moverse a un hook propio (p. ej. `useTicketTimer(ticket)`) para que el componente quede solo con el render.
- **Handler de guardar en `Ausencia.tsx` duplica la semántica de envío**: el botón tiene `type="submit"` (dispararía `onSubmit` del `<form>`, que no está definido en el `<form>`) y además un `onClick` que llama `buildRange()` y `handleSubmit(e)` manualmente; si en el futuro se agrega un `onSubmit` al `<form>`, el envío podría duplicarse. Sería más consistente usar solo `onSubmit` del formulario.
- **`handleDelete` en `TareasRegistradas.tsx` tiene una línea sin efecto real**: `setFilterMode((prev) => prev)` está comentada como "opcional, fuerza efecto si dependes del filtro", pero al devolver el mismo valor no dispara ningún re-render adicional en React; es código muerto/confuso que debería eliminarse o reemplazarse por una recarga explícita si el objetivo era refrescar la lista tras `deleteTask`.
- **Comparación de estado frágil por string literal con casing inconsistente**: `TareasRegistradas.tsx` compara `t.Estado === "pendiente"` (minúscula) mientras que en otras partes del mismo flujo (`Funcionalidades/tasks/Tareas.ts`, `buildFilter`) el valor real usado es `"Pendiente"` (mayúscula inicial); si el backend siempre devuelve `"Pendiente"`, el botón "Marcar como iniciada" nunca se mostraría, y solo funciona por casualidad si `t.Estado.startsWith("Finalizado")` ya excluye ese camino antes.
- **Falta de manejo de error o retry visible en `ResumenActividad.tsx`**: si `t.Fechadesolicitud` es inválida, `toDate(...)` puede devolver `null` y el componente hace `fmt.formatToParts(date!)` con `!` (aserción de no-nulidad) sobre un valor potencialmente `null`, lo que rompería en tiempo de ejecución con datos inconsistentes.
- **Accesibilidad**: en `Seguimiento.tsx` los textos de carga muestran caracteres corruptos ("Cargando mensajesâ€¦", "Cargando ticketâ€¦"), evidencia de un problema de codificación de caracteres (mojibake del carácter "…") que debería corregirse; además varias filas y botones usan solo color/ícono ("←", "✕") sin texto accesible adicional.
- **Estados de carga/error inconsistentes entre componentes**: `TareasForm.tsx` y `Ausencia.tsx` no muestran ningún indicador visual de error de red aparte de `alert()`/mensajes puntuales por campo, mientras que `Seguimiento.tsx` sí maneja `loading`/`error` con mensajes en pantalla; sería conveniente unificar un patrón común (p. ej. un componente `LoadingState`/`ErrorState`) reutilizable en todo el proyecto.
- **Acoplamiento cruzado entre módulos de UI**: `TareasForm.tsx` importa `UserOptionEx` desde `src/components/NuevoTicket/NuevoTicketForm.tsx` (igual que en el módulo de Loans), reforzando la necesidad de mover ese tipo a `Models/Commons.ts` para evitar que módulos de dominio distinto dependan entre sí solo por un tipo compartido.
