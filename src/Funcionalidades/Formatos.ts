// hooks/solicitudes.tsx
import * as React from "react";
import type {
  FilaSolicitudERP,
  FilaSolicitudRed,
  SolicitudUsuario,
  SolicitudUsuarioErrors,
} from "../Models/Formatos";
import { useAuth } from "../auth/authContext";
import { FlowClient } from "./FlowClient";

import type { TicketsService } from "../Services/Tickets.service";
import { calcularFechaSolucion } from "../utils/ans";
import type { Holiday } from "festivos-colombianos";
import { fetchHolidays } from "../Services/Festivos";
import { toGraphDateTime } from "../utils/Date";

/* ───────────────────────────── Utilidades base ───────────────────────────── */

const uuid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

/** Action genérica por tipo de fila (evita el conflicto de keyof entre Red/ERP). */
type ActionOf<T> =
  | { type: "ADD"; initial?: Partial<Omit<T, "id">> }
  | { type: "REMOVE"; id: string }
  | { type: "SET"; id: string; key: keyof T; value: T[keyof T] }
  | { type: "ERROR"; message: string | null }
  | { type: "SENDING"; value: boolean }
  | { type: "RESET" };

/** Respuesta estándar de los flujos. */
type FlowResponse = { ok: boolean; message?: string; createdTicket?: string | number | null };

type PayloadRed = {
  filas: Omit<FilaSolicitudRed, "id">[]; // limpio
  user: string;
  userEmail: string;
};

type StateRed = {
  filas: FilaSolicitudRed[];
  sending: boolean;
  error: string | null;
};

const defaultFilaRed = (seed?: Partial<Omit<FilaSolicitudRed, "id">>): FilaSolicitudRed => ({
  id: uuid(),
  carpeta1: "",
  subcarpeta1: "",
  subcarpeta2: "",
  personas: "",
  permiso: "",
  observaciones: "",
  ...(seed ?? {}),
});

const initialStateRed: StateRed = {
  filas: [defaultFilaRed()],
  sending: false,
  error: null,
};

type ActionRed = ActionOf<FilaSolicitudRed>;

function reducerRed(state: StateRed, action: ActionRed): StateRed {
  switch (action.type) {
    case "ADD":
      return { ...state, filas: [...state.filas, defaultFilaRed(action.initial)] };
    case "REMOVE": {
      const next = state.filas.filter((f) => f.id !== action.id);
      return { ...state, filas: next.length ? next : [defaultFilaRed()] };
    }
    case "SET": {
      const filas = state.filas.map((f) =>
        f.id === action.id ? { ...f, [action.key]: action.value } : f
      );
      return { ...state, filas };
    }
    case "RESET":
      return initialStateRed;
    case "SENDING":
      return { ...state, sending: action.value };
    case "ERROR":
      return { ...state, error: action.message };
    default:
      return state;
  }
}

const filaMinimaLlenaRed = (f: FilaSolicitudRed) =>
  !!(f.carpeta1?.trim() || f.subcarpeta1?.trim() || f.subcarpeta2?.trim());

export function useSolicitudesRed(TicketSvc: TicketsService) {
  const [state, dispatch] = React.useReducer(reducerRed, initialStateRed);
  const notifyFlow = new FlowClient(
    "https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1eecfd81de164fd7bda5cc9e524a0faf/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=WhieSqa0IMJwfZa8_5w0uTwgD_JKzbUh8Z4kZG_fzQY"
  );
  const { account } = useAuth();

  const requiredOk = React.useMemo(() => state.filas.every(filaMinimaLlenaRed), [state.filas]);

  const addFila = React.useCallback(
    (initial?: Partial<Omit<FilaSolicitudRed, "id">>) => dispatch({ type: "ADD", initial }),
    []
  );
  const removeFila = React.useCallback((id: string) => dispatch({ type: "REMOVE", id }), []);
  const setCampo = React.useCallback(
    <K extends keyof FilaSolicitudRed>(id: string, key: K, value: FilaSolicitudRed[K]) =>
      dispatch({ type: "SET", id, key, value }),
    []
  );

  const submit = React.useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault?.();

      if (!requiredOk) {
        dispatch({ type: "ERROR", message: "Hay filas sin datos mínimos (carpeta o subcarpetas)." });
        alert("⚠️ Hay filas sin datos mínimos.");
        return;
      }

      try {
        dispatch({ type: "ERROR", message: null });
        dispatch({ type: "SENDING", value: true });

        const filasLimpias = state.filas.map(({ id, ...rest }) => rest);

        const userEmail: string =
          (account as any)?.username ??
          (account as any)?.userName ??
          (account as any)?.idTokenClaims?.preferred_username ??
          "";
        const user: string = account?.name ?? "";

        if (!user || !userEmail) throw new Error("Faltan nombre o email del usuario autenticado.");

        const payload: PayloadRed = { filas: filasLimpias, user, userEmail };

        // invoke<Respuesta, Payload>
        const flow = await notifyFlow.invoke<any, FlowResponse>(payload);

        if (!flow?.ok) throw new Error(flow?.message ?? "El flujo respondió con error.");

        const holidays: Holiday[] = await fetchHolidays();
        const fechaSolucion = await calcularFechaSolucion(new Date(), 8, holidays);

        if (flow.createdTicket != null) {
          await TicketSvc.update(String(flow.createdTicket), { TiempoSolucion: toGraphDateTime(fechaSolucion) });
        }

        alert("✅ Se ha creado con éxito su ticket de solicitud de servicio.");
        dispatch({ type: "RESET" });
      } catch (err: any) {
        console.error("Error con el flujo (Red)", err);
        dispatch({
          type: "ERROR",
          message: err?.message ?? "No pudimos enviar la solicitud. Verifica tu conexión e inténtalo de nuevo.",
        });
        alert("⚠️ No pudimos enviar la solicitud. Verifica tu conexión e inténtalo de nuevo.");
      } finally {
        dispatch({ type: "SENDING", value: false });
      }
    },
    [requiredOk, state.filas, account, notifyFlow, TicketSvc]
  );

  return {filas: state.filas, sending: state.sending, error: state.error, requiredOk,
    addFila, removeFila, setCampo, submit,
  };
}


