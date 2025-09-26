// src/components/Tickets/Tickets.tsx
import * as React from "react";
import DetalleTicket from "../DetallesTickets/DetallesTickets";
import "./Tickets.css";

import { useAuth } from "../../auth/authContext"; // o la ruta que uses
import { useGraphServices } from "../../graph/GrapServicesContext"; // tu context de servicios
import { useTickets, calcularColorEstado, } from "../../Funcionalidades/Tickets" 
import type { Ticket } from "../../Models/Tickets";
import { toISODateFlex } from "../../utils/Date";


export default function TablaTickets() {
  const { account } = useAuth();
  const userMail = account?.username ?? "";
  const isAdmin = true; // ajusta tu lógica real de roles

  const { Tickets } = useGraphServices();

  const {
    rows,
    loading,
    error,

    // filtros
    filterMode,
    setFilterMode,
    range,
    setRange,
    applyRange,

    // paginación
    pageSize,
    setPageSize,
    pageIndex,
    //hasNext,
    nextPage,
    prevPage,

    // acciones
    reloadAll,
  } = useTickets(Tickets, userMail, isAdmin);

  // Búsqueda local (tu input de texto)
  const [search, setSearch] = React.useState("");
  const [ticketSeleccionado, setTicketSeleccionado] = React.useState<Ticket | null>(null);

  // Filtro local por texto (resolutor, solicitante, asunto)
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) => {
      const texto = `${t.resolutor ?? ""} ${t.solicitante ?? ""} ${t.Title ?? ""}`.toLowerCase();
      return texto.includes(q);
    });
  }, [rows, search]);

  // Paginación en cliente (tu hook ya trae todo y resetea pageIndex en cada recarga)
  const start = pageIndex * pageSize;
  const end = start + pageSize;
  const pageRows = filtered.slice(start, end);
  const pageHasNext = end < filtered.length;

  const resetFiltrosLocal = () => {
    setSearch("");
  };

  return (
    <div className="tabla-tickets">
      <h2>Listado de Tickets</h2>

      {/* Barra de filtros (solo si NO está en detalle) */}
      {!ticketSeleccionado && (
        <div className="filtros" style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto auto auto auto auto auto' }}>
          {/* Búsqueda local */}
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

          {/* Aplicar rango (re-carga servidor) */}
          <button type="button" onClick={applyRange} title="Aplicar rango">
            Aplicar
          </button>

          {/* Recargar todo */}
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
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
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
              {pageRows.map((ticket) => (
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
                  <td>{toISODateFlex(ticket.FechaApertura)|| "–"}</td>
                  <td>{toISODateFlex(ticket.TiempoSolucion) || "No tiene fecha maxima"}</td>
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

          {/* Paginación */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <button onClick={prevPage} disabled={loading || pageIndex === 0}>Anterior</button>
              <span>Página {pageIndex + 1} de {Math.max(1, Math.ceil(filtered.length / pageSize))}</span>
              <button onClick={nextPage} disabled={loading || !pageHasNext}>Siguiente</button>

              <span style={{ marginLeft: 12 }}>Filas por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  // rehusa setPageSize del hook para mantener coherencia
                  // (el hook expone setPageSize: (n: number) => void)
                  setPageSize(n);
                }}
              >
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
