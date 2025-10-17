import "./TareasForm.css";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import type { TareasService } from "../../../Services/Tareas.service";
import { useTareas } from "../../../Funcionalidades/Tareas";

export default function FormTarea() {

  const {Tareas} = useGraphServices() as ReturnType<typeof useGraphServices> & { Tareas: TareasService;};
  const {handleSubmit, errors, setField, state} = useTareas(Tareas);

  return (
    <section className="ft-scope ft-card" role="region" aria-labelledby="ft_title">
      <h2 id="ft_title" className="ft-title">Nueva Tarea</h2>

      <form className="ft-form" onSubmit={handleSubmit} noValidate>
        {/* Asunto */}
        <label className="ft-field" htmlFor="titulo">Asunto *</label>
        <input id="titulo"  type="text" placeholder="Ingrese el asunto del recordatorio" value={state.titulo} onChange={(e) => setField("titulo", e.target.value)} autoComplete="off" required aria-required="true"/>
        {errors.titulo && <small className="error">{errors.titulo}</small>}

       {/* <label className="ft-field" htmlFor={ids.responsable}>
          <span>Responsable</span>
          <input id={ids.responsable} name="responsable" value={form.responsable || ""} onChange={onChange("responsable")} placeholder="Nombre del responsable" autoComplete="off"/>
        </label>

        <div className="ft-grid-3">
          <label className="ft-field" htmlFor={ids.fecha}>
            <span>Fecha del evento</span>
            <input id={ids.fecha} name="fecha" type="date" value={form.fecha || ""} onChange={onChange("fecha")}/>
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
        </div>*/}
      </form>
    </section>
  );
}
