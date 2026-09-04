# Componentes de Préstamos / Inventario de equipos

## Descripción general
Este módulo implementa la pantalla "Préstamos" del help desk: un módulo de tres pestañas (Historial, Inventario, Pruebas) para gestionar el ciclo de vida de préstamos de equipos de TI. Cubre la creación de un préstamo con checklist de pruebas de entrega, la administración del inventario de dispositivos, la definición de un catálogo de pruebas de dispositivo, la asignación de pruebas a un dispositivo específico, el historial de préstamos por dispositivo y el proceso de devolución con checklist de pruebas de devolución. También incluye un set de componentes de presentación reutilizables (badges, cards, KPIs, tabla genérica, tabs) usados en todo el módulo.

## Archivos
- `src/components/Loans/PretamosPage.tsx`: componente contenedor de la página; orquesta las 3 pestañas y conecta los 4 hooks de dominio (`usePrestamos`, `useDispositivos`, `usePruebas`, `usePruebasDispositivos`) con las secciones hijas. Exporta también `loanStatusTone`/`deviceStatusTone` (helpers de color de estado).
- `src/components/Loans/Tabs.tsx`: barra de pestañas genérica (`Historial`/`Inventario`/`Pruebas`), controlada por `value`/`onChange`.
- `src/components/Loans/Secciones.tsx`: sección "Historial de préstamos" (`LoanHistorySection`) — KPIs, filtros, tabla de préstamos y modal de creación de préstamo en 2 pasos (selección de solicitante/dispositivo → checklist de pruebas de entrega).
- `src/components/Loans/InventorySection.tsx`: sección "Inventario" — formulario de alta/edición de dispositivo a la izquierda, tabla de inventario con búsqueda a la derecha, y botones por fila para abrir el historial del dispositivo o sus pruebas asignadas.
- `src/components/Loans/Pruebas.tsx`: sección "Pruebas" (`PruebasSection`) — formulario de alta/edición de una prueba definida (catálogo maestro) y tabla de pruebas existentes.
- `src/components/Loans/DeviceHistory.tsx`: modal (`DeviceHistoryModal`) que muestra el historial de préstamos de un dispositivo seleccionado; al hacer clic en un préstamo abre `ReturnModal` en modo solo lectura (`"view"`).
- `src/components/Loans/DeviceTestModal.tsx`: modal (`DeviceTestsModal`) para asignar/quitar pruebas del catálogo a un dispositivo concreto (tabla de pruebas asignadas + selector para agregar).
- `src/components/Loans/ReturnSection.tsx`: modal (`ReturnModal`) reutilizado tanto para "entrega" (al crear préstamo) como para "devolución" (al cerrarlo) y para "ambas" (vista de solo lectura desde el historial); renderiza las listas de pruebas por fase y el botón de finalizar.
- `src/components/Loans/ReturnTestLists.tsx`: lista de pruebas (`ReturnTestsList`) con un `<select>` de resultado (Aprobado/N-A/Rechazado) por prueba, deshabilitado en modo `"view"`.
- `src/components/Loans/Badge.tsx`: badge de texto con tono de color (`ok`/`warn`/`bad`/`neutral`).
- `src/components/Loans/Pill.tsx`: componente casi idéntico a `Badge` (mismo shape de props y tonos), usado como "píldora".
- `src/components/Loans/Card.tsx`: contenedor genérico de tarjeta con título, subtítulo y slot `right`.
- `src/components/Loans/Kpi.tsx`: tarjeta pequeña de indicador numérico (label + valor).
- `src/components/Loans/DateTable.tsx`: tabla genérica (`DataTable`) que recibe `columns` y `rows` (JSX) — pese al nombre del archivo, exporta `DataTable`, no algo relacionado con fechas.

## Funciones y constantes clave

