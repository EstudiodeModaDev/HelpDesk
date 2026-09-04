# Repositorios

## Descripción general
`src/repositories` implementa (parcialmente) un patrón repositorio: por cada entidad de negocio existe una interfaz TypeScript que define el contrato de acceso a datos, y una o más clases que la implementan contra un backend concreto (Microsoft Graph/SharePoint o Supabase). El objetivo es desacoplar la UI y la lógica de negocio (`src/Funcionalidades`, `src/components`) del origen de datos real, y permitir una migración progresiva de listas de SharePoint hacia tablas de Supabase sin tocar los consumidores. `repositoriesContext.tsx` es el punto único de composición: crea las instancias concretas y las expone a toda la app vía React Context (`useRepositories`).

## Archivos
- `src/repositories/AnsRepository/AnsRepository.ts` — contrato `ANSRepository` (tipos `propsANS`, `ANSLoadResult`).
- `src/repositories/AnsRepository/SharepointANS.ts` — única implementación de `ANSRepository`, contra la lista SharePoint "ANS".
- `src/repositories/AttachmentsRepostory/AttachmentRepository.ts` — contrato `AttachmentRepository` (tipos `filterAttachments`, `attachmentLoadResult`).
- `src/repositories/AttachmentsRepostory/AttachmentFromSupabase.ts` — única implementación, contra la tabla Supabase `TBL_Ticket_Attachments_Solvi`.
- `src/repositories/LogRepository/LogRespository.ts` — contrato `LogRepository` (tipos `filterLogRepository`, `logLoadResult`). *(nombre de archivo con error tipográfico: "Respository")*.
- `src/repositories/LogRepository/LogFromSupabase.ts` — única implementación, contra `TBL_Seguimientos_Solvi`.
- `src/repositories/ParticipantsRepository/MessagesRepository.ts` — contrato `MessagesRepository` (participantes, usuarios, comentarios de un ticket).
- `src/repositories/ParticipantsRepository/SupabaseMessageRepository.ts` — única implementación, sobre varias tablas Supabase (`TBL_Users`, `TBL_Solvi_Comments`, `TBL_Solvi_Participants`, `TBL_Solvi_Comment_Mentions`, `TBL_Ticket_Solvi`).
- `src/repositories/TicketsRepository/TicketRepository.ts` — contrato `TicketsRepository` (tipos `filterTickets`, `TicketsLoadResult`).
- `src/repositories/TicketsRepository/TicketsFromSharepoint.ts` — implementación `TicketsService` contra la lista SharePoint "Tickets" (CRUD + paginación por `@odata.nextLink`).
- `src/repositories/TicketsRepository/TicketsFromSupabase.ts` — implementación `SupabaseTicketRepository` contra `TBL_Ticket_Solvi`, con filtros, búsqueda, orden y paginación real.
- `src/repositories/UsuariosRepository/UsuariosSPRepository.ts` — contrato `UsuariosSPRepository`.
- `src/repositories/UsuariosRepository/UsuariosFromSharepoint.ts` — implementación `UsuariosSPFromSharepoint` contra la lista SharePoint "Usuarios".
- `src/repositories/repositoriesContext.tsx` — `RepositoriesProvider`/`useRepositories`: instancia y expone todos los repositorios anteriores.

## Funciones y constantes clave

| Contrato | Métodos | Implementación(es) existente(s) |
|---|---|---|
| `ANSRepository` | `loadANS(filter: propsANS): Promise<ANSLoadResult>` | `SharepointANS` (SharePoint) |
| `AttachmentRepository` | `loadAttachments(filter?)`, `createAttachment(payload)` | `AttachmentFromSupabase` (Supabase) |
| `LogRepository` | `loadLogs(filter?)`, `createLog(payload)` | `LogFromSupabase` (Supabase) |
| `MessagesRepository` | `fetchSolviParticipants`, `fetchAllUsers`, `fetchSolviComments`, `createSolviComment`, `deleteSolviComment` | `SupabaseMessageRepository` (Supabase) |
| `TicketsRepository` | `loadTickets(filter?)`, `createTicket`, `updateTicket`, `getTicketById`, `countTickets` | `TicketsService` (SharePoint, en `TicketsFromSharepoint.ts`) **y** `SupabaseTicketRepository` (Supabase) |
| `UsuariosSPRepository` | `loadUsuarios`, `createUsuario`, `inactivateUsuario`, `activateUsuario`, `getByEmail`, `getById`, `updateUsuario` | `UsuariosSPFromSharepoint` (SharePoint) |

