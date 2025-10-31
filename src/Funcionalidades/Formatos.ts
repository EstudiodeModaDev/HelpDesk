import React from "react";
import type { Action, FilaSolicitudRed, SolicitudUsuario, SolicitudUsuarioErrors } from "../Models/Formatos";
import { useAuth } from "../auth/authContext";
import { FlowClient } from "./FlowClient";
import type { SoliictudServiciosFlow } from "../Models/FlujosPA";
import type { TicketsService } from "../Services/Tickets.service";
import { calcularFechaSolucion } from "../utils/ans";
import type { Holiday } from "festivos-colombianos";
import { fetchHolidays } from "../Services/Festivos";
import { toGraphDateTime } from "../utils/Date";

export type SubmitFn = (payload: any) => Promise<void> | void;
type FlowResponse = { ok: boolean; [k: string]: any, createdTicket: string };

type Payload = {
  filas: Omit<FilaSolicitudRed, "id">[];  // limpio
  user: string;
  userEmail: string;
};

type State = {
  filas: FilaSolicitudRed[];
  sending: boolean;
  error: string | null;
};


export function useSolicitudServicios(TicketSvc: TicketsService) {
  const { account, } = useAuth();
  const [state, setState] = React.useState<SolicitudUsuario>({
    contratacion: "",
    nombre: "",
    apellidos: "",
    cedula: "",
    contacto: "",
    cargo: "",
    direccion: "",
    gerencia: "",
    jefatura: "",
    centroCostos: "",
    centroOperativo: "",
    ciudad: "",
    fechaIngreso: "",
    tipoEquipo: "",
    extensionTelefonica: "No aplica",
    servicios: {correo: false, office: false, erp: false,  pedidos: false, adminpos: false, posprincipal: false, impresoras: false, generictransfer: false},
    observaciones: "",
    solicitadoPor: account?.name ?? "",
    correoSolicitadoPor: account?.username ?? ""
    });
  const [errors, setErrors] = React.useState<SolicitudUsuarioErrors>({});
  const [sending, setSending] = React.useState<boolean>(false)
  const notifyFlow = new FlowClient("https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/9a27af3c52744589a7f403de2a919c5b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5ygWaQOsneK490GfGq4m2PTfiYPGSkS94z0gLtgNmm4")

  const setField = <K extends keyof SolicitudUsuario>(k: K, v: SolicitudUsuario[K]) => setState((s) => ({ ...s, [k]: v }));

  const validate = () => { const e: SolicitudUsuarioErrors = {};
    if (!state.apellidos) e.apellidos = "Requerido";
    if (!state.contratacion) e.contratacion = "Requerido";
    if (!state.nombre) e.nombre = "Requerida";
    if (!state.cedula) e.cedula = "Requerida";
    if (!state.contacto) e.contacto = "Requerido";
    if (!state.cargo) e.cargo = "Requerido";
    if (!state.direccion) e.direccion = "Requerido";
    if (!state.gerencia) e.gerencia = "Requerida";
    if (!state.jefatura) e.jefatura = "Requerida";
    if (!state.centroCostos) e.centroCostos = "Requerido";
    if (!state.centroOperativo) e.centroOperativo = "Requerido";
    if (!state.ciudad) e.ciudad = "Requerida";
    if (!state.fechaIngreso) e.fechaIngreso = "Requerida";
    if (!state.tipoEquipo) e.tipoEquipo = "Requerido";
    if (!state.extensionTelefonica) e.extensionTelefonica = "Requerida";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  function sanitizeState(s: SolicitudUsuario): SolicitudUsuario {
    // asegura strings sin espacios y booleans definidos
    const clean = { ...s } as any;
    for (const k of Object.keys(clean)) {
      if (typeof clean[k] === "string") clean[k] = (clean[k] as string).trim();
    }
    // fechaIngreso debe ir como yyyy-mm-dd
    if (clean.fechaIngreso) {
      clean.fechaIngreso = String(clean.fechaIngreso).slice(0, 10);
    }
    // por si faltan servicios
    clean.servicios = {
      correo: !!clean.servicios?.correo,
      office: !!clean.servicios?.office,
      erp: !!clean.servicios?.erp,
      pedidos: !!clean.servicios?.pedidos,
      adminpos: !!clean.servicios?.adminpos,
      posprincipal: !!clean.servicios?.posprincipal,
      impresoras: !!clean.servicios?.impresoras,
      generictransfer: !!clean.servicios?.generictransfer,
    };
    return clean as SolicitudUsuario;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSending(true);
    try {
      const clean = sanitizeState(state);
      const payload: SoliictudServiciosFlow = {Datos: clean, User: account?.name ?? "", userEmail: account?.username ?? "",};

      const flow = await notifyFlow.invoke<SoliictudServiciosFlow, FlowResponse>(payload);
      
      if (flow?.ok) {
        const holiday: Holiday[] = await fetchHolidays()
        const FechaSolucion = await calcularFechaSolucion(new Date(), 8, holiday)
        TicketSvc.update(flow.createdTicket, {TiempoSolucion: toGraphDateTime(FechaSolucion)})
        alert("Se ha creado con éxito su ticket de solicitud de servicio.");
      } else {
        alert(
          "Ha ocurrido un error, por favor inténtalo en unos minutos. Si persiste, repórtalo a TI."
        );
      }
    } catch (err) {
      console.error("Error con el flujo", err);
      alert("No pudimos enviar la solicitud. Verifica tu conexión e inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };


  return {
    state, errors, sending,
    setField, handleSubmit
  };
}

const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

const defaultFila = (seed?: Partial<Omit<FilaSolicitudRed, "id">>): FilaSolicitudRed => ({
  id: uuid(),
  carpeta1: "",
  subcarpeta1: "",
  subcarpeta2: "",
  personas: "",
  permiso: "",
  observaciones: "",
  ...(seed ?? {}),
});

const initialState: State = {
  filas: [defaultFila()],
  sending: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD":
      return { ...state, filas: [...state.filas, defaultFila(action.initial)] };

    case "REMOVE": {
      const next = state.filas.filter(f => f.id !== action.id);
      // nunca dejes la lista vacía: deja al menos una fila
      return { ...state, filas: next.length ? next : [defaultFila()] };
    }

    case "SET": {
      const filas = state.filas.map(f =>
        f.id === action.id ? { ...f, [action.key]: action.value } : f
      );
      return { ...state, filas };
    }

    case "RESET":
      return initialState;

    case "SENDING":
      return { ...state, sending: action.value };

    case "ERROR":
      return { ...state, error: action.message };

    default:
      return state;
  }
}

const filaMinimaLlena = (f: FilaSolicitudRed) =>!!(f.carpeta1.trim() || f.subcarpeta1.trim() || f.subcarpeta2.trim());

export function useSolicitudesRed(TicketSvc: TicketsService) {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const notifyFlow = new FlowClient("https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1eecfd81de164fd7bda5cc9e524a0faf/triggers/manual/paths/invoke?api-version=1")
  const { account, } = useAuth();

  const requiredOk = React.useMemo(
    () => state.filas.every(filaMinimaLlena),
    [state.filas]
  );

  const addFila = React.useCallback(
    (initial?: Partial<Omit<FilaSolicitudRed, "id">>) => dispatch({ type: "ADD", initial }),
    []
  );

  const removeFila = React.useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const setCampo = React.useCallback(
    <K extends keyof FilaSolicitudRed>(id: string, key: K, value: FilaSolicitudRed[K]) => {
      dispatch({ type: "SET", id, key, value });
    },
    []
  );


const submit = React.useCallback(
  async (e?: React.FormEvent) => {
    e?.preventDefault?.();

    if (!requiredOk) {
      dispatch({
        type: "ERROR",
        message: "Hay filas sin datos mínimos (carpeta o subcarpetas).",
      });
      return;
    }

    try {
      dispatch({ type: "ERROR", message: null });
      dispatch({ type: "SENDING", value: true });

      // Limpia ids internos antes de enviar
      const filasLimpias = state.filas.map(({ id, ...rest }) => rest);

      // Email desde MSAL puede venir en distintos campos
      const email =
        (account as any)?.username ??
        (account as any)?.userName ??
        (account as any)?.idTokenClaims?.preferred_username ??
        "";

      const payload: Payload = {
        filas: filasLimpias,
        user: account?.name ?? "",
        userEmail: email,
      };

      // Generics: <Respuesta, Payload>
      const flow = await notifyFlow.invoke<Payload, FlowResponse>(payload);

      if (!flow?.ok) {
        const msg = flow?.message ?? "El flujo respondió con error.";
        throw new Error(msg);
      }

      // Cálculo de la fecha de solución y actualización del ticket
      const holidays: Holiday[] = await fetchHolidays();
      const fechaSolucion = await calcularFechaSolucion(new Date(), 8, holidays);

      // Asegura esperar el update y capturar fallo
      await TicketSvc.update(flow.createdTicket!, {TiempoSolucion: toGraphDateTime(fechaSolucion),});

      alert("✅ Se ha creado con éxito su ticket de solicitud de servicio.");
      dispatch({ type: "RESET" });
    } catch (err: any) {
      console.error("Error con el flujo", err);
      dispatch({
        type: "ERROR",
        message:
          err?.message ??
          "No pudimos enviar la solicitud. Verifica tu conexión e inténtalo de nuevo.",
      });
      alert(
        "⚠️ No pudimos enviar la solicitud. Verifica tu conexión e inténtalo de nuevo."
      );
    } finally {
      dispatch({ type: "SENDING", value: false });
    }
  },
  [
    requiredOk,
    state.filas,
    account?.name,
    (account as any)?.username,
    notifyFlow,
    fetchHolidays,
    calcularFechaSolucion,
    TicketSvc,
    toGraphDateTime,
  ]
);



  return {
    filas: state.filas,
    sending: state.sending,
    error: state.error,
    requiredOk,
    addFila,
    removeFila,
    setCampo,
    submit,
  };
}


