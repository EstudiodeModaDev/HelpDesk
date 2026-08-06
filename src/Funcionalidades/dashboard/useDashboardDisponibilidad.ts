import React from "react";
import type { DateRange } from "../../Models/Filtros";
import type { Ticket } from "../../Models/Tickets";
import type { TopCategoria } from "../../Models/Dashboard";
import type { TicketsRepository } from "../../repositories/TicketsRepository/TicketRepository";
import { getXMonthsBackRange } from "../../utils/Date";
import { supabase } from "../../Services/Supabase.service";

type TotalDashboard = {
  horas_totales: number;
  minutos_normal: number;
  minutos_totales: number;
  minutos_nocturno: number;
  sesiones_activas: number;
  cantidad_sesiones: number;
  sesiones_pausadas: number;
  resolutores_activos: number;
  sesiones_finalizadas: number;
  minutos_dominical_festivo: number;
  minutos_nocturno_dominical_festivo: number;
};

type ResolutorDetalle = {
  correo: string;
  nombre: string;
  resolutor_id: string;
  horas_totales: number;
  sharepoint_id: number;
  minutos_normal: number;
  minutos_totales: number;
  minutos_nocturno: number;
  sesiones_activas: number;
  cantidad_sesiones: number;
  sesiones_pausadas: number;
  sesiones_finalizadas: number;
  minutos_dominical_festivo: number;
  minutos_nocturno_dominical_festivo: number;
};

interface DashboardApiResponse {
  ok: boolean;
  codigo: string;
  resumen: TotalDashboard;
  resolutores: ResolutorDetalle[];
}

export type SemanaDisponibilidad = {
  label: string;
  total: number;
  minutosPromedio: number;
};

export type ResolutorDisponibilidadAgg = {
  nombre: string;
  correo: string;
  totalTickets: number;
  minutosPromedio: number;
  minutosTotales: number;
  minutosNormales: number;
  minutosNocturnos: number;
  minutosDominicales: number;
  minutosFestivos: number;
  minutos_nocturno_dominical_festivo: number;
  sesionesActivas: number;
  sesionesPausadas: number;
  sesionesFinalizadas: number;
};

const EMPTY_TOTAL: TotalDashboard = {
  horas_totales: 0,
  minutos_normal: 0,
  minutos_totales: 0,
  minutos_nocturno: 0,
  sesiones_activas: 0,
  cantidad_sesiones: 0,
  sesiones_pausadas: 0,
  resolutores_activos: 0,
  sesiones_finalizadas: 0,
  minutos_dominical_festivo: 0,
  minutos_nocturno_dominical_festivo: 0,
};

const EMPTY_DASHBOARD: DashboardApiResponse = {
  ok: true,
  codigo: "",
  resumen: EMPTY_TOTAL,
  resolutores: [],
};

function toNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeDashboard(data: DashboardApiResponse | DashboardApiResponse[] | null): DashboardApiResponse {
  const response = Array.isArray(data) ? data[0] : data;

  if (!response) return EMPTY_DASHBOARD;

  return {
    ...EMPTY_DASHBOARD,
    ...response,
    resumen: { ...EMPTY_TOTAL, ...response.resumen },
    resolutores: Array.isArray(response.resolutores) ? response.resolutores : [],
  };
}

function aggregateResolutores(resolutores: ResolutorDetalle[]): ResolutorDisponibilidadAgg[] {
  return resolutores
    .map((resolutor) => {
      const totalTickets = toNumber(resolutor.cantidad_sesiones);
      const minutosTotales = toNumber(resolutor.minutos_totales);

      return {
        nombre: resolutor.nombre || "(Sin resolutor)",
        correo: resolutor.correo || "",
        totalTickets,
        minutosPromedio: totalTickets ? minutosTotales / totalTickets : 0,
        minutosTotales,
        minutosNormales: toNumber(resolutor.minutos_normal),
        minutosNocturnos: toNumber(resolutor.minutos_nocturno),
        // La RPC agrupa dominicales y festivos en un solo campo.
        minutosDominicales: toNumber(resolutor.minutos_dominical_festivo),
        minutosFestivos: 0,
        minutos_nocturno_dominical_festivo: toNumber(resolutor.minutos_nocturno_dominical_festivo),
        sesionesActivas: toNumber(resolutor.sesiones_activas),
        sesionesPausadas: toNumber(resolutor.sesiones_pausadas),
        sesionesFinalizadas: toNumber(resolutor.sesiones_finalizadas),
      };
    })
    .sort((a, b) => b.totalTickets - a.totalTickets || a.nombre.localeCompare(b.nombre, "es"));
}

