# Componentes de Dashboard

## Descripción general
Este grupo cubre las pantallas de indicadores del help desk: un resumen general, un dashboard "detallado" con filtro de rango de fechas, un tablero de disponibilidad de resolutores (con comparación contra turnos de Teams) y una página de reportes para exportar tickets a Excel. `DashboardPage.tsx` actúa como shell con navegación por pestañas entre las tres vistas de dashboard; `ReportsPage.tsx` es independiente y no forma parte de esa navegación por pestañas (se monta en otra ruta del sistema).

## Archivos
| Archivo | Qué renderiza/hace |
|---|---|
| `DashboardPage.tsx` | Shell con tabs (Dashboard/Detallado/Disponibilidad) que alterna entre `DashboardResumen`, `DashboardDetallado` y `DashboardDisponibilidad`. |
| `DashboardGeneral/DahsboardResumen.tsx` (`DashboardResumen`) | Vista resumen: KPI total de casos, barras de estado, gauge de cumplimiento, top 5 solicitantes/categorías, fuentes de solicitud y gráfico de casos por día. |
| `DashboardDetallado/DashboardDetallado.tsx` | Igual estructura visual que el resumen pero filtrable por rango de fechas (`from`/`to`) y con listado de resolutores con "donut" individual y casos por mes. |
| `DashboardDisponibilidad/DashboardDisponibilidad.tsx` | Tablero de disponibilidad: filtra por rango de fechas y resolutor, lista tarjetas `ResolutorInfoCard` por resolutor y abre un modal de detalle al hacer click. |
| `DashboardDisponibilidad/ResolutorDetalleModal.tsx` | Modal de detalle de un resolutor: horas por tipo (normal/nocturno/dominical-festivo), y compara minutos del "contador" propio contra horas programadas en Teams (`useDisponibilidadTeams`). |
| `ResolutorInfoCard/ResolutorInfoCard.tsx` | Tarjeta reutilizable que muestra nombre, iniciales y desglose de horas (normal/nocturno/dominical-festivo/nocturno dominical-festivo) de un resolutor; opcionalmente clicable. |
| `Reports/ReportsPage.tsx` | Página de exportación: genera un Excel (vía `xlsx`) con resumen mensual, resumen por resolutor y detalle de tickets del mes actual y anterior. |

## Funciones y constantes clave

### DashboardPage.tsx
- Estado local: `mode` (`"resumen" | "dashboard" | "disponibilidad"`), controla qué subvista se monta.
- Constante UI: `Items` (array de tabs con id/label/icon) definido inline en cada render (no memoizado).
- No consume hooks de `Funcionalidades` directamente; delega todo a las subvistas.

### DahsboardResumen.tsx (`DashboardResumen`)
- Hook de Funcionalidades: `useDashboard(TicketsSvc)` (`Funcionalidades/dashboard/Dashboard`), expone `totalCasos, totalEnCurso, totalFinalizados, totalFueraTiempo, porcentajeCumplimiento, topSolicitante, range, totalCategorias, resolutores, Fuentes, casosPorDia, loading` y los métodos `obtenerTotal, obtenerTop5, setRange, obtenerTotalCategoria, obtenerTotalResolutor, obtenerFuentes, obtenerCasosPorDia`.
- Efecto: al montar y cada vez que cambia `range.from`/`range.to`, dispara en cascada 6 llamadas (`obtenerTotal("resumen")`, `obtenerTop5("resumen")`, etc.) — todas con el literal `"resumen"` como primer argumento.
- Constantes UI: `COLORS` (mapa fuente→color hexadecimal), función local `formatShort` (formatea "2,1 mil"), `shorten` (trunca string a 5 caracteres).
- Subcomponentes internos (no exportados): `Donut`, `SmallDonut`, `Gauge`, `FuentesSolicitud`, `StatusBars`, `TotalBarras`, `CategoriasChart`, `CasosPorDiaChart` — todos gráficos SVG hechos a mano.

### DashboardDetallado.tsx
- Hook de Funcionalidades: `useDetallado(TicketsSvc)` (`Funcionalidades/dashboard/DashboardDetallado`), expone `totalCasos, totalEnCurso, totalFinalizados, totalFueraTiempo, porcentajeCumplimiento, topCategorias, range, resolutores, Fuentes, loading, conteoPorMes, topSolicitante, obtenerTotal, setRange, obtenerFuentes`.
- Efectos: `obtenerTotal()` cuando cambia `range.from`/`range.to`; `obtenerFuentes()` al montar (dependencia `obtenerFuentes`, memoizada en el hook).
- Duplica casi íntegramente los subcomponentes SVG de `DahsboardResumen.tsx` (`Donut`, `SmallDonut`, `Gauge`, `FuentesSolicitud`, `StatusBars`, `TopCategorias`, `CasosPorMesChart`) con nombres de función iguales o casi iguales pero definidos localmente en cada archivo.

