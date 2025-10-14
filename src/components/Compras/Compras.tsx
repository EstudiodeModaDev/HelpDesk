import * as React from "react";
import type { CargarA, CO, comprasState, Opcion, TipoCompra } from "../../Models/Compras";
import "./CompraFormulario.css"; // <-- importa el CSS de abajo

const CO_OPTS: CO[] = [
  { value: "Operaciones", code: "1001" },
  { value: "Logística",  code: "1002" },
  { value: "TI",         code: "1003" },
];

const UN_OPTS: Opcion[] = [
  { value: "UND", label: "UND" },
  { value: "PAR", label: "PAR" },
  { value: "CJ",  label: "CJ"  },
];

const CCOSTO_OPTS: CO[] = [
  { value: "C001", code: "C001 - Comercial" },
  { value: "C002", code: "C002 - Operativo" },
  { value: "C003", code: "C003 - Administrativo" },
];

const MARCAS = ["MFG", "DIESL", "PILATOS", "SUPERDRY", "KIPLING", "BROKEN CHAINS"] as const;
type Marca = typeof MARCAS[number];
const zeroMarcas = (): Record<Marca, number> =>
  MARCAS.reduce((acc, m) => { acc[m] = 0; return acc; }, {} as Record<Marca, number>);

type Props = { onSubmit?: (payload: comprasState) => void; initial?: Partial<comprasState>; };

