# Módulo Tickets

## Descripción general

El módulo Tickets es el núcleo del helpdesk: cubre todo el ciclo de vida de un caso de soporte, desde su creación (por un agente o por autoservicio del usuario final) hasta su cierre, pasando por reasignación, recategorización, escalamiento a proveedores externos (internet en tiendas), generación de actas de entrega de equipos, adjuntos, observadores y el log/seguimiento de cada acción. Arquitectónicamente vive en `src/Funcionalidades/Tickets` como una capa de hooks de React que orquesta llamadas a `src/repositories/TicketsRepository` (que abstrae si el backend real es SharePoint o Supabase) y a otros repositorios/servicios (`LogRepository`, `UsuariosRepository`, `AttachmentsRepository`, `ANSRepository`, servicios de Graph como `Sociedades.service`, `InternetTiendas.service`, `Compras.service`). Además dispara efectos externos: correos vía un microservicio propio (`api-envio-correos`), flujos de Power Automate (`FlowClient`) para reasignación/escalamiento/actas/carga masiva, y almacenamiento de adjuntos en Supabase Storage. Los componentes en `src/components/Tickets`, `DetallesTickets`, `NuevoTicket*`, `Documentar`, `MasiveNonFather` son los consumidores de UI que se apoyan en estos hooks para no tener lógica de negocio propia.

## Archivos

| Archivo | Qué hace |
|---|---|
| `ActaEntrega.ts` | Hook `useActaEntrega`: formulario y emisión del acta de entrega de equipos (crea registro en lista `ActasEntrega` y dispara un Flow que genera/envía el documento). |
| `AttachmentsTickets.ts` | Hook `useTicketsAttachments`: carga y normaliza adjuntos de un ticket/seguimiento desde el repositorio de Supabase, resolviendo URLs públicas de Storage. |
| `CambiarFuente.ts` | Hook `useCambiarFuenteSolicitante`: cambia el campo "Fuente" (canal de origen) del ticket. |
| `Documentar.ts` | Hook `useDocumentarTicket`: registra documentación/seguimiento o solución, adjunta archivo opcional, y si es solución cierra el ticket, actualiza casos de compra asociados y notifica al solicitante. |
| `Escalamiento.ts` | Hook `useEscalamiento`: escala una falla de internet de tienda al proveedor (Tigo/Claro) vía Flow, con datos de tienda/sociedad precargados. |
| `Log.ts` | Hook `useTicketLogs`: carga el historial de seguimientos (log) de un ticket. |
| `NuevoTicket.ts` | Hooks `useNuevoTicketForm` (creación por agente, con ANS/SLA, catálogos y balanceo de carga) y `useNuevoUsuarioTicketForm` (autoservicio, asignación automática de resolutor). |
| `Observador.ts` | Hook `useAsignarObservador`: asigna un observador/watcher al ticket. |
| `Reasignar.ts` | Hook `useReasignarTicket`: reasigna el ticket a otro resolutor vía Flow y registra el log. |
| `Recategorizar.ts` | Hook `useRecategorizarTicket`: cambia categoría/subcategoría/artículo, recalcula ANS/fecha máxima y notifica al solicitante. |
| `TicketsRelaciones.ts` | Hook `useTicketsRelacionados`: carga el ticket padre y los tickets hijos de un ticket. |
| `hooks/ticketHooks.types.ts` | Tipos compartidos de los hooks de listado/formulario/acciones (`UseTicketsParams`, `TicketSort`, `TicketFilterMode`, etc.). |
| `hooks/useTicketActions.ts` | Hook `useTicketActions`: relacionar tickets padre/hijo, refrescar un ticket, enviar archivo a un Flow, y disparar la carga masiva desde Excel. |
| `hooks/useTicketForm.ts` | Hook `useTicketForm`: estado del formulario "relacionador" (selección de ticket a vincular) y utilitario para construir opciones de combobox de tickets. |
| `hooks/useTickets.ts` | Hook compuesto `useTickets`: combina `useTicketsLists` + `useTicketForm` + `useTicketActions` en una sola API para la pantalla principal de tickets. |
| `hooks/useTicketsLists.ts` | Hook `useTicketsLists`: listado paginado/ordenado/filtrado de tickets, contadores de estado, y resolución de correos de un grupo de AAD para el rol "Jefe de zona". |
| `utils/CalcularMinutos.ts` | Función `calcularMinutos`: calcula minutos nocturnos, dominicales, festivos y totales entre apertura y ahora. **No se usa en ningún otro archivo del repositorio.** |
| `utils/importTicketsFromExcel.ts` | Función `importTicketsFromExcel`: parsea un Excel (SheetJS) y crea tickets fila por fila. |
| `utils/notifications.ts` | Helpers de notificación por correo para todo el ciclo de vida del ticket (creación, cierre, cambio de categoría, comentarios y menciones). |
| `utils/ticketAssignment.ts` | Helpers de asignación de resolutor: `increaseResolverCaseCount`, `pickTecnicoConMenosCasos`, `balanceCharge`. |
| `utils/ticketConstants.ts` | Constantes: `TIENDAS_GROUP_ID`, `horasPorANS`, `ESTADO_EN_ATENCION`, `ESTADO_FUERA_TIEMPO`. |
| `utils/ticketMappers.ts` | Normalizadores `mapCategoria`, `mapSubCategoria`, `normalizeAttachmentsResponse`. **No se usan en ningún otro archivo.** |
| `utils/ticketPayloads.ts` | Función `buildNuevoUsuarioTicketPayload` para construir el payload de un ticket de autoservicio. **No se usa en ningún otro archivo.** |
| `utils/ticketRelation.ts` | Función `relateTickets` para vincular ticket padre/hijo. **No se usa en ningún otro archivo.** |
| `utils/ticketValidators.ts` | Función `validateNuevoTicket` para validar el formulario de nuevo ticket. **No se usa en ningún otro archivo.** |
| `utils/ticketsColors.ts` | Función `calcularColorEstado`: color del indicador de estado en el listado según SLA restante. |
| `utils/ticketsFilters.ts` | Función `buildTicketsReportFilter` (filtro OData por rango de fecha `Created`). **No se usa en ningún otro archivo.** |

