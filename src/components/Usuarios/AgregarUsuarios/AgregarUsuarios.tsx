import * as React from "react";
import "./NuevoUsuario.css";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import { useUsuarios } from "../../../Funcionalidades/Usuarios";

type Props = {
  onCancel: () => void;
  tipo: string;
  /** Renderizar como modal centrado con overlay */
  modal?: boolean;
  /** Control externo de abierto/cerrado (si lo necesitas) */
  open?: boolean; // si modal=true y no envías open, asumimos abierto
};

export default function NuevoTecnico({ onCancel, tipo, modal = true, open }: Props) {
  const { Usuarios } = useGraphServices();
  const { state, addUser, setField, submitting, errors } = useUsuarios(Usuarios);

  React.useEffect(() => { setField("Rol", tipo); }, [tipo]);

  const isOpen = modal ? (open ?? true) : true;
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!modal || !isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !submitting) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, isOpen, submitting, onCancel]);

  React.useEffect(() => {
    if (!modal || !isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [modal, isOpen]);

  const content = (
    <div className="nt-card" ref={cardRef} onClick={(e) => e.stopPropagation()}>
      <header className="nt-header">
        <h2 id="nt-title">Nuevo Técnico</h2>
      </header>

      <form className="nt-form" onSubmit={addUser} noValidate>
        <div className="nt-field">
          <label htmlFor="nt-nombre" className="nt-label">Nombre Completo</label>
          <input
            id="nt-nombre"
            className={`nt-input ${errors.Title ? "is-invalid" : ""}`}
            placeholder="Ingrese Nombre Completo"
            value={state.Title}
            onChange={(e) => setField("Title", e.target.value)}
            autoComplete="name"
          />
          {errors.Title && <p className="nt-error">{errors.Title}</p>}
        </div>

        <div className="nt-field">
          <label htmlFor="nt-correo" className="nt-label">Correo Electrónico</label>
          <input
            id="nt-correo"
            className={`nt-input ${errors.Correo ? "is-invalid" : ""}`}
            placeholder="nombre@estudiodemoda.com"
            value={state.Correo}
            onChange={(e) => setField("Correo", e.target.value)}
            inputMode="email"
            autoComplete="email"
          />
          {errors.Correo && <p className="nt-error">{errors.Correo}</p>}
        </div>

        <div className="nt-actions">
          <button type="button" className="nt-btn ghost" onClick={onCancel} disabled={submitting === true}>
            Cancelar
          </button>

          <button type="submit" className="nt-btn primary" disabled={submitting === true}>
            {submitting ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );

  // Modal en el MISMO componente
  if (modal) {
    if (!isOpen) return null;
    return (
      <div className="nt-overlay" role="dialog" aria-modal="true" aria-labelledby="nt-title" onClick={() => !submitting && onCancel()}>
        <div className="nt-modal">{content}</div>
      </div>
    );
  }

  return (
    <section className="users-page nt-scope" aria-label="Alta de técnico">
      {content}
    </section>
  );
}