### `PretamosPage.tsx`
- Sin props (es la página raíz del módulo).
- Hooks consumidos, todos de `src/Funcionalidades/loans/prestamos.ts`:
  - `usePrestamos()` → expone `{ loadDeviceLoans, visibleRows, rows, loading, error, load, reload, estado, setEstado, search, setSearch, handleSubmit, errors, submitting, setField, state, notify, finalizeLoan, notifyEstado }`.
  - `useDispositivos()` → expone `{ dispositivosById, rows, loading, error, load, reload, estado, setEstado, search, setSearch, handleSubmit, errors, state, setState, submitting, setField, borrowDevice, deviceReturn, editDevice }`.
  - `usePruebas()` → expone `{ handleSubmit, editTest, state, setState, setField, loading, submitting, createAllPruebas, pruebasRows, pruebasPrestamoRows, loadPruebasPrestamo, draft, onDraftChange, handleFinalize, pendingChanges, setDraft, loadAllPruebas }`.
  - `usePruebasDispositivos()` → expone `{ loadDeviceTests, unassignTest, assignTest, testsOpen, testsAssigned, setTestsAssigned, setTestsOpen, testsLoading }`.
- Estado local: `activeTab` (`PrestamosTabKey`), `selected` (dispositivo seleccionado para ver su historial), `deviceLoans` (préstamos del dispositivo seleccionado).
- Efectos: uno recarga inventario/préstamos/catálogo de pruebas cuando cambian los filtros de búsqueda/estado; otro carga el historial de préstamos del dispositivo seleccionado (`loadDeviceLoans`) de forma cancelable (`cancelled` flag) cuando cambia `selected?.Id`.
- Handlers compuestos (orquestan varios hooks en secuencia): `createLoan` (crea el préstamo, crea las pruebas de entrega, marca el dispositivo como prestado, notifica al usuario, recarga inventario), `finalizeLoan` (cierra el préstamo, notifica el estado de devolución, marca el dispositivo como devuelto, recarga ambas listas), `onCreateDevice`/`onCreateTest` (despachan a crear o editar según `mode`).
- Constantes: `loanStatusTone(s)` y `deviceStatusTone(s)` mapean el string de estado a un tono de `Badge`/`Pill` (`ok`/`warn`/`bad`/`neutral`).

### `Secciones.tsx` (`LoanHistorySection`)
- Props: `rows`, `query`, `statusFilter`, `onQueryChange`, `onStatusFilterChange`, `dispositivos`, `onCreateLoan`, `onFinalizeLoan`, `state`, `creating`, `createError`, `setField`.
- Hook: `useWorkers({ onlyEnabled: true })` de `src/Funcionalidades/access/Workers.ts` → `{ workersOptions, loadingWorkers, error }` para poblar el selector de solicitante (componente `Select` de `react-select`).
- Estado local: `openCreate`, `openDevolver`, `selectedLoan`, `created`, `step` (1|2, wizard de 2 pasos del modal de creación).
- Handlers: `submit()` valida `canSubmit` (nombre de solicitante no vacío), llama a `onCreateLoan`, guarda el préstamo creado y avanza a `step 2`; `submitFinalize(continuar)` delega a `onFinalizeLoan`; efecto de `keydown` para cerrar el modal con Escape.
- Constante exportada: `countLoansByStatus(loans, status)` cuenta préstamos por estado (usado para los KPIs "Activos"/"Cerrados").

### `InventorySection.tsx`
- Props: listas de inventario, historial y pruebas, más callbacks (`onInventoryQueryChange`, `setFieldState`, `onAddSubmit`, `setState`, `load`, `setSelectedDevice`, `loadAssignedByDevice`, `onAssign`, `onUnassign`) — 15 props en total.
- Estado local: `mode` (`"new" | "edit"`), `history` (abre `DeviceHistoryModal`), `testOpen` (abre `DeviceTestsModal`).
- Efecto: cuando cambia `selectedDevice`, llama `loadAssignedByDevice(selectedDevice.Id)`.

### `Pruebas.tsx` (`PruebasSection`)
- Props análogas a `InventorySection` pero para el catálogo de pruebas definidas (`test`, `state`, `setFieldState`, `onAddSubmit`, `setState`, `load`).
- Estado local: `mode` (`"new" | "edit"`).