## Funciones y constantes clave

### Creación de tickets (`NuevoTicket.ts`, `utils/ticketPayloads.ts`, `utils/ticketAssignment.ts`)

- **`useNuevoTicketForm(services)`**: hook principal usado por agentes para crear tickets. Carga catálogos (Categorías/Subcategorías/Artículos) y festivos al montar. `validate()` exige solicitante, resolutor, fuente, motivo, descripción y categoría. `handleSubmit(e, ansProps)` calcula el ANS (`calculoANS`) y la fecha máxima de solución (`calcularFechaSolucion`, usando un mapa local `horasPorANS` de 2/4/8/56/240 horas para ANS 1-5), arma el `Ticket`, llama a `Tickets.createTicket`, incrementa el contador de casos del resolutor (`updateTicketsNumber`, actualiza `Numerodecasos` en la lista de Usuarios), sube adjuntos a Supabase Storage bajo `/{ticketId}/Creacion/{archivo}` y crea un registro de adjunto por cada uno, crea un log de tipo "Creacion", y notifica por correo a solicitante y resolutor (`notifyTicketCreatedSolicitante`/`notifyTicketCreatedResolutor`). También expone `balanceCharge`, una copia local de la lógica de balanceo de carga.
- **`useNuevoUsuarioTicketForm(services)`**: variante de autoservicio (usuario final). SLA fijo de 2.5 horas, resolutor elegido automáticamente vía `pickTecnicoConMenosCasos`, misma lógica de adjuntos/log/notificación, usa `alert()` en vez de `toast` para confirmar creación.
- **`pickTecnicoConMenosCasos(Usuarios)`** (`ticketAssignment.ts`): trae técnicos con estado "Disponible", calcula el mínimo de `Numerodecasos` y elige aleatoriamente entre los empatados en el mínimo.
- **`balanceCharge(Usuarios, targetId, maxDiff=3)`** (`ticketAssignment.ts`): valida que asignar un caso más al `targetId` no supere `maxDiff` casos de diferencia contra el técnico con menos carga. Existe una segunda implementación casi idéntica, inline, dentro de `useNuevoTicketForm` (usa `UsuariosSPService` en vez de `UsuariosSPRepository` y agrega una excepción para `fuente === "Disponibilidad"`).
- **`buildNuevoUsuarioTicketPayload`** (`ticketPayloads.ts`): construye el payload de ticket de autoservicio reutilizando `pickTecnicoConMenosCasos`; no se usa, la lógica está duplicada inline en `NuevoTicket.ts`.

### Reasignación, recategorización, cambio de fuente, observador, escalamiento

Estos cinco archivos comparten una forma casi idéntica (hook con `state`/`errors`/`submitting`, `setField`, `validate`, `handle*`) pero cada uno reimplementa el patrón de log y actualización desde cero:

