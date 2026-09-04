# Arranque de la aplicación

## Descripción general

Este módulo cubre el proceso de arranque del frontend React de TI-HelpDesk ("Solvi"): desde que Vite sirve `index.html`, pasando por el montaje de React y la cadena de *providers* (autenticación MSAL, React Query, repositorios de datos y servicios de Graph), hasta que se renderiza el árbol de navegación de la aplicación (`Shell` / `LoggedApp`). No hay backend propio en este módulo: los providers hablan con Azure AD (MSAL) para autenticación y, a través de ellos, con Microsoft Graph/SharePoint y con Supabase (repositorios). No usa `react-router`; la navegación es un árbol de menú manejado con `useState` y funciones de utilidad (`filterNavTree`, `findById`, `firstLeafId`).

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Documento HTML raíz servido por Vite; monta `#root` y carga `src/main.tsx` como módulo ES. |
| `src/main.tsx` | Punto de entrada de React: crea el root, envuelve la app en `StrictMode` y en la cadena de providers globales (`ConfirmProvider`, `AuthProvider`, `RepositoriesProvider`, `QueryClientProvider`), y monta el `Toaster` de notificaciones. |
| `src/App.tsx` | Componente raíz de la aplicación: define el árbol de navegación (`NAV`), la lógica de visibilidad por rol, el `Sidebar`, el `Shell` (gate de autenticación) y `LoggedApp` (shell autenticado con contenido dinámico). |
| `src/vite-env.d.ts` | Referencia de tipos (`/// <reference types="vite/client" />`) para que TypeScript entienda `import.meta.env` y los módulos especiales de Vite (SVG, CSS, etc.). No contiene lógica. |
| `src/Debug/DebugIds.ts` | Utilidad de depuración manual que resuelve, vía Microsoft Graph, el `site.id` y `list.id` de la lista SharePoint "Tickets" a partir de hostname/sitePath hardcodeados, e imprime el resultado por `console.log`. |
| `vite.config.ts` | Configuración de Vite: habilita los plugins `@vitejs/plugin-react` y `vite-plugin-svgr` (para importar SVGs como componentes React). |

## Funciones y constantes clave

- **`createRoot(...).render(...)`** (`main.tsx`): monta el árbol React en `#root`. Efecto secundario: instancia un `QueryClient` de TanStack Query con `staleTime: 0`, `retry: 1` (backoff exponencial hasta 10s) para queries y `retry: 0` para mutaciones.
- **`App()`** (`App.tsx`, export default): componente raíz. No recibe props. Envuelve `GraphServicesGate` dentro de `AuthProvider`.
- **`GraphServicesGate({ children })`**: sólo instancia `GraphServicesProvider` (que construye ~28 servicios de Graph/SharePoint) cuando `ready && account` son verdaderos; evita crear servicios de Graph antes de tener sesión.
- **`Shell()`**: usa `useAuth()` para leer `ready`/`account`; si no hay sesión, muestra `WelcomeSolvi` con botón de login (`signIn("popup")`); si hay sesión, delega en `LoggedApp`.
- **`LoggedApp({ user })`**: calcula el rol (`useUserRole`), obtiene `services` (Graph) y `repositories` (Supabase/SharePoint), computa el árbol de navegación visible (`filterNavTree(NAV, navCtx)`), mantiene el ítem seleccionado en estado local, y ejecuta un heartbeat (`heartBeatControl()`) cada 4.5 minutos vía `window.setInterval`. Efecto secundario: persiste el estado colapsado del sidebar en `localStorage` (`sb-collapsed`).
- **`NAV: MenuItem[]`**: árbol de navegación declarativo; cada nodo define `roles` permitidos y, opcionalmente, un `when` o `flags` para visibilidad condicional, y un `to` (nodo React estático o función `(ctx) => ReactNode` cuando necesita servicios inyectados).
- **`isVisible`, `filterNavTree`, `firstLeafId`, `findById`**: utilidades puras que implementan el "enrutamiento" por selección de estado en lugar de URL — no hay `react-router-dom` en el árbol de dependencias de este módulo, por lo que no hay URLs profundas, ni back/forward del navegador, ni bookmarks a una vista específica.
- **`debugResolveTicketsIds(getToken)`** (`DebugIds.ts`): función async que recibe un `getToken` y hace 4 llamadas secuenciales a Graph (`/sites/{host}:{path}`, `/sites/{id}/lists`, `/sites/{id}/lists?$filter=...`, `/sites/{id}/lists/{id}/items?...&$top=3`) para depurar manualmente los IDs de sitio/lista de SharePoint. Constantes hardcodeadas dentro de la función: `hostname = 'estudiodemoda.sharepoint.com'`, `sitePath = '/sites/TransformacionDigital/IN/HD'`, `listDisplayName = 'Tickets'`.
- **`vite.config.ts` → `defineConfig({ plugins: [react(), svgr()] })`**: no define `envPrefix`, `base`, ni variables de entorno; configuración mínima.

