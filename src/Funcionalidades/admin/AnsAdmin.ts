import * as React from "react";
import { useCatalogoServicio, type CatalogoServicioSvc } from "../Tickets/hooks/useCatalogoServicio";
import type { ANSRepository } from "../../repositories/AnsRepository/AnsRepository";
import type { ANS } from "../../Models/Tickets";
import { horasPorANS } from "../Tickets/utils/ticketConstants";

export type AnsAdminSvc = CatalogoServicioSvc & {
  Ans: ANSRepository;
};

export type AnsConNombres = ANS & {
  categoriaNombre: string;
  subcategoriaNombre: string;
  articuloNombre: string;
};

export type AnsFormValues = {
  categoriaId: string;
  subcategoriaId: string;
  articuloId: string;
  nivel: string;
};

export const NIVELES_ANS = Object.keys(horasPorANS);

const NO_MAPEADO = (id: number) => `(sin catálogo, ID ${id})`;

export function useAnsAdmin(services: AnsAdminSvc) {
  const { Ans } = services;
  const { categorias, subcategoriasAll, articulosAll, loadingCatalogos } = useCatalogoServicio(services);

  const [registros, setRegistros] = React.useState<ANS[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);

  const categoriaPorId = React.useMemo(
    () => new Map(categorias.map((c) => [String(c.ID), c.Title])),
    [categorias]
  );
  const subcategoriaPorId = React.useMemo(
    () => new Map(subcategoriasAll.map((s) => [String(s.ID), s.Title])),
    [subcategoriasAll]
  );
  const articuloPorId = React.useMemo(
    () => new Map(articulosAll.map((a) => [String(a.ID), a.Title])),
    [articulosAll]
  );

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Ans.getAllANS();
      setRegistros(data);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando el catálogo de ANS");
    } finally {
      setLoading(false);
    }
  }, [Ans]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Reemplaza los IDs crudos de categoría/subcategoría/artículo por sus
  // nombres, resolviéndolos contra el catálogo de servicios (useCatalogoServicio).
  const registrosConNombres: AnsConNombres[] = React.useMemo(() => {
    return registros
      .map((r) => ({
        ...r,
        categoriaNombre: categoriaPorId.get(String(r.id_categoria)) ?? NO_MAPEADO(r.id_categoria),
        subcategoriaNombre: subcategoriaPorId.get(String(r.id_subcategoria)) ?? NO_MAPEADO(r.id_subcategoria),
        articuloNombre: articuloPorId.get(String(r.id_articulo)) ?? NO_MAPEADO(r.id_articulo),
      }))
      .sort(
        (a, b) =>
          a.categoriaNombre.localeCompare(b.categoriaNombre) ||
          a.subcategoriaNombre.localeCompare(b.subcategoriaNombre) ||
          a.articuloNombre.localeCompare(b.articuloNombre)
      );
  }, [registros, categoriaPorId, subcategoriaPorId, articuloPorId]);

  const existeCombinacion = React.useCallback(
    (catId: number, subId: number, artId: number, exceptId?: string) =>
      registros.some(
        (r) =>
          r.Id !== exceptId &&
          r.id_categoria === catId &&
          r.id_subcategoria === subId &&
          r.id_articulo === artId
      ),
    [registros]
  );

  const parseForm = React.useCallback(
    (form: AnsFormValues, exceptId?: string) => {
      const catId = Number(form.categoriaId);
      const subId = Number(form.subcategoriaId);
      const artId = Number(form.articuloId);

      if (!catId || !subId || !artId || !form.nivel) {
        throw new Error("Selecciona categoría, subcategoría, artículo y nivel de ANS.");
      }
      if (existeCombinacion(catId, subId, artId, exceptId)) {
        throw new Error("Ya existe un ANS configurado para esa categoría/subcategoría/artículo.");
      }
      return { id_categoria: catId, id_subcategoria: subId, id_articulo: artId, Title: form.nivel };
    },
    [existeCombinacion]
  );

  const crear = React.useCallback(
    async (form: AnsFormValues) => {
      const payload = parseForm(form);
      setCreating(true);
      try {
        const nuevo = await Ans.createANS(payload);
        setRegistros((prev) => [...prev, nuevo]);
        return nuevo;
      } finally {
        setCreating(false);
      }
    },
    [Ans, parseForm]
  );

  const actualizar = React.useCallback(
    async (id: string, form: AnsFormValues) => {
      const payload = parseForm(form, id);
      setUpdating(true);
      try {
        const actualizado = await Ans.updateANS(id, payload);
        setRegistros((prev) => prev.map((r) => (r.Id === id ? actualizado : r)));
        return actualizado;
      } finally {
        setUpdating(false);
      }
    },
    [Ans, parseForm]
  );

  const eliminar = React.useCallback(
    async (id: string) => {
      await Ans.deleteANS(id);
      setRegistros((prev) => prev.filter((r) => r.Id !== id));
    },
    [Ans]
  );

  return {
    registros: registrosConNombres,
    categorias,
    subcategoriasAll,
    articulosAll,
    loading: loading || loadingCatalogos,
    error,
    creating,
    updating,
    niveles: NIVELES_ANS,
    refresh,
    crear,
    actualizar,
    eliminar,
  };
}
