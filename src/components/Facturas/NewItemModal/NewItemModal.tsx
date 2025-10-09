import * as React from "react";
import type { Item } from "../../../Models/Facturas";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (item: Item) => void;
  /** Creador inyectado (viene del hook/useFacturas o servicio real) */
 //onCreateRequest: (data: { descripcion: string; valor: number }) => Promise<Item>;
};

const NewItemModal: React.FC<Props> = ({ open, onClose, onCreated, /*onCreateRequest*/ }) => {
  const [descripcion, setDescripcion] = React.useState("");
  const [valor, setValor] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  const disabled = !descripcion.trim() || !Number(valor) || Number(valor) <= 0;

  async function handleSave() {
    try {
      setSaving(true);
      const item: Item = {descripcion: "", Identificador: "", valor: 0}//await onCreateRequest({ descripcion: descripcion.trim(), valor: Number(valor) });
      onCreated(item);            // notifica al padre
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

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-item-title"
    >
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
        <h3 id="new-item-title" className="text-lg font-semibold mb-4">
          Nuevo ítem
        </h3>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Descripción</span>
            <input
              className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Empaque burbuja"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Valor unitario</span>
            <input
              className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              type="number"
              min={0}
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button className="px-3 py-2 rounded-lg border" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
              onClick={handleSave}
              disabled={saving || disabled}
            >
              {saving ? "Guardando..." : "Guardar ítem"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewItemModal;
