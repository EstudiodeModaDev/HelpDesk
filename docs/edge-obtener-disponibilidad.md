# Edge Functions - Disponibilidad de agentes

## Descripción general

Este módulo agrupa dos Edge Functions de Supabase independientes que consultan los turnos de Microsoft Teams Shifts (vía Microsoft Graph) para saber quién está disponible en soporte: `obtener-disponibilidad-hoy` (turnos del día actual y quién está activo ahora mismo) y `obtener-disponibilidad-teams` (minutos programados de un correo específico en un rango de fechas). Ambas son invocadas por HTTP directamente desde el frontend (no hay evidencia de cron; están registradas en `supabase/config.toml` con `verify_jwt = false`, es decir, accesibles sin token de sesión Supabase). Sólo hablan con Microsoft Graph (Entra ID para el token, y el API de Teams Shifts/Users) — no tocan la base de datos de Supabase.

## Archivos

| Archivo | Rol |
|---|---|
| `obtener-disponibilidad-hoy/index.ts` | Endpoint `GET`/`POST` que devuelve todos los turnos del equipo de Teams para "hoy" (hora de Bogotá) y marca cuál agente está activo en el instante de la consulta. |
| `obtener-disponibilidad-teams/index.ts` | Endpoint `POST` que, dado un correo y un rango `inicio`/`fin`, calcula los minutos totales programados de esa persona en Teams Shifts dentro de ese rango. |

## Funciones y constantes clave

### `obtener-disponibilidad-hoy/index.ts`
- **`getGraphToken()`**: obtiene token OAuth `client_credentials` contra `login.microsoftonline.com/{AZURE_TENANT_ID}` usando `TEAMS_GRAPH_CLIENT_ID`/`TEAMS_GRAPH_CLIENT_SECRET` y scope `https://graph.microsoft.com/.default`.
- **`graphGet<T>(token, pathOrUrl)`**: wrapper genérico de `fetch` a Graph v1.0; acepta tanto un path relativo como una URL absoluta (para seguir `@odata.nextLink`).
- **`getShiftItem(shift)`**: prioriza `sharedShift` (turno publicado) sobre `draftShift` (borrador no publicado aún).
- **`fetchAllShifts(token, teamId)`**: pagina `/teams/{teamId}/schedule/shifts` siguiendo `@odata.nextLink` hasta agotar resultados.
- **`resolveUsers(token, userIds)`**: resuelve en paralelo (`Promise.all`) el `displayName`/`mail` de cada `userId` único vía `/users/{id}?$select=id,displayName,mail,userPrincipalName` — es decir, una llamada Graph por usuario distinto con turno hoy (sin batch).
- **`getColombiaDateKey(date)`**: obtiene la fecha "hoy" en zona `America/Bogota` usando `Intl.DateTimeFormat` (a diferencia de `monitor-ticket-expirations`, aquí sí se usa la API de Intl con IANA timezone en vez de un offset fijo).
- **Handler `Deno.serve`**: acepta `teamId` desde el body (`POST`), query string (`GET`) o variable de entorno `TEAMS_SCHEDULE_TEAM_ID` (en ese orden de precedencia); filtra los turnos que solapan con el rango del día actual; retorna `turnosHoy` (lista ordenada) y `personaDisponibleAhora` (el turno cuyo rango contiene el instante actual, o `null`).
- **Constantes**: `corsHeaders` con `Access-Control-Allow-Origin: *` (abierto a cualquier origen).

### `obtener-disponibilidad-teams/index.ts`
- **`parseDate(value, name)`**: valida formato estricto `YYYY-MM-DD`, lanza error si no cumple.
- **`escapeODataValue(value)`**: escapa comillas simples para uso seguro en filtros OData.
- **`getGraphToken()` / `graphGet<T>()` / `getShiftItem()`**: implementaciones prácticamente idénticas a las de `obtener-disponibilidad-hoy` (código duplicado, ver hallazgos).
- **Handler `Deno.serve`**: exige `POST`; valida `correo` (string no vacío), `inicio`/`fin` (fechas válidas, `fin >= inicio`); resuelve el `userId` de Entra ID buscando por `mail` o `userPrincipalName` vía `$filter` OData; pagina todos los turnos del `TEAMS_SCHEDULE_TEAM_ID`, filtra los del usuario resuelto que solapan el rango solicitado, recorta (`clip`) cada turno a los límites del rango, y suma los minutos resultantes (`minutosProgramados`).
- **Constantes**: mismo patrón de `corsHeaders`, pero `Access-Control-Allow-Methods: POST, OPTIONS` (no admite `GET`).

## Flujo del módulo

Ambas funciones siguen el mismo patrón general, típico de un endpoint HTTP síncrono invocado bajo demanda (no hay cron ni webhook configurado para estas dos; `supabase/config.toml` las declara con `verify_jwt = false`, lo que sugiere que están pensadas para ser llamadas directamente desde el frontend sin pasar por el JWT de sesión de Supabase):

