# Componentes Operativos (tienda, POS, proveedores, tips, inventario)

## Descripción general
Este módulo agrupa pantallas operativas usadas por el equipo de TI/soporte para tareas de negocio puntuales y no directamente ligadas al ciclo de vida de un ticket: creación de usuarios de caja (POS), consulta de información de tiendas y proveedores de internet, alta de activos de inventario asociados a un ticket, y administración de los avisos/tips que se muestran en la landing de login. Son formularios y tablas de consulta que envuelven hooks de `Funcionalidades/operations` y `Funcionalidades/content`.

## Archivos
- `src/components/CajerosPOS/CajerosPOS.tsx` (`CajerosPOSForm`): formulario para crear un usuario de caja POS (solicitante, cédula, CO, compañía) usando `react-select` para el combo de compañía.
- `src/components/Info/InfoProveedores/InfoProveedores.tsx` (`InfoProveedores`): tabla de proveedores de internet (Claro/Tigo) filtrable por un `<select>`.
- `src/components/Info/InfoTienda/InfoTienda.tsx` (`StoreInfoPanel`): tabla de información de tiendas (sociedad, NIT, ciudad, proveedor, etc.) con buscador por nombre/identificador.
- `src/components/Info/Informacion.tsx` (`InfoPage`): contenedor que alterna entre `StoreInfoPanel` e `InfoProveedores` mediante un `<select>` de "orden".
- `src/components/Inventario/ModalInventario/ModalInventario.tsx` (`CrearInventarioModal`): modal para registrar un activo de inventario (equipo) asociado a un ticket (`IdTicket`).
- `src/components/TipsTable/ModalAgregar/ModalAgregar.tsx` (`AnnouncementModal`): modal para crear un anuncio/tip (título, subtítulo, tipo).
- `src/components/TipsTable/TipsTable.tsx` (`AnnouncementsTable`): tabla de anuncios/tips con búsqueda, filtro por tipo y toggle de activo/inactivo; abre `AnnouncementModal` para crear uno nuevo.

## Funciones y constantes clave

| Componente | Props | Hooks de Funcionalidades | Estado local | Efectos / Handlers |
|---|---|---|---|---|
| `CajerosPOS.tsx` | `services: { Tickets?, Logs }` (repositorios) | `useCajerosPOS(services)` (`src/Funcionalidades/operations/CajerosPos.ts`) → `state, setField, errors, submitting, handleSubmit` | ninguno propio; constante módulo `companiaOptions` (Estudio de Moda, DH Retail, Denim Head) | `onSubmit` delega todo en `handleSubmit(e)` del hook |
| `InfoProveedores.tsx` | ninguna | `useProveedores(ProveedoresSvc)` (`src/Funcionalidades/operations/ProveedoresInternet.ts`) → `rows, setFilterMode`; servicio inyectado vía `useGraphServices()` | ninguno | `onChange` del `<select>` llama `setFilterMode(valor)` |
| `InfoTienda.tsx` (`StoreInfoPanel`) | ninguna | `useInfoInternetTiendas(InternetSvc, CompaniasSvc)` (`src/Funcionalidades/operations/InfoTienda.ts`) → `setQuery, rows, loading, error, loadQuery, query` | constante módulo `COLS` (definición de columnas tipadas sobre `InfoInternetTienda`) | `onSubmit` del form llama `loadQuery()` (búsqueda manual, no reactiva al tipear) |
| `Informacion.tsx` (`InfoPage`) | ninguna | ninguno directo (orquesta los dos anteriores) | `orden` (`"tiendas" \| "proveedores"`) | cambia de panel según el `<select>` |
| `ModalInventario.tsx` | `open`, `submitting?`, `onClose`, `IdTicket` | `useInventario({ Inventario })` (`src/Funcionalidades/operations/Inventario.ts`) → `state, entradaPorPrimeraVez, setField` | ninguno propio | `useEffect` cierra con `Escape`; `onSubmit` llama `entradaPorPrimeraVez(IdTicket)` |
| `ModalAgregar.tsx` (`AnnouncementModal`) | `open`, `onCancel`, `tipos?` (default `["Seguridad","Lanzamiento","Tip"]`) | `useTips(TipsInicio)` (`src/Funcionalidades/content/Anuncementes.ts`) → `setField, state, handleSubmit, loading, errors` | ninguno propio | `useEffect` cierra con `Escape`; `onSubmit` delega en `handleSubmit(e)` |
| `TipsTable.tsx` (`AnnouncementsTable`) | ninguna | `useTips(TipsInicio)` → `tips, loading, loadTips, onToggle` | `query`, `tipo` (filtro), `modalAgregar` | `useEffect([loadTips])` carga tips al montar; `tipos`/`filtered` con `useMemo`; `onChange` del checkbox llama `onToggle(id)`; helper `slug()` para clase CSS del badge |

