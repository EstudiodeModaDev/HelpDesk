import React from "react";
import type { Ticket } from "../Models/Tickets";
import { TicketsService } from "../Services/Tickets.service";
import type { DateRange, FilterMode } from "../Models/Filtros";
import { toISODateFlex } from "../utils/Date";
import type { GetAllOpts } from "../Models/Commons";
import type { PageResult } from "../Models/Commons";

export function useTickets(
  TicketsSvc: TicketsService,
  userMail: string,
  isAdmin: boolean
) {
  // UI state
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [filterMode, setFilterMode] = React.useState<FilterMode>("En curso");

  const today = React.useMemo(() => toISODateFlex(new Date()), []);
  const [range, setRange] = React.useState<DateRange>({ from: today, to: today });

  // Tamaño de página en servidor (Graph $top)
  const [pageSize, setPageSize] = React.useState<number>(10);

  // Paginación basada en servidor
  const [pages, setPages] = React.useState<Ticket[][]>([]);
  const [cursor, setCursor] = React.useState<number>(0);        // índice de página actual (0..pages.length-1)
  const [nextLink, setNextLink] = React.useState<string | null>(null); // @odata.nextLink de la última carga

  const [reloadTick, setReloadTick] = React.useState(0);

  // ===== construir filtro OData según modo =====
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

    if( range.from > range.to && range.from && range.to ) {
      if (range.from) filters.push(`fields/FechaApertura ge '${range.from}'`);
      if (range.to)   filters.push(`fields/FechaApertura le '${range.to}'`);
    }

    return {
      filter: filters.join(" and "),
      top: pageSize,
    };
  }, [isAdmin, userMail, filterMode, range.from, range.to, pageSize]);

  // ===== carga primera página (o recarga con filtros nuevos) =====
  const fetchFirstPage = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const opts = buildFilter();
      const { items, nextLink } = await TicketsSvc.getAll(opts);
      setPages(items.length ? [items] : [[]]); // garantiza al menos una página vacía
      setCursor(0);
      setNextLink(nextLink);
    } catch (e: any) {
      console.error("[Tickets] fetchFirstPage error:", e);
      setError(e?.message ?? "Error cargando tickets");
      setPages([[]]);
      setCursor(0);
      setNextLink(null);
    } finally {
      setLoading(false);
    }
  }, [TicketsSvc, buildFilter]);

  // Efecto: primera carga + recargas controladas (buscar)
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      await fetchFirstPage();
      if (cancel) return;
    })();
    return () => { cancel = true; };
  }, [fetchFirstPage, reloadTick]);

  // ===== acciones públicas de paginación =====
  const hasPrev = cursor > 0;
  const hasNext = React.useMemo(() => {
    // Hay “siguiente” si todavía tenemos páginas en buffer por delante
    // o si Graph nos dio un nextLink pendiente.
    return cursor < (pages.length - 1) || !!nextLink;
  }, [cursor, pages.length, nextLink]);

  const nextPage = React.useCallback(async () => {
    // 1) si hay página siguiente ya cargada en buffer, solo avanza el cursor
    if (cursor < pages.length - 1) {
      setCursor(c => c + 1);
      return;
    }
    // 2) si no hay buffer pero sí nextLink, trae otra página del servidor
    if (nextLink) {
      setLoading(true);
      setError(null);
      try {
        const res: PageResult<Ticket> = await TicketsSvc.getByNextLink(nextLink);
        setPages(prev => [...prev, res.items]);
        setCursor(c => c + 1);
        setNextLink(res.nextLink); // puede venir null si era la última
      } catch (e: any) {
        console.error("[Tickets] nextPage error:", e);
        setError(e?.message ?? "Error cargando más tickets");
      } finally {
        setLoading(false);
      }
    }
  }, [cursor, pages.length, nextLink, TicketsSvc]);

  const prevPage = React.useCallback(() => {
    if (cursor > 0) setCursor(c => c - 1);
  }, [cursor]);

  // ===== acciones “buscar/recargar” =====
  const applyRange = React.useCallback(() => {
    setReloadTick(x => x + 1);
  }, []);
  const reloadAll = React.useCallback(() => {
    setReloadTick(x => x + 1);
  }, []);

  // Página visible actual
  const rows = pages[cursor] ?? [];

  return {
    // datos
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
    pageSize,        // controla $top
    setPageSize,     // si lo cambias, recuerda llamar applyRange() para recargar desde página 1
    pageIndex: cursor + 1,   // 1-based para UI
    totalPages: pages.length,
    hasPrev,
    hasNext,
    nextPage,
    prevPage,

    // acciones
    reloadAll,
  };
}
