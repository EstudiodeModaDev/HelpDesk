# Contador de tiempo

## Descripción general
Implementa el cronómetro de "tiempo de disponibilidad" que un resolutor activa mientras atiende un ticket de fuente "Disponibilidad". Toda la persistencia vive en Supabase Postgres (tablas `TBL_Sesion_Trabajo_Solvi`, `TBL_HeartbeatSesion_Solvi`, `TBL_Resolutor_Solvi`) y se manipula casi exclusivamente a través de funciones RPC (`fn_iniciar_contador`, `fn_reanudar_contador`, `fn_pausar_contador`, `fn_detener_contador`, `fn_obtener_sesiones_ticket`, `fn_obtener_sesiones_resolutor`). El módulo alimenta, indirectamente, los indicadores de `useDashboardDisponibilidad` (dashboard de disponibilidad del equipo).

## Archivos
- `src/Funcionalidades/timeCounter/hooks/useCounter.ts` — hook agregador `useContador`, compone los cinco hooks siguientes y expone una API unificada (`isBusy`, acciones, etc.) y el tipo `Session`.
- `src/Funcionalidades/timeCounter/hooks/useGetSessions.ts` — hook `useGetSessions`, consulta sesiones por ticket, por resolutor, y verifica si un ticket ya tiene sesión.
- `src/Funcionalidades/timeCounter/hooks/usePauseCounter.ts` — hook `usePauseCounter`, pausa una sesión activa.
- `src/Funcionalidades/timeCounter/hooks/useSendHeartBeat.ts` — hook `useSendHeartBeat`, envía "latidos" periódicos para las sesiones activas del resolutor autenticado.
- `src/Funcionalidades/timeCounter/hooks/useStartCounter.ts` — hook `useStartCounter`, inicia una sesión nueva o reanuda una pausada.
- `src/Funcionalidades/timeCounter/hooks/useStopCounter.ts` — hook `useStopCounter`, detiene una sesión (manual o automáticamente al cerrar un ticket).

## Funciones y constantes clave

### `useContador()` (useCounter.ts)
- Tipo `Session`: `sesion_id`, `ticket_id`, `resolutor_id`, `disponibilidad_id`, `estado`, `inicio`, `fin`, `minutos_normal`, `minutos_nocturno`, `minutos_dominical_festivo`, `minutos_nocturno_dominical_festivo`, `minutos_totales`.
- Combina `usePauseCounter`, `useStopCounter`, `useStartCounter`, `useGetSessions`, `useSendHeartBeat`.
- `isBusy = isStarting || isPausing || isStopping || isGettingSessions` — **no incluye** el estado de carga del heartbeat (ese hook no expone `loading`).

### `useGetSessions()` (useGetSessions.ts)
- `getTicketSessions(p_ticketId)`: RPC `fn_obtener_sesiones_ticket({ p_ticket_id })`; retorna `GetSessionsResponse` (`{ ok:true, sesiones: Sesiones[] }` o `{ ok:false, codigo, mensaje }`). Cada `Sesiones` trae `minutos: { normal, nocturno, dominical_festivo, nocturno_dominical_festivo, total }`.
- `getResolutorSessions(p_resolutor_id)`: RPC `fn_obtener_sesiones_resolutor({ p_resolutor_id })`, misma forma de respuesta.
- `hasAnySession(p_ticketId)`: consulta **directa** (no RPC) a `TBL_Sesion_Trabajo_Solvi` filtrando `ticket_id` (`.maybeSingle()`), retorna `{ exists, data }`; a diferencia de las otras dos funciones, lanza la excepción en vez de mostrar un `toast`.

### `usePauseCounter()` (usePauseCounter.ts)
- `pauseCounter({ p_sesion_id, p_resolutor_id })`: RPC `fn_pausar_contador`. Muestra `toast.success`/`toast.error` según `data.ok`; devuelve `null` en error de red/RPC.
- Códigos de error posibles (`CodigoInicioContadorError`): `RESOLUTOR_NO_ENCONTRADO`, `SESION_NO_ENCONTRADA`, `SESION_NO_PERTENECE_AL_RESOLUTOR`, `CONTADOR_YA_PAUSADO`, `ESTADO_NO_VALIDO`, `SESION_SIN_INICIO_ACTIVO`.