| Hook | Efecto principal | Mecanismo de actualización | Log generado |
|---|---|---|---|
| `useReasignarTicket` (`Reasignar.ts`) | Reasigna resolutor | Busca IDs de candidato/solicitante en lista Usuarios por correo (OData, con `escapeOData` manual) y envía un **Flow de Power Automate** (URL con SAS hardcodeada) | `"Reasignación de caso"` |
| `useRecategorizarTicket` (`Recategorizar.ts`) | Cambia categoría/subcategoría/artículo | Recalcula ANS/fecha máxima y llama `Tickets.updateTicket` directo con payload `ticket_solvi_*` (nombres de columna Supabase) | No crea log explícito (solo notifica por correo) |
| `useCambiarFuenteSolicitante` (`CambiarFuente.ts`) | Cambia campo Fuente | `Tickets.updateTicket` directo con `{ ticket_solvi_fuente }` | No crea log |
| `useAsignarObservador` (`Observador.ts`) | Asigna observador | `Tickets.updateTicket` directo con `{ Observador, CorreoObservador }` (nombres de campo tipo `Ticket`, no snake_case) | `"Asignacion observador"` |
| `useEscalamiento` (`Escalamiento.ts`) | Escala falla de internet de tienda a proveedor | No toca el ticket; llama `IntTiendasSvc`/`SociedadesSvc` para precargar datos y envía un **Flow** con adjuntos en base64 | `"seguimiento"` |

- **`useEscalamiento`** valida que haya al menos un adjunto de prueba, procesa hasta `MAX_FILES=10` archivos de máx. `MAX_MB=3` cada uno, tipos permitidos `image/png`, `image/jpeg`, `application/pdf` (`handleFiles`, `fileToBase64`), y decide el correo destino (`soportecnicoempresarial@tigo.com.co` o `cliente.co@claro.com.co`) por texto plano `state.proveedor.toLowerCase()`.

### Documentación y cierre (`Documentar.ts`)

- **`useDocumentarTicket(services)`**: `handleSubmit(e, tipo, ticket, account)` con `tipo` = `"solucion" | "seguimiento"`. Exige documentación de mínimo 50 caracteres. Antes de crear el log revisa que no exista ya una solución previa para ese ticket (`Logs.loadLogs({ tipo_accion: "Solucion" })`) y bloquea una segunda solución. Si hay archivo, lo sube a Supabase Storage (bucket `ticket-attachments`, ruta `{ticketId}/Documentacion/{archivo}`) y crea el registro de adjunto asociado al log recién creado. Si `tipo === "solucion"`: actualiza el ticket a `Cerrado` o `Cerrado fuera de tiempo` (según `Estadodesolicitud` actual) con `FechaCierreReal`; si la fuente es "disponibilidad" detiene el contador de tiempo (`useContador().stopFinishedTicketCounter`); marca como "Pendiente por registro de factura" los casos de Compras vinculados por `IdCreado`/`IdEntrega`; y notifica el cierre al solicitante con el texto de la solución (`notifyClosedSolicitante`).

### Actas de entrega (`ActaEntrega.ts`)

- **`useActaEntrega(ticketId)`**: modela un formulario dinámico según `tipoUsuario` (`ENTREGAS_BY_TIPO`: administrativo, diseño, tienda) que determina qué ítems se pueden entregar (Computador, Monitor, Mouse, etc.). `crearDetalleDefault` genera el detalle base de cada ítem; hay tratamiento especial para "Computador"/"CPU" (`ITEMS_CON_TIPO_COMPUTADOR`) que exige elegir tipo de computador. `sociedadFromEmail` deriva la franquicia (`MV`/`DH`/`MG`/`EDM`) del dominio de correo de quien recibe — regla de negocio hardcodeada. `emitirActa()` crea el registro en la lista `ActasEntrega`, arma un payload plano `Campos` con hasta 12 ítems (`Marca_1..12`, `Referencia_1..12`, `Serial_1..12`, `Descripcion_1..12`, `Proveedor_1..12`, `Prueba_1..12`, rellenando con el literal `"-------"` cuando falta dato) y lo envía a un Flow de Power Automate que genera/envía el documento para firma.

### Relaciones entre tickets (`TicketsRelaciones.ts`, `hooks/useTicketActions.ts`, `utils/ticketRelation.ts`, `hooks/useTicketForm.ts`)

