import React from "react";
import type { Franquicias } from "../Models/Franquicias";
import type { FranquiciasService } from "../Services/Franquicias.service";

export function useFranquicias(
  FranquiciasSvc: FranquiciasService
) {

  const [franquicias, setFranquicias] = React.useState<Franquicias[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);


  // paginación servidor
  const [pageSize, setPageSize] = React.useState<number>(10); // = $top
  const [pageIndex, setPageIndex] = React.useState<number>(1); // 1-based
  const [nextLink, setNextLink] = React.useState<string | null>(null);

  //const [sorts, setSorts] = React.useState<Array<{field: SortField; dir: SortDir}>>([{ field: 'id', dir: 'desc' }]);


  // cargar primera página (o recargar)
  const loadFranquicias = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
    console.log("Iniciando franquicias")
      const res =  await FranquiciasSvc.getAll();
       const items: Franquicias[] = Array.isArray(res) ? res : (res?.items ?? []);
      console.log("Franquicias obtenidas: ", items)
      setFranquicias(items);
      console.log("franquicias guardadas: ", franquicias)
      setNextLink(nextLink ?? null);
      setPageIndex(1);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando franquicias");
      setFranquicias([]);
      setNextLink(null);
      setPageIndex(1);
    } finally {
      setLoading(false);
    }
  }, [FranquiciasSvc]);

  React.useEffect(() => {
    loadFranquicias();
  }, [loadFranquicias]);

  // siguiente página: seguir el nextLink tal cual
  const hasNext = !!nextLink;

  /*
  const nextPage = React.useCallback(async () => {
    if (!nextLink) return;
    setLoading(true); setError(null);
    try {
      const { items, nextLink: n2 } = await FranquiciasSvc.getByNextLink(nextLink);
      setFranquicias(items);              // 👈 reemplaza la página visible
      setNextLink(n2 ?? null);     // null si no hay más
      setPageIndex(i => i + 1);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando más tickets");
    } finally {
      setLoading(false);
    }
  }, [nextLink, TicketsSvc]);

  // recargas por cambios externos
  const applyRange = React.useCallback(() => { loadFirstPage(); }, [loadFirstPage]);
  const reloadAll  = React.useCallback(() => { loadFirstPage(); }, [loadFirstPage]);

  const sortFieldToOData: Record<SortField, string> = {
    id: 'ID',
    FechaApertura: 'fields/FechaApertura',
    TiempoSolucion: 'fields/TiempoSolucion',
    Title: 'fields/Title',
    resolutor: 'fields/Nombreresolutor',
  };

  const toggleSort = React.useCallback((field: SortField, additive = false) => {
    setSorts(prev => {
      const idx = prev.findIndex(s => s.field === field);
      if (!additive) {
        // clic normal: solo esta columna; alterna asc/desc
        if (idx >= 0) {
          const dir: SortDir = prev[idx].dir === 'desc' ? 'asc' : 'desc';
          return [{ field, dir }];
        }
        return [{ field, dir: 'asc' }];
      }
      // Shift+clic: multi-columna
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { field, dir: copy[idx].dir === 'desc' ? 'asc' : 'desc' };
        return copy;
      }
      return [...prev, { field, dir: 'asc' }];
    });
  }, []);*/

  return {
    // datos visibles (solo la página actual)
    franquicias,
    loading,
    error,

    // paginación (servidor)
    pageSize, setPageSize, // si cambias, se recarga por el efecto de arriba (porque cambia buildFilter)
    pageIndex,
    hasNext,
    //nextPage,
  };
}