### `useSendHeartBeat()` (useSendHeartBeat.ts)
- `getActualResolutor()`: obtiene el usuario de SharePoint (`usuarios.getByEmail(account.username)`) y con su `Id` busca la fila correspondiente en `TBL_Resolutor_Solvi` (`sharepoint_id`) — combina Graph/SharePoint y Supabase en cada llamada.
- `getResolutorSessions(resolutor)`: consulta directa a `TBL_Sesion_Trabajo_Solvi` filtrando `resolutor_id` + `estado = "activa"`.
- `sendHeartBeat(sesiones)`: hace `upsert` en `TBL_HeartbeatSesion_Solvi` (`onConflict: "sesion_id"`) con `ultimo_latido = now`, uno por sesión activa.
- `heartBeatControl()`: orquesta las tres funciones anteriores; si no hay resolutor o no hay sesiones activas, retorna sin hacer nada (sin latido).

### `useStartCounter()` (useStartCounter.ts)
- `startCounter({ p_ticket_id, p_resolutor_id })`: RPC `fn_iniciar_contador`. Códigos de error: `RESOLUTOR_NO_ENCONTRADO`, `TICKET_NO_ENCONTRADO`, `TICKET_NO_ES_DISPONIBILIDAD`, `TICKET_CERRADO`, `TICKET_NO_ASIGNADO`, `YA_TIENE_CONTADOR_EN_CURSO`.
- `resumeCounter(session, resolutor_id)`: RPC `fn_reanudar_contador`.
- Ambas muestran `toast.success`/`toast.error` según corresponda.

### `useStopCounter()` (useStopCounter.ts)
- `stopCounter({ p_sesion_id, p_resolutor_id })`: RPC `fn_detener_contador`. A diferencia de start/pause, **no** muestra `toast.success` en el camino feliz, solo `toast.error` en caso de fallo.
- `stopFinishedTicketCounter(ticket, accountInfo, getTicketSessions)`: resuelve el `resolutor_id` vía `usuarios.getByEmail(accountInfo.username)`, obtiene las sesiones del ticket (`getTicketSessions`) y toma **la primera** (`sessions.sesiones[0]`) para detenerla con `stopCounter`; si no hay sesiones, retorna `{ ok: true }` sin error.

## Flujo del módulo
1. **Arranque global (heartbeat)**: `src/App.tsx` monta `useContador()` una sola vez a nivel de aplicación y registra `window.setInterval(runHeartbeat, 4.5 * 60 * 1000)` (cada 4.5 minutos) llamando `heartBeatControl().catch(console.error)`; se ejecuta una vez inmediatamente y se limpia el intervalo al desmontar. Esto corre independientemente de qué pantalla/ticket esté abierto.
2. **Sincronización por ticket**: `src/components/TimeCounter/TimeCounter.tsx` (usado dentro de la vista de un ticket) monta `useContador()` de nuevo y, en un `useEffect` ligado a `ticket`, llama `controller.getTicketSessions(ticket.ID)` para reconstruir el estado visual (`activeSession`, `seconds`, `isRunning`). Si hay más de una sesión, muestra `toast.error("Este ticket tiene más de una sesión registrada.")` pero igual continúa usando solo la última (`.at(-1)`).
3. **Inicio (`handleStart`)**: primero llama `controller.hasAnySession(ticket.ID)`; si ya existe una sesión para el ticket, llama `resumeCounter` (RPC `fn_reanudar_contador`); si no existe, llama `startCounter` (RPC `fn_iniciar_contador`) para crear una fila nueva en `TBL_Sesion_Trabajo_Solvi`.
4. **Pausa (`handlePause`)**: llama `pauseCounter` (RPC `fn_pausar_contador`) sobre la `sesion_id` activa y vuelve a sincronizar (`syncTicketSession`).
5. **Visualización del tiempo transcurrido**: mientras `isRunning`, un `setInterval` de 1 segundo recalcula `seconds` como `baseSecondsRef.current + (Date.now() - activeStartRef.current)/1000` (resistente a bloqueos del hilo principal, no incrementa un contador acumulativo).
6. **Cierre automático al resolver el ticket**: `src/Funcionalidades/Tickets/Documentar.ts` (`useDocumentarTicket`) llama `useContador()` y, al cerrar un ticket cuya `Fuente` sea `"disponibilidad"`, invoca `stopFinishedTicketCounter(ticket, account, getTicketSessions)`, que internamente detiene (RPC `fn_detener_contador`) la primera sesión encontrada para ese ticket.
7. **Consumo aguas abajo**: los minutos acumulados por sesión (normal/nocturno/dominical-festivo) y el estado de sesiones (activa/pausada/finalizada) quedan en Supabase y son la fuente que agrega `fn_obtener_dashboard_equipo`, consumida por `useDashboardDisponibilidad` (módulo Dashboard) para mostrar el tiempo trabajado por resolutor.