export function useDashboardDisponibilidad(_ticketsSvc: TicketsRepository) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [range, setRange] = React.useState<DateRange>(getXMonthsBackRange({ MonthQuantity: 1 }));
  const [selectedFuente, setSelectedFuente] = React.useState<string>("all");
  const [selectedResolutor, setSelectedResolutor] = React.useState<string>("all");
  const [selectedSemana, setSelectedSemana] = React.useState<string>("all");
  const [dashboard, setDashboard] = React.useState<DashboardApiResponse>(EMPTY_DASHBOARD);

  const loadDashboardDisponibilidad = React.useCallback(async (): Promise<Ticket[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("fn_obtener_dashboard_equipo", {
        p_inicio: range.from,
        p_fin: range.to,
      });

      if (rpcError) throw rpcError;

      setDashboard(normalizeDashboard(data as DashboardApiResponse | DashboardApiResponse[] | null));
      return [];
    } catch (caughtError: any) {
      setError(caughtError?.message ?? "Error al cargar metricas de disponibilidad");
      setDashboard(EMPTY_DASHBOARD);
      return [];
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  React.useEffect(() => {
    void loadDashboardDisponibilidad();
  }, [loadDashboardDisponibilidad]);

  const allResolutores = React.useMemo(
    () => aggregateResolutores(dashboard.resolutores),
    [dashboard]
  );

  const resolutores = React.useMemo(() => {
    if (selectedResolutor === "all") return allResolutores;

    return allResolutores.filter(
      (resolutor) => resolutor.correo === selectedResolutor || resolutor.nombre === selectedResolutor
    );
  }, [allResolutores, selectedResolutor]);

  const resumen = React.useMemo(() => {
    if (selectedResolutor === "all") return dashboard.resumen;

    return resolutores.reduce<TotalDashboard>((total, resolutor) => ({
      ...total,
      cantidad_sesiones: total.cantidad_sesiones + resolutor.totalTickets,
      minutos_totales: total.minutos_totales + resolutor.minutosTotales,
      minutos_normal: total.minutos_normal + resolutor.minutosNormales,
      minutos_nocturno: total.minutos_nocturno + resolutor.minutosNocturnos,
      minutos_dominical_festivo: total.minutos_dominical_festivo + resolutor.minutosDominicales,
    }), { ...EMPTY_TOTAL });
  }, [dashboard.resumen, resolutores, selectedResolutor]);

  const totalTickets = toNumber(resumen.cantidad_sesiones);
  const totalMinutos = toNumber(resumen.minutos_totales);
  const promedioMinutos = totalTickets ? totalMinutos / totalTickets : 0;

  const resolutorOptions = React.useMemo(
    () => allResolutores.map((item) => ({ label: item.nombre, value: item.correo || item.nombre })),
    [allResolutores]
  );

  const topResolutores = React.useMemo<TopCategoria[]>(
    () => resolutores.slice(0, 5).map((item) => ({ nombre: item.nombre, total: item.totalTickets })),
    [resolutores]
  );

  const resetFilters = React.useCallback(() => {
    setSelectedFuente("all");
    setSelectedResolutor("all");
    setSelectedSemana("all");
  }, []);

  return {
    loading,
    error,
    range,
    setRange,
    loadDashboardDisponibilidad,
    resetFilters,
    selectedFuente,
    setSelectedFuente,
    selectedResolutor,
    setSelectedResolutor,
    selectedSemana,
    setSelectedSemana,
    // La RPC es agregada y no devuelve el detalle de tickets.
    ticketsDisponibilidad: [] as Ticket[],
    totalTickets,
    totalMinutos,
    promedioMinutos,
    promedioHoras: promedioMinutos / 60,
    minutosNocturnos: toNumber(resumen.minutos_nocturno),
    minutosDominicales: toNumber(resumen.minutos_dominical_festivo),
    minutosFestivos: 0,
    resolutores,
    semanas: [] as SemanaDisponibilidad[],
    topResolutores,
    resolutorOptions,
    semanaOptions: [] as string[],
  };
}