- **`useTicketsRelacionados(TicketsSvc, ticket)`**: obtiene el ticket padre (`ticket.IdCasoPadre` → `getTicketById`) y los hijos (`loadTickets({ padreId })`), recargando cuando cambia el ticket.
- **`useTicketForm({ TicketsSvc })`**: estado del selector "relacionador" y `toTicketOptions` que trae hasta 999 tickets (`orderby: "Id desc"` por defecto) y los mapea a `{ value, label }`, deduplicando por id.
- **`useTicketActions.handleCreateRelation(actualId, relatedId, type)`**: para `type==="padre"` actualiza el ticket actual con `{ ticket_solvi_id_casopadre: relatedId }`; para `type==="hijo"` actualiza el relacionado con `{ ticket_solvi_id_casopadre: actualId }`; `type==="masiva"` lanza `Error("Relación 'masiva' aún no implementada")`. Esta es la implementación realmente usada por la UI.
- **`relateTickets`** (`ticketRelation.ts`) implementa lo mismo pero con el campo `IdCasoPadre` (PascalCase) en vez de `ticket_solvi_id_casopadre` — **no se usa**, y de usarse junto al repositorio Supabase probablemente no tendría efecto (ver Oportunidades de mejora).
- **`useTicketActions.uploadMasiva(file)`**: envuelve `importTicketsFromExcel` en `toast.promise` para dar feedback de carga masiva desde Excel.
- **`useTicketActions.sendFileToSupabase(file, uploader)`**: nombre engañoso — en realidad convierte el archivo a base64 y lo envía a un Flow de Power Automate (`FLOW_URL` hardcodeada), no sube nada directo a Supabase.

### Adjuntos (`AttachmentsTickets.ts`, `utils/ticketMappers.ts`)

- **`useTicketsAttachments()`**: `loadAttachments(filter)` exige al menos `attachment_type`, `id_ticket` o `id_seguimiento`; delega en el repositorio de adjuntos de Supabase, resuelve la URL pública vía `supabase.storage.from(bucket).getPublicUrl(...)` cuando el path no es ya una URL absoluta, y deduplica por link.
- **`normalizeAttachmentsResponse`** (`ticketMappers.ts`) es un normalizador equivalente pero para una forma de fila distinta (`name`/`url`/`AbsoluteUri`, estilo lista SharePoint) — no se usa; parece resto de una implementación anterior a la migración a Supabase.

### Log/seguimiento (`Log.ts`)

- **`useTicketLogs(LogSvc)`**: `loadFor(idTicket)` filtra por `seguimientos_solvi_id_ticket`; en caso de error deja `rows=[]` pero igual fija `currentTicketId`, lo que permite que `reload()` reintente sobre el mismo ticket.

### Hooks de composición para la UI (`hooks/useTickets.ts`, `useTicketsLists.ts`, `useTicketActions.ts`, `useTicketForm.ts`)

- **`useTickets({ graph, TicketsSvc, userMail, role })`**: combina los tres hooks de abajo, unificando `loading` (OR de ambos) y `error` (prioriza el de acciones sobre el de listado).
- **`useTicketsLists({ graph, TicketsSvc, userMail, role })`**: es el hook más complejo del módulo.
  - Estado: `filterMode` (`"En curso" | "Cerrados" | "Todos"`), `range` (rango de fechas, por defecto últimos 2 meses vía `getXMonthsBackRange`), `me` (toggle "solo mis tickets"), `fuenteFilter`, paginación (`pageSize`, `pageIndex`, `hasNext`, `totalFiltered`), `sorts` (multi-columna, `toggleSort` con soporte "aditivo"), `search` con debounce de 250 ms.
  - `buildTicketsFilter(...)` traduce ese estado a `filterTickets` del repositorio; fuerza `currentUser = userMail` si `me` está activo **o si el rol no es "Administrador"** (es decir, cualquier rol no-admin siempre queda acotado a sus propios tickets, sin importar el toggle `me`).
  - `loadAll()` llama `TicketsSvc.loadTickets` paginado y en paralelo `TicketsSvc.countTickets` para "En Atención" y "Fuera de tiempo" (dos llamadas adicionales en cada refresco).
  - Para el rol `"Jefe de zona"` dispara `collectZoneEmails(graph)`, que pagina `/groups/{TIENDAS_GROUP}/members` vía Graph (`getAbsolute` siguiendo `@odata.nextLink`) para obtener los correos del grupo de tiendas; el resultado (`zoneEmails`) se expone pero **no se usa para filtrar** en `buildTicketsFilter` ni se consume en la UI (`Tickets.tsx`).
  - Un `criteriaKey` (JSON.stringify de todos los criterios) compara contra `previousCriteriaRef` para decidir si primero resetear `pageIndex` a 1 (y salir sin cargar) o cargar directamente — evita doble fetch al cambiar filtros mientras hay paginación activa.
- **`useTicketActions`** y **`useTicketForm`**: ver secciones anteriores.

### Utilidades de fecha/minutos/SLA