## Flujo del módulo
- **POS**: el usuario abre `CajerosPOSForm`, completa cédula/CO/compañía (los campos "Solicitante" y "Correo solicitante" se muestran pero no son editables porque no tienen `onChange`, ver hallazgos) y al enviar el formulario el hook `useCajerosPOS` gestiona validación y envío (probablemente creación de ticket/registro vía `services.Tickets`/`services.Logs`).
- **Información**: `InfoPage` decide qué panel mostrar; `StoreInfoPanel` requiere que el usuario escriba y pulse "Buscar" (no hay debounce ni búsqueda en vivo), mientras que `InfoProveedores` filtra apenas se cambia el `<select>` de proveedor.
- **Inventario**: `CrearInventarioModal` se abre típicamente desde la vista de detalle de un ticket (recibe `IdTicket`), permite cargar los datos de un activo nuevo y al enviarlo llama `entradaPorPrimeraVez(IdTicket)`, que registra el activo ligado a ese ticket.
- **Tips/Anuncios**: `AnnouncementsTable` carga la lista completa al montar, permite buscar/filtrar en memoria y act/desactivar cada anuncio con un switch; el botón "+" abre `AnnouncementModal`, que crea un nuevo anuncio y (presumiblemente) el padre necesita refrescar la tabla — no se observó un callback `onCreated`/`onSuccess` que dispare `loadTips()` tras cerrar el modal (ver hallazgos).

## Dependencias
- **Funcionalidades**: `operations/CajerosPos.ts` (`useCajerosPOS`), `operations/ProveedoresInternet.ts` (`useProveedores`), `operations/InfoTienda.ts` (`useInfoInternetTiendas`), `operations/Inventario.ts` (`useInventario`), `content/Anuncementes.ts` (`useTips`).
- **Models**: `src/Models/Internet.ts` (`InfoInternetTienda`).
- **Repositorios/Servicios**: `src/repositories/TicketsRepository/TicketRepository`, `src/repositories/LogRepository/LogRespository`, `src/Services/Proveedores.service` (`ProveedoresService`), `src/Services/Internet.service` (`InternetService`), `src/Services/Sociedades.service` (`SociedadesService`), `src/Services/Inventario.service` (`InventarioService`), todos inyectados vía `src/graph/GrapServicesContext` (`useGraphServices`).
- **Librerías externas**: `react-select` (combo de compañía en `CajerosPOS.tsx`); el resto usa HTML nativo (`<select>`, `<table>`) con CSS por componente.

## Oportunidades de mejora
1. **Campos controlados sin `onChange` (bug de UI)**: en `CajerosPOS.tsx`, los inputs de `state.solicitante` y `state.CorreoTercero` (líneas ~34 y ~38) tienen `value` pero ningún `onChange`; React tratará estos campos como de solo lectura y emitirá advertencias en consola. Si la intención es que sean de solo lectura (autocompletados desde el usuario logueado), deberían llevar el atributo `readOnly` explícito en vez de depender del comportamiento implícito. El mismo patrón aparece en `ModalInventario.tsx` en los campos `ResponsableEntrada`, `FechaEntrada` y `CasoEntrada`.
2. **Casts `as any` para errores**: `CajerosPOS.tsx` usa repetidamente `(errors as any).Cedula`, `(errors as any).CO`, `(errors as any).Compañia` en vez de tipar correctamente el objeto `errors` devuelto por `useCajerosPOS`, perdiendo el chequeo de tipos que sí existe en formularios equivalentes de otros módulos (p. ej. `AgregarUsuarios.tsx`).
3. **Doble cast de servicios con `as ReturnType<typeof useGraphServices> & {...}`**: se repite en `InfoProveedores.tsx`, `InfoTienda.tsx` y `ModalInventario.tsx`. Sugiere que `useGraphServices()` no tiene un tipo de retorno completo/actualizado y cada componente parchea el tipo localmente; sería más mantenible tipar correctamente el contexto una sola vez.
4. **Nombre de archivo/CSS compartido engañoso**: `InfoProveedores.tsx` importa `"./InfoTienda.css"` (no un CSS propio de proveedores), lo que sugiere copy-paste del componente de tienda sin renombrar el import; puede causar acoplamiento de estilos no intencional entre ambas pantallas.
5. **Sin refresco tras crear**: ni `AnnouncementModal` recibe un callback `onCreated`/`onSaved` ni `TipsTable.tsx` vuelve a llamar `loadTips()` al cerrar el modal (`onCancel` solo cierra), por lo que tras crear un anuncio la tabla no se actualiza automáticamente a menos que `useTips` comparta estado global entre instancias.
6. **Estado de carga/error inconsistente**: `InfoTienda.tsx` maneja `loading`/`error` explícitos; `InfoProveedores.tsx` no expone ningún estado de carga ni de error (si `useProveedores` falla, la tabla simplemente queda vacía sin feedback); `CajerosPOS.tsx` y `ModalInventario.tsx` tampoco muestran mensajes de error de servidor, solo `errors` de validación de campo.
7. **`react-select` sin tema/estilo consistente**: es la única aparición de esta librería en el módulo; el resto de combos usan `<select>` nativo, generando inconsistencia visual entre `CajerosPOSForm` y el resto de formularios operativos.
8. **Accesibilidad de tabla de proveedores/tienda**: ninguna de las dos tablas anuncia el estado de carga (`aria-busy`) ni usa `aria-live` para los mensajes "Cargando…"/"Sin resultados", a diferencia de otras zonas de la app que sí usan roles ARIA (p. ej. `role="status"`), lo que puede quedar sin ser anunciado a lectores de pantalla.
