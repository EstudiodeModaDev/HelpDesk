import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { calcularFechaSolucion } from "../utils/ans";
import { fetchHolidays} from "../Services/Festivos";
import type { FormState, FormErrors } from "../Models/nuevoTicket";
import type { Articulo, Categoria, Subcategoria } from "../Models/Categorias";
import type { FlowToUser, } from "../Models/Commons";
import { norm } from "../utils/Commons";
import type { TZDate } from "@date-fns/tz";
import type { TicketsService } from "../Services/Tickets.service";
import { toGraphDateTime } from "../utils/Date";
import type { Holiday } from "festivos-colombianos";

type Svc = {
  Categorias: { getAll: (opts?: any) => Promise<any[]> };
  SubCategorias: { getAll: (opts?: any) => Promise<any[]> };
  Articulos: { getAll: (opts?: any) => Promise<any[]> };
  Tickets?: TicketsService 
}; 

// Helpers para tolerar nombres internos distintos
const first = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && v !== "");

export class MailAndTeamsFlowRestService {
  private flowUrl: string =
    "https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/a21d66d127ff43d7a940369623f0b27d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=0ptZLGTXbYtVNKdmIvLdYPhw1Wcqb869N3AOZUf2OH4";
  constructor(flowUrl?: string) {
    if (flowUrl) this.flowUrl = flowUrl;
  }

  /** Notificaciones por flujo (Teams / Correo) */
  async sendTeamsToUserViaFlow(input: FlowToUser): Promise<any> {
    return this.postToFlow({
      recipient: input.recipient,
      message: input.message,
      title: input.title ?? "",
      mail: input.mail,
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
  const { Categorias, SubCategorias, Articulos, Tickets } = services; // ← incluye Tickets

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
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [fechaSolucion, setFechaSolucion] = useState<Date | null>(null);

  // ---- Catálogos
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [articulosAll, setArticulosAll] = useState<Articulo[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState<string | null>(null);

  // ---- Instancia del servicio de Flow (useRef para no depender de React.*)
  const flowServiceRef = useRef<MailAndTeamsFlowRestService | null>(null);
  if (!flowServiceRef.current) {
  flowServiceRef.current = new MailAndTeamsFlowRestService();
  }

  // Carga de festivos inicial
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const hs = await fetchHolidays();
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
     Helpers de formulario
     ============================ */
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    setState((s) => ({ ...s, subcategoria: "", articulo: "" }));
  }, [state.categoria]);

  useEffect(() => {
    setState((s) => ({ ...s, articulo: "" }));
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

      const aperturaISO  = toGraphDateTime(apertura);           
      const tiempoSolISO = toGraphDateTime(solucion as any);  
      console.log(aperturaISO, tiempoSolISO)      

      // Objeto de creación
      const payload = {
        Title: state.motivo,
        Descripcion: state.descripcion,
        FechaApertura: aperturaISO,
        TiempoSolucion: tiempoSolISO,
        Fuente: state.fuente,
        Categoria: state.categoria,       
        SubCategoria: state.subcategoria, 
        SubSubCategoria: state.articulo,  
        Nombreresolutor: state.resolutor?.label,
        Correoresolutor: state.resolutor?.email,
        Solicitante: state.solicitante?.label,
        CorreoSolicitante: state.solicitante?.email,
        Estadodesolicitud: "En Atención",
        ANS: ANS
      };

      console.log(payload)
      

      // === Crear ticket (usa el servicio inyectado)
      let createdId: string | number = "";
      if (!Tickets?.create) {
        console.error("Tickets service no disponible. Verifica el GraphServicesProvider.");
      } else {
        const created = await Tickets.create(payload);

        createdId = created?.ID ?? "";
        console.log("Ticket creado con ID:", createdId);

        const idTexto = String(createdId || "—");
        const fechaSolTexto = solucion ? new Date(solucion as unknown as string).toLocaleString() : "No aplica";
        const solicitanteEmail = state.solicitante?.email || state.solicitante?.value || "";
        const resolutorEmail = state.resolutor?.email || state.resolutor?.value || "";
      
        // Notificar solicitante
      if (solicitanteEmail) {
        const title = `Asignación de Caso - ${idTexto}`;
        const message = `
        <p>¡Hola ${payload.Solicitante ?? ""}!<br><br>
        Tu solicitud ha sido registrada exitosamente y ha sido asignada a un técnico para su gestión. Estos son los detalles del caso:<br><br>
        <strong>ID del Caso:</strong> ${idTexto}<br>
        <strong>Asunto del caso:</strong> ${payload.Title}<br>
        <strong>Resolutor asignado:</strong> ${payload.Nombreresolutor ?? "—"}<br>
        <strong>Fecha máxima de solución:</strong> ${fechaSolTexto}<br><br>
        El resolutor asignado se pondrá en contacto contigo en el menor tiempo posible para darte solución a tu requerimiento.<br><br>
        Este es un mensaje automático, por favor no respondas.
        </p>`.trim();

        try {
          await flowServiceRef.current!.sendTeamsToUserViaFlow({
            recipient: solicitanteEmail,
            title,
            message,
            mail: true, // si tu Flow envía correo cuando mail=true
          });
        } catch (err) {
          console.error("[Flow] Error enviando a solicitante:", err);
        }
      }

      // Notificar resolutor    
      if (resolutorEmail) {
        const title = `Nuevo caso asignado - ${idTexto}`;
        const message = `
        <p>¡Hola!<br><br>
        Tienes un nuevo caso asignado con estos detalles:<br><br>
        <strong>ID del Caso:</strong> ${idTexto}<br>
        <strong>Solicitante:</strong> ${payload.Solicitante ?? "—"}<br>
        <strong>Correo del Solicitante:</strong> ${payload.CorreoSolicitante ?? "—"}<br>
        <strong>Asunto:</strong> ${payload.Title}<br>
        <strong>Fecha máxima de solución:</strong> ${fechaSolTexto}<br><br>
        Por favor, contacta al usuario para brindarle solución.<br><br>
        Este es un mensaje automático, por favor no respondas.
        </p>`.trim();

        try {
          await flowServiceRef.current!.sendTeamsToUserViaFlow({
            recipient: resolutorEmail, // ← CORREGIDO (antes usabas solicitanteEmail)
            title,
            message,
            mail: true,
          });
        } catch (err) {
          console.error("[Flow] Error enviando a resolutor:", err);
        }
      }

      //Limpiar formularior
      setState( 
        {
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
        })
      setErrors({})
    }
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
    categorias,
    subcategoriasAll: subcategorias,
    articulosAll,
    loadingCatalogos,
    errorCatalogos,
    // acciones
    handleSubmit,
  };
}
