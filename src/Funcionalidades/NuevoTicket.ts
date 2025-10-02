import * as React from "react";
import { useState, useMemo, useEffect, useRef } from "react";
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
  { value: "practicantelisto@estudiodemoda.com.co", label: "Practicante Listo" },
  { value: "cesar@estudiodemoda.com.co", label: "Cesar Sanchez" },
  { value: "andres@estudiodemoda.com.co", label: "Andres Godoy" },
];

type Svc = {
  Categorias: { getAll: (opts?: any) => Promise<any[]> };
  SubCategorias: { getAll: (opts?: any) => Promise<any[]> };
  Articulos: { getAll: (opts?: any) => Promise<any[]> };
};

// Helpers para tolerar nombres internos distintos
const first = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && v !== "");

export class MailAndTeamsFlowRestService {
  private flowUrl: string =
    "https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/a21d66d127ff43d7a940369623f0b27d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=0ptZLGTXbYtVNKdmIvLdYPhw1Wcqb869N3AOZUf2OH4";
  constructor(flowUrl?: string) {
    if (flowUrl) this.flowUrl = flowUrl;
  }

  /** Notificaciones por flujo (Teams) */
  async sendTeamsToUserViaFlow(input: FlowToUser): Promise<any> {
    return this.postToFlow({
      recipient: input.recipient,
      message: input.message,
      title: input.title ?? "",
    });
  }

