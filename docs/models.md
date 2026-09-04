# Módulo Models

## Descripción general

`src/Models` es la capa de tipos del proyecto: define las interfaces/DTOs de TypeScript que representan las listas de SharePoint (tickets, inventario, facturas, actas de entrega, usuarios, etc.) y las tablas de Supabase/Prisma (tickets, seguimientos, adjuntos, usuarios de "Solvi") que usa la mesa de ayuda. No contiene lógica de negocio ni llamadas HTTP propias (salvo la subcarpeta `Supabase`, que sí incluye hooks de React Query), sino que actúa como contrato de datos compartido: los `Services`/`repositories` tipan con estos modelos las respuestas crudas de Graph/SharePoint/Supabase, y ese mismo tipo se propaga hacia `Funcionalidades` y `components`. Al ser una carpeta transversal, cualquier cambio de campo en una lista de SharePoint o columna de Supabase debe reflejarse aquí para que el resto de capas compile correctamente. Existe también como forma de aislar el "shape" real de SharePoint (nombres de columna crudos, a veces con codificación `_x00xx_`) del resto de la aplicación.

## Archivos y entidades que definen

### Tickets, casos y seguimiento

| Archivo | Entidad principal | Campos/propósito clave |
|---|---|---|
| `Tickets.ts` | `Ticket` (SharePoint) | Caso: `ID`, `Solicitante`, `AsuntoTicket`, `FechaApertura/Maxima/CierreReal`, `Estadodesolicitud`, `Categoria/SubCategoria/Articulo`, `Correoresolutor`, minutos ANS. Además `FormRecategorizarState`, `FormReasignarState`, `FormObservadorState`, `ticketOption`, `AttachmentLite`, `SortDir/SortField`, `TicketsError`, `ANS` (reglas de acuerdo de servicio por categoría/subcategoría/artículo). |
| `DTO/Tickets.ts` | `SupabaseTickets` | Mismo concepto de ticket pero con nombres de columna Supabase (`ticket_solvi_*`, snake_case en inglés/español mixto): título, fuente, estado, resolutor, fechas, minutos nocturnos/dominicales/festivos/totales. |
| `nuevoTicket.ts` | `FormState`, `RelacionadorState`, `UserFormState`, `FormDocumentarState` | Estado de formularios de creación/edición de ticket (solicitante, resolutor, categoría, adjuntos) y sus `*Errors` (`Partial<Record<keyof X, string>>`). |
| `CasosHijosRequeridos.ts` | `CasosHijosRequeridos` | Reglas de qué "casos hijos" exige un tipo de caso (categoría/subcategoría/artículo/tipo de tienda). |
| `Log.ts` | `Log` (SharePoint) | Bitácora de un caso: `Id_caso`, `Descripcion`, `Tipo_de_accion`, `Actor`, `CorreoActor`, `Created`. |
| `DTO/Log.ts` | `LogDTO` (Supabase) | Misma bitácora con columnas `seguimientos_solvi_*`. |
| `DTO/Attachments.ts` | `attachment` (Supabase) | Adjunto de un ticket: ruta/tipo de archivo, bucket de storage, `id_ticket`, `seguimiento_id`. |
| `Filtros.ts` | `FilterMode`, `DateRange` | Filtro de listado ("En curso"/"Cerrados") y rango de fechas `from/to`. |
| `Excel.ts` | `TicketExcelRow` | Fila para importación masiva de tickets desde Excel. |

### Categorización de casos

| Archivo | Entidad principal | Campos/propósito clave |
|---|---|---|
| `Categorias.ts` | `Categoria`, `Subcategoria`, `Articulo` | Árbol categoría→subcategoría→artículo con `ID` (mayúscula) y relaciones `Id_categoria`/`Id_subCategoria`. |
| `Articulos.ts` | `Articulos` | Otra representación de "artículo" con `Id` (minúscula) y `Id_Subcategoria` — se solapa conceptualmente con `Categorias.Articulo`. |

### Facturación, compras y centros contables

