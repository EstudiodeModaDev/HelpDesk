# Acceso

## Descripción general

El módulo de Acceso agrupa la lógica para administrar quién puede usar la mesa de ayuda y con qué datos de "personas" se pueblan los formularios del sistema (solicitantes, franquicias, técnicos, colaboradores). Combina dos backends distintos: SharePoint vía Microsoft Graph (listas `Franquicias` y, potencialmente, `Usuarios`) y Microsoft Entra ID/Graph directamente (grupos de seguridad y usuarios del tenant). Es el punto de entrada para la pantalla de administración de acceso (`Acceso.tsx`) y para poblar selects de "solicitante"/"trabajador"/"franquicia" en varios formularios (tickets, tareas, préstamos, observadores).

## Archivos

- `src/Funcionalidades/access/Franquicias.ts`: hook `useFranquicias` que carga, mapea a opciones de select y crea registros de la lista SharePoint "Franquicias" (tiendas/franquicias de la compañía).
- `src/Funcionalidades/access/GroupMembers.ts`: helpers de bajo nivel contra Microsoft Graph (fetch/post/delete crudos) y el hook `useGroupMembers` para listar, buscar, paginar (en cliente) y añadir/quitar miembros de un grupo de Entra ID.
- `src/Funcionalidades/access/Workers.ts`: hook `useWorkers` que combina usuarios de Microsoft Graph (`/users`) con una lista opcional de SharePoint, deduplica y cachea el resultado en memoria para poblar selects de "trabajador".

## Funciones y constantes clave

### `Franquicias.ts`
- `useFranquicias(FranquiciasSvc: FranquiciasService)`: hook principal.
  - Estado: `franquicias` (lista mapeada), `franqOptions` (`UserOption[]` para selects), `state`/`errors`/`submitting` (formulario de alta), `pageSize`/`pageIndex`/`nextLink` (paginación declarada pero no conectada a `FranquiciasSvc.getAll`).
  - `loadFranquicias()`: llama a `FranquiciasSvc.getAll()`, soporta tanto array plano como `{items, nextLink}`, mapea con `mapRowToFranquicia` y arma `franqOptions` con `mapFranqToOptions`. Se ejecuta automáticamente en un `useEffect`.
  - `validate()`: validación mínima de campos requeridos (`Title`, `Correo`, formato de correo).
  - `addFranquicia()`: valida, llama a `FranquiciasSvc.create(state)` (POST a Graph contra la lista SharePoint `Franquicias`).
  - `refresh()`: vuelve a invocar `loadFranquicias`.

### `GroupMembers.ts`
- `graphGet/graphPost/graphDelete`: wrappers `fetch()` crudos contra `https://graph.microsoft.com/v1.0`, con manejo de errores por código HTTP.
- `fetchGroupMembers(groupId, getToken, transitive=true)`: pagina `/groups/{id}/transitiveMembers` (o `/members`) con `$top=999` y filtra el resultado a "usuarios" mediante heurística (`@odata.type` termina en `user` o existe `userPrincipalName`).
- `addMemberByUserId`, `getUserIdByEmail`, `removeMemberByUserId`, `removeMemberByEmail`, `removeMembersBulk`: operaciones exportadas de alto nivel sobre membresía de grupos de Entra ID, usadas también directamente por componentes (no solo vía el hook).
- `useGroupMembers(groupId: string)`: hook principal.
  - Carga miembros transitivos del grupo (`refresh`), expone búsqueda (`search`) y paginación en cliente (`pageSize`, `pageIndex`, `nextPage`/`prevPage`).
  - Acciones: `addCollaboratorByUserId`, `deleteByUserId`, `deleteByEmail`, `deleteCollaborator` (acepta id o correo, decide con una regex de GUID), todas seguidas de `refresh()`.

