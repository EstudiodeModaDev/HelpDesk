# Utilidades

## Descripción general
`src/utils` agrupa funciones puras y helpers transversales usados por repositorios, servicios y componentes: manejo de fechas flexibles, formateo numérico es-CO, escape de HTML, cálculo de SLA/ANS de tickets, reglas de menciones (@usuario) en comentarios y resolución de rol de usuario vía Microsoft Graph/SharePoint. No es un módulo cohesivo único, sino una colección de utilidades de dominios distintos (fechas, números, texto, negocio de ANS, negocio de menciones, negocio de roles) que conviven en la misma carpeta.

## Archivos
- `src/utils/Commons.ts` — utilidades genéricas: escape OData, resolución/caché de `siteId`/`listId` de SharePoint, normalización de texto, asignación de técnico con menos carga, conversión de archivos a base64, truncado de texto respetando grafemas, comparador de orden genérico.
- `src/utils/Date.ts` — parseo flexible de fechas (ISO, `dd/mm/yyyy`, con/sin hora), formateo para UI (es-CO) y para Microsoft Graph, y cálculo de rangos de meses hacia atrás.
- `src/utils/Number.ts` — parseo/formateo de números en convención colombiana (es-CO): separador de miles `.`, decimal `,`.
- `src/utils/Text.ts` — un único helper: escape de caracteres HTML especiales.
- `src/utils/ans.ts` — lógica de negocio para calcular fechas de solución de SLA ("ANS") respetando horario laboral, fines de semana y festivos, y resolución del nivel de ANS de un ticket.
- `src/utils/mentions.ts` — reglas de negocio para quién puede mencionar a quién en comentarios de tickets, filtrado/agrupación de usuarios mencionables, extracción de IDs mencionados y acortado de nombres completos.
- `src/utils/roles.ts` — resolución del rol de un usuario combinando membresía de grupos de Azure AD (Graph) y un campo `Rol` en la lista SharePoint "Usuarios", con caché en memoria con TTL.

## Funciones y constantes clave

### `Commons.ts`
| Símbolo | Firma / propósito | Notas |
|---|---|---|
| `esc(s)` | `(s: string) => string` — escapa comillas simples duplicándolas, para literales OData (`$filter`). | Usado en casi todos los repositorios/servicios SharePoint. |
| `ensureIds(siteId, listId, graph, hostname, sitePath, listName)` | `Promise<{siteId, listId}>` — resuelve (con caché en `localStorage`) el `siteId` y `listId` de Graph para una lista SharePoint dada. | Ver duplicación en Oportunidades de mejora. |
| `norm(value?)` | `(value?: string) => string` — quita diacríticos (NFD + regex `̀-ͯ`), pasa a minúsculas y hace `trim()`. | Nombre duplicado con `ans.ts::norm` (ver abajo). |
| `pickTecnicoConMenosCasos(Usuarios)` | `Promise<UsuariosSP \| null>` — consulta técnicos disponibles (`Rol eq 'Tecnico' and Disponible eq 'Disponible'`, `top: 50`) y elige al azar entre los que tengan el menor `Numerodecasos`. | Deja un `console.table(tecnicos)` de depuración; lógica de negocio (asignación de tickets) ubicada en un archivo de utilidades genéricas. |
| `fileToBase64(file: Blob)` | `Promise<string>` — via `FileReader.readAsDataURL`, retorna el data URL completo (`data:mime;base64,...`). | |
| `fileToBasePA64(file: File)` | `Promise<string>` — igual que la anterior pero **recorta el prefijo** y retorna solo el base64 puro. | Nombre poco claro/typo ("BasePA64"); fácil de confundir con `fileToBase64`. |
| `truncateNoCutGraphemes(s, max, suffix='...')` | `(string, number, string) => string` — trunca por grafemas (`Intl.Segmenter`) sin cortar a mitad de palabra. | |
| `sortByPath(path, type='string', dir='asc', nulls='last')` | retorna un comparador `(a, b) => number` genérico para `Array.sort`, soporta `'string' \| 'date' \| 'number'`, nulos primero/último. | `type`, `dir`, `nulls` tipados como `string` plano, no como unión literal — un typo (`'dsc'` en vez de `'desc'`) no genera error de compilación. |

