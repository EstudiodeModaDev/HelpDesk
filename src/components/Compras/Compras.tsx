import * as React from "react";
import Select, { components, type GroupBase } from "react-select";
import type { CargarA, comprasState, Opcion, TipoCompra } from "../../Models/Compras";
import type { UserOptionEx } from "../NuevoTicket/NuevoTicketForm";
import { useFranquicias } from "../../Funcionalidades/Franquicias";
import { useWorkers } from "../../Funcionalidades/Workers";
import { useCentroCostos, useCO } from "../../Funcionalidades/Compras";
import "./Compras.css";
import { useGraphServices } from "../../graph/GrapServicesContext";

const UN_OPTS: Opcion[] = [
  { value: "UND", label: "UND" },
  { value: "PAR", label: "PAR" },
  { value: "CJ",  label: "CJ"  },
];

const MARCAS = ["MFG", "DIESL", "PILATOS", "SUPERDRY", "KIPLING", "BROKEN CHAINS"] as const;
type Marca = typeof MARCAS[number];
const zeroMarcas = (): Record<Marca, number> =>
  MARCAS.reduce((acc, m) => { acc[m] = 0; return acc; }, {} as Record<Marca, number>);

/** --- Props --- */
type Props = {
  onSubmit?: (payload: comprasState) => void;
  initial?: Partial<comprasState>;
  submitting?: boolean;
};

/** --- Filtro simple para react-select --- */
function userFilter(option: { label: string; value: string }, rawInput: string): boolean {
  const q = rawInput.trim().toLowerCase();
  if (!q) return true;
  return option.label.toLowerCase().includes(q) || (option.value ?? "").toLowerCase().includes(q);
}

/** --- Opción custom para react-select (puedes decorarla más si quieres) --- */
const Option = (props: any) => (
  <components.Option {...props}>
    <span>{props.data.label}</span>
  </components.Option>
);

