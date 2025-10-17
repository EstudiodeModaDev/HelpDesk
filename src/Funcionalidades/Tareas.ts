import React from "react";
//import type { GetAllOpts } from "../Models/Commons";
import type { TareasService } from "../Services/Tareas.service";
import type {  FilterMode, NuevaTarea, Tarea, TareasError } from "../Models/Tareas";
import type { GetAllOpts } from "../Models/Commons";
import { useAuth } from "../auth/authContext";

export function useTareas(TareaSvc: TareasService) {
  const [rows, setRows] = React.useState<Tarea[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filterMode, setFilterMode] = React.useState<FilterMode>("Pendientes");
  const [state, setState] = React.useState<NuevaTarea>({
    diasRecordatorio: 2,
    titulo: "",
    fecha: "",
    hora: "",
    solicitante: null
  })
  const [errors, setErrors] = React.useState<TareasError>({});
  const { account } = useAuth();

  const buildFilter = React.useCallback((): GetAllOpts => {
    const f: string[] = [];
    const q = (s: string) => s.replace(/'/g, "''"); // escape OData

    if (filterMode === "Pendientes") {
      f.push(`fields/Estado eq '${q("Pendiente")}'`);
    } else if (filterMode === "Iniciadas") {
      f.push(`fields/Estado eq '${q("Iniciada")}'`); // ajusta al valor real
    } else if (filterMode === "Finalizadas") {
      f.push(`startswith(fields/Estado,'${q("Finalizada")}')`);
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
  }, [TareaSvc, buildFilter]); 

  const setField = <K extends keyof NuevaTarea>(k: K, v: NuevaTarea[K]) => setState((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const e: TareasError = {};
    if (!state.fecha) e.fecha = "Requerida";
    if (!state.fecha || !state.hora){e.fecha = "Requerida"; e.hora = "Requerida"}
    if (!state.solicitante) e.solicitante = "Requerido";
    if (!state.titulo) e.titulo = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
        const fechaCompleta = new Date(`${state.fecha}T${state.hora}`).toISOString()
        console.log(fechaCompleta);

        const payload= {
            Cantidaddediasalarma: state.diasRecordatorio,
            Estado: "Pendiente",
            Quienlasolicita: state.solicitante?.label ?? "",
            Reportadapor: account?.name ?? "",
            ReportadaporCorreo: state.solicitante?.value ?? "",
            Title: state.titulo,
            Fechadelanota: fechaCompleta,
            Fechadesolicitud: new Date().toISOString()
        };

        const tareaCreated = await TareaSvc?.create(payload);
        console.log(tareaCreated);
        alert("El recordatorio ha sido agendado");
        loadTasks()
    } catch (err) {
      console.error("Error en handleSubmit:", err);
    } 
  };

  const deleteTask = React.useCallback(async (Id: string) => {
    try {

        const tareaDeleted = await TareaSvc.delete(Id);
        console.log(tareaDeleted);
        alert("El recordatorio se ha eliminado con éxito");
        loadTasks()
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      alert("Ha ocurrido un error al eliminar el recordatorio");
    } 
  }, [TareaSvc, buildFilter]); 

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]); 

  const reloadAll = React.useCallback(() => { loadTasks(); }, [loadTasks]);

  return { rows, loading, error, filterMode, errors, state, setFilterMode, reloadAll, setField, handleSubmit, deleteTask};
}



