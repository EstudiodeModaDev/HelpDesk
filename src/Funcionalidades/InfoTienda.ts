import React from "react";
import type { GetAllOpts } from "../Models/Commons";
import type { InternetTiendasService } from "../Services/InternetTiendas.service";
import type { InternetTiendas } from "../Models/Internet";

const escOData = (s:string) => `'${String(s).replace(/'/g, "''")}'`;

export function useInfoInternetTiendas(InfoInternetSvc: InternetTiendasService,) {
  
  const [rows, setRows] = React.useState<InternetTiendas[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

const buildFilter = React.useCallback((): GetAllOpts => {
  const q = query.trim();
  if (q.length < 2) return { top: 0 };

  const qEsc = escOData(q.toLowerCase());
  const filters = [
    `startsWith(fields/Tienda, ${qEsc})`,
    `startsWith(fields/CORREO, ${qEsc})`,
    `startsWith(fields/IDENTIFICADOR, ${qEsc})`,
  ];

  return { filter: filters.join(" or "), top: 150 };
}, [query]);


  const loadQuery = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const items = await InfoInternetSvc.getAll(buildFilter()); // debe devolver {items,nextLink}
      setRows(items);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando tickets");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [InfoInternetSvc, buildFilter]);

  return {
    // datos visibles (solo la página actual)
    rows,
    loading,
    error,
    query,

    // paginación (servidor)
    setQuery,
    loadQuery

  };
}


