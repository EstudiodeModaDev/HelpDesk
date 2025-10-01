// src/hooks/useNuevoTicketForm.tsx
import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { calcularFechaSolucion } from "../utils/ans";
import { fetchHolidays } from "../Services/Festivos";
import type { UserOption, FormState, FormErrors } from "../Models/nuevoTicket";
import type { Articulo, Categoria, Subcategoria } from "../Models/Categorias";

/* ============================
   Datos de ejemplo para selects de usuarios
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

// Helpers para tolerar nombres internos distintos
const first = (...vals: any[]) => vals.find(v => v !== undefined && v !== null && v !== "");

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


//Carga de festivos inicial
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

//Carga de catologo de servicios
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingCatalogos(true);
        setErrorCatalogos(null);

        const [catsRaw, subsRaw, artsRaw] = await Promise.all([
          Categorias.getAll({ orderby: "fields/Title asc" }),
          SubCategorias.getAll({ orderby: "fields/Title asc", top: 5000 }),
          Articulos.getAll({ orderby: "fields/Title asc", top: 5000 }),
        ]);

        console.log(artsRaw)

        if (cancel) return;

        const cats: Categoria[] = (catsRaw ?? []).map((r: any) => ({
          ID: String(first(r.ID, r.Id, r.id)),
          Title: String(first(r.Title, "No mapeado")),
        }));


        const subs: Subcategoria[] = (subsRaw ?? []).map((r: any) => ({
          ID: String(first(r.ID, r.Id, r.id)),
          Title: String(first(r.Title, "No mapeado")),
          Id_categoria: String(first(r.Id_categoria, "")),
        }));

        console.log(artsRaw)

        const arts: Articulo[] = (artsRaw ?? []).map((r: any) => ({
          ID: String(first(r.ID, r.Id, r.id)),
          Title: String(first(r.Title,  "")),
          Id_subCategoria: String(first(r.Id_Subcategoria, r.Id_subcategoria, "")),
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
    console.log("base: ", subcategorias)
    const filter = subcategorias.filter((s) => String(s.Id_categoria) === catId);
    console.log(filter)
    return filter
  }, [subcategorias, state.categoria]);

  const articulos = useMemo<string[]>(() => {
    const subId = String(state.subcategoria ?? "");
    if (!subId) return [];
    // devolvemos los NOMBRES para pintar el select
    return articulosAll
      .filter((a) => String(a.Id_subCategoria) === subId)
      .map((a) => a.Title);
  }, [articulosAll, state.subcategoria]);

  /* ============================
     Helpers de formulario
     ============================ */
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  // Reset dependientes cuando cambia categoría / subcategoría
  useEffect(() => {
    setState((s) => ({ ...s, subcategoria: "", articulo: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.categoria]);

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
    categorias,          // [{ ID, Title }]
    subcats,             // [{ ID, Title, Id_categoria }] filtradas por categoría
    articulos,           // string[] (nombres)
    loadingCatalogos,
    errorCatalogos,

    // util
    USUARIOS,

    // acciones
    handleSubmit,
  };
}
