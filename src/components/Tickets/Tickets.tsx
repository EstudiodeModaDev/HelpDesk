// src/components/Tickets/Tickets.tsx
import * as React from "react";
import DetalleTicket from "../DetallesTickets/DetallesTickets";
import "./Tickets.css";

import { useAuth } from "../../auth/authContext";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { calcularColorEstado, useTickets } from "../../Funcionalidades/Tickets";
import type { SortDir, SortField, Ticket } from "../../Models/Tickets";
import { toISODateTimeFlex } from "../../utils/Date";
import { useIsAdmin } from "../../Funcionalidades/Usuarios";

function renderSortIndicator(field: SortField, sorts: Array<{field: SortField; dir: SortDir}>) {
  const idx = sorts.findIndex(s => s.field === field);
  if (idx < 0) return null;
  const dir = sorts[idx].dir === 'asc' ? '▲' : '▼';
  return <span style={{ marginLeft: 6, opacity: 0.85 }}>{dir}{sorts.length > 1 ? ` ${idx+1}` : ''}</span>;
}

export default function TablaTickets() {
  const { account } = useAuth();
  const userMail = account?.username ?? "";
  const isAdmin = useIsAdmin(userMail); // ajusta tu lógica real de roles

  const { Tickets } = useGraphServices();

  const {
    // datos/página actual (server-side)
    rows,
    loading,
    error,

    // filtros (server)
    filterMode,
    setFilterMode,
    range,
    setRange,
    applyRange,     // recarga primera página con el rango

    // paginación (server)
    pageSize,
    setPageSize,    // cambia $top -> recarga primera página
    pageIndex,      // 1-based
    hasNext,        // !!nextLink
    nextPage,       // sigue @odata.nextLink
    reloadAll, 
    toggleSort,
    sorts     // recarga primera página (para “Anterior”)

  } = useTickets(Tickets, userMail, isAdmin.isAdmin);

  // Búsqueda local SOLO sobre la página visible (si quieres global, hay que mover a OData)
  const [search, setSearch] = React.useState("");
  const [ticketSeleccionado, setTicketSeleccionado] = React.useState<Ticket | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) => {
      const texto = `${t.resolutor ?? ""} ${t.solicitante ?? ""} ${t.Title ?? ""} ${t.id}`.toLowerCase();
      return texto.includes(q);
    });
  }, [rows, search]);

  const resetFiltrosLocal = () => setSearch("");

  return (
    <div className="tabla-tickets">
      <h2>Listado de Tickets</h2>

      {/* Barra de filtros (oculta en detalle) */}
      {!ticketSeleccionado && (
        <div
          className="filtros"
          style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto auto auto auto auto auto" }}
        >
          {/* Búsqueda local (solo página actual) */}
          <input
            type="text"
            placeholder="Buscar (resolutor, solicitante, asunto)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Modo (servidor) */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            title="Estado"
          >
            <option value="En curso">En curso</option>
            <option value="Cerrados">Cerrados</option>
          </select>

          {/* Rango (servidor) */}
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            title="Desde"
          />
          <span>→</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            title="Hasta"
          />

          {/* Aplicar rango (recarga primera página) */}
          <button type="button" onClick={applyRange} title="Aplicar rango">
            Aplicar
          </button>

          {/* Recargar primera página */}
          <button type="button" onClick={reloadAll} title="Recargar">
            ⟳
          </button>

          {/* Limpiar búsqueda local */}
          <button type="button" onClick={resetFiltrosLocal} title="Limpiar búsqueda">
            Limpiar
          </button>
        </div>
      )}

      {/* Estados */}
      {loading && <p>Cargando tickets…</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {!loading && !error && filtered.length === 0 && <p>No hay tickets para los filtros seleccionados.</p>}

      {/* Tabla o Detalle */}
      {ticketSeleccionado ? (
        <DetalleTicket ticket={ticketSeleccionado} onVolver={() => setTicketSeleccionado(null)} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th
                  role="button"
                  tabIndex={0}
                  onClick={(e) => toggleSort('id', e.shiftKey)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort('id', e.shiftKey); }}
                  aria-label="Ordenar por ID"
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  ID {renderSortIndicator('id', sorts)}
                </th>

                <th
                  role="button"
                  tabIndex={0}
                  onClick={(e) => toggleSort('resolutor', e.shiftKey)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort('resolutor', e.shiftKey); }}
                  aria-label="Ordenar por Resolutor"
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Resolutor {renderSortIndicator('resolutor', sorts)}
                </th>

                <th>Solicitante</th> {/* si quieres ordenar por Solicitante, avísame y lo añadimos al mapping */}

                <th
                  role="button"
                  tabIndex={0}
                  onClick={(e) => toggleSort('Title', e.shiftKey)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort('Title', e.shiftKey); }}
                  aria-label="Ordenar por Asunto"
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Asunto {renderSortIndicator('Title', sorts)}
                </th>

                <th
                  role="button"
                  tabIndex={0}
                  onClick={(e) => toggleSort('FechaApertura', e.shiftKey)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort('FechaApertura', e.shiftKey); }}
                  aria-label="Ordenar por Fecha de apertura"
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Fecha de apertura {renderSortIndicator('FechaApertura', sorts)}
                </th>

                <th
                  role="button"
                  tabIndex={0}
                  onClick={(e) => toggleSort('TiempoSolucion', e.shiftKey)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort('TiempoSolucion', e.shiftKey); }}
                  aria-label="Ordenar por Fecha máxima"
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Fecha máxima {renderSortIndicator('TiempoSolucion', sorts)}
                </th>

                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => setTicketSeleccionado(ticket)}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setTicketSeleccionado(ticket)}
                >
                  <td>{ticket.id}</td>
                  <td>{ticket.resolutor}</td>
                  <td>{ticket.solicitante}</td>
                  <td>{ticket.Title}</td>
                  <td>{toISODateTimeFlex(ticket.FechaApertura) || "–"}</td>
                  <td>{toISODateTimeFlex(ticket.TiempoSolucion) || "No tiene fecha máxima"}</td>
                  <td>
                    <span
                      className="estado-circulo"
                      style={{ backgroundColor: calcularColorEstado(ticket) }}
                      title={ticket.estado || "Sin estado"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación servidor: Anterior = volver a primera página (loadFirstPage), Siguiente = nextLink */}
          {filtered.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <button onClick={reloadAll} disabled={loading || pageIndex <= 1}>
                Anterior
              </button>
              <span>Página {pageIndex}</span>
              <button onClick={nextPage} disabled={loading || !hasNext}>
                Siguiente
              </button>

              <span style={{ marginLeft: 12 }}>Registris por pagina:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                disabled={loading}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}