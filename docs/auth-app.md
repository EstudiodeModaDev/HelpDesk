# Autenticación de la app (MSAL)

## Descripción general
Este módulo resuelve el login de usuarios corporativos de Estudio de Moda contra Azure AD (Microsoft Entra ID) usando `@azure/msal-browser`, y es la única fuente de tokens de acceso para el resto de la aplicación. `msal.ts` configura y encapsula la instancia `PublicClientApplication` y todo el ciclo silent→popup→redirect de adquisición de token; `authContext.tsx` expone ese comportamiento como un React Context (`AuthProvider`/`useAuth`) consumido tanto por `GrapServicesContext.tsx` como por `repositoriesContext.tsx` para construir sus respectivos `GraphRest` (ver `docs/graph.md`).

## Archivos
- `src/auth/msal.ts` — configuración de MSAL (`clientId`, `authority`, scopes, cache), y funciones de bajo nivel: `initMSAL`, `ensureActiveAccount`, `isLoggedIn`, `getAccount`, `ensureLoginPopup`/`ensureLoginRedirect`/`ensureLogin`, `getAccessToken`, `logout`, `onMsalEvent`.
- `src/auth/authContext.tsx` — `AuthProvider`/`useAuth`: envuelve las funciones de `msal.ts` en un contexto de React con estado (`ready`, `account`) y expone `getToken`, `signIn`, `signOut`.

## Funciones y constantes clave

### `msal.ts`
- **`msal = new PublicClientApplication({...})`** — instancia única a nivel de módulo (singleton por ciclo de vida de la pestaña):
  - `auth.clientId`: `'d2290169-4e11-4316-8d72-5547fa3daa08'` — **hardcodeado en el código fuente**.
  - `auth.authority`: `'https://login.microsoftonline.com/cd48ecd9-7e15-4f4b-97d9-ec813ee42b2c'` — incluye el **tenant ID** de Estudio de Moda, también hardcodeado.
  - `auth.redirectUri`: `window.location.origin` (dinámico, correcto para multi-entorno).
  - `cache.cacheLocation: 'localStorage'`, `cache.storeAuthStateInCookie: false`.
  - `system.loggerOptions`: loguea a consola con `console.debug('[MSAL]', ...)` solo si el mensaje contiene "msal"; `piiLoggingEnabled: false`.
- **`SCOPES = ['openid', 'profile', 'email', 'User.Read', 'Sites.ReadWrite.All', 'Directory.Read.All'] as const`** — scopes centralizados para login y adquisición de token. Incluye permisos amplios: `Sites.ReadWrite.All` (lectura/escritura en **todos** los sitios de SharePoint del tenant) y `Directory.Read.All` (lectura de todo el directorio de Azure AD).
- **`initMSAL(): Promise<void>`** — idempotente (`initialized` flag de módulo): llama `msal.initialize()`, procesa `handleRedirectPromise()` (captura el retorno de un login por redirect), engancha los listeners de eventos una sola vez (`wireEventsOnce`) y selecciona una cuenta activa.
- **`ensureActiveAccount(): AccountInfo | null`** — `getActiveAccount() ?? getAllAccounts()[0] ?? null`; si encuentra alguna, la fija como activa.
- **`isLoggedIn(): boolean`** — true si hay cuenta activa o al menos una cuenta en caché.
- **`getAccount(): AccountInfo | null`** — helper de lectura, igual a `ensureActiveAccount` pero sin fijar la cuenta.
- **`ensureLoginPopup()` / `ensureLoginRedirect()` / `ensureLogin(mode)`** — fuerzan login si no hay cuenta activa. En caso de fallo del popup (bloqueado/cancelado), `ensureLoginPopup` hace *fallback* a `msal.loginRedirect(...)` y retorna `new Promise<AccountInfo>(() => {})` (una promesa que **nunca se resuelve**, porque la página navega fuera). `ensureLogin` por defecto usa `mode = 'redirect'`.
- **`getAccessToken(opts?): Promise<string>`** — flujo central de obtención de token:
  1. `initMSAL()` + `ensureActiveAccount()`; si no hay cuenta, fuerza login (`popup` por defecto) o redirect según `opts.interactionMode`.
  2. Intenta `msal.acquireTokenSilent({ account, scopes: [...SCOPES, ...extra] })`.
  3. Si lanza `InteractionRequiredAuthError` y `opts.forceSilent` no está activo, intenta `acquireTokenPopup`; si eso también falla, cae a `acquireTokenRedirect` (de nuevo, retorna una promesa que nunca resuelve porque la página redirige).
  4. Si `opts.forceSilent === true`, cualquier error se relanza tal cual (no intenta interacción).