### DashboardDisponibilidad.tsx
- Hook de Funcionalidades: `useDashboardDisponibilidad(tickets)` (`Funcionalidades/dashboard/useDashboardDisponibilidad`), expone `loading, range, setRange, resetFilters, selectedResolutor, setSelectedResolutor, resolutores, resolutorOptions, totalTickets`.
- Estado local: `resolutorDetalle` (resolutor seleccionado para abrir `ResolutorDetalleModal`, tipado como `ResolutorDisponibilidadAgg | null`).
- Constantes UI: opción fija `"all"` = "Todos los resolutores" en el `<select>`.
- Conversión de unidades manual en el JSX: `minutosTotales/60`, `minutosNormales/60`, etc. para pasar "horas" a `ResolutorInfoCard` (que a pesar de llamarse `minutos` recibe horas).

### ResolutorDetalleModal.tsx
- Hook de Funcionalidades: `useDisponibilidadTeams({ correo, range })` (`Funcionalidades/dashboard/useDisponibilidadTeams`), expone `horasProgramadas, loading, error`.
- Función exportada `calcularPorcentajeDisponibilidad(horasProgramadas, horasRegistradasContador)` — lógica de cálculo de negocio vive en el archivo de componente en vez de en `Funcionalidades/dashboard`.
- Funciones de formato locales: `formatHours`, `formatPercent`.
- Guard de render: `if (!open || !resolutor) return null;` (no usa un `Modal` genérico ni `ModalShell` compartido con el módulo de Tickets).

### ResolutorInfoCard.tsx
- Componente puro por props: `nombre`, `minutos` (`ResolutorMinutos`: total/normal/nocturno/dominical_festivo/nocturno_dominical_festivo), `className`, `onClick`.
- Funciones locales: `formatMinutos`, `getIniciales`.
- Maneja accesibilidad de "tarjeta clicable": si recibe `onClick`, agrega `role="button"`, `tabIndex={0}` y `onKeyDown` para Enter/Espacio.

### ReportsPage.tsx
- No usa hooks de `Funcionalidades`; consume directamente `useRepositories()` para obtener `tickets` (`TicketsRepository`) y llama `tickets.loadTickets({ range })` para cada mes.
- Estado local: `state` (`"idle"|"loading"|"success"|"error"`), `message`, `monthSummaries`, `resolverSummaries`.
- Lógica de negocio embebida en el componente (no en Funcionalidades): `getMonthWindow`, `getAllTicketsForRange`, `normalizeText`, `isDisponibilidad`, `classifyEstado`, `splitResolvers`, `toExcelRows`, `buildMonthSummary`, `buildResolverSummary`, `makeSheetName`.
- Handler clave: `handleExport` (useCallback) — orquesta la carga de tickets del mes actual y anterior en paralelo, arma 4 hojas de Excel (Resumen, Resolutores, Tickets mes actual, Tickets mes anterior) y dispara `XLSX.writeFile`.

## Flujo del módulo
1. El usuario entra a `DashboardPage.tsx`, que por defecto muestra `DashboardResumen` (`mode = "resumen"`).
2. Cambiar de tab (`Detallado`/`Disponibilidad`) solo actualiza el estado local `mode`; cada subvista es autónoma y vuelve a pedir sus propios datos al montarse (no hay caché compartida entre tabs).
3. En `DashboardResumen`/`DashboardDetallado`, el usuario ajusta el rango de fechas (`<input type="date">`) lo que dispara `setRange` y re-ejecuta las consultas agregadas vía `useEffect`.
4. En `DashboardDisponibilidad`, el usuario filtra por fecha y/o resolutor (`selectedResolutor`); al hacer click en una tarjeta `ResolutorInfoCard`, se guarda `resolutorDetalle` y se abre `ResolutorDetalleModal`, que dispara una consulta adicional a Teams (`useDisponibilidadTeams`) para comparar horas programadas vs. registradas.
5. `ReportsPage.tsx` es un flujo aislado de un solo paso: el usuario hace click en "Generar Excel", se cargan todos los tickets del mes actual y anterior, se procesan en memoria y se descarga un archivo `.xlsx` con 4 hojas; el resumen generado también se muestra en tablas HTML debajo del botón.

Navegación entre componentes: sin Context de dominio; todo por props (`DashboardDisponibilidad` → `ResolutorInfoCard`/`ResolutorDetalleModal` → `ResolutorInfoCard` de nuevo dentro del modal). El contexto usado es solo de infraestructura (`repositoriesContext`).

## Dependencias

