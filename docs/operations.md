# Operaciones

## Descripción general
Agrupa cuatro hooks independientes que dan soporte a procesos operativos de tiendas: alta automatizada de usuarios de cajeros POS (con integración a Power Automate), consulta de información de internet por tienda, ingreso de equipos nuevos a inventario, y listado de proveedores de internet (Tigo/Claro). No comparten estado entre sí; cada uno encapsula su propio formulario y/o consulta contra un `Service` de SharePoint específico.

## Archivos
- `src/Funcionalidades/operations/CajerosPos.ts` — hook `useCajerosPOS`, formulario para crear un usuario POS: crea ticket + log y dispara un flujo de Power Automate que ejecuta la creación real.
- `src/Funcionalidades/operations/InfoTienda.ts` — hook `useInfoInternetTiendas`, lista y filtra la información de internet de cada tienda, enriquecida con NIT/nombre de sociedad.
- `src/Funcionalidades/operations/Inventario.ts` — hook `useInventario`, formulario de "entrada por primera vez" de un dispositivo al inventario.
- `src/Funcionalidades/operations/ProveedoresInternet.ts` — hook `useProveedores`, lista de proveedores de internet filtrable por Tigo/Claro.

## Funciones y constantes clave

### `useCajerosPOS(services: { Tickets?, Logs })` (CajerosPos.ts)
- `first(...vals)`: helper exportado que retorna el primer valor no `undefined`/`null`/`""`.
- `flowCajerosPos = new FlowClient(<url Power Automate hardcodeada>)`, memoizado con `useMemo`.
- Estado inicial: `{ Cedula: "", CO: "", Compañia: "", CorreoTercero: account.username, solicitante: account.name, usuario: "" }`.
- `validate()`: requiere `solicitante`, `CO`, `Cedula`, `Compañia`.
- `handleSubmit(e)`: 1) crea un ticket cerrado automáticamente (`Categoria: "Siesa"`, `SubCategoria: "POS"`, `SubSubCategoria: "Creacion de usuario nuevo"`, `Estadodesolicitud: "Cerrado"`) y su log; 2) invoca `flowCajerosPos.invoke({ Cedula, Compañia: Number(...), CorreoTercero, Usuario: norm(solicitante), CO })` dentro de un `try/catch` propio; 3) limpia el formulario; en el `finally` general siempre muestra `alert("La creación de este usuario se hara de forma automatica...")`, sin distinguir si el paso 1 o 2 falló.

### `useInfoInternetTiendas(InfoInternetSvc, CompaniesSvc)` (InfoTienda.ts)
- `getCompaniesMapByIds` / `getNamesCompaniesMapByIds`: funciones casi idénticas que resuelven, por lotes (`concurrency = 8`, `Promise.allSettled`), un mapa `id -> Nit` y un mapa `id -> Title` (nombre de sociedad) respectivamente, consultando `CompaniesSvc.get()` una vez por id único.
- `buildFilter()`: constante `{ top: 5000 }` — trae hasta 5000 filas en una sola consulta, sin paginación adicional.
- `loadQuery()`: trae todas las filas, resuelve NIT y nombre de sociedad por cada `Compa_x00f1__x00ed_a` (campo interno de SharePoint = "Compañía"), y arma la vista `InfoInternetTienda` mapeando campos codificados: `Centro_x0020_Comercial`, `CORREO`, `PROVEEDOR`, `IDENTIFICADOR`, `SERVICIO_x0020_COMPARTIDO`, `DIRECCI_x00d3_N`.
- `applyClientFilter(qRaw, base)` / `norm(s)`: filtro de cliente insensible a tildes/mayúsculas sobre `Tienda`, `Correo`, `Identificador` (mínimo 2 caracteres de búsqueda). Se reaplica automáticamente en un `useEffect` cuando cambian `query` o `allRows`.

### `useInventario({ Inventario })` (Inventario.ts)
- `EMPTY`: objeto por defecto con ~20 campos del formulario de inventario (marca, serial, referencia, discos, memoria, ubicación, etc.).
- `validate()`: requiere `Categoria`, `Marca`, `Proveedor`, `Referencia`, `Title`; además contiene `if (state.Compania) e.Compania = "Requerido"`.
- `entradaPorPrimeraVez(ticketId)`: arma el payload fijando `Categoria: "Nuevo"`, `UbicacionActual: "Bodega"`, `UbicacionAnterior: "Proveedor"`, `ResponsableEntrada: account.name`, `CasoEntrada: ticketId`, y llama `Inventario.create(payload)`; si tiene éxito resetea el formulario.

