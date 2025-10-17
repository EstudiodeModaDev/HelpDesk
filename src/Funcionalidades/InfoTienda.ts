import React from "react";
import type { GetAllOpts } from "../Models/Commons";
import type { InternetTiendasService } from "../Services/InternetTiendas.service";
import type { InfoInternetTienda, InternetTiendas } from "../Models/Internet";
import type { SociedadesService } from "../Services/Sociedades.service";


const escOData = (s: string) => `'${String(s).replace(/'/g, "''")}'`;

/** Carga un diccionario nombreEmpresa -> NIT, consultando por lotes */
  async function getCompaniesMapByIds(CompaniesSvc: SociedadesService, ids: Array<string | number>,concurrency = 8): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    if (!CompaniesSvc) return map;

    const unique = Array.from(new Set(ids.map(String).map(s => s.trim()).filter(Boolean)));
    if (unique.length === 0) return map;

    for (let i = 0; i < unique.length; i += concurrency) {
      const slice = unique.slice(i, i + concurrency);

      const results = await Promise.allSettled(
        slice.map(async (rawId) => {
          const idForGet = rawId ? Number(rawId) : rawId;
          const item = await CompaniesSvc.get(String(idForGet));
          return { rawId, item };
        })
      );

      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const { rawId, item } = r.value as { rawId: string; item: any };

        const nit = item?.Nit
        const nitStr = String(nit ?? "N/A");

        map[rawId] = nitStr;

        const spId = item?.fields?.ID;
        if (spId != null) {
          map[String(spId)] = nitStr;
        }

        const graphId = item?.id;
        if (graphId) {
          map[String(graphId)] = nitStr;
        }
      }
    }

    return map;
  }

  async function getNamesCompaniesMapByIds(CompaniesSvc: SociedadesService, ids: Array<string | number>,
    concurrency = 8
  ): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    if (!CompaniesSvc) return map;

    const unique = Array.from(new Set(ids.map(String).map(s => s.trim()).filter(Boolean)));
    if (unique.length === 0) return map;

    for (let i = 0; i < unique.length; i += concurrency) {
      const slice = unique.slice(i, i + concurrency);

      const results = await Promise.allSettled(
        slice.map(async (rawId) => {
          const idForGet = rawId ? Number(rawId) : rawId;
          const item = await CompaniesSvc.get(String(idForGet));
          return { rawId, item };
        })
      );

      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const { rawId, item } = r.value as { rawId: string; item: any };

        const nit = item?.Title
        const nitStr = String(nit ?? "N/A");

        map[rawId] = nitStr;

        const spId = item?.fields?.ID;
        if (spId != null) {
          map[String(spId)] = nitStr;
        }

        const graphId = item?.id;
        if (graphId) {
          map[String(graphId)] = nitStr;
        }
      }
    }

    return map;
  }


export function useInfoInternetTiendas(InfoInternetSvc: InternetTiendasService, CompaniesSvc: SociedadesService) {
  const [rows, setRows] = React.useState<InfoInternetTienda[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const buildFilter = React.useCallback((): GetAllOpts => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { top: 0 };

    const qEsc = escOData(q);
    const filters = [
      `startswith(fields/Tienda, ${qEsc})`,
      `startswith(fields/CORREO, ${qEsc})`,
      `startswith(fields/IDENTIFICADOR, ${qEsc})`,
    ];

    return {
      filter: filters.join(" or "),
      top: 150,
    };
  }, [query]);

  const loadQuery = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {

      const  items: InternetTiendas[]  = await InfoInternetSvc.getAll(buildFilter()); 

      const companyNames = items.map(r => r.Compa_x00f1__x00ed_a ?? "");
      const companiesMap = await getCompaniesMapByIds(CompaniesSvc, companyNames);
      const companiesName = await getNamesCompaniesMapByIds(CompaniesSvc, companyNames)

      // 3) Mapear a tu modelo normalizado
      const view: InfoInternetTienda[] = items.map(r => ({
        ID: r.ID,
        Ciudad: r.Title ?? "N/A",
        CentroComercial: r.Centro_x0020_Comercial ?? "N/A",
        Tienda: r.Tienda ?? "N/A",
        Correo: r.CORREO ?? "N/A",
        Proveedor: r.PROVEEDOR ?? "N/A",
        Identificador: r.IDENTIFICADOR ?? "N/A",
        Comparte: r.SERVICIO_x0020_COMPARTIDO ?? "N/A",
        Direccion: r.DIRECCI_x00d3_N ?? "N/A",
        Local: r.Local ?? "N/A",
        Nota: r.Nota ?? "N/A",
        ComparteCon: r.Nota ?? "N/A", // si es otra columna, cámbiala aquí
        Nit: companiesMap[(r.Compa_x00f1__x00ed_a ?? "").trim()] ?? "N/A",
        Sociedad: companiesName[(r.Compa_x00f1__x00ed_a ?? "").trim()] ?? "N/A",   
      }));

      setRows(view);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando tiendas");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [InfoInternetSvc, CompaniesSvc, buildFilter]);

  return {
    // datos visibles (solo la página actual)
    rows,
    loading,
    error,
    query,

    // acciones
    setQuery,
    loadQuery,
  };
}
