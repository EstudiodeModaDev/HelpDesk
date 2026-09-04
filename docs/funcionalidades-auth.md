# Autenticación/Perfil de usuario (Funcionalidades/auth)

## Descripción general

Este módulo (no confundir con `src/auth/`, que implementa el flujo MSAL/OAuth) contiene lógica de **presentación y de negocio** que depende de la identidad ya autenticada: preferencia de tema visual (claro/oscuro) y resolución del **rol funcional** del usuario dentro de la mesa de ayuda (Usuario, Técnico, Jefe de zona, Administrador), además del CRUD de la lista SharePoint "Usuarios" que respalda esos roles. Es la capa que traduce "quién inició sesión" (dato que entrega `src/auth/authContext.tsx`) en "qué puede ver/hacer" y "cómo se ve la interfaz".

## Archivos

- `src/Funcionalidades/auth/Theme.ts`: hook `useTheme` para alternar y persistir el tema claro/oscuro de la UI.
- `src/Funcionalidades/auth/Usuarios.ts`: tres hooks — `useUserRole` (rol combinado grupo+SharePoint), `useIsAdmin` (chequeo de administrador solo por SharePoint) y `useUsuarios` (listado/alta/baja de usuarios en la lista SharePoint "Usuarios").

## Funciones y constantes clave

### `Theme.ts`
- `useTheme()`: estado `theme` (`"light" | "dark"`, inicializado siempre en `"light"`). En un `useEffect`, aplica `data-theme="light"` o remueve el atributo del `<html>` y persiste el valor en `localStorage.setItem("theme", theme)`. `toggle()` alterna entre `"dark"` y `"light"`. No hay lectura inicial desde `localStorage` ni desde `prefers-color-scheme`.

### `Usuarios.ts`
- `useUserRole(email?)`: resuelve el rol combinando (en este orden) reglas de grupo de Entra ID y la lista SharePoint "Usuarios", con `"Usuario"` como rol por defecto.
  - Constante `opts.groupRules` (hardcodeada dentro del hook): `[{groupId: "ca8b6719-431a-498a-ba9f-2c58242b1403", role: "Jefe de zona"}, {groupId: "937d53c8-536f-4d7c-9047-122480da727c", role: "Tecnico"}]`.
  - Usa `resolveUserRole` (`src/utils/roles.ts`) pasando `graph` y `Usuarios` (servicio SharePoint) desde `useGraphServices()`.
  - Devuelve `{ role, source, loading, error, changeUser }`. `changeUser()` alterna manualmente entre `"Usuario"` y `"Administrador"` **sin ninguna llamada de red ni verificación**, marcando `source: "manual-toggle"`.
- `useIsAdmin(email?)`: consulta directamente `Usuarios.getAll({ filter: "fields/Correo eq '<email>'" , top: 1 })` y compara `rol === "administrador"` (comparación en minúsculas). Devuelve `{ isAdmin, loading, error }`.
- `useUsuarios(usuariosSvc: UsuariosSPService)`: hook CRUD/listado sobre la lista SharePoint "Usuarios".
  - Estado: `usuarios` (todos), `tecnicos` (filtrados por `fields/Rol eq 'Tecnico'`), `administradores` (filtrados por `fields/Rol eq 'Administrador'`), `UseruserOptions` (`UserOption[]` para selects), formulario (`state`/`errors`/`submitting`).
  - `loadUsuarios`, `loadTecnicos`, `loadAdmins`: cada uno hace su propia llamada a `usuariosSvc.getAll(...)`; se ejecutan **secuencialmente** (con `await` uno tras otro) dentro de un único `useEffect`, no en paralelo.
  - `addUser()`: valida (`Title`, `Correo`) y llama a `usuariosSvc.create(state)`.
  - `deleteUser(id)`: llama a `usuariosSvc.delete(id)`.
  - `refreshUsuers()`: vuelve a cargar solo `usuarios` (no `tecnicos`/`administradores`).

## Flujo del módulo

1. `src/App.tsx` es el consumidor raíz: usa `useUserRole(user!.mail)` para decidir qué navegación/permisos mostrar y `useTheme()` para el botón de cambio de tema; ambos se inicializan una vez que el usuario ya está autenticado vía MSAL.
2. `useUserRole` también se usa en `components/Tickets/Tickets.tsx`, `components/NuevoTicket/NuevoTicketForm.tsx` y `components/DetallesTickets/TicketsRelacionados/Relacionados.tsx` para condicionar comportamiento según el rol (p. ej. quién puede crear/reasignar tickets).
3. Orden interno de `useUserRole`: al cambiar `email`, primero intenta resolver el rol por grupos de Entra ID (`getRoleFromGroups`, con caché en memoria de 5 minutos en `utils/roles.ts`), y solo si ninguna regla de grupo aplica, cae a la lista SharePoint (`getRoleFromSP`); si tampoco hay coincidencia, usa el rol por defecto `"Usuario"`.
4. `useUsuarios` se usa en `components/Usuarios/Usuarios.tsx` (listar técnicos/administradores y eliminar usuarios), `components/Usuarios/AgregarUsuarios/AgregarUsuarios.tsx` (alta), y en `NuevoTicketForm.tsx`/`DetallesTickets/Modals/Reasignar.tsx` para poblar el select de reasignación de tickets con `UseruserOptions`.
5. `useIsAdmin` está definido pero **no tiene consumidores** en `src/components` (verificado por búsqueda en el código): es lógica muerta o pendiente de integrar.