Notas sobre implementaciones concretas relevantes:
- `SharepointANS`, `TicketsService` y `UsuariosSPFromSharepoint` comparten el mismo patrón interno: constructor con `hostname`/`sitePath`/`listName` por defecto apuntando a `estudiodemoda.sharepoint.com` + `/sites/TransformacionDigital/IN/HD`, métodos privados `loadCache()`/`saveCache()`/`ensureIds()` que resuelven y cachean `siteId`/`listId` en `localStorage` (clave `sp:{hostname}{sitePath}:{listName}`), y `toModel()` para mapear `fields` de Graph al modelo de dominio.
- `SupabaseTicketRepository.buildTicketsQuery` construye dinámicamente un query Supabase combinando `ticketStatus`, `fuente`, `range` (fecha), `padreId`, `resolutor`, `currentUser` (OR sobre resolutor/solicitante/observador) y `search` (OR `ilike` sobre título/solicitante/resolutor), con soporte de paginación (`pageIndex`/`pageSize`) o carga completa en lotes de `batchSize = 1000`.
- `SupabaseMessageRepository.createSolviComment` no solo inserta el comentario: valida autorización (admin, solicitante/resolutor o participante existente), inserta menciones (`TBL_Solvi_Comment_Mentions`), agrega participantes por mención (`upsert` en `TBL_Solvi_Participants`) y dispara notificaciones (`notifyConversationComment`, `notifyCommentMention`) — es decir, mezcla acceso a datos con lógica de negocio y efectos secundarios (notificaciones) dentro del repositorio.
- `RepositoriesProvider` (en `repositoriesContext.tsx`): crea un único `GraphRest` vía `useMemo` (dependiente de `getToken` de `useAuth()`) y compone `AppRepositories` también con `useMemo`.

## Flujo del módulo
1. `main.tsx` monta `<AuthProvider><RepositoriesProvider>...</RepositoriesProvider></AuthProvider>`, por lo que `RepositoriesProvider` puede consumir `useAuth()` para obtener `getToken` y construir el `GraphRest` compartido.
2. `repositoriesContext.tsx` decide la fuente de cada repositorio con una variable `RepositorySource = "supabase" | "sharepoint"` leída de la prop opcional `sources` (con valores por defecto hardcodeados si no se pasa `sources`):
   - `ticketsSource = sources?.tickets ?? "supabase"` → si es `"supabase"` crea `SupabaseTicketRepository()`, si no, **`null`**.
   - `usuariosSource = sources?.usuarios ?? "sharepoint"` → si es `"sharepoint"` crea `UsuariosSPFromSharepoint(graph)`, si no, **`null`**.
   - `attachmentsSource = sources?.attachments ?? "supabase"` → análogo, con `AttachmentFromSupabase()`.
   - `logsSource = sources?.logs ?? "supabase"` → análogo, con `LogFromSupabase()`.
   - `ans` y `messages` **no** son configurables: siempre `SharepointANS(graph)` y `SupabaseMessageRepository()` respectivamente.
3. Cualquier componente/hook de negocio llama `useRepositories()` (32 archivos lo consumen, ej. `src/App.tsx`, `src/Funcionalidades/Tickets/NuevoTicket.ts`, `src/Funcionalidades/Tickets/Documentar.ts`, `src/components/Tickets/Tickets.tsx`) y obtiene el objeto `AppRepositories` ya resuelto, sin saber si el dato viene de Graph o de Supabase.
4. El propio módulo `src/utils/ans.ts` (`calculoANS`) y varios flujos de tickets dependen de `ANSRepository` para resolver el nivel de SLA de un ticket nuevo.

Este diseño evidencia una **migración en curso de SharePoint hacia Supabase** más que un feature flag simétrico: Tickets es la única entidad con ambas implementaciones activas (SharePoint y Supabase) conviviendo en el código; el resto de entidades (ANS, Attachments, Log, Messages, Usuarios) ya solo tiene una implementación real, aunque el tipo `AppRepositories`/`RepositoriesProviderProps` sigue exponiendo la opción "otro origen" como si fuera intercambiable.

## Dependencias
- Internas: `src/graph/GraphRest.ts` (todas las implementaciones SharePoint), `src/Services/Supabase.service.ts` → `@supabase/supabase-js` (todas las implementaciones Supabase), `src/auth/authContext.tsx` (`useAuth` para el token), `src/utils/Commons.ts` (`esc` para escapar literales OData), tipos de `src/Models/*`.
- Externas: `@supabase/supabase-js` (cliente Supabase), Microsoft Graph REST v1.0 (vía `GraphRest`).