- **`logout(): Promise<void>`** — `msal.logoutRedirect({ account, postLogoutRedirectUri: "https://solvi.estudiodemoda.com.co/" })` — **URL de post-logout hardcodeada a producción**, sin usar `window.location.origin`.
- **`onMsalEvent(cb)`** — permite registrar callbacks adicionales sobre los eventos MSAL (login/logout/adquisición de token, éxito o fallo), reexportando `msal.addEventCallback`.

### `authContext.tsx`
- **`AuthCtx` (tipo)** — `{ ready, account, getToken, signIn, signOut }`.
- **`AuthProvider`**:
  - En `useEffect` de montaje: `initMSAL()` → `ensureActiveAccount()` → setea `account` y `ready = true` (incluso si `initMSAL` falla, marca `ready = true` para no bloquear la UI indefinidamente).
  - **`signIn(mode: 'popup' | 'redirect' = 'popup')`** — llama `ensureLogin(mode)` y actualiza `account`/`ready`. Nótese que aquí el valor por defecto es `'popup'`, mientras que en `msal.ts::ensureLogin` el default es `'redirect'` — el default efectivo que ve la UI es `'popup'`.
  - **`signOut()`** — llama `logout()` (de `msal.ts`) y limpia `account` localmente.
  - **`getToken(): Promise<string>`** — documentado en el tipo como *"NO fuerza login; falla si no hay sesión"*: si `!isLoggedIn()`, lanza `Error('No hay sesión iniciada...')` sin intentar interacción. Si hay sesión, llama `getAccessToken({ interactionMode: 'popup', forceSilent: false })`.
- **`useAuth()`** — hook de consumo; lanza si se usa fuera de `AuthProvider`.

## Flujo del módulo
1. `src/main.tsx` monta `<AuthProvider>` en la raíz del árbol, envolviendo a `RepositoriesProvider` y (indirectamente, vía `App.tsx`) a `GraphServicesProvider`.
2. Al montar, `AuthProvider` inicializa MSAL y rehidrata cualquier sesión existente en `localStorage` (cache de MSAL) sin requerir interacción del usuario.
3. Componentes de UI (ej. `src/components/LoginButton/LogiButton.tsx`) llaman `useAuth().signIn()`/`signOut()` para disparar login/logout explícitos; `useAuth().account` se usa para mostrar el usuario actual (nombre/correo) en la interfaz.
4. `GraphServicesProvider` (`src/graph/GrapServicesContext.tsx`) y `RepositoriesProvider` (`src/repositories/repositoriesContext.tsx`) llaman `useAuth()` únicamente para extraer `getToken` y construir sus respectivas instancias de `GraphRest`; **no** acceden a `account` ni a `signIn`/`signOut`.
5. `GraphRest.call()` invoca `getToken()` en cada petición saliente a Graph; si no hay sesión, la promesa se rechaza y la llamada HTTP falla antes de intentarse.
6. `useAuth()` es consumido directamente en 27 archivos adicionales (ej. `src/App.tsx`, `src/Funcionalidades/Tickets/NuevoTicket.ts`, `src/Models/Supabase/useCurrentUser.ts`, `src/Funcionalidades/access/Workers.ts`) típicamente para leer `account.username`/`account.name` como identificador del usuario actual (solicitante, resolutor, autor de log, etc.).
7. `src/utils/roles.ts::resolveUserRole` (consumido desde `src/Funcionalidades/auth/Usuarios.ts`) usa el correo del usuario autenticado (vía `useAuth`) más un `GraphRest` para resolver el rol de negocio (admin/técnico/usuario) consultando membresías de grupo en Graph y, como fallback, la lista SharePoint "Usuarios".

