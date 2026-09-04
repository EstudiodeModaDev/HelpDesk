# Módulo Services

## Descripción general

`src/Services` es la capa de acceso a datos "cruda" del Help Desk: cada archivo habla directamente con una lista de SharePoint (vía Microsoft Graph, usando `GraphRest`) o con Supabase (`Supabase.service.ts`), sin lógica de UI. La inmensa mayoría de los ~40 archivos son clases `XxxService` que replican, casi al carácter, el mismo esqueleto CRUD contra una lista concreta (resolver `siteId`/`listId`, cachearlos en `localStorage`, y exponer `create/get/update/delete/getAll`). Un puñado de archivos se sale de ese molde: `Festivos.ts` y `Supabase.service.ts` hablan con Supabase, `GraphUsers.service.ts` y `User.service.ts` llaman a Graph fuera del patrón de listas (grupos de Entra ID y perfil `/me`), y `sharepointStorage.service.ts`/`sharepointListsStorage.service.ts` son utilidades de analítica de almacenamiento. Estos servicios se instancian una única vez en `src/graph/GrapServicesContext.tsx` (`GraphServicesProvider`) y se consumen desde `src/Funcionalidades` y componentes vía el hook `useGraphServices()`.

## Patrón común

Casi todos los servicios de lista siguen esta forma (ver p. ej. `src/Services/Anuncios.service.ts`, `src/Services/Categorias.service.ts`):

- Propiedades privadas `graph: GraphRest`, `hostname`, `sitePath`, `listName`, y cache `siteId?`/`listId?`.
- Constructor con valores por defecto hardcodeados: `hostname = 'estudiodemoda.sharepoint.com'`, `sitePath = '/sites/TransformacionDigital/IN/HD'` (o `IN/Test` en un par de casos) y `listName = '<nombre visible de la lista>'`.
- `esc(s)` para escapar comillas simples en literales OData.
- `loadCache()`/`saveCache()` que persisten `{siteId, listId}` en `localStorage` bajo la clave `sp:${hostname}${sitePath}:${listName}`, y `ensureIds()` que resuelve `siteId` (`GET /sites/{hostname}:{sitePath}`) y `listId` (`GET /sites/{siteId}/lists?$filter=displayName eq '{listName}'`) solo si no están cacheados.
- `toModel(item)`: mapea un `listItem` de Graph (`item.id` + `item.fields`) al modelo TypeScript del dominio, con saneamiento inconsistente (unos ponen `?? ''`/`Number(...)`, otros dejan `undefined`).
- CRUD:
  - `async create(record: Omit<Model,'ID'>)` → `POST /sites/{siteId}/lists/{listId}/items { fields: record }`.
  - `async update(id: string, changed: Partial<Omit<Model,'ID'>>)` → `PATCH .../items/{id}/fields` y luego un `GET` para devolver el modelo actualizado.
  - `async delete(id: string)` → `DELETE .../items/{id}`.
  - `async get(id: string)` → `GET .../items/{id}?$expand=fields`.
  - `async getAll(opts?: GetAllOpts)` → arma `$expand=fields&$select=id,webUrl` más `$filter/$orderby/$top` opcionales, normalizando tokens (`ID`→`id`, `Title` suelto→`fields/Title`) y reintentando sin `$filter` si Graph responde `itemNotFound`.

Un subconjunto de servicios (familia "Prestamos - *", `Compras`, `Facturas`, `PazSalvos`) añade paginación real devolviendo `PageResult<T> = { items, nextLink }` y un método `getByNextLink(nextLink)` que sigue `@odata.nextLink` vía `graph.getAbsolute()`.

## Archivos y responsabilidad

