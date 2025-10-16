import { useCallback, useMemo, useState, useId } from "react";
import type { ChangeEvent, FormEvent } from "react";
import "./TareasForm.css";
import type { NuevaTarea } from "../../../Models/Tareas";

export interface FormTareaProps {
  onAgregar: (t: NuevaTarea) => void;
}

const ESTADOS: NuevaTarea["estado"][] = ["Pendiente", "Iniciada", "Finalizada"];

export default function FormTarea({ onAgregar }: FormTareaProps) {
  const [form, setForm] = useState<NuevaTarea>({
    titulo: "",
    solicitante: "",
    responsable: "",
    fecha: "",
    hora: "",
    estado: "Pendiente",
  });

  // IDs accesibles y únicos
  const uid = useId();
  const ids = useMemo(
    () => ({
      titulo: `${uid}-titulo`,
      solicitante: `${uid}-solicitante`,
      responsable: `${uid}-responsable`,
      fecha: `${uid}-fecha`,
      hora: `${uid}-hora`,
      estado: `${uid}-estado`,
    }),
    [uid]
  );

  const onChange =
    <K extends keyof NuevaTarea>(k: K) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value as NuevaTarea[K] }));
    };

  const limpiar = useCallback(() => {
    setForm({
      titulo: "",
      solicitante: "",
      responsable: "",
      fecha: "",
      hora: "",
      estado: "Pendiente",
    });
  }, []);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    onAgregar(form);
    limpiar();
  };

  const disabled = form.titulo.trim().length === 0;

  return (
    <section className="ft-scope ft-card" role="region" aria-labelledby="ft_title">
      <h2 id="ft_title" className="ft-title">Nueva Tarea</h2>

      <form className="ft-form" onSubmit={submit} onReset={limpiar} noValidate>
        <label className="ft-field" htmlFor={ids.titulo}>
          <span>Asunto *</span>
          <input id={ids.titulo}  name="titulo" value={form.titulo} onChange={onChange("titulo")} placeholder="Asunto de la tarea" autoComplete="off" required aria-required="true"/>
        </label>

        <label className="ft-field" htmlFor={ids.solicitante}>
          <span>Solicitante</span>
          <input
            id={ids.solicitante}
            name="solicitante"
            value={form.solicitante || ""}
            onChange={onChange("solicitante")}
            placeholder="Buscar solicitante"
            autoComplete="off"
          />
        </label>

        <label className="ft-field" htmlFor={ids.responsable}>
          <span>Responsable</span>
          <input
            id={ids.responsable}
            name="responsable"
            value={form.responsable || ""}
            onChange={onChange("responsable")}
            placeholder="Nombre del responsable"
            autoComplete="off"
          />
        </label>

        <div className="ft-grid-3">
          <label className="ft-field" htmlFor={ids.fecha}>
            <span>Fecha del evento</span>
            <input
              id={ids.fecha}
              name="fecha"
              type="date"
              value={form.fecha || ""}
              onChange={onChange("fecha")}
            />
          </label>

          <label className="ft-field" htmlFor={ids.hora}>
            <span>Hora</span>
            <input
              id={ids.hora}
              name="hora"
              type="time"
              value={form.hora || ""}
              onChange={onChange("hora")}
            />
          </label>

          <label className="ft-field" htmlFor={ids.estado}>
            <span>Estado</span>
            <select
              id={ids.estado}
              name="estado"
              value={form.estado || "Pendiente"}
              onChange={onChange("estado")}
            >
              {ESTADOS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="ft-actions">
          <button type="submit" className="ft-btn-primary" disabled={disabled} aria-disabled={disabled}>
            Guardar
          </button>
          <button type="reset" className="ft-btn-ghost">Limpiar</button>
        </div>
      </form>
    </section>
  );
}
