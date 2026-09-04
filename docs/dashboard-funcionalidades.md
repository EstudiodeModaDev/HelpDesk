# Dashboard (lógica)

## Descripción general
Este módulo agrupa la lógica de los tres tableros de indicadores de la mesa de ayuda: el resumen general, el detallado y el de disponibilidad del equipo. Los dos primeros calculan métricas (SLA, top categorías, top solicitantes, distribución por fuente, series diarias/mensuales) a partir de los tickets que expone `TicketsRepository` (SharePoint vía Graph). El tercero se apoya en Supabase (una función RPC de Postgres y una Edge Function) para mostrar minutos trabajados, sesiones y disponibilidad de Teams por resolutor, complementando el módulo `timeCounter`. Todos son hooks de React consumidos por las vistas en `src/components/Dashboard/*`.

## Archivos
- `src/Funcionalidades/dashboard/Dashboard.ts` — hook `useDashboard`, resumen general de tickets (rango configurable, por defecto último mes) filtrado por usuario actual en modo "resumen".
- `src/Funcionalidades/dashboard/DashboardDetallado.ts` — hook `useDetallado`, vista detallada con clasificación de estados normalizada, agregación por resolutor y una serie mensual "rolling" independiente del rango elegido por el usuario.
- `src/Funcionalidades/dashboard/useDashboardDisponibilidad.ts` — hook `useDashboardDisponibilidad`, trae y normaliza el resultado de la RPC de Supabase `fn_obtener_dashboard_equipo` (minutos normales/nocturnos/dominicales-festivos, sesiones activas/pausadas/finalizadas por resolutor).
- `src/Funcionalidades/dashboard/useDisponibilidadTeams.ts` — hook `useDisponibilidadTeams`, obtiene los turnos programados en Teams de un resolutor invocando la Edge Function de Supabase `obtener-disponibilidad-teams` (documentada por otro equipo).

## Funciones y constantes clave

### `useDashboard(TicketsSvc)` (Dashboard.ts)
- Estado: `resolutores`, `totalCasos`, `totalEnCurso`, `totalFueraTiempo`, `totalFinalizados`, `porcentajeCumplimiento`, `range` (default `getXMonthsBackRange({MonthQuantity:1})`), `topCategorias`, `totalCategorias`, `topSolicitante`, `casosPorDia`, `Fuentes`, `loading`, `error`.
- `buildFilterTickets(mode)`: si `mode === "resumen"` filtra por `currentUser = esc(account.username)` y el rango de fechas (convertido con `toGraphDateTime`); para otros modos no aplica filtro.
- `obtenerTotal(mode)`: carga tickets y calcula total, finalizados (`Estadodesolicitud === "cerrado"`), vencidos (`incluye "fuera de tiempo"`), en curso (`=== "en atención"`), `porcentajeCumplimiento = finalizados/total`, y el top 5 de solicitantes.
- `obtenerTop5(mode)` / `obtenerTotalCategoria(mode)`: agregan por `SubCategoria` (top 5 y listado completo ordenado desc).
- `obtenerTotalResolutor(mode)`: agrupa por `Correoresolutor`, conserva el mejor `Nombreresolutor` disponible y calcula `porcentaje` por resolutor.
- `obtenerFuentes(mode)`: agrupa por campo `Fuente`.
- `obtenerCasosPorDia(mode, fillGaps=true)`: cuenta tickets por día (`FechaApertura`, normalizado a UTC `YYYY-MM-DD`) y, si `fillGaps`, rellena los días sin datos dentro del `range` con `total: 0`.

### `useDetallado(TicketsSvc)` (DashboardDetallado.ts)
- `getCurrentMonthRange()`: rango por defecto = mes calendario actual.
- `classifyEstado(raw)`: usa `norm()` (quita tildes/mayúsculas) y clasifica en `isAt` (cerrado / cerrado a tiempo), `isLate` (fuera de tiempo / cerrado fuera de tiempo), `isProg` (en atención/atencion).
- `buildResolutores(tickets)`: separa `Correoresolutor` en múltiples direcciones (split por `;`/`,` + regex de email), deduplica y agrega por resolutor `total/at/vencidos/enCurso` y `porcentaje = at/total`.
- `obtenerConteoUltimosMeses(months)`: trae tickets de los últimos N meses (independiente del `range` de la UI) y arma un conteo mensual (`conteoPorMes`), usado para el gráfico "rolling".
- `obtenerTotal()`: función principal; calcula buckets de estado, top solicitantes, categorías, resolutores (`buildResolutores`) y serie diaria (sin relleno de huecos); al final dispara `obtenerConteoUltimosMeses(5)` como efecto colateral (valor fijo de 5 meses).
- `obtenerFuentes()`: se calcula sobre el estado `tickets` ya cargado en memoria, sin nueva llamada a `TicketsSvc`.