| Componente | Funcionalidades / Models | Librerías externas |
|---|---|---|
| DahsboardResumen.tsx | `Funcionalidades/dashboard/Dashboard` (useDashboard), `Models/Dashboard` (DailyPoint, Fuente, TopCategoria) | — (SVG hecho a mano) |
| DashboardDetallado.tsx | `Funcionalidades/dashboard/DashboardDetallado` (useDetallado), `Models/Dashboard` | — |
| DashboardDisponibilidad.tsx | `Funcionalidades/dashboard/useDashboardDisponibilidad` | — |
| ResolutorDetalleModal.tsx | `Funcionalidades/dashboard/useDashboardDisponibilidad` (tipo `ResolutorDisponibilidadAgg`), `Funcionalidades/dashboard/useDisponibilidadTeams`, `Models/Filtros` (DateRange) | — |
| ResolutorInfoCard.tsx | ninguna (componente puro) | — |
| ReportsPage.tsx | `repositories/TicketsRepository/TicketRepository` (tipo), `Models/Tickets`, `utils/Date` (toISODateTimeFlex), `utils/Commons` (norm) | `xlsx` (SheetJS) |
| Todas | `repositories/repositoriesContext` (useRepositories) | React |

## Oportunidades de mejora
- **Duplicación fuerte entre DahsboardResumen.tsx y DashboardDetallado.tsx**: ambos archivos definen copias casi idénticas de `Donut`, `SmallDonut`, `Gauge`, `FuentesSolicitud`, `StatusBars`, `COLORS`, `formatShort` y gráficos de barras (`CasosPorMesChart`/`CasosPorDiaChart`). Es candidato directo a extraer una carpeta compartida `Dashboard/shared` con estos componentes SVG y constantes de color.
- **Nombre de archivo con typo**: `DashboardGeneral/DahsboardResumen.tsx` — el nombre de archivo tiene una errata ("Dahsboard" en vez de "Dashboard") mientras el componente exportado se llama correctamente `DashboardResumen`.
- **Lógica de negocio filtrada en el componente (ReportsPage.tsx)**: todas las funciones de agregación (`buildMonthSummary`, `buildResolverSummary`, `classifyEstado`, `splitResolvers`, `isDisponibilidad`, `toExcelRows`) están definidas a nivel de módulo en el propio `.tsx` en vez de vivir en `Funcionalidades/dashboard` o `Funcionalidades/Tickets`; esto mezcla reglas de negocio (qué cuenta como "cerrado fuera de tiempo", cómo separar resolutores por `;`/`,`) con el componente de UI, dificultando testearlas de forma aislada.
- **Cálculo de negocio en ResolutorDetalleModal.tsx**: `calcularPorcentajeDisponibilidad` es una función exportada de un archivo de componente, no de `Funcionalidades/dashboard`; debería vivir junto a `useDisponibilidadTeams` o `useDashboardDisponibilidad`.
- **Conversión de unidades confusa**: en `DashboardDisponibilidad.tsx` y `ResolutorDetalleModal.tsx` se dividen manualmente los minutos por 60 antes de pasarlos a `ResolutorInfoCard`, cuyo tipo se llama `ResolutorMinutos` pero en la práctica siempre recibe horas ya convertidas. El nombre del tipo/prop no refleja la unidad real, riesgo de errores de doble conversión a futuro.
- **`"resumen"` como string mágico repetido**: en `DahsboardResumen.tsx`, seis llamadas distintas (`obtenerTotal`, `obtenerTop5`, `obtenerTotalCategoria`, `obtenerTotalResolutor`, `obtenerFuentes`, `obtenerCasosPorDia`) reciben el literal `"resumen"` sin que quede claro en el componente qué otros valores acepta ese parámetro ni por qué se repite 6 veces.
- **Falta de manejo de error en las vistas de dashboard**: `DahsboardResumen.tsx` y `DashboardDetallado.tsx` solo muestran un estado de `loading` ("Cargando…") pero no exponen ningún mensaje si `useDashboard`/`useDetallado` devuelven error; a diferencia de `ReportsPage.tsx`, que sí maneja el estado `"error"` con mensaje visible.
- **Accesibilidad de `ResolutorDetalleModal`**: no hay foco inicial, `Escape` para cerrar, ni trampa de foco (similar a `ModalShell` del módulo de Tickets); solo usa `role="dialog"`/`aria-modal` estáticos sin comportamiento de teclado.
- **Re-render/memoización**: `DashboardPage.tsx` recrea el array `Items` en cada render (no es costoso en este caso, pero podría memoizarse con `useMemo` ya que es una lista estática con JSX). Los gráficos SVG (`Donut`, `Gauge`, etc.) no usan `React.memo`, aunque su costo de render es bajo dado el tamaño de los datos.
- **Prop `title` no usada correctamente / props muertos**: en `Reports/ReportsPage.tsx`, la función `getAllTicketsForRange` recibe `range: MonthWindow` pero solo usa `firstPage.data` de una sola llamada a `loadTickets` (nombre de la función sugiere posible paginación no implementada — riesgo de reportes incompletos si `loadTickets` pagina resultados en el backend).