### `Date.ts`
| Símbolo | Firma / propósito | Notas |
|---|---|---|
| `toISODateFlex(v?)` | `(string \| Date \| null) => string` — parsea ISO o `dd/mm/yyyy[ hh[:mm]]`, retorna `"YYYY-MM-DD"` o `""`. | Regex duplicado con `parseDateFlex`. |
| `ParseDateShow(fecha)` | `(string) => string` — formatea a `dd/mm/yyyy, hh:mm` (es-CO, 24h) con `toLocaleString`; `catch` retorna `"N/A"`. | El `try/catch` es en la práctica inalcanzable: `new Date(fecha)` nunca lanza; una fecha inválida produce un `Invalid Date` formateado en vez de `"N/A"`. |
| `parseDateFlex(v?)` | `(string \| Date \| null) => Date \| null` — misma lógica de parseo flexible que `toISODateFlex`, pero retorna `Date`. | Copia casi literal de la lógica/regex de `toISODateFlex` en vez de reutilizarla. |
| `toISODateTimeFlex(v?)` | `(...) => string` — usa `parseDateFlex` y formatea `"YYYY-MM-DD HH:mm"`. | |
| `toGraphDateTime(v)` | `(Date \| {toISOString} \| string \| null \| undefined) => string \| undefined` — normaliza distintos tipos de entrada a ISO string para Graph. | |
| `toUtcIso(d?)` | `(Date \| null) => string \| null`. | |
| `toGraphDateOnly(v, opts?)` | `(...) => string \| undefined` — retorna solo la parte de fecha (`YYYY-MM-DD`), con opción `base: 'local' \| 'utc'`. | |
| `toDate(d)` | `(string \| Date) => void` (implícito) | **Bug**: `export function toDate(d: string \| Date){(d instanceof Date ? d : new Date(d))};` — el cuerpo evalúa la expresión pero no tiene `return`, por lo que siempre retorna `undefined`. Confirmado sin uso real: los dos únicos `toDate(` fuera de este archivo (`Funcionalidades/tasks/Tareas.ts`, `components/Tareas/ResumenActividad/ResumenActividad.tsx`) llaman a una función `toDate` **local** definida en `Tareas.ts`, no a esta exportada — es decir, esta función está muerta y rota a la vez. |
| `formatYYYYMMDD(d)` | `(Date) => string` — formatea fecha local a `YYYY-MM-DD`. | Prácticamente idéntica a la función privada `formatDate` del mismo archivo (usada solo internamente por `getXMonthsBackRange`). |
| `toIsoFromDateTime(dateStr, timeStr)` | `(string, string) => string` — combina `"YYYY-MM-DD"` + `"HH:mm"` como hora local y devuelve ISO UTC. | |
| `getXMonthsBackRange({baseDate?, MonthQuantity})` | `(...) => DateRange` — retorna `{from, to}` restando `MonthQuantity` meses a `baseDate`. | |

### `Number.ts`
| Símbolo | Firma / propósito | Notas |
|---|---|---|
| `toNumberFromEsCO(formatted)` | `(string) => number` — quita puntos de miles y cambia coma decimal por punto, luego `Number(...)`. | No valida entrada `undefined`/`null`; llamarla con `undefined` lanza `TypeError` (`.replace` sobre `undefined`). |
| `toNumberEs(v)` (interna, no exportada) | `(unknown) => number` — versión defensiva equivalente, con `String(v ?? "")` y chequeo `isFinite`. | Lógica esencialmente duplicada con `toNumberFromEsCO`, pero más robusta; solo se usa dentro de `formatPesosEsCO`. |
| `formatPesosEsCO(value, decimals=2)` | `(number \| string, number) => string` — formatea con `Intl.NumberFormat('es-CO')`; si el valor es entero, omite decimales. | |

### `Text.ts`
| Símbolo | Firma / propósito | Notas |
|---|---|---|
| `escapeHTML(v)` | `(any) => string` — escapa `& < > " '` a sus entidades HTML. | Único export del archivo; no escapa backticks ni otros caracteres relevantes para contextos JS/atributos con comillas mixtas, pero es suficiente para texto plano en HTML. |

