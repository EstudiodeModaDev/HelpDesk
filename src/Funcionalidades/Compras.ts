import React from "react";

import type { DateRange } from "../Models/Filtros";
import { toISODateFlex } from "../utils/Date";
import type { GetAllOpts } from "../Models/Commons";
import type { ComprasService } from "../Services/Compras.service";
import type { Compra } from "../Models/Compras";
import type { CentroCostos } from "../Models/CentroCostos";
import type { CentroCostosService } from "../Services/CentroCostos.service";

export function useCompras(ComprasSvc: ComprasService) {
  const [compras, setCompras] = React.useState<Compra[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const today = React.useMemo(() => toISODateFlex(new Date()), []);
  const [range, setRange] = React.useState<DateRange>({ from: today, to: today });
  const [pageSize, setPageSize] = React.useState<number>(10); // = $top
  const [pageIndex, setPageIndex] = React.useState<number>(1); // 1-based
  const [nextLink, setNextLink] = React.useState<string | null>(null);

  const buildFilter = React.useCallback((): GetAllOpts => {
    const filters: string[] = [];

    if (range.from && range.to && (range.from < range.to)) {
      if (range.from) filters.push(`fields/FechaApertura ge '${range.from}T00:00:00Z'`);
      if (range.to)   filters.push(`fields/FechaApertura le '${range.to}T23:59:59Z'`);
    }
    return {
      filter: filters.join(" and "),
      top: pageSize,
    };
  }, [range.from, range.to, pageSize, ]); 

  const loadFirstPage = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { items, nextLink } = await ComprasSvc.getAll(buildFilter()); // debe devolver {items,nextLink}
      setCompras(items);
      setNextLink(nextLink ?? null);
      setPageIndex(1);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando tickets");
      setCompras([]);
      setNextLink(null);
      setPageIndex(1);
    } finally {
      setLoading(false);
    }
  }, [ComprasSvc, buildFilter]);

  React.useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  // siguiente página: seguir el nextLink tal cual
  const hasNext = !!nextLink;

  const nextPage = React.useCallback(async () => {
    if (!nextLink) return;
    setLoading(true); setError(null);
    try {
      const { items, nextLink: n2 } = await ComprasSvc.getByNextLink(nextLink);
      setCompras(items);              // 👈 reemplaza la página visible
      setNextLink(n2 ?? null);     // null si no hay más
      setPageIndex(i => i + 1);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando más tickets");
    } finally {
      setLoading(false);
    }
  }, [nextLink, ComprasSvc]);

  // recargas por cambios externos
  const applyRange = React.useCallback(() => { loadFirstPage(); }, [loadFirstPage]);
  const reloadAll  = React.useCallback(() => { loadFirstPage(); }, [loadFirstPage]);

  return {
    // datos visibles (solo la página actual)
    compras,
    loading,
    error,

    // paginación (servidor)
    pageSize, setPageSize, 
    pageIndex,
    hasNext,
    nextPage,

    range, setRange,
    applyRange,

    reloadAll,
  };
}

export function useCentroCostos(CCSvc: CentroCostosService) {
  const [CC, setCC] = React.useState<CentroCostos[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadCC = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items: CentroCostos[] = await CCSvc.getAll();
      setCC(Array.isArray(items) ? items : []);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando centros de costo");
      setCC([]);
    } finally {
      setLoading(false);
    }
  }, [CCSvc]);

  React.useEffect(() => {
    loadCC();
  }, [loadCC]);

  const ccOptions = React.useMemo(
    () => CC.map(c => ({ value: c.Codigo, label: c.Title })),
    [CC]
  );

  return {
    CC, ccOptions, loading, error,
    reload: loadCC,
  };
}