### `DeviceHistory.tsx` (`DeviceHistoryModal`)
- Props: `open`, `onClose`, `selectedDispositivo`, `rows` (préstamos del dispositivo), `devices`.
- Estado local: `selectedLoan`, `openPruebas` (alterna a vista de detalle vía `ReturnModal` en modo `"view"`, fase `"Ambas"`).

### `DeviceTestModal.tsx` (`DeviceTestsModal`)
- Props: `open`, `onClose`, `device`, `catalog`, `assigned`, `loading`, `onAssign`, `onUnassign`.
- Estado local: `pick` (prueba seleccionada para asignar), `saving`.
- Efectos: bloquear scroll del `body` mientras el modal está abierto; cerrar con tecla Escape; resetear `pick`/`saving` al cerrar y enfocar el panel al abrir.
- `assignedSet`/`available`/`nameById` memoizados con `useMemo` para filtrar pruebas ya asignadas o inactivas.

### `ReturnSection.tsx` (`ReturnModal`)
- Props: `open`, `onClose`, `loan`, `dispositivos`, `onFinalize`, `mode` (`"edit" | "view"`), `fase` (`"Devolucion" | "Entrega" | "Ambas"`).
- Hook: `usePruebas()` (mismo hook de dominio) → usa `loadPruebasPrestamo`, `pruebasPrestamoRows`, `draft`, `onDraftChange`, `handleFinalize`, `setDraft`.
- `mergedTestsDevolucion`/`mergedTestEntrega` (memoizados) combinan las pruebas cargadas con los cambios en borrador (`draft`) antes de guardarlos.
- `canFinalize` (memoizado): exige que el préstamo no esté ya cerrado, que existan pruebas y que **todas** tengan un valor nuevo válido (`Aprobado`/`N/A`/`Rechazado`) en el `draft` actual.
- Efectos: cerrar con Escape (limpia `draft`), cargar pruebas del préstamo al abrir/cambiar `loan.Id`/`fase`, resetear `draft` al abrir.
- Se renderiza con `createPortal(modal, document.body)`.

### `ReturnTestLists.tsx` (`ReturnTestsList`)
- Props: `tests`, `onChange`, `mode`. Sin estado propio; `desactivar = mode === "view"` deshabilita los `<select>`.

### Componentes de presentación (`Badge`, `Pill`, `Card`, `Kpi`, `DateTable`, `Tabs`)
- Todos son componentes puramente de presentación, sin hooks ni estado; reciben props tipadas y aplican clases CSS con prefijo `pl-`.

## Flujo del módulo
Ciclo completo de un préstamo de equipo:
1. **Inventario primero**: en la pestaña "Inventario" (`InventorySection`) se registra el dispositivo (marca, referencia, serial) vía `onAddSubmit("new")` → `crearDispositivo()`. El estado inicial del dispositivo queda `Disponible`.
2. **(Opcional) Definir pruebas del catálogo**: en la pestaña "Pruebas" (`PruebasSection`) se crean pruebas maestras (p. ej. "el dispositivo enciende correctamente") vía `onAddSubmit("new")` → `createTest()`.
3. **(Opcional) Asignar pruebas a un dispositivo**: desde la fila del dispositivo en el inventario, botón "Pruebas" abre `DeviceTestsModal`; se selecciona una prueba del catálogo (`available`, ya filtra las inactivas/ya asignadas) y se llama `onAssign(deviceId, testId)`.
4. **Creación de un préstamo**: en la pestaña "Historial" (`LoanHistorySection`), botón "Nuevo préstamo" abre el modal de 2 pasos:
   - Paso 1: se eligen "Solicitante" (via `react-select`, opciones de `useWorkers`) y "Dispositivo" (solo dispositivos con `Estado === "Disponible"`). Botón "Siguiente" ejecuta `submit()` → `onCreateLoan` → `PretamosPage.createLoan`, que crea el préstamo (`handleSubmit` de `usePrestamos`, que a su vez crea un ticket de tipo "Préstamo/Instalación" y un log), crea las pruebas de entrega asociadas (`createAllPruebas`) y marca el dispositivo como `Prestado` (`borrowDevice`); también envía un correo de notificación al solicitante (`notify`).
   - Paso 2 ("pruebas de entrega"): se abre `ReturnModal` en modo `"edit"`, fase `"Entrega"`, donde se marca cada prueba como `Aprobado`/`N/A`/`Rechazado` (checklist de estado de entrega del equipo).