### `Workers.ts`
- Constante `cache` (módulo, `Record<CacheKey, {data, promise}>`): caché en memoria compartida entre todas las instancias del hook, con clave derivada de las opciones (`cacheKey`).
- `mapGraphUser` / `mapSPRowToWorker`: normalizan usuarios de Graph y filas de SharePoint al tipo `Worker` (`Models/Commons.ts`).
- `fetchUsersFromGraph(graph)`: pagina `/users` con `$select=id,displayName,mail,userPrincipalName,jobTitle,accountEnabled` y `$top=999`, deduplica por correo/id.
- `fetchUsersFromSharePoint(opts)`: si se pasa `opts.spListService`, trae ítems y los mapea con `mapSPRowToWorker`.
- `useWorkers(options?: Options)`: combina ambas fuentes (`Promise.all`), fusiona con prioridad correo > id > nombre, ordena alfabéticamente, cachea y expone `workers`, `workersOptions`, `filter(term)` (búsqueda normalizada sin tildes) y `refresh()` (invalida la entrada de caché).

## Flujo del módulo

1. `src/components/Acceso/Acceso.tsx` es el consumidor principal: fija `GroupID = '003ae091-49b2-415b-a285-35fca3bca9f3'` (hardcoded) y usa `useGroupMembers(GroupID)` para listar miembros actuales del grupo, y `useWorkers()` para ofrecer candidatos a agregar. Llama directamente a `addMemberByUserId`/`removeMemberByUserId`/`removeMemberByEmail` (no solo a través del hook) para las acciones de la UI.
2. `useFranquicias` se usa en `AgregarFranquicias.tsx` (dos ubicaciones: `Acceso/OtorgarAcceso` y `Usuarios/AgregarFranquicias`) para dar de alta franquicias, y en `Usuarios.tsx`, `NuevoTicketForm.tsx`, `Observador.tsx` y `TareasForm.tsx` para poblar el select de franquicia/solicitante.
3. `useWorkers` se reutiliza en `NuevoTicketForm.tsx`, `Observador.tsx`, `TareasForm.tsx` y `Loans/Secciones.tsx` para listar "trabajadores" (empleados) al crear tickets, asignar tareas u observadores, o gestionar préstamos.
4. Efecto de red típico: al montar el componente, el hook dispara automáticamente su carga (`useEffect`); las mutaciones (crear franquicia, agregar/quitar miembro) vuelven a disparar `refresh()`/`loadFranquicias()` para reflejar el cambio.

## Dependencias

- **Servicios**: `Services/Franquicias.service.ts` (`FranquiciasService`, CRUD sobre la lista SharePoint `Franquicias` vía `GraphRest`); `graph/GraphRest` (usado por `Workers.ts`, no por `GroupMembers.ts`, que usa `fetch` directo).
- **Modelos**: `Models/Franquicias.ts` (`Franquicias`, `FormFranquinciasError`), `Models/Commons.ts` (`UserOption`, `Worker`), `Models/GraphUsers.ts` (`GraphUser`, `GraphListResponse`).
- **Auth**: `src/auth/authContext.tsx` (`useAuth`) para obtener `getToken`/`ready` en `GroupMembers.ts` y `Workers.ts`.
- **Externas**: React (`useState`/`useCallback`/`useEffect`), `fetch` nativo, `localStorage` (usado indirectamente por `FranquiciasService` para cachear `siteId`/`listId`).

## Oportunidades de mejora

- **ID de grupo hardcodeado**: `GroupID` está fijo en `Acceso.tsx`, no en configuración ni en el contexto de servicios (`GrapServicesContext`), dificultando reutilizar `useGroupMembers` para otros grupos o cambiar de entorno (dev/prod) sin tocar código.
- **Caché global mutable**: el objeto `cache` de `Workers.ts` vive a nivel de módulo (no por componente ni por usuario), compartido entre todas las instancias del hook durante la vida de la pestaña; si cambia el usuario autenticado sin recargar la página, podría mostrarse una lista de trabajadores obsoleta hasta llamar `refresh()`.
- **Tipado débil generalizado**: uso extendido de `any` en mapeos (`mapRowToFranquicia`, `mapSPRowToWorker`, `graphGet<T>`) y de `as any` para leer campos de `account` (no en este módulo directamente, pero sí `(f as any).Nombre1`), lo que anula las garantías de TypeScript sobre la forma real de los datos de SharePoint/Graph.