### `useProveedores(ProveedoresSvc)` (ProveedoresInternet.ts)
- `filterMode` (`"tigo"` por defecto): construye el filtro OData `fields/Proveedor eq 'Tigo'` o, para cualquier otro valor, `fields/Proveedor eq 'Claro'`.
- `buildFilter()`: además del filtro por proveedor, fija `top: 100` (sin recorrer `nextLink`).
- `loadProveedores()`: se ejecuta automáticamente en `useEffect` cuando cambia `filterMode`.

## Flujo del módulo
- `src/components/CajerosPOS/CajerosPOS.tsx` usa `useCajerosPOS` para el formulario de alta de cajeros POS.
- `src/components/Info/InfoTienda/InfoTienda.tsx` usa `useInfoInternetTiendas` para listar/buscar tiendas.
- `src/components/Info/InfoProveedores/InfoProveedores.tsx` usa `useProveedores` para alternar entre proveedores Tigo/Claro.
- `src/components/Inventario/ModalInventario/ModalInventario.tsx` usa `useInventario` (probablemente junto a `Tickets`/`NuevoTicket` para obtener el `ticketId` de entrada) para registrar el ingreso de un equipo nuevo.
- En los cuatro casos el flujo es: el componente monta → (InfoTienda y ProveedoresInternet cargan automáticamente vía `useEffect`; CajerosPos e Inventario esperan el envío de un formulario) → se actualiza el estado local del hook → la UI reacciona a `rows`/`state`/`errors`/`loading`.

## Dependencias
- Internas: `Services/InternetTiendas.service`, `Services/Sociedades.service`, `Services/Inventario.service`, `Services/Proveedores.service`, `Models/Internet`, `Models/Inventario`, `Models/Proveedores`, `Models/Commons` (`GetAllOpts`), `Models/nuevoTicket`, `Models/FlujosPA`, `auth/authContext`, `utils/Date`, `utils/Commons` (`norm`), `Funcionalidades/shared/FlowClient`, `repositories/TicketsRepository`, `repositories/LogRepository`.
- Externas: React (hooks).

## Oportunidades de mejora
- **Bug de validación en Inventario.ts**: `validate()` contiene `if (state.Compania) e.Compania = "Requerido"` — la condición está invertida (dispara el error cuando el campo SÍ tiene valor, en vez de cuando está vacío como todos los demás campos de esa misma función).
- **Manejo de error incompleto en CajerosPos.ts**: el `try` externo de `handleSubmit` no tiene `catch`, solo `finally`; si `Tickets.createTicket` lanza una excepción, el error queda sin capturar (rechazo de promesa no manejado) y aun así el `finally` muestra el mismo `alert` de éxito ("La creación de este usuario se hara de forma automatica"), informando al usuario de un resultado que no ocurrió.
- **URL de Flow hardcodeada con firma embebida** en `flowCajerosPos` (CajerosPos.ts), igual que en el módulo de préstamos — secreto de acceso versionado en el código fuente.
- **Duplicación casi total entre `getCompaniesMapByIds` y `getNamesCompaniesMapByIds`** (InfoTienda.ts): mismo bucle de lotes y `Promise.allSettled`, solo cambia el campo leído (`item.Nit` vs `item.Title`). Se puede unificar en una sola función parametrizada por selector de campo.
- **Acoplamiento a nombres de columna codificados de SharePoint** (InfoTienda.ts): `Compa_x00f1__x00ed_a`, `Centro_x0020_Comercial`, `SERVICIO_x0020_COMPARTIDO`, `DIRECCI_x00d3_N`, etc. Cualquier cambio en el esquema de la lista de SharePoint (o su codificación interna) rompe el mapeo sin aviso en tiempo de compilación.
- **`top: 5000` sin paginación** en `useInfoInternetTiendas.buildFilter` y **`top: 100` sin recorrer `nextLink`** en `useProveedores.buildFilter`: a diferencia de otros módulos (préstamos, tareas) que sí paginan con `getByNextLink`, aquí una lista que supere el tope simplemente se trunca en silencio.
- **`console.table(e)` de depuración** dentro de `validate()` en Inventario.ts.
- **`filterMode` binario implícito** en ProveedoresInternet.ts: cualquier valor distinto de `"tigo"` se interpreta como `"Claro"` (no hay manejo explícito de un tercer proveedor ni validación del valor), lo que puede ocultar errores de tipeo en el valor del filtro.
- **Tipado débil / uso de `!` no nulo**: `account?.username!`, `account?.name!` en el estado inicial de `useCajerosPOS`, y `state.Title!`, `state.Referencia!`, etc. en varios `payload` de `useInventario`/`useDispositivos` — si `account` es `null` en el momento del render, estas aserciones pueden introducir `undefined` silencioso en el estado.