export default function CompraFormulario({
  onSubmit,
  initial,
  submitting = false,
}: Props) {

  const { Franquicias, CentroCostos, CentroOperativo } = useGraphServices();

  // Datos externos
  const { franqOptions, loading: loadingFranq, error: franqError } =
    useFranquicias(Franquicias as any);

  const { workersOptions, loadingWorkers, error: usersError } =
    useWorkers({ onlyEnabled: true, domainFilter: "estudiodemoda.com.co" });

  const { ccOptions, loading: loadingCC, error: ccError } =
    useCentroCostos(CentroCostos as any);

  const { COOptions, loading: loadingCO, error: coError } =
    useCO(CentroOperativo as any);

  // Estado del form
  const [state, setState] = React.useState<comprasState>({
    tipoCompra: "Producto",
    productoServicio: "",
    solicitadoPor: "",
    fechaSolicitud: new Date().toISOString().slice(0, 10),
    dispositivo: "",
    co: "",         // <- guardamos el value del CO (string)
    un: "",
    ccosto: "",     // <- guardamos el value del C. Costo (string)
    cargarA: "CO",
    noCO: "",
    marcasPct: { ...zeroMarcas() },
    ...initial,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  /** Merge solicitantes (workers + franquicias) */
  const combinedOptions: UserOptionEx[] = React.useMemo(() => {
    const map = new Map<string, UserOptionEx>();
    for (const o of [...workersOptions, ...franqOptions]) {
      const key = (o.value || "").toLowerCase();
      if (!map.has(key)) map.set(key, o);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [workersOptions, franqOptions]);

  /** Opción seleccionada (Solicitante) */
  const selectedSolicitante = React.useMemo<UserOptionEx | null>(() => {
    if (!state.solicitadoPor) return null;
    return combinedOptions.find(o => o.label === state.solicitadoPor) ?? null;
  }, [combinedOptions, state.solicitadoPor]);

  /** Helpers */
  const totalPct = React.useMemo(
    () =>
      state.cargarA === "Marca"
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
    if (!state.solicitadoPor.trim())   e.solicitadoPor   = "Requerido.";
    if (!state.fechaSolicitud)          e.fechaSolicitud  = "Requerido.";
    if (!state.co)                      e.co              = "Seleccione CO.";
    if (!state.un)                      e.un              = "Seleccione UN.";
    if (!state.ccosto)                  e.ccosto          = "Seleccione C. Costo.";
    if (state.cargarA === "Marca" && totalPct !== 100)
      e.marcasPct = "El total de porcentajes debe ser 100%.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.(state);
  }

  /** Si vuelve a CO, resetea % */
  React.useEffect(() => {
    if (state.cargarA === "CO")
      setState((s) => ({ ...s, marcasPct: { ...zeroMarcas() } }));
  }, [state.cargarA]);

  return (
    <div className="compra-form white-silo compra-wrap" data-darkreader-ignore>
      <form className="form-grid" onSubmit={handleSubmit}>
        {/* Tipo */}
        <div className="field">
          <label className="label">Tipo</label>
          <select
            className="control"
            value={state.tipoCompra}
            onChange={(e) => setField("tipoCompra", e.target.value as TipoCompra)}
          >
            <option value="Producto">Producto</option>
            <option value="Servicio">Servicio</option>
            <option value="Alquiler">Alquiler</option>
          </select>
        </div>

        {/* Solicitante (react-select) */}
        <div className="field">
          <label className="label">Solicitante</label>
          <Select<UserOptionEx, false, GroupBase<UserOptionEx>>
            classNamePrefix="rs"
            className="rs-override"
            options={combinedOptions}
            placeholder={
              (loadingWorkers || loadingFranq) ? "Cargando opciones…" :
              (usersError || franqError) ? "Error cargando opciones" :
              "Buscar solicitante…"
            }
            isDisabled={submitting || loadingWorkers || loadingFranq}
            isLoading={loadingWorkers || loadingFranq}
            value={selectedSolicitante}
            onChange={(opt) => setField("solicitadoPor", opt?.label ?? "")}
            filterOption={(o, input) =>
              userFilter({ label: o.label, value: String(o.value ?? "") }, input)
            }
            components={{ Option }}
            isClearable
          />
        </div>

        {/* Fecha */}
        <div className="field">
          <label className="label">Fecha de solicitud</label>
          <input
            type="date"
            className="control"
            value={state.fechaSolicitud}
            onChange={(e) => setField("fechaSolicitud", e.target.value)}
          />
          {errors.fechaSolicitud && <small className="error">{errors.fechaSolicitud}</small>}
        </div>

        {/* Producto/Servicio/Alquiler */}
        <div className="field">
          <label className="label">
            {state.tipoCompra === "Producto" ? "Producto"
              : state.tipoCompra === "Servicio" ? "Servicio" : "Alquiler"}
          </label>
          <input
            className="control"
            value={state.productoServicio}
            onChange={(e) => setField("productoServicio", e.target.value)}
            placeholder={`Nombre de ${state.tipoCompra.toLowerCase()}`}
          />
          {errors.productoServicio && <small className="error">{errors.productoServicio}</small>}
        </div>

        {/* CO (Centros Operativos) - react-select */}
        <div className="field">
          <label className="label">CO</label>
          <Select classNamePrefix="rs" 
            className="rs-override" 
            options={COOptions}
            placeholder={loadingCO ? "Cargando C. Costo…" : coError ? "Error cargando CO" : "Buscar co…"}
            isDisabled={submitting || loadingCO}
            isLoading={loadingCO}                                      
            onChange={(opt) => setField("co", String(opt?.value ?? "").trim())} 
            filterOption={(o, input) => userFilter({ label: o.label, value: String(o.value ?? "") }, input)}
            isClearable
          />
          {errors.co && <small className="error">{errors.co}</small>}
          {coError && <small className="error">{coError}</small>}
        </div>

        {/* UN */}
        <div className="field">
          <label className="label">UN</label>
          <select className="control" value={state.un} onChange={(e) => setField("un", e.target.value)}>
            <option value="">Seleccione UN</option>
            {UN_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.un && <small className="error">{errors.un}</small>}
        </div>

        {/* C. Costo (react-select) */}
        <div className="field">
          <label className="label">C. Costo</label>
          <Select classNamePrefix="rs" 
            className="rs-override" 
            options={ccOptions}
            placeholder={loadingCC ? "Cargando C. Costo…" : ccError ? "Error cargando C. Costo" : "Buscar centro de costo…"}
            isDisabled={submitting || loadingCC}
            isLoading={loadingCC}                                 
            onChange={(opt) => setField("ccosto", String(opt?.value ?? "").trim())} 
            filterOption={(o, input) => userFilter({ label: o.label, value: String(o.value ?? "") }, input)}
            isClearable
          />
          {errors.ccosto && <small className="error">{errors.ccosto}</small>}
          {ccError && <small className="error">{ccError}</small>}
        </div>

        {/* Cargar a */}
        <div className="field">
          <label className="label">Cargar a</label>
          <select className="control" value={state.cargarA} onChange={(e) => setField("cargarA", e.target.value as CargarA)}>
            <option value="CO">CO</option>
            <option value="Marca">Marca</option>
          </select>
        </div>

        {/* Distribución marcas / Valor CO */}
        {state.cargarA === "CO" ? (
          <div className="field">
            <label className="label">Valor a cargar (CO)</label>
            <input className="control control--readonly" readOnly value={state.co ?? ""} />
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
                    <input
                      type="number" min={0} max={100} step="1"
                      className="control"
                      value={state.marcasPct[m]}
                      onChange={(e) =>
                        setMarcaPct(m, Math.max(0, Math.min(100, Number(e.target.value))))
                      }
                    />
                  </div>
                ))}
              </div>
              {errors.marcasPct && <small className="error">{errors.marcasPct}</small>}
            </div>
          </div>
        )}

        {/* No. CO */}
        <div className="field">
          <label className="label">No. CO</label>
          <input
            className="control"
            value={state.noCO}
            onChange={(e) => setField("noCO", e.target.value)}
            placeholder="Ej. 12345"
          />
        </div>

        {/* Acciones */}
        <div className="col-span-full flex items-center justify-end gap-2 pt-2">
          <button
            type="reset"
            className="btn btn-sm"
            onClick={() => setState((s) => ({
              ...s,
              productoServicio: "",
              solicitadoPor: "",
              fechaSolicitud: "",
              dispositivo: "",
              noCO: "",
              pesoTotal: undefined,
              marcasPct: { ...zeroMarcas() },
            }))}
          >
            Limpiar
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
