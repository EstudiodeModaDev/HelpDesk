import * as React from "react";
import type { DateRange } from "../../Models/Filtros";
import { supabase } from "../../Services/Supabase.service";

export type TurnoDisponibilidad = {
  id: string;
  inicio: string;
  fin: string;
  minutos: number;
};

type DisponibilidadTeamsResponse = {
  ok: boolean;
  error?: string;
  minutosProgramados?: number;
  turnos?: TurnoDisponibilidad[];
};

type UseDisponibilidadTeamsParams = {
  correo?: string | null;
  range: DateRange;
};

export function useDisponibilidadTeams({ correo, range }: UseDisponibilidadTeamsParams) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [turnos, setTurnos] = React.useState<TurnoDisponibilidad[]>([]);
  const [minutosProgramados, setMinutosProgramados] = React.useState(0);

  const loadDisponibilidad = React.useCallback(async () => {
    if (!correo) {
      setTurnos([]);
      setMinutosProgramados(0);
      setError("El resolutor no tiene correo configurado.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<DisponibilidadTeamsResponse>(
        "obtener-disponibilidad-teams",
        { body: { correo, inicio: range.from, fin: range.to } },
      );

      if (invokeError) throw invokeError;
      if (!data?.ok) throw new Error(data?.error ?? "No fue posible obtener los turnos de Teams.");

      setTurnos(Array.isArray(data.turnos) ? data.turnos : []);
      setMinutosProgramados(Number(data.minutosProgramados ?? 0));
    } catch (caughtError) {
      setTurnos([]);
      setMinutosProgramados(0);
      setError(caughtError instanceof Error ? caughtError.message : "No fue posible obtener los turnos de Teams.");
    } finally {
      setLoading(false);
    }
  }, [correo, range.from, range.to]);

  React.useEffect(() => {
    void loadDisponibilidad();
  }, [loadDisponibilidad]);

  return {
    loading,
    error,
    turnos,
    minutosProgramados,
    horasProgramadas: minutosProgramados / 60,
    loadDisponibilidad,
  };
}
