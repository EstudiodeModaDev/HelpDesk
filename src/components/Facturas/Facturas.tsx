import React, { useEffect, useMemo, useState } from "react";
import "./Facturas.css";
import type { InvoiceLine, Item, Proveedor } from "../../Models/Facturas";
import { useFacturas } from "../../Funcionalidades/Facturas";
import NewItemModal from "./NewItemModal/NewItemModa";

const NuevaFactura: React.FC<{ onSaved?: (id: string) => void }> = ({ onSaved }) => {
  const {state, setField, setState, submitting, cargarProveedores, cargarItems, crearItem, handleSubmit,} = useFacturas();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [showNewItem, setShowNewItem] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingData(true);
        const [pv, it] = await Promise.all([cargarProveedores(), cargarItems()]);
        setProveedores(pv);
        setItems(it);
      } catch (e: any) {
        setError(e?.message ?? "Error cargando datos");
      } finally {
        setLoadingData(false);
      }
    })();
  }, [cargarProveedores, cargarItems]);

  // NIT derivado del proveedor
  const nit = useMemo(
    () => proveedores.find((p) => p.id === state.proveedorId)?.nit ?? "",
    [proveedores, state.proveedorId]
  );
  useEffect(() => {
    if (nit !== state.nit) setField("nit", nit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nit]);

  // Total calculado
  const total = useMemo(
    () => (state.lineas ?? []).reduce((acc, l) => acc + l.subtotal, 0),
    [state.lineas]
  );
  useEffect(() => {
    if (total !== state.total) setField("total", Number(total.toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // ---- Líneas (con tempId consistente) ----
  function addLinea() {
    setField("lineas", [
      ...(state.lineas ?? []),
      {
        tempId: cryptoRandomId(),
        itemId: "",
        descripcion: undefined,
        valorUnitario: 0,
        cantidad: 1,
        subtotal: 0,
      } as InvoiceLine,
    ]);
  }

  function removeLinea(tempId: string) {
    setField("lineas", (state.lineas ?? []).filter((l) => l.tempId !== tempId));
  }

  function onChangeItem(tempId: string, itemId: string) {
    const it = items.find((i) => i.Identificador === itemId);
    setField(
      "lineas",
      (state.lineas ?? []).map((l) =>
        l.tempId === tempId
          ? {
              ...l,
              itemId,
              descripcion: it?.descripcion ?? "",
              valorUnitario: it?.valor ?? 0,
              subtotal: (it?.valor ?? 0) * (l.cantidad || 0),
            }
          : l
      )
    );
  }

  function onChangeCantidad(tempId: string, cantidad: number) {
    setField(
      "lineas",
      (state.lineas ?? []).map((l) =>
        l.tempId === tempId
          ? { ...l, cantidad, subtotal: (l.valorUnitario || 0) * (cantidad || 0) }
          : l
      )
    );
  }

  function onChangeValorUnitario(tempId: string, valorUnitario: number) {
    setField(
      "lineas",
      (state.lineas ?? []).map((l) =>
        l.tempId === tempId
          ? { ...l, valorUnitario, subtotal: (valorUnitario || 0) * (l.cantidad || 0) }
          : l
      )
    );
  }

  // ---- Submit
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await handleSubmit();
    if (!res) return;
    onSaved?.(res.id);
    setState((s) => ({
      ...s,
      numero: "",
      proveedorId: "",
      nit: "",
      co: "",
      centroCostos: "",
      lineas: [],
      total: 0,
    }));
    alert(`Factura guardada: ${res.id}`);
  }

  function handleNewItemCreated(item: Item) {
    setItems((prev) => [item, ...prev]);
    // Selecciona el nuevo ítem en la última línea (si existe)
    setField(
      "lineas",
      (state.lineas ?? []).map((l, idx, arr) =>
        idx === arr.length - 1
          ? {
              ...l,
              itemId: item.Identificador,
              descripcion: item.descripcion,
              valorUnitario: item.valor,
              subtotal: item.valor * (l.cantidad || 0),
            }
          : l
      )
    );
  }

  return (
    <div className="invoice-form max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Registro de facturas</h2>

      {error && <div className="alert mb-3">{error}</div>}

      {/* Grid compacto: 5 columnas en desktop */}
      <form onSubmit={onSubmit} className="invoice-grid">
        {/* Fila compacta */}
        <div className="field">
          <label className="label">Fecha</label>
          <input
            type="date"
            value={state.fecha || ""}
            onChange={(e) => setField("fecha", e.target.value)}
            disabled={loadingData || submitting}
            className="control"
          />
        </div>

        <div className="field">
          <label className="label">No. Factura</label>
          <input
            value={state.numero || ""}
            onChange={(e) => setField("numero", e.target.value)}
            placeholder="Ej. F-2025-00123"
            disabled={loadingData || submitting}
            className="control"
          />
        </div>

        <div className="field">
          <label className="label">Proveedor</label>
          <select
            value={state.proveedorId || ""}
            onChange={(e) => setField("proveedorId", e.target.value)}
            disabled={loadingData || submitting}
            className="control"
          >
            <option value="">Seleccione proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label">NIT</label>
          <input value={nit} readOnly disabled className="control control--readonly" />
        </div>

        <div className="field">
          <label className="label">CO (Centro de costos)</label>
          <input
            value={state.co || ""}
            onChange={(e) => {
              setField("co", e.target.value);
              setField("centroCostos", e.target.value);
            }}
            placeholder="Ej. 1234"
            disabled={loadingData || submitting}
            className="control"
          />
        </div>

        {/* Ítems: ocupa todas las columnas */}
        <div className="col-span-full table-fluid">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Ítems</span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={addLinea}
              disabled={submitting || loadingData}
            >
              + Agregar línea
            </button>
          </div>

          <div className="table-scroll">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Descripción</th>
                  <th>Valor unitario</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                  <th className="w-1">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(state.lineas ?? []).length === 0 && (
                  <tr>
                    <td className="muted text-center" colSpan={6}>
                      Sin líneas. Usa "Agregar línea" para comenzar.
                    </td>
                  </tr>
                )}

                {(state.lineas ?? []).map((l) => (
                  <tr key={l.tempId}>
                    <td>
                      <div className="flex gap-2">
                        <select
                          value={l.itemId}
                          onChange={(e) => onChangeItem(l.tempId, e.target.value)}
                          disabled={submitting}
                          className="select-compact bg-white"
                        >
                          <option value="">Seleccione</option>
                          {items.map((it) => (
                            <option key={it.Identificador} value={it.Identificador}>
                              {it.descripcion}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-sm whitespace-nowrap"
                          onClick={() => setShowNewItem(true)}
                          title="Registrar nuevo ítem"
                        >
                          Nuevo ítem
                        </button>
                      </div>
                    </td>

                    <td>
                      <input value={l.descripcion ?? ""} readOnly className="input-compact bg-slate-100" />
                    </td>

                    <td>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={Number.isFinite(l.valorUnitario) ? String(l.valorUnitario) : "0"}
                        onChange={(e) => onChangeValorUnitario(l.tempId, Number(e.target.value))}
                        className="input-compact"
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min={1}
                        step="1"
                        value={Number.isFinite(l.cantidad) ? String(l.cantidad) : "1"}
                        onChange={(e) => onChangeCantidad(l.tempId, Math.max(1, Number(e.target.value)))}
                        className="input-compact"
                      />
                    </td>

                    <td>
                      <input value={l.subtotal.toFixed(2)} readOnly className="input-compact bg-slate-100" />
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => removeLinea(l.tempId)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td className="text-right font-semibold" colSpan={4}>Total</td>
                  <td colSpan={2}>
                    <input value={state.total.toFixed(2)} readOnly className="input-compact bg-slate-100" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Acciones: ocupa todas las columnas */}
        <div className="col-span-full flex items-center justify-end gap-2 pt-2">
          <button
            type="reset"
            className="btn btn-sm"
            disabled={submitting}
            onClick={() => setState((s) => ({ ...s, lineas: [], total: 0 }))}
          >
            Limpiar
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={submitting || loadingData}
          >
            {submitting ? "Guardando..." : "Guardar factura"}
          </button>
        </div>
      </form>

      <NewItemModal
        open={showNewItem}
        onClose={() => setShowNewItem(false)}
        onCreated={handleNewItemCreated}
        onCreateRequest={crearItem}
      />
    </div>
  );
};

export default NuevaFactura;

// Utils
function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