- **`calcularMinutos(fechaApertura)`** (`utils/CalcularMinutos.ts`): recorre día a día desde la apertura hasta "ahora", sumando minutos nocturnos (19:00–24:00), dominicales y festivos (usando `fetchHolidays()`), más el total transcurrido. No tiene ningún llamador en el repositorio.
- **`horasPorANS`** en `utils/ticketConstants.ts`: `{ "ANS 1": 5, "ANS 2": 81, "ANS 3": 135 }` — **no se importa en ningún lugar**. Los cálculos reales de SLA en `NuevoTicket.ts` y `Recategorizar.ts` usan un mapa local, distinto e inconsistente: `{ "ANS 1": 2, "ANS 2": 4, "ANS 3": 8, "ANS 4": 56, "ANS 5": 240 }`.
- **`calcularColorEstado(ticket)`** (`utils/ticketsColors.ts`): usada en `Tickets.tsx` para el punto de color del listado. Negro para cerrados; rojo si faltan fechas o ya venció; degradado verde→naranja→rojo según el porcentaje de horas restantes contra el total de la ventana ANS (`horasRestantes / horasTotales`), con `alpha` creciente a medida que se agota el tiempo.

### Filtros e importación

- **`buildTicketsReportFilter(from, to)`** (`utils/ticketsFilters.ts`): construye un filtro OData (`fields/Created ge ... and le ...`, `top: 2000`) pensado para un reporte por rango de fechas contra SharePoint directo; no tiene llamadores.
- **`importTicketsFromExcel({ file, TicketsSvc })`**: usa SheetJS (`xlsx`) para leer la primera hoja, normaliza encabezados (quita tildes, minúsculas, colapsa espacios) y los mapea vía `HEADER_ALIASES`. Crea los tickets **secuencialmente** (`for...of` con `await` dentro del loop, sin `Promise.all`) y acumula `created`/`processed`/`skipped`/`errors` por fila.

### Notificaciones (`utils/notifications.ts`)

Todas envían HTML por correo a través de un microservicio propio (`POST https://api-envio-correos-*.azurewebsites.net/mail/send`), con remitente fijo `listo@estudiodemoda.com.co`:

- `notifyTicketCreatedSolicitante` / `notifyTicketCreatedResolutor`: aviso de creación de caso.
- `notifyClosedSolicitante(ticket, detalleSolucion)`: aviso de cierre, incrusta el texto de la solución tal cual.
- `notifySolicitanteCategoryChange(prevTicket, newCategoria)`: aviso de recategorización con categoría anterior/nueva.
- `notifyConversationComment` / `notifyCommentMention`: notificación de comentarios y menciones en la conversación del ticket, con `escapeHtml` aplicado al fragmento de comentario y un botón "Ver ticket en Prisma" (URL base `https://prisma.estudiodemoda.co/integracion/solvi/tickets` hardcodeada).

### Constantes clave (resumen)

| Constante | Archivo | Valor / propósito |
|---|---|---|
| `TIENDAS_GROUP_ID` | `utils/ticketConstants.ts` | `e06961ff-...` ID del grupo AAD "Tiendas"; **duplicado** como literal `TIENDAS_GROUP` en `hooks/useTicketsLists.ts` en vez de importarse. |
| `horasPorANS` | `utils/ticketConstants.ts` | Mapa ANS→horas SLA; no se usa (ver arriba, hay dos copias divergentes inline). |
| `ESTADO_EN_ATENCION` / `ESTADO_FUERA_TIEMPO` | `utils/ticketConstants.ts` | Strings de estado; solo `ESTADO_EN_ATENCION` se usa, y únicamente en `ticketPayloads.ts` (que a su vez no se usa). |
| `ENTREGAS_BY_TIPO`, `ITEMS_CON_TIPO_COMPUTADOR`, `VACIO` | `ActaEntrega.ts` | Ítems de entrega por tipo de usuario, ítems que requieren tipo de computador, placeholder `"-------"` para campos vacíos del acta. |
| `MAX_MB`, `MAX_BYTES`, `ALLOWED`, `MAX_FILES` | `Escalamiento.ts` | Límites de adjuntos de prueba (3 MB, PNG/JPEG/PDF, máx. 10 archivos). |
| `TICKETS_ATTACHMENTS_BUCKET` | `Documentar.ts`, `NuevoTicket.ts` | `"ticket-attachments"`, bucket de Supabase Storage; definida por separado (duplicada) en cada archivo. |
| URLs de `FlowClient` (Power Automate) | `ActaEntrega.ts`, `Escalamiento.ts`, `Reasignar.ts`, `hooks/useTicketActions.ts` | Endpoints HTTP-trigger de Power Automate con firma SAS embebida directamente en el código fuente. |

## Flujo del módulo

