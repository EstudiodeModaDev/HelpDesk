import type { ReactNode } from "react";
import "./InfoTienda.css";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import type { InternetService } from "../../../Services/Internet.service";
import { useInfoInternetTiendas } from "../../../Funcionalidades/InfoTienda";
import type { InternetTiendas } from "../../../Models/Internet";

type Column<K extends keyof InternetTiendas = keyof InternetTiendas> = {
  key: K;
  label: string;
  render?: (v: InternetTiendas[K], row: InternetTiendas) => ReactNode;
};

/** Usa `satisfies` para validar keys pero tipa el array como Column[] */
const COLS = [
  { key: "Tienda", label: "Tienda" },
  { key: "CORREO", label: "Correo", render: (v: string) => <a href={`mailto:${v}`}>{v}</a> },
  { key: "Compa_x00f1__x00ed_a", label: "Empresa" },
  { key: "Title", label: "Ciudad" },
  { key: "Centro_x0020_Comercial", label: "Centro Comercial" },
  { key: "DIRECCI_x00d3_N", label: "Dirección" },
  { key: "Local", label: "Local" },
  { key: "PROVEEDOR", label: "Proveedor de servicio" },
  { key: "IDENTIFICADOR", label: "Identificador", render: (v: InternetTiendas["IDENTIFICADOR"]) => <code>{String(v ?? "N/A")}</code> },
  { key: "SERVICIO_x0020_COMPARTIDO", label: "¿Comparte servicio?" },
  { key: "Nota", label: "Comparte con" },
] satisfies readonly Column[];

export default function StoreInfoPanel() {
  // Renombre para evitar confusiones con el tipo importado
  const { InternetTiendas: InternetSvc } = useGraphServices() as ReturnType<typeof useGraphServices> & {
    InternetTiendas: InternetService;
  };

  const { setQuery, rows, loading, error, loadQuery, query } = useInfoInternetTiendas(InternetSvc);

  return (
    <section className="store-info w-full max-w-[1100px] mx-auto p-6 md:p-10">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">INFORMACIÓN DE LA TIENDA</h1>

      {/* Acciones */}
      <form
        onSubmit={(e) => { e.preventDefault(); loadQuery(); }}
        className="store-actions"
      >
        <div className="store-actions__left">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre de la tienda o identificador de servicio..."
            className="flex-1 px-4 py-3 text-base shadow-sm"
            aria-label="Buscar tienda"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            aria-label="Buscar"
          >
            <span className="i-lucide-check mr-1" aria-hidden />
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </form>

      {error && <div className="alert-error mt-4">{error}</div>}

      {/* Tabla */}
      <div className="card mt-6 overflow-hidden">
        <div className="store-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className="text-left text-sm font-semibold px-4 py-3 sticky top-0 bg-white"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
            {rows.length === 0 && (
                <tr>
                <td className="px-4 py-3 text-sm" colSpan={COLS.length}>
                    {loading ? "Cargando…" : "Sin resultados"}
                </td>
                </tr>
            )}

            {rows.map((r: InternetTiendas) => (
                <tr key={r.ID}>
                {COLS.map((c) => {
                    // TS infiere v como InternetTiendas[typeof c.key]
                    const v = r[c.key];
                    return (
                    <td key={c.key} className="px-4 py-3 text-sm">
                        {c.render ? c.render(v) : String(v ?? "N/A")}
                    </td>
                    );
                })}
                </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
