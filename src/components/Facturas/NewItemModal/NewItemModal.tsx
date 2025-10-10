// src/components/Facturas/NewItemModal/NewItemModal.tsx
import * as React from "react";
import { createPortal } from "react-dom";
import "./NewItemModa.css";
import { useFacturas } from "../../../Funcionalidades/Facturas";
import type { ItemBd } from "../../../Models/Facturas";

type Props = {
  open: boolean;
  onClose: () => void;
 onCreated: (item: ItemBd) => void; 
};

const NewItemModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const {
    // ---- del hook (ya los tienes) ----
    Itemsstate,
    Itemserrors,
    error,
    submitting,
    setItemsField,
    handleSubmitItems,
    setError,
  } = useFacturas();

  const titleRef = React.useRef<HTMLHeadingElement | null>(null);

  // Bloquear scroll + Escape + focus
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

  // Envolvemos el submit para cerrar y notificar
  const onSubmit: React.FormEventHandler<HTMLFormElement> = async() => {
    const submited =await handleSubmitItems();
    const hadError = !!error;
    if (!hadError) {
      onCreated?.(submited);
      onClose();
    }
  };

  return createPortal(
    <div className="newitem-overlay" role="dialog" aria-modal="true" aria-labelledby="new-item-title">
      <div className="newitem-clickguard" onClick={onClose} />
      <div className="newitem-card" onClick={(e) => e.stopPropagation()}>
        <h3 id="new-item-title" className="newitem-title" tabIndex={-1} ref={titleRef}>
          Nuevo ítem
        </h3>

        {error && (
          <div className="alert" style={{ marginBottom: 10 }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="newitem-field">
            <label className="newitem-label">Código</label>
            <input
              className="newitem-input"
              value={Itemsstate.Title ?? ""}
              onChange={(e) => setItemsField("Title", e.target.value)}
              placeholder="Ej. A1"
              autoFocus
            />
            {Itemserrors.Title && <small className="error">{Itemserrors.Title}</small>}
          </div>

          <div className="newitem-field">
            <label className="newitem-label">Descripción</label>
            <input
              className="newitem-input"
              value={Itemsstate.NombreItem ?? ""}
              onChange={(e) => setItemsField("NombreItem", e.target.value)}
              placeholder="Ej. Empaque burbuja"
            />
            {Itemserrors.NombreItem && <small className="error">{Itemserrors.NombreItem}</small>}
          </div>

          <div className="newitem-field">
            <label className="newitem-label">Valor unitario</label>
            <input
              className="newitem-input"
              type="number"
              min={0}
              step="0.01"
              // OJO: Itemsstate.Valor es number (según tu hook). Mantenlo como number.
              value={Number.isFinite(Itemsstate.Valor as any) ? String(Itemsstate.Valor) : "0"}
              onChange={(e) => setItemsField("Valor", Number(e.target.value) || 0)}
              placeholder="0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !submitting) {
                  (e.currentTarget as HTMLInputElement).form?.requestSubmit();
                }
              }}
            />
            {Itemserrors.Valor && <small className="error">{Itemserrors.Valor}</small>}
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
              {submitting ? "Guardando..." : "Guardar ítem"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default NewItemModal;
