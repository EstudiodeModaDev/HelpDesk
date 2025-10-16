import React from "react";
import type { GetAllOpts } from "../Models/Commons";
import type { TareasService } from "../Services/Tareas.service";
import type { FilterMode, Tarea } from "../Models/Tareas";

export function useTareas(TareaSvc: TareasService,) {
  const [rows, setRows] = React.useState<Tarea[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filterMode, setFilterMode] = React.useState<FilterMode>("Pendientes");

  // construir filtro OData
  const buildFilter = React.useCallback((): GetAllOpts => {
    const filters: string[] = [];

    if (filterMode === "Pendientes") {
      filters.push(`(fields/Estado eq 'Pendiente')`);
    } 

    return {
      filter: filters.join(" and "),
      orderby: "created desc"
    };
  }, [filterMode]); 

  // cargar primera página (o recargar)
  const loadTasks = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const items = await TareaSvc.getAll(buildFilter())
      setRows(items);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando tickets");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [TareaSvc, buildFilter]);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const reloadAll  = React.useCallback(() => { loadTasks(); }, [loadTasks]);
  return {
    // datos visibles (solo la página actual)
    rows,
    loading,
    error,
    // filtros
    setFilterMode,

    // acciones
    reloadAll,
  };
}