| Archivo | Entidad principal | Campos/propósito clave |
|---|---|---|
| `Facturas.ts` | `Facturas`, `Proveedor`, `ItemFactura`, `ItemUx`, `ItemBd`, `FacturasUx` | Factura de proveedor (SP), sus ítems (versión "UI" con subtotal calculado vs. versión "BD") y sus `*Errors`. |
| `DistribucionFactura.ts` | `DistribucionFacturaData` | Distribución de una factura de fotocopiado/impresión entre CO/centro de costos/UN e imputaciones por marca y tipo de impresión. |
| `RegistroFacturaInterface.ts` | `ReFactura` | Registro contable de la factura (NIT, CO, CC, UN, documento ERP, quién la registró). Se solapa con `Facturas`/`DistribucionFacturaData` en campos (`FechaEmision`, `NoFactura`, `Items`, `CO`, `un`). |
| `Compras.ts` | `Compra`, `comprasState`, `CO`, `Opcion`, constantes `Items`, `UN` | Solicitud de compra (producto/servicio/alquiler), porcentaje de imputación por marca, catálogo estático de ítems contables y unidades de negocio. |
| `CentroCostos.ts` | `CentroCostos`, `CCOption` | Centro de costos (`Title`+`Codigo`) y su opción de combo. |
| `CO.ts` | `CentroOperativo`, `COOption` | Centro operativo (`Title`+`Codigo`) y su opción de combo — mismo shape que `CentroCostos`. |
| `CentroFactura.ts` | `TipoCentro`, `CentroFactura` | Modelo "genérico" declarado explícitamente para unificar CentroCostos/CentroOperativo/UnidadNegocio, pero convive sin reemplazar a `CO.ts`/`CentroCostos.ts`. |
| `Proveedores.ts` | `Proveedores` | Proveedor de TI con nivel de escalamiento, correo y teléfono. |
| `Sociedades.ts` | `Sociedades` | Sociedad/empresa (`Title`, `Nit`). |

### Inventario, préstamos y actas de entrega

| Archivo | Entidad principal | Campos/propósito clave |
|---|---|---|
| `Inventario.ts` | `Inventario` | Activo de TI: marca, serial, disco/memoria, responsables de entrada/salida, ubicación, estado, compañía, proveedor. Casi todos los campos opcionales. |
| `prestamos.ts` | `dispositivos`, `prestamos`, `pruebasDefinidas`, `pruebasPrestamo`, `pruebasDispositos` | Módulo de préstamos de equipos: dispositivo prestado, fechas de préstamo/devolución, pruebas asociadas y su aprobación/fase. |
| `ActasEntrega.ts` | `ActasEntrega`, `FormStateActa`, `DetalleEntrega`, `CamposPayload` | Acta de entrega/recepción de equipos: quién entrega/recibe, detalle por ítem (marca/serial/propiedad/proveedor) y el payload plano con slots `Marca_1..N`, `Serial_1..N`, etc. para el flujo de Power Automate. |

### RRHH, ausencias y tareas

| Archivo | Entidad principal | Campos/propósito clave |
|---|---|---|
| `Ausencia.ts` | `ausencia` | Ausencia reportada (fecha inicio, fecha/hora, descripción, solicitante). |
| `Tareas.ts` | `Tarea`, `NuevaTarea` | Tarea/nota interna con recordatorio (`diasRecordatorio`), encargado, fechas; `FilterMode` propio ('Pendientes'/'Iniciadas'/'Finalizadas') — nombre repetido con el `FilterMode` de `Filtros.ts` pero con valores distintos. |
| `PazYsalvos.ts` | `PazSalvos` | Paz y salvo de salida de empleado (cédula, empresa, jefe, consecutivo, estado en `Title`). |
| `Holiday.ts` | `Holiday` | Día festivo (`date`, `day_of_week`, `festivo_name`) — única entidad del módulo con nombres de campo en snake_case inglés puro. |

### Usuarios, franquicias, accesos y formatos de solicitud