## Oportunidades de mejora
- **Fuente "muerta" para Tickets/Usuarios**: `repositoriesContext.tsx` nunca importa `TicketsService` (`TicketsFromSharepoint.ts`), solo `SupabaseTicketRepository`. Si algún día se pasa `sources={{ tickets: "sharepoint" }}`, `repositories.tickets` queda en `null` en tiempo de ejecución (el tipo `TicketsRepository | null` lo permite, pero ningún consumidor hace null-check exhaustivo, ej. `Funcionalidades/Tickets/NuevoTicket.ts` solo advierte con `toast.error("Tickets service no disponible...")` en algunos puntos). Simétricamente, no existe ninguna implementación Supabase de `UsuariosSPRepository`, por lo que `sources={{ usuarios: "supabase" }}` también produce `null` silenciosamente. Esto es un footgun: el tipo `RepositorySource` sugiere que ambas opciones son válidas para toda entidad, pero solo Tickets las tiene realmente implementadas.
- **Nulabilidad inconsistente en `AppRepositories`**: `tickets`, `usuarios`, `attachments`, `logs` son `T | null`, pero `ans` y `messages` son no-nulos — refleja que solo los primeros son "configurables", pero obliga a los consumidores a recordar cuáles repos necesitan chequeo de `null` y cuáles no, sin que el compilador lo fuerce de forma uniforme.
- **Duplicación de `ensureIds`/`loadCache`/`saveCache`**: `SharepointANS.ts`, `TicketsFromSharepoint.ts` y `UsuariosFromSharepoint.ts` reimplementan (copy-paste, incluyendo el mismo formato de clave de caché `sp:{hostname}{sitePath}:{listName}`) exactamente la misma lógica que ya existe como función exportada `ensureIds()` en `src/utils/Commons.ts`. Ninguna de las tres clases usa esa utilidad compartida, lo que triplica el código a mantener y el riesgo de que una de las tres copias diverja (bug en una y no en las otras).
- **Manejo de errores basado en forma de excepción de Graph que no existe**: `SharepointANS.loadANS` (líneas ~109-124) intenta capturar `e?.error?.code === 'itemNotFound'` para reintentar sin `$filter`, pero `GraphRest` (ver `docs/graph.md`) siempre lanza un `new Error(mensaje_string)` plano — nunca un objeto con `.error.code`. Esa rama de reintento es código muerto que nunca se ejecutará.
- **Filtro de `LogFromSupabase.loadLogs` con bug**: en `LogFromSupabase.ts` línea 20, el filtro por `tipo_accion` compara contra el campo equivocado: `query.eq("seguimientos_solvi_descripcion", filter.seguimientos_solvi_id_ticket)` — usa `seguimientos_solvi_id_ticket` (un id numérico) como valor para comparar contra la columna de descripción, en lugar de usar `filter.tipo_accion`. El filtro por tipo de acción nunca funciona correctamente.
- **Mezcla de responsabilidades**: `SupabaseMessageRepository.createSolviComment` combina persistencia, reglas de autorización y disparo de notificaciones (efectos colaterales de red) en un solo método de "repositorio", dificultando pruebas unitarias aisladas de la capa de datos.
- **Nombre de archivo/tipográficos**: `LogRepository/LogRespository.ts` tiene un typo ("Respository") que puede confundir búsquedas e imports; `AttachmentsRepostory` (carpeta) también tiene un typo ("Repostory").
- **`TicketsService.countTickets` no implementado**: en `TicketsFromSharepoint.ts`, `countTickets()` solo hace `console.log(...)` y lanza `Error("Method not implemented.")`; si alguna vez se usa el repositorio de tickets vía SharePoint, esta llamada rompe en producción sin fallback.
- **Falta de pruebas unitarias**: no se encontró ningún archivo de test para las clases de `src/repositories`; la lógica de armado de filtros dinámicos de `SupabaseTicketRepository.buildTicketsQuery` (combinaciones de `currentUser`/`search`/`or`) es especialmente propensa a errores silenciosos y se beneficiaría de tests.
- **Tipado débil en `updateTicket`**: `TicketsRepository.updateTicket(id: string, payload: any)` usa `any` para el payload, perdiendo el chequeo de tipos que sí tienen `createTicket`/`getTicketById`.
