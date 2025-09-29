import React from "react";
import type { Ticket } from "../Models/Tickets";
import { TicketsService } from "../Services/Tickets.service";
import type { DateRange, FilterMode } from "../Models/Filtros";
import { toISODateFlex } from "../utils/Date";
import type { GetAllOpts } from "../Models/Commons";

export function useTickets(
  TicketsSvc: TicketsService,
  userMail: string,
  isAdmin: boolean
) {
  // UI state
  const [rows, setRows] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // filtros
  const [filterMode, setFilterMode] = React.useState<FilterMode>("En curso");
  const today = React.useMemo(() => toISODateFlex(new Date()), []);
  const [range, setRange] = React.useState<DateRange>({ from: today, to: today });

  // paginación servidor
  const [pageSize, setPageSize] = React.useState<number>(10); // = $top
  const [pageIndex, setPageIndex] = React.useState<number>(1); // 1-based
  const [nextLink, setNextLink] = React.useState<string | null>(null);

  // construir filtro OData
  const buildFilter = React.useCallback((): GetAllOpts => {
    const filters: string[] = [];

    if (!isAdmin && userMail?.trim()) {
      const emailSafe = userMail.replace(/'/g, "''");
      filters.push(`fields/Title eq '${emailSafe}'`);
    }

    if (filterMode === "En curso") {
      filters.push(`(fields/Estadodesolicitud eq 'En atención' or fields/Estadodesolicitud eq 'Fuera de tiempo')`);
    } else {
      filters.push(`startswith(fields/Estadodesolicitud,'Cerrado')`);
    }

    if( range.from && range.to && (range.from < range.to) ) {
      if (range.from) filters.push(`fields/FechaApertura ge '${range.from}T00:00:00Z'`);
      if (range.to)   filters.push(`fields/FechaApertura le '${range.to}T23:59:59Z'`);
    }
    console.log("OData filters:", filters);
    console.log("top", pageSize);
    return {
      filter: filters.join(" and "),
      orderby: "fields/FechaApertura desc,id desc", // orden estable
      top: pageSize,
    };
  }, [isAdmin, userMail, filterMode, range.from, range.to, pageSize]);

  // cargar primera página (o recargar)
  const loadFirstPage = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { items, nextLink } = await TicketsSvc.getAll(buildFilter()); // debe devolver {items,nextLink}
      console.log("Tickets cargados:", items.length, "nextLink:", nextLink);
      setRows(items);
      setNextLink(nextLink ?? null);
      setPageIndex(1);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando tickets");
      setRows([]);
      setNextLink(null);
      setPageIndex(1);
    } finally {
      setLoading(false);
    }
  }, [TicketsSvc, buildFilter]);

  React.useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  // siguiente página: seguir el nextLink tal cual
  const hasNext = !!nextLink;

  const nextPage = React.useCallback(async () => {
    if (!nextLink) return;
    setLoading(true); setError(null);
    try {
      const { items, nextLink: n2 } = await TicketsSvc.getByNextLink(nextLink);
      setRows(items);              // 👈 reemplaza la página visible
      setNextLink(n2 ?? null);     // null si no hay más
      setPageIndex(i => i + 1);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando más tickets");
    } finally {
      setLoading(false);
    }
  }, [nextLink, TicketsSvc]);

  // recargas por cambios externos
  const applyRange = React.useCallback(() => { loadFirstPage(); }, [loadFirstPage]);
  const reloadAll  = React.useCallback(() => { loadFirstPage(); }, [loadFirstPage]);

  return {
    // datos visibles (solo la página actual)
    rows,
    loading,
    error,

    // paginación (servidor)
    pageSize, setPageSize, // si cambias, se recarga por el efecto de arriba (porque cambia buildFilter)
    pageIndex,
    hasNext,
    nextPage,

    // filtros
    filterMode, setFilterMode,
    range, setRange,
    applyRange,

    // acciones
    reloadAll,
  };
}
