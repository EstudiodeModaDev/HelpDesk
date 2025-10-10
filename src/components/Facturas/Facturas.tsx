import React, { useEffect, useMemo, useState } from "react";
import "./Facturas.css";
import type { ItemBd } from "../../Models/Facturas";
import { useFacturas } from "../../Funcionalidades/Facturas";
import NewItemModal from "./NewItemModal/NewItemModal";

const NuevaFactura: React.FC<{ onSaved?: (id: string) => void }> = () => {
  const {state, submitting, proveedores, items, loadingData,  error, total, errors,
    setField, setState,  handleSubmit, setItems, addLinea, removeLinea, onChangeItem, onChangeCantidad, onChangeValorUnitario} = useFacturas();
  const [showNewItem, setShowNewItem] = useState(false);

  const nit = useMemo(() => proveedores.find((p) => p.Id === state.IdProveedor)?.Nit ?? "", [proveedores, state.IdProveedor]);

  //Cambio de nit
  useEffect(() => {
    if (nit !== state.nit) setField("nit", nit);
  }, [nit]);

  //Cambio de total
  useEffect(() => {
    if (total !== state.Total) setField("Total", Number(total.toFixed(2)));
  }, [total]);

  function handleNewItemCreated(item: ItemBd) {
    setItems((prev) => [item, ...prev]);
    // Selecciona el nuevo ítem en la última línea (si existe)
    setField(
      "lineas",
      (state.lineas ?? []).map((l, idx, arr) =>
        idx === arr.length - 1
          ? {
              ...l,
              itemId: item.Id,
              descripcion: item.NombreItem,
              valorUnitario: item.Valor,
              subtotal: item.Valor * (l.cantidad || 0),
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
      <form   onSubmit={(e) => {e.preventDefault(); handleSubmit(e)}} className="invoice-grid">
        {/* Fila compacta */}
        <div className="field">
          <label className="label">Fecha</label>
          <input type="date" value={state.FechaEmision || ""} onChange={(e) => setField("FechaEmision", e.target.value)} disabled={loadingData || submitting} className="control"/>
          {errors.FechaEmision && <small className="error">{errors.FechaEmision}</small>}
        </div>

        <div className="field">
          <label className="label">No. Factura</label>
          <input value={state.NoFactura || ""} onChange={(e) => setField("NoFactura", e.target.value)}  placeholder="Ej. F-2025-00123" disabled={loadingData || submitting} className="control"/>
          {errors.NoFactura && <small className="error">{errors.NoFactura}</small>}
        </div>

        <div className="field">
          <label className="label">Proveedor</label>
          <select value={state.IdProveedor || ""} onChange={(e) => setField("IdProveedor", e.target.value)} disabled={loadingData || submitting} className="control">
            <option value="">Seleccione proveedor</option>
            {proveedores.map((p) => (
              <option key={p.Id} value={p.Id}>{p.Title}</option>
            ))}
          </select>
          {errors.IdProveedor && <small className="error">{errors.IdProveedor}</small>}
        </div>

        <div className="field">
          <label className="label">NIT</label>
          <input value={nit} readOnly disabled className="control control--readonly" />
        </div>

        <div className="field">
          <label className="label">CO (Centro de costos)</label>
          <input value={state.CO || ""} onChange={(e) => {setField("CO", e.target.value);}} placeholder="Ej. 1234" disabled={loadingData || submitting} className="control"/>
          {errors.CO && <small className="error">{errors.CO}</small>}
        </div>

        {/* Ítems: ocupa todas las columnas */}
        <div className="col-span-full table-fluid">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Ítems</span>
            <button type="button" className="btn btn-sm"  onClick={addLinea} disabled={submitting || loadingData}>
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
                        <select value={l.Id} onChange={(e) => onChangeItem(l.tempId!, e.target.value)} disabled={submitting} className="select-compact bg-white">
                          <option value="">Seleccione</option>
                          {items.map((it) => (
                            <option key={it.Id} value={it.Title}>
                              {it.NombreItem}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-sm whitespace-nowrap" onClick={() => setShowNewItem(true)}  title="Registrar nuevo ítem">
                          Nuevo ítem
                        </button>
                      </div>
                    </td>

                    <td>
                      <input value={l.NombreItem ?? ""} className="input-compact bg-slate-100"/>
                    </td>

                    <td>
                      <input type="number" min={0} step="0.01" value={Number.isFinite(l.Valor) ? String(l.Valor) : "0"} onChange={(e) => onChangeValorUnitario(l.tempId!, Number(e.target.value))} className="input-compact"/>
                    </td>

                    <td>
                      <input type="number" min={1} step="1" value={Number.isFinite(l.cantidad) ? String(l.cantidad) : "1"} onChange={(e) => onChangeCantidad(l.tempId!, Math.max(1, Number(e.target.value)))}className="input-compact"/>
                    </td>

                    <td>
                      <input value={l.subtotal!.toFixed(2)} readOnly className="input-compact bg-slate-100" />
                    </td>

                    <td>
                      <button type="button" className="btn btn-sm" onClick={() => removeLinea(l.tempId!)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {errors.lineas && <small className="error">{errors.lineas}</small>}
              </tbody>

              <tfoot>
                <tr>
                  <td className="text-right font-semibold" colSpan={4}>Total</td>
                  <td colSpan={2}>
                    <input value={state.Total.toFixed(2)} readOnly className="input-compact bg-slate-100" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Acciones: ocupa todas las columnas */}
        <div className="col-span-full flex items-center justify-end gap-2 pt-2">
          <button type="reset" className="btn btn-sm" disabled={submitting} onClick={() => setState((s) => ({ ...s, lineas: [], total: 0 }))}>
            Limpiar
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || loadingData}>
            {submitting ? "Guardando..." : "Guardar factura"}
          </button>
        </div>
      </form>

      <NewItemModal
        open={showNewItem}
        onClose={() => setShowNewItem(false)}
        onCreated={handleNewItemCreated}
        //onCreateRequest={} 
      />
    </div>
  );
};

export default NuevaFactura;