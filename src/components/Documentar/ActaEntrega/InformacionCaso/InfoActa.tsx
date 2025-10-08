import type { FormStateActa, TipoUsuario } from "../../../../Models/ActasEntrega";
import { useActaEntrega } from "../../../../Funcionalidades/ActaEntrega";
import type { Ticket } from "../../../../Models/Tickets";
import { Toggle } from "../../../Toggle/Toggle";

type Props = {
  onSubmit?: (payload: any) => void;
  defaultValues?: Partial<FormStateActa>;
  ticket: Ticket
};

const TIPO_COMPUTADOR_OPTIONS: Record<TipoUsuario, Array<string>> = {
  "Usuario administrativo": ["Portátil Apple", "Escritorio, Apple"],
  "Usuario de diseño": ["Portátil Apple", "Escritorio Apple", "Portátil Windows", "Escritorio Windows"],
  "Tienda": ["Portátil Windows", "Escritorio Windows"],
};




/* ===== Componente principal ===== */
export default function InfoActaEntrega({ticket }: Props) {

    const {state, setField, items, toggleEntrega, handleSubmit, ITEMS_CON_TIPO_COMPUTADOR} = useActaEntrega(ticket?.ID ?? "");
    const tipoActual = state.tipoUsuario || "Usuario administrativo";
    const opcionesTipoPC = TIPO_COMPUTADOR_OPTIONS[tipoActual as TipoUsuario] ?? [
        "Portátil",
        "Escritorio",
    ];

  const mostrarTipoPC =
    items.some((i) => ITEMS_CON_TIPO_COMPUTADOR.has(i) && state.entregas[i]) && !!state.tipoUsuario;

  return (
    <form className="acta-form" onSubmit={handleSubmit}>
      <h1 className="acta-title">Nueva acta de entrega</h1>

      {/* Grid de cabecera */}
      <div className="acta-grid">
        <div className="acta-field">
          <label>Número de ticket</label>
          <input
            className="acta-input"
            value={state.numeroTicket}
            onChange={(e) => setField("numeroTicket", e.target.value)}
            placeholder=""
          />
        </div>

        <div className="acta-field">
          <label>*Sede de destino</label>
          <input
            className="acta-input"
            value={state.sedeDestino}
            onChange={(e) => setField("sedeDestino", e.target.value)}
          />
        </div>

        <div className="acta-field">
          <label>*Persona (Quien recibe)</label>
          <input
            className="acta-input"
            value={state.persona}
            onChange={(e) => setField("persona", e.target.value)}
          />
        </div>

        <div className="acta-field">
          <label>*Correo (Quien Recibe)</label>
          <input
            className="acta-input"
            type="email"
            value={state.correo}
            onChange={(e) => setField("correo", e.target.value)}
          />
        </div>

        <div className="acta-field">
          <label>*Número de cédula (Quien recibe)</label>
          <input
            className="acta-input"
            value={state.cedula}
            onChange={(e) => setField("cedula", e.target.value)}
          />
        </div>

        <div className="acta-field">
          <label>*Tipo de usuario</label>
          <select
            className="acta-input"
            value={state.tipoUsuario}
            onChange={(e) => setField("tipoUsuario", e.target.value as TipoUsuario)}
          >
            <option value="">Seleccione…</option>
            <option>Usuario administrativo</option>
            <option>Usuario de diseño</option>
            <option>Tienda nueva</option>
          </select>
        </div>

        <div className="acta-field">
          <label>*¿Estos equipos se enviarán?</label>
          <select
            className="acta-input"
            value={state.enviarEquipos}
            onChange={(e) => setField("enviarEquipos", e.target.value as string)}
          >
            <option value="">Seleccione…</option>
            <option value="No">No</option>
            <option value="Sí">Sí</option>
          </select>
        </div>
      </div>

      {/* Sección dinámica */}
      <h2 className="acta-subtitle">¿Qué se le entrega?</h2>

      <div className="entregas-grid">
        {items.map((it) => (
          <div key={it} className="entrega-item">
            <Toggle
              checked={!!state.entregas[it]}
              onChange={(v) => toggleEntrega(it, v)}
              label={it}
            />
          </div>
        ))}

        {/* Campo dependiente: Tipo de computador */}
        {mostrarTipoPC && (
          <div className="entrega-item entrega-item--span2">
            <label className="acta-label-strong">Tipo de computador</label>
            <select
              className="acta-input"
              value={state.tipoComputador ?? ""}
              onChange={(e) =>
                setField("tipoComputador", (e.target.value as "Portátil" | "Escritorio" | ""))
              }
            >
              <option value="">Seleccione…</option>
              {opcionesTipoPC.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="acta-actions">
        <button type="submit" className="acta-primary">Siguiente</button>
      </div>
    </form>
  );
}