### `ans.ts`
| Símbolo | Firma / propósito | Notas |
|---|---|---|
| `TIMEZONE = "America/Bogota"`, `WORK_START = 7`, `WORK_END = 17` | Constantes de horario laboral (7am–5pm, hora Bogotá). | |
| `isHoliday(date, holidays)` | `(Date, Holiday[]) => boolean` — compara `YYYY-MM-DD` (fijando hora a 12:00 para evitar problemas de DST/borde) contra la lista de festivos. | |
| `calcularFechaSolucion(apertura, horasAns, holidays)` | `(Date, number, Holiday[]) => TZDate` — avanza minuto a minuto (en bloques) desde `apertura`, saltando fines de semana/festivos y fuera de horario laboral, hasta consumir `horasAns * 60` minutos hábiles. | Usa `date-fns` (`addMinutes`, `isSaturday`, `isSunday`) y `@date-fns/tz` (`TZDate`) para operar siempre en hora de Bogotá. |
| `norm(s)` | `(string) => string` — quita diacríticos, minúsculas, trim. | **Duplicado exacto** en propósito y casi en implementación de `Commons.ts::norm` (mismo nombre exportado desde dos módulos distintos). |
| `calculoANS({catId, subId, art}, ansService)` | `Promise<string>` — si falta `catId`/`subId`/`art`, o si `ansService.loadANS(...)` falla (`status: false`), retorna `"ANS 3"` por defecto; si tiene éxito, retorna `response.data.Title`. | El fallback silencioso a `"ANS 3"` no distingue "no aplica clasificación" de "error de red/backend" — no hay log ni propagación del error. |
| `HORAS_POR_ANS` | `Record<'ANS 1'..'ANS 5', number>` — `{4, 8, 16, 112, 480}` horas hábiles por nivel. | Números mágicos sin comentario que explique la política de SLA de origen (contrato/documento de negocio). |

### `mentions.ts`
| Símbolo | Firma / propósito | Notas |
|---|---|---|
| `TI_DEPARTMENT_ID = 7` | Constante — id numérico hardcodeado del departamento "TI". | Frágil: si el id cambia en la base de datos, hay que recordar actualizar este archivo; no hay lookup por nombre/código. |
| `canMention(m, isConfidential)` | `(Mentioner, boolean) => boolean` — en tickets confidenciales, solo `role === 'admin'` puede mencionar; si no es confidencial, cualquiera puede. | |
| `isPreRegistered(u)` (interna) | `(SolviUser) => boolean` — heurística: usuario "sin registrar" si `User_Name` está vacío. | Heurística fràgil, documentada como tal en el propio comentario del código. |
| `mentionablePool(users, m)` | `(SolviUser[], Mentioner) => SolviUser[]` — excluye pre-registrados; admin ve todos, no-admin ve TI ∪ su propio departamento. | |
| `groupByDepartment(users)` | `(AppUser[]) => MentionGroup[]` — agrupa por `Department_ID`, ordena con TI primero, luego alfabético, "Sin departamento" al final. | |
| `filterMentionables(query, users, m, isConfidential, opts?)` | `(...) => SolviUser[]` — combina `canMention` + `mentionablePool` + búsqueda por nombre/correo + `excludeUserId` + límite (`limit=50` por defecto). | |
| `extractMentionIds(text)` | `(string) => number[]` — regex `/@\[(\d+)\]/g`, retorna ids únicos (usa `Set`). | |
| `PARTICULAS` (interna) | `Set<string>` — partículas de apellidos compuestos en español (`de`, `del`, `la`, `van`, etc.). | |
| `shortName(full)` | `(string) => string` — heurística para acortar "Nombre Completo" a "primer nombre + primer apellido", respetando partículas. | Lógica de índices (`apStart`, bucles con condiciones anidadas sobre `PARTICULAS`) difícil de seguir y sin pruebas; casos con 4+ tokens sin partícula pueden perder el segundo nombre silenciosamente (comportamiento documentado en comentario, pero no cubierto por tests). |