### `useDashboardDisponibilidad(_ticketsSvc)` (useDashboardDisponibilidad.ts)
- Constantes `EMPTY_TOTAL` / `EMPTY_DASHBOARD`: valores por defecto para no romper la UI cuando la RPC no responde.
- `loadDashboardDisponibilidad()`: llama `supabase.rpc("fn_obtener_dashboard_equipo", { p_inicio: range.from, p_fin: range.to })`; normaliza la respuesta (puede venir como objeto o arreglo) con `normalizeDashboard`. Se ejecuta automáticamente en un `useEffect` cuando cambia `range`.
- `aggregateResolutores(resolutores)`: transforma cada `ResolutorDetalle` en `ResolutorDisponibilidadAgg`, calculando `minutosPromedio = minutosTotales/totalTickets`.
- Filtros locales `selectedResolutor` / `selectedFuente` / `selectedSemana` (los dos últimos no filtran nada real: `Fuente` y `Semana` no existen en la respuesta de la RPC).
- Varios campos devueltos son constantes vacías (`ticketsDisponibilidad: []`, `semanas: []`, `semanaOptions: []`, `minutosFestivos: 0`) porque la RPC solo entrega agregados, no el detalle de tickets.

### `useDisponibilidadTeams({ correo, range })` (useDisponibilidadTeams.ts)
- `loadDisponibilidad()`: invoca `supabase.functions.invoke("obtener-disponibilidad-teams", { body: { correo, inicio: range.from, fin: range.to } })` (Edge Function, documentada aparte). Si no hay `correo`, no llama a la función y setea un error explícito.
- Devuelve `turnos: TurnoDisponibilidad[]` y `minutosProgramados` (más `horasProgramadas` derivado). Se recarga automáticamente vía `useEffect` cuando cambian `correo` o `range`.

## Flujo del módulo
- `src/components/Dashboard/DashboardGeneral/DahsboardResumen.tsx` usa `useDashboard` para el tablero resumen (filtrado por usuario logueado).
- `src/components/Dashboard/DashboardDetallado/DashboardDetallado.tsx` usa `useDetallado` para el tablero con desglose por resolutor y gráfico mensual.
- `src/components/Dashboard/DashboardDisponibilidad/DashboardDisponibilidad.tsx` usa `useDashboardDisponibilidad` (RPC agregada) como vista principal de disponibilidad del equipo.
- `src/components/Dashboard/DashboardDisponibilidad/ResolutorDetalleModal.tsx` usa `useDisponibilidadTeams` para el detalle de turnos de Teams de un resolutor específico (drill-down desde la vista anterior).
- Orden típico: el componente monta → el hook dispara la carga automática (o el usuario cambia el rango) → se actualiza el estado del hook → la UI vuelve a renderizar tablas/gráficos. Los tableros basados en SharePoint (`Dashboard.ts`, `DashboardDetallado.ts`) no tienen `useEffect` de auto-carga: dependen de que el componente llame explícitamente a `obtenerTotal`/`obtenerTop5`/etc.

## Dependencias
- Internas: `Models/Dashboard`, `Models/Filtros`, `Models/Tickets`, `repositories/TicketsRepository`, `utils/Date` (`getXMonthsBackRange`, `toGraphDateTime`), `utils/Commons` (`esc`, `norm`), `auth/authContext`, `Services/Supabase.service`.
- Externas: React (hooks), cliente `@supabase/supabase-js` (RPC y Edge Functions).

## Oportunidades de mejora
- **Duplicación de "unwrap" de resultados**: el patrón `Array.isArray(res?.data) ? res.data : Array.isArray((res as any)?.value) ? (res as any).value : []` se repite casi idéntico en cada función de `Dashboard.ts` y `DashboardDetallado.ts`; candidato claro a extraer a un helper compartido.
- **Clasificación de estado inconsistente entre tableros**: `Dashboard.ts` compara `Estadodesolicitud` con `=== "cerrado"` / `.includes("fuera de tiempo")` sin normalizar tildes/mayúsculas, mientras `DashboardDetallado.ts` usa `norm()` en `classifyEstado`. Un mismo ticket podría clasificarse distinto en el resumen y en el detallado si el valor tiene variaciones de acentuación/caso.
- **Posible bug en `obtenerTotalResolutor` (Dashboard.ts, línea ~208)**: `porcentaje = totalTickets > 0 ? totalFinalizados / totalTickets : 0` usa el `totalFinalizados` global (de todo el conjunto de tickets) para calcular el porcentaje de cada resolutor individual, en vez de los finalizados propios de ese resolutor — a diferencia de `buildResolutores` en `DashboardDetallado.ts`, que sí calcula `at/total` por resolutor.
- **`console.table(tickets)` en `obtenerTop5` (Dashboard.ts)**: log de depuración que queda en producción.
- **Tipado débil**: uso extendido de `any` (`(casos as any)?.value`, `tickets: any[]`, `t: any`) en ambos archivos de dashboard, perdiendo el chequeo de tipos que ofrece `Ticket`.
- **Sin cancelación/cleanup**: ninguno de los `useCallback` async verifica si el componente sigue montado antes de `setState`; en navegación rápida entre pestañas del dashboard puede generar actualizaciones de estado en componentes desmontados.
- **`useDashboardDisponibilidad` con contrato "fantasma"**: campos como `ticketsDisponibilidad`, `semanas`, `semanaOptions`, `minutosFestivos` siempre se devuelven vacíos/0 y los filtros `selectedFuente`/`selectedSemana` no tienen efecto real sobre los datos (la RPC no expone esas dimensiones) — esto sugiere una interfaz heredada de una versión anterior no limpiada del todo, y puede confundir a quien consuma el hook esperando que esos filtros funcionen.
- **Recarga fija de 5 meses**: `obtenerTotal()` en `DashboardDetallado.ts` llama `obtenerConteoUltimosMeses(5)` con el número de meses hardcodeado, acoplando dos responsabilidades (KPIs del rango elegido + gráfico rolling fijo) en una sola función.
