import { usePermisosNavegacion } from "../../../Funcionalidades/PermisosNavegacion";
import type { FilaPermisoNav } from "../../../Funcionalidades/PermisosNavegacion";
import "./PermisosNavegacion.css";

type Props = {
  onSubmit: (payload: Omit<FilaPermisoNav, "id">[]) => Promise<void> | void;
  jefeDefault?: string; // si quieres precargar “Practicante Listo”, etc.
};

const COLS = [
  { key: "youtube",    label: "YouTube" },
  { key: "facebook",   label: "Facebook" },
  { key: "twitter",    label: "Twitter" },
  { key: "instagram",  label: "Instagram" },
  { key: "whatsapp",   label: "WhatsApp" },
  { key: "wetransfer", label: "Wetransfer" },
  { key: "pinterest",  label: "Pinterest" },
  { key: "ganalytics", label: "Google\nAnalytics" },
  { key: "gdrive",     label: "Google\nDrive" },
] as const;

export default function PermisosNavegacion({ onSubmit, jefeDefault }: Props) {
  const { filas, sending, error, addFila, removeFila, setText, toggle, submit } =
    usePermisosNavegacion(async (payload) => {
      // aplica jefe por defecto si viene
      const mapped = jefeDefault
        ? payload.map(p => ({ ...p, autoriza: p.autoriza || jefeDefault }))
        : payload;
      await onSubmit(mapped);
    });

  return (
    <section className="pn-scope">
      <form className="pn-card" onSubmit={submit} noValidate>
        <h2 className="pn-title">Permisos de navegación</h2>

        <div className="pn-table" role="table">
          <div className="pn-header" role="row">
            <div className="pn-cell" role="columnheader">Empleado</div>
            <div className="pn-cell" role="columnheader">Jefe / Quien autoriza</div>
            {COLS.map(c => (
              <div key={c.key} className="pn-cell pn-cell--center" role="columnheader">
                {c.label.split("\n").map((l,i)=><span key={i} className="pn-nowrap">{l}</span>)}
              </div>
            ))}
            <div className="pn-cell" role="columnheader">Otro (Link de la página)</div>
            <div className="pn-cell pn-cell--acciones" role="columnheader"> </div>
          </div>

          {filas.map(f => (
            <div className="pn-row" role="row" key={f.id}>
              <div className="pn-cell" role="cell">
                <input
                  className="pn-input"
                  value={f.empleado}
                  onChange={(e) => setText(f.id, "empleado", e.target.value)}
                  placeholder=""
                />
              </div>

              <div className="pn-cell" role="cell">
                <input
                  className="pn-input"
                  value={f.autoriza}
                  onChange={(e) => setText(f.id, "autoriza", e.target.value)}
                  placeholder="Jefe / Quien autoriza"
                />
              </div>

              {COLS.map(c => (
                <div key={c.key} className="pn-cell pn-cell--center" role="cell">
                  <input
                    type="checkbox"
                    checked={Boolean(f[c.key])}
                    onChange={() => toggle(f.id, c.key)}
                  />
                </div>
              ))}

              <div className="pn-cell" role="cell">
                <input
                  className="pn-input"
                  value={f.otroUrl}
                  onChange={(e) => setText(f.id, "otroUrl", e.target.value)}
                  placeholder="https://…"
                />
              </div>

              <div className="pn-cell pn-cell--acciones" role="cell">
                <button
                  type="button"
                  className="pn-btn pn-btn--ghost"
                  onClick={() => removeFila(f.id)}
                  disabled={filas.length === 1}
                  title={filas.length === 1 ? "Debe quedar al menos una fila" : "Eliminar fila"}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <div className="pn-error">{error}</div>}

        <div className="pn-actions">
          <button type="button" className="pn-btn" onClick={addFila}>Agregar fila</button>
          <button type="submit" className="pn-btn pn-btn--primary" disabled={sending}>
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>
    </section>
  );
}
