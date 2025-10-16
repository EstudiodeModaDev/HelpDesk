import React from "react";
//import type { GetAllOpts } from "../Models/Commons";
import type { TareasService } from "../Services/Tareas.service";
import type {  FilterMode, Tarea } from "../Models/Tareas";
import type { GetAllOpts } from "../Models/Commons";

export function useTareas(TareaSvc: TareasService) {
  const [rows, setRows] = React.useState<Tarea[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filterMode, setFilterMode] = React.useState<FilterMode>("Pendientes");

  const buildFilter = React.useCallback((): GetAllOpts => {
    const f: string[] = [];
    const q = (s: string) => s.replace(/'/g, "''"); // escape OData

    if (filterMode === "Pendientes") {
      f.push(`fields/Estado eq '${q("Pendiente")}'`);
    } else if (filterMode === "Iniciadas") {
      f.push(`fields/Estado eq '${q("Iniciada")}'`); // ajusta al valor real
    } else if (filterMode === "Finalizadas") {
      f.push(`startswith(fields/Estado,'${q("Terminada")}')`);
    }

    return {
      filter: f.join(" and "),
      orderby: "createdDateTime desc",
      top: 1000,
    };
  }, [filterMode]); // <-- depende del filtro

  const loadTasks = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const items = await TareaSvc.getAll(buildFilter()); // usa SIEMPRE el filtro vigente
      setRows(items);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando tareas"); // wording
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [TareaSvc, buildFilter]); // <-- depende de buildFilter

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]); // se ejecuta al montar y cada vez que cambie el filtro

  const reloadAll = React.useCallback(() => { loadTasks(); }, [loadTasks]);

  return { rows, loading, error, filterMode, setFilterMode, reloadAll };
}



