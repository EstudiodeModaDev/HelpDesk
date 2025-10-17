// src/components/Tareas/TareasPage.tsx
import { useState } from "react";
import FormTarea from "./TareasForm/TareasForm";
import type { NuevaTarea } from "../../Models/Tareas";
import ListaTareas from "../Tareas/TareasRegistradas/TareasRegistradas";
import type { Tarea } from "../../Models/Tareas";

export default function TareasPage() {

    //TODO: Cambiar a uso de API
  const [tareas, setTareas] = useState<Tarea[]>(() => []);

  const onAgregar = (t: NuevaTarea) => {
    const nueva: Tarea = {
      Id: crypto.randomUUID(),
      Title: t.titulo,
      Reportadapor: t.responsable ?? "—",
      Quienlasolicita: t.solicitante ?? "—",
      Fechadesolicitud: `${t.fecha ?? ""} ${t.hora ?? ""}`.trim(),
      Estado: t.estado ?? "Pendiente",
      Cantidaddediasalarma: "2",
      ReportadaporCorreo: "",
      Fechadelanota: ""
    };
    setTareas((prev) => [nueva, ...prev]);
    console.log(tareas)
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "min(520px, 38vw) 1fr",
        gap: 24,
        alignItems: "start",
        padding: 16,
      }}
    >
      <FormTarea onAgregar={onAgregar} />
      <ListaTareas/>
    </div>
  );
}