  private async postToFlow(payload: any): Promise<any> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const res = await fetch(this.flowUrl, {
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

export function useNuevoTicketForm(services: Svc) {
  const { Categorias, SubCategorias, Articulos } = services;

  // ---- Estado del formulario (guardamos SOLO títulos en categoria/subcategoria/articulo)
  const [state, setState] = useState<FormState>({
    solicitante: null,
    resolutor: null,
    usarFechaApertura: false,
    fechaApertura: null,
    fuente: "",
    motivo: "",
    descripcion: "",
    categoria: "",    // Título
    subcategoria: "", // Título
    articulo: "",     // Título
    ANS: "",
    archivo: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [fechaSolucion, setFechaSolucion] = useState<Date | null>(null);

  // ---- Catálogos
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [articulosAll, setArticulosAll] = useState<Articulo[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState<string | null>(null);

  // ---- Instancia del servicio de Flow (sin useMemo, para evitar React null)
  const flowServiceRef = useRef<MailAndTeamsFlowRestService | null>(null);
  if (!flowServiceRef.current) {
    flowServiceRef.current = new MailAndTeamsFlowRestService();
  }

  // Carga de festivos inicial
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
    return () => {
      cancel = true;
    };
  }, []);

  // Carga de catálogo de servicios
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
          Title: String(first(r.Title, "")),
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
    return () => {
      cancel = true;
    };
  }, [Categorias, SubCategorias, Articulos]);

  /* ============================
     Derivados legacy (no usados por el TSX nuevo, pero conservados)
     ============================ */
  const subcats = useMemo<Subcategoria[]>(() => {
    // En el diseño nuevo, state.categoria es Título; este derivado legacy quedará vacío y no se usa.
    return [];
  }, [subcategorias, state.categoria]);

  const articulos = useMemo<string[]>(() => {
    // En el diseño nuevo, state.subcategoria es Título; este derivado legacy no se usa.
    return [];
  }, [articulosAll, state.subcategoria]);

  /* ============================
     Helpers de formulario
     ============================ */
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  // Resets en cascada cuando cambia título de categoría/subcategoría (compat)
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
      "ANS 1": ["monitor principal", "bloqueo general", "sesiones bloqueadas"],
      "ANS 2": ["internet"],
      "ANS 4": [
        "acompanamiento, embalaje y envio de equipo", // sin tildes tras normalizar
        "cambio",
        "entrega de equipo",
        "repotenciacion",
        "entrega",
      ],
      "ANS 5": ["alquiler", "cotizacion/compras", "cotizacion", "compras"],
    } as const;
    const EXCLUDE = ["actividad masiva", "cierre de tienda", "apertura de tiendas"];
    const combinacion = norm(`${categoria} ${subcategoria} ${articulo ?? ""}`);

    if (EXCLUDE.some((k) => combinacion.includes(norm(k)))) {
      return ""; // No lleva ANS
    }

    if (KEYWORDS["ANS 1"].some((k) => combinacion.includes(norm(k)))) return "ANS 1";
    if (KEYWORDS["ANS 2"].some((k) => combinacion.includes(norm(k)))) return "ANS 2";
    if (KEYWORDS["ANS 4"].some((k) => combinacion.includes(norm(k)))) return "ANS 4";
    if (KEYWORDS["ANS 5"].some((k) => combinacion.includes(norm(k)))) return "ANS 5";

    return "ANS 3";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const apertura = state.usarFechaApertura && state.fechaApertura ? new Date(state.fechaApertura) : new Date();

      const horasPorANS: Record<string, number> = {
        "ANS 1": 2,
        "ANS 2": 4,
        "ANS 3": 8,
        "ANS 4": 56,
        "ANS 5": 240,
      };
      let solucion: TZDate | null = null;

      const ANS = calculoANS(state.categoria, state.subcategoria, state.articulo);
      const horasAns = horasPorANS[ANS] ?? 0;

      if (horasAns > 0) {
        solucion = calcularFechaSolucion(apertura, horasAns, holidays);
        setFechaSolucion(solucion);
      }

      // Objeto de creación
      const payload = {
        Title: state.motivo,
        Descripcion: state.descripcion,
        FechaApertura: apertura,
        TiempoSolucion: solucion ? solucion.toISOString() : "",
        Fuente: state.fuente,
        Categoria: state.categoria,       // Título
        SubCategoria: state.subcategoria, // Título
        SubSubCategoria: state.articulo,  // Título
        IdResolutor: state.resolutor?.id,
        Nombreresolutor: state.resolutor?.label,
        Correoresolutor: state.resolutor?.email,
        Solicitante: state.solicitante?.label,
        CorreoSolicitante: state.solicitante?.email,
        Estadodesolicitud: "En Atención",
        ANS: ANS,
      };

      console.log("Payload:\n\n" + JSON.stringify(payload, null, 2));

      /* =========================
         NOTIFICACIÓN POR TEAMS
         ========================= */
      const resolutorEmail = state.resolutor?.email || state.resolutor?.value || "";

      if (resolutorEmail) {
        const fechaSol = solucion ? new Date(solucion as unknown as string).toLocaleString() : "No aplica";
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
          await flowServiceRef.current!.sendTeamsToUserViaFlow({
            recipient: resolutorEmail,
            title,
            message,
          });
          console.log("[Flow] Notificación enviada a resolutor:", resolutorEmail);
        } catch (err) {
          console.error("[Flow] Error enviando a resolutor:", err);
        }
      }

      // (Opcional) Notificar también al solicitante:
      /*
      const solicitanteEmail = state.solicitante?.email || state.solicitante?.value || "";
      if (solicitanteEmail) {
        try {
          await flowServiceRef.current!.sendTeamsToUserViaFlow({
            recipient: solicitanteEmail,
            title: `Ticket recibido: ${state.motivo}`,
            message:
              `Tu solicitud fue registrada.\n\n` +
              `• Resolutor: ${state.resolutor?.label ?? "—"}\n` +
              `• ANS: ${ANS || "—"}\n` +
              `• Apertura: ${apertura.toLocaleString()}\n` +
              `• Tiempo objetivo: ${
                solucion ? new Date(solucion as unknown as string).toLocaleString() : "No aplica"
              }\n`,
          });
          console.log("[Flow] Notificación enviada a solicitante:", solicitanteEmail);
        } catch (err) {
          console.error("[Flow] Error enviando a solicitante:", err);
        }
      }
      */
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
    subcategoriasAll: subcategorias, // full (para filtrar en el TSX por ID)
    articulosAll,        // full (para filtrar en el TSX por ID)
    subcats,             // legacy (no usado)
    articulos,           // legacy (no usado)
    loadingCatalogos,
    errorCatalogos,

    // util
    USUARIOS,

    // acciones
    handleSubmit,
  };
}
