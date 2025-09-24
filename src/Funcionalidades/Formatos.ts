import { useCallback, useMemo, useReducer } from "react";
import type { ExtensionTelefonica, ServicioPrograma, TipoContratacion, TipoEquipo } from "../Models/Formatos";

export interface SolicitudUsuario {
  contratacion: TipoContratacion | "";
  nombre: string;
  apellido: string;
  cedula: string;
  contacto?: string;
  cargo: string;
  direccion: string;
  gerencia: string;
  jefatura: string;
  centroCostos: string;
  centroOperativo: string;

  ciudad: string;
  fechaIngreso?: string;     // YYYY-MM-DD
  tipoEquipo: TipoEquipo | "";
  extensionTelefonica: ExtensionTelefonica | "";
  servicios: ServicioPrograma[];
  observaciones?: string;
}

type State = {
  data: SolicitudUsuario;
  sending: boolean;
  touched: Partial<Record<keyof SolicitudUsuario, boolean>>;
  error?: string; // mensaje global opcional
};

type Action =
  | { type: "SET"; key: keyof SolicitudUsuario; value: any }
  | { type: "TOGGLE_SERV"; servicio: ServicioPrograma; checked: boolean }
  | { type: "RESET_PARTIAL" }
  | { type: "SENDING"; value: boolean }
  | { type: "TOUCHED"; key: keyof SolicitudUsuario }
  | { type: "ERROR"; message?: string };

export const initialSolicitud: SolicitudUsuario = {
  contratacion: "",
  nombre: "",
  apellido: "",
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
  servicios: [],
  observaciones: "",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET":
      return { ...state, data: { ...state.data, [action.key]: action.value } };
    case "TOGGLE_SERV": {
      const set = new Set(state.data.servicios);
      action.checked ? set.add(action.servicio) : set.delete(action.servicio);
      return { ...state, data: { ...state.data, servicios: Array.from(set) } };
    }
    case "RESET_PARTIAL":
      return {
        ...state,
        data: {
          ...state.data,
          nombre: "", apellido: "", cedula: "", contacto: "",
          cargo: "", direccion: "", gerencia: "", jefatura: "",
          centroCostos: "", centroOperativo: "", ciudad: "",
          fechaIngreso: "", tipoEquipo: "", servicios: [], observaciones: "",
        },
        touched: {},
        error: undefined,
      };
    case "SENDING":
      return { ...state, sending: action.value };
    case "TOUCHED":
      return { ...state, touched: { ...state.touched, [action.key]: true } };
    case "ERROR":
      return { ...state, error: action.message };
    default:
      return state;
  }
}

export type SubmitFn = (payload: any) => Promise<void> | void;

/** Normaliza claves si la API requiere snake_case u otros nombres */
export const buildPayload = (f: SolicitudUsuario) => ({
  contratacion: f.contratacion,
  nombre: f.nombre.trim(),
  apellido: f.apellido.trim(),
  cedula: f.cedula.trim(),
  contacto: f.contacto?.trim() || null,
  cargo: f.cargo.trim(),
  direccion: f.direccion.trim(),
  gerencia: f.gerencia.trim(),
  jefatura: f.jefatura.trim(),
  centro_costos: f.centroCostos.trim(),
  centro_operativo: f.centroOperativo.trim(),
  ciudad: f.ciudad.trim(),
  fecha_ingreso: f.fechaIngreso || null,
  tipo_equipo: f.tipoEquipo,
  extension_telefonica: f.extensionTelefonica,
  servicios: f.servicios,
  observaciones: f.observaciones?.trim() || null,
});

/** Validación mínima (puedes cambiarla por Zod/Yup luego) */
export function validateRequired(f: SolicitudUsuario): string | undefined {
  const req: (keyof SolicitudUsuario)[] = [
    "contratacion","nombre","apellido","cedula","cargo","direccion",
    "gerencia","jefatura","centroCostos","centroOperativo",
    "ciudad","tipoEquipo","extensionTelefonica",
  ];
  for (const k of req) {
    const v = (f[k] ?? "") as string;
    if (!String(v).trim()) return `El campo "${k}" es obligatorio.`;
  }
  return undefined;
}

export function useSolicitudUsuarioForm(onSubmit: SubmitFn) {
  const [state, dispatch] = useReducer(reducer, {
    data: initialSolicitud,
    sending: false,
    touched: {},
  } as State);

  const requiredOk = useMemo(() => !validateRequired(state.data), [state.data]);

  const setField = useCallback(
    <K extends keyof SolicitudUsuario>(key: K, value: SolicitudUsuario[K]) =>
      dispatch({ type: "SET", key, value }),
    []
  );

  const onChange =
    <K extends keyof SolicitudUsuario>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      dispatch({ type: "SET", key, value: e.target.value as SolicitudUsuario[K] });
      dispatch({ type: "TOUCHED", key });
    };

  const onToggleServicio = (srv: ServicioPrograma) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({ type: "TOGGLE_SERV", servicio: srv, checked: e.target.checked });

  const submit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    const error = validateRequired(state.data);
    if (error) {
      dispatch({ type: "ERROR", message: error });
      return;
    }
    try {
      dispatch({ type: "SENDING", value: true });
      const payload = buildPayload(state.data);
      await onSubmit(payload);
      dispatch({ type: "RESET_PARTIAL" });
    } finally {
      dispatch({ type: "SENDING", value: false });
    }
  }, [state.data, onSubmit]);

  return {
    form: state.data,
    sending: state.sending,
    error: state.error,
    requiredOk,
    setField,
    onChange,
    onToggleServicio,
    submit,
  };
}