5. **Pruebas de dispositivo durante el préstamo**: las pruebas quedan asociadas al préstamo (`pruebasPrestamoRows`, filtradas por `Fase`).
6. **Historial**: desde el inventario, botón "Ver Historial" abre `DeviceHistoryModal`, que lista todos los préstamos (activos y cerrados) de ese dispositivo; al hacer clic en una fila se abre `ReturnModal` en modo `"view"` (solo lectura) para consultar el detalle de pruebas de entrega/devolución de ese préstamo puntual.
7. **Devolución**: en la tabla de historial de préstamos (`LoanHistorySection`), al hacer clic sobre un préstamo activo (no cerrado) se abre `ReturnModal` en modo `"edit"`, fase `"Devolucion"`. El usuario marca el checklist de devolución; el botón "Devolver" solo se habilita (`canFinalize`) cuando todas las pruebas de esa fase tienen un resultado marcado.
8. Al confirmar, `handleFinalize` (de `usePruebas`) persiste los resultados y determina si el equipo vuelve en buen o mal estado; esto dispara `onFinalize(continuar)` → `PretamosPage.finalizeLoan`, que cierra el préstamo (`Estado: "Cerrado"`, `FechaDevolucion`), actualiza el ticket asociado, registra un log con tablas HTML de entrega/devolución, notifica por correo al solicitante el resultado (`notifyEstado`) y actualiza el estado del dispositivo (`Disponible` o `Malo` según `deviceReturn`).
9. Ambas listas (préstamos e inventario) se recargan (`load()`, `loadPrestamos()`) para reflejar el nuevo estado.

## Dependencias
- **Funcionalidades**: `src/Funcionalidades/loans/prestamos.ts` (`usePrestamos`, `useDispositivos`, `usePruebas`, `usePruebasDispositivos`), `src/Funcionalidades/access/Workers.ts` (`useWorkers`), internamente estos hooks usan `src/graph/GrapServicesContext.tsx` (`useGraphServices`), `src/repositories/repositoriesContext.tsx` (`useRepositories` → `logs`, `tickets`), `src/auth/authContext.ts` (`useAuth`), `src/Funcionalidades/shared/FlowClient.ts`, `src/utils/Text.ts` (`escapeHTML`), `src/utils/Date.ts` (`toISODateTimeFlex`).
- **Models**: `src/Models/prestamos.ts` (`dispositivos`, `prestamos`, `pruebasDefinidas`, `pruebasPrestamo`, `pruebasDispositos`, `dispositivosErrors`, `prestamosErrors`), `src/Models/Commons.ts` (`desplegablesOptions`, `GetAllOpts`, `PageResult`), `src/Models/FlujosPA.ts` (`FlowToUser`).
- **Otros componentes reutilizados fuera del módulo**: `UserOptionEx` importado desde `src/components/NuevoTicket/NuevoTicketForm.tsx` (acoplamiento cruzado entre módulos de UI).
- **Externas**: `react-select` (selects con búsqueda en `Secciones.tsx`), `react-dom` (`createPortal` en `ReturnSection.tsx`), CSS propio en `src/components/Loans/prestamos.css`.