| Archivo | Lista/tabla que gestiona | Operaciones | Notas particulares |
|---|---|---|---|
| `Actasdeentrega.service.ts` | Lista SP "Actas de entrega" (IN/HD) | CRUD + `getAll` | Columnas con nombres internos codificados (`Tecnico_x0028_Queentrega_x0029_`). |
| `Anuncios.service.ts` | Lista SP "Anuncios" | CRUD + `getAll` | Usa `esc` compartido de `utils/Commons`. |
| `Articulos.service.ts` | Lista SP "Articulos" | CRUD + `getAll` | Estándar; `esc` compartido. |
| `Ausencia.service.ts` | Lista SP "Ausencias" | CRUD + `getAll` | Estándar; `esc` compartido. |
| `COCostos.service.ts` (`COService`) | Lista SP "CentrosOperativos" | CRUD + `getAll` | Nombre de archivo/clase no coincide con la lista real; modelo solo `Codigo`+`Title`. |
| `CasosHijosRequeridos.service.ts` | Lista SP "Casos hijos requeridos" | CRUD + `getAll` | Usa `ensureIds` compartido de `utils/Commons` (no tiene `loadCache/saveCache` propios). |
| `Categorias.service.ts` | Lista SP "Categorias" | CRUD + `getAll` | Modelo usa `ID` (no `Id`), a diferencia de casi todo el resto. |
| `CentroCostos.service.ts` | Lista SP "CentroCostos" | CRUD + `getAll` | Casi idéntico a `COCostos.service.ts` (mismo shape `Codigo`+`Title`). |
| `CentrosFactura.service.ts` (`CentrosFacturaService`) | Multi-lista genérica: CentroCostos / CentrosOperativos / UnidadNegocio, según parámetro `tipo` | CRUD + `add()` (duplica `create`) | Único servicio ya generalizado a varias listas vía constructor; **no está registrado en `GraphServicesContext` ni importado en ningún otro archivo** (código muerto). |
| `Compras.service.ts` (`ComprasService`) | Lista SP "Compras" | CRUD + `getAll` paginado (`PageResult`/`getByNextLink`) + `findById` | Cabecera dice `// src/Services/Tickets.service.ts` (comentario copiado); método `ensure()` duplica `ensureIds()` y solo lo usa `findById`. |
| `DistribucionFactura.service.ts` | Lista SP "DistribucionFactura" | CRUD + `getAll` | Muchos campos numéricos con `Number(...) ?? 0`. |
| `Facturas.service.ts` (`FacturasService`) | Lista SP "Facturas" (IN/HD) | CRUD + `getAll` paginado (`PageResult`/`getByNextLink`) | Modelo `ReFactura` con campo `id0` en vez de `Id`. |
| `Festivos.ts` | Tabla Supabase `TBL_Festivos_Solvi` | Solo lectura: `fetchHolidays()` filtrado por año actual | Único archivo basado en función + Supabase; sin sufijo `.service`. |
| `Franquicias.service.ts` | Lista SP "Franquicias" | CRUD + `getAll` | Estándar. |
| `GraphUsers.service.ts` | Grupos de Entra ID / Microsoft 365 (no es lista SP) | `removeMemberByUserId`, `removeMemberByEmail`, `removeMembersBulk`, `getUserIdByEmail` | No usa `GraphRest`; hace `fetch` crudo con su propio token. Cabecera dice `// src/Services/GroupMembers.service.ts`; funciones casi duplicadas en `src/Funcionalidades/access/GroupMembers.ts`. |
| `Internet.service.ts` | Lista SP "Internet" | CRUD + `getAll` | Estándar. |
| `InternetTiendas.service.ts` | Lista SP "Internet Tiendas" | CRUD + `getAll` | Modelo usa `ID`; múltiples columnas codificadas (`DIRECCI_x00d3_N`, `Compa_x00f1__x00ed_a`). |
| `Inventario.service.ts` | Lista SP "Inventario" | CRUD + `getAll` | Modelo grande (activos de TI); usa `esc` compartido. |
| `Items.service.ts` (`ItemService`) | Lista SP "ItemsDescripcion" | CRUD + `getAll` | Estándar. |
| `ItemsFacturas.service.ts` (`ItemFacturaService`) | Lista SP "ItemsFactura" | CRUD + `getAll` | **Bug**: `update()` está tipado `Partial<Omit<InternetTiendas,'ID'>>` en vez de `ItemFactura` (copy-paste sin corregir). |
| `PazSalvos.service.ts` | Lista SP "Paz y salvos" (site IN/Test) | CRUD + `getAll` paginado (`PageResult`/`getByNextLink`) | Cabecera dice `// src/Services/Tickets.service.ts`. |
| `Plantillas.service.ts` | Lista SP "Plantillas" | CRUD + `getAll` | Estándar. |
| `Proveedores.service.ts` | Lista SP "Proveedores de internet" | CRUD + `getAll` | Estándar. |
| `ProveedoresFacturas.service.ts` (`ProveedoresFacturaService`) | Lista SP "ProveedoresFactura" | CRUD + `getAll` + `add()` (duplica `create`) | — |
| `PruebasDispositivo.service.ts` | Lista SP "Prestamos - PruebasDispostivo" | CRUD + `getAll` paginado + `findById` | Cabecera dice `// src/Services/Tickets.service.ts`; `ensure()` duplicado solo usado por `findById`. |
| `ReFacturas.service.ts` (`ReFacturasService`) | Lista SP "Facturas" (site IN/**Test**) | `create`/`getAll`/`update`/`delete` (sin `get` individual) | Mapea el mismo modelo `ReFactura` que `Facturas.service.ts` pero a nombres de columna SharePoint distintos (`FechadeEmision`, `Numerofactura`, `Item`, `Valor`, `Cc`, `Co`...). **No está wired ni importado en ningún otro archivo** (código muerto). |
| `Recordatorios.service.ts` (`RecordatoriosService`) | Lista SP "Recordatorios" | CRUD + `getAll` | Usa el modelo `Tarea`, la misma lista que gestiona `TareasService`. **No está registrado en `GraphServicesContext` ni importado en otro sitio** (código muerto / duplicado). |
| `Sociedades.service.ts` | Lista SP "Sociedades" | CRUD + `getAll` + `findByNit()` | Único con búsqueda dedicada por NIT. |
| `SubCategorias.Service.ts` (`SubCategoriasService`) | Lista SP "SubCategorias" | CRUD + `getAll` | Modelo usa `ID`; mapea `Id_categoria` desde `f.Id_Categoria` (difieren en mayúscula). |
| `Supabase.service.ts` | N/A (cliente) | Exporta el cliente `supabase` (`createClient`) | Sin validación de variables de entorno faltantes. |
| `Tareas.service.ts` (`TareasService`) | Lista SP "Recordatorios" | CRUD + `getAll` | Pese al nombre, apunta a la misma lista que `Recordatorios.service.ts`; es la que sí está en `GraphServicesContext`. |
| `Tips.service.ts` | Lista SP "TipsInicio" | CRUD + `getAll` | Usa `esc` compartido. |
| `User.service.ts` (`UserService`) | Graph `/me` (perfil del usuario autenticado, no una lista) | `getMeBasic()`, `getMyPhotoDataUrl()` | Accede a un miembro privado de `GraphRest` vía `(this.graph as any).getToken()`. **No se importa desde ningún otro archivo** (código muerto). |
| `Usuarios.Service.ts` (`UsuariosSPService`) | Lista SP "Usuarios" | CRUD + `getAll` | **Bug**: `toModel` intenta leer `item?.ID`/`item.Id` del item crudo de Graph (que solo trae `item.id` en minúscula), esos *fallbacks* nunca se resuelven. |
| `dispositivos.service.ts` (`DispositivosService`) | Lista SP "Prestamos - Dispositivos" | CRUD + `getAll` paginado + `findById` | Dos `console.log` de depuración dejados en `create()`. |
| `prestamos.service.ts` (`PrestamosService`) | Lista SP "Prestamos - Prestamos" | CRUD + `getAll` paginado + `findById` | Familia "Prestamos - *", idéntica estructura a `dispositivos`/`pruebas`/`pruebasPrestamo`. |
| `pruebas.service.ts` (`PruebasService`) | Lista SP "Prestamos - Pruebas" | CRUD + `getAll` paginado + `findById` | Ídem familia "Prestamos - *". |
| `pruebasPrestamo.service.ts` (`PruebasPrestamoService`) | Lista SP "Prestamos - Pruebas prestamo" | CRUD + `getAll` paginado + `findById` | Ídem familia "Prestamos - *". |
| `sharepointListsStorage.service.ts` | N/A (analítica: recorre todas las listas de un sitio) | `listLists`, `getListItemsCount`, `estimateAvgRecordBytes`, `estimateListsUsage`, `countItemsByPaging` | Única implementación correcta de paginación en bucle sobre `@odata.nextLink`. |
| `sharepointStorage.service.ts` | N/A (analítica: bibliotecas de documentos/drives) | `listDrives`, `computeDriveSize` (vía `/drives/{id}/root/delta`), `getLibrariesSizes` | Igual que el anterior, con bucle de paginación correcto. |

## Funciones y constantes clave

- **`src/utils/Commons.ts` — `esc(s)` / `ensureIds(...)`**: helpers compartidos para escapar literales OData y resolver `siteId`/`listId` con cache en `localStorage`. Solo una parte de los servicios los importa (`Anuncios`, `Articulos`, `Ausencia`, `Inventario`, `Tips` usan `esc`; `CasosHijosRequeridos`, `Compras`, `PruebasDispositivo`, `ReFacturas`, `Recordatorios`, `dispositivos`, `prestamos`, `pruebas`, `pruebasPrestamo` usan `ensureIds`); el resto reimplementa su propia copia local idéntica.
- **`src/utils/Commons.ts` — `pickTecnicoConMenosCasos(Usuarios)`**: lógica de negocio real (no CRUD) que llama a `UsuariosSPService.getAll({filter: "fields/Rol eq 'Tecnico' and fields/Disponible eq 'Disponible'"})` y elige al azar entre los técnicos con menos casos asignados (`Numerodecasos`), usada para asignación automática de tickets. Deja un `console.table(tecnicos)` de depuración.
- **`src/Services/Festivos.ts` — `fetchHolidays()`**: consulta Supabase (tabla `TBL_Festivos_Solvi`) filtrando por año en curso; consumida por `Funcionalidades/Tickets/NuevoTicket.ts`, `Funcionalidades/Tickets/Recategorizar.ts`, `Funcionalidades/Tickets/utils/CalcularMinutos.ts` y `Funcionalidades/forms/Formatos.ts` para cálculos de SLA en días hábiles.
- **`src/Services/GraphUsers.service.ts`**: pese al nombre, implementa remoción de miembros de grupos de Microsoft 365/Entra ID (`removeMemberByUserId`, `removeMemberByEmail`, `removeMembersBulk`), consumido por `src/components/Acceso/Acceso.tsx` para revocar accesos.
- **`src/Services/sharepointStorage.service.ts` / `sharepointListsStorage.service.ts`**: utilidades de reporting de almacenamiento (tamaño de librerías de documentos y de listas), consumidas por `src/components/Storage/ListsStorageEstimate.tsx`, instanciadas ahí directamente con un cliente `{get}` mínimo en vez de pasar por `GraphServicesContext`.
- **Constantes repetidas**: `hostname = 'estudiodemoda.sharepoint.com'` y `sitePath = '/sites/TransformacionDigital/IN/HD'` (o `'/sites/TransformacionDigital/IN/Test'` para `PazSalvos`/`ReFacturas`) están hardcodeados como valores por defecto del constructor en prácticamente los ~35 servicios de lista, y se repiten una vez más en `DEFAULT_CONFIG` de `src/graph/GrapServicesContext.tsx`.
- **Clave de cache `sp:${hostname}${sitePath}:${listName}`**: patrón de `localStorage` reimplementado en casi cada archivo para evitar resolver `siteId`/`listId` en cada llamada.

## Flujo del módulo

`GraphServicesProvider` (`src/graph/GrapServicesContext.tsx`) crea un único `GraphRest` (envolviendo el `getToken` de MSAL desde `useAuth()`) e instancia, memoizados, ~30 de estos servicios, exponiéndolos por el hook `useGraphServices()`. Los componentes y `src/Funcionalidades` obtienen el servicio que necesitan (`const { Usuarios, Compras, ... } = useGraphServices()`) y llaman directamente a `getAll({filter, orderby, top})`, `create(...)`, `update(id, changed)`, etc., pasando filtros OData crudos como cadenas (p. ej. `"fields/Rol eq 'Tecnico' and fields/Disponible eq 'Disponible'"`).

Algunos servicios quedan fuera de ese circuito central: `RecordatoriosService`, `ReFacturasService`, `CentrosFacturaService` y `UserService` no se instancian en `GrapServicesContext.tsx` ni se importan desde ningún otro archivo del proyecto (candidatos a código muerto). Los dos servicios de "Storage" se instancian ad hoc directamente en el componente que los usa, en vez de vivir en el contexto compartido.

Por debajo, todos hablan con `GraphRest` (`src/graph/GraphRest.ts`, documentado aparte), que centraliza `fetch` + header `Authorization: Bearer` + parseo seguro de 204/JSON, y lanza `Error("MÉTODO path → status statusText: detalle")` ante cualquier respuesta no-2xx. La mayoría de los métodos de servicio **no capturan** ese error: se propaga tal cual hacia `Funcionalidades`/UI. Solo dos excepciones capturan errores: el bloque `getAll()` que reintenta sin `$filter` cuando Graph responde `itemNotFound` (ocultando el filtro real que falló), y `UserService.getMyPhotoDataUrl()`, que traga cualquier error y devuelve `null`.

En cuanto a paginación, solo la familia "Prestamos - *" más `Compras`, `Facturas` y `PazSalvos` exponen `getByNextLink()`/`PageResult` para seguir `@odata.nextLink` vía `graph.getAbsolute()`; el resto de `getAll()` pide una sola página (`$top` opcional) y nunca sigue `@odata.nextLink`, así que una lista que supere el tamaño de página de Graph se truncará en silencio. Los dos servicios de `sharepointStorage`/`sharepointListsStorage` sí implementan correctamente un bucle `while (path) { ... path = next ? ... : "" }` sobre `@odata.nextLink`.

## Dependencias

- `src/graph/GraphRest.ts`: cliente HTTP único hacia Graph v1.0 (usado por prácticamente todos los servicios de lista, salvo `GraphUsers.service.ts`, que hace `fetch` propio, y `sharepointStorage*`, que reciben un `GraphClient` duck-typed mínimo `{ get }`).
- `@supabase/supabase-js` vía `src/Services/Supabase.service.ts`: usado por `Festivos.ts` (y potencialmente otros consumidores de Supabase fuera de este módulo).
- `src/Models/*`: tipos (`Commons.ts` con `GetAllOpts`/`PageResult`, y un tipo por dominio: `Anuncio`, `Categorias`, `Facturas`, `Usuarios`, `prestamos`, etc.) usados solo como *type-only imports*.
- `src/utils/Commons.ts`: `esc`, `ensureIds`, `pickTecnicoConMenosCasos` y otros helpers de formato (`fileToBase64`, `truncateNoCutGraphemes`, `sortByPath`).
- `localStorage` del navegador para cachear `siteId`/`listId` por lista.
- `src/graph/GrapServicesContext.tsx`: punto único de instanciación/inyección de casi todos los servicios de lista hacia el resto de la app.

## Oportunidades de mejora

- **Duplicación masiva de boilerplate**: el mismo esqueleto de ~120 líneas (constructor, `esc`, `loadCache`/`saveCache`, `ensureIds`, y el bloque de normalización de `getAll`) está copiado casi literalmente en ~30 archivos (`Actasdeentrega`, `Anuncios`, `Articulos`, `Ausencia`, `Categorias`, `CentroCostos`, `COCostos`, `Franquicias`, `Internet`, `InternetTiendas`, `Inventario`, `Items`, `ItemsFacturas`, `Plantillas`, `Proveedores`, `ProveedoresFacturas`, `Sociedades`, `SubCategorias.Service`, `Tareas`, `Tips`, `Usuarios.Service`, etc.). `CentrosFactura.service.ts` ya demuestra que una versión genérica parametrizada por `tipo`/nombre de lista es viable — ese patrón (o una factory `createSpListService<T>(graph, hostname, sitePath, listName, toModel)`) debería reemplazar la mayoría de estos archivos.
- **Restos de copiar/pegar**: `Compras.service.ts`, `PazSalvos.service.ts` y `PruebasDispositivo.service.ts` empiezan con el comentario `// src/Services/Tickets.service.ts`; `GraphUsers.service.ts` empieza con `// src/Services/GroupMembers.service.ts` y su contenido está casi duplicado en `src/Funcionalidades/access/GroupMembers.ts`.
- **Código muerto**: `RecordatoriosService` (`Recordatorios.service.ts`), `ReFacturasService` (`ReFacturas.service.ts`), `CentrosFacturaService` (`CentrosFactura.service.ts`) y `UserService` (`User.service.ts`) no tienen ningún importador fuera de su propio archivo (verificado por búsqueda en todo `src`); son duplicados huérfanos de `TareasService`, `FacturasService` y `CentroCostosService`/`COService` respectivamente y deberían eliminarse o integrarse.
- **Duplicados confusos sobre los mismos datos**: `TareasService` (registrado en el contexto) y `RecordatoriosService` (huérfano) apuntan por defecto a la misma lista "Recordatorios" y al mismo modelo `Tarea`. `Facturas.service.ts` (site IN/HD) y `ReFacturas.service.ts` (site IN/Test) mapean el mismo modelo `ReFactura` a dos conjuntos de nombres de columna SharePoint completamente distintos (`FechaEmision/NoFactura/...` vs `FechadeEmision/Numerofactura/...`), sin que quede claro cuál es la fuente autoritativa.
- **Bug de tipos**: `ItemsFacturas.service.ts` — `update()` está tipado `Partial<Omit<InternetTiendas,'ID'>>` en lugar de `Partial<Omit<ItemFactura,'ID'>>`.
- **Bug de mapeo**: `Usuarios.Service.ts` — `toModel()` lee `item?.ID`/`item.Id` del *listItem* crudo de Graph (que solo expone `item.id` en minúscula), por lo que esos *fallbacks* nunca aplican; probablemente debía leer `f.ID`/`f.Id` dentro de `fields`.
- **Logs de depuración en producción**: `dispositivos.service.ts` deja `console.log(record)`/`console.log(res)` en `create()` (puede filtrar datos de dispositivos/usuarios a la consola del navegador); `utils/Commons.ts` deja `console.table(tecnicos)` en `pickTecnicoConMenosCasos`.
- **Constantes de sitio/lista hardcodeadas y repetidas**: `hostname` y `sitePath` (`IN/HD` / `IN/Test`) están duplicados como valores por defecto en cada uno de los ~35 constructores de servicio, y otra vez en `DEFAULT_CONFIG` de `GrapServicesContext.tsx`. Deberían centralizarse en un único módulo de configuración (o vivir solo en `UnifiedConfig`) para que un cambio de sitio no implique tocar 35 archivos.
- **Paginación ausente en la mayoría de `getAll()`**: solo 8 servicios (`Compras`, `Facturas`, `PazSalvos`, `dispositivos`, `prestamos`, `pruebas`, `pruebasPrestamo`, `PruebasDispositivo`) siguen `@odata.nextLink`; el resto pide una sola página vía `$top` y trunca en silencio listas más grandes que el tamaño de página de Graph. El bucle de paginación ya correcto en `sharepointListsStorage.service.ts`/`sharepointStorage.service.ts` debería extraerse como utilidad compartida.
- **Sin reintentos/backoff**: `GraphRest.call()` lanza inmediatamente ante cualquier respuesta no-2xx (incluidos 429/503) sin inspeccionar `Retry-After` ni reintentar.
- **Tipado débil (`any`) generalizado**: casi todas las llamadas usan `graph.get<any>(...)` y `toModel(item: any)`, por lo que cambios de esquema en SharePoint (columnas codificadas como `Tecnico_x0028_Queentrega_x0029_` en `Actasdeentrega.service.ts` o `_x0052_ol2` en `Usuarios.Service.ts`) son invisibles para el compilador y solo se detectan en runtime.
- **Inconsistencias de nombres**: sufijos de archivo mezclados (`.service.ts` en la mayoría, `.Service.ts` en `Usuarios.Service.ts`/`SubCategorias.Service.ts`, sin sufijo en `Festivos.ts`); clases que no coinciden con su archivo o su lista real (`COCostos.service.ts` exporta `COService` para la lista "CentrosOperativos"; `GraphUsers.service.ts` no exporta una clase de usuarios sino funciones de membresía de grupos); campos de identificador inconsistentes entre modelos casi idénticos (`Id` en la mayoría, `ID` en `Categoria`/`Subcategoria`/`InternetTiendas`, `Codigo` en `CentroCostos`/`COCostos`).
- **APIs redundantes**: `ProveedoresFacturas.service.ts` y `CentrosFactura.service.ts` exponen un método `add()` funcionalmente idéntico a `create()`, solo con un tipo de parámetro más estrecho.
- **Configuración/seguridad de Supabase**: `Supabase.service.ts` construye el cliente sin validar que `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` existan, por lo que un `.env` mal configurado falla en silencio dentro de la primera consulta en vez de al arrancar la app. Además, nombres internos de listas/sitios y columnas codificadas de SharePoint viajan en claro dentro del bundle cliente y en las claves de `localStorage`, exponiendo la estructura interna de SharePoint a quien inspeccione el almacenamiento del navegador.
