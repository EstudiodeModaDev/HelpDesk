import type { FormStateActa, Propiedad, TipoUsuario } from "../../../../Models/ActasEntrega";
import { useActaEntrega } from "../../../../Funcionalidades/ActaEntrega";
import type { Ticket } from "../../../../Models/Tickets";
import { Toggle } from "../../../Toggle/Toggle";
import "./InfoActa.css"

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
export default function InfoActaEntrega({ ticket }: Props) {
  const {
    state, setField, items, toggleEntrega, handleSubmit, ITEMS_CON_TIPO_COMPUTADOR,
    errors, updateDetalle, selectedKeys
  } = useActaEntrega(ticket?.ID ?? "");

  const tipoActual = state.tipoUsuario || "Usuario administrativo";
  const opcionesTipoPC = TIPO_COMPUTADOR_OPTIONS[tipoActual as TipoUsuario] ?? ["Portátil", "Escritorio"];

  const mostrarTipoPC =
    items.some((i) => ITEMS_CON_TIPO_COMPUTADOR.has(i) && state.entregas[i]) && !!state.tipoUsuario;

  return (
    <form className="acta-form" onSubmit={handleSubmit}>
      <h1 className="acta-title">Nueva acta de entrega</h1>

      {/* … cabecera igual … */}

      {/* Selección dinámica */}
      <h2 className="acta-subtitle">¿Qué se le entrega?</h2>
      <div className="entregas-grid">
        {items.map((it) => (
          <div key={it} className="entrega-item">
            <Toggle checked={!!state.entregas[it]} onChange={(v) => toggleEntrega(it, v)} label={it} />
          </div>
        ))}
        {errors.entregas && <small className="error">{errors.entregas}</small>}

        {mostrarTipoPC && (
          <div className="entrega-item entrega-item--span2">
            <label className="acta-label-strong">Tipo de computador</label>
            <select
              className="acta-input"
              value={state.tipoComputador ?? ""}
              onChange={(e) => setField("tipoComputador", e.target.value as "Portátil" | "Escritorio" | "")}
            >
              <option value="">Seleccione…</option>
              {opcionesTipoPC.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.tipoComputador && <small className="error">{errors.tipoComputador}</small>}
          </div>
        )}
      </div>

      {/* ===== Galería estilo Power Apps ===== */}
      {selectedKeys.length > 0 && (
        <>
          <h2 className="acta-subtitle" style={{ marginTop: 24 }}>Detalles de los equipos seleccionados</h2>
          <div className="galeria-grid">
            {selectedKeys.map((key) => {
              const det = state.detalles[key];
              const proveedorDisabled = det.Propiedad !== "Alquilado";
              return (
                <div key={key} className="galeria-card">
                  <div className="galeria-header">{det.Elemento}</div>

                  <div className="galeria-row">
                    <label>Marca</label>
                    <input
                      className="acta-input"
                      value={det.Marca}
                      onChange={(e) => updateDetalle(key, { Marca: e.target.value })}
                    />
                  </div>

                  <div className="galeria-row">
                    <label>Referencia</label>
                    <input
                      className="acta-input"
                      value={det.Referencia}
                      onChange={(e) => updateDetalle(key, { Referencia: e.target.value })}
                    />
                  </div>

                  <div className="galeria-row">
                    <label>Serial</label>
                    <input
                      className="acta-input"
                      value={det.Serial}
                      onChange={(e) => updateDetalle(key, { Serial: e.target.value })}
                    />
                  </div>

                  <div className="galeria-row">
                    <label>Propiedad</label>
                    <select
                      className="acta-input"
                      value={det.Propiedad}
                      onChange={(e) => updateDetalle(key, { Propiedad: e.target.value as Propiedad })}
                    >
                      <option value="">Seleccione…</option>
                      <option value="Alquilado">Alquilado</option>
                      <option value="Propio">Propio</option>
                      <option value="Donación">Donación</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div className="galeria-row">
                    <label>Proveedor</label>
                    <input
                      className="acta-input"
                      value={proveedorDisabled ? "-" : det.Proveedor}
                      disabled={proveedorDisabled}
                      onChange={(e) => updateDetalle(key, { Proveedor: e.target.value })}
                    />
                  </div>

                  <div className="galeria-row">
                    <label>Descripción</label>
                    <input
                      className="acta-input"
                      value={det.Detalle}
                      onChange={(e) => updateDetalle(key, { Detalle: e.target.value })}
                    />
                  </div>

                  <div className="galeria-row">
                    <label>Prueba de funcionamiento</label>
                    <input
                      className="acta-input"
                      value={det.Prueba}
                      onChange={(e) => updateDetalle(key, { Prueba: e.target.value })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="acta-actions">
        <button type="submit" className="acta-primary">Siguiente</button>
      </div>
    </form>
  );
}