export function useSolicitudServicios(TicketSvc: TicketsService) {
  const { account } = useAuth();
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
    servicios: {
      correo: false,
      office: false,
      erp: false,
      pedidos: false,
      adminpos: false,
      posprincipal: false,
      impresoras: false,
      generictransfer: false,
    },
    observaciones: "",
    solicitadoPor: account?.name ?? "",
    correoSolicitadoPor:
      (account as any)?.username ??
      (account as any)?.userName ??
      (account as any)?.idTokenClaims?.preferred_username ??
      "",
  });

  const [errors, setErrors] = React.useState<SolicitudUsuarioErrors>({});
  const [sending, setSending] = React.useState<boolean>(false);
  const notifyFlow = new FlowClient("https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/9a27af3c52744589a7f403de2a919c5b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5ygWaQOsneK490GfGq4m2PTfiYPGSkS94z0gLtgNmm4");

  const setField = <K extends keyof SolicitudUsuario>(k: K, v: SolicitudUsuario[K]) => setState((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const e: SolicitudUsuarioErrors = {};
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
    const clean: any = { ...s };
    for (const k of Object.keys(clean)) {
      if (typeof clean[k] === "string") clean[k] = (clean[k] as string).trim();
    }
    if (clean.fechaIngreso) clean.fechaIngreso = String(clean.fechaIngreso).slice(0, 10);
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
      const payload: any = {
        Datos: clean,
        User: account?.name ?? "",
        userEmail:
          (account as any)?.username ??
          (account as any)?.userName ??
          (account as any)?.idTokenClaims?.preferred_username ??
          "",
      };

      const flow = await notifyFlow.invoke<any, FlowResponse>(payload);

      if (flow?.ok) {
        const holiday: Holiday[] = await fetchHolidays();
        const FechaSolucion = await calcularFechaSolucion(new Date(), 8, holiday);
        if (flow.createdTicket != null) {
          await TicketSvc.update(String(flow.createdTicket), { TiempoSolucion: toGraphDateTime(FechaSolucion) });
        }
        alert("Se ha creado con éxito su ticket de solicitud de servicio.");
      } else {
        alert("Ha ocurrido un error, por favor inténtalo en unos minutos. Si persiste, repórtalo a TI.");
      }
    } catch (err) {
      console.error("Error con el flujo (Servicios)", err);
      alert("No pudimos enviar la solicitud. Verifica tu conexión e inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return { state, errors, sending, setField, handleSubmit };
}


type FlowItemERP = {
  nombrePerfil: string;
  metodoGeneral: string;
  metodoEspecifico: string;
  permisoEspecifico: string;
  Usuario: string; // correo del usuario objetivo
  observaciones: string;
};

type FlowERPPayload = {
  userName: string;
  userEmail: string;
  items: FlowItemERP[];
};

type StateERP = {
  filas: FilaSolicitudERP[];
  sending: boolean;
  error: string | null;
};

const initialStateERP: StateERP = {
  filas: [],
  sending: false,
  error: null,
};

const filaMinimaERPLlena = (f: FilaSolicitudERP) =>
  !!(f?.nombreperfil || "").trim() &&
  !!(f?.metodogeneral || "").trim() &&
  !!(f?.metodoespecifico || "").trim() &&
  !!(f?.permisoespecifico || "").trim() &&
  !!(f?.usuarioMail || "").trim();

type ActionERP = ActionOf<FilaSolicitudERP>;

function reducerERP(state: StateERP, action: ActionERP): StateERP {
  switch (action.type) {
    case "ADD": {
      const base: FilaSolicitudERP = {
        id: uuid(),
        nombreperfil: "",
        metodogeneral: "",
        metodoespecifico: "",
        permisoespecifico: "",
        usuarioNombre: "",
        usuarioMail: "",
        observaciones: "",
      };
      return { ...state, filas: [...state.filas, { ...base, ...(action.initial ?? {}) }] };
    }
    case "REMOVE":
      return { ...state, filas: state.filas.filter((f) => f.id !== action.id) };
    case "SET": {
      const filas = state.filas.map((f) => (f.id === action.id ? { ...f, [action.key]: action.value } : f));
      return { ...state, filas };
    }
    case "ERROR":
      return { ...state, error: action.message };
    case "SENDING":
      return { ...state, sending: action.value };
    case "RESET":
      return initialStateERP;
    default:
      return state;
  }
}

export function usePermisosERP(TicketSvc: TicketsService) {
  const [state, dispatch] = React.useReducer(reducerERP, initialStateERP);
  const notifyFlow = new FlowClient(
    "https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/a087782349cd406ca31090df80394f15/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=8dljBl-q48BDBnSr5QxBke7r-43Y3x8RYyBkbQeVWIk"
  );
  const { account } = useAuth();

  const requiredOk = React.useMemo(() => state.filas.every(filaMinimaERPLlena), [state.filas]);

  const addFila = React.useCallback(
    (initial?: Partial<Omit<FilaSolicitudERP, "id">>) => dispatch({ type: "ADD", initial }),
    []
  );
  const removeFila = React.useCallback((id: string) => dispatch({ type: "REMOVE", id }), []);
  const setCampo = React.useCallback(
    <K extends keyof FilaSolicitudERP>(id: string, key: K, value: FilaSolicitudERP[K]) =>
      dispatch({ type: "SET", id, key, value }),
    []
  );

  const submit = React.useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault?.();

      if (!requiredOk) {
        dispatch({
          type: "ERROR",
          message: "Hay filas sin datos mínimos (perfil/métodos/permisos/correo).",
        });
        alert("⚠️ Hay filas sin datos mínimos.");
        return;
      }

      try {
        dispatch({ type: "ERROR", message: null });
        dispatch({ type: "SENDING", value: true });

        const items: FlowItemERP[] = state.filas.map(
          ({
            nombreperfil,
            metodogeneral,
            metodoespecifico,
            permisoespecifico,
            usuarioMail,
            /* usuarioNombre, */
            observaciones,
          }) => ({
            nombrePerfil: (nombreperfil ?? "").trim(),
            metodoGeneral: (metodogeneral ?? "").trim(),
            metodoEspecifico: (metodoespecifico ?? "").trim(),
            permisoEspecifico: (permisoespecifico ?? "").trim(),
            Usuario: (usuarioMail ?? "").trim(),
            observaciones: (observaciones ?? "").trim(),
          })
        );

        const userEmail: string =
          (account as any)?.username ??
          (account as any)?.userName ??
          (account as any)?.idTokenClaims?.preferred_username ??
          "";
        const userName: string = account?.name ?? "";

        if (!userName || !userEmail) throw new Error("Faltan userName o userEmail del usuario autenticado.");

        const faltantes = items.filter(
          (x) =>
            !x.nombrePerfil || !x.metodoGeneral || !x.metodoEspecifico || !x.permisoEspecifico || !x.Usuario
        );
        if (faltantes.length > 0)
          throw new Error("Hay filas con campos requeridos vacíos (perfil/métodos/permisos/Usuario).");

        const payload: FlowERPPayload = { userName, userEmail, items };

        // invoke<Respuesta, Payload>
        const flow = await notifyFlow.invoke<any, FlowResponse>(payload);

        if (!flow?.ok) throw new Error(flow?.message ?? "El flujo respondió con error.");

        const holidays: Holiday[] = await fetchHolidays();
        const fechaSolucion = await calcularFechaSolucion(new Date(), 8, holidays);

        if (flow.createdTicket != null) {
          await TicketSvc.update(String(flow.createdTicket), { TiempoSolucion: toGraphDateTime(fechaSolucion) });
        }

        alert("✅ Se ha creado con éxito su ticket de solicitud de servicio.");
        dispatch({ type: "RESET" });
      } catch (err: any) {
        console.error("Error con el flujo (ERP)", err);
        dispatch({
          type: "ERROR",
          message: err?.message ?? "No pudimos enviar la solicitud. Verifica tu conexión e inténtalo de nuevo.",
        });
        alert("⚠️ No pudimos enviar la solicitud. Verifica tu conexión e inténtalo de nuevo.");
      } finally {
        dispatch({ type: "SENDING", value: false });
      }
    },
    [requiredOk, state.filas, account, notifyFlow, TicketSvc]
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
