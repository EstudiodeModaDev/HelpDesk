import * as React from "react";
import { createPortal } from "react-dom";
import "./NewProveedor.css";
import { useFacturas } from "../../../Funcionalidades/Facturas";
import type { Proveedor } from "../../../Models/Facturas";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (proveedor: Proveedor) => void;
};

const NewProveedorModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const {
    handleSubmitProveedor,     // <- debe devolver el Proveedor creado o lanzar error
    ProveedorState,
    setProveedoresField,
    ProveedorError,
    setError,
    submitting,
    error,
  } = useFacturas();

  const titleRef = React.useRef<HTMLHeadingElement | null>(null);

  // Accesibilidad + bloqueo scroll
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => titleRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    try {
      const created = await handleSubmitProveedor(); // <- asume que retorna Proveedor
      if (created) {
        onCreated(created as Proveedor);
        onClose();
      }
    } catch (err) {
      // Si tu hook ya setea `error`, no es necesario hacer más aquí.
      // Puedes loguear si quieres:
      // console.error(err);
    }
  };

  return createPortal(
    <div
      className="newitem-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-proveedor-title"
    >
      <div className="newitem-clickguard" onClick={onClose} />
      <div className="newitem-card" onClick={(e) => e.stopPropagation()}>
        <h3
          id="new-proveedor-title"
          className="newitem-title"
          tabIndex={-1}
          ref={titleRef}
        >
          Nuevo proveedor
        </h3>

        {/* Muestra error general si existe */}
        {!!error && <div className="alert" role="alert">{String(error)}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="newitem-field">
            <label className="newitem-label">Nombre</label>
            <input
              className="newitem-input"
              value={ProveedorState.Title ?? ""}
              onChange={(e) => setProveedoresField("Title", e.target.value)}
              placeholder="Estudio de Moda S.A.S"
              autoFocus
              disabled={submitting}
            />
            {ProveedorError.Title && (
              <small className="error">{ProveedorError.Title}</small>
            )}
          </div>

          <div className="newitem-field">
            <label className="newitem-label">NIT</label>
            <input
              className="newitem-input"
              value={ProveedorState.Nit ?? ""}
              onChange={(e) => setProveedoresField("Nit", e.target.value)}
              placeholder="Ej. 89009880"
              disabled={submitting}
            />
            {ProveedorError.Nit && (
              <small className="error">{ProveedorError.Nit}</small>
            )}
          </div>

          <div className="newitem-footer">
            <button
              type="button"
              className="btn"
              onClick={() => { setError(null); onClose(); }}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default NewProveedorModal;
