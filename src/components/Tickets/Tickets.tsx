// src/components/Tickets/Tickets.tsx
import * as React from "react";
import DetalleTicket from "../DetallesTickets/DetallesTickets";
import "./Tickets.css";

import { useAuth } from "../../auth/authContext";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useTickets } from "../../Funcionalidades/Tickets";
import type { Ticket } from "../../Models/Tickets";
import { toISODateTimeFlex } from "../../utils/Date";

export default function TablaTickets() {
  const { account } = useAuth();
  const userMail = account?.username ?? "";
  const isAdmin = true; // ajusta tu lógica real de roles

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
    reloadAll,      // recarga primera página (para “Anterior”)

  } = useTickets(Tickets, userMail, isAdmin);

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
                <th>ID</th>
                <th>Resolutor</th>
                <th>Solicitante</th>
                <th>Asunto</th>
                <th>Fecha de apertura</th>
                <th>Fecha máxima</th>
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
                      style={{ backgroundColor: "white" }}
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

              <span style={{ marginLeft: 12 }}>Filas por página ($top):</span>
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