## Dependencias
- Externas: `@azure/msal-browser` (`PublicClientApplication`, `EventType`, `InteractionRequiredAuthError`, tipos `AccountInfo`/`PopupRequest`/`RedirectRequest`/`SilentRequest`).
- Internas: consumido por `src/graph/GrapServicesContext.tsx`, `src/repositories/repositoriesContext.tsx`, y ampliamente por componentes/hooks de negocio vía `useAuth()`.

## Oportunidades de mejora
- **Credenciales de Azure AD hardcodeadas en el código fuente**: `clientId` (`d2290169-4e11-4316-8d72-5547fa3daa08`) y el `tenant ID` embebido en `authority` (`cd48ecd9-7e15-4f4b-97d9-ec813ee42b2c`) están escritos literalmente en `src/auth/msal.ts` en lugar de leerse de variables de entorno (`import.meta.env.VITE_*`), como sí se hace correctamente para Supabase en `src/Services/Supabase.service.ts`. Aunque el `clientId` de una SPA no es "secreto" en sentido estricto (es público por diseño de OAuth), fijarlo en código impide desplegar el mismo build contra un app registration distinto por entorno (dev/staging/prod) sin recompilar, y mezcla configuración de infraestructura con lógica.
- **URL de post-logout hardcodeada a producción**: `logout()` en `msal.ts` usa `postLogoutRedirectUri: "https://solvi.estudiodemoda.com.co/"` fijo, en vez de `window.location.origin` (que sí se usa correctamente para `redirectUri` en la config inicial). En un entorno local o de staging, cerrar sesión redirige al usuario a producción.
- **Scopes muy amplios**: `Sites.ReadWrite.All` y `Directory.Read.All` son permisos de alcance total sobre SharePoint y Azure AD respectivamente. Si la aplicación solo necesita acceso a un conjunto acotado de sitios/listas, scopes más granulares (o permisos de aplicación con acceso restringido por sitio) reducirían la superficie de riesgo si un token se filtra.
- **Contradicción entre comentario/tipo y comportamiento real de `getToken`**: en `authContext.tsx`, el tipo documenta `getToken` como *"NO fuerza login"*, pero internamente llama `getAccessToken({ interactionMode: 'popup', forceSilent: false })`. Si la adquisición silenciosa falla con `InteractionRequiredAuthError`, `getAccessToken` sí intentará abrir un popup de interacción (y si ese falla, un redirect) — es decir, `getToken()` **puede** disparar una interacción de login pese a lo que indica su documentación en línea.
- **Promesas que nunca resuelven**: tanto `ensureLoginPopup`/`ensureLoginRedirect` como `getAccessToken` retornan `new Promise<T>(() => {})` como fallback cuando recurren a `loginRedirect`/`acquireTokenRedirect` (la navegación del redirect hace innecesaria la resolución). Cualquier código que haga `await` sobre estas funciones con un timeout propio, o intente `Promise.race`, quedará colgado indefinidamente si el redirect no ocurre por algún motivo (p.ej. bloqueado por políticas del navegador).
- **Defaults de `mode` inconsistentes**: `AuthProvider.signIn` usa `mode: 'popup' | 'redirect' = 'popup'`, mientras que `msal.ts::ensureLogin` (la función que envuelve) usa `mode: 'popup' | 'redirect' = 'redirect'` como default. No es un bug porque `signIn` siempre pasa un valor explícito, pero es una duplicación de "valor por defecto" que puede confundir a quien solo lea una de las dos firmas.
- **Manejo de errores basado en `console.warn`/`console.error`**: no hay una capa de reporting/telemetría de errores de autenticación (ej. Sentry/Application Insights); los fallos de MSAL solo quedan en la consola del navegador, dificultando diagnosticar problemas de login en producción.
- **Sin pruebas unitarias**: no se encontró ningún test para el flujo silent→popup→redirect ni para `resolveUserRole`; dada la complejidad de las ramas de fallback, sería un buen candidato para tests con mocks de `@azure/msal-browser`.