## Oportunidades de mejora
- **Typo en el nombre del archivo/página principal**: `PretamosPage.tsx` (falta la "s" de "Prestamos") — debería ser `PrestamosPage.tsx`. El nombre incorrecto ya se propaga a los imports (`from "./PretamosPage"` en `InventorySection.tsx`, `Secciones.tsx`, `Tabs.tsx`), lo que dificultaría una futura corrección.
- **Duplicación casi exacta entre `Badge.tsx` y `Pill.tsx`**: mismos tipos (`BadgeTone`/`PillTone` con los mismos 4 valores), misma forma de props y de render (solo cambia el nombre de clase CSS `pl-badge`/`pl-pill`). Es un candidato claro a unificar en un solo componente parametrizable.
- **`PretamosPage.tsx` como componente "orquestador gigante"**: conecta 4 hooks de dominio distintos y define 3 handlers compuestos (`createLoan`, `finalizeLoan`, `onCreateDevice`/`onCreateTest`) que mezclan lógica de negocio (orden de llamadas a servicios, notificaciones, recarga de listas) directamente en el componente de React en lugar de un hook de orquestación dedicado o un caso de uso en la capa de `Funcionalidades`.
- **Props drilling elevado**: `InventorySection` recibe 15 props (mezcla de inventario, historial y pruebas de dispositivo) provenientes todas de `PretamosPage`; varias de ellas (`rows`, `testCatalogo`, `assigned`, `loading`, `onAssign`, `onUnassign`) solo se usan para reenviarlas tal cual a `DeviceHistoryModal`/`DeviceTestsModal`. Podría dividirse en sub-secciones más pequeñas o usar contexto para el estado del dispositivo seleccionado.
- **`ReturnModal` sobrecargado**: maneja 3 combinaciones de `fase` (`Entrega`, `Devolucion`, `Ambas`) y 2 `mode` (`edit`, `view`) con ramas condicionales anidadas en el JSX (`fase === "Entrega" || fase === "Ambas"`, etc.), lo que lo hace difícil de leer y de testear todos los caminos; podría dividirse en componentes más pequeños por fase/modo.
- **Falta de manejo explícito de error/carga en varias vistas**: `InventorySection`, `Pruebas.tsx` y `Secciones.tsx` no muestran estado de "cargando" mientras se resuelven `load()`/`handleSubmit()` (no usan el `loading`/`submitting` que sí exponen los hooks); solo `DeviceTestModal.tsx` deshabilita controles con `loading`/`saving`.
- **Aserciones de no-nulidad (`!`) que pueden causar errores en tiempo de ejecución**: `selectedDispositivo={selectedDevice!}` y `device={selectedDevice!}` en `InventorySection.tsx`, `loan={selectedLoan!}` en `Secciones.tsx` y `DeviceHistory.tsx` — si el modal se llegara a abrir sin selección previa, se accedería a propiedades de `null`/`undefined`.
- **Componente `DateTable.tsx` con nombre inconsistente**: el archivo se llama `DateTable.tsx` (sugiere "tabla de fechas") pero exporta un componente genérico `DataTable` sin relación con fechas; el nombre del archivo debería ser `DataTable.tsx`.
- **Acoplamiento cruzado de módulos de UI**: `Secciones.tsx` importa `UserOptionEx` desde `src/components/NuevoTicket/NuevoTicketForm.tsx`, acoplando el módulo de Préstamos a un componente de otro dominio (Tickets) en vez de a un tipo compartido en `Models/Commons.ts`.
- **Accesibilidad**: los modales (`DeviceHistoryModal`, `DeviceTestsModal`, `ReturnModal`) usan botones "✕" sin texto visible más allá del `aria-label`, y varias filas clicables de tabla (`pl-rowClickable`) son `<tr onClick>` sin rol de botón ni soporte de teclado (`tabIndex`/`onKeyDown`), lo que impide su uso solo con teclado.
- **Notificaciones de éxito/error inconsistentes**: `PretamosPage.finalizeLoan` usa `alert()` bloqueante ("Se ha finalizado el prestamo…"), mientras que otros módulos del proyecto (p. ej. `TimeCounter`) ya usan `react-hot-toast`; sería conveniente unificar el patrón de feedback al usuario en todo el proyecto.
