// src/components/Formatos/ServiciosTI/ServiciosTI.tsx
import { useSolicitudUsuarioForm } from "../../../Funcionalidades/Formatos";
import type { ServicioPrograma } from "../../../Models/Formatos";
import type { SolicitudUsuario } from "../../../Funcionalidades/Formatos";
import "./ServiciosTI.css";

const SERVICIOS: ServicioPrograma[] = [
  "ERP",
  "Sistema de pedidos",
  "AdminPOS",
  "POS Principal",
  "Correo",
  "Office",
  "Impresoras",
  "Generic Transfer",
];

type Props = {
  onSubmit: (payload: SolicitudUsuario) => Promise<void> | void;
  ciudades?: string[];
};

export default function SolicitudUsuarioForm({onSubmit, ciudades = ["Medellín", "Bogotá", "Cali", "Barranquilla", "Otra"],}: Props) {
  const {form, sending, error, requiredOk,
    onChange, onToggleServicio, submit,} = useSolicitudUsuarioForm(onSubmit);

  return (
    <section className="su-scope su-card" role="region" aria-labelledby="su_titulo">
      <form className="su-form" onSubmit={submit} noValidate>

        {error && <div className="su-error">{error}</div>}

        {/* ===== Columna izquierda ===== */}
        <div className="su-left">
          <h2 className="su-title">Información del usuario</h2>
          <div className="su-field">
            <label>* Contratación:</label>
            <select value={form.contratacion} onChange={onChange("contratacion")} required>
              <option value="">Seleccione...</option>
              <option value="Directo">Reemplazo</option>
              <option value="Cargo nuevo">Cargo nuevo</option>
              <option value="Temporal">Temporal</option>
            </select>
          </div>

          <div className="su-field">
            <label>* Nombre del usuario:</label>
            <input type="text" value={form.nombre} onChange={onChange("nombre")} required/>
          </div>

          <div className="su-field">
            <label>* Apellido del usuario:</label>
            <input type="text" value={form.apellido} onChange={onChange("apellido")} required/>
          </div>

          <div className="su-field">
            <label>* No. Cédula del usuario:</label>
            <input type="text" inputMode="numeric" value={form.cedula} onChange={onChange("cedula")} required/>
          </div>

          <div className="su-field">
            <label>No. de contacto del usuario:</label>
            <input type="text" inputMode="tel" value={form.contacto} onChange={onChange("contacto")} placeholder="Celular/Teléfono"/>
          </div>

          <div className="su-field">
            <label>* Cargo del usuario:</label>
            <input type="text" value={form.cargo} onChange={onChange("cargo")} required/>
          </div>

          <div className="su-field">
            <label>* Dirección del usuario:</label>
            <input type="text" value={form.direccion} onChange={onChange("direccion")} required/>
          </div>

          <div className="su-field">
            <label>* Gerencia del usuario:</label>
            <input type="text" value={form.gerencia} onChange={onChange("gerencia")} required/>
          </div>

          <div className="su-field">
            <label>* Jefatura del usuario:</label>
            <input type="text" value={form.jefatura} onChange={onChange("jefatura")} required/>
          </div>

          <div className="su-field">
            <label>* Centro de costos del usuario:</label>
            <input type="text" inputMode="numeric" value={form.centroCostos} onChange={onChange("centroCostos")} required/>
          </div>

          <div className="su-field">
            <label>* Centro operativo del usuario:</label>
            <input type="text" inputMode="numeric" value={form.centroOperativo} onChange={onChange("centroOperativo")} required/>
          </div>
        </div>

        {/* ===== Columna derecha ===== */}
        <div className="su-right">
          <div className="su-field">
            <label>* Ciudad del usuario:</label>
            <select value={form.ciudad} onChange={onChange("ciudad")} required>
              <option value="">Seleccione…</option>
              {ciudades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="su-field">
            <label>* Fecha de ingreso:</label>
            <input type="date" value={form.fechaIngreso} onChange={onChange("fechaIngreso")} required/>
          </div>

          <h3 className="su-subtitle">Servicios y programas</h3>

          <div className="su-field su-field--tipo-equipo">
            <label>* Tipo de equipo:</label>
            <select value={form.tipoEquipo} onChange={onChange("tipoEquipo")} required>
              <option value="">Seleccione…</option>
              <option value="Escritorio">Escritorio</option>
              <option value="Portátil">Portátil</option>
              <option value="MAC">MAC</option>
              <option value="N/A">N/A</option>
            </select>
          </div>

          <div className="su-checks">
            {SERVICIOS.map((s) => (
              <label key={s} className="su-check">
                <input type="checkbox" checked={form.servicios.includes(s)} onChange={onToggleServicio(s)}/>
                <span>{s}</span>
              </label>
            ))}
          </div>

          <div className="su-field su-field--extension">
            <label>* Extensión telefónica:</label>
            <select value={form.extensionTelefonica} onChange={onChange("extensionTelefonica")} required>
              <option value="No aplica">No aplica</option>
              <option value="Extensión fija">Extensión fija</option>
              <option value="Extensión IP">Extensión IP</option>
              <option value="Solicitud nueva">Solicitud nueva</option>
              <option value="Traslado">Traslado</option>
            </select>
          </div>

          <div className="su-field su-field--obs">
            <label>Observaciones:</label>
            <textarea rows={6} value={form.observaciones} onChange={onChange("observaciones")} placeholder="Detalles adicionales…"/>
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div className="su-actions">
          <button
            className="su-btn su-btn--primary"
            type="submit"
            disabled={!requiredOk || sending}
          >
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>
    </section>
  );
}