## Dependencias
- Internas: `Services/Supabase.service` (cliente Supabase), `auth/authContext` (`useAuth`), `repositories/repositoriesContext` (`useRepositories`, específicamente `usuarios` para resolver el id de SharePoint del resolutor), `Models/Tickets`.
- Externas: React (hooks), `react-hot-toast`, `@azure/msal-browser` (tipo `AccountInfo`), `@supabase/supabase-js` (RPC + consultas directas a tabla).

## Oportunidades de mejora
- **Asunción de "una sola sesión por ticket" no garantizada**: `TimeCounter.tsx` ya advierte al usuario cuando detecta más de una sesión para un ticket (`"Este ticket tiene más de una sesión registrada."`), pero `stopFinishedTicketCounter` (useStopCounter.ts) toma ciegamente `sessions.sesiones[0]` y detiene solo esa — si de verdad llegaran a existir varias sesiones activas para un mismo ticket, el cierre automático dejaría alguna sin detener.
- **Fallos de heartbeat silenciosos**: en `App.tsx`, `heartBeatControl().catch(console.error)` es el único manejo de error del latido periódico; si `getActualResolutor()` (useSendHeartBeat.ts) lanza (por ejemplo, `usuarios` no listo, o el usuario no tiene fila en `TBL_Resolutor_Solvi`), el fallo solo llega a la consola del navegador — no hay reintento, alerta ni indicador visual, por lo que un resolutor podría dejar de reportar disponibilidad sin saberlo, afectando las métricas de `useDashboardDisponibilidad`.
- **Costo repetido en cada latido**: `getActualResolutor()` hace una consulta a SharePoint (`usuarios.getByEmail`) **y** una consulta a Supabase en cada ciclo de 4.5 minutos, incluso si el resolutor no tiene ninguna sesión activa (el early-return ocurre después de ambas consultas). No hay caché del `resolutor_id` entre ciclos.
- **Sin bloqueo contra solapamiento**: no hay ninguna bandera "en curso" que impida que dos ejecuciones de `runHeartbeat`/`heartBeatControl` se solapen si una tardara más de 4.5 minutos (por ejemplo, por latencia de red); tampoco se cancela el `setInterval` mientras una llamada previa sigue pendiente.
- **Inconsistencia de feedback entre acciones equivalentes**: `startCounter` y `pauseCounter` muestran `toast.success` en el camino feliz, pero `stopCounter` no muestra ningún toast de éxito (solo de error), lo que puede hacer pensar al usuario que la acción de "detener" no tuvo efecto.
- **Mezcla de acceso vía RPC y acceso directo a tabla**: `getTicketSessions`/`getResolutorSessions` pasan por funciones RPC de Postgres, pero `hasAnySession` (useGetSessions.ts) y `getResolutorSessions` de `useSendHeartBeat.ts` consultan `TBL_Sesion_Trabajo_Solvi` directamente con el cliente Supabase — cualquier regla de negocio o RLS que solo esté implementada dentro de las funciones RPC podría no aplicarse a estas consultas directas.
- **Manejo de errores inconsistente dentro del mismo archivo**: en `useGetSessions.ts`, `getTicketSessions`/`getResolutorSessions` capturan errores y los muestran con `toast.error` retornando `null`, mientras `hasAnySession` relanza (`throw error`) sin `toast`, obligando a cada consumidor a saber cuál de los dos estilos aplica.
- **`isBusy` incompleto** (useCounter.ts): no incorpora el estado de carga del heartbeat (que ni siquiera se expone desde `useSendHeartBeat`), por lo que la UI no puede reflejar que hay un latido en curso ni bloquear acciones mientras ocurre.
- **Tipado débil / casts manuales**: los `supabase.rpc(...)` en los cinco hooks se castean con `as { data: X | null; error: any }` en vez de usar los genéricos tipados que ofrece el cliente de Supabase, y `usuarios.getByEmail(...)`/`resolutorId?.Id` se manejan con optional chaining sin narrowing explícito del tipo.
