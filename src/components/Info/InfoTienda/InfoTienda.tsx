import * as React from "react";
import "./InfoTienda.css"

// ===== Tipos =====
export type StoreInfo = {
  tienda: string;
  correo: string;
  empresa: string | number;
  nit?: string;
  ciudad?: string;
  centroComercial?: string;
  direccion?: string;
  local?: string | number;
  proveedorServicio?: string;
  identificador?: string | number;
  comparteServicio?: string;
  comparteCon?: string;
};

export type SectionKey = "info" | "servicio" | "contacto" | "todo";

// ===== Utilidades =====
const LABELS: Record<keyof StoreInfo, string> = {
  tienda: "Tienda",
  correo: "Correo",
  empresa: "Empresa",
  nit: "NIT",
  ciudad: "Ciudad",
  centroComercial: "Centro Comercial",
  direccion: "Dirección",
  local: "Local",
  proveedorServicio: "Proveedor de servicio",
  identificador: "Identificador",
  comparteServicio: "¿Comparte servicio?",
  comparteCon: "Comparte con",
};

function toRows(store: Partial<StoreInfo>) {
  return (Object.keys(LABELS) as (keyof StoreInfo)[])
    .map((k) => ({ key: k, label: LABELS[k], value: (store as any)[k] ?? "N/A" }));
}

// ===== Componente principal =====
export default function StoreInfoPanel() {
  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState<SectionKey>("todo");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [store, setStore] = React.useState<Partial<StoreInfo>>({});

  // Demo: datos iniciales (puedes remplazar por fetch real)
  React.useEffect(() => {
    setStore({
      tienda: "Pilatos Arkadia",
      correo: "pilatosarkadia@estudiodemoda.com.co",
      empresa: 1,
      nit: "",
      ciudad: "Medellín",
      centroComercial: "Arkadia",
      direccion: "Cra. 70 #1-141",
      local: 175,
      proveedorServicio: "TIGO",
      identificador: "214040182",
      comparteServicio: "N/A",
      comparteCon: "N/A",
    });
  }, []);

  async function handleSearch(ev?: React.FormEvent) {
    ev?.preventDefault();
    setLoading(true); setError(null);
    try {
      // TODO: reemplaza con tu integración (Graph/SharePoint/REST)
      // Ejemplo de espera simulada
      await new Promise((r) => setTimeout(r, 500));
      // setStore(await fetchStoreInfo(query))
      if (!query.trim()) throw new Error("Escribe el nombre de una tienda para buscar");
    } catch (e: any) {
      setError(e?.message ?? "Error buscando la tienda");
    } finally {
      setLoading(false);
    }
  }

  const rows = toRows(filterBySection(store, section));

  return (
    <section className="w-full max-w-[1100px] mx-auto p-6 md:p-10">
      {/* Título */}
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        INFORMACIÓN DE LA TIENDA
      </h1>

      {/* Barra de acciones */}
      <form onSubmit={handleSearch} className="mt-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Arkadia"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          aria-label="Buscar tienda"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold bg-indigo-600 text-white shadow hover:bg-indigo-700 disabled:opacity-60"
          aria-label="Buscar"
        >
          <span className="i-lucide-check mr-1" aria-hidden />
          {loading ? "Buscando…" : "Buscar"}
        </button>

        {/* Selector de sección */}
        <div className="relative">
          <label className="sr-only" htmlFor="section">Sección</label>
          <select
            id="section"
            value={section}
            onChange={(e) => setSection(e.target.value as SectionKey)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500"
            aria-label="Seleccionar sección"
          >
            <option value="todo">Información de la tienda</option>
            <option value="contacto">Contacto</option>
            <option value="info">Ubicación</option>
            <option value="servicio">Servicio</option>
          </select>
        </div>
      </form>

      {/* Estado */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {/* Tabla scrollable */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="max-h-[430px] overflow-y-auto">
          <table className="w-full border-collapse text-slate-800">
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.key)} className="even:bg-slate-50">
                  <th scope="row" className="w-[280px] sticky left-0 bg-slate-50 text-left text-sm font-semibold text-slate-700 border-b border-slate-200 px-4 py-3">
                    {r.label}
                  </th>
                  <td className="border-b border-slate-200 px-4 py-3 text-sm">
                    {String(r.value ?? "N/A")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pie de página opcional */}
      <p className="mt-3 text-xs text-slate-500">Tip: Puedes reemplazar la búsqueda por un fetch real y llenar el estado <code>store</code> con los datos de SharePoint/Graph.</p>
    </section>
  );
}

// ===== Filtrado por sección (para el selector de la derecha) =====
function filterBySection(store: Partial<StoreInfo>, section: SectionKey): Partial<StoreInfo> {
  if (section === "todo") return store;
  const m: Record<SectionKey, (keyof StoreInfo)[]> = {
    todo: Object.keys(LABELS) as (keyof StoreInfo)[],
    contacto: ["tienda", "correo"],
    info: ["ciudad", "centroComercial", "direccion", "local"],
    servicio: ["proveedorServicio", "identificador", "comparteServicio", "comparteCon"],
  };
  return Object.fromEntries(
    m[section].map((k) => [k, (store as any)[k]])
  ) as Partial<StoreInfo>;
}

