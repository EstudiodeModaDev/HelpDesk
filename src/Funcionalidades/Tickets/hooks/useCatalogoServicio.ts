import { useQuery } from "@tanstack/react-query";
import type { Articulo, Categoria, Subcategoria } from "../../../Models/Categorias";

export type CatalogoServicioSvc = {
  Categorias: { getAll: (opts?: any) => Promise<any[]> };
  SubCategorias: { getAll: (opts?: any) => Promise<any[]> };
  Articulos: { getAll: (opts?: any) => Promise<any[]> };
};

type CatalogoServicioData = {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  articulos: Articulo[];
};

const first = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && v !== "");

async function fetchCatalogoServicio(services: CatalogoServicioSvc): Promise<CatalogoServicioData> {
  const { Categorias, SubCategorias, Articulos } = services;

  const [catsRaw, subsRaw, artsRaw] = await Promise.all([
    Categorias.getAll({ orderby: "fields/Title asc" }),
    SubCategorias.getAll({ orderby: "fields/Title asc", top: 5000 }),
    Articulos.getAll({ orderby: "fields/Title asc", top: 5000 }),
  ]);

  const categorias: Categoria[] = (catsRaw ?? []).map((r: any) => ({
    ID: String(first(r.ID, r.Id, r.id)),
    Title: String(first(r.Title, "No mapeado")),
  }));

  const subcategorias: Subcategoria[] = (subsRaw ?? []).map((r: any) => ({
    ID: String(first(r.ID, r.Id, r.id)),
    Title: String(first(r.Title, "No mapeado")),
    Id_categoria: String(first(r.Id_categoria, "")),
  }));

  const articulos: Articulo[] = (artsRaw ?? []).map((r: any) => ({
    ID: String(first(r.ID, r.Id, r.id)),
    Title: String(first(r.Title, "")),
    Id_subCategoria: String(first(r.Id_Subcategoria, r.Id_subcategoria, "")),
  }));

  return { categorias, subcategorias, articulos };
}

// El catálogo de Categorías/SubCategorías/Artículos cambia muy poco durante
// una sesión, así que se trae una sola vez (staleTime: Infinity) y se
// comparte entre todos los formularios que lo consumen (Nuevo Ticket,
// Recategorizar), en vez de que cada uno vuelva a pedirlo a SharePoint
// cada vez que se monta.
export function useCatalogoServicio(services: CatalogoServicioSvc) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["catalogo-servicio"],
    queryFn: () => fetchCatalogoServicio(services),
    staleTime: Infinity,
  });

  return {
    categorias: data?.categorias ?? [],
    subcategoriasAll: data?.subcategorias ?? [],
    articulosAll: data?.articulos ?? [],
    loadingCatalogos: isLoading,
    errorCatalogos: error ? (error instanceof Error ? error.message : String(error)) : null,
  };
}