export default function CompraFormulario({ onSubmit, initial }: Props) {
  const [state, setState] = React.useState<comprasState>({
    tipoCompra: "Producto",
    productoServicio: "",
    solicitadoPor: "",
    fechaSolicitud: "",
    dispositivo: "",
    co: "",
    un: "",
    ccosto: "",
    cargarA: "CO",
    noCO: "",
    pesoTotal: undefined,
    marcasPct: { ...zeroMarcas() },
    ...initial,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const totalPct = React.useMemo(
    () => state.cargarA === "Marca"
      ? (Object.values(state.marcasPct).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) || 0)
      : 0,
    [state.cargarA, state.marcasPct]
  );

  function setField<K extends keyof comprasState>(k: K, v: comprasState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }
  function setMarcaPct(m: Marca, v: number) {
    setState((s) => ({ ...s, marcasPct: { ...s.marcasPct, [m]: v } }));
  }
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!state.productoServicio.trim()) e.productoServicio = "Requerido.";
    if (!state.solicitadoPor.trim()) e.solicitadoPor = "Requerido.";
    if (!state.fechaSolicitud) e.fechaSolicitud = "Requerido.";
    if (!state.co) e.co = "Seleccione CO.";
    if (!state.un) e.un = "Seleccione UN.";
    if (!state.ccosto) e.ccosto = "Seleccione C. Costo.";
    if (state.cargarA === "Marca" && totalPct !== 100) e.marcasPct = "El total de porcentajes debe ser 100%.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.(state);
  }
  React.useEffect(() => {
    if (state.cargarA === "CO") setState((s) => ({ ...s, marcasPct: { ...zeroMarcas() } }));
  }, [state.cargarA]);

  const valorCargarACo = React.useMemo(
    () => CO_OPTS.find((o) => o.value === state.co)?.value ?? "",
    [state.co]
  );

  return (
    <div className="compra-form white-silo compra-wrap" data-darkreader-ignore>
      <form className="form-grid" onSubmit={handleSubmit}>
        {/* Fila 1 */}
        <div className="field">
          <label className="label">Tipo</label>
          <select className="control" value={state.tipoCompra}
                  onChange={(e) => setField("tipoCompra", e.target.value as TipoCompra)}>
            <option value="Producto">Producto</option>
            <option value="Servicio">Servicio</option>
            <option value="Alquiler">Alquiler</option>
          </select>
        </div>

        <div className="field">
          <label className="label">
            {state.tipoCompra === "Producto" ? "Producto" :
             state.tipoCompra === "Servicio" ? "Servicio" : "Alquiler"}
          </label>
          <input className="control" value={state.productoServicio}
                 onChange={(e) => setField("productoServicio", e.target.value)}
                 placeholder={`Nombre de ${state.tipoCompra.toLowerCase()}`} />
          {errors.productoServicio && <small className="error">{errors.productoServicio}</small>}
        </div>

        <div className="field">
          <label className="label">Solicitado por</label>
          <input className="control" value={state.solicitadoPor}
                 onChange={(e) => setField("solicitadoPor", e.target.value)}
                 placeholder="Nombre completo" />
          {errors.solicitadoPor && <small className="error">{errors.solicitadoPor}</small>}
        </div>

        <div className="field">
          <label className="label">Fecha de solicitud</label>
          <input type="date" className="control" value={state.fechaSolicitud}
                 onChange={(e) => setField("fechaSolicitud", e.target.value)} />
          {errors.fechaSolicitud && <small className="error">{errors.fechaSolicitud}</small>}
        </div>

        {/* Fila 2 */}
        <div className="field">
          <label className="label">Dispositivo</label>
          <input className="control" value={state.dispositivo}
                 onChange={(e) => setField("dispositivo", e.target.value)}
                 placeholder="(Opcional)" />
        </div>

        <div className="field">
          <label className="label">CO</label>
          <select className="control" value={state.co}
                  onChange={(e) => setField("co", e.target.value)}>
            <option value="">Seleccione CO</option>
            {CO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.value}</option>)}
          </select>
          {errors.co && <small className="error">{errors.co}</small>}
        </div>

        <div className="field">
          <label className="label">UN</label>
          <select className="control" value={state.un}
                  onChange={(e) => setField("un", e.target.value)}>
            <option value="">Seleccione UN</option>
            {UN_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {errors.un && <small className="error">{errors.un}</small>}
        </div>

        <div className="field">
          <label className="label">C. Costo</label>
          <select className="control" value={state.ccosto}
                  onChange={(e) => setField("ccosto", e.target.value)}>
            <option value="">Seleccione C. Costo</option>
            {CCOSTO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.value}</option>)}
          </select>
          {errors.ccosto && <small className="error">{errors.ccosto}</small>}
        </div>

        {/* Fila 3: Cargar a */}
        <div className="field">
          <label className="label">Cargar a</label>
          <select className="control" value={state.cargarA}
                  onChange={(e) => setField("cargarA", e.target.value as CargarA)}>
            <option value="CO">CO</option>
            <option value="Marca">Marca</option>
          </select>
        </div>

        {state.cargarA === "CO" ? (
          <div className="field">
            <label className="label">Valor a cargar (CO)</label>
            <input className="control control--readonly" readOnly value={valorCargarACo} />
          </div>
        ) : (
          <div className="col-span-full">
            <div className="box">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Distribución por Marca (%)</span>
                <span className="text-sm">Total: <b>{totalPct}%</b></span>
              </div>
              <div className="brands-grid">
                {MARCAS.map((m) => (
                  <div key={m} className="field">
                    <label className="label">{m}</label>
                    <input type="number" min={0} max={100} step="1" className="control"
                           value={state.marcasPct[m]}
                           onChange={(e) =>
                             setMarcaPct(m, Math.max(0, Math.min(100, Number(e.target.value))))} />
                  </div>
                ))}
              </div>
              {errors.marcasPct && <small className="error">{errors.marcasPct}</small>}
            </div>
          </div>
        )}

        {/* Fila 4 */}
        <div className="field">
          <label className="label">No. CO</label>
          <input className="control" value={state.noCO}
                 onChange={(e) => setField("noCO", e.target.value)}
                 placeholder="Ej. 12345" />
        </div>

        <div className="field">
          <label className="label">Peso (opcional)</label>
          <input type="number" step="0.01" className="control"
                 value={state.pesoTotal ?? ""}
                 onChange={(e) => {
                   const v = e.target.value;
                   setField("pesoTotal", v === "" ? undefined : Number(v));
                 }}
                 placeholder="Kg" />
        </div>

        {/* Acciones */}
        <div className="col-span-full flex items-center justify-end gap-2 pt-2">
          <button type="reset" className="btn btn-sm"
                  onClick={() => setState((s) => ({
                    ...s,
                    productoServicio: "",
                    solicitadoPor: "",
                    fechaSolicitud: "",
                    dispositivo: "",
                    noCO: "",
                    pesoTotal: undefined,
                    marcasPct: { ...zeroMarcas() },
                  }))}>
            Limpiar
          </button>
          <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
        </div>
      </form>
    </div>
  );
}
