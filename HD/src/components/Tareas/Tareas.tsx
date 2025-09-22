// src/components/Tareas/TareasPage.tsx
import { useMemo, useState } from "react";
import FormTarea from "./TareasForm/TareasForm";
import type { NuevaTarea } from "./TareasForm/TareasForm";
import ListaTareas from "./TareasRegistradas/TareasRegistradas";
import type { Tarea } from "./TareasRegistradas/TareasRegistradas";

export default function TareasPage() {

    //TODO: Cambiar a uso de API
  const [tareas, setTareas] = useState<Tarea[]>(() => [
    {
      id: "t-001",
      titulo: "Revisar actualización del tablero",
      responsable: "Practicante Listo",
      solicitante: "Cesar Eduardo Sanchez Salazar",
      fechaSolicitada: "2025-07-30 15:00",
      estado: "Pendiente",
    },
    {
      id: "t-002",
      titulo: "Apertura de Tienda Pilatos Nuestro Atlántico",
      responsable: "Juan David Chavarria Mesa",
      solicitante: "Natalia Alzate Osorio",
      fechaSolicitada: "2025-08-20 08:00",
      estado: "Pendiente",
    },
  ]);

  const onAgregar = (t: NuevaTarea) => {
    const nueva: Tarea = {
      id: crypto.randomUUID(),
      titulo: t.titulo,
      responsable: t.responsable ?? "—",
      solicitante: t.solicitante ?? "—",
      fechaSolicitada: `${t.fecha ?? ""} ${t.hora ?? ""}`.trim(),
      estado: t.estado ?? "Pendiente",
    };
    setTareas((prev) => [nueva, ...prev]);
  };

  const pendientes = useMemo(
    () => tareas.filter(t => t.estado?.toLowerCase() === "pendiente"),
    [tareas]
  );

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
      <ListaTareas tareas={pendientes} />
    </div>
  );
}
