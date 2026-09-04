# Cliente Graph

## Descripción general
Este módulo centraliza toda la comunicación HTTP con Microsoft Graph (v1.0) que la aplicación usa para leer/escribir listas de SharePoint. `GraphRest.ts` es un cliente REST minimalista sin dependencias externas (usa `fetch` nativo) que añade automáticamente el token de acceso a cada llamada. `GrapServicesContext.tsx` (nombre con error tipográfico: "Grap" en vez de "Graph") es el proveedor de contexto de React que crea una única instancia de `GraphRest` y, sobre ella, instancia decenas de "servicios" por lista de SharePoint (Sociedades, Proveedores, Tickets legado, Usuarios, Inventario, etc.), exponiéndolos a toda la app.

## Archivos
- `src/graph/GraphRest.ts` — cliente HTTP genérico para Microsoft Graph: helpers `get/post/patch/delete/getAbsolute/getBlob/getWithHeaders`.
- `src/graph/GrapServicesContext.tsx` — `GraphServicesProvider`/`useGraphServices`: arma la configuración de sitios/listas y crea todos los servicios concretos que envuelven `GraphRest` para cada lista SharePoint.

## Funciones y constantes clave

### `GraphRest.ts`
- **`base = 'https://graph.microsoft.com/v1.0'`** — URL base de Graph, hardcodeada como propiedad de instancia (puede sobreescribirse por parámetro `baseUrl` del constructor, pero nunca se hace en la práctica).
- **`constructor(getToken: () => Promise<string>, baseUrl?: string)`** — inyecta la función para obtener el token (viene de `useAuth().getToken`, ver `docs/auth-app.md`); no guarda el token, lo re-solicita en cada llamada.
- **`private call<T>(method, path, body?, init?): Promise<T>`** — método núcleo usado por `get/post/patch/delete`:
  - Obtiene el token con `await this.getToken()` en cada invocación.
  - Arma headers: `Authorization: Bearer <token>`, `Content-Type: application/json` solo si hay `body`, y siempre `Prefer: HonorNonIndexedQueriesWarningMayFailRandomly` (necesario para `$filter` sobre columnas no indexadas de listas grandes de SharePoint).
  - Si `!res.ok`, intenta leer el cuerpo como texto y luego parsearlo como JSON para extraer `error.message`/`message`; si falla, usa el texto crudo. Lanza `new Error(`${method} ${path} → ${status} ${statusText}: detalle`)` — **un `Error` plano de mensaje string**, sin código de estado ni objeto de error estructurado.
  - Maneja `204 No Content` devolviendo `undefined`.
  - Si el `content-type` es JSON, parsea; si no, devuelve el texto crudo tipado como `T`.
- **`get/post/patch/delete`** — wrappers públicos de `call` con la firma HTTP correspondiente. `patch` documenta en comentario que Graph normalmente responde `204` en updates de `/fields`, ya cubierto por `call`.
- **`getBlob(path)`** — hace un `fetch` GET aparte (duplica headers y URL en vez de reutilizar `call`) y devuelve `res.blob()`; usado para descargar adjuntos/archivos binarios.
- **`getWithHeaders(path, extraHeaders)`** — otro `fetch` GET independiente que permite pasar headers adicionales (ej. `$expand`, rangos); asume siempre JSON en la respuesta salvo `204`.
- **`getAbsolute<T>(url, init?)`** — variante de `get` que acepta una URL absoluta en vez de un path relativo a `base`; se usa para seguir manualmente el `@odata.nextLink` que Graph devuelve al paginar listas grandes. Duplica de nuevo la lógica de armado de headers y manejo de errores de `call`.
- **Tipos exportados**: `GraphRecipient`, `GraphSendMailPayload` (para enviar correos vía `/sendMail` de Graph — no se usan directamente dentro de este archivo, son tipos de soporte para quien construya el payload).

### `GrapServicesContext.tsx`
- **`SiteConfig`** — `{ hostname: string; sitePath: string }`.
- **`UnifiedConfig`** — agrupa dos sitios (`hd`: sitio principal Helpdesk, `test`: sitio de pruebas "Paz y salvos") y el mapa `lists` con el nombre real de cada lista de SharePoint por entidad (más de 25 entradas: Sociedades, Proveedores, Plantillas, Internet, Usuarios, Categorias, Facturas, Inventario, Ausencias, préstamos de dispositivos, etc.).
- **`DEFAULT_CONFIG: UnifiedConfig`** — valores por defecto **hardcodeados**: `hostname: "estudiodemoda.sharepoint.com"`, `sitePath: "/sites/TransformacionDigital/IN/HD"` (y `/IN/Test` para el sitio de pruebas), más los ~28 nombres de listas literales.
- **`GraphServicesProvider`** (`React.FC<{ children, config? }>`):
  - Toma `getToken` de `useAuth()` y crea `const graph = useMemo(() => new GraphRest(getToken), [getToken])` — instancia única de `GraphRest` compartida por todos los servicios de este contexto.
  - Combina `config` (prop opcional) con `DEFAULT_CONFIG` (merge superficial de `lists`, normalizando que `sitePath` empiece con `/`).
  - Instancia ~30 clases de servicio (`SociedadesService`, `ProveedoresService`, ..., `PazSalvosService`, `SharePointStorageService`), todas construidas como `new XxxService(graph, hostname, sitePath, listName)` — mismo patrón que las implementaciones SharePoint de `src/repositories` (ver `docs/repositories.md`).
  - Expone todo como un único objeto `GraphServices` memoizado.