### `roles.ts`
| Símbolo | Firma / propósito | Notas |
|---|---|---|
| `RoleDecision` | Unión discriminada `{role, source: 'group'\|'sp'\|'default', matchedGroupId?}`. | |
| `TTL_MS = 5 * 60 * 1000` | Constante — 5 minutos de vigencia para las cachés `uidCache`/`membCache`. | |
| `uidCache`, `membCache` | `Map` a nivel de módulo (memoria del proceso del navegador), con expiración por TTL evaluada en cada lectura. | |
| `getUserIdByEmail(graph, email)` (interna) | `Promise<string \| null>` — resuelve `id` de Azure AD por `/users/{email}`, con fallback a `$filter=mail eq ... or userPrincipalName eq ...`; cachea también resultados `null`. | |
| `getRoleFromGroup(graph, email, groupId, roleIfMember)` | `Promise<RoleDecision \| null>` — usa `POST /users/{id}/checkMemberGroups` para un solo grupo. | |
| `getGroupMemberIds(graph, groupId)` (interna) | `Promise<string[]>` — pagina manualmente `@odata.nextLink` de `/groups/{id}/members`; cachea en `groupMembersCache` **sin TTL** (persiste toda la sesión). | Deja un `console.table(members)` de depuración dentro de `getRoleFromGroups`. Inconsistente con `uidCache`/`membCache`, que sí expiran. |
| `getRoleFromGroups(graph, email, rules)` | `Promise<RoleDecision \| null>` — evalúa varias reglas `{groupId, role}` en paralelo y retorna la primera coincidencia según el orden del array. | |
| `getRoleFromSP(usuariosSvc, email)` | `Promise<RoleDecision \| null>` — fallback: busca el campo `Rol` en la lista SharePoint "Usuarios" por correo. | |
| `resolveUserRole({graph, usuariosSvc, email, groupRules?, singleGroup?, defaultRole='Usuario'})` | `Promise<RoleDecision>` — orquesta: grupo(s) de Azure AD → lista SharePoint → rol por defecto `"Usuario"`. | Punto de entrada usado por `src/Funcionalidades/auth/Usuarios.ts` para resolver el rol del usuario autenticado. |

## Flujo del módulo
- **Fechas (`Date.ts`)**: se consumen ampliamente donde se muestran o serializan fechas de tickets (formularios de creación/edición, tablas de tickets, dashboards) y al construir payloads hacia Graph (`toGraphDateTime`/`toGraphDateOnly`) o hacia Supabase.
- **Números (`Number.ts`)** y **Texto (`Text.ts`)**: usados puntualmente en formularios/reportes que muestran montos en pesos colombianos (`formatPesosEsCO`) o que insertan contenido dinámico de usuario en HTML (`escapeHTML`, ej. plantillas de notificación/comentarios).
- **`ans.ts`**: `calcularFechaSolucion` y `calculoANS` se invocan al crear un ticket (`src/Funcionalidades/Tickets/NuevoTicket.ts` y flujos de recategorización) para fijar `FechaMaxima`/nivel de SLA; `calculoANS` depende de `ANSRepository` (ver `docs/repositories.md`) para resolver el nivel desde la lista SharePoint "ANS", y `HORAS_POR_ANS` traduce ese nivel a horas hábiles que consume `calcularFechaSolucion`.
- **`mentions.ts`**: consumido por los componentes de comentarios de un ticket (`src/components/DetallesTickets/Modals/Messages/MentionList.tsx`, `ParticipantPanel.tsx`, `CommentComposer.tsx`) para construir el selector de "@mencionar" y por `SupabaseMessageRepository.createSolviComment` (ver `docs/repositories.md`) indirectamente vía `extractMentionIds` en la capa de UI antes de pasar `mentionedUserIds` al repositorio.
- **`roles.ts`**: `resolveUserRole` se invoca desde `src/Funcionalidades/auth/Usuarios.ts` (hook de resolución de rol), que recibe el `GraphRest` de `useGraphServices()` y el correo del usuario autenticado de `useAuth()` — conectando los tres módulos ya documentados (auth, graph, repositories/services) en un único flujo de autorización.
- **`Commons.ts::pickTecnicoConMenosCasos`**: se usa en flujos de asignación automática de tickets nuevos, recibiendo el `UsuariosSPService` de `useGraphServices()`.

## Dependencias
- Externas: `date-fns` (`addMinutes`, `isSaturday`, `isSunday`, usadas en `ans.ts`), `@date-fns/tz` (`TZDate`), APIs nativas del navegador (`Intl.NumberFormat`, `Intl.Segmenter`, `FileReader`, `localStorage`).
- Internas: `src/graph/GraphRest.ts` y `src/Services/Usuarios.Service.ts` (usados por `roles.ts` y `Commons.ts`), `src/repositories/AnsRepository/AnsRepository.ts` (usado por `ans.ts`), `src/Models/*` (tipos: `DateRange`, `Holiday`, `UsuariosSP`, `AppUser`, `SolviUser`).