## Flujo del módulo

1. El navegador carga `index.html`, que fija `data-theme="light"` en `<html>`, define el favicon/título ("Solvi - Tu solución empieza aqui.") y carga `/src/main.tsx` como módulo.
2. `main.tsx` crea el `QueryClient` y monta el árbol: `StrictMode → ConfirmProvider → AuthProvider → RepositoriesProvider → QueryClientProvider → App + Toaster`.
   - `AuthProvider` (`src/auth/authContext.tsx`) inicializa MSAL (`initMSAL()`), procesa el retorno de un posible redirect y determina la cuenta activa; expone `ready`, `account`, `getToken`, `signIn`, `signOut`.
   - `RepositoriesProvider` (`src/repositories/repositoriesContext.tsx`) instancia repositorios contra Supabase (`SupabaseTicketRepository`, `AttachmentFromSupabase`, `LogFromSupabase`, `SupabaseMessageRepository`) y uno contra SharePoint (`UsuariosSPFromSharepoint`, `SharepointANS`), usando un `GraphRest` construido con el `getToken` de `AuthProvider`.
3. Dentro de `App()`, `AuthProvider` se vuelve a anidar (redundante, ver hallazgos) y `GraphServicesGate` decide si instanciar `GraphServicesProvider` (que crea ~28 servicios tipados sobre listas SharePoint específicas, más `SharePointStorageService`) — sólo cuando ya hay `account`.
4. `Shell` decide entre mostrar la pantalla de bienvenida/login (`WelcomeSolvi`) o `LoggedApp` según `ready`/`account` de MSAL.
5. `LoggedApp` calcula el rol del usuario, filtra `NAV` según rol/flags, selecciona la primera hoja visible como vista inicial, arranca el heartbeat periódico, y renderiza `Sidebar` + el contenido (`element`) correspondiente al ítem seleccionado. El usuario ve la app completamente interactiva en este punto; no hay pantalla de carga explícita aparte del corto período en que `ready` es `false`.
6. La navegación entre vistas ocurre completamente en memoria: `handleSelect(id)` cambia `selected` (estado de React), no la URL — recargar la página siempre vuelve a la primera hoja visible.

## Dependencias

- **MSAL**: `@azure/msal-browser` (`PublicClientApplication`, manejo de eventos, tokens silent/popup/redirect) vía `src/auth/msal.ts`.
- **TanStack React Query**: `@tanstack/react-query` (`QueryClient`, `QueryClientProvider`) configurado sólo en `main.tsx`; `App.tsx` no muestra usos directos de `useQuery` (probablemente usado en componentes hijos no cubiertos por este módulo).
- **react-hot-toast**: para notificaciones globales (`Toaster`).
- **vite-plugin-svgr** y **@vitejs/plugin-react**: build tooling.
- **No hay `react-router` ni librería de enrutamiento** — confirmado por la ausencia de imports de router en `App.tsx`/`main.tsx` y por el uso de `useState` + funciones de árbol para la "navegación".
- `src/Debug/DebugIds.ts` depende de `src/graph/GraphRest.ts` (cliente Graph interno del proyecto).
- No se detectan tipos compartidos entre este módulo y `supabase/functions/*/types.ts` (Deno); los tipos de UI (`src/Models/*`) son independientes, como es de esperar dado el aislamiento de runtime.

## Oportunidades de mejora

- **Navegación sin URL**: al no usar `react-router`, no hay deep-linking, no se puede compartir un enlace a una vista concreta (por ejemplo, "Ver Tickets"), y el botón "atrás" del navegador no funciona dentro de la app. Para una mesa de ayuda con múltiples roles y vistas, esto limita la usabilidad (por ejemplo, no se puede recargar la página conservando la vista actual).
- **Falta de pantalla de error/loading explícita**: si `initMSAL()` falla (bloque `catch` en `AuthProvider`), sólo se hace `console.error` y se marca `ready = true`, mostrando el flujo de "no logueado" sin informar al usuario que hubo un error real de configuración (distinto de simplemente no tener sesión).
- **Persistencia de UI en `localStorage` sin manejo de cuota/errores más allá de un `try/catch` vacío**: funcional pero silencioso ante fallos (por ejemplo, modo incógnito con storage bloqueado).