- **`useGraphServices()`** — hook de consumo; lanza error si se usa fuera del provider.

## Flujo del módulo
1. `main.tsx`/`App.tsx` envuelve el árbol con `<AuthProvider>` y luego `<GraphServicesProvider>` (ver `src/App.tsx` líneas ~434-446), de modo que `GraphServicesProvider` puede llamar `useAuth()` para obtener `getToken`.
2. `GraphRest` recibe esa función `getToken` y la usa para autorizar cada petición saliente — no interactúa directamente con MSAL, delega completamente en el `AuthContext` (ver `docs/auth-app.md`).
3. `GraphServicesProvider` construye un único `GraphRest` y se lo pasa a todos los servicios de lista; cada servicio (fuera del alcance de esta documentación específica, en `src/Services/*.service.ts`) usa esa instancia para hacer `get/post/patch` contra su lista SharePoint correspondiente.
4. Los componentes/hooks de negocio llaman `useGraphServices()` (encontrado en 31 archivos: `src/App.tsx`, `src/components/Tickets/Tickets.tsx`, `src/Funcionalidades/Tickets/ActaEntrega.ts`, `src/components/Usuarios/*`, `src/components/Tareas/*`, `src/components/Storage/StoragePage.tsx`, etc.) para acceder a un servicio concreto (ej. `Usuarios`, `Tareas`, `Inventario`, `Storage`).
5. Independientemente, `src/repositories/repositoriesContext.tsx` también crea su **propia** instancia de `GraphRest(getToken)` (ver `docs/repositories.md`) — es decir, en runtime existen **dos instancias distintas** de `GraphRest` (una por cada Provider), ambas usando el mismo `getToken`, pero sin compartir caché ni estado entre sí.
6. `src/utils/roles.ts` y `src/utils/Commons.ts` reciben un `GraphRest` ya resuelto como parámetro (no consumen el contexto directamente) para hacer llamadas puntuales a `/users`, `/groups/.../members`, `checkMemberGroups`, etc.

## Dependencias
- Internas: `src/auth/authContext.tsx` (`useAuth` → `getToken`), ~28 clases en `src/Services/*.service.ts` (consumidoras de `GraphRest`), `src/repositories/*` (otro consumidor de `GraphRest`).
- Externas: ninguna librería de terceros; se apoya solo en `fetch`, `URLSearchParams` y `Response` del navegador. No usa el SDK oficial `@microsoft/microsoft-graph-client` ni `isomorphic-fetch`.

## Oportunidades de mejora
- **Duplicación de lógica de fetch/errores**: `call()`, `getWithHeaders()` y `getAbsolute()` reimplementan por separado la construcción de headers, el chequeo de `res.ok` y el parseo de error/JSON, en vez de compartir un único helper interno. Cualquier cambio (p.ej. añadir manejo de rate-limit) debe replicarse en tres sitios.
- **Sin abstracción de paginación**: no existe un método tipo `getAllPages()`/async generator que siga automáticamente `@odata.nextLink`. Cada consumidor que necesita todas las páginas reimplementa el bucle manualmente (ver `TicketsFromSharepoint.ts` y `UsuariosFromSharepoint.ts`, ambos con un `fetchPage`/`getByNextLink` casi idéntico, y `src/utils/roles.ts::getGroupMemberIds`, que también pagina a mano).
- **Sin reintentos ni manejo de throttling**: Graph puede responder `429 Too Many Requests` con cabecera `Retry-After`; `GraphRest` no la lee ni reintenta — cualquier `429` se propaga como error genérico igual que un `500`.
- **Errores sin estructura**: como se detalla en `docs/repositories.md`, `SharepointANS.loadANS` intenta inspeccionar `e?.error?.code` asumiendo la forma de error nativa de Graph, pero `GraphRest` solo lanza `Error(string)`. Sería más robusto que `GraphRest` lanzara una clase de error propia (`GraphError`) con `status`, `code` y `raw` como propiedades tipadas, en lugar de incrustar todo en el `message`.
- **Sin `AbortController`/timeout**: ninguna llamada admite cancelación o timeout; una petición colgada bloquea indefinidamente al llamador (aunque `init?: RequestInit` permite pasar una `signal` manualmente, ningún consumidor lo hace).
- **Nombre del archivo/contexto con typo**: `GrapServicesContext.tsx` (falta la "h" de "Graph"), lo que dificulta encontrarlo por búsqueda de texto.
- **Config de sitios/listas hardcodeada en código fuente**: `DEFAULT_CONFIG` en `GrapServicesContext.tsx` fija `hostname`/`sitePath` de producción (`estudiodemoda.sharepoint.com`, `/sites/TransformacionDigital/IN/HD` y `/IN/Test`) directamente en el bundle, en lugar de variables de entorno (`VITE_*`, como sí se hace para Supabase en `src/Services/Supabase.service.ts`). Esto complica probar contra un sitio de SharePoint distinto sin recompilar.
- **Dos instancias independientes de `GraphRest`**: `GrapServicesContext.tsx` y `repositoriesContext.tsx` crean cada una su propio `GraphRest`; no hay una única fuente compartida, lo que impide cachear/instrumentar centralizadamente todas las llamadas a Graph.
- **Sin pruebas unitarias**: no se halló ningún test para `GraphRest` (parseo de errores, manejo de 204, `getAbsolute` vs `get`), pese a ser el punto único de fallo de todas las integraciones con SharePoint.
