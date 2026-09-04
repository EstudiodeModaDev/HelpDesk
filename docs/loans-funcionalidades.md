# Préstamos (lógica)

## Descripción general
Este módulo implementa el flujo completo de préstamo de equipos: alta y baja de dispositivos, registro/cierre de préstamos, notificación por correo (vía Power Automate) y checklist de pruebas de entrega/devolución de cada dispositivo. Todo vive en un único archivo con cuatro hooks independientes que se componen entre sí (`usePrestamos` usa internamente `useDispositivos` y `usePruebas`). Persiste en listas de SharePoint a través de `useGraphServices()` y crea tickets/logs de la mesa de ayuda como parte del ciclo de vida del préstamo.

## Archivos
- `src/Funcionalidades/loans/prestamos.ts` — contiene `usePrestamos`, `useDispositivos`, `usePruebas` y `usePruebasDispositivos`.

## Funciones y constantes clave

### `usePrestamos()`
- Compone `useGraphServices().prestamos`, `useRepositories().logs`/`.tickets`, y los hooks `useDispositivos()` / `usePruebas()` (para `dispositivosById` y `loadPruebasPrestamo`).
- `notifyFlow = new FlowClient(<url Power Automate hardcodeada>)`: instancia fija con URL y firma (`sig=...`) embebidas en el código fuente.
- Estado inicial de formulario: `{ Estado: "Activo", FechaPrestamo: toISODateTimeFlex(new Date()), ... }`.
- `buildFilter()`: filtra por `fields/Estado eq '<estado>'` (si no es "all"), orden `fields/Created asc`.
- `validate()`: requiere `Id_dispositivo` y `Title` (usado como identificador del solicitante).
- `handleSubmit()`: crea un ticket (`Categoria: "Otros"`, `SubCategoria: "Prestamo/Instalacion"`, `Articulo: "Préstamo otros"`, `Fuente: "Aplicativo"`, `Estadodesolicitud: "En Atención"`) → crea un log referenciando el ticket → crea el registro de préstamo (`prestamos.create`) enlazado al `IdTicket` → resetea el formulario y recarga la lista.
- `notify(prestamo, dispositivos)` / `notifyEstado(prestamo, dispositivos, estado)`: arman un mensaje HTML y lo envían con `notifyFlow.invoke<FlowToUser>({ recipient: prestamo.Title, title, message, mail: true })`.
- `load()` / `loadDeviceLoans(idDevice)`: paginan resultados recorriendo `getAll()` / `getByNextLink()` hasta agotar `nextLink`.
- `finalizeLoan(loan, continuar)`: actualiza el préstamo (`Estado: "Cerrado"`, `FechaDevolucion`, `UsuarioRecibe`), cierra el ticket asociado (`Estadodesolicitud: "Cerrado"`), recupera pruebas de Entrega/Devolución, arma tablas HTML (`escapeHTML`) y crea un log de cierre con el detalle.
- `visibleRows`: filtro de cliente sobre `rows` (mínimo 3 caracteres) que busca en `Title`, `nombreSolicitante` y datos del dispositivo vía `dispositivosById`.

### `useDispositivos()`
- Estado por defecto: `{ Title: "", Referencia: "", Serial: "", Estado: "Disponible" }`.
- `buildFilter()`: solo aplica `startswith` sobre `Title`/`Referencia`/`Serial` cuando hay `search`; el filtro por `estado` está comentado (no se usa).
- `validate()`: requiere `Referencia`, `Serial`, `Title`.
- `handleSubmit()` / `editDevice()`: crean/actualizan el dispositivo.
- `borrowDevice(deviceId)`: `Estado: "Prestado"`. `deviceReturn(deviceId, estado: boolean)`: `Estado: "Disponible"` si `estado` es verdadero, `"Malo"` si es falso.
- `dispositivosById`: `Map` memoizado de `Id -> dispositivo`, usado por `usePrestamos` para mostrar/filtrar.

### `usePruebas()`
- Gestiona el catálogo de pruebas (`pruebasDefinidas`) y los registros de pruebas por préstamo (`pruebasPrestamo`), con fases `"Entrega"` / `"Devolucion"`.
- `createAllPruebas(prestamoId, deviceId)`: para cada prueba asignada al dispositivo (`loadDeviceTests`), crea dos registros `pruebasPrestamo` (Entrega y Devolución) con `Aprobado: "Pendiente"`.
- `loadAllPruebas()` / `loadPruebasPrestamo(Id, fase)`: paginan resultados; `fase: "Ambas"` combina Entrega+Devolución en paralelo (`Promise.all`) y deduplica por `Id`.
- `pendingChanges`: diff memoizado entre `draft` (ediciones locales de `Aprobado`) y los valores actualmente cargados.
- `handleFinalize(loan)`: aplica en paralelo los cambios pendientes (`pruebasPrestamo.update`), recarga la fase "Devolucion", limpia `draft` y retorna `false` si alguna prueba quedó `"rechazado"`.
- `handleSubmit()` / `editTest()`: CRUD del catálogo de pruebas.