## Dependencias

- **Servicios**: `Services/Usuarios.Service.ts` (`UsuariosSPService`, CRUD sobre la lista SharePoint "Usuarios" vía `GraphRest`).
- **Utilidades**: `src/utils/roles.ts` (`resolveUserRole`, `getRoleFromGroup`, `getRoleFromGroups`, `getRoleFromSP`, con cachés en memoria `uidCache`/`membCache`/`groupMembersCache`).
- **Contexto**: `src/graph/GrapServicesContext.tsx` (`useGraphServices`, provee `graph` y `Usuarios`).
- **Modelos**: `Models/Usuarios.ts` (`UsuariosSP`, `FormNewUserErrors`), `Models/Commons.ts` (`UserOption`).
- **Auth (externo al módulo)**: `src/auth/authContext.tsx` entrega la identidad (`account`, `getToken`) que estos hooks consumen indirectamente vía `useGraphServices`/parámetro `email`.
- **Externas**: React, `localStorage` (tema).

## Oportunidades de mejora

- **`useTheme` no lee el tema guardado**: el estado inicial siempre es `"light"` (`Theme.ts`, línea 5); `localStorage.getItem("theme")` nunca se consulta al montar, solo se escribe. Resultado: la preferencia de tema del usuario no persiste entre sesiones/recargas, contradiciendo la intención evidente del `localStorage.setItem`.
- **Doble fuente de verdad para "es administrador"**: `useIsAdmin` decide solo mirando SharePoint (`fields/Rol eq 'administrador'`), mientras que `useUserRole` decide primero por grupos de Entra ID y luego por SharePoint. Para el mismo usuario podrían devolver resultados distintos; y como `useIsAdmin` no se usa en ningún componente, es código muerto que además desalinea la fuente de verdad del rol si se retoma en el futuro.
- **`changeUser()` como "interruptor" de rol sin control de acceso**: en `useUserRole`, `changeUser` cambia el rol local a `"Administrador"` sin ninguna verificación de permisos ni llamada al backend (`Usuarios.ts`, líneas 51-56). Si algún componente lo expone en la UI de producción (más allá de pruebas), cualquier usuario podría auto-otorgarse la vista de administrador en el cliente; la seguridad real dependería entonces de que **todas** las mutaciones sensibles revaliden el rol en el backend/Graph, algo que no se puede confirmar desde este módulo.
- **Reglas de grupo hardcodeadas**: los `groupId` de `"Jefe de zona"` y `"Tecnico"` están escritos literalmente dentro de `useUserRole` (`Usuarios.ts`, línea 14), igual que los `GroupID` en el módulo de Acceso. Están duplicados/dispersos en vez de vivir en una única constante de configuración compartida.
- **Llamadas secuenciales evitables**: `useUsuarios` dispara `loadUsuarios`, `loadTecnicos` y `loadAdmins` en secuencia (`await` uno tras otro) dentro del mismo `useEffect` (líneas 292-301), triplicando la latencia percibida al montar el componente en vez de usar `Promise.all`.
- **Mensaje de error copiado/incorrecto**: en `addUser` (`Usuarios.ts`, catch), el mensaje por defecto es `"Error eliminado usuarios"`, igual que el bug encontrado en `Franquicias.ts` del módulo de Acceso — mismo patrón de copy-paste repetido en al menos dos módulos.
- **Nombres inconsistentes**: `UseruserOptions` (con "User" repetido y mayúscula inicial atípica para una variable de estado) rompe la convención `camelCase` del resto del archivo (`franqOptions`, `workersOptions` en otros módulos). `refreshUsuers` tiene un error tipográfico ("Usuers").
- **`refreshUsuers` incompleto**: solo refresca `usuarios`, no `tecnicos` ni `administradores`; si un componente llama a `refreshUsuers()` esperando ver reflejado un cambio de rol en las listas filtradas, no lo verá hasta un remount completo.
- **Tipado débil**: uso de `any` para leer claims de `account` (`(account as any)?.username`, no en este archivo pero sí en el patrón usado en `resolveUserRole`/consumidores) y `JSON.stringify(opts)` como dependencia de `useEffect` en `useUserRole` (línea 48), lo que fuerza una re-serialización en cada render y es una forma fragil de expresar la dependencia real (`opts.groupRules`).