1. **Creación**: un agente usa `useNuevoTicketForm` (o el usuario final `useNuevoUsuarioTicketForm`) → se calcula ANS/SLA con festivos → `TicketsRepository.createTicket` → se suben adjuntos de creación a Supabase Storage → se incrementa el contador de casos del resolutor → se crea un log "Creacion" → se notifica por correo a solicitante y resolutor. Alternativamente, `useTicketActions.uploadMasiva` permite crear muchos tickets de una vez desde un Excel (`importTicketsFromExcel`), y `hooks/useTicketForm.toTicketOptions` alimenta selectores para vincular tickets existentes.
2. **Listado**: `useTicketsLists` (compuesto en `useTickets`) alimenta la tabla principal (`Tickets.tsx`) con paginación server-side, orden, búsqueda debounced, filtro por estado/rango/fuente y "solo mis tickets"; en paralelo trae contadores de "En Atención"/"Fuera de tiempo". `calcularColorEstado` colorea cada fila según cuánto SLA le queda.
3. **Gestión del caso** (desde `DetallesTickets`): sobre un ticket ya creado se puede:
   - **Reasignar** (`useReasignarTicket`) a otro resolutor, vía Flow + log.
   - **Recategorizar** (`useRecategorizarTicket`), lo que recalcula el ANS/fecha máxima y notifica al solicitante.
   - **Cambiar fuente** (`useCambiarFuenteSolicitante`).
   - **Asignar observador** (`useAsignarObservador`).
   - **Escalar** un problema de internet de tienda a un proveedor (`useEscalamiento`), lo cual no toca el ticket sino que dispara un correo/Flow al proveedor y registra un log.
   - **Relacionar** con otro ticket como padre/hijo (`useTicketActions.handleCreateRelation`, reflejado en `useTicketsRelacionados` para mostrar padre/hijos en la UI).
   - **Adjuntar** archivos y **consultarlos** (`useTicketsAttachments`), y **ver el log** de todo lo anterior (`useTicketLogs`).
4. **Documentación y cierre** (`useDocumentarTicket`): un resolutor agrega un "seguimiento" o, una única vez, la "solución". Al documentar la solución el ticket se cierra (`Cerrado`/`Cerrado fuera de tiempo` según si ya venció el SLA), se detiene el contador de tiempo si la fuente es "disponibilidad", se actualizan los casos de Compras asociados, y se notifica el cierre al solicitante con el texto de la solución.
5. **Acta de entrega** (`useActaEntrega`), un subflujo específico para cuando el ticket implica entrega de equipos: registra el acta en SharePoint y dispara un Flow que genera el documento para firma del receptor.

En conjunto, el ANS/SLA calculado en creación y recategorización determina `FechaMaxima`, que junto con `FechaApertura` alimenta tanto el color del listado (`ticketsColors.ts`) como los mensajes de "fecha máxima de solución" en las notificaciones. Los filtros del listado (`ticketsFilters` conceptual, implementado inline en `useTicketsLists.buildTicketsFilter`) determinan qué subconjunto de tickets ve cada rol (administrador ve todo, cualquier otro rol solo los propios salvo que se implemente algo con `zoneEmails`, que hoy no se aplica).

## Dependencias

**Internas:**
- `src/repositories/TicketsRepository` (`TicketRepository.ts` interfaz, `TicketsFromSupabase.ts`, `TicketsFromSharepoint.ts`) — abstracción CRUD/listado de tickets.
- `src/repositories/LogRepository`, `AttachmentsRepository`, `UsuariosRepository`, `AnsRepository` — vía `useRepositories()` (contexto de repositorios).
- `src/Services/*` — `Usuarios.Service`, `Sociedades.service`, `InternetTiendas.service`, `Compras.service`, `Festivos.ts`, `Supabase.service.ts` — vía `useGraphServices()` o import directo.
- `src/Models/*` — `Tickets`, `nuevoTicket`, `ActasEntrega`, `Internet`, `Sociedades`, `FlujosPA`, `Categorias`, `Commons`, `Filtros`, `Holiday`, `DTO/Tickets` (`SupabaseTickets`), `DTO/Log`.
- `src/Funcionalidades/shared/FlowClient.ts` — cliente para invocar flujos HTTP de Power Automate.
- `src/Funcionalidades/shared/UploadFileToSupabase.ts` — subida de archivos a Supabase Storage.
- `src/Funcionalidades/timeCounter/hooks/useCounter.ts` — contador de tiempo para tickets de "disponibilidad".
- `src/auth/authContext.ts` (MSAL) y `src/graph/GraphRest.ts` / `GrapServicesContext` — sesión e integración Graph.
- `src/utils/ans.ts`, `src/utils/Date.ts`, `src/utils/Commons.ts` — cálculo de ANS/fechas y utilidades varias.

**Externas:**
- `react` (hooks), `react-hot-toast` (notificaciones UI), `xlsx` (SheetJS, importación Excel), `date-fns` / `@date-fns/tz` (fechas), `@azure/msal-browser` (tipos de cuenta), Supabase JS client (`@supabase/supabase-js` vía `Supabase.service.ts`).