1. **Preflight CORS**: ambas responden `OPTIONS` con `200 ok` y los `corsHeaders` correspondientes.
2. **Validación de método**: `obtener-disponibilidad-hoy` acepta `GET`/`POST`; `obtener-disponibilidad-teams` sólo `POST`. Método no soportado → `405`.
3. **Validación de entrada**: se valida `teamId`/`correo`/`inicio`/`fin` según el endpoint; errores de validación se lanzan como `Error` y terminan en el mismo bloque `catch` genérico que cualquier otro fallo (no hay diferenciación de status code — todo error, de validación o de Graph, responde `500`).
4. **Autenticación con Graph**: `client_credentials` contra Azure AD (una llamada HTTP por invocación, sin cacheo de token entre invocaciones).
5. **Consulta a Graph**: se listan/paginan los turnos (`/teams/{id}/schedule/shifts`) y, según el endpoint, se resuelven usuarios o se filtra por un usuario específico.
6. **Cálculo en memoria**: filtrado de turnos por rango de fechas, cálculo de solapamiento y (en `obtener-disponibilidad-teams`) recorte de los límites del turno al rango solicitado.
7. **Respuesta**: JSON con `ok: true` y los datos calculados, o `ok: false` + `error` con status `500` ante cualquier excepción. `console.error` registra el fallo con el nombre de la función y el mensaje de error, sin más contexto estructurado (no se loguea el `teamId`/`correo` involucrado, dificultando la depuración en producción).

## Dependencias

- **Deno runtime**: `Deno.env`, `Deno.serve`, `fetch` nativo, `URLSearchParams`, `Intl.DateTimeFormat`.
- **Sin `@supabase/supabase-js`**: estas dos funciones no tocan Supabase Postgres/Storage en absoluto, a diferencia del resto del módulo de Edge Functions.
- **Microsoft Graph**: llamadas `fetch` directas, sin SDK, a `login.microsoftonline.com` y `graph.microsoft.com/v1.0` (Teams Shifts API, Users API).
- **Variables de entorno**: `AZURE_TENANT_ID`, `TEAMS_GRAPH_CLIENT_ID`, `TEAMS_GRAPH_CLIENT_SECRET`, `TEAMS_SCHEDULE_TEAM_ID` (requerida salvo que se pase `teamId` explícito en `obtener-disponibilidad-hoy`).
- **Tipos**: ambos archivos definen sus propios tipos locales (`GraphTokenResponse`, `GraphUser`, `ShiftItem`, `TeamsShift`, `GraphCollection<T>`) de forma duplicada e independiente entre sí y respecto de `monitor-ticket-expirations/types.ts` — no hay un módulo compartido de tipos de Graph dentro de `supabase/functions/`.
- No se detecta relación directa con `src/Models/*` del frontend; el frontend probablemente consume estos endpoints como JSON crudo sin tipos compartidos.

## Oportunidades de mejora

- **Duplicación casi total de código entre ambas funciones**: `getGraphToken`, `graphGet`, `getShiftItem`, `corsHeaders`, `getRequiredEnv` y los tipos de Graph (`GraphTokenResponse`, `ShiftItem`, `TeamsShift`, `GraphCollection`) están copiados y pegados entre `obtener-disponibilidad-hoy/index.ts` y `obtener-disponibilidad-teams/index.ts` casi línea por línea, y son además muy similares a las funciones de autenticación de Graph en `monitor-ticket-expirations/graph.ts`, `process-emails/graph.ts` y `sync-sharepoint-list/index.ts`. Es el caso más claro del monorepo para extraer un módulo `_shared` (autenticación Graph + fetch genérico + tipos de Teams Shifts) e importarlo desde las cinco funciones.
- **Sin caché de token de Graph**: cada invocación HTTP solicita un token nuevo a Azure AD, incluso si el endpoint se llama repetidamente en cortos intervalos (por ejemplo, un dashboard que hace polling). Esto añade latencia y consumo de cuota de Azure AD innecesarios; un caché simple en memoria del *edge worker* con expiración según `expires_in` reduciría llamadas.
- **`Access-Control-Allow-Origin: "*"` sin autenticación (`verify_jwt = false`)**: ambos endpoints exponen información operativa (quién está de turno, correos, minutos trabajados) a cualquier origen sin requerir el JWT de Supabase. Combinado con CORS abierto, cualquier sitio web podría invocar estos endpoints desde el navegador de un usuario autenticado en el dominio, o simplemente cualquier script con la URL pública podría consultarlos. Vale la pena evaluar si `verify_jwt` debería ser `true` o si se necesita otra capa de autorización (por ejemplo, validar un header propio) dado que se expone PII (correos, horarios).
- **Resolución de usuarios sin batch (`obtener-disponibilidad-hoy`)**: `resolveUsers` hace una llamada Graph por cada `userId` único (`Promise.all` de N requests). Con equipos grandes o muchos turnos simultáneos, esto puede acercarse a los límites de *throttling* de Graph; el endpoint de Graph `$batch` permitiría resolver hasta 20 usuarios en una sola llamada HTTP.
- **Manejo de errores no diferenciado**: errores de validación de entrada (por ejemplo, `correo is required`, fechas mal formadas) responden con status `500` igual que un fallo real de Graph, en vez de `400 Bad Request`. Esto dificulta que el frontend distinga errores de usuario de errores de infraestructura.
- **Logging mínimo**: `console.error("obtener-disponibilidad-hoy failed", { error: reason })` no incluye el `teamId`, la fecha calculada, ni el `correo`/rango consultado en `obtener-disponibilidad-teams`, lo que complica diagnosticar fallos en producción sin poder correlacionar con la solicitud original.
- **Sin pruebas**: la lógica de solapamiento de rangos y recorte de turnos (`obtener-disponibilidad-teams`) tiene aritmética de fechas con casos de borde (turnos que cruzan medianoche, rangos invertidos) sin cobertura de test visible.
- **Límite de tiempo de ejecución no considerado**: si un equipo de Teams tiene muchísimos turnos programados (paginación potencialmente extensa vía `@odata.nextLink`), ambas funciones recorren *todas* las páginas de forma secuencial antes de responder; no hay límite de páginas ni timeout explícito.
