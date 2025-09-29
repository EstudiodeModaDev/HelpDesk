// src/hooks/useTicketLogs.ts
import * as React from "react";
import type { GetAllOpts } from "../Models/Commons";
import type { LogService } from "../Services/Log.service";
import type { Log } from "../Models/Log";


export function useTicketLogs(LogSvc: LogService) {
  const [rows, setRows] = React.useState<Log[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentTicketId, setCurrentTicketId] = React.useState<string | null>(null);

  const buildFilter = React.useCallback((idTicket: string): GetAllOpts => {
    const filters: string[] = [`fields/Title eq '${idTicket.replace(/'/g, "''")}'`];

    return {
      filter: filters.join(" and "),
      orderby: "fields/Created asc", 
    };
  }, []);

  const loadFor = React.useCallback(async (idTicket: string) => {
    setLoading(true); setError(null);
    try {
      const { items } = await LogSvc.getAll(buildFilter(idTicket));
      const mapped: Log[] = items.map((it: any) => ({
        id: String(it.Id),
        autorNombre: it.fields?.Actor ?? "Sistema",
        fechaISO: normalizeToISO(it.fields?.Created),
        tipo: it.fields?.Tipo_de_accion ?? "seguimiento",
      }));
      setRows(mapped);
      setCurrentTicketId(idTicket);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando logs");
      setRows([]);
      setCurrentTicketId(idTicket);
    } finally {
      setLoading(false);
    }
  }, [LogSvc, buildFilter]);


  const reload = React.useCallback(() => {
    if (currentTicketId) void loadFor(currentTicketId);
  }, [currentTicketId, loadFor]);

  return {
    rows, loading, error,
    loadFor,   // ← llámalo al pulsar “Seguimiento ticket”
    reload,
    currentTicketId,
  };
}

// Normaliza a ISO; ajusta si tu backend entrega otro formato
function normalizeToISO(v: string | undefined): string {
  if (!v) return new Date(NaN).toString();
  // Si ya viene ISO, devuélvelo:
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v;
  // Si viene "DD/MM/YYYY HH:mm":
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (m) {
    const [, dd, mm, yyyy, HH, MM] = m;
    return `${yyyy}-${mm}-${dd}T${HH}:${MM}:00`;
  }
  return v; // déjalo pasar; Date lo intentará parsear
}
