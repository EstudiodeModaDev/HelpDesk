import React from "react";
import type { Ticket } from "../Models/Tickets";
import { TicketsService } from "../Services/Tickets.service";
import type { DateRange, FilterMode } from "../Models/Filtros";
import { toISODateFlex  } from "../utils/Date";
import type { GetAllOpts } from "../Models/Commons";

export function parseFecha(fecha?: string): Date {
  if (!fecha) return new Date(NaN);

  // Espera "dd/mm/yyyy hh:mm" (permite espacios múltiples)
  const [dmy, hm] = fecha.trim().split(/\s+/);
  if (!dmy || !hm) return new Date(NaN);

  const [dia, mes, anio] = dmy.split('/');
  const [horas, minutos] = hm.split(':');
  if (!dia || !mes || !anio || !horas || !minutos) return new Date(NaN);

  // Construye ISO local (sin zona): yyyy-mm-ddThh:mm
  const iso = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}`;

  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? new Date(NaN) : dt;
}

export function calcularColorEstado(ticket: Ticket): string {
  const estado = (ticket.estado ?? '').toLowerCase();

  if (estado === 'cerrado' || estado === 'cerrado fuera de tiempo') {
    return 'rgba(0,0,0,1)'; // negro
  }

  if (!ticket.FechaApertura || !ticket.TiempoSolucion) {
    return 'rgba(255,0,0,1)'; // rojo si faltan fechas
  }

  const inicio = parseFecha(ticket.FechaApertura).getTime();
  const fin    = parseFecha(ticket.TiempoSolucion).getTime();
  const ahora  = Date.now();

  if (isNaN(inicio) || isNaN(fin)) {
    return 'rgba(255,0,0,1)'; // rojo si fechas inválidas
  }

  const horasTotales    = (fin - inicio) / 3_600_000;
  const horasRestantes  = (fin - ahora)  / 3_600_000;

  // Vencido o duración inválida => rojo
  if (horasTotales <= 0 || horasRestantes <= 0) {
    return 'rgba(255,0,0,1)';
  }

  // p = % de tiempo restante (0 a 1)
  const p = Math.max(0, Math.min(1, horasRestantes / horasTotales));

  // Paleta simple: >50% -> verde oscuro, 10–50% -> amarillo, <10% -> rojo
  const r = p > 0.5 ? 34  : p > 0.1 ? 255 : 255;
  const g = p > 0.5 ? 139 : p > 0.1 ? 165 :   0;
  const b = p > 0.5 ? 34  : p > 0.1 ?   0 :   0;

  // Alpha más visible cuando queda poco tiempo
  const alpha = Math.max(0.3, 1 - p);

  return `rgba(${r},${g},${b},${alpha})`;
}

export function useTickets(
  TicketsSvc: TicketsService,
  userMail: string,
  isAdmin: boolean
) {
  // UI state
  const [rows, setRows] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const [filterMode, setFilterMode] = React.useState<FilterMode>('En curso');

  const today = React.useMemo(() => toISODateFlex(new Date()), []);
  const [range, setRange] = React.useState<DateRange>({ from: today, to: today });

  const [pageSize, setPageSize] = React.useState<number>(10);
  const [pageIndex, setPageIndex] = React.useState<number>(0);

  const [reloadTick, setReloadTick] = React.useState(0);

  // ===== construir filtro OData según modo =====
  const buildFilter = React.useCallback((): GetAllOpts => {
    const filters: string[] = [];
    if (!isAdmin && userMail?.trim()) {
      const emailSafe = userMail.replace(/'/g, "''");
      filters.push(`fields/Title eq '${emailSafe}'`);
    }

    if (filterMode === 'En curso') {
      filters.push(`(fields/Estadodesolicitud eq 'En atención' or fields/Estadodesolicitud eq 'Fuera de tiempo')`);
    } else {
      filters.push(`startswith(fields/Estadodesolicitud,'Cerrado')`);
    }
    if(range.from > range.to) {
      if (range.from) filters.push(`fields/FechaApertura ge '${range.from}'`);
      if (range.to)   filters.push(`fields/FechaApertura le '${range.to}'`);
    }

    const filter = filters.join(' and ');

    return { filter, top: pageSize };
  }, [isAdmin, userMail, filterMode, range.from, range.to, today]);

  // ===== cargar datos =====
  const fetchRows = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const opts = buildFilter();
      const list = await TicketsSvc.getAll(opts);
      console.log('[Tickets] fetched', list, 'rows with filter:', opts.filter);

      setRows(list);
      setPageIndex(0); // reset paginación en cada recarga
    } catch (e: any) {
      console.error('[MisReservas] fetchRows error:', e);
      setError(e?.message ?? 'Error cargando reservas');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [buildFilter, TicketsSvc]);

  // Primer load + recargas controladas
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      await fetchRows();
      if (cancel) return;
    })();
    return () => { cancel = true; };
    // reloadTick asegura que sólo apliquemos rango cuando el usuario pulse “Buscar”
  }, [fetchRows, reloadTick]);

  // ===== acciones públicas =====
  const nextPage = React.useCallback(() => {
    setPageIndex(i => i + 1);
  }, []);
  const prevPage = React.useCallback(() => {
    setPageIndex(i => Math.max(0, i - 1));
  }, []);

  const hasNext = React.useMemo(() => {
    const total = rows.length;
    return (pageIndex + 1) * pageSize < total;
  }, [rows.length, pageIndex, pageSize]);

  const applyRange = React.useCallback(() => {
    // Sólo tiene efecto en modo historial; en “upcoming-active” igual recarga.
    setReloadTick(x => x + 1);
  }, []);

  const reloadAll = React.useCallback(() => {
    // Recarga general (úsalo después de reservar/cancelar)
    setReloadTick(x => x + 1);
  }, []);


  return {
    // datos
    rows,
    loading,
    error,

    // filtros
    filterMode,
    setFilterMode,

    // rango (para “Historial”)
    range,
    setRange,
    applyRange,

    // paginación
    pageSize,
    setPageSize,
    pageIndex,
    hasNext,
    nextPage,
    prevPage,

    // acciones
    reloadAll, // 👈 expuesto
  };
}
