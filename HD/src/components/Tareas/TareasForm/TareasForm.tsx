// src/components/Tareas/FormTarea.tsx
import "./TareasForm.css";
import { useState } from "react";

export type NuevaTarea = {
  titulo: string;
  solicitante?: string;
  responsable?: string;
  fecha?: string; // yyyy-mm-dd
  hora?: string;  // hh:mm
  estado?: "Pendiente" | "Iniciada" | "Finalizada";
};

export default function FormTarea(props: { onAgregar: (t: NuevaTarea) => void }) {
  const { onAgregar } = props;
  const [form, setForm] = useState<NuevaTarea>({
    titulo: "",
    solicitante: "",
    responsable: "",
    fecha: "",
    hora: "",
    estado: "Pendiente",
  });

  const onChange = (k: keyof NuevaTarea) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    onAgregar(form);
    setForm({ titulo: "", solicitante: "", responsable: "", fecha: "", hora: "", estado: "Pendiente" });
  };

  return (
    <section className="ft-card">
      <h2 className="ft-title">Nueva Tarea</h2>
      <form className="ft-form" onSubmit={submit}>
        <label className="ft-field">
          <span>Asunto *</span>
          <input value={form.titulo} onChange={onChange("titulo")} placeholder="Asunto de la tarea" />
        </label>

        <label className="ft-field">
          <span>Solicitante</span>
          <input value={form.solicitante} onChange={onChange("solicitante")} placeholder="Buscar solicitante" />
        </label>

        <label className="ft-field">
          <span>Responsable</span>
          <input value={form.responsable} onChange={onChange("responsable")} placeholder="Nombre del responsable" />
        </label>

        <div className="ft-grid-3">
          <label className="ft-field">
            <span>Fecha del evento</span>
            <input type="date" value={form.fecha} onChange={onChange("fecha")} />
          </label>
          <label className="ft-field">
            <span>Hora</span>
            <input type="time" value={form.hora} onChange={onChange("hora")} />
          </label>
          <label className="ft-field">
            <span>Estado</span>
            <select value={form.estado} onChange={onChange("estado")}>
              <option>Pendiente</option>
              <option>Iniciada</option>
              <option>Finalizada</option>
            </select>
          </label>
        </div>

        <div className="ft-actions">
          <button type="submit" className="ft-btn-primary">Guardar</button>
          <button type="button" className="ft-btn-ghost" onClick={() => setForm({ titulo: "", solicitante: "", responsable: "", fecha: "", hora: "", estado: "Pendiente" })}>Limpiar</button>
        </div>
      </form>
    </section>
  );
}