| Archivo | Entidad principal | Campos/propósito clave |
|---|---|---|
| `User.ts` | `User` | Usuario mínimo (`displayName`, `mail`, `jobTitle`) o `null`. |
| `Usuarios.ts` | `UsuariosSP`, `UserMe` | Usuario de la lista SharePoint de agentes (con campo mal-decodificado `_x0052_ol2` = "Rol2") y perfil de Graph `/me`. |
| `GraphUsers.ts` | `GraphUser`, `GraphUserLite`, `GraphListResponse<T>`, `newAccess` | Tipos de respuesta de Microsoft Graph (paginación OData incluida). |
| `Commons.ts` | `Worker`, `UserOption`, `desplegablesOptions`, `Reasignar`, `SPCajerosPOS`, `GetAllOpts`, `PageResult<T>` | Utilidades transversales: opciones de combo genéricas, paginación de repos, payload de reasignación y de creación de cajero POS. |
| `Franquicias.ts` | `Franquicias` | Franquicia (ciudad, correo, jefe de zona, celular). |
| `Internet.ts` | `Internet`, `InternetTiendas`, `InfoInternetTienda`, `FormEscalamientoState` | Servicio de internet por tienda/franquicia y formulario de escalamiento a proveedor; incluye columnas SharePoint muy codificadas (`Compa_x00f1__x00ed_a`, `DIRECCI_x00d3_N`). |
| `Formatos.ts` | `SolicitudUsuario`, `Servicios`, `FilaSolicitudRed`, `FilaSolicitudERP`, `FilaPermisoNav`, `State`/`Action` (reducer) | Formularios de solicitud de servicios de TI para empleado nuevo, permisos de red/ERP y permisos de navegación a redes sociales. |
| `FlujosPA.ts` | `FlowToUser`, `FlowToSP`, `FlowToReasign`, `MasiveFlow`, `Escalamiento`, `AdjuntoPayload`, `conectorFacturas`, `SoliictudServiciosFlow` | Payloads de entrada/salida hacia flujos de Power Automate (notificaciones, adjuntos en base64, reasignación, carga masiva). |

### Contenido, anuncios y plantillas

| Archivo | Entidad principal | Campos/propósito clave |
|---|---|---|
| `Anuncio.ts` | `Anuncio` | Anuncio con rango de fechas, título y cuerpo HTML. |
| `Plantilla.ts` | `Plantillas`, `FormPlantillas` | Plantilla de correo/documento (campos dinámicos + HTML). |
| `Tips.ts` | `Tip`, `TipFlowResponse`, `TipUI` | Tip/anuncio corto mostrado en la UI, incluida la forma de respuesta del flujo que los entrega. |

### Dashboard, filtros y almacenamiento

| Archivo | Entidad principal | Campos/propósito clave |
|---|---|---|
| `Dashboard.ts` | `Usuario`, `ResolutorAgg`, `TopCategoria`, `Fuente`, `DailyPoint` | Tipos de agregación para gráficos del dashboard (totales por resolutor/categoría/fuente/día). |
| `Files.ts` | `DriveSizeResult`, `ListSizeEstimate` | Estimaciones de tamaño de bibliotecas/listas de SharePoint (para la pantalla de almacenamiento). |

### Supabase / usuario actual (mezcla tipos + hooks)

| Archivo | Entidad principal | Campos/propósito clave |
|---|---|---|
| `Supabase/supabaseUser.ts` | `AppUser`, `PrismaUserProfile` | Perfil de usuario tal como lo expone Prisma/Supabase (`User_ID`, `User_Role`, `Department_ID`, relación a `department`/`team`). Solo tipos. |
| `Supabase/useCurrentUser.ts` | función `getCurrentUserFromSolvi`, hook `useCurrentUser` | Ver sección siguiente. |
| `Supabase/useSolviParticipants.ts` | tipo `SolviParticipant`, hook `useSolviParticipants` | Ver sección siguiente. |
| `Supabase/useUsers.ts` | hook `useUsers` | Ver sección siguiente. |

## Funciones y constantes clave

Casi todo el módulo son tipos puros; las excepciones son la subcarpeta `Supabase` y algunas constantes de catálogo:

- **`getCurrentUserFromSolvi(email: string): Promise<PrismaUserProfile>`** (`Supabase/useCurrentUser.ts`). Normaliza el correo (`trim().toLowerCase()`) y hace un `select` a la tabla `TBL_Users` de Supabase con joins embebidos a `TBL_Teams` y `TBL_Departments`, usando `.ilike('User_Email', ...)` y `.maybeSingle()`. Lanza `Error` si Supabase devuelve error o si no encuentra el usuario. Efecto secundario: llamada de red a Supabase (`supabase.from('TBL_Users')...`).
- **`useCurrentUser()`** (mismo archivo). Hook de React Query: toma el email del `useAuth()` (`account.username`), arma `queryKey: ['currentUser', email]` y llama a `getCurrentUserFromSolvi`. Solo se habilita (`enabled`) cuando `ready && Boolean(email)`; usa `staleTime: Infinity` (cachea indefinidamente hasta invalidación manual) y `retry: false`. Devuelve el objeto `useQuery` completo (`data`, `isLoading`, `error`, etc.) tipado como `PrismaUserProfile`.
- **`useSolviParticipants(ticketId: number)`** (`Supabase/useSolviParticipants.ts`). Hook de React Query que obtiene los participantes de un ticket vía `messages.fetchSolviParticipants(ticketId)` del `useRepositories()` (capa `repositories`, no Supabase directo). `queryKey: ['solvi-participants', ticketId]`, `staleTime: 30_000` (30s). También define el tipo `SolviParticipant` (`User_ID`, `User_Name`, `User_Avatar_url`, `Added_Via`, `Added_By`).
- **`useUsers()`** (`Supabase/useUsers.ts`). Hook de React Query que trae todos los usuarios vía `messages.fetchAllUsers()` (repositorio, tipo `SolviUser` importado desde `repositories/ParticipantsRepository/MessagesRepository`, no desde `Models`). `queryKey: ['users']`, `staleTime: 5 min`, `retry: 1`.
- **Catálogos estáticos en `Compras.ts`**: `Items` (lista fija de códigos contables SC11/SC40/.../SC254 con su descripción) y `UN` (lista fija de códigos de unidad de negocio 101/102/.../604). Son datos de referencia embebidos como arreglos literales, no enums ni datos consultados a una lista maestra.
- **Uniones de estado/tipo (no enums) dispersas por el módulo**: `TipoUsuario`, `Propiedad` (`ActasEntrega.ts`), `TipoCompra`/`CargarA` (`Compras.ts`), `TipoContratacion`/`TipoEquipo`/`ExtensionTelefonica`/`PermisoRed` (`Formatos.ts`), `FilterMode` (dos definiciones distintas, ver más abajo), `SortDir`/`SortField` (`Tickets.ts`), `TipoCentro` (`CentroFactura.ts`).

Nota: los tres hooks llevan en su primera línea un comentario `// src/features/requests/hooks/...ts`, lo que indica que fueron movidos a `src/Models/Supabase` desde otra ubicación sin actualizar ese comentario (las rutas relativas de import sí fueron corregidas y resuelven correctamente).

## Flujo del módulo

1. **Origen del dato**: SharePoint (vía Microsoft Graph) o Supabase/Prisma exponen columnas crudas (nombres con `_x00xx_`, snake_case `ticket_solvi_*`, o PascalCase en español).
2. **Services / repositories** (`src/Services/*.service.ts`, `src/repositories/**`) llaman a Graph/Supabase y tipan la respuesta usando los modelos de `src/Models` (por ejemplo `TicketsFromSharepoint.ts` y `TicketsFromSupabase.ts` ambos importan de `Models`, uno usando `Ticket` y otro `SupabaseTickets`). Aquí es donde se hace el mapeo entre el nombre crudo de columna y el tipo.
3. **Funcionalidades** (`src/Funcionalidades/**`, p. ej. `Tickets/NuevoTicket.ts`, `dashboard/Dashboard.ts`) consumen esos repos/servicios ya tipados y arman la lógica de negocio (validaciones, cálculos de ANS, armado de payloads para flujos), reutilizando los mismos tipos de `Models` o los estados de formulario (`FormState`, `comprasState`, etc.).
4. **components** (`src/components/**`) reciben esos tipos como props/estado de formulario (p. ej. `DetallesTickets.tsx`, `NuevoTicketForm.tsx`, `Formatos.tsx`) y los usan para renderizar tablas, formularios y modales.
5. **Duplicidad SharePoint vs. Supabase**: el caso más claro es **Ticket** (`Tickets.ts`, PascalCase en español: `AsuntoTicket`, `Estadodesolicitud`, `Correoresolutor`) frente a **SupabaseTickets** (`DTO/Tickets.ts`, snake_case con prefijo `ticket_solvi_`: `ticket_solvi_titulo`, `ticket_solvi_estado`, `ticket_solvi_correo_resolutor`). Son dos representaciones del mismo concepto de negocio sin un tipo de dominio único ni un mapper documentado entre ambos; lo mismo ocurre con **Log** (`Log.ts`) vs **LogDTO** (`DTO/Log.ts`). Los componentes de UI y `Funcionalidades` terminan conociendo ambas formas según de qué backend venga el dato en cada pantalla.

## Dependencias