### `usePruebasDispositivos()`
- `listByDevice(deviceId)`: consulta la tabla puente `pruebasDispositivo` filtrando `fields/Title eq '<deviceId>'` (el campo `Title` de esa lista almacena el id del dispositivo).
- `loadDeviceTests(deviceId)` / `assignTest(deviceId, testId)` / `unassignTest(bridgeId, selectedDevice)`: cargan, asignan y desasignan pruebas del catálogo a un dispositivo específico.

## Flujo del módulo
- Usado por `src/components/Loans/PretamosPage.tsx` (alta/listado de préstamos y dispositivos) y `src/components/Loans/ReturnSection.tsx` (proceso de devolución/checklist de pruebas).
- Flujo típico de un préstamo nuevo: `useDispositivos().load()` puebla el catálogo de equipos → el usuario llena el formulario de `usePrestamos` → `handleSubmit()` crea ticket + log + registro de préstamo → opcionalmente se llama `notify()` para avisar al solicitante → `usePruebas().createAllPruebas()` genera el checklist de entrega a partir de las pruebas asignadas al dispositivo (`usePruebasDispositivos`).
- Flujo de devolución: se cargan las pruebas de la fase "Devolucion" (`loadPruebasPrestamo`), el usuario edita resultados (`onDraftChange` → `draft`), `handleFinalize()` persiste los cambios, y finalmente `finalizeLoan()` cierra el préstamo y el ticket, generando el log con las tablas de resultados y, opcionalmente, `notifyEstado()` informa el resultado al solicitante.

## Dependencias
- Internas: `graph/GrapServicesContext` (`useGraphServices`), `repositories/repositoriesContext` (`useRepositories`), `Models/prestamos`, `Models/Commons` (`GetAllOpts`, `PageResult`), `Models/FlujosPA` (`FlowToUser`), `auth/authContext`, `utils/Date` (`toISODateTimeFlex`), `utils/Text` (`escapeHTML`), `Funcionalidades/shared/FlowClient`.
- Externas: React (hooks), `crypto` implícito no usado aquí (sí en otros módulos).

## Oportunidades de mejora
- **URL de Flow hardcodeada con firma embebida** (`usePrestamos`, constante `notifyFlow`): la URL de Power Automate, incluyendo el parámetro `sig=...` (equivalente a un secreto de acceso), está escrita directamente en el código fuente y versionada en git — debería moverse a configuración/variables de entorno.
- **Manejo de errores inconsistente**: `handleSubmit` (préstamo) atrapa errores y solo hace `console.error`, sin notificar al usuario ni revertir el ticket/log ya creados si `prestamos.create` falla a mitad de camino (riesgo de ticket huérfano sin préstamo asociado). `finalizeLoan` tiene el mismo patrón: solo `console.error`, sin feedback visual de fallo.
- **`console.table(p)` de depuración** dentro de `createAllPruebas` (dentro de `usePruebas`), queda en el flujo de producción.
- **Bug potencial de tipos en `setField` de `usePruebas`**: `setField = <K extends keyof dispositivos>(k: K, v: dispositivos[K]) => setState(...)` está tipado sobre `dispositivos` en lugar de `pruebasDefinidas` (el tipo real del `state` de este hook), lo que anula el chequeo de tipos de esa función.
- **Semántica ambigua de `deviceReturn(deviceId, estado: boolean)`**: el parámetro booleano no deja claro en el sitio de llamada qué significa `true`/`false` sin mirar la implementación (`true` → "Disponible", `false` → "Malo"); un enum/string sería más legible y menos propenso a errores de inversión de lógica.
- **`listByDevice` en `usePruebasDispositivos`** depende de que la lista puente use el campo `Title` para almacenar el id del dispositivo — acoplamiento implícito al esquema de SharePoint que no es evidente por el nombre de la función ni del campo.
- **Filtro de dispositivos con código muerto**: en `useDispositivos.buildFilter`, la línea que filtraría por `estado` está comentada, dejando la variable `estado`/`setEstado` en el hook sin efecto real sobre las consultas.
- **Duplicación de patrón de paginación**: el bucle `do { ... } while (nextLink)` para recorrer `getAll()`/`getByNextLink()` se repite igual en `load()`, `loadDeviceLoans()`, `loadAllPruebas()` y `loadPruebasPrestamo()` — buen candidato para un helper genérico de paginación.
