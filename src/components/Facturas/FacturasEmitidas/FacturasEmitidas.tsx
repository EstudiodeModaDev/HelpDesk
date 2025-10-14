// src/components/Tickets/Tickets.tsx
import * as React from "react";
import "./FacturasEmitidas.css";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import type { Facturas } from "../../../Models/Facturas";
import { useVerFacturas } from "../../../Funcionalidades/Facturas";
import { toISODateTimeFlex } from "../../../utils/Date";


export default function TablaTickets() {
  const { Facturas } = useGraphServices();

  const {rows, range, loading, error, setRange, applyRange, toggleSort, pageIndex, pageSize, reloadAll, nextPage, hasNext, setPageSize} = useVerFacturas(Facturas);

  const [search, setSearch] = React.useState("");
  const [FacturaSeleccionada, setFacturaSeleccionada] = React.useState<Facturas | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) => {
      const texto = `${t.Title ?? ""} ${t.CO ?? ""} ${t.NoFactura ?? ""}`.toLowerCase();
      return texto.includes(q);
    });
  }, [rows, search]);

  const resetFiltrosLocal = () => setSearch("");

  return (
    <div className="tabla-tickets">

      {!FacturaSeleccionada && (
        <div className="filtros" style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto auto auto auto auto auto" }}>

          <input type="text" placeholder="Buscar (CO, NoFactura)…" value={search} onChange={(e) => setSearch(e.target.value)}/>
          <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} title="Desde"/>
          <span>→</span>
          <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} title="Hasta"/>
          <button type="button" onClick={applyRange} title="Aplicar rango">
            Aplicar
          </button>
          <button type="button" onClick={resetFiltrosLocal} title="Limpiar búsqueda">
            Limpiar
          </button>
        </div>
      )}

      {/* Estados */}
      {loading && <p>Cargando tickets…</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {!loading && !error && filtered.length === 0 && <p>No hay tickets para los filtros seleccionados.</p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th role="button" tabIndex={0} onClick={(e) => toggleSort('id', e.shiftKey)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort('id', e.shiftKey); }}
                  aria-label="Ordenar por ID" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  No de factura
                </th>
                <th role="button" tabIndex={0} onClick={(e) => toggleSort('resolutor', e.shiftKey)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort('resolutor', e.shiftKey); }}
                  aria-label="Ordenar por Resolutor" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Fecha de emisión 
                </th>
                <th>Proveedor</th> 
                <th role="button" tabIndex={0} onClick={(e) => toggleSort('Title', e.shiftKey)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort('Title', e.shiftKey); }}
                  aria-label="Ordenar por Asunto" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  CO
                </th>
                <th role="button" tabIndex={0} onClick={(e) => toggleSort('FechaApertura', e.shiftKey)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort('FechaApertura', e.shiftKey); }}
                  aria-label="Ordenar por Fecha de apertura" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Total
                </th>
                <th role="button" tabIndex={0} onClick={(e) => toggleSort('FechaApertura', e.shiftKey)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort('FechaApertura', e.shiftKey); }}
                  aria-label="Ordenar por Fecha de apertura" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Reportada Por
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((factura) => (
                <tr key={factura.Id} onClick={() => setFacturaSeleccionada(factura)} tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFacturaSeleccionada(factura)}>
                  <td>{factura.NoFactura}</td>
                  <td>{toISODateTimeFlex(factura.FechaEmision)}</td>
                  <td>{factura.IdProveedor}</td>
                  <td>{factura.CO}</td>
                  <td>{factura.Total}</td>
                  <td>{factura.Title}</td>
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
    </div>
  );
}