- Librerías externas usadas dentro de `src/Models`: solo `@tanstack/react-query` (los tres hooks de `Supabase/`) — confirmado por Grep, ningún otro archivo del módulo importa librerías externas (no hay `@supabase/*` importado directamente en `Models`; el cliente de Supabase vive en `src/Services/Supabase.service.ts` y se importa desde el hook).
- Import interno entre archivos de `Models`: es mínimo — solo unos pocos módulos se referencian entre sí (`Compras.ts` importa `CCOption`/`COOption`; `Tareas.ts`, `nuevoTicket.ts`, `Tickets.ts` importan `UserOption` de `Commons.ts`; `Filtros.ts`/`Internet.ts` se referencian desde `nuevoTicket.ts`). La mayoría de archivos son independientes entre sí.
- Consumo desde el resto de la app: un Grep de `from ".../Models..."` (rutas relativas hacia el módulo) encuentra **137 archivos** en `src/Services`, `src/repositories`, `src/Funcionalidades`, `src/components` y `src/utils` que importan tipos de `Models` (229 imports en total), confirmando que prácticamente toda la aplicación depende de esta carpeta como contrato de datos compartido. No se encontró ningún uso de `any` dentro de `src/Models`.

## Oportunidades de mejora

- **Fragmentación del concepto "usuario"**: existen al menos siete formas distintas de modelar un usuario/agente sin relación de tipo entre ellas: `User` (`User.ts`), `UsuariosSP`/`UserMe` (`Usuarios.ts`), `GraphUser`/`GraphUserLite` (`GraphUsers.ts`), `Worker` (`Commons.ts`), `AppUser`/`PrismaUserProfile` (`Supabase/supabaseUser.ts`), `SolviParticipant` (`Supabase/useSolviParticipants.ts`) y `SolviUser` (definido fuera de `Models`, en `repositories/ParticipantsRepository/MessagesRepository.ts`, con el mismo shape que `PrismaUserProfile`/`AppUser` pero declarado por separado). Sería razonable consolidar en un único tipo de dominio `Usuario` con adaptadores por origen (Graph/SharePoint/Supabase).
- **Tipo "opción de combo" repetido 6+ veces**: `UserOption`/`desplegablesOptions` (`Commons.ts`), `COOption` (`CO.ts`), `CCOption` (`CentroCostos.ts`), `ticketOption` (`Tickets.ts`), `Opcion` (`Compras.ts`) son todos `{ value: string; label: string }` (algunos con campos opcionales extra). Podrían unificarse en un genérico `Option<T = string>` en `Commons.ts` reutilizado por todos los combos.
- **Centro de costos/operativo modelado 3 veces**: `CentroCostos` (`CentroCostos.ts`), `CentroOperativo` (`CO.ts`) y `CentroFactura` (`CentroFactura.ts`) tienen el mismo shape (`Title` + `Codigo`/`Id`), y `CentroFactura.ts` incluso declara explícitamente en su comentario que es el "modelo genérico para Centros (Costos/Operativos/UN)" pero no reemplaza a los otros dos, que se siguen usando en paralelo (`CO.ts`/`CentroCostos.ts` son importados por `Compras.ts`, `Filtros`/servicios de facturas). Además, `Compras.ts` declara su propio tipo local `CO = { value: string; code: string }`, que colisiona semánticamente con `CentroOperativo` del archivo `CO.ts` (incluso el nombre del tipo es igual al nombre del archivo que define otra cosa).
- **Facturación con 3 modelos solapados**: `Facturas`/`FacturasUx` (`Facturas.ts`), `DistribucionFacturaData` (`DistribucionFactura.ts`) y `ReFactura` (`RegistroFacturaInterface.ts`) comparten campos casi idénticos (`FechaEmision`, `NoFactura`, `CO`, `un`, `Items`/`DescripItems`, `DetalleFac`) pero cada uno los declara de cero, con pequeñas variaciones de nombre (`CC` vs `CCosto` vs `CCmn/CCmi/CCcedi/CCsa`) que dificultan saber si son el mismo campo.
- **"Artículo" con dos formas**: `Articulos.ts` (`Articulos`, `Id` minúscula, `Id_Subcategoria`) y `Categorias.ts` (`Articulo`, `ID` mayúscula, `Id_subCategoria`) modelan lo mismo con capitalización de campos distinta (`Id` vs `ID`, `Id_Subcategoria` vs `Id_subCategoria`), lo que es una fuente probable de bugs al mapear entre listas.
- **`FilterMode` duplicado con significado distinto**: `Filtros.ts` define `FilterMode = 'En curso' | 'Cerrados'` y `Tareas.ts` define su propio `FilterMode = 'Pendientes' | 'Iniciadas' | 'Finalizadas'`. Mismo nombre de tipo, dos módulos, valores incompatibles — cualquier import accidental del que no corresponde falla en tiempo de compilación pero el nombre repetido invita a confusión.
- **Nombres de columna SharePoint crudos filtrados hasta la capa de tipos**: `ActasEntrega.ts` (`Tecnico_x0028_Queentrega_x0029_`, `Persona_x0028_Quienrecibe_x0029_`), `Internet.ts` (`Centro_x0020_Comercial`, `DIRECCI_x00d3_N`, `Compa_x00f1__x00ed_a`), `Usuarios.ts` (`_x0052_ol2` para "Rol2"), `Franquicias.ts` (`Jefe_x0020_de_x0020_zona`). Estos son los "internal names" que SharePoint genera al codificar caracteres especiales/espacios, expuestos tal cual en el modelo en vez de mapearlos a un nombre legible (`tecnicoQueEntrega`, `rol2`, etc.) en la capa de `repositories`. Esto sugiere que el tipo se generó copiando el JSON crudo de la API en vez of derivarse de un esquema controlado.
- **Ausencia casi total de tipos discriminados/enum para "Estado"**: campos como `ActasEntrega.Estado`, `Ticket.Estadodesolicitud`, `Inventario.Estado`, `prestamos.Estado`, `Compra.Estado`, `PazSalvos.Title` (que documenta como "Estado" vía comentario) son todos `string` simple, mientras que otras partes del mismo módulo sí usan uniones literales (`TipoUsuario`, `Propiedad`, `PermisoRed`, `FilterMode`). Sería consistente convertir los estados de negocio (abierto/cerrado/pendiente/etc.) en tipos unión, evitando strings mágicos dispersos por `Funcionalidades`/`components`.
- **Tipos numéricos dudosos en `Commons.ts`**: `SPCajerosPOS` tipa `Cedula`, `CO`, `CorreoTercero` y `Compañia` como `number`, pero por nombre (`CorreoTercero`, `Compañia`) parecen ser identificadores/correo que normalmente serían `string` o IDs de lista SharePoint (lookup) — vale la pena confirmar contra la lista real, porque un correo como `number` es señal de tipo copiado sin validar.
- **Duplicación conceptual SharePoint vs. Supabase para Ticket y Log**: como se describe en "Flujo del módulo", `Tickets.ts`/`DTO/Tickets.ts` y `Log.ts`/`DTO/Log.ts` son pares de tipos para la misma entidad de negocio con nomenclatura completamente distinta (español PascalCase vs. snake_case con prefijo). No hay un tipo de dominio unificado ni un mapper central documentado en `Models`; cada capa de arriba debe saber cuál de los dos usar.
- **Cohesión de carpeta rota en `Supabase/`**: `supabaseUser.ts` es solo tipos, pero `useCurrentUser.ts`, `useSolviParticipants.ts` y `useUsers.ts` son hooks de React Query con lógica de fetching, cacheo y dependencias de otras capas (`auth/authContext`, `Services/Supabase.service`, `repositories/repositoriesContext`). Mezclar hooks con definiciones de tipos en la carpeta `Models` rompe la convención del resto del módulo (que es 100% tipos) y crea una dependencia inversa inusual (`Models` → `repositories`/`Services`/`auth`). Estos hooks encajarían mejor en una carpeta `hooks/` o junto a los demás hooks de `Funcionalidades`. Además, los comentarios de cabecera (`// src/features/requests/hooks/...`) delatan que fueron reubicados sin actualizar ese rastro.
- **Candidato a generación automática**: dado el volumen de campos que replican 1:1 columnas de SharePoint (incluyendo nombres internos codificados) y tablas de Supabase, este módulo es un buen candidato para generarse (parcial o totalmente) a partir del esquema real de las listas/tablas en vez de mantenerse a mano, reduciendo el riesgo de que un campo cambie en SharePoint/Supabase y el tipo de `Models` quede desincronizado silenciosamente (TypeScript no lo detecta porque las respuestas de Graph/Supabase no se validan en runtime contra estos tipos).
