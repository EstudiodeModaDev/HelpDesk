import React from "react";
import type { SortDir, SortField, Ticket } from "../Models/Tickets";
import { TicketsService } from "../Services/Tickets.service";
import type { DateRange, FilterMode } from "../Models/Filtros";
import { toISODateFlex } from "../utils/Date";
import type { GetAllOpts } from "../Models/Commons";

export function parseDDMMYYYYHHMM(fecha?: string | null): Date {
  if (!fecha) return new Date(NaN);
  const [dmy, hm] = fecha.trim().split(/\s+/);
  if (!dmy || !hm) return new Date(NaN);
  const [d, m, y] = dmy.split('/');
  const [H, M] = hm.split(':');
  if (!d || !m || !y || !H || !M) return new Date(NaN);
  // Construimos ISO local (sin zona); JS lo interpreta en local.
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${H.padStart(2, '0')}:${M.padStart(2, '0')}`;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? new Date(NaN) : dt;
}

// Reemplaza tu parseFecha por esta versión
export function parseFechaFlex(fecha?: string): Date {
  if (!fecha) return new Date(NaN);
  const t = fecha.trim();

  // 1) YYYY-MM-DD HH:mm  o  YYYY-MM-DDTHH:mm  (lo más común desde Graph/SharePoint)
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    // normaliza el espacio a 'T' para que Date lo entienda mejor
    return new Date(t.replace(' ', 'T'));
  }

  // 2) DD/MM/YYYY HH:mm  (tu formato anterior)
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (m) {
    const [, dd, mm, yyyy, HH, MM] = m;
    return new Date(`${yyyy}-${mm}-${dd}T${HH}:${MM}`);
  }

  return new Date(NaN);
}

export function calcularColorEstado(ticket: Ticket): string {
  const estado = (ticket.Estadodesolicitud ?? '').toLowerCase();

  if (estado === 'cerrado' || estado === 'cerrado fuera de tiempo') {
    return 'rgba(0,0,0,1)'; // negro para cerrados
  }

  if (!ticket.FechaApertura || !ticket.TiempoSolucion) {
    return 'rgba(255,0,0,1)'; // rojo si faltan fechas
  }

  const inicio = parseFechaFlex(ticket.FechaApertura).getTime();
  const fin    = parseFechaFlex(ticket.TiempoSolucion).getTime();
  const ahora  = Date.now();

  if (isNaN(inicio) || isNaN(fin)) {
    return 'rgba(255,0,0,1)'; // rojo si fechas inválidas
  }

  const horasTotales   = (fin - inicio) / 3_600_000;
  const horasRestantes = (fin - ahora)  / 3_600_000;

  // vencido o duración inválida => rojo
  if (horasTotales <= 0 || horasRestantes <= 0) {
    return 'rgba(255,0,0,1)';
  }

  // p = % de tiempo restante
  const p = Math.max(0, Math.min(1, horasRestantes / horasTotales));

  // >50% verde, 10–50% amarillo/naranja, <10% rojo
  const r = p > 0.5 ? 34  : p > 0.1 ? 255 : 255;
  const g = p > 0.5 ? 139 : p > 0.1 ? 165 :   0;
  const b = p > 0.5 ? 34  : p > 0.1 ?   0 :   0;

  const alpha = Math.max(0.3, 1 - p); // más visible cuando queda poco

  return `rgba(${r},${g},${b},${alpha})`;
}

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

  const [sorts, setSorts] = React.useState<Array<{field: SortField; dir: SortDir}>>([{ field: 'ID', dir: 'desc' }]);

  // construir filtro OData
  const buildFilter = React.useCallback((): GetAllOpts => {
    const filters: string[] = [];

    if (!isAdmin ) {
      const emailSafe = userMail.replace(/'/g, "''");
      filters.push(`(fields/CorreoSolicitante eq '${emailSafe}' or fields/CorreoObservador eq '${emailSafe}' or fields/Correoresolutor eq '${emailSafe}')`);
    }

    if (filterMode === "En curso") {
      filters.push(`(fields/Estadodesolicitud eq 'En atención' or fields/Estadodesolicitud eq 'Fuera de tiempo')`);
    } else {
      filters.push(`startswith(fields/Estadodesolicitud,'Cerrado')`);
    }

    if (range.from && range.to && (range.from < range.to)) {
      if (range.from) filters.push(`fields/FechaApertura ge '${range.from}T00:00:00Z'`);
      if (range.to)   filters.push(`fields/FechaApertura le '${range.to}T23:59:59Z'`);
    }

    // ← NUEVO: construir orderby desde 'sorts'
    const orderParts: string[] = sorts
      .map(s => {
        const col = sortFieldToOData[s.field];
        return col ? `${col} ${s.dir}` : '';
      })
      .filter(Boolean);

    // Estabilidad de orden: si no incluiste 'id', agrega 'id desc' como desempate.
    if (!sorts.some(s => s.field === 'ID')) {
      orderParts.push('ID desc');
    }
    return {
      filter: filters.join(" and "),
      orderby: orderParts.join(","),
      top: pageSize,
    };
  }, [isAdmin, userMail, filterMode, range.from, range.to, pageSize, sorts]); 

  // cargar primera página (o recargar)
  const loadFirstPage = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { items, nextLink } = await TicketsSvc.getAll(buildFilter()); // debe devolver {items,nextLink}
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
  }, [TicketsSvc, buildFilter, sorts]);

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

  const sortFieldToOData: Record<SortField, string> = {
    ID: 'ID',
    FechaApertura: 'fields/FechaApertura',
    TiempoSolucion: 'fields/TiempoSolucion',
    Title: 'fields/Title',
    resolutor: 'fields/Nombreresolutor',
  };

  const toggleSort = React.useCallback((field: SortField, additive = false) => {
    setSorts(prev => {
      const idx = prev.findIndex(s => s.field === field);
      if (!additive) {
        // clic normal: solo esta columna; alterna asc/desc
        if (idx >= 0) {
          const dir: SortDir = prev[idx].dir === 'desc' ? 'asc' : 'desc';
          return [{ field, dir }];
        }
        return [{ field, dir: 'asc' }];
      }
      // Shift+clic: multi-columna
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { field, dir: copy[idx].dir === 'desc' ? 'asc' : 'desc' };
        return copy;
      }
      return [...prev, { field, dir: 'asc' }];
    });
  }, []);

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
    toggleSort,
    sorts,
  };
}

export function useTicketsRelacionados(TicketsSvc: TicketsService, ticket: Ticket) {
  const [padre, setPadre] = React.useState<Ticket | null>(null);
  const [hijos, setHijos] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

const loadRelateds = React.useCallback(async () => {
  if (!ticket?.ID) {
    setPadre(null);
    setHijos([]);
    return;
  }

  setLoading(true);
  setError(null);

  try {
    // --- Padre (si aplica) ---
    const idPadre = ticket.IdCasoPadre;
    if (idPadre != null && idPadre !== "") {
      const padreRes = await TicketsSvc.get(ticket.ID);
      setPadre(padreRes ?? null);
    } else {
      setPadre(null);
    }

    // --- Hijos ---
    const hijosRes = await TicketsSvc.getAll({
      filter: `fields/IdCasoPadre eq ${Number(ticket.ID)}`,
    });
    setHijos(hijosRes?.items ?? []);
  } catch (e: any) {
    setError(e?.message ?? "Error cargando tickets");
    setPadre(null);
    setHijos([]);
  } finally {
    setLoading(false);
  }
}, [TicketsSvc, ticket?.ID, ticket?.IdCasoPadre]);


  React.useEffect(() => {
    loadRelateds();
  }, [loadRelateds])


  return {
    padre, hijos,
    loading,
    error,
    loadRelateds
  };
}
