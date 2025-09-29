import React from "react";
import type { Ticket, TicketLike } from "../Models/Tickets";
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

export function colorEstadoPA(
  item: TicketLike,
  alphaCerrado: number = 1 // pon 0 si quieres replicar literal RGBA(0,0,0,0)
): string {
  const estado = (item.estado ?? '').toLowerCase();
  const ts = parseDDMMYYYYHHMM(item.TiempoSolucion);

  // 1) Cerrado o Cerrado fuera de tiempo
  if (estado === 'cerrado' || estado === 'cerrado fuera de tiempo') {
    return `rgba(0,0,0,${alphaCerrado})`; // negro (o transparente si alphaCerrado=0)
  }

  // 2) Si no hay TiempoSolucion -> rojo
  if (!item.TiempoSolucion || isNaN(ts.getTime())) {
    return 'rgba(255,0,0,1)';
  }

  // 3) Rama "Hour(ts) <> 0 && DateDiff(Now(); ts; Hours) <> 0"
  const now = Date.now();
  const horasRestantes = (ts.getTime() - now) / 3_600_000;
  const horaDelDia = ts.getHours(); // equivalente a Hour(DateTimeValue(ts)) en PA

  if (horaDelDia !== 0 && horasRestantes !== 0) {
    // p = Max(0; Min(1; horasRestantes / horaDelDia))
    const denom = horaDelDia === 0 ? 1 : horaDelDia; // por seguridad (aunque ya chequeamos)
    const ratio = horasRestantes / denom;
    const p = Math.max(0, Math.min(1, ratio));

    // Colores según p (verde→naranja→rojo) y alpha Max(0,3; 1 - p)
    const r = p > 0.5 ? 34  : p > 0.1 ? 255 : 255;
    const g = p > 0.5 ? 139 : p > 0.1 ? 165 :   0;
    const b = p > 0.5 ? 34  : p > 0.1 ?   0 :   0;
    const a = Math.max(0.3, 1 - p);

    return `rgba(${r},${g},${b},${a})`;
  }

  // 4) Si Hour(ts) == 0 o horasRestantes == 0
  // Power Apps: If(IsBlank(TiempoSolucion); RGBA(0,0,0,0); RGBA(255,0,0,1))
  // Ya verificamos blank arriba; aquí devolvemos rojo cuando no entra a la rama anterior.
  return 'rgba(255,0,0,1)';
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
