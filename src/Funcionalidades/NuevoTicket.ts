// src/hooks/useNuevoTicketForm.tsx
import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { calcularFechaSolucion } from "../utils/ans";
import { fetchHolidays } from "../Services/Festivos";
import type { UserOption, FormState, FormErrors } from "../Models/nuevoTicket";


/* ============================
   Tipos / mocks
   ============================ */

const USUARIOS: UserOption[] = [
  { value: "practicantelisto@estudiodemoda.com.co", label: "Practicante Listo", id: 1 },
  { value: "cesar@estudiodemoda.com.co", label: "Cesar Sanchez", id: 2 },
  { value: "andres@estudiodemoda.com.co", label: "Andres Godoy", id: 3 },
];

type Svc = {
  Categorias: { getAll: (opts?: any) => Promise<any[]> };
  SubCategorias: { getAll: (opts?: any) => Promise<any[]> };
  Articulos: { getAll: (opts?: any) => Promise<any[]> };
};

// Normalizamos los modelos a una estructura consistente local
type Categoria = { id: string; nombre: string };
type Subcategoria = { id: string; nombre: string; categoriaId: string };
type Articulo   = { id: string; nombre: string; subcategoriaId: string };

/* ============================
   Hook principal
   ============================ */

export function useNuevoTicketForm(services: Svc) {
  const { Categorias, SubCategorias, Articulos } = services;

  // ---- Estado del formulario
  const [state, setState] = useState<FormState>({
    solicitante: null,
    resolutor: null,
    usarFechaApertura: false,
    fechaApertura: null,
    fuente: "",
    motivo: "",
    descripcion: "",
    categoria: "",
    subcategoria: "",
    articulo: "",
    archivo: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [fechaSolucion, setFechaSolucion] = useState<Date | null>(null);

  // ---- Catálogos
  const [categorias, setCategorias] = React.useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = React.useState<Subcategoria[]>([]);
  const [articulosAll, setArticulosAll] = React.useState<Articulo[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = React.useState(false);
  const [errorCatalogos, setErrorCatalogos] = React.useState<string | null>(null);

  /* ============================
     Festivos (una sola vez)
     ============================ */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const hs = await fetchHolidays("CO");
        if (!cancel) setHolidays(hs);
      } catch (e) {
        if (!cancel) console.error("Error festivos:", e);
      }
    })();
    return () => { cancel = true; };
  }, []);

  /* ============================
     Cargar catálogos (una sola vez)
     ============================ */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingCatalogos(true);
        setErrorCatalogos(null);

        const [catsRaw, subsRaw, artsRaw] = await Promise.all([
          Categorias.getAll({ orderby: "fields/Categoria asc" }),
          SubCategorias.getAll({ orderby: "fields/Subcategoria asc", top: 5000 }),
          Articulos.getAll({ orderby: "fields/Articulo asc", top: 5000 }),
        ]);

        if (cancel) return;

        console.log("cats: ", catsRaw)
        console.log("subcats: ", subsRaw)
        console.log("arts: ", artsRaw)
        const cats: Categoria[] = (catsRaw ?? []).map((r: any) => ({
          id: String(r.ID ?? r.Id),
          nombre: String(r.Categoria ?? r.fields?.Categoria ?? ""),
        }));

        const subs: Subcategoria[] = (subsRaw ?? []).map((r: any) => ({
          id: String(r.ID ?? r.Id),
          nombre: String(r.Subcategoria ?? r.fields?.Subcategoria ?? ""),
          categoriaId: String(r.Id_Categoria ?? r.fields?.Id_Categoria ?? ""),
        }));

        const arts: Articulo[] = (artsRaw ?? []).map((r: any) => ({
          id: String(r.ID ?? r.Id),
          nombre: String(r.Articulo ?? r.fields?.Articulo ?? ""),
          subcategoriaId: String(r.Id_Subcategoria ?? r.fields?.Id_Subcategoria ?? ""),
        }));

        setCategorias(cats);
        setSubcategorias(subs);
        setArticulosAll(arts);
      } catch (e: any) {
        if (!cancel) setErrorCatalogos(e?.message ?? "Error cargando catálogos");
      } finally {
        if (!cancel) setLoadingCatalogos(false);
      }
    })();
    return () => { cancel = true; };
  }, [Categorias, SubCategorias, Articulos]);

  /* ============================
     Derivados: subcats y artículos filtrados
     ============================ */
  const subcats = useMemo<Subcategoria[]>(() => {
    const catId = String(state.categoria ?? "");
    if (!catId) return [];
    return subcategorias.filter((s) => s.categoriaId === catId);
  }, [subcategorias, state.categoria]);

  const articulos = useMemo<string[]>(() => {
    const subId = String(state.subcategoria ?? "");
    if (!subId) return [];
    return articulosAll
      .filter((a) => a.subcategoriaId === subId)
      .map((a) => a.nombre);
  }, [articulosAll, state.subcategoria]);

  /* ============================
     Helpers de formulario
     ============================ */
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  // Si cambia categoría, resetea subcategoría y artículo
  useEffect(() => {
    setState((s) => ({ ...s, subcategoria: "", articulo: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.categoria]);

  // Si cambia subcategoría, resetea artículo
  useEffect(() => {
    setState((s) => ({ ...s, articulo: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.subcategoria]);

  const validate = () => {
    const e: FormErrors = {};
    if (!state.solicitante) e.solicitante = "Requerido";
    if (!state.resolutor) e.resolutor = "Requerido";
    if (state.usarFechaApertura && !state.fechaApertura) e.fechaApertura = "Seleccione la fecha";
    if (!state.fuente) e.fuente = "Seleccione una fuente";
    if (!state.motivo.trim()) e.motivo = "Ingrese el motivo";
    if (!state.descripcion.trim()) e.descripcion = "Describa el problema";
    if (!state.categoria) e.categoria = "Seleccione una categoría";
    if (!state.subcategoria) e.subcategoria = "Seleccione una subcategoría";
    if (!state.articulo) e.articulo = "Seleccione un artículo";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const apertura = state.usarFechaApertura && state.fechaApertura
        ? new Date(state.fechaApertura)
        : new Date();

      // TODO: traer horas ANS reales desde tu mapa
      const horasAns = 2;

      const solucion = calcularFechaSolucion(apertura, horasAns, holidays);
      setFechaSolucion(solucion);

      const payload = {
        ...state,
        ansHoras: horasAns,
        fechaSolucion: solucion.toISOString(),
      };

      // Aquí enviarías el payload a tu API/SharePoint
      // await TicketsService.create(payload);

      alert("Payload:\n\n" + JSON.stringify(payload, null, 2));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    // estado de formulario
    state,
    setField,
    errors,
    submitting,
    fechaSolucion,

    // catálogos y derivados
    categorias,          // todas
    subcats,             // filtradas por categoría seleccionada
    articulos,           // nombres filtrados por subcategoría
    loadingCatalogos,
    errorCatalogos,

    // util
    USUARIOS,

    // acciones
    handleSubmit,
  };
}
