import * as React from "react";
import { createPortal } from "react-dom";
import "./NewItemModa.css";
import type { ItemBd } from "../../../Models/Facturas";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (item: ItemBd) => void;
};

const NewItemModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [descripcion, setDescripcion] = React.useState("");
  const [valor, setValor] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);

  const disabled = !descripcion.trim() || Number.isNaN(Number(valor)) || Number(valor) <= 0;

  React.useEffect(() => {
    if (!open) return;
    // Bloquear scroll del body
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus al título (o al primer input)
    setTimeout(() => titleRef.current?.focus(), 0);
    // Escape para cerrar
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  async function handleSave() {
    try {
      setSaving(true);
      // Construir el ítem con tus datos reales
      const item: ItemBd = {
        Id: cryptoRandomId(),                 // opcional/temporal
        Title: descripcion.trim(),           // código si no tienes, usa la desc temporalmente
        NombreItem: descripcion.trim(),
        Valor: Number(valor)
      };
      onCreated(item);
      setDescripcion("");
      setValor("");
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Error creando el ítem");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const content = (
    <div className="newitem-overlay" role="dialog" aria-modal="true" aria-labelledby="new-item-title">
      {/* capa para click-outside */}
      <div className="newitem-clickguard" onClick={onClose} />
      <div className="newitem-card" onClick={(e) => e.stopPropagation()}>
        <h3 id="new-item-title" className="newitem-title" tabIndex={-1} ref={titleRef}>
          Nuevo ítem
        </h3>

        <div className="newitem-field">
          <label className="newitem-label">Descripción</label>
          <input
            className="newitem-input"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Empaque burbuja"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && !disabled && handleSave()}
          />
        </div>

        <div className="newitem-field">
          <label className="newitem-label">Valor unitario</label>
          <input
            className="newitem-input"
            type="number"
            min={0}
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0"
            onKeyDown={(e) => e.key === "Enter" && !disabled && handleSave()}
          />
        </div>

        <div className="newitem-footer">
          <button className="btn" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || disabled}>
            {saving ? "Guardando..." : "Guardar ítem"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default NewItemModal;

// Utilidad local si la necesitas:
function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2);
}
