// src/hooks/useNuevoTicketForm.tsx
import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { calcularFechaSolucion } from "../utils/ans";
import { fetchHolidays } from "../Services/Festivos";
import type { FormState, FormErrors } from "../Models/nuevoTicket";
import type { Articulo, Categoria, Subcategoria } from "../Models/Categorias";
import type { FlowToUser, UserOption } from "../Models/Commons";
import { norm } from "../utils/Commons";
import type { TZDate } from "@date-fns/tz";

/* ============================
   Datos de ejemplo para selects de usuarios
   ============================ */
const USUARIOS: UserOption[] = [
  { value: "practicantelisto@estudiodemoda.com.co", label: "Practicante Listo"},
  { value: "cesar@estudiodemoda.com.co", label: "Cesar Sanchez",},
  { value: "andres@estudiodemoda.com.co", label: "Andres Godoy"},
];

type Svc = {
  Categorias: { getAll: (opts?: any) => Promise<any[]> };
  SubCategorias: { getAll: (opts?: any) => Promise<any[]> };
  Articulos: { getAll: (opts?: any) => Promise<any[]> };
};

// Helpers para tolerar nombres internos distintos
const first = (...vals: any[]) => vals.find(v => v !== undefined && v !== null && v !== "");

const flowService = React.useMemo(
  () => new MailAndTeamsFlowRestService(),
  []
);

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
    ANS: "",

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
    const filter = subcategorias.filter((s) => String(s.Id_categoria) === catId);
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

  const calculoANS = (categoria: string, subcategoria: string, articulo?: string): string => {
    const KEYWORDS = {
      "ANS 1": [
        "monitor principal",
        "bloqueo general",
        "sesiones bloqueadas",
      ],
      "ANS 2": [
        "internet",
      ],
      "ANS 4": [
        "acompanamiento, embalaje y envio de equipo", // sin tildes tras normalizar
        "cambio",
        "entrega de equipo",
        "repotenciacion",
        "entrega",
      ],
      "ANS 5": [
        "alquiler",
        "cotizacion/compras",
        "cotizacion",
        "compras",
      ],
    } as const;
    const EXCLUDE = ["actividad masiva", "cierre de tienda", "apertura de tiendas"];
    const combinacion = norm(`${categoria} ${subcategoria} ${articulo ?? ""}`);

    if (EXCLUDE.some(k => combinacion.includes(norm(k)))) {
      return ""; // No lleva ANS
    }

    if (KEYWORDS["ANS 1"].some(k => combinacion.includes(norm(k)))) return "ANS 1";
    if (KEYWORDS["ANS 2"].some(k => combinacion.includes(norm(k)))) return "ANS 2";
    if (KEYWORDS["ANS 4"].some(k => combinacion.includes(norm(k)))) return "ANS 4";
    if (KEYWORDS["ANS 5"].some(k => combinacion.includes(norm(k)))) return "ANS 5";

    return "ANS 3";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const apertura = state.usarFechaApertura && state.fechaApertura
        ? new Date(state.fechaApertura)
        : new Date();
      const horasPorANS: Record<string, number> = { "ANS 1": 2, "ANS 2": 4, "ANS 3": 8, "ANS 4": 56, "ANS 5": 240};
      let solucion: TZDate | null = null

      const ANS = calculoANS(state.categoria, state.subcategoria, state.articulo)
      console.log("ANS ", ANS)
      const horasAns = horasPorANS[ANS] ?? 0

      if(horasAns > 0){
        solucion  = calcularFechaSolucion(apertura, horasAns, holidays);
        setFechaSolucion(solucion);
      }

      //Objeto de creación
      const payload = {
        Title: state.motivo,
        Descripcion: state.descripcion,
        FechaApertura: apertura,
        TiempoSolucion: solucion ? solucion.toISOString() : "",
        Fuente: state.fuente,
        Categoria: state.categoria,
        SubCategoria: state.subcategoria,
        SubSubCategoria: state.articulo,
        IdResolutor: state.resolutor?.id,
        Nombreresolutor: state.resolutor?.label,
        Correoresolutor: state.resolutor?.email,
        Solicitante: state.solicitante?.label,
        CorreoSolicitante: state.solicitante?.email,
        Estadodesolicitud: "En Atención",
        ANS: ANS,
      };

      if (payload.CorreoSolicitante) {
        const fechaSol =
          solucion ? new Date(solucion as unknown as string).toLocaleString() : "No aplica";

        const title = `Nuevo ticket: ${state.motivo}`;
        const message =
          `Se creó un ticket y fuiste asignado como resolutor.\n\n` +
          `• Solicitante: ${state.solicitante?.label ?? "—"}\n` +
          `• Fuente: ${state.fuente}\n` +
          `• Categoría: ${state.categoria}\n` +
          `• Subcategoría: ${state.subcategoria}\n` +
          `• Artículo: ${state.articulo || "—"}\n` +
          `• ANS: ${ANS || "—"}\n` +
          `• Apertura: ${apertura.toLocaleString()}\n` +
          `• Tiempo objetivo: ${fechaSol}\n`;

        try {
          await flowService.sendTeamsToUserViaFlow({
            recipient: payload.CorreoSolicitante,
            title,
            message,
          });
          console.log("[Flow] Notificación enviada a resolutor:", payload.CorreoSolicitante);
        } catch (err) {
          console.error("[Flow] Error enviando a resolutor:", err);
          // aquí podrías setear un toast si usas alguno
        }
      }

      

      console.log("Payload:\n\n" + JSON.stringify(payload, null, 2));
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

export class MailAndTeamsFlowRestService {

  /* =================== TEAMS VÍA FLOW (HTTP) =================== */

  /** NNotificaciones por flujo */
  async sendTeamsToUserViaFlow(input: FlowToUser): Promise<any> {
    return this.postToFlow({
      recipient: input.recipient,
      message: input.message,
      title: input.title ?? "",
      mail: true
    });
  }

  private async postToFlow(payload: any): Promise<any> {

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const res = await fetch("https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/a21d66d127ff43d7a940369623f0b27d/triggers/manual/paths/invoke?api-version=1", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Flow call failed: ${res.status} ${txt}`);
    }

    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json().catch(() => ({})) : {};
  }
}