**Consumidores de UI evidentes** (confirmado por import en `src/components`):
`Tickets/Tickets.tsx` (listado), `NuevoTicket/NuevoTicketForm.tsx` y `NuevoTicketUsuario/NuevoTicketFormUsuario.tsx` (creación), `DetallesTickets/DetallesTickets.tsx` y `DetallesTickets.helpers.ts` (detalle), `DetallesTickets/Modals/{ChangeFuente,Recategorizar,Observador,Reasignar}.tsx`, `DetallesTickets/CaseAttachments.tsx`, `DetallesTickets/TicketsRelacionados/{Relacionados.tsx, RelacionarTickets/Relacionador.tsx}`, `Documentar/Documentar.tsx`, `Documentar/ActaEntrega/InformacionCaso/InfoActa.tsx`, `Documentar/EscalamientoProveedor/Escalamiento.tsx`, `MasiveNonFather/masiva.tsx` (carga masiva).

## Oportunidades de mejora

- **Inconsistencia real de nombres de campo al actualizar el ticket** (`payload: any` en `TicketsRepository.updateTicket` la esconde): `Observador.ts` actualiza con `{ Observador, CorreoObservador }` (PascalCase, forma `Ticket`); `CambiarFuente.ts`/`Recategorizar.ts` actualizan con `{ ticket_solvi_fuente }` / `{ ticket_solvi_categoria, ... }` (snake_case, forma `SupabaseTickets`); `hooks/useTicketActions.ts.handleCreateRelation` usa `ticket_solvi_id_casopadre`, mientras que el helper no usado `ticketRelation.ts` usa `IdCasoPadre`. Si el repositorio activo espera un único formato de campos, alguno de estos caminos puede estar fallando silenciosamente o dependiendo de un mapeo implícito no documentado. Tipar `updateTicket(id, payload: Partial<SupabaseTickets>)` (o el tipo que corresponda) en vez de `any` haría que TypeScript detectara esto.
- **SLA/ANS con dos fuentes de verdad distintas**: `utils/ticketConstants.ts.horasPorANS` define `ANS 1-3 = 5/81/135` horas y no se usa; `NuevoTicket.ts` y `Recategorizar.ts` definen cada uno, por separado, `ANS 1-5 = 2/4/8/56/240` horas. Si alguna vez se cambia el SLA de negocio hay que recordar tocarlo en dos archivos, y la constante "oficial" en `ticketConstants.ts` queda como trampa para quien la use pensando que es la vigente.
- **`zoneEmails` es una llamada a Graph que no se usa**: `hooks/useTicketsLists.ts.collectZoneEmails` pagina completo el grupo AAD de tiendas (`/groups/{id}/members`) para el rol "Jefe de zona" en cada carga, pero el resultado no se consume ni en `buildTicketsFilter` ni en ningún componente (`zoneEmails` no aparece en `src/components`). Es una llamada N+1/paginada a Graph que se ejecuta sin ningún efecto visible — o falta terminar de conectarla al filtro, o debería eliminarse.
- **UI optimista antes de confirmar la operación**: en `Documentar.ts.handleSubmit`, `toast.success("Caso cerrado. Enviando notificación al solicitante")` se dispara *antes* de `await Tickets.updateTicket(...)` (líneas ~111-115), y `setSubmitting(false)` ya se ejecutó unas líneas antes de que arranque toda la lógica de cierre (actualización de estado, casos de Compras, notificación). Si cualquiera de esos pasos falla, el `catch` solo hace `console.error` sin `setError` ni un toast de error — el usuario ve un mensaje de éxito aunque el cierre real haya fallado. Patrón similar en `Escalamiento.ts.handleSubmit`, donde `alert("Se ha iniciado el escalamiento de servicio de internet")` se muestra antes de intentar `notifyFlow.invoke(...)`.
- **Manejo de errores inconsistente y mezcla de mecanismos de UI**: convive `alert()` (`ActaEntrega.ts`, `Escalamiento.ts`, `NuevoTicket.ts`) con `react-hot-toast` (la mayoría de los demás archivos); varios `catch` solo hacen `console.error` sin exponer el error al usuario (`Documentar.ts`, `NuevoTicket.useNuevoUsuarioTicketForm.handleSubmit`). No hay un patrón único de manejo/propagación de errores en todo el módulo.
- **Tipado débil**: uso extendido de `any` (`services: Svc` con `getAll: (opts?: any) => Promise<any[]>` en `NuevoTicket.ts`/`Recategorizar.ts`, `updateTicket(id, payload: any)` en la interfaz del repositorio, `(base as any)[...]` en `ActaEntrega.ts.buildCampos`) y aserciones non-null (`account?.name!` en `Escalamiento.ts` líneas 98 y 141 — combina optional chaining con `!`, lo cual es contradictorio; `ticket.ID!` en `Documentar.ts`; `ticketCreated!.data?.ID` justo después de haber usado `ticketCreated?.data?.ID` con optional chaining en la misma función de `NuevoTicket.ts`).
- **Secretos/URLs sensibles hardcodeados en el código fuente**: las URLs de Flow de Power Automate en `ActaEntrega.ts`, `Escalamiento.ts`, `Reasignar.ts` y `hooks/useTicketActions.ts` incluyen la firma SAS (`sig=...`) completa embebida en el código, en vez de vivir en variables de entorno. Dado que el historial de git reciente incluye un commit "Secretos", convendría auditar si estas URLs deberían moverse a configuración.
- **Duplicación de lógica de negocio entre pares de archivos**: `NuevoTicket.ts` reimplementa `balanceCharge` y la asignación por menor carga en vez de reutilizar `utils/ticketAssignment.ts`; los cinco flujos de acción sobre un ticket (`Reasignar`, `Recategorizar`, `CambiarFuente`, `Observador`, `Escalamiento`) repiten el mismo esqueleto de hook (state/errors/submitting/validate/handle) sin ningún hook base compartido, lo que hace más caro mantener cambios transversales (p. ej. agregar un log uniforme a todos).
- **Nombres inconsistentes / mezcla ES-EN**: `sendFileToSupabase` (`hooks/useTicketActions.ts`) en realidad no sube nada a Supabase, envía el archivo en base64 a un Flow — el nombre confunde con `uploadImageToSupabase` (que sí sube a Supabase) usado en `Documentar.ts`/`NuevoTicket.ts`. Mezcla de idiomas en identificadores dentro del mismo archivo (`handleFiles`, `setField` en inglés junto a `handleReasignar`, `handleObservador`, `emitirActa` en español).
- **HTML sin sanitizar en correos**: en `utils/notifications.ts`, `notifyTicketCreatedSolicitante`, `notifyTicketCreatedResolutor`, `notifyClosedSolicitante` y `notifySolicitanteCategoryChange` interpolan campos del ticket (`AsuntoTicket`, `Solicitante`, `Categoria`, y en particular `detalleSolucion` que viene del texto libre de documentación) directamente en el HTML del correo sin `escapeHtml` (a diferencia de `notifyConversationComment`/`notifyCommentMention`, que sí lo aplican al fragmento de comentario). Si un usuario escribe HTML/scripts en el asunto o en la documentación de solución, se inyecta tal cual en el correo enviado.
- **Datos sensibles/PII en el log de seguimiento**: los mensajes de `seguimientos_solvi_descripcion` (p. ej. en `Reasignar.ts`, `Observador.ts`) incrustan nombres y, en la reasignación, el propio flujo maneja correos de candidato/solicitante — información personal quedando en texto libre dentro de una tabla de auditoría sin controles de acceso diferenciados evidentes en este módulo.
- **Riesgo de datos inconsistentes por lectura inmediata tras escritura**: en `Documentar.ts`, tras crear el log de solución, se vuelve a consultar `Logs.loadLogs({ tipo_accion: 'Solucion' })` y se accede a `solucion.data[0].Descripcion` sin comprobar que el arreglo tenga elementos — si la base (Supabase) tuviera cualquier lag de consistencia o el filtro no calzara, esto lanzaría un error no controlado (que además caería en el `catch` silencioso ya mencionado).
- **Falta de pruebas**: no se observó ningún archivo de test (`*.test.ts`/`*.spec.ts`) asociado a este módulo; toda la lógica de cálculo de SLA, balanceo de carga, importación de Excel y armado de payloads se valida solo manualmente.
- **Importación de Excel secuencial y con alias de encabezado sospechosos**: `importTicketsFromExcel` crea los tickets uno por uno con `await` dentro de un `for...of` (sin concurrencia ni límite de lote), lo que puede ser lento para archivos grandes; además `HEADER_ALIASES.asunto = ["solicitante"]` hace que la columna "Asunto" se lea del encabezado literal `"solicitante"` en el Excel, lo cual, si no es intencional, produciría que el asunto del ticket importado tome el valor pensado para el solicitante.
- **Zona horaria implícita**: `CalcularMinutos.ts` y `ticketsColors.ts` operan con `Date` local del navegador (`getFullYear/getMonth/getDate`, `setHours(19,0,0,0)`) sin normalizar explícitamente a la zona horaria de Colombia; si el helpdesk llegara a usarse desde otra zona horaria, el corte "nocturno" (19:00) y el corte de "domingo" cambiarían de significado.