## Oportunidades de mejora
- **`toDate` roto y muerto** (`src/utils/Date.ts` línea 160): falta el `return`, siempre retorna `undefined`; además no tiene ningún consumidor real (los usos de `toDate(` en la base de código llaman a una función homónima local definida en `src/Funcionalidades/tasks/Tareas.ts`, no a esta). Candidato a eliminar o corregir y unificar con la versión local de `Tareas.ts`.
- **`norm` duplicado con nombre idéntico en dos módulos**: `src/utils/Commons.ts::norm` y `src/utils/ans.ts::norm` hacen esencialmente lo mismo (quitar diacríticos, minúsculas, trim) con implementaciones ligeramente distintas (`̀-ͯ` vs `\p{Diacritic}`). Riesgo de que un import accidental traiga la versión "equivocada", y mantenimiento duplicado.
- **Reimplementación de utilidades que ya ofrece `date-fns`**: el proyecto ya depende de `date-fns`/`@date-fns/tz` (usado en `ans.ts`), pero `Date.ts` reimplementa a mano parseo de `dd/mm/yyyy` (regex propio en `toISODateFlex` y `parseDateFlex`, duplicado entre sí), formateo `YYYY-MM-DD` (`formatYYYYMMDD` y la función privada `formatDate`, redundantes entre sí) y resta de meses (`getXMonthsBackRange`), en vez de usar `parse`/`format`/`subMonths` de `date-fns`, que ya cubren estos casos con más robustez y menos código propio que mantener.
- **`toNumberFromEsCO` sin manejo de entradas inválidas**: a diferencia de la función interna `toNumberEs` (más defensiva), `toNumberFromEsCO` asume que `formatted` siempre es un string definido; pasar `undefined`/`null` lanza `TypeError`. Sería preferible unificar en una sola función exportada con las guardas de `toNumberEs`.
- **Nombres poco claros**: `fileToBasePA64` (typo/nombre confuso, no deja claro que remueve el prefijo `data:...;base64,` a diferencia de `fileToBase64`); `LogRespository`/`AttachmentsRepostory` (fuera de este módulo, pero mismo patrón de typos en nombres). `sortByPath` acepta `type`/`dir`/`nulls` como `string` plano en vez de tipos literales (`'asc' | 'desc'`, etc.), perdiendo la ayuda del compilador ante errores de tipeo.
- **Lógica de negocio mezclada con utilidades genéricas**: `pickTecnicoConMenosCasos` (asignación round-robin de técnicos) vive en `Commons.ts` junto a helpers genéricos de caché/base64; y `HORAS_POR_ANS`/`calcularFechaSolucion` (reglas de SLA) están en un archivo de "utils" en vez de una capa de dominio/servicio explícita. Dificulta ubicar y testear las reglas de negocio por separado de los helpers puramente técnicos.
- **`console.table`/`console.log` de depuración dejados en código de producción**: `Commons.ts::pickTecnicoConMenosCasos` (`console.table(tecnicos)`) y `roles.ts::getRoleFromGroups` (`console.table(members)`), ambos dentro de rutas de ejecución normales, no solo en modo debug.
- **Caché sin invalidación consistente**: en `roles.ts`, `uidCache`/`membCache` expiran a los 5 minutos, pero `groupMembersCache` (miembros de un grupo completo) no expira nunca dentro de la sesión — un usuario removido de un grupo de Azure AD puede seguir viéndose como miembro hasta que se recargue la página.
- **Fallback silencioso en `calculoANS`**: no distingue entre "combinación categoría/subcategoría/artículo sin ANS definido" y "error de red/Graph al consultar la lista ANS"; ambos casos devuelven `"ANS 3"` sin log ni señal para diagnóstico.
- **Falta de pruebas unitarias**: ninguno de los 7 archivos tiene tests asociados, pese a contener lógica con muchos casos borde (parseo flexible de fechas, cálculo de SLA con festivos/fines de semana, acortado de nombres con partículas, resolución de roles con múltiples fuentes). Son buenos candidatos a tests unitarios por ser mayormente funciones puras.